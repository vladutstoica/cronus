import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip'

interface CalendarEventTooltipProps {
  children: React.ReactNode
  event: any // The rich calendar event data
}

export const CalendarEventTooltip = ({ children, event }: CalendarEventTooltipProps) => {
  const isGoogleMeet = () => {
    return (
      event.conferenceData?.conferenceSolution?.key?.type === 'hangoutsMeet' ||
      event.hangoutLink?.includes('meet.google.com')
    )
  }

  const getMeetingLink = () => {
    if (event.hangoutLink) return event.hangoutLink
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === 'video'
      )
      return videoEntry?.uri
    }
    return null
  }

  const getMeetingCode = () => {
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (entry: any) => entry.entryPointType === 'video'
      )
      return videoEntry?.meetingCode || videoEntry?.accessCode
    }
    return null
  }

  const getAttendees = () => {
    if (!event.attendees || event.attendees.length === 0) return []
    return event.attendees.filter((attendee: any) => !attendee.organizer) // Exclude organizer
  }

  const getAcceptedCount = () => {
    const attendees = getAttendees()
    return attendees.filter((attendee: any) => attendee.responseStatus === 'accepted').length
  }

  const handleDescriptionClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'A' && target.hasAttribute('href')) {
      e.preventDefault()
      const url = target.getAttribute('href')
      if (url) {
        window.api?.openExternalUrl(url)
      }
    }
  }

  const attendees = getAttendees()
  const meetingLink = getMeetingLink()
  const meetingCode = getMeetingCode()
  const acceptedCount = getAcceptedCount()

  // Professional icon URLs
  const GOOGLE_CALENDAR_ICON =
    'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'
  const GOOGLE_MEET_ICON =
    'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png'

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="start" sideOffset={10}>
        <div className="max-w-80 max-h-96 overflow-hidden">
          {/* Header with Google Calendar icon and title */}
          <div className="flex items-start gap-3">
            <img
              src={GOOGLE_CALENDAR_ICON}
              alt="Google Calendar"
              className="w-5 h-5 mt-0.5 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight break-words">
                {event.summary || event.title}
              </h3>
              {event.organizer && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  by {event.organizer.displayName || event.organizer.email}
                </p>
              )}
            </div>
          </div>

          {/* Google Meet section */}
          {isGoogleMeet() && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md mt-3">
              <img src={GOOGLE_MEET_ICON} alt="Google Meet" className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Google Meet
                </span>
                {meetingCode && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                    {meetingCode}
                  </p>
                )}
              </div>
              {meetingLink && (
                <button
                  onClick={() => window.api?.openExternalUrl(meetingLink)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors flex-shrink-0"
                >
                  Join
                </button>
              )}
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <div
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert prose-sm max-h-32 overflow-y-auto break-words"
                dangerouslySetInnerHTML={{ __html: event.description }}
                onClick={handleDescriptionClick}
              />
            </div>
          )}

          {/* Participants */}
          {attendees.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Participants ({attendees.length})
                </h4>
                {acceptedCount > 0 && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {acceptedCount} accepted
                  </span>
                )}
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {attendees.slice(0, 5).map((attendee: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                      {attendee.displayName || attendee.email}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        attendee.responseStatus === 'accepted'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : attendee.responseStatus === 'declined'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : attendee.responseStatus === 'tentative'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {attendee.responseStatus === 'accepted'
                        ? '✓'
                        : attendee.responseStatus === 'declined'
                          ? '✗'
                          : attendee.responseStatus === 'tentative'
                            ? '?'
                            : '○'}
                    </span>
                  </div>
                ))}
                {attendees.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                    +{attendees.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">📍</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{event.location}</span>
              </div>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
