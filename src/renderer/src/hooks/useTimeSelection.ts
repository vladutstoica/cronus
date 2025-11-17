import { RefObject, useState } from 'react'
import { type DaySegment } from '@renderer/lib/dayTimelineHelpers'
import { useToast } from './use-toast'

export type DragState = {
  isSelecting: boolean
  isDragging: boolean
  startPos: { y: number } | null
  currentPos: { y: number } | null
}

export const useTimeSelection = (
  timelineContainerRef: RefObject<HTMLDivElement>,
  yToTime: (y: number) => { hour: number; minute: number; y: number } | null,
  onSelectionEnd: (
    startTime: { hour: number; minute: number },
    endTime: { hour: number; minute: number }
  ) => void,
  isEnabled: boolean,
  dayForEntries: Date,
  existingSegments: DaySegment[] = []
) => {
  const { toast } = useToast()

  const [dragState, setDragState] = useState<DragState>({
    isSelecting: false,
    isDragging: false,
    startPos: null,
    currentPos: null
  })

  const getRelativeY = (clientY: number) => {
    if (!timelineContainerRef.current) return 0
    const rect = timelineContainerRef.current.getBoundingClientRect()
    return clientY - rect.top
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEnabled) {
      return
    }

    if (!timelineContainerRef.current) {
      return
    }

    // Do not start a drag if clicking on an existing segment or its children
    const target = e.target as HTMLElement
    const closestSegment = target.closest('[data-is-segment="true"]')
    if (closestSegment) {
      return
    }

    const startY = getRelativeY(e.clientY)
    const startPos = yToTime(startY)

    if (!startPos) {
      return
    }

    setDragState({
      isSelecting: true,
      isDragging: false,
      startPos: { y: startY },
      currentPos: { y: startY }
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.isSelecting || !timelineContainerRef.current) return

    setDragState((prev) => {
      if (!prev.startPos) return prev
      const currentY = getRelativeY(e.clientY)
      const isDragging = prev.isDragging || Math.abs(currentY - prev.startPos.y) > 5 // 5px threshold

      // Limit the current position based on existing segments
      let limitedCurrentY = currentY
      const startY = prev.startPos.y
      const isDraggingDown = currentY > startY

      if (existingSegments.length > 0) {
        for (const segment of existingSegments) {
          // Skip calendar events as they are informational overlays only
          if (segment.type === 'calendar') {
            continue
          }
          
          if (isDraggingDown) {
            // When dragging down, stop at the top of any existing segment
            if (segment.top > startY && segment.top < currentY) {
              limitedCurrentY = Math.min(limitedCurrentY, segment.top)
            }
          } else {
            // When dragging up, stop at the bottom of any existing segment
            const segmentBottom = segment.top + segment.height
            if (segmentBottom < startY && segmentBottom > currentY) {
              limitedCurrentY = Math.max(limitedCurrentY, segmentBottom)
            }
          }
        }
      }

      return { ...prev, isDragging, currentPos: { y: limitedCurrentY } }
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragState.isSelecting || !dragState.isDragging || !timelineContainerRef.current) {
      setDragState({ isSelecting: false, isDragging: false, startPos: null, currentPos: null })
      return
    }

    // Use the collision-limited position from dragState instead of raw mouse position
    const endY = dragState.currentPos?.y ?? getRelativeY(e.clientY)
    const startTime = yToTime(dragState.startPos!.y)
    const endTime = yToTime(endY)

    if (startTime && endTime) {
      const selectionStart = startTime.y < endTime.y ? startTime : endTime
      const selectionEnd = startTime.y < endTime.y ? endTime : startTime

      // Only prevent future selection if dayForEntries is today
      const now = new Date()
      const isToday = dayForEntries.toDateString() === now.toDateString()

      if (isToday) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selectionDate = new Date(today)
        selectionDate.setHours(selectionEnd.hour, selectionEnd.minute, 0, 0)

        if (selectionDate > now) {
          toast({
            duration: 1500,
            title: 'Cannot log time in the future',
            description:
              "You can't add entries after the current time. This feature is meant to log time away from your computer.",
            variant: 'default'
          })
          setDragState((prev) => ({ ...prev, isSelecting: false, isDragging: false }))
          return
        }
      }

      const isValidSelection =
        selectionEnd.hour * 60 + selectionEnd.minute >
        selectionStart.hour * 60 + selectionStart.minute

      if (isValidSelection) {
        onSelectionEnd(
          { hour: selectionStart.hour, minute: selectionStart.minute },
          { hour: selectionEnd.hour, minute: selectionEnd.minute }
        )
      }
    }
    // Keep selection box visible by only resetting isSelecting and isDragging
    setDragState((prev) => ({ ...prev, isSelecting: false, isDragging: false }))
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.isSelecting && dragState.isDragging) {
      handleMouseUp(e)
    } else if (dragState.isSelecting) {
      resetDragState()
    }
  }

  const resetDragState = () => {
    setDragState({
      isSelecting: false,
      isDragging: false,
      startPos: null,
      currentPos: null
    })
  }

  return {
    dragState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    resetDragState
  }
}
