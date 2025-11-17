export const convertYToTime = (y: number, timelineContainer: HTMLDivElement) => {
  const relativeY = y

  const totalMinutesInDay = 24 * 60
  const timelineHeight = timelineContainer.offsetHeight

  const clampedY = Math.max(0, Math.min(relativeY, timelineHeight))

  const minutesFromTop = (clampedY / timelineHeight) * totalMinutesInDay
  const hour = Math.floor(minutesFromTop / 60)
  const minute = Math.floor(minutesFromTop % 60)

  let snappedMinute = Math.round(minute / 5) * 5
  let finalHour = hour

  if (snappedMinute === 60) {
    finalHour += 1
    snappedMinute = 0
  }

  const snappedMinutesFromTop = finalHour * 60 + snappedMinute
  const snappedYPosition = (snappedMinutesFromTop / totalMinutesInDay) * timelineHeight

  return { hour: finalHour, minute: snappedMinute, y: snappedYPosition }
}
