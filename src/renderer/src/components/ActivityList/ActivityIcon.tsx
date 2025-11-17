import { cn } from '../../lib/utils'
import { getFaviconURL } from '../../utils/favicon'
import AppIcon from '../AppIcon'
import { useState } from 'react'

interface ActivityIconProps {
  url?: string | null
  appName?: string | null
  size: number
  className?: string
  itemType?: 'website' | 'app' | 'other'
  color?: string
  showFallback?: boolean
  fallbackText?: string
}

// TODO: marge with constants array?
const systemEventNames = [
  '💤 System Inactive',
  '⏰ System Active',
  '🔒 Screen Locked',
  '🔓 Screen Unlocked'
]

export function ActivityIcon({
  url,
  appName,
  size,
  className,
  itemType,
  color,
  showFallback,
  fallbackText
}: ActivityIconProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)

  const isSystemEvent = appName && systemEventNames.includes(appName)

  if (isSystemEvent) {
    return <div style={{ width: size, height: size }} className={cn('flex-shrink-0', className)} />
  }

  // Determine the effective item type - check for empty URLs
  let effectiveItemType = itemType
  if (!effectiveItemType) {
    if (url && url.trim() !== '') {
      effectiveItemType = 'website'
    } else if (appName) {
      effectiveItemType = 'app'
    } else {
      effectiveItemType = 'other'
    }
  }

  if (effectiveItemType === 'website' && url && url.trim() !== '') {
    if (showFallback) {
      return (
        <div
          style={{ width: size, height: size }}
          className={cn(
            'flex items-center justify-center bg-muted text-muted-foreground rounded text-xs flex-shrink-0',
            className
          )}
        >
          {fallbackText}
        </div>
      )
    }

    // Show simple colored circle if favicon failed
    if (faviconFailed) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-blue-500 text-white rounded-full flex-shrink-0',
            className
          )}
          style={{ width: size, height: size }}
        >
          <span style={{ fontSize: size * 0.5 }}>🌐</span>
        </div>
      )
    }

    // Try favicon once, fallback to simple icon if it fails
    return (
      <img
        src={getFaviconURL(url)}
        className={cn('rounded flex-shrink-0', className)}
        style={{ width: size, height: size }}
        onError={() => {
          setFaviconFailed(true)
        }}
        alt={appName || 'favicon'}
      />
    )
  }

  // For manual entries (type: 'other') - show simple colored circle with letter
  if (effectiveItemType === 'other' && color) {
    const displayName = fallbackText || appName || 'M'
    const firstLetter = displayName.charAt(0).toUpperCase()

    return (
      <div
        className={cn('flex items-center justify-center rounded-full flex-shrink-0', className)}
        style={{
          backgroundColor: color,
          width: size,
          height: size
        }}
      >
        <span style={{ fontSize: size * 0.4, color: 'white', fontWeight: 'bold' }}>
          {firstLetter}
        </span>
      </div>
    )
  }

  // Only use AppIcon for real apps (not manual entries)
  if (effectiveItemType === 'app' && appName && itemType !== 'other') {
    return <AppIcon appName={appName} size={size} className={cn('flex-shrink-0', className)} />
  }

  return <div style={{ width: size, height: size }} className={cn('flex-shrink-0', className)} />
}
