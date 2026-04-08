"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { resolveDashboardRole, useAuth } from "@/contexts/auth"
import { ROLE } from "@/types/user"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  Briefcase,
  ChevronRight,
  Monitor,
  Plus,
  Users,
} from "@blend-metrics/icons"
import { ListingCard, type ListingStatus } from "@/components/listing-card"
import { editProjectListingUrl } from "@/src/lib/listing-urls"
import {
  Button,
  Dialog,
  DialogContent,
} from "@/components/ui"

type ListingType = "project" | "service"

interface Listing {
  id: string
  title: string
  type: ListingType
  status: ListingStatus
  category: string
  description?: string
  budget: string
  duration?: string
  rating?: number
  reviewCount?: number
  mediaUrl?: string
}

const statusMap: Record<string, ListingStatus> = {
  published: "Active",
  draft: "Draft",
  archived: "Completed",
  flagged: "Paused",
}

const newListingOptions = [
  {
    type: "project",
    label: "Project",
    description: "Post a project and hire talent to complete it",
    icon: Briefcase,
    href: "/publish-project",
  },
  {
    type: "service",
    label: "Service",
    description: "Offer a service that clients can purchase",
    icon: Monitor,
    href: "/publish-project",
  },
  {
    type: "team",
    label: "Team",
    description: "Create a team listing to find collaborators",
    icon: Users,
    href: "/publish-project",
  },
  {
    type: "job",
    label: "Job",
    description: "Post a job opening for your organization",
    icon: Briefcase,
    href: "/publish-project",
  },
]

function formatBudget(p: any): string {
  if (p.budget) return `$${Number(p.budget).toLocaleString()} budget`
  if (p.priceMin && p.priceMax)
    return `$${Number(p.priceMin).toLocaleString()} - $${Number(p.priceMax).toLocaleString()}`
  if (p.priceMin) return `From $${Number(p.priceMin).toLocaleString()}`
  return "Budget TBD"
}

function formatDuration(p: any): string {
  if (p.duration) return `${p.duration}`
  if (p.durationWeeks) return `Starting from ${p.durationWeeks} weeks`
  if (p.deliveryDays) return `${p.deliveryDays} day delivery`
  return "Flexible timeline"
}

export default function MyListingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isTalent = resolveDashboardRole(user) === ROLE.TALENT
  const [showNewListingDialog, setShowNewListingDialog] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect clients to their dashboard — listings is a talent-only page
  useEffect(() => {
    if (user && !isTalent) {
      router.replace("/client-dashboard")
    }
  }, [user, isTalent, router])

  const fetchListings = useCallback(async () => {
    try {
      setIsLoading(true)
      const all: Listing[] = []

      // Load autosaved drafts from localStorage (publish-project autosave).
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("marketeq-project-drafts")
          const drafts = raw ? JSON.parse(raw) : {}
          const sortedKeys = Object.keys(drafts).sort((a, b) => {
            const ta = new Date(drafts[a]?.savedAt ?? 0).getTime()
            const tb = new Date(drafts[b]?.savedAt ?? 0).getTime()
            return tb - ta
          })
          for (const key of sortedKeys) {
            const d = drafts[key]
            const info = d?.projectInfo ?? {}
            const scope = d?.projectScope ?? []
            const firstCategory =
              info?.category?.[0]?.category ||
              (Array.isArray(info?.categories) ? info.categories[0] : "") ||
              "Uncategorized"
            const statusLabel: ListingStatus =
              d?.status === "published"
                ? "Active"
                : d?.status === "in_review"
                  ? "In Review"
                  : d?.status === "needs_update"
                    ? "Needs Update"
                    : "Draft"
            all.push({
              id: d?.id || key,
              title: info?.title || "Untitled",
              type: "project",
              status: statusLabel,
              category: firstCategory,
              description: info?.shortDescription || info?.fullDescription,
              budget: formatBudget(info),
              duration: formatDuration({
                duration: scope?.[0]?.rows?.[0]?.duration
                  ? `${scope[0].rows[0].duration.value ?? ""} ${scope[0].rows[0].duration.type ?? ""}`.trim()
                  : undefined,
              }),
            })
          }
        } catch (e) {
          console.error("Failed to read drafts:", e)
        }
      }

      setListings(all)
    } catch (error) {
      console.error("Failed to fetch listings:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Refresh when the tab regains focus (user returns from publish-project)
  useEffect(() => {
    const onFocus = () => fetchListings()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [fetchListings])

  return (
    <AuthenticatedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-[1060px] mx-auto px-6 py-10">
          <div className="flex items-center justify-between">
            <h1 className="text-[36px] leading-11 tracking-[.02em] font-semibold text-dark-blue-400">
              My Listings
            </h1>

            <div className="flex items-center gap-x-2">
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => setShowNewListingDialog(true)}
              >
                <Plus className="size-[15px]" />
                New Listing
              </Button>
            </div>
          </div>

          <div className="mt-5 bg-gray-50 p-[30px] border border-gray-200 rounded-lg">
            {isLoading ? (
              <div className="py-16 text-center text-sm text-gray-500">
                Loading listings...
              </div>
            ) : listings.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">
                  You haven&apos;t created any listings yet.
                </p>
                <Button
                  className="mt-4"
                  variant="outlined"
                  visual="gray"
                  onClick={() => setShowNewListingDialog(true)}
                >
                  <Plus className="size-[15px]" />
                  Create your first listing
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    kind={listing.type}
                    mode="owned"
                    id={listing.id}
                    title={listing.title}
                    description={listing.description}
                    mediaUrl={listing.mediaUrl}
                    budget={listing.budget}
                    duration={listing.duration}
                    rating={listing.rating}
                    reviewCount={listing.reviewCount}
                    status={listing.status}
                    onEdit={() =>
                      router.push(editProjectListingUrl(listing.id))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog open={showNewListingDialog} onOpenChange={setShowNewListingDialog}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden">
            <div className="p-6 pb-2">
              <h2 className="text-lg font-semibold text-dark-blue-400">
                Create New Listing
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                What type of listing would you like to create?
              </p>
            </div>
            <div className="px-4 pb-4 space-y-1">
              {newListingOptions.map((option) => (
                <button
                  key={option.type}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  onClick={() => {
                    setShowNewListingDialog(false)
                    // Pre-create an "Untitled" draft so that simply clicking
                    // this button results in a listing, even if the user
                    // never enters anything and navigates away.
                    const draftId = `draft-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`
                    try {
                      const key = "marketeq-project-drafts"
                      const raw = window.localStorage.getItem(key)
                      const drafts = raw ? JSON.parse(raw) : {}
                      drafts[draftId] = {
                        id: draftId,
                        projectInfo: { title: "Untitled" },
                        media: {},
                        projectScope: [],
                        currentStep: 0,
                        savedAt: new Date().toISOString(),
                      }
                      window.localStorage.setItem(key, JSON.stringify(drafts))
                    } catch {
                      /* ignore */
                    }
                    router.push(
                      `${option.href}?type=${option.type}&draftId=${draftId}`
                    )
                  }}
                >
                  <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
                    <option.icon className="size-5 text-primary-500" />
                  </div>
                  <div className="flex-auto min-w-0">
                    <p className="text-sm font-medium text-dark-blue-400">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                  <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500 flex-none" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedRoute>
  )
}
