"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Edit03, Image01, Plus2, Trash01, Upload, X } from "@blend-metrics/icons"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
import { AutocompleteAPI } from "@/service/http/autocomplete"
import { ProjectAPI } from "@/service/http/project"
import { imageTransformStyle } from "./sections/_shared"
import { ImageEditModal } from "./image-edit-modal"
import {
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  ErrorMessage,
  Input,
  ScrollArea,
  ScrollBar,
  TagsInputControl,
  TagsInputInput,
  TagsInputRoot,
  useToast,
} from "@/components/ui"

const MAX_SKILLS = 10
const MAX_TITLE_LENGTH = 120
// skills.json is 710 entries; one request pulls the whole vocabulary so the
// typeahead below searches every skill, not an alphabetical slice.
const SKILL_LIBRARY_LIMIT = 1000

// Fallback vocabulary — used only until the live autocomplete library
// resolves, and if it ever comes back empty.
const SKILL_OPTIONS = [
  "React",
  "React.js",
  "React Native",
  "Node.js",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Figma",
  "UI/UX",
  "Wireframing",
  "Prototyping",
  "User Flows",
  "Product Design",
  "Mobile App",
  "iOS",
  "Android",
  "AWS",
  "Docker",
  "GraphQL",
  "REST API",
  "MongoDB",
  "PostgreSQL",
  "Firebase",
  "Next.js",
  "Vue.js",
  "Angular",
  "Tailwind CSS",
  "Spring Boot",
  "Machine Learning",
]

// Filler for the "Suggested Skills" row. The row is a fixed number of slots
// and must always look full, so whatever the case study's own content does
// not fill is topped up from here, in order. Generic on purpose — these are
// the ones that read as plausible on almost any case study.
const SUGGESTED_SKILLS = [
  "Node.js",
  "JavaScript",
  "Wireframing",
  "Prototyping",
  "User Flows",
  "UI/UX",
  "Product Design",
  "User Research",
  "Figma",
  "Product Strategy",
]

// Slots in the "Suggested Skills" row. The row is `flex-nowrap
// overflow-hidden` (see the render below) and must never wrap to a second
// line, so this stays low enough to fit one row at the dialog's fixed 740px
// width.
const SUGGESTION_SLOTS = 5

/**
 * How well a library label answers what's been typed. Lower is better;
 * `null` means it doesn't match and must not appear in the dropdown.
 *   0 — the exact skill ("react" → "React")
 *   1 — the label starts with it ("react" → "React Native")
 *   2 — a later word starts with it ("react" → "Native React")
 *   3 — it appears anywhere inside ("act" → "React")
 * Match is plain lowercased substring, the same test TagsInputInput applies
 * to the options it is handed, so this ranking never promotes a label the
 * input would then filter back out.
 */
function queryRank(label: string, query: string): number | null {
  const target = label.toLowerCase()
  if (target === query) return 0
  if (target.startsWith(query)) return 1
  if (target.split(/[^a-z0-9]+/).some((word) => word.startsWith(query)))
    return 2
  if (target.includes(query)) return 3
  return null
}

/**
 * Splits text into comparable tokens. Skill labels carry punctuation that
 * matters ("Node.js", "C++", "CI/CD"), so a token starts at an
 * alphanumeric and may carry `. + #` inside it — "node.js" stays one token
 * rather than becoming "node" and "js".
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9+#.]*/g) ?? []
}

/**
 * Does `text` actually name this skill, as a word rather than as a fragment
 * of a longer one? Plain `includes` would match "Java" inside "JavaScript"
 * and "R" inside every sentence, so both edges of every occurrence have to
 * fall on a non-alphanumeric boundary. Labels carrying their own punctuation
 * ("Node.js", "CI/CD", "C++") still work, since only the outer edges are
 * checked.
 */
function mentions(text: string, label: string): boolean {
  if (label.length < 3) return false
  const isWordChar = (char: string | undefined) =>
    char !== undefined && /[a-z0-9]/.test(char)
  let from = 0
  for (;;) {
    const at = text.indexOf(label, from)
    if (at === -1) return false
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + label.length]))
      return true
    from = at + 1
  }
}

/**
 * Snaps a suggester's free-text skill onto the library's own wording, so a
 * chip is always something the taxonomy holds, spelled the library's way
 * ("React.js", not "react js"). Deliberately strict — equality, then
 * equality ignoring punctuation and spacing ("reactjs" -> "React.js").
 *
 * An earlier version also fell back to "a label that merely contains it",
 * which invents matches: the suggester's heuristic mode returns bare
 * capitalized words from the copy, and "Over" then surfaced as "Data
 * Governance". A suggestion the library has no real entry for is dropped.
 */
function snapToLibrary(
  suggestion: string,
  library: string[]
): string | undefined {
  const needle = suggestion.trim().toLowerCase()
  if (needle.length < 2) return undefined
  const squash = (value: string) => value.replace(/[^a-z0-9]/g, "")
  const squashed = squash(needle)
  return (
    library.find((label) => label.toLowerCase() === needle) ??
    library.find((label) => squash(label.toLowerCase()) === squashed)
  )
}

export interface PublishDetails {
  title: string
  coverImage: string
  coverImageZoom: number
  coverImageRotation: number
  coverImageOffsetX: number
  coverImageOffsetY: number
  skills: string[]
}

/**
 * "Publish Your Case Study" modal, matching the Figma spec. Replaces the
 * plain "Ready to publish?" confirmation previously inline in
 * case-study-editor.tsx. Every field here is local dialog state — nothing
 * is written to the case study until "Publish" is clicked, at which point
 * the caller (case-study-editor.tsx) is responsible for the actual
 * localStorage write via publishCaseStudy/saveCaseStudy.
 */
export function PublishDialog({
  open,
  onOpenChange,
  title: initialTitle,
  content = "",
  onPublish,
  publishing = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /**
   * Plain-text digest of the case study's own content (see
   * `collectCaseStudyText`). Drives the "Suggested Skills" row — without it
   * the row falls back to a fixed starter list.
   */
  content?: string
  onPublish: (details: PublishDetails) => void
  publishing?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [coverImageZoom, setCoverImageZoom] = useState(1)
  const [coverImageRotation, setCoverImageRotation] = useState(0)
  const [coverImageOffsetX, setCoverImageOffsetX] = useState(50)
  const [coverImageOffsetY, setCoverImageOffsetY] = useState(50)
  const [isImageEditOpen, setIsImageEditOpen] = useState(false)
  const [titleValue, setTitleValue] = useState(initialTitle)
  const [skills, setSkills] = useState<string[]>([])
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [skillQuery, setSkillQuery] = useState("")
  // Set when an add is rejected for being over MAX_SKILLS. Without it the
  // extra skill just vanished with no explanation.
  const [skillLimitReached, setSkillLimitReached] = useState(false)
  const { toast } = useToast()

  // Re-seed from the editor's current title (and clear image/skills/errors)
  // every time the dialog is freshly opened.
  useEffect(() => {
    if (open) {
      setTitleValue(initialTitle)
      setAttemptedSubmit(false)
      setSkillLimitReached(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // The skills library, in full — the one and only source for the typeahead
  // dropdown below. Nothing about this case study's content narrows, reorders
  // or seeds it: typing "React" must surface every React skill the library
  // has. Same source/shape as `useAutocompleteList` elsewhere in the app.
  const { data: librarySkills } = useQuery({
    queryKey: ["autocomplete-list", "skills", SKILL_LIBRARY_LIMIT],
    queryFn: async () => {
      const res = await AutocompleteAPI.getByType(
        "skills",
        "",
        SKILL_LIBRARY_LIMIT
      )
      const data = res?.data
      return Array.isArray(data)
        ? (data
            .map((item: { label?: string }) => item?.label)
            .filter((label: unknown): label is string => Boolean(label)) as string[])
        : []
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const library = librarySkills?.length ? librarySkills : SKILL_OPTIONS

  // What the case study is about, according to the skill suggester —
  // listings-service embeds the digest and returns the closest skills from
  // its vocabulary (the same endpoint the job-listing wizard uses). Fired
  // silently on open; a failure just leaves the static fallback showing.
  const contentDigest = content.trim()
  const { data: aiSuggestions } = useQuery({
    queryKey: ["case-study-suggest-skills", contentDigest],
    queryFn: async () => {
      const res = await ProjectAPI.SuggestSkills({ description: contentDigest })
      const list = (res?.data as { skills?: unknown })?.skills
      return Array.isArray(list)
        ? (list.filter(
            (skill): skill is string =>
              typeof skill === "string" && skill.trim().length > 0
          ) as string[])
        : []
    },
    enabled: open && contentDigest.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // The "Suggested Skills" row: this case study's content, read against the
  // skills library. Three passes, strongest signal first —
  //   1. library skills the copy names outright ("Figma", "User Research")
  //   2. what the suggester inferred, each snapped onto a library label
  //   3. multi-word library skills whose every word appears in the copy,
  //      even if not side by side ("Mobile App Design" from copy that talks
  //      about designing a mobile app)
  // — deduped case-insensitively, so a skill found by more than one pass
  // appears once. Every chip is a real library entry, never free text.
  //
  // Pass 3 exists because pass 2 cannot be relied on alone: the suggester
  // only does true embedding matching when the backend has a HuggingFace
  // key, and otherwise falls back to pulling capitalized words out of the
  // text, which snapToLibrary correctly throws away. The content passes are
  // what make the row reflect this case study either way.
  const contentSuggestions = useMemo(() => {
    const text = contentDigest.toLowerCase()
    const picked: string[] = []
    const seen = new Set<string>()
    const take = (label: string | undefined) => {
      if (!label) return
      const key = label.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      picked.push(label)
    }

    if (text) {
      for (const label of library) {
        if (mentions(text, label.toLowerCase())) take(label)
      }
    }

    for (const suggestion of aiSuggestions ?? []) {
      take(snapToLibrary(suggestion, library))
    }

    if (text) {
      const words = new Set(tokenize(text))
      for (const label of library) {
        const parts = tokenize(label)
        if (parts.length < 2) continue
        if (parts.every((part) => part.length > 2 && words.has(part))) {
          take(label)
        }
      }
    }

    return picked
  }, [contentDigest, library, aiSuggestions])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const url = await uploadCaseStudyImage(file)
      setCoverImage(url)
      setCoverImageZoom(1)
      setCoverImageRotation(0)
      setCoverImageOffsetX(50)
      setCoverImageOffsetY(50)
    } catch {
      toast({
        title: "Couldn't upload image",
        description: "Please try again.",
      })
    }
  }

  const isTitleValid = titleValue.trim().length > 0
  const isTitleAtLimit = titleValue.length >= MAX_TITLE_LENGTH
  const hasBlockingErrors = !coverImage || !isTitleValid

  const handlePublish = () => {
    if (publishing) return
    setAttemptedSubmit(true)
    if (hasBlockingErrors) return
    onPublish({
      title: titleValue.trim(),
      coverImage,
      coverImageZoom,
      coverImageRotation,
      coverImageOffsetX,
      coverImageOffsetY,
      skills,
    })
  }

  // The row always shows a full set of slots: this case study's own matches
  // first, then generic filler for whatever is left over, so a case study
  // that only matches two library skills still gets a complete row rather
  // than a stub. Skills already added are skipped (case-insensitively, since
  // a chip and a library label can differ only in casing), and the total is
  // capped so the row never wraps.
  const availableSuggestions = useMemo(() => {
    const chosen: string[] = []
    const seen = new Set(skills.map((skill) => skill.toLowerCase()))
    for (const label of [...contentSuggestions, ...SUGGESTED_SKILLS]) {
      if (chosen.length >= SUGGESTION_SLOTS) break
      const key = label.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      chosen.push(label)
    }
    return chosen
  }, [contentSuggestions, skills])

  // Typeahead dropdown pool. Ranked here so the best match is computed on
  // our side; the dropdown's own Command applies its scoring on top, so
  // treat this as which skills appear rather than a guaranteed final order.
  // It is the skills library and nothing else — the case study's own
  // content plays no part in what appears or in what order. Typing "React" returns every
  // React skill the library holds, best match first: exact, then labels
  // starting with it, then labels whose later words start with it, then bare
  // substrings; alphabetical inside each tier so the list is stable.
  const query = skillQuery.trim().toLowerCase()
  const dropdownOptions = useMemo(() => {
    const pool = library.filter((skill) => !skills.includes(skill))
    if (!query) return [...pool].sort((a, b) => a.localeCompare(b))
    return pool
      .map((label) => ({ label, rank: queryRank(label, query) }))
      .filter(
        (entry): entry is { label: string; rank: number } => entry.rank !== null
      )
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.label.length - b.label.length ||
          a.label.localeCompare(b.label)
      )
      .map((entry) => entry.label)
  }, [library, skills, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dialogOverlay={<DialogOverlay className="backdrop-blur-md z-[110]" />}
        className="max-w-[740px] max-h-[min(90vh,762px)] flex flex-col p-0 z-[110] shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03),0px_20px_24px_-4px_rgba(16,24,40,.08)]"
      >
        <DialogHeader className="shrink-0 gap-y-1 p-6 pb-5 relative">
          <DialogTitle className="text-lg font-semibold text-primary-900 pr-8">
            Publish Your Case Study
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Enter your case study details below in order to publish your
            project
          </p>
          <DialogClose className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 focus-visible:outline-none">
            <X className="size-5" />
          </DialogClose>
        </DialogHeader>

        <div className="shrink-0 border-t border-gray-200" />

        {/*
          Same call-site pattern as case-study-client-preview.tsx: the flex
          column and min-height come from here so the body scrolls between
          the header and footer, without changing the shared ScrollArea
          primitive for its other consumers.
        */}
        <ScrollArea
          className="flex-1 min-h-0 flex flex-col"
          viewportClassName="flex-1 min-h-0"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
        <div className="p-6 space-y-6">
          {/* Cover image */}
          <div>
            <label className="block text-sm font-medium text-gray-900">
              Cover Image
            </label>
            <div className="group relative mt-2 h-[200px] w-[290px] overflow-hidden rounded-lg border-2 border-primary-500 bg-primary-50">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt="Cover"
                  className="h-full w-full object-cover"
                  style={imageTransformStyle(coverImageZoom, coverImageRotation, coverImageOffsetX, coverImageOffsetY)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image01 className="h-[76px] w-[84px] text-primary-300 opacity-50" />
                </div>
              )}

              <div className="absolute left-5 top-5 opacity-0 transition duration-200 group-hover:opacity-100">
                <div className="inline-flex divide-x divide-gray-300 overflow-hidden rounded-[5px] border border-gray-300 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-9 shrink-0 items-center gap-x-2 px-[10px] text-xs font-semibold leading-none text-gray-500 hover:bg-gray-100 focus-visible:outline-none"
                  >
                    <Upload className="size-[15px]" />
                    {coverImage ? "Replace Image" : "Add Image"}
                  </button>
                  {coverImage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsImageEditOpen(true)}
                        aria-label="Edit image"
                        className="inline-flex size-9 shrink-0 items-center justify-center text-gray-500 hover:bg-gray-100 focus-visible:outline-none"
                      >
                        <Edit03 className="size-[15px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImage(null)
                          setCoverImageZoom(1)
                          setCoverImageRotation(0)
                          setCoverImageOffsetX(50)
                          setCoverImageOffsetY(50)
                        }}
                        aria-label="Remove image"
                        className="inline-flex size-9 shrink-0 items-center justify-center text-error-600 hover:bg-error-100 focus-visible:outline-none"
                      >
                        <Trash01 className="size-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            {attemptedSubmit && !coverImage ? (
              <ErrorMessage size="sm" className="mt-1.5">
                Please add a cover image.
              </ErrorMessage>
            ) : null}
            <ImageEditModal
              open={isImageEditOpen}
              onClose={() => setIsImageEditOpen(false)}
              imageUrl={coverImage ?? ""}
              title="Edit Cover Image"
              initialZoom={coverImageZoom}
              initialRotation={coverImageRotation}
              initialOffsetX={coverImageOffsetX}
              initialOffsetY={coverImageOffsetY}
              aspectRatio={290 / 200}
              objectFit="cover"
              onSave={({ zoom, rotation, offsetX, offsetY }) => {
                setCoverImageZoom(zoom)
                setCoverImageRotation(rotation)
                setCoverImageOffsetX(offsetX)
                setCoverImageOffsetY(offsetY)
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="publish-dialog-title"
                className="block text-sm font-medium text-gray-900"
              >
                Case study title
              </label>
              <span className="shrink-0 text-sm text-gray-500">
                {titleValue.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>
            <Input
              id="publish-dialog-title"
              className="mt-2"
              value={titleValue}
              onChange={(event) =>
                setTitleValue(event.target.value.slice(0, MAX_TITLE_LENGTH))
              }
              maxLength={MAX_TITLE_LENGTH}
              placeholder="Enter your case study title"
              isInvalid={(attemptedSubmit && !isTitleValid) || isTitleAtLimit}
            />
            {isTitleAtLimit ? (
              <ErrorMessage size="sm" className="mt-1.5">
                Max limit reached: {MAX_TITLE_LENGTH} characters.
              </ErrorMessage>
            ) : attemptedSubmit && !isTitleValid ? (
              <ErrorMessage size="sm" className="mt-1.5">
                Please enter a case study title.
              </ErrorMessage>
            ) : null}
          </div>

          {/* Skills */}
          <div>
            <TagsInputRoot
              value={skills}
              onValueChange={(details) => {
                if (details.value.length > MAX_SKILLS) {
                  setSkillLimitReached(true)
                  return
                }
                setSkillLimitReached(false)
                setSkills(details.value)
              }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  Skills
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  List up to 10 key skills you used in this project.
                </p>
                <span className="shrink-0 text-sm text-gray-500">
                  {skills.length}/{MAX_SKILLS}
                </span>
              </div>

              <TagsInputControl>
                {/*
                  Rendered in-flow rather than with `portalDropdown`: a
                  portaled dropdown mounts on document.body at z-[60], which
                  is below this dialog's own z-[110], so it would open behind
                  the dialog. The in-flow dropdown lives inside the dialog's
                  stacking context and stays visible.
                */}
                <TagsInputInput
                  options={dropdownOptions}
                  onInputValueChange={setSkillQuery}
                  placeholder="Add Skills"
                />
              </TagsInputControl>
            </TagsInputRoot>

            {skillLimitReached ? (
              <ErrorMessage size="sm" className="mt-1.5">
                Max skills {MAX_SKILLS} reached
              </ErrorMessage>
            ) : null}

            {/* Added skills — below the input, each removable */}
            {skills.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill}
                    size="md"
                    visual="primary"
                    className="bg-primary-50 pr-2 text-primary-500"
                  >
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() => {
                        setSkillLimitReached(false)
                        setSkills((prev) => prev.filter((s) => s !== skill))
                      }}
                      className="opacity-50 hover:opacity-100 focus-visible:outline-none"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Suggested skills — a single row; extras are hidden rather
                than wrapping to a second line. */}
            {availableSuggestions.length > 0 && skills.length < MAX_SKILLS ? (
              <div className="mt-4 space-y-1.5">
                <span className="text-sm font-medium text-gray-900">
                  Suggested Skills
                </span>
                <div className="flex flex-nowrap items-center gap-x-2 overflow-hidden">
                  {availableSuggestions.map((skill) => (
                    <Badge
                      key={skill}
                      size="md"
                      visual="primary"
                      className="bg-primary-50 pr-2 text-primary-500 focus-visible:outline-none shrink-0"
                      asChild
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSkills((prev) =>
                            prev.length >= MAX_SKILLS
                              ? prev
                              : [...prev, skill]
                          )
                        }
                      >
                        {skill}
                        <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-gray-200" />

        <DialogFooter className="shrink-0 flex items-center justify-end gap-x-3 p-6 pt-5">
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handlePublish} disabled={publishing}>
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
