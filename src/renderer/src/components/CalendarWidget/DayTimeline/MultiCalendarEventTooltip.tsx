import React from 'react'
import type { DaySegment } from '../../../lib/dayTimelineHelpers'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'

interface MultiCalendarEventTooltipProps {
  children: React.ReactNode
  events: DaySegment[] // Array of rich calendar event data
}

export const MultiCalendarEventTooltip = ({ children, events }: MultiCalendarEventTooltipProps) => {
  const GOOGLE_CALENDAR_ICON =
    'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="start" sideOffset={10} className="w-full max-w-xs">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <img
              src={GOOGLE_CALENDAR_ICON}
              alt="Google Calendar"
              className="h-5 w-5 flex-shrink-0"
            />
            <div>
              <h3 className="font-semibold leading-tight text-gray-900 dark:text-gray-100">
                {events.length} Overlapping Events
              </h3>
            </div>
          </div>

          <div className="flex max-h-60 flex-col gap-3 overflow-y-auto pr-2">
            {events.map((event) => (
              <div
                key={event._id}
                className="border-t border-gray-200 pt-3 text-sm dark:border-gray-700"
              >
                <p className="truncate font-medium text-gray-800 dark:text-gray-200">
                  {event.description || 'No Title'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(event.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  -{' '}
                  {new Date(event.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {event.originalEvent?.organizer && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    by{' '}
                    {event.originalEvent.organizer.displayName ||
                      event.originalEvent.organizer.email}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
