"use client"

import { useEffect, useRef, useState } from "react"
import { Edit03, Image01, Plus2, Trash01, Upload, X } from "@blend-metrics/icons"
import { uploadCaseStudyImage } from "@/lib/case-study-upload"
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
  TagsInputContext,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputRoot,
} from "@/components/ui"

const MAX_SKILLS = 10
const MAX_TITLE_LENGTH = 120

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

const SUGGESTED_SKILLS = [
  "Node.js",
  "JavaScript",
  "Wireframing",
  "Prototyping",
  "User Flows",
]

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
  onPublish,
  publishing = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
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

  // Re-seed from the editor's current title (and clear image/skills/errors)
  // every time the dialog is freshly opened.
  useEffect(() => {
    if (open) {
      setTitleValue(initialTitle)
      setAttemptedSubmit(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const url = await uploadCaseStudyImage(file)
    setCoverImage(url)
    setCoverImageZoom(1)
    setCoverImageRotation(0)
    setCoverImageOffsetX(50)
    setCoverImageOffsetY(50)
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

  const availableSuggestions = SUGGESTED_SKILLS.filter(
    (skill) => !skills.includes(skill)
  )

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

        <div className="p-6 space-y-6 min-h-0 flex-1 overflow-y-auto">
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
                if (details.value.length > MAX_SKILLS) return
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

              <TagsInputContext>
                {(tagsInput) => (
                  <TagsInputControl>
                    {tagsInput.value.map((value, index) => (
                      <TagsInputItem key={index} index={index} value={value}>
                        <TagsInputItemPreview
                          visual="primary"
                          size="md"
                          className="bg-primary-50 pr-2 text-primary-500"
                        >
                          <TagsInputItemText>{value}</TagsInputItemText>
                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                            <X className="size-3" />
                          </TagsInputItemDeleteTrigger>
                        </TagsInputItemPreview>
                        <TagsInputItemInput />
                      </TagsInputItem>
                    ))}
                    <TagsInputInput
                      options={SKILL_OPTIONS}
                      placeholder={skills.length ? "" : "Add Skills"}
                      portalDropdown
                    />
                  </TagsInputControl>
                )}
              </TagsInputContext>
            </TagsInputRoot>

            {availableSuggestions.length > 0 && skills.length < MAX_SKILLS ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                {availableSuggestions.map((skill) => (
                  <Badge
                    key={skill}
                    size="md"
                    visual="primary"
                    className="bg-primary-50 pr-2 text-primary-500 focus-visible:outline-none"
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
            ) : null}
          </div>
        </div>

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
