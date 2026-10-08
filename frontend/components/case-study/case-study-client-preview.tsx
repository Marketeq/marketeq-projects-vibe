"use client"

import { useEffect, useRef, useState } from "react"
import { CaseStudyAPI, type CaseStudyBlock } from "@/service/http/case-study"
import { ScrollArea, ScrollBar } from "@/components/ui"
import type { UserProfile } from "@/types/user"
import CaseStudyViewer from "./case-study-viewer"
import { ClientViewTopBar } from "./client-view-top-bar"
import { ClientViewCollaborateCard } from "./client-view-collaborate-card"

// The talent-view preview popup (Figma "Frame 1948757393") is a fixed
// 1340px frame — same constant case-study-editor.tsx's own in-editor
// preview popup uses, so the two stay visually consistent.
const PREVIEW_WIDTH = 1340

/**
 * Read-only case-study popup a client sees when they click a published
 * case study from a talent's profile (CaseStudyGrid, isClientView=true) —
 * or the talent sees when previewing their own profile "as a client".
 * Reuses CaseStudyViewer (same block renderer the in-editor ClientPreview
 * and the public /case-studies/[slug] page use) for the body, and wraps it
 * with client-facing chrome: talent identity + Message/Hire in the header,
 * and a "Let's collaborate" contact card + real message compose box after
 * the content — both new, matching the supplied Figma design.
 */
export function CaseStudyClientPreview({
  caseStudyId,
  talentProfile,
  isSelfPreview,
  onClose,
}: {
  caseStudyId: string
  talentProfile: UserProfile
  isSelfPreview: boolean
  onClose: () => void
}) {
  const [blocks, setBlocks] = useState<CaseStudyBlock[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  // The skills chosen in the publish dialog, persisted on the case study
  // itself (case_studies.skills) — not the talent's profile skills. These
  // are what the collaborate card lists under "Related Skills".
  const [skills, setSkills] = useState<string[]>([])
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const composeRef = useRef<HTMLTextAreaElement>(null)
  const engagedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    CaseStudyAPI.Get(caseStudyId)
      .then(({ data }) => {
        if (cancelled) return
        setBlocks(data.schemaJson?.blocks ?? [])
        setTitle(data.title)
        setDescription(data.description ?? "")
        setSkills(data.skills ?? [])
        setLikesCount(data.likesCount ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [caseStudyId])

  // Whether THIS viewer already liked it — the case study record itself only
  // carries the total, so the heart's own on/off state needs its own read.
  // Silent on failure: the heart just starts unfilled, and the toggle below
  // still reports the authoritative state back from the server.
  useEffect(() => {
    let cancelled = false
    CaseStudyAPI.GetLikeState(caseStudyId)
      .then(({ data }) => {
        if (cancelled) return
        setLiked(Boolean(data?.liked))
        setLikesCount(data?.likesCount ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [caseStudyId])

  // Optimistic: the heart fills the instant it is clicked, then both values
  // are replaced by whatever the server actually recorded. On failure the
  // optimistic guess is rolled back rather than left lying.
  const handleToggleLike = async () => {
    const previousLiked = liked
    const previousCount = likesCount
    setLiked(!previousLiked)
    setLikesCount(previousCount + (previousLiked ? -1 : 1))
    try {
      const { data } = await CaseStudyAPI.ToggleLike(caseStudyId)
      setLiked(Boolean(data?.liked))
      setLikesCount(data?.likesCount ?? 0)
    } catch {
      setLiked(previousLiked)
      setLikesCount(previousCount)
    }
  }

  // Background engagement timer — the 60s follow-up action itself is a
  // separate, not-yet-decided product step (deferred on purpose); this only
  // gets the timing mechanism running while the popup is open so that
  // action can be dropped in later without touching this component again.
  useEffect(() => {
    engagedRef.current = false
    const timer = setTimeout(() => {
      engagedRef.current = true
    }, 60_000)
    return () => clearTimeout(timer)
  }, [caseStudyId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 md:p-10">
      <div
        className="w-full max-h-[90vh] flex flex-col bg-white rounded-[10px] border border-gray-200 shadow-xl overflow-hidden"
        style={{ maxWidth: PREVIEW_WIDTH }}
      >
        <ClientViewTopBar
          title={title}
          talentProfile={talentProfile}
          isSelfPreview={isSelfPreview}
          liked={liked}
          likesCount={likesCount}
          onToggleLike={handleToggleLike}
          onMessage={() => composeRef.current?.focus()}
          onClose={onClose}
        />

        <ScrollArea
          className="flex-1 min-h-0 flex flex-col"
          viewportClassName="flex-1 min-h-0"
          type="always"
          scrollBar={<ScrollBar className="w-4 px-1 bg-gray-50" />}
        >
          <div className="px-[100px] py-[100px] flex flex-col gap-[100px]">
            <CaseStudyViewer title={title} description={description} blocks={blocks} />
            <ClientViewCollaborateCard
              talentProfile={talentProfile}
              caseStudySkills={skills}
              isSelfPreview={isSelfPreview}
              composeRef={composeRef}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
