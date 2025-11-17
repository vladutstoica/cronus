import { DragState } from '@renderer/hooks/useTimeSelection'
import { type DaySegment } from '@renderer/lib/dayTimelineHelpers'
import clsx from 'clsx'
import React from 'react'

interface SelectionBoxProps {
  isVisible: boolean
  dragState: DragState
  yToTime: (y: number) => { y: number } | null
  hasGoogleCalendarEvents: boolean
  existingSegments: DaySegment[]
}

export const SelectionBox: React.FC<SelectionBoxProps> = ({
  isVisible,
  dragState,
  yToTime,
  hasGoogleCalendarEvents,
  existingSegments
}) => {
  if (!isVisible || !dragState.startPos || !dragState.currentPos) {
    return null
  }

  const start = yToTime(dragState.startPos.y)
  const end = yToTime(dragState.currentPos.y)
  if (!start || !end) return null

  // Find the boundary where we should stop based on existing segments
  const startY = dragState.startPos.y
  const currentY = dragState.currentPos.y
  const isDraggingDown = currentY > startY

  let limitedEndY = currentY

  if (existingSegments.length > 0) {
    for (const segment of existingSegments) {
      // Skip calendar events as they are informational overlays only
      if (segment.type === 'calendar') {
        continue
      }
      
      if (isDraggingDown) {
        // When dragging down, check if we're hitting the top of an existing segment
        if (segment.top > startY && segment.top < currentY) {
          limitedEndY = Math.min(limitedEndY, segment.top)
        }
      } else {
        // When dragging up, check if we're hitting the bottom of an existing segment
        const segmentBottom = segment.top + segment.height
        if (segmentBottom < startY && segmentBottom > currentY) {
          limitedEndY = Math.max(limitedEndY, segmentBottom)
        }
      }
    }
  }

  const limitedEnd = yToTime(limitedEndY)
  if (!limitedEnd) return null

  const top = Math.min(start.y, limitedEnd.y)
  const height = Math.abs(start.y - limitedEnd.y)

  return (
    <div
      className={clsx(
        'absolute bg-blue-500/30 border-2 border-blue-500 rounded-md z-10 pointer-events-none left-[67px]',
        'right-1'
      )}
      style={{
        top: `${top + 1}px`,
        height: `${Math.max(0, height - 2)}px`
      }}
    />
  )
}
