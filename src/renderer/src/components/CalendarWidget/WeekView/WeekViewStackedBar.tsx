import { getDarkerColor, processColor } from '../../../lib/colors'
import { formatDuration } from '../../../lib/timeFormatting'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'
import type { CategoryTotal } from './WeekProductivityBarChart'

export interface WeekViewStackedBarProps {
  categories: CategoryTotal[]
  totalDuration: number
  percentage: number
  isDarkMode: boolean
  isProductive?: boolean
}

export const WeekViewStackedBar = ({
  categories,
  totalDuration,
  percentage,
  isDarkMode,
  isProductive
}: WeekViewStackedBarProps) => {
  // Group small categories (< 10 min) into one 'Other' at the bottom
  const twentyMinMs = 10 * 60 * 1000
  const large = categories.filter((cat) => cat.totalDurationMs >= twentyMinMs)
  const small = categories.filter((cat) => cat.totalDurationMs < twentyMinMs)
  let grouped = [...large]
  let otherCategories: Array<{ name: string; duration: number }> = []
  if (small.length > 0) {
    const otherDuration = small.reduce((sum, cat) => sum + cat.totalDurationMs, 0)
    otherCategories = small.map((cat) => ({ name: cat.name, duration: cat.totalDurationMs }))
    grouped.push({
      categoryId: 'other',
      name: 'Other',
      categoryColor: '#808080',
      totalDurationMs: otherDuration,
      isProductive,
      _otherCategories: otherCategories
    })
  }
  // Sort by duration descending, but always put 'Other' last if present
  grouped = grouped
    .filter((cat) => cat.categoryId !== 'other')
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
  if (otherCategories.length > 0) {
    grouped.push({
      categoryId: 'other',
      name: 'Other',
      categoryColor: '#808080',
      totalDurationMs: otherCategories.reduce((sum, c) => sum + c.duration, 0),
      isProductive,
      _otherCategories: otherCategories
    })
  }
  return (
    <div className="w-full flex flex-col gap-px" style={{ height: `${percentage}%` }}>
      {grouped.map((cat, catIndex) => {
        const catPercent = (cat.totalDurationMs / totalDuration) * 100
        const showLabel = cat.totalDurationMs >= 30 * 60 * 1000 // 30 min
        const isOther = cat.categoryId === 'other'
        return (
          <Tooltip key={catIndex} delayDuration={100}>
            <TooltipTrigger asChild>
              <div
                className="w-full transition-all duration-300 rounded-lg flex items-center justify-center text-center overflow-hidden"
                style={{
                  height: `${catPercent}%`,
                  backgroundColor: processColor(
                    isOther ? '#808080' : cat.categoryColor || '#808080',
                    {
                      isDarkMode,
                      saturation: 1.2,
                      lightness: 1.1,
                      opacity: isDarkMode ? 0.7 : 0.5
                    }
                  )
                }}
              >
                {catPercent > 10 && showLabel && (
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: getDarkerColor(
                        isOther ? '#808080' : cat.categoryColor || '#808080',
                        isDarkMode ? 0.8 : 0.5
                      )
                    }}
                  >
                    {formatDuration(cat.totalDurationMs)}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              {isOther && cat._otherCategories
                ? [
                    <div key="other-title">
                      <b>Other:</b>
                    </div>,
                    ...cat._otherCategories.map((c, i) => (
                      <div key={i}>
                        {c.name}: {formatDuration(c.duration) || ''}
                      </div>
                    ))
                  ]
                : cat.name}
              <div className="text-xs text-muted-foreground">
                {formatDuration(cat.totalDurationMs)}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
