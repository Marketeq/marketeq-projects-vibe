export const HOURS_PER_DAY = 8
export const WORKING_DAYS_PER_WEEK = 5

export const weeklyHoursForSchedule = (
  workSchedule?: string | null,
  customHoursPerWeek?: number | null
): number => {
  if (workSchedule === "part_time") return 20
  if (workSchedule === "custom") {
    const value = Number(customHoursPerWeek)
    return Number.isFinite(value) && value > 0 ? value : 40
  }
  return 40
}

export const taskWorkingDays = (
  hours: number | null | undefined,
  workSchedule?: string | null,
  customHoursPerWeek?: number | null
): number => {
  const value = Number(hours) || 0
  const hoursPerDay =
    weeklyHoursForSchedule(workSchedule, customHoursPerWeek) /
    WORKING_DAYS_PER_WEEK
  return value > 0 ? Math.ceil(value / hoursPerDay) : 0
}

export const workingDaysToWeeks = (workingDays: number): number =>
  Math.max(1, Math.ceil(workingDays / WORKING_DAYS_PER_WEEK))

export const workingDaysToCalendarDays = (workingDays: number): number =>
  workingDays > 0 ? workingDaysToWeeks(workingDays) * 7 : 0
