export const HOURS_PER_DAY = 8
export const WORKING_DAYS_PER_WEEK = 5

export const taskWorkingDays = (hours: number | null | undefined): number => {
  const value = Number(hours) || 0
  return value > 0 ? Math.ceil(value / HOURS_PER_DAY) : 0
}

export const workingDaysToWeeks = (workingDays: number): number =>
  Math.max(1, Math.ceil(workingDays / WORKING_DAYS_PER_WEEK))

export const workingDaysToCalendarDays = (workingDays: number): number =>
  workingDays > 0 ? workingDaysToWeeks(workingDays) * 7 : 0
