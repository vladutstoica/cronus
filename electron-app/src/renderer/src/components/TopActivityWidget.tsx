import { AnimatePresence, motion } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { Card } from '../components/ui/card'
// import { ActiveWindowEvent } from '@shared/types' // No longer directly needed for props
import { formatDuration } from '../lib/timeFormatting'
import { getFaviconURL, getGoogleFaviconURL } from '../utils/favicon'
import AppIcon from './AppIcon'
import type { ProcessedEventBlock } from './DashboardView' // Import ProcessedEventBlock
import { Skeleton } from './ui/skeleton'

interface WebsiteUsage {
  domain: string
  title: string
  url: string
  durationMs: number
}

interface AppUsage {
  name: string
  durationMs: number
  percentage?: number
  iconPath?: string | null
  websites?: WebsiteUsage[]
  isExpanded?: boolean
}

interface TopActivityWidgetProps {
  // activityEvents: ActiveWindowEvent[] | null // Old prop
  processedEvents: ProcessedEventBlock[] | null // New prop
  isLoadingEvents: boolean
}

const extractWebsiteInfo = (url: string, title: string): { domain: string; title: string } => {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')

    // Clean up title
    let cleanTitle = title
      .replace(/ - Google Chrome$/i, '')
      .replace(/ - Chrome$/i, '')
      .replace(/^\([0-9]+\) /, '') // Remove notification counts like "(2) Gmail"
      .trim()

    // Fallback to domain if title is empty
    if (!cleanTitle || cleanTitle.length < 3) {
      cleanTitle = domain
    }

    return { domain, title: cleanTitle }
  } catch {
    return { domain: 'unknown', title: title || 'Unknown Website' }
  }
}

const TopActivityWidget: React.FC<TopActivityWidgetProps> = ({
  // activityEvents, // old
  processedEvents,
  isLoadingEvents
}) => {
  const [topApps, setTopApps] = useState<AppUsage[]>([])
  const [totalTrackedTimeMs, setTotalTrackedTimeMs] = useState(0)
  const [faviconErrors, setFaviconErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!processedEvents || processedEvents.length === 0) {
      // new
      setTopApps([])
      setTotalTrackedTimeMs(0)
      return
    }

    const appDurations: Record<string, number> = {}
    const chromeDomainDurations: Record<
      string,
      { durationMs: number; title: string; url: string }
    > = {}
    let currentTotalTrackedMs = 0

    for (const block of processedEvents) {
      // new
      const currentEvent = block.originalEvent // Use originalEvent for properties
      const durationMs = block.durationMs // Use pre-calculated duration

      currentTotalTrackedMs += durationMs

      if (currentEvent.ownerName === 'Google Chrome' && currentEvent.url) {
        const { domain, title } = extractWebsiteInfo(currentEvent.url, currentEvent.title || '')

        if (!chromeDomainDurations[domain]) {
          chromeDomainDurations[domain] = {
            durationMs: 0,
            title,
            url: currentEvent.url
          }
        }
        chromeDomainDurations[domain].durationMs += durationMs
      }

      appDurations[currentEvent.ownerName] =
        (appDurations[currentEvent.ownerName] || 0) + durationMs
    }

    setTotalTrackedTimeMs(currentTotalTrackedMs)

    const chromeWebsites: WebsiteUsage[] = Object.entries(chromeDomainDurations)
      .map(([domain, data]) => ({
        domain,
        title: data.title,
        url: data.url,
        durationMs: data.durationMs
      }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10)

    // Process all apps
    const aggregatedApps = Object.entries(appDurations)
      .map(([name, durationMs]) => ({
        name,
        durationMs,
        websites: name === 'Google Chrome' ? chromeWebsites : undefined,
        isExpanded: false
      }))
      .sort((a, b) => b.durationMs - a.durationMs)

    const top3 = aggregatedApps.slice(0, 5)
    const maxDurationOfTop3 = top3.length > 0 ? top3[0].durationMs : 0

    setTopApps(
      top3.map((app) => ({
        ...app,
        percentage:
          maxDurationOfTop3 > 0 ? Math.round((app.durationMs / maxDurationOfTop3) * 100) : 0
      }))
    )
  }, [processedEvents]) // new

  const toggleChromeExpansion = (appName: string): void => {
    setTopApps((prev) =>
      prev.map((app) => (app.name === appName ? { ...app, isExpanded: !app.isExpanded } : app))
    )
  }

  const handleFaviconError = (domain: string): void => {
    setFaviconErrors((prev) => new Set([...prev, domain]))
  }

  const renderContent = (): React.ReactNode => {
    if (isLoadingEvents && topApps.length === 0) {
      return (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={`skel-top-app-${i}`} className="p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
                <Skeleton className="h-4 w-1/5" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      )
    }

    if (topApps.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No significant activity tracked yet today to show top apps.
        </p>
      )
    }

    return (
      <ul className="space-y-3">
        {topApps.map((app, index) => (
          <motion.li
            key={app.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div
              className={`${app.websites ? 'cursor-pointer hover:bg-accent' : ''} rounded-lg p-2 transition-colors`}
              onClick={() => app.websites && toggleChromeExpansion(app.name)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <AppIcon
                    appName={app.name}
                    iconPath={app.iconPath}
                    size={20}
                    className="flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-foreground truncate" title={app.name}>
                    {app.name}
                  </span>
                  {app.websites && (
                    <motion.span
                      animate={{ rotate: app.isExpanded ? 90 : 0 }}
                      className="text-muted-foreground text-xs ml-1"
                    >
                      ▶
                    </motion.span>
                  )}
                </div>
                <span className="text-sm font-normal text-secondary-foreground ml-2">
                  {formatDuration(app.durationMs)}
                </span>
              </div>

              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${app.percentage || 0}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.1 + 0.2 }}
                />
              </div>
            </div>

            <AnimatePresence>
              {app.isExpanded && app.websites && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-6 mt-2 space-y-2 border-l-2 border-primary/30 pl-3 overflow-hidden"
                >
                  {app.websites.map((website, webIndex) => (
                    <motion.div
                      key={website.domain}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: webIndex * 0.05 }}
                      className="flex items-center justify-between py-1.5 hover:bg-accent/50 rounded px-2"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {!faviconErrors.has(website.domain) ? (
                          <img
                            src={getFaviconURL(website.url)}
                            alt="favicon"
                            width={20}
                            height={20}
                            onError={(e) => {
                              const target = e.currentTarget
                              const fallbackSrc = getGoogleFaviconURL(website.url)
                              if (target.src !== fallbackSrc) {
                                target.src = fallbackSrc
                              } else {
                                handleFaviconError(website.domain)
                              }
                            }}
                          />
                        ) : (
                          <div className="w-4 h-4 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 rounded border border-border text-white font-bold text-xs">
                            {website.domain.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-secondary-foreground truncate">
                            {website.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {website.domain}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {formatDuration(website.durationMs)}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        ))}
      </ul>
    )
  }

  return (
    <Card className="bg-card border-border p-4">
      {renderContent()}
      {totalTrackedTimeMs > 0 && topApps.length > 0 && (
        <p className="text-xs text-muted-foreground border-t pt-4 border-border">
          Total actively tracked time today: {formatDuration(totalTrackedTimeMs)}
        </p>
      )}
    </Card>
  )
}

export default TopActivityWidget
