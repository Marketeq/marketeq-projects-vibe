"use client"

import { useState, type RefObject } from "react"
import { MapPin } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Textarea,
  useToast,
} from "@/components/ui"
import type { UserProfile } from "@/types/user"
import { HireMeButton, getDefaultJobTitle } from "@/components/hire-me-button"
import { useClientMessageThread } from "./use-client-message-thread"

// See client-view-top-bar.tsx for why this is duplicated rather than
// imported — hire-me-button.tsx doesn't export its own copy.
function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase() || "?"
}

/**
 * "Let's collaborate on the next project!" footer card — the case-study
 * client preview's contact surface (Figma "Frame 1948757798"). Reuses the
 * same Hire flow as the header (HireMeButton -> OfferDialog) and sends a
 * real message via useClientMessageThread, which composes the same
 * thread-create + E2EE-send plumbing /inbox already uses.
 */
export function ClientViewCollaborateCard({
  talentProfile,
  isSelfPreview,
  composeRef,
}: {
  talentProfile: UserProfile
  isSelfPreview: boolean
  /** Lets the top bar's "Message" button scroll/focus this compose box. */
  composeRef?: RefObject<HTMLTextAreaElement | null>
}) {
  const [message, setMessage] = useState("")
  const { send, sending } = useClientMessageThread(talentProfile.id)
  const { toast } = useToast()

  const displayName =
    talentProfile.username ||
    `${talentProfile.firstName || ""} ${talentProfile.lastName || ""}`.trim() ||
    "Talent"
  const jobTitle = getDefaultJobTitle(talentProfile)
  const skills = (talentProfile.skills ?? []).slice(0, 6)

  const handleSend = async () => {
    if (!message.trim() || sending) return
    try {
      await send(message)
      setMessage("")
      toast({ description: `Message sent to ${displayName}.` })
    } catch {
      toast({
        variant: "destructive",
        description: "Couldn't send your message. Please try again.",
      })
    }
  }

  return (
    <div className="flex items-start gap-x-[50px] rounded-[15px] border border-gray-200 bg-white p-[75px]">
      <div className="flex flex-1 items-start gap-x-3">
        <Avatar className="size-[74px]">
          <AvatarImage src={talentProfile.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-y-8">
          <div className="flex flex-col gap-y-2">
            <p className="text-[22px] font-bold leading-tight text-dark-blue-400">
              {displayName}
            </p>
            {jobTitle ? (
              <p className="text-lg font-light leading-tight text-dark-blue-400">
                {jobTitle}
              </p>
            ) : null}
            {talentProfile.location ? (
              <div className="flex items-center gap-x-2 text-sm font-medium text-dark-blue-400">
                <MapPin className="size-4" />
                {talentProfile.location}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-x-2">
            <HireMeButton
              profile={talentProfile}
              buttonProps={{ disabled: isSelfPreview }}
            />
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              disabled={isSelfPreview}
              onClick={() => composeRef?.current?.focus()}
            >
              Message
            </Button>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-col gap-y-2">
              <p className="text-sm font-bold uppercase text-dark-blue-400">
                Related Skills
              </p>
              <div className="flex flex-wrap gap-3">
                {skills.map((skill) => (
                  <Badge key={skill.id} visual="gray" size="md">
                    {skill.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-y-6">
        <p className="text-[22px] font-semibold leading-tight text-dark-blue-400">
          Let&apos;s collaborate on the next project!
        </p>

        <div className="rounded-lg border border-gray-200 shadow-xs">
          <Textarea
            ref={composeRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSelfPreview || sending}
            placeholder={
              isSelfPreview
                ? "This is what a client sees — messaging is disabled while previewing your own profile."
                : `Write a message to ${displayName}...`
            }
            className="h-[160px] rounded-b-none border-0 border-b border-gray-200 shadow-none focus:ring-0"
          />
          <div className="flex items-center justify-end p-3">
            <Button
              type="button"
              disabled={isSelfPreview || sending || !message.trim()}
              onClick={handleSend}
            >
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
