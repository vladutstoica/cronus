import { CanonicalBlock } from '@renderer/lib/dayTimelineHelpers'
import { JSX, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentTime } from '../../hooks/useCurrentTime'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { localApi } from '../../lib/localApi'
import type { ProcessedEventBlock } from '../DashboardView'
import { CalendarWidgetHeader } from './CalendarWidgetHeader'
import CalendarZoomControls from './DayTimeline/CalendarZoomControls'
import { DayTimeline } from './DayTimeline/DayTimeline'
import { ProductivityTrendChart } from './WeekView/ProductiveHoursChart'
import WeekBreakdown from './WeekView/WeekBreakdown'
import { WeeklyProductivity } from './WeekView/WeeklyProductivity'
import WeekProductivityBarChart from './WeekView/WeekProductivityBarChart'

interface CalendarWidgetProps {
  selectedDate: Date
  trackedEvents: ProcessedEventBlock[] | null
  googleCalendarEvents: ProcessedEventBlock[] | null
  isLoadingEvents: boolean
  viewMode: 'day' | 'week'
  onDateChange: (newDate: Date) => void
  onViewModeChange: (newMode: 'day' | 'week') => void
  selectedHour: number | null
  onHourSelect: (hour: number | null) => void
  selectedDay: Date | null
  onDaySelect: (day: Date | null) => void
  weekViewMode: 'stacked' | 'grouped'
  onWeekViewModeChange: (mode: 'stacked' | 'grouped') => void
  isLoading?: boolean
}

const CalendarWidget = ({
  selectedDate,
  trackedEvents,
  googleCalendarEvents,
  viewMode,
  onDateChange,
  onViewModeChange,
  selectedHour,
  onHourSelect,
  selectedDay,
  onDaySelect,
  weekViewMode,
  onWeekViewModeChange,
  isLoading = false
}: CalendarWidgetProps): JSX.Element => {
  const currentTime = useCurrentTime()
  const isDarkMode = useDarkMode()
  const [wasSetToToday, setWasSetToToday] = useState(false)
  const width = useWindowWidth()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hourHeight, setHourHeight] = useState(5) // Default: 80px -> 5rem
  const { isAuthenticated } = useAuth()
  const [animationDirection, setAnimationDirection] = useState<'prev' | 'next' | 'none'>('none')
  const [electronSettings, setElectronSettings] = useState<any>(null)

  // Load electron settings
  useEffect(() => {
    if (isAuthenticated) {
      localApi.user.get().then((userData) => {
        if (userData?.electron_app_settings) {
          setElectronSettings(userData.electron_app_settings)
        }
      })
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (electronSettings?.calendarZoomLevel) {
      setHourHeight(electronSettings.calendarZoomLevel / 16)
    }
  }, [electronSettings?.calendarZoomLevel])

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!isAuthenticated || !hourHeight || !electronSettings) return
      // convert back to px
      const newZoomLevel = Math.round(hourHeight * 16)
      if (newZoomLevel !== electronSettings?.calendarZoomLevel) {
        try {
          await localApi.user.update({
            electron_app_settings: {
              ...electronSettings,
              calendarZoomLevel: newZoomLevel
            }
          })
        } catch (error) {
          console.error('Failed to update calendar zoom level:', error)
        }
      }
    }, 500) // 500ms debounce

    return () => {
      clearTimeout(handler)
    }
  }, [hourHeight, isAuthenticated, electronSettings])

  useEffect(() => {
    setWasSetToToday(selectedDate.toDateString() === new Date().toDateString())
  }, [selectedDate])

  useEffect(() => {
    // only run this if we're viewing the current date
    if (!wasSetToToday) {
      return
    }

    const interval = setInterval(() => {
      // and the day is off
      if (selectedDate.toDateString() !== new Date().toDateString()) {
        // set to actual today
        onDateChange(new Date())
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [wasSetToToday, selectedDate, onDateChange])

  // Check if we're viewing today
  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const canGoNext = () => {
    const delta = viewMode === 'week' ? 7 : 1
    const tomorrow = new Date(selectedDate)
    tomorrow.setDate(tomorrow.getDate() + delta)
    tomorrow.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return tomorrow <= today
  }

  const convertProcessedToTimeBlocks = (events: ProcessedEventBlock[] | null): CanonicalBlock[] => {
    if (!events) {
      return []
    }

    return events.map((eventBlock) => ({
      _id: eventBlock.originalEvent._id,
      startTime: eventBlock.startTime,
      endTime: eventBlock.endTime,
      durationMs: eventBlock.durationMs,
      name: eventBlock.name,
      description: eventBlock.title || '',
      url: eventBlock.url,
      categoryColor: eventBlock.categoryColor,
      categoryId: eventBlock.categoryId || undefined,
      type: eventBlock.originalEvent.type,
      originalEvent: eventBlock.originalEvent,
      originalEventIds: eventBlock.originalEvent._id ? [eventBlock.originalEvent._id] : [] // Store the original event ID if it exists
    }))
  }

  const trackedCanonicalBlocks = useMemo(
    () => convertProcessedToTimeBlocks(trackedEvents),
    [trackedEvents]
  )
  const googleCalendarCanonicalBlocks = useMemo(
    () => convertProcessedToTimeBlocks(googleCalendarEvents),
    [googleCalendarEvents]
  )

  const handlePrev = () => {
    setAnimationDirection('prev')
    const newDate = new Date(selectedDate)
    const delta = viewMode === 'week' ? 7 : 1
    newDate.setDate(newDate.getDate() - delta)
    onDateChange(newDate)
  }

  const handleNext = () => {
    setAnimationDirection('next')
    const newDate = new Date(selectedDate)
    const delta = viewMode === 'week' ? 7 : 1
    newDate.setDate(newDate.getDate() + delta)

    // Check if the new date would be in the future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    newDate.setHours(0, 0, 0, 0)

    // Only allow navigation if the new date is not in the future
    if (newDate <= today) {
      onDateChange(newDate)
    }
  }

  const handleDateSelect = (date: Date) => {
    setAnimationDirection('none')
    onDateChange(date)
  }

  const handleZoomIn = () => {
    setHourHeight((prev) => Math.min(prev * 1.2, 12)) // max 120px -> 7.5rem
  }

  const handleZoomOut = () => {
    setHourHeight((prev) => Math.max(prev / 1.2, 2.5)) // min 40px -> 2.5rem
  }

  const formattedDate = useMemo(() => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate)
      const dayOfWeek = startOfWeek.getDay() // Sunday = 0, Monday = 1, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday start
      startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)
      startOfWeek.setHours(0, 0, 0, 0)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      const startMonth = startOfWeek.toLocaleDateString(undefined, { month: 'short' })
      const endMonth = endOfWeek.toLocaleDateString(undefined, { month: 'short' })
      const startDay = startOfWeek.getDate()
      const endDay = endOfWeek.getDate()
      const year = endOfWeek.getFullYear()

      if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }
    return selectedDate.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [selectedDate, viewMode])

  return (
    <div
      className={`relative flex select-none flex-col bg-card ${
        viewMode === 'week' ? '' : 'h-full'
      }`}
    >
      <CalendarWidgetHeader
        handlePrev={handlePrev}
        width={width}
        formattedDate={formattedDate}
        selectedDate={selectedDate}
        handleNext={handleNext}
        canGoNext={canGoNext}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        weekViewMode={weekViewMode}
        setWeekViewMode={onWeekViewModeChange}
        onDateSelect={handleDateSelect}
      />

      <div className="flex-grow overflow-auto" ref={scrollContainerRef}>
        {viewMode === 'week' ? (
          <div className="flex flex-col gap-4">
            <div className="h-[30rem] overflow-auto">
              <WeekProductivityBarChart
                processedEvents={trackedEvents}
                weekViewMode={weekViewMode}
                selectedDay={selectedDay}
                onDaySelect={onDaySelect}
                selectedDate={selectedDate}
                isDarkMode={isDarkMode}
                isLoading={isLoading}
              />
            </div>

            <WeekBreakdown
              processedEvents={trackedEvents}
              isDarkMode={isDarkMode}
              isLoading={isLoading}
              viewingDate={selectedDate}
            />
            <WeeklyProductivity
              processedEvents={trackedEvents}
              isDarkMode={isDarkMode}
              weekViewMode={weekViewMode}
              isLoading={isLoading}
              viewingDate={selectedDate}
            />
            <ProductivityTrendChart
              processedEvents={trackedEvents}
              isDarkMode={isDarkMode}
              isLoading={isLoading}
              viewingDate={selectedDate}
            />
          </div>
        ) : (
          <DayTimeline
            trackedTimeBlocks={trackedCanonicalBlocks}
            googleCalendarTimeBlocks={googleCalendarCanonicalBlocks}
            onHourSelect={onHourSelect}
            selectedHour={selectedHour}
            currentTime={currentTime}
            dayForEntries={selectedDate}
            isToday={isToday}
            isDarkMode={isDarkMode}
            hourHeight={hourHeight}
            scrollContainerRef={scrollContainerRef}
          />
        )}
      </div>
      {viewMode === 'day' && (
        <CalendarZoomControls handleZoomIn={handleZoomIn} handleZoomOut={handleZoomOut} />
      )}
    </div>
  )
}

export default CalendarWidget
