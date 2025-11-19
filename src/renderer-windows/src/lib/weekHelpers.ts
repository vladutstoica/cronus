/**
 * Get the start of the week (Monday) for a given date
 * @param date The date to get the week start for
 * @returns A new Date object set to Monday 00:00:00 of that week
 */
export function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  // Sunday = 0, Monday = 1, ..., Saturday = 6
  // Calculate days to subtract to get to Monday
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the week (Sunday 23:59:59.999) for a given date
 * @param date The date to get the week end for
 * @returns A new Date object set to Sunday 23:59:59.999 of that week
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setMilliseconds(-1); // One millisecond before next Monday
  return end;
}

/**
 * Get the start of a week N weeks ago from a given date
 * @param date The reference date
 * @param weeksAgo Number of weeks to go back (0 = current week, 1 = last week, etc.)
 * @returns A new Date object set to Monday 00:00:00 of that week
 */
export function getWeekStartNWeeksAgo(date: Date, weeksAgo: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - weeksAgo * 7);
  return getWeekStart(result);
}
