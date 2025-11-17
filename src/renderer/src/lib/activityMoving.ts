export const getTimeRangeDescription = (
  selectedHour: number | null,
  selectedDay: Date | null,
  viewMode: 'day' | 'week',
  startDateMs: number | null,
  endDateMs: number | null
) => {
  if (!startDateMs || !endDateMs) {
    return '' // Return empty string if dates are not available
  }

  if (selectedHour !== null) {
    return `for ${selectedHour.toString().padStart(2, '0')}:00-${(selectedHour + 1).toString().padStart(2, '0')}:00`
  }
  if (selectedDay) {
    return `for ${selectedDay.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`
  }
  if (viewMode === 'day') {
    return `for ${new Date(startDateMs).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`
  }
  // Week view
  const startDate = new Date(startDateMs)
  const endDate = new Date(endDateMs)
  return `from ${startDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })} to ${endDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })}`
}
