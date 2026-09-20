"use client"

import { Check, Heart, MessageSquare, Plus, Share06, X } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  IconButton,
  Toggle,
  useToast,
} from "@/components/ui"
import type { UserProfile } from "@/types/user"
import { HireMeButton } from "@/components/hire-me-button"
import { useInviteWindowStore } from "@/components/invite-window"

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

/** Shared by the real HireMeButton and its self-preview stand-in below so
 *  the two can never drift apart visually. */
const HIRE_BUTTON_CLASS =
  "h-9 px-[14px] text-xs font-semibold shadow-[0px_1px_2px_rgba(16,24,40,0.05)]"

/**
 * Header chrome for the case-study client preview popup (Figma "Component
 * 1000001832" — same frame PublicTopBar implements for the public page):
 * case-study title on the left; favorite/share/message/hire actions + the
 * talent's identity + close on the right. The read-only counterpart to
 * EditorPreviewBar, shown when a client (or the talent previewing their own
 * profile) opens a published case study — talent identity instead of editor
 * actions, Message + Hire instead of Edit/Publish.
 *
 * The avatar carries the verified tick the Figma frame shows (green
 * #12B76A disc, white check, bottom-left) rather than the presence dot
 * Avatar's own `isOnline` prop draws — that one is a bare dot at the
 * bottom-right, which is not what the design asks for here.
 */
export function ClientViewTopBar({
  title,
  talentProfile,
  isSelfPreview,
  liked = false,
  likesCount = 0,
  onToggleLike,
  onMessage,
  onClose,
}: {
  title: string
  talentProfile: UserProfile
  isSelfPreview: boolean
  /** Whether the current viewer has liked this case study. */
  liked?: boolean
  /** Total likes across all viewers (case_studies.likesCount). */
  likesCount?: number
  onToggleLike?: () => void
  onMessage: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  // The same window the global header's "+" opens, reused verbatim — only
  // its heading changes. <InviteWindow /> is already mounted once in
  // app/layout.tsx, so opening it is just a store flip; the talent profile's
  // own "Share Profile" button drives it the same way.
  const { toggle: openShareWindow } = useInviteWindowStore()
  // Real name first, not the auto-generated username slug (e.g.
  // "user_65beadc4") — that's still shown, just as the @handle line below,
  // not as the primary identity.
  const fullName = `${talentProfile.firstName || ""} ${talentProfile.lastName || ""}`.trim()
  const displayName = fullName || talentProfile.username || "Talent"
  // Per the Figma frame, the header shows the given name alone ("Dheeraj"),
  // with the @handle carrying the rest of the identity underneath. The full
  // name still backs the avatar's alt text and initials.
  const shortName = displayName.split(/\s+/)[0] || displayName

  // While the talent is previewing their own profile "as a client", the
  // contact actions have nothing to act on — but disabling them made the
  // header read as broken. They stay live and explain themselves instead.
  const notifyPreviewMode = () => {
    toast({ description: "You are in client preview mode." })
  }

  return (
    <nav className="flex items-center justify-between bg-white border-b border-gray-200 drop-shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)] pl-6 pr-3 py-3 rounded-tl-[10px] rounded-tr-[10px]">
      <h1 className="text-lg font-bold leading-6 text-dark-blue-400 truncate">
        {title}
      </h1>

      <div className="flex items-center gap-x-6">
        <div className="inline-flex items-center gap-x-3">
          {/* Love/like icon, not the star Favorite/FavoriteRoot render —
              components/ui is read-only, so this reuses Favorite's own
              Toggle-based styling directly with Heart swapped in rather
              than editing that shared component. Controlled by the server's
              like state, with the running total beside it. */}
          <div className="inline-flex items-center gap-x-1.5">
            <Toggle
              aria-label={liked ? "Unlike case study" : "Like case study"}
              pressed={liked}
              onPressedChange={onToggleLike}
              className="group inline-flex items-center justify-center size-9 rounded-full border-2 border-gray-300 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)] text-gray-300 fill-none transition duration-300 hover:text-gray-500 focus-visible:outline-none data-[state=on]:text-error-500 data-[state=on]:fill-error-500 data-[state=on]:hover:text-error-500 data-[state=on]:hover:fill-error-500"
            >
              <Heart className="size-4 fill-inherit" />
            </Toggle>
            {likesCount > 0 ? (
              <span className="text-xs font-semibold tabular-nums text-gray-500">
                {likesCount}
              </span>
            ) : null}
          </div>

          <IconButton
            className="size-9 rounded-full border-2 border-gray-300 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)] text-gray-500"
            variant="outlined"
            visual="gray"
            type="button"
            aria-label="Share"
            onClick={() => openShareWindow(true, "Share this case study")}
          >
            <Share06 className="size-4" />
          </IconButton>

          <Button
            type="button"
            variant="outlined"
            // bg-white + the explicit shadow are both needed here: the
            // shared Button component's "shadow-xs" class isn't a real
            // Tailwind utility in this project (not in tailwind.config.ts,
            // not a stock class either), so it renders no shadow anywhere
            // it's used — this patches around that dead class locally
            // rather than editing the frozen components/ui/button.tsx.
            className="h-9 px-[14px] bg-white border-2 border-primary-500 text-primary-500 text-xs font-semibold shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-primary-25"
            onClick={isSelfPreview ? notifyPreviewMode : onMessage}
          >
            <MessageSquare className="size-[15px]" />
            Message Me
          </Button>

          {/* HireMeButton always opens the OfferDialog on click, and there
              is no offer to make to yourself — so in self-preview this is a
              same-looking Button that shows the notice instead. Identical
              class list and contents, so the two states are visually one
              button. Same dead "shadow-xs" workaround as Message Me above. */}
          {isSelfPreview ? (
            <Button
              type="button"
              className={HIRE_BUTTON_CLASS}
              onClick={notifyPreviewMode}
            >
              <Plus className="size-[15px]" />
              Hire Me
            </Button>
          ) : (
            <HireMeButton
              profile={talentProfile}
              buttonProps={{ className: HIRE_BUTTON_CLASS }}
            />
          )}
        </div>

        <div className="flex items-center gap-x-3 min-w-0">
          {/* Verified tick. Avatar only renders a plain bottom-right dot
              (its `isOnline` badge) and components/ui is read-only, so the
              badge the design specifies is composed around it here. The
              same markup is repeated in client-view-collaborate-card.tsx —
              same reason getInitials is duplicated across the two. */}
          <div className="relative shrink-0">
            <Avatar className="size-9" size="sm">
              <AvatarImage src={talentProfile.avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="absolute -bottom-px -left-px inline-flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-success-500 text-white"
            >
              <Check className="size-2.5" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-dark-blue-400 truncate">
              {shortName}
            </p>
            {talentProfile.username ? (
              <p className="text-xs font-light leading-tight text-dark-blue-400 truncate">
                @{talentProfile.username}
              </p>
            ) : null}
          </div>
        </div>

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
