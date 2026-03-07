import { DAYS } from "./day"

export enum AVAILABILITY {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CUSTOM = "CUSTOM",
}

export type CreateTalentType = {
  avatar?: File
  username?: string
  firstName?: string
  lastName?: string
  location?: string
  language?: string
  recentJobTitle?: string
  industriesWorkedIn?: string
  lookingToWorkWith?: string[]
  isStudent?: boolean
  projectTypes?: string[]
  availability?: AVAILABILITY
  customAvailability?: {
    day?: string | undefined
    times?: {
      startTime?: string
      startTimeDayPeriod?: string
      endTime?: string
      endTimeDayPeriod?: string
    }[]
  }[]
}
