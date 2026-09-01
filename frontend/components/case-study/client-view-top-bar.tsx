"use client"

import { X } from "@blend-metrics/icons"
import { Avatar, AvatarFallback, AvatarImage, Button, IconButton } from "@/components/ui"
import type { UserProfile } from "@/types/user"
import { HireMeButton } from "@/components/hire-me-button"

// Duplicated from hire-me-button.tsx rather than imported — that file
// doesn't export it, and re-exporting a private helper from an unrelated
// component just to share six lines isn't the right coupling either. Same
// precedent hire-me-button.tsx itself sets for getInitials.
function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase() || "?"
}

/**
 * Header chrome for the case-study client preview popup — the read-only
 * counterpart to EditorPreviewBar, shown when a client (or the talent
 * previewing their own profile) opens a published case study. Talent
 * identity instead of editor actions; Message + Hire instead of
 * Edit/Publish.
 */
export function ClientViewTopBar({
  talentProfile,
  isSelfPreview,
  onMessage,
  onClose,
}: {
  talentProfile: UserProfile
  isSelfPreview: boolean
  onMessage: () => void
  onClose: () => void
}) {
  const displayName =
    talentProfile.username ||
    `${talentProfile.firstName || ""} ${talentProfile.lastName || ""}`.trim() ||
    "Talent"

  return (
    <nav className="flex items-center justify-between bg-white border-b border-gray-200 pl-6 pr-3 py-3 rounded-tl-[10px] rounded-tr-[10px]">
      <div className="flex items-center gap-x-3 min-w-0">
        <Avatar className="size-9">
          <AvatarImage src={talentProfile.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-dark-blue-400 truncate">
            {displayName}
          </p>
          {talentProfile.username ? (
            <p className="text-xs font-light leading-tight text-dark-blue-400 truncate">
              @{talentProfile.username}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-x-3">
        <Button
          type="button"
          variant="outlined"
          visual="gray"
          className="h-9 px-[14px] text-xs font-semibold"
          disabled={isSelfPreview}
          onClick={onMessage}
        >
          Message
        </Button>

        <HireMeButton
          profile={talentProfile}
          buttonProps={{
            className: "h-9 px-[14px] text-xs font-semibold",
            disabled: isSelfPreview,
          }}
        />

        <IconButton
          className="p-[10px] rounded-[10px] size-11 text-gray-500"
          variant="ghost"
          visual="gray"
          type="button"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X className="size-6" />
        </IconButton>
      </div>
    </nav>
  )
}
