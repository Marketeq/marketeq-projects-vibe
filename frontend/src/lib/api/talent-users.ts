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

export interface TalentUser {
  id: string
  username?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  userType?: string
  location?: string
  rateMin?: number | null
  rateMax?: number | null
  jobTitles?: Array<{ jobTitle?: string; isDefault?: boolean }>
  recentJobTitle?: string | null
  skills?: Array<{ name: string }>
}

let cache: Promise<TalentUser[]> | null = null

function fetchTalentUsers(): Promise<TalentUser[]> {
  if (cache) return cache
  const apiBase = getPublicApiUrl() || "http://localhost:4000"
  cache = (async () => {
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
export function talentToCardProps(u: TalentUser, idx = 0): {
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
  const skillNames = (u.skills ?? []).map((s) => s.name).filter(Boolean)
  const skills =
    skillNames.length >= 6
      ? skillNames
      : [
          ...skillNames,
          ...defaultSkills.filter((d) => !skillNames.includes(d)),
        ].slice(0, 12)

  const role =
    u.jobTitles?.find((j: any) => j?.isDefault)?.jobTitle ||
    u.jobTitles?.[0]?.jobTitle ||
    u.recentJobTitle ||
    "Marketing Technologist"

  const rate =
    u.rateMin && u.rateMax
      ? `$${u.rateMin} - $${u.rateMax}`
      : u.rateMin
        ? `$${u.rateMin}`
        : "$85 - $120"

  return {
    id: u.id,
    username: u.username ?? "",
    name: u.firstName ?? "Talent",
    handle: u.username ? `@${u.username}` : "@talent",
    role,
    photo: u.avatarUrl || "/man.jpg",
    rate,
    experience: "5 years of experience",
    country: u.location || "Australia",
    localTime: "7:30pm local time",
    rating: 4.7,
    projects: 2,
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
