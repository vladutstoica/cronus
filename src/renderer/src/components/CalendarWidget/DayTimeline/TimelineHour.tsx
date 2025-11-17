import clsx from 'clsx'
import { Filter } from 'lucide-react'
import { memo } from 'react'
import { Button } from '../../ui/button'

interface TimelineHourProps {
  hour: number
  isCurrentHour: boolean
  selectedHour: number | null
  currentHourRef: React.RefObject<HTMLDivElement | null> | null
  isLastHour: boolean
  hourHeight: number
  onHourSelect: (hour: number | null) => void
  hasActivity: boolean
}

export const TimelineHour = memo(
  ({
    hour,
    isCurrentHour,
    selectedHour,
    currentHourRef,
    isLastHour,
    hourHeight,
    onHourSelect,
    hasActivity
  }: TimelineHourProps) => {
    const handleFilterClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (selectedHour === hour) {
        onHourSelect(null) // Deselect if already selected
      } else {
        onHourSelect(hour)
      }
    }

    return (
      <div
        key={hour}
        className={clsx(
          'group relative pl-2 flex border-slate-300 dark:border-slate-600',
          selectedHour === hour && selectedHour !== null
            ? 'bg-blue-200/20 dark:bg-blue-800/30 cursor-pointer'
            : '',
          hour &&
            selectedHour !== hour &&
            selectedHour !== null &&
            (selectedHour !== null || hasActivity)
            ? 'hover:bg-blue-200/20 dark:hover:bg-blue-800/30 cursor-pointer'
            : '',
          isLastHour ? '' : 'border-b'
        )}
        ref={isCurrentHour ? currentHourRef : null}
        style={{ height: `${hourHeight}rem` }}
        onClick={() => {
          if (selectedHour !== null) {
            onHourSelect(null)
          }
        }}
      >
        <div className="w-14 py-2 text-xs text-muted-foreground font-medium flex-col sticky left-0 flex items-center justify-between pr-2 z-10">
          <span className={clsx(selectedHour === hour && 'text-blue-500')}>
            {hour.toString().padStart(2, '0')}:00
          </span>
          {hasActivity && (
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                selectedHour === hour && 'opacity-100'
              )}
              onClick={handleFilterClick}
            >
              <Filter size={12} />
            </Button>
          )}
        </div>

        <div className="flex-1 border-l relative">
          <div className="absolute inset-0 flex flex-col">
            {Array.from({ length: 4 }).map((_, quarter) => (
              <div
                key={quarter}
                className="flex-1 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
)
