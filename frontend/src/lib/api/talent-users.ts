"use client"

/**
 * Shared fetcher + hook for the public talent users list.
 *
 * Both the /talent browse page and the /c/<category> Recommended → Talent
 * tab need the same list of real talent users from the backend, so we
 * dedupe the network request at the module level — the first caller kicks
 * off a single fetch and every subsequent caller (in the same page load)
 * reuses the cached promise.
 */
import { useEffect, useState } from "react"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { csrfHeader } from "../csrf"

export interface TalentUser {
  id: string
  username?: string
  name?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  userType?: string
  availability?: string | null
  location?: string
  country?: string
  rate?: number | null
  rateMin?: number | null
  rateMax?: number | null
  jobTitles?: Array<
    | {
        jobTitle?: string
        title?: string
        isDefault?: boolean
        saveAsDefault?: boolean
      }
    | string
  >
  recentJobTitle?: string | null
  skills?: Array<{ name?: string } | string>
  overview?: Record<string, any> | null
  rating?: number | null
  reviewsCount?: number | null
  totalProjectsCompleted?: number | null
  aiMatchScore?: number
  aiMatchedSkills?: string[]
  aiReason?: string
}

export interface TalentRecommendationRequest {
  roleTitle: string
  workType?: string
  description?: string
  deliverables?: string
  successCriteria?: string
  skills?: string[]
  locations?: string[]
  experienceLevels?: string[]
  workSchedules?: string[]
  hourlyRate?: string
  limit?: number
}

export interface TalentRecommendationResponse {
  aiStatus: "OK" | "AI_UNAVAILABLE" | "NO_TALENT"
  recommendations: TalentUser[]
  message?: string
}

let cache: Promise<TalentUser[]> | null = null

function fetchTalentUsers(): Promise<TalentUser[]> {
  if (cache) return cache
  const apiBase = getPublicApiUrl() || "http://localhost:4000"
  cache = (async () => {
    try {
      const publicRes = await fetch(`${apiBase}/public/talent?limit=100`)
      if (publicRes.ok) {
        const publicData = await publicRes.json()
        const publicTalents = Array.isArray(publicData?.data)
          ? publicData.data
          : Array.isArray(publicData)
            ? publicData
            : []

        if (publicTalents.length > 0) {
          return publicTalents as TalentUser[]
        }
      }
    } catch {
      // Fall through to the older browse endpoint below.
    }

    try {
      const res = await fetch(`${apiBase}/talent/users`)
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      // Prefer talents with both an avatar AND a username so the card
      // hover-state and "View profile" link both work.
      const rich = data.filter((u: any) => u.username && u.avatarUrl)
      const fallback = data.filter((u: any) => u.username)
      return (rich.length > 0 ? rich : fallback) as TalentUser[]
    } catch {
      return []
    }
  })()
  return cache
}

/**
 * Map a TalentUser to the props the master <ListingCard kind="talent">
 * (and the underlying TalentSearchCard) needs. Centralized so every
 * caller — homepage, /talent, /c/<category>, favorites, etc. — produces
 * an identical card from the same backend payload.
 */
export function talentToCardProps(
  u: TalentUser,
  idx = 0
): {
  id: string
  username: string
  name: string
  handle: string
  role: string
  photo: string
  rate: string
  experience: string
  country: string
  localTime: string
  rating: number
  projects: number
  allStars: boolean
  skills: string[]
} {
  const defaultSkills = [
    "AR/VR Design",
    "UX Research",
    "Prototyping",
    "Figma",
    "User Testing",
    "Wireframing",
    "Adobe XD",
    "Sketch",
    "InVision",
    "Miro",
    "Design Systems",
    "Interaction Design",
  ]
  const skillNames = (u.skills ?? [])
    .map((s) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean) as string[]
  const skills =
    skillNames.length >= 6
      ? skillNames
      : [
          ...skillNames,
          ...defaultSkills.filter((d) => !skillNames.includes(d)),
        ].slice(0, 12)

  const jobTitleLabels = (u.jobTitles ?? [])
    .map((jobTitle: any) =>
      typeof jobTitle === "string"
        ? jobTitle
        : jobTitle?.jobTitle || jobTitle?.title || jobTitle?.headline || ""
    )
    .filter(Boolean)
  const role =
    (u.jobTitles ?? []).find(
      (
        j
      ): j is {
        jobTitle?: string
        title?: string
        isDefault?: boolean
        saveAsDefault?: boolean
      } => typeof j !== "string" && Boolean(j?.isDefault || j?.saveAsDefault)
    )?.jobTitle ||
    jobTitleLabels[0] ||
    u.recentJobTitle ||
    "Marketing Technologist"

  const rate = u.rate
    ? `$${u.rate}`
    : u.rateMin && u.rateMax
      ? `$${u.rateMin} - $${u.rateMax}`
      : u.rateMin
        ? `$${u.rateMin}`
        : "$85 - $120"
  const [firstNameFallback] = (u.name ?? "").trim().split(/\s+/)

  return {
    id: u.id,
    username: u.username ?? "",
    name: u.firstName ?? firstNameFallback ?? "Talent",
    handle: u.username ? `@${u.username}` : "@talent",
    role,
    photo: u.avatarUrl || "/man.jpg",
    rate,
    experience: "5 years of experience",
    country: u.country || u.location || "Australia",
    localTime: "7:30pm local time",
    rating: u.rating ?? 4.7,
    projects: u.totalProjectsCompleted ?? u.reviewsCount ?? 2,
    // Tag every 5th talent in a list as an "All Star" so the badge still
    // renders without DB-side support — purely visual until the field exists.
    allStars: idx % 5 === 0,
    skills,
  }
}

export function useTalentUsers(): {
  talents: TalentUser[]
  isLoading: boolean
} {
  const [talents, setTalents] = useState<TalentUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetchTalentUsers().then((list) => {
      if (cancelled) return
      setTalents(list)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return { talents, isLoading }
}

export function useRecommendedTalentUsers(
  request: TalentRecommendationRequest | null
): {
  talents: TalentUser[]
  aiStatus: TalentRecommendationResponse["aiStatus"] | "IDLE" | "ERROR"
  message: string
  isLoading: boolean
} {
  const [talents, setTalents] = useState<TalentUser[]>([])
  const [aiStatus, setAiStatus] = useState<
    TalentRecommendationResponse["aiStatus"] | "IDLE" | "ERROR"
  >("IDLE")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const requestKey = JSON.stringify(request)
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null)

  useEffect(() => {
    if (!request) {
      setTalents([])
      setAiStatus("IDLE")
      setMessage("")
      setIsLoading(false)
      setLoadedRequestKey(null)
      return
    }

    let cancelled = false
    const apiBase = getPublicApiUrl() || "http://localhost:4000"

    setTalents([])
    setAiStatus("IDLE")
    setMessage("")
    setIsLoading(true)
    fetch(`${apiBase}/public/talent/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeader("POST") },
      body: JSON.stringify(request),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load AI talent recommendations.")
        }

        return (await response.json()) as TalentRecommendationResponse
      })
      .then((data) => {
        if (cancelled) return
        setTalents(
          Array.isArray(data.recommendations) ? data.recommendations : []
        )
        setAiStatus(data.aiStatus)
        setMessage(data.message ?? "")
        setLoadedRequestKey(requestKey)
      })
      .catch((error) => {
        if (cancelled) return
        setTalents([])
        setAiStatus("ERROR")
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load AI talent recommendations."
        )
        setLoadedRequestKey(requestKey)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const hasFreshRecommendations = loadedRequestKey === requestKey

  return {
    talents: hasFreshRecommendations ? talents : [],
    aiStatus,
    message,
    isLoading: isLoading || Boolean(request && !hasFreshRecommendations),
  }
}
