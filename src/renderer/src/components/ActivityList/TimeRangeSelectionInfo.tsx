import React from 'react'
import { Button } from '../ui/button'

interface TimeRangeSelectionInfoProps {
  selectedHour: number | null
  onHourSelect: (hour: number | null) => void
  selectedDay: Date | null
  onDaySelect: (day: Date | null) => void
}

export const TimeRangeSelectionInfo: React.FC<TimeRangeSelectionInfoProps> = ({
  selectedHour,
  onHourSelect,
  selectedDay,
  onDaySelect
}) => {
  if (selectedHour === null && !selectedDay) {
    return null
  }
  return (
    <>
      {selectedHour !== null && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted rounded-sm">
          <span className="text-xs text-muted-foreground font-normal">
            Displaying activities for {selectedHour.toString().padStart(2, '0')}:00-
            {(selectedHour + 1).toString().padStart(2, '0')}:00
          </span>
          <Button variant="outline" size="xs" onClick={() => onHourSelect(null)}>
            Show Full Day
          </Button>
        </div>
      )}
      {selectedDay && (
        <div className="flex justify-between items-center px-3 py-2 bg-muted rounded-sm">
          <span className="text-xs text-muted-foreground font-normal">
            Displaying activities for{' '}
            {selectedDay.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
          <Button variant="outline" size="xs" onClick={() => onDaySelect(null)}>
            Show Full Week
          </Button>
        </div>
      )}
    </>
  )
}
