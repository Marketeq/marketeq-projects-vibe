import { intervalToDuration } from "date-fns"

export function getFormattedDuration(
  from: Date,
  to: Date = new Date()
): string {
  const duration = intervalToDuration({ start: from, end: to })

  const parts: string[] = []

  if (duration.years) {
    parts.push(`${duration.years} year${duration.years > 1 ? "s" : ""}`)
  }
  if (duration.months) {
    parts.push(`${duration.months} month${duration.months > 1 ? "s" : ""}`)
  }

  return parts.join(" ")
}
