"use client"

import { useRef, useState, type RefObject } from "react"
import {
  Attachment01,
  Check,
  Image03,
  MapPin,
  MessageSquare01,
  Plus,
  Send,
  Smile,
} from "@blend-metrics/icons"
import { EmojiProperties, type DataEmoji } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  IconButton,
  Textarea,
  useToast,
} from "@/components/ui"
import { EmojiPicker } from "@/components/emoji-picker"
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
  caseStudySkills,
  isSelfPreview,
  composeRef,
}: {
  talentProfile: UserProfile
  /**
   * The skills attached to THIS case study at publish time
   * (case_studies.skills), not the talent's profile skills — "Related
   * Skills" is about the work being shown, so a client reading one case
   * study sees what that project involved.
   */
  caseStudySkills?: string[]
  isSelfPreview: boolean
  /** Lets the top bar's "Message" button scroll/focus this compose box. */
  composeRef?: RefObject<HTMLTextAreaElement | null>
}) {
  const [message, setMessage] = useState("")
  // Files staged by the image / attachment buttons below. The design has no
  // attachment-preview element, so a toast confirms each pick and the files
  // ride along with the message on send.
  const [attachments, setAttachments] = useState<File[]>([])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localComposeRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = composeRef ?? localComposeRef
  const { send, sending } = useClientMessageThread(talentProfile.id)
  const { toast } = useToast()

  // Insert at the caret rather than appending, so an emoji can be dropped
  // mid-sentence; falls back to the end when the box has never been focused.
  const insertEmoji = (emoji: DataEmoji) => {
    // Same decode the inbox composer uses: the picker hands back a unified
    // codepoint string ("1f600" / "1f1ee-1f1f3"), not a character.
    const glyph = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    if (!glyph) return
    const el = textareaRef.current
    setMessage((current) => {
      const at = el ? (el.selectionStart ?? current.length) : current.length
      return current.slice(0, at) + glyph + current.slice(at)
    })
    el?.focus()
  }

  const stageFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (!picked.length) return
    setAttachments((current) => [...current, ...picked])
    toast({
      description:
        picked.length === 1
          ? `${picked[0].name} attached.`
          : `${picked.length} files attached.`,
    })
  }

  // Matches the header's behaviour exactly (see client-view-top-bar.tsx):
  // while the talent previews their own profile the contact actions stay
  // live and say why nothing happened, instead of being dead controls.
  const notifyPreviewMode = () => {
    toast({ description: "You are in client preview mode." })
  }

  // Real name first, not the auto-generated username slug — see
  // client-view-top-bar.tsx's identical fix for why.
  const fullName = `${talentProfile.firstName || ""} ${talentProfile.lastName || ""}`.trim()
  const displayName = fullName || talentProfile.username || "Talent"
  // Given name alone, matching the header (client-view-top-bar.tsx) — the
  // full name still backs the avatar's alt text and initials.
  const shortName = displayName.split(/\s+/)[0] || displayName
  const jobTitle = getDefaultJobTitle(talentProfile)
  // Publish caps the list at 10 (MAX_SKILLS in publish-dialog.tsx) and the
  // row wraps, so every skill the talent picked is shown rather than a
  // truncated subset — they chose them for this case study deliberately.
  // A case study published before skills existed on it carries none, so the
  // talent's profile skills stay the fallback and the row never renders
  // empty — that is the behaviour this card shipped with.
  const skills =
    caseStudySkills && caseStudySkills.length > 0
      ? caseStudySkills
      : (talentProfile.skills ?? []).slice(0, 6).map((skill) => skill.name)

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || sending) return
    // Typing is allowed in preview so the card behaves like the real thing;
    // only the send itself is stubbed out — there is no one to send to.
    if (isSelfPreview) {
      notifyPreviewMode()
      return
    }
    try {
      await send(message, attachments)
      setMessage("")
      setAttachments([])
      toast({ description: `Message sent to ${shortName}.` })
    } catch {
      toast({
        variant: "destructive",
        description: "Couldn't send your message. Please try again.",
      })
    }
  }

  return (
    <div className="grid grid-cols-2 gap-x-[50px] rounded-[15px] border border-gray-200 bg-white p-[75px]">
      <div className="flex items-start gap-x-3">
        {/* Verified tick — same composition as the header's avatar, scaled
            to this card's 74px avatar. See client-view-top-bar.tsx for why
            it is built around Avatar rather than through its own badge. */}
        <div className="relative inline-block shrink-0">
          <Avatar className="size-[74px]" size="2xl">
            <AvatarImage src={talentProfile.avatarUrl ?? undefined} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className="size-[20.77px] absolute left-0 top-[56px] inline-flex items-center justify-center rounded-full text-white ring-[2.65px] ring-white bg-success-500">
            <Check className="size-[15px]" />
          </div>
        </div>

        <div>
          <h1 className="text-[22px] leading-none font-bold text-dark-blue-400">
            {shortName}
            {talentProfile.username ? (
              <>
                {" "}
                <span className="text-[22px] leading-none font-light text-dark-blue-400">
                  @{talentProfile.username}
                </span>
              </>
            ) : null}
          </h1>

          {jobTitle ? (
            <p className="mt-2 text-lg leading-none font-light text-dark-blue-400">
              {jobTitle}
            </p>
          ) : null}

          {talentProfile.location ? (
            <div className="mt-2 flex items-center gap-x-[9px]">
              <MapPin className="size-[16px] text-dark-blue-400" />
              <span className="text-sm leading-none font-medium text-dark-blue-400">
                {talentProfile.location}
              </span>
            </div>
          ) : null}

          <div className="mt-8 flex items-center gap-x-3">
            {/* HireMeButton always opens the OfferDialog, and there is no
                offer to make to yourself — so preview gets a same-looking
                Button that shows the notice. Mirrors the header. */}
            {isSelfPreview ? (
              <Button type="button" onClick={notifyPreviewMode}>
                <Plus className="size-[15px]" />
                Hire Me
              </Button>
            ) : (
              <HireMeButton profile={talentProfile} />
            )}
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              className="border-primary-500 text-primary-500 hover:bg-primary-500 border-2 hover:text-white"
              onClick={() => textareaRef.current?.focus()}
            >
              <MessageSquare01 className="size-[15px]" /> Message
            </Button>
          </div>

          {skills.length > 0 && (
            <div className="mt-8">
              <h1 className="text-sm leading-none font-bold text-dark-blue-400">
                Related Skills
              </h1>

              <div className="mt-3 flex flex-wrap gap-3">
                {skills.map((skill) => (
                  <Badge key={skill} size="lg" variant="rounded" visual="gray">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-[22px] leading-none font-semibold text-dark-blue-400">
          Let&apos;s collaborate on the next project!
        </h1>

        <div className="mt-6 flex flex-col">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            placeholder={`Leave a message for ${shortName}...`}
            className="h-[200px] resize-none rounded-none rounded-t-lg border border-gray-200 bg-gray-50 py-3.5 px-5 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] placeholder:italic placeholder:text-gray-500 focus:ring-0"
          />
          <div className="flex items-center justify-between rounded-b-lg border border-t-0 border-gray-200 bg-white p-3">
            <div className="flex items-center gap-x-1">
              <EmojiPicker onEmojiSelect={insertEmoji}>
                <IconButton
                  className="rounded-full"
                  variant="ghost"
                  visual="gray"
                  size="lg"
                  aria-label="Emoji"
                >
                  <Smile className="size-[22px]" />
                </IconButton>
              </EmojiPicker>
              <IconButton
                className="rounded-full"
                variant="ghost"
                visual="gray"
                size="lg"
                aria-label="Attach image"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image03 className="size-[22px]" />
              </IconButton>
              <IconButton
                className="rounded-full"
                variant="ghost"
                visual="gray"
                size="lg"
                aria-label="Attach file"
                onClick={() => fileInputRef.current?.click()}
              >
                <Attachment01 className="size-[22px]" />
              </IconButton>
              {/* Accepts exactly what messaging-service's ALLOWED_MIME set
                  permits (attachments.controller.ts) — anything else is
                  rejected server-side, so it is never offered here. */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                multiple
                hidden
                onChange={(e) => {
                  stageFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp4,.mov"
                multiple
                hidden
                onChange={(e) => {
                  stageFiles(e.target.files)
                  e.target.value = ""
                }}
              />
            </div>

            <Button
              type="button"
              disabled={sending || (!message.trim() && attachments.length === 0)}
              onClick={handleSend}
            >
              {sending ? "Sending..." : "Send Message"}
              <Send className="size-[15px]" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
