// Favorite groups — defines which usernames belong to each group.
// Actual user data is fetched from the API (UserAPI.getByUsername) so that
// cards and profile pages always show the same data.

import type { UserProfile } from "@/types/user"

/** Card-compatible talent data derived from a UserProfile */
export interface TalentCardData {
  id: string
  firstName: string
  lastName: string
  username: string
  role: string
  avatarUrl: string
  rate: string
  experience: string
  country: string
  localTime: string
  rating: number
  projects: number
  skills: string[]
  profileHref: string
}

/** Convert a UserProfile (from the API) into card-compatible data */
export function userProfileToCardData(user: UserProfile): TalentCardData {
  const rateStr =
    user.rateMin != null && user.rateMax != null
      ? `$${user.rateMin} - $${user.rateMax}`
      : user.rateMin != null
        ? `$${user.rateMin}/hr`
        : "Rate not set"

  // Extract country from location (e.g. "Toronto, Canada" → "Canada")
  const country = user.location
    ? user.location.split(",").pop()?.trim() ?? user.location
    : ""

  // Compute local time from timezone
  let localTime = ""
  if (user.timezone) {
    try {
      const now = new Date()
      const formatted = now.toLocaleTimeString("en-US", {
        timeZone: user.timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      localTime = `${formatted} local time`
    } catch {
      localTime = ""
    }
  }

  // Derive experience from work experience entries
  let experience = ""
  if (user.experience && user.experience.length > 0) {
    const totalYears = user.experience.reduce((sum, exp) => {
      const start = new Date(exp.startDate).getFullYear()
      const end = exp.endDate ? new Date(exp.endDate).getFullYear() : new Date().getFullYear()
      return sum + (end - start)
    }, 0)
    experience = `${totalYears} year${totalYears !== 1 ? "s" : ""} of experience`
  }

  return {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username ?? "",
    role: user.role as string ?? "",
    avatarUrl: user.avatarUrl ?? "",
    rate: rateStr,
    experience,
    country,
    localTime,
    rating: user.clientSuccessRating ?? 4.8,
    projects: user.totalProjectsCompleted ?? 0,
    skills: user.skills?.map((s) => s.name) ?? [],
    profileHref: `/talent-profile?username=${user.username ?? ""}`,
  }
}

// Group assignments — each group maps to a list of usernames in the database
export interface FavoriteGroupData {
  id: string
  name: string
  usernames: string[] // ordered by most recently added (last = most recent)
  createdAt: string // ISO date string
}

export const sampleGroups: FavoriteGroupData[] = [
  {
    id: "grp-visual-designers",
    name: "Visual Designers",
    usernames: ["amarachen", "chloe.design", "alexpetrov"],
    createdAt: "2025-11-10T00:00:00Z",
  },
  {
    id: "grp-ux-researchers",
    name: "UX Researchers",
    usernames: ["mwebb_design", "bella.ux", "fatima.uxr", "sofiareyes.ux"],
    createdAt: "2025-12-05T00:00:00Z",
  },
  {
    id: "grp-frontend-devs",
    name: "Frontend Developers",
    usernames: ["dan.okoro", "lena.codes", "kevinpark.fe", "chriswilliams"],
    createdAt: "2026-01-14T00:00:00Z",
  },
  {
    id: "grp-backend-devs",
    name: "Backend Developers",
    usernames: ["rajpatel.dev", "yuki.backend", "mayaj.be", "andresilva.be"],
    createdAt: "2026-01-28T00:00:00Z",
  },
  {
    id: "grp-product-managers",
    name: "Product Managers",
    usernames: ["olivia.pm", "jamesokafor", "lucasf.pm"],
    createdAt: "2026-02-11T00:00:00Z",
  },
  {
    id: "grp-data-analysts",
    name: "Data Analysts",
    usernames: ["priya.data", "erik.analytics", "aisha.data"],
    createdAt: "2026-02-25T00:00:00Z",
  },
  {
    id: "grp-copywriters",
    name: "Copywriters",
    usernames: ["ninacosta.words", "tomwrites", "hannah.copy"],
    createdAt: "2026-03-08T00:00:00Z",
  },
]

/** Get the usernames for a group */
export function getUsernamesForGroup(groupId: string): string[] {
  const group = sampleGroups.find((g) => g.id === groupId)
  return group?.usernames ?? []
}
