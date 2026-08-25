/**
 * MY JOBS — CLIENT DATA LAYER
 *
 * This file is the ONLY place backend/API work happens for the client
 * "My Jobs" screen. It is intentionally editable.
 *
 * `page.tsx` is a FROZEN presentation file (SOP §1.5). It renders whatever
 * this hook returns and nothing else. To wire this screen to a real API you
 * replace the body of `useClientJobs()` below — you must not edit `page.tsx`.
 *
 * Contract:
 *   - Return `ClientJobCard[]` in the exact shape declared here.
 *   - Surface async state through `isLoading` / `error`; the page already
 *     renders both, so no UI change is required when you swap in the API.
 *   - Mutations must update local state optimistically so the list stays live.
 *
 * When the job-listing service lands, swap the seed for JobListingAPI and map
 * the response into `ClientJobCard` inside `mapListingToCard`.
 */
import { useState } from "react"

export type ClientJobStatus = "Open" | "Draft" | "Closed"

export type ClientJobStatusVisual = "success" | "warning" | "error" | "gray"

export type ClientJobType = "Project" | "Service"

export interface ClientJobCard {
  id: string
  title: string
  meta: string[]
  /** Drives the "All Types" filter. */
  type: ClientJobType
  status: ClientJobStatus
  statusVisual: ClientJobStatusVisual
  /** Inline button label on the card, e.g. "Keep Editing". `null` renders the overflow menu. */
  action: string | null
  /** Bold applicant summary on the details strip. */
  primary: string
  /** Small pill beside the applicant summary, e.g. "3 new". */
  badge: string | null
  /** Inline link on the details strip. */
  link: string | null
  timestamp: string
  /** Age of the listing in days. Drives the Newest / Oldest sort. */
  daysAgo: number
}

export const clientStatusFilters = [
  "All Statuses",
  "Open",
  "Draft",
  "Closed",
] as const

export const clientTypeFilters = ["All Types", "Project", "Service"] as const

export const clientSortOptions = [
  "Name A to Z",
  "Name Z to A",
  "Newest",
  "Oldest",
] as const

/** Seed data. Replace with the API response once the job-listing service ships. */
const CLIENT_JOB_SEED: ClientJobCard[] = [
  {
    id: "bay-city-college-campus-expansion",
    title: "Bay City College Campus Expansion Project",
    meta: ["Ongoing service", "6 of 15 roles open"],
    type: "Service",
    status: "Open",
    statusVisual: "success",
    action: null,
    primary: "8 applicants",
    badge: "3 new",
    link: "60 matching profiles",
    timestamp: "Published 2 days ago",
    daysAgo: 2,
  },
  {
    id: "mobile-application-development",
    title: "Mobile Application Development",
    meta: ["Ongoing service", "6 of 15 roles open"],
    type: "Service",
    status: "Open",
    statusVisual: "success",
    action: null,
    primary: "No applicants yet",
    badge: null,
    link: "Edit job to find better matches",
    timestamp: "Published 2 days ago",
    daysAgo: 3,
  },
  {
    id: "ecommerce-website",
    title: "Ecommerce Website",
    meta: ["6 month project", "6 of 15 roles open"],
    type: "Project",
    status: "Draft",
    statusVisual: "warning",
    action: "Keep Editing",
    primary: "No applicants yet",
    badge: null,
    link: null,
    timestamp: "Created 6 days ago",
    daysAgo: 6,
  },
  {
    id: "graphic-designer",
    title: "Graphic Designer",
    meta: ["6 months contact", "Full-Time"],
    type: "Project",
    status: "Closed",
    statusVisual: "gray",
    action: null,
    primary: "26 applicants",
    badge: null,
    link: null,
    timestamp: "Closed 15 days ago",
    daysAgo: 15,
  },
]

export interface UseClientJobs {
  jobs: ClientJobCard[]
  isLoading: boolean
  error: string
  setJobStatus: (
    id: string,
    status: Extract<ClientJobStatus, "Open" | "Closed">,
    timestamp: string
  ) => void
  duplicateJob: (id: string) => void
  removeJob: (id: string) => void
}

export function useClientJobs(): UseClientJobs {
  // BACKEND: replace this with a fetch + mapListingToCard(). Keep the shape.
  const [jobs, setJobs] = useState<ClientJobCard[]>(CLIENT_JOB_SEED)
  const [isLoading] = useState(false)
  const [error] = useState("")

  const setJobStatus: UseClientJobs["setJobStatus"] = (
    id,
    status,
    timestamp
  ) =>
    setJobs((current) =>
      current.map((job) =>
        job.id === id
          ? {
              ...job,
              status,
              statusVisual: status === "Open" ? "success" : "gray",
              action: null,
              timestamp,
            }
          : job
      )
    )

  const duplicateJob: UseClientJobs["duplicateJob"] = (id) =>
    setJobs((current) => {
      const source = current.find((job) => job.id === id)

      if (!source) return current

      return [
        ...current,
        {
          ...source,
          id: `${source.id}-copy-${current.length}`,
          title: `${source.title} (Copy)`,
          status: "Draft",
          statusVisual: "warning",
          action: "Keep Editing",
          primary: "No applicants yet",
          badge: null,
          link: null,
          timestamp: "Created just now",
          daysAgo: 0,
        },
      ]
    })

  const removeJob: UseClientJobs["removeJob"] = (id) =>
    setJobs((current) => current.filter((job) => job.id !== id))

  return { jobs, isLoading, error, setJobStatus, duplicateJob, removeJob }
}
