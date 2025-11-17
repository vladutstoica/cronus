import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../ui/button'
import { Calendar } from '../../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover'

interface CalendarHeaderDateNavigationProps {
  handlePrev: () => void
  handleNext: () => void
  canGoNext: () => boolean
  selectedDate: Date
  onDateSelect: (date: Date) => void
  width: number
  fullDate: string
  compactDate: string
  viewMode: 'day' | 'week'
}

export const CalendarHeaderDateNavigation = ({
  handlePrev,
  handleNext,
  canGoNext,
  selectedDate,
  onDateSelect,
  width,
  fullDate,
  compactDate,
  viewMode
}: CalendarHeaderDateNavigationProps) => {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="xs" onClick={handlePrev}>
        <ChevronLeft size={20} />
      </Button>
      {viewMode === 'day' ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="xs" className="cursor-pointer">
              <div className="flex items-center gap-1 min-w-0">
                {width >= 1000 ? (
                  <span className="text-sm text-muted-foreground font-medium">{fullDate}</span>
                ) : width >= 800 ? (
                  <span
                    className="text-xs text-muted-foreground font-medium px-1 py-0.5"
                    title={fullDate}
                  >
                    {compactDate}
                  </span>
                ) : (
                  <span
                    className="text-xs text-muted-foreground font-medium px-1 py-0.5 bg-muted/30 rounded text-center min-w-[60px]"
                    title={fullDate}
                  >
                    {selectedDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                )}

                {selectedDate.toDateString() === new Date().toDateString() && (
                  <span className="text-xs font-medium px-1 py-0.5 dark:bg-blue-900/80 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-sm">
                    Today
                  </span>
                )}
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 rounded-md">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) onDateSelect(date)
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <span className="text-sm text-muted-foreground font-medium px-2 select-none">
          {compactDate}
        </span>
      )}
      <Button variant="outline" size="xs" onClick={handleNext} disabled={!canGoNext()}>
        <ChevronRight size={20} />
      </Button>
    </div>
  )
}
