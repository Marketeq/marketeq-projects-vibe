import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  Award02,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  CoinsStacked02,
  CreditCard02,
  Edit03,
  FaceContent,
  FaceFrown,
  FaceNeutral,
  FaceSad,
  FaceSmile,
  Hand,
  Home03,
  Star,
  Target04,
  ThumbsDown,
  ThumbsUp,
  Trophy01,
  X,
} from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import NextImage from "@/components/next-image"
import {
  Accordion,
  AccordionItem,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  HeadlessRadioGroupItem,
  HelperText,
  IconButton,
  Input,
  RadioGroup,
  RatingGroupControl,
  RatingGroupHiddenInput,
  RatingGroupItem,
  RatingGroupItemContext,
  RatingGroupLabel,
  RatingGroupRoot,
  Textarea,
} from "@/components/ui"

const meta: Meta = {
  title: "Reviews",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

type ReviewScreenProps = {
  onClose?: () => void
  revieweeName?: string
  projectTitle?: string
  imageSrc?: string
  amount?: string
  hoursLogged?: number
  duration?: string
  revieweeType?: "client" | "talent"
}

type ReviewImage = {
  file: File
  previewUrl: string
  status: "loading" | "ready" | "error"
  progress: number
}

const reviewChoiceShadow = "shadow-[0px_1.226px_4.903px_0px_rgba(0,0,0,0.03)]"

const reviewCircleClass = (
  selected: boolean,
  kind: "experience" | "highlight" | "work-again",
  tone: "primary" | "success" | "error" = "success"
) => {
  const selectedColors = {
    primary: "bg-primary-25 before:border-primary-500 text-primary-500",
    success: "bg-success-25 before:border-success-500 text-success-500",
    error: "bg-error-25 before:border-error-500 text-error-500",
  }
  return [
    "relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-300 before:pointer-events-none before:absolute before:rounded-full before:content-[''] before:transition-all before:duration-300",
    reviewChoiceShadow,
    kind === "experience"
      ? "size-[67px] before:-inset-[1.25px] before:border-[2.5px]"
      : kind === "work-again"
        ? "size-[67px] before:-inset-px before:border-2"
        : "p-5 before:-inset-px before:border-2",
    selected
      ? selectedColors[tone]
      : "bg-white before:border-gray-200 text-gray-500 group-hover:bg-gray-50 group-hover:before:border-gray-300",
    !selected && kind === "highlight"
      ? "group-hover:before:border-[2.5px] group-hover:before:-inset-[1.25px]"
      : "",
  ].join(" ")
}

const ReviewStateIcon = ({
  src,
  selectedSrc,
  selected,
  width,
  height = width,
}: {
  src: string
  selectedSrc: string
  selected: boolean
  width: number
  height?: number
}) => (
  <span className="relative inline-flex shrink-0">
    <NextImage
      src={src}
      alt=""
      width={width}
      height={height}
      className={`h-auto w-auto max-w-none shrink-0 transition-opacity duration-300 ${selected ? "opacity-0" : "opacity-100"}`}
    />
    <NextImage
      src={selectedSrc}
      alt=""
      width={width}
      height={height}
      className={`absolute left-0 top-0 h-auto w-auto max-w-none shrink-0 transition-opacity duration-300 ${selected ? "opacity-100" : "opacity-0"}`}
    />
  </span>
)

const ReviewSmallStars = ({
  value,
  selected,
}: {
  value: number
  selected: boolean
}) => (
  <div className="flex items-center gap-x-[1.468px]">
    {Array.from({ length: 5 }, (_, index) => {
      const filled = index < value
      const name = `review-small-star-${filled ? "filled" : "outline"}`
      return (
        <span
          key={index}
          className="relative block size-[13.212654px] shrink-0"
        >
          <span className="absolute left-[6.23%] top-[6.25%]">
            <ReviewStateIcon
              src={`/contracts/${name}.svg`}
              selectedSrc={`/contracts/${name}-selected.svg`}
              selected={selected}
              width={filled ? 11.5689 : 11.5637}
              height={11.1468}
            />
          </span>
        </span>
      )
    })}
  </div>
)

const ReviewFieldError = ({
  id,
  message,
  spacing = "pt-2",
}: {
  id: string
  message?: string
  spacing?: string
}) => {
  const lastMessage = useRef(message)
  useEffect(() => {
    if (message) lastMessage.current = message
  }, [message])
  return (
    <Accordion
      type="single"
      collapsible
      value={message ? "error" : ""}
      className="contents"
    >
      <AccordionItem value="error">
        <DisclosureContent
          role={undefined}
          aria-labelledby={undefined}
          aria-hidden={!message}
          className="data-[state=open]:duration-300 data-[state=closed]:duration-300"
        >
          <HelperText
            id={id}
            role={message ? "alert" : undefined}
            className={`text-error-600 duration-300 ${spacing} ${message ? "animate-in fade-in" : "animate-out fade-out"}`}
          >
            {message ?? lastMessage.current}
          </HelperText>
        </DisclosureContent>
      </AccordionItem>
    </Accordion>
  )
}

export const Default = ({
  onClose,
  revieweeType = "client",
  revieweeName = "Referrizer",
  projectTitle = "Referrizer Website",
  imageSrc = "/player.png",
  amount = "$35,000",
  hoursLogged = 237,
  duration = "3 weeks",
}: ReviewScreenProps = {}) => {
  const isTalentReview = revieweeType === "talent"
  const subject = isTalentReview ? "contractor" : "client"
  const [experience, setExperience] = useState("")
  const [workAgain, setWorkAgain] = useState("")
  const [highlights, setHighlights] = useState<string[]>([])
  const [review, setReview] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const clearError = (field: string) => {
    setErrors((previous) => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }
  const reviewForm = useRef<HTMLDivElement>(null)
  const aspectLabels = [
    "Responsiveness",
    "Timeliness",
    isTalentReview ? "Quality of Work" : "On-time Payment",
    isTalentReview ? "Technical Skills" : "Project Clarity",
    "Professionalism",
  ]
  const continueReview = () => {
    const nextErrors: Record<string, string> = {}
    if (!experience)
      nextErrors.experience = "Please rate your overall experience."
    if (!workAgain)
      nextErrors.workAgain = `Please select whether you would work with this ${subject} again.`
    if (!highlights.length)
      nextErrors.highlights = "Please select at least one highlight (up to 4)."
    ratings.forEach((rating, index) => {
      if (!rating)
        nextErrors[`rating-${index}`] =
          `Please rate ${aspectLabels[index].toLowerCase()}.`
    })
    if (!review.trim()) nextErrors.review = "Please write your public review."
    if (currentImages.current.some((image) => image?.status === "error"))
      nextErrors.images =
        "Please retry or replace the image that could not be read."
    else if (currentImages.current.some((image) => image?.status === "loading"))
      nextErrors.images = "Please wait for your images to finish loading."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => {
        const invalid = reviewForm.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]'
        )
        invalid?.scrollIntoView({ block: "center", behavior: "smooth" })
        const control = invalid?.matches("textarea, input, button, [tabindex]")
          ? invalid
          : invalid?.querySelector<HTMLElement>('button, [role="radio"]')
        control?.focus({ preventScroll: true })
      })
    }
  }
  const [ratings, setRatings] = useState([0, 0, 0, 0, 0])
  const [hoveredRatings, setHoveredRatings] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ])
  const previewRating = (ratingIndex: number, value: number | null) => {
    setHoveredRatings((previous) =>
      previous.map((rating, index) => (index === ratingIndex ? value : rating))
    )
  }
  const [expandedImages, setExpandedImages] = useState(false)
  const [reviewImages, setReviewImages] = useState<(ReviewImage | null)[]>(() =>
    Array.from({ length: 10 }, () => null)
  )
  const readers = useRef(new Map<number, FileReader>())
  const fileInput = useRef<HTMLInputElement>(null)
  const nextImageSlot = useRef(0)
  const currentImages = useRef(reviewImages)
  const imageCount = reviewImages.filter(
    (image) => image?.status === "ready"
  ).length

  useEffect(
    () => () => {
      readers.current.forEach((reader) => reader.abort())
      currentImages.current.forEach((image) => {
        if (image) URL.revokeObjectURL(image.previewUrl)
      })
    },
    []
  )

  const removeImage = (index: number) => {
    readers.current.get(index)?.abort()
    readers.current.delete(index)
    const images = [...currentImages.current]
    const image = images[index]
    if (image) URL.revokeObjectURL(image.previewUrl)
    images[index] = null
    currentImages.current = images
    setReviewImages(images)
    if (images.every((image) => !image || image.status === "ready"))
      clearError("images")
  }

  const updateImage = (
    index: number,
    image: ReviewImage,
    changes: Partial<ReviewImage>
  ) => {
    if (currentImages.current[index] !== image) return
    Object.assign(image, changes)
    setReviewImages([...currentImages.current])
    if (currentImages.current.every((item) => !item || item.status === "ready"))
      clearError("images")
  }

  const loadImage = (index: number, file: File) => {
    removeImage(index)
    const image: ReviewImage = {
      file,
      previewUrl: URL.createObjectURL(file),
      status: ["image/jpeg", "image/png"].includes(file.type)
        ? "loading"
        : "error",
      progress: 0,
    }
    currentImages.current[index] = image
    setReviewImages([...currentImages.current])
    if (image.status === "error") return
    const reader = new FileReader()
    readers.current.set(index, reader)
    reader.onprogress = (event) => {
      if (event.lengthComputable)
        updateImage(index, image, {
          progress: Math.round((event.loaded / event.total) * 100),
        })
    }
    reader.onload = () => {
      readers.current.delete(index)
      updateImage(index, image, { progress: 100 })
    }
    reader.onerror = () => {
      readers.current.delete(index)
      updateImage(index, image, { status: "error" })
    }
    reader.readAsArrayBuffer(file)
  }

  const selectImages = (files: FileList | null) => {
    const selected = Array.from(files ?? [])
    const slots = Array.from(
      { length: 10 },
      (_, offset) => (nextImageSlot.current + offset) % 10
    ).filter(
      (index) =>
        !currentImages.current[index] ||
        currentImages.current[index]?.status === "error"
    )
    selected.slice(0, slots.length).forEach((file, offset) => {
      const index = slots[offset]
      loadImage(index, file)
      if (index >= 5) setExpandedImages(true)
    })
  }
  return (
    <div className="bg-gray-25 flex h-dvh flex-col overflow-hidden">
      <div className="border-b shrink-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with {revieweeName}
            </h1>

            <div className="flex items-center gap-x-3">
              {isTalentReview ? (
                <Avatar size="lg" className="hover:ring-0 active:ring-0">
                  <AvatarImage src={imageSrc} alt={revieweeName} />
                  <AvatarFallback className="hover:bg-primary-25">
                    {revieweeName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Image
                  className="h-12 w-auto object-contain"
                  src={imageSrc}
                  alt={revieweeName}
                  height={48}
                  width={75.08}
                />
              )}

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  {projectTitle}
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    {isTalentReview
                      ? `${hoursLogged.toLocaleString("en-US")} Hours`
                      : duration}
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    {amount} {isTalentReview ? "paid" : "earned"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            aria-label="Close review"
            onClick={onClose}
            className="text-gray-500/50 hover:text-gray-500 duration-300"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div
        ref={reviewForm}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-[100px] px-[200px]"
      >
        <div>
          <div className="space-y-6">
            <div className="flex flex-col gap-y-3">
              <h1 className="text-[32px] leading-[30px] font-bold text-dark-blue-400">
                How was your experience working with {revieweeName}?
              </h1>
              <p className="text-sm leading-5 text-gray-500">
                Your review will be public and help others understand your experience.
              </p>
            </div>

            <RadioGroup
              aria-label="Overall experience"
              aria-required="true"
              aria-invalid={Boolean(errors.experience)}
              aria-describedby={
                errors.experience ? "review-experience-error" : undefined
              }
              value={experience}
              onValueChange={(value) => {
                setExperience(value)
                if (value) clearError("experience")
              }}
              className="flex items-center gap-x-[50px]"
            >
              <HeadlessRadioGroupItem
                value="item-1"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div
                  className={reviewCircleClass(
                    experience === "item-1",
                    "experience",
                    "primary"
                  )}
                >
                  <FaceSad className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=checked]:text-primary-500">
                  Terrible
                </span>

                <ReviewSmallStars
                  value={1}
                  selected={experience === "item-1"}
                />
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-2"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div
                  className={reviewCircleClass(
                    experience === "item-2",
                    "experience",
                    "primary"
                  )}
                >
                  <FaceFrown className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=checked]:text-primary-500">
                  Bad
                </span>

                <ReviewSmallStars
                  value={2}
                  selected={experience === "item-2"}
                />
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-3"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div
                  className={reviewCircleClass(
                    experience === "item-3",
                    "experience",
                    "primary"
                  )}
                >
                  <FaceNeutral className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=checked]:text-primary-500">
                  Neutral
                </span>

                <ReviewSmallStars
                  value={3}
                  selected={experience === "item-3"}
                />
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-4"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div
                  className={reviewCircleClass(
                    experience === "item-4",
                    "experience",
                    "primary"
                  )}
                >
                  <FaceSmile className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=checked]:text-primary-500">
                  Good
                </span>

                <ReviewSmallStars
                  value={4}
                  selected={experience === "item-4"}
                />
              </HeadlessRadioGroupItem>
              <HeadlessRadioGroupItem
                value="item-5"
                className="focus-visible:outline-none flex flex-col gap-y-1 group"
              >
                <div
                  className={reviewCircleClass(
                    experience === "item-5",
                    "experience",
                    "primary"
                  )}
                >
                  <FaceContent className="size-[37px]" />
                </div>

                <span className="text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=checked]:text-primary-500">
                  Excellent
                </span>

                <ReviewSmallStars
                  value={5}
                  selected={experience === "item-5"}
                />
              </HeadlessRadioGroupItem>
            </RadioGroup>
            <ReviewFieldError
              id="review-experience-error"
              message={errors.experience}
              spacing="pt-6"
            />
          </div>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-lg text-dark-blue-400 font-semibold leading-9">
            Would you work with this {subject} again?
          </h1>

          <RadioGroup
            aria-label="Work together again"
            aria-required="true"
            aria-invalid={Boolean(errors.workAgain)}
            aria-describedby={
              errors.workAgain ? "review-work-again-error" : undefined
            }
            value={workAgain}
            onValueChange={(value) => {
              setWorkAgain(value)
              if (value) clearError("workAgain")
            }}
            className="mt-6 flex items-center gap-x-[50px]"
          >
            <HeadlessRadioGroupItem
              value="item-1"
              className="focus-visible:outline-none group flex flex-col gap-y-1"
            >
              <div
                className={reviewCircleClass(
                  workAgain === "item-1",
                  "work-again",
                  "success"
                )}
              >
                <ThumbsUp className="size-[37px]" />
              </div>

              <span className="group-data-[state=checked]:text-success-600 transition-colors duration-300 text-sm inline-block text-center leading-5 font-semibold text-gray-500">
                Yes
              </span>
            </HeadlessRadioGroupItem>
            <HeadlessRadioGroupItem
              value="item-2"
              className="focus-visible:outline-none group flex flex-col gap-y-1"
            >
              <div
                className={reviewCircleClass(
                  workAgain === "item-2",
                  "work-again",
                  "error"
                )}
              >
                <ThumbsDown className="size-[37px]" />
              </div>

              <span className="group-data-[state=checked]:text-error-600 transition-colors duration-300 text-sm inline-block text-center leading-5 font-semibold text-gray-500">
                No
              </span>
            </HeadlessRadioGroupItem>
          </RadioGroup>
          <ReviewFieldError
            id="review-work-again-error"
            message={errors.workAgain}
            spacing="pt-0"
          />
        </div>

        <div className="mt-[50px]">
          <h1 className="text-lg text-dark-blue-400 font-semibold leading-9">
            {isTalentReview
              ? "What stood out about this contractor?"
              : "Would you work with this client again?"}{" "}
            <span className="text-sm font-normal">(Select up to 4) </span>
          </h1>

          <ToggleGroupRoot
            multiple
            value={highlights}
            onValueChange={({ value }) => {
              if (value.length > 4) {
                setErrors((previous) => ({
                  ...previous,
                  highlights: "Please select no more than 4 highlights.",
                }))
                return
              }
              setHighlights(value)
              if (value.length) clearError("highlights")
            }}
            aria-label="Review highlights (select up to 4)"
            aria-invalid={Boolean(errors.highlights)}
            aria-describedby={
              errors.highlights ? "review-highlights-error" : undefined
            }
            className={`mt-6 grid max-w-full grid-cols-4 gap-6 overflow-visible rounded-none border-0 bg-transparent ${isTalentReview ? "w-max" : "w-[648px]"}`}
          >
            <ToggleGroupItem
              value="item-1"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-1"),
                  "highlight"
                )}
              >
                <ReviewStateIcon
                  src="/contracts/review-quality-expectations.svg"
                  selectedSrc="/contracts/review-quality-expectations-selected.svg"
                  selected={highlights.includes("item-1")}
                  width={22.0645}
                />
              </div>

              <span className="whitespace-nowrap text-sm inline-block text-center leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                {isTalentReview
                  ? "Understands Requirements"
                  : "Clear Expectations"}
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-2"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-2"),
                  "highlight"
                )}
              >
                <ReviewStateIcon
                  src="/contracts/review-quality-collaboration.svg"
                  selectedSrc="/contracts/review-quality-collaboration-selected.svg"
                  selected={highlights.includes("item-2")}
                  width={22.0645}
                />
              </div>

              <span className="whitespace-nowrap text-sm inline-block text-center leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                Smooth Collaboration
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-3"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-3"),
                  "highlight"
                )}
              >
                <NextImage
                  src={
                    "/contracts/review-quality-" +
                    (isTalentReview ? "professional" : "payments") +
                    ".svg"
                  }
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm inline-block text-center leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                {isTalentReview ? "Quality Work" : "Timely Payments"}
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-4"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-4"),
                  "highlight"
                )}
              >
                <NextImage
                  src="/contracts/review-quality-detail.svg"
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm inline-block text-center leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                Detail-Oriented{" "}
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-5"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-5"),
                  "highlight"
                )}
              >
                <NextImage
                  src="/contracts/review-quality-team.svg"
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                Great Team Player
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-6"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-6"),
                  "highlight"
                )}
              >
                <NextImage
                  src="/contracts/review-quality-deadlines.svg"
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                Respects Deadlines
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-7"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-7"),
                  "highlight"
                )}
              >
                <NextImage
                  src="/contracts/review-quality-professional.svg"
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                Highly Professional
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="item-8"
              className="h-auto w-full min-w-0 flex-col gap-x-0 gap-y-1 bg-transparent p-0 data-[state=on]:bg-transparent group focus-visible:outline-none"
            >
              <div
                className={reviewCircleClass(
                  highlights.includes("item-8"),
                  "highlight"
                )}
              >
                <NextImage
                  src="/contracts/review-quality-value.svg"
                  alt=""
                  width={22.0645}
                  height={22.0645}
                  className="h-auto w-auto"
                />
              </div>

              <span className="whitespace-nowrap text-sm text-center inline-block leading-5 font-semibold text-gray-500 transition-colors duration-300 group-data-[state=on]:text-success-500">
                {isTalentReview ? "Great Value" : "Competitive Pay"}
              </span>
            </ToggleGroupItem>
          </ToggleGroupRoot>
          <ReviewFieldError
            id="review-highlights-error"
            message={errors.highlights}
            spacing="pt-3"
          />
        </div>

        <div className="mt-[50px]">
          <h1 className="text-[22px] leading-[30px] font-bold text-dark-blue-400">
            How would you rate these aspects of the project?
          </h1>

          <div className="mt-6 space-y-6">
            {aspectLabels.map((label, ratingIndex) => (
              <div key={label}>
                <RatingGroupRoot
                  count={5}
                  aria-invalid={Boolean(errors[`rating-${ratingIndex}`])}
                  aria-describedby={
                    errors[`rating-${ratingIndex}`]
                      ? `review-rating-${ratingIndex}-error`
                      : undefined
                  }
                  value={ratings[ratingIndex]}
                  onValueChange={({ value }) => {
                    previewRating(ratingIndex, null)
                    if (value) clearError(`rating-${ratingIndex}`)
                    setRatings((previous) =>
                      previous.map((rating, index) =>
                        index === ratingIndex ? value : rating
                      )
                    )
                  }}
                  className="flex-row items-center gap-x-6 gap-y-0"
                >
                  <RatingGroupLabel className="w-[150px] shrink-0 text-sm font-semibold leading-5 text-gray-500">
                    {label}
                  </RatingGroupLabel>
                  <RatingGroupControl
                    className="gap-x-[4.449px]"
                    onMouseLeave={() => previewRating(ratingIndex, null)}
                    onPointerLeave={() => previewRating(ratingIndex, null)}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <RatingGroupItem
                        key={index}
                        index={index + 1}
                        onMouseEnter={() =>
                          previewRating(ratingIndex, index + 1)
                        }
                        onPointerEnter={(event) => {
                          if (event.pointerType !== "touch")
                            previewRating(ratingIndex, index + 1)
                        }}
                        className="cursor-pointer [&_svg]:size-[40.041px] [&_svg]:text-gray-300 [&_svg]:data-[highlighted]:text-primary-500 [&_svg]:transition-colors [&_svg]:duration-300"
                      >
                        <RatingGroupItemContext>
                          {() => (
                            <Star
                              data-highlighted={
                                index <
                                (hoveredRatings[ratingIndex] ??
                                  ratings[ratingIndex])
                                  ? ""
                                  : undefined
                              }
                            />
                          )}
                        </RatingGroupItemContext>
                      </RatingGroupItem>
                    ))}
                    <RatingGroupHiddenInput
                      name={`review-rating-${ratingIndex}`}
                    />
                  </RatingGroupControl>
                </RatingGroupRoot>
                <ReviewFieldError
                  id={`review-rating-${ratingIndex}-error`}
                  message={errors[`rating-${ratingIndex}`]}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-[50px] space-y-6">
          <div className="space-y-3">
            <h1 className="text-lg leading-none font-semibold text-dark-blue-400">
              Tell us more about your experience working with this {subject}.
              Elaborate on what went well or areas for improvement.
            </h1>

            <p className="text-sm leading-5 text-gray-500">
              Your review, along with project details and pricing, will be
              publicly visible.
            </p>
          </div>

          <Input
            className="w-full"
            placeholder="Write your public review title here..."
          />

          <div className="space-y-1.5">
            <Textarea
              aria-label="Public review"
              aria-required="true"
              aria-invalid={Boolean(errors.review)}
              aria-describedby={
                errors.review ? "review-public-error" : undefined
              }
              isInvalid={Boolean(errors.review)}
              value={review}
              onChange={(event) => {
                const value = event.target.value
                setReview(value)
                if (value.trim()) clearError("review")
              }}
              className="h-[128px]"
              placeholder="Write your public review here..."
            />
            <ReviewFieldError
              id="review-public-error"
              message={errors.review}
              spacing="pt-1.5"
            />
          </div>
        </div>

        <div className="mt-[50px] space-y-6">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <h1 className="text-lg leading-9 text-dark-blue-400 font-semibold">
                Attach Images{" "}
                <span className="text-sm font-normal">(Up to 10)</span>
              </h1>
              <p className="text-sm leading-5 text-gray-500">
                Selected images will be included with your review.
              </p>
            </div>
            <span className="text-xs text-gray-500" aria-live="polite">
              {imageCount}/10
            </span>
          </div>

          <div className="space-y-2.5">
            <Input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              tabIndex={-1}
              aria-label="Choose review images"
              className="hidden"
              onChange={(event) => {
                selectImages(event.currentTarget.files)
                event.currentTarget.value = ""
              }}
            />
            <Accordion
              type="single"
              value={expandedImages ? "additional-images" : ""}
            >
              {[0, 1].map((rowIndex) => {
                const row = (
                  <div key={rowIndex} className="grid grid-cols-5 gap-2.5">
                    {reviewImages
                      .slice(rowIndex * 5, rowIndex * 5 + 5)
                      .map((image, columnIndex) => {
                        const index = rowIndex * 5 + columnIndex
                        const chooseImage = () => {
                          nextImageSlot.current = index
                          fileInput.current?.click()
                        }
                        if (image?.status === "error")
                          return (
                            <Button
                              key={index}
                              aria-label={`Try again for review image ${index + 1}`}
                              aria-invalid={Boolean(errors.images)}
                              aria-describedby={
                                errors.images
                                  ? "review-images-error"
                                  : undefined
                              }
                              variant="outlined"
                              visual="error"
                              onClick={chooseImage}
                              className="h-[100px] w-full rounded-[5px] border-2 border-dashed border-error-300 bg-error-25 p-0 text-sm font-semibold leading-5 text-error-600 shadow-none hover:border-error-400 hover:bg-error-50 hover:text-error-700 transition-colors duration-300"
                            >
                              Try again
                            </Button>
                          )
                        return image ? (
                          <div
                            key={index}
                            tabIndex={0}
                            role="group"
                            aria-label={`Review image ${index + 1}: ${image.file.name}`}
                            aria-busy={image.status === "loading"}
                            aria-invalid={
                              image.status === "loading" &&
                              Boolean(errors.images)
                            }
                            aria-describedby={
                              errors.images ? "review-images-error" : undefined
                            }
                            className="group/image relative h-[100px] overflow-hidden rounded-[5px] outline-none focus-visible:rounded-lg focus-visible:border-2 focus-visible:border-primary-500 focus-visible:p-0.5"
                          >
                            <div className="relative h-full overflow-hidden rounded-[5px]">
                              <NextImage
                                src={image.previewUrl}
                                alt={image.file.name}
                                width={200}
                                height={100}
                                className="h-full w-full object-cover"
                                unoptimized
                                onLoad={() =>
                                  updateImage(index, image, {
                                    status: "ready",
                                    progress: 100,
                                  })
                                }
                                onError={() =>
                                  updateImage(index, image, { status: "error" })
                                }
                              />
                              <div className="pointer-events-none absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-0 z-10 rounded-[5px] ring-1 ring-inset ring-gray-200"
                              />
                            </div>
                            {image.status === "loading" ? (
                              <div
                                role="status"
                                aria-label={`Loading ${image.file.name}`}
                                className="absolute inset-0 flex items-center justify-center rounded-[5px] border-2 border-dashed border-gray-300 bg-gray-50"
                              >
                                <div className="flex translate-y-[4.5px] flex-col items-center gap-[7px]">
                                  <NextImage
                                    src="/contracts/review-image-loading.svg"
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="animate-spin"
                                  />
                                  <span className="text-xs leading-5 text-gray-600">
                                    {Math.ceil(image.file.size / 1024)} KB –{" "}
                                    {image.progress}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <IconButton
                                aria-label={`Remove ${image.file.name}`}
                                variant="ghost"
                                visual="error"
                                className="group/delete absolute right-2.5 top-2.5 size-7 rounded-full bg-black/20 opacity-0 group-hover/image:opacity-100 focus-visible:opacity-100 hover:bg-black focus:bg-black transition duration-300"
                                onClick={() => removeImage(index)}
                              >
                                <span className="relative size-4">
                                  <NextImage
                                    src="/contracts/review-image-delete.svg"
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="absolute inset-0 opacity-100 group-hover/delete:opacity-0 group-focus-visible/delete:opacity-0 transition-opacity duration-300"
                                  />
                                  <NextImage
                                    src="/contracts/review-image-delete-hover.svg"
                                    alt=""
                                    width={16}
                                    height={16}
                                    className="absolute inset-0 opacity-0 group-hover/delete:opacity-100 group-focus-visible/delete:opacity-100 transition-opacity duration-300"
                                  />
                                </span>
                              </IconButton>
                            )}
                          </div>
                        ) : (
                          <Button
                            key={index}
                            aria-label={`Add review image ${index + 1}`}
                            variant="outlined"
                            visual="gray"
                            onClick={chooseImage}
                            className="group/image h-[100px] w-full flex-col gap-y-2 overflow-hidden rounded-[5px] border-2 border-dashed border-gray-300 bg-gray-50 p-5 text-gray-400 leading-5 shadow-none hover:border-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors duration-300"
                          >
                            <span className="relative size-6">
                              <NextImage
                                src="/contracts/review-image-plus.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="absolute inset-0 opacity-100 group-hover/image:opacity-0 transition-opacity duration-300"
                              />
                              <NextImage
                                src="/contracts/review-image-plus-hover.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="absolute inset-0 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300"
                              />
                            </span>
                            Image
                          </Button>
                        )
                      })}
                  </div>
                )
                return rowIndex === 0 ? (
                  row
                ) : (
                  <AccordionItem key={rowIndex} value="additional-images">
                    <DisclosureContent
                      aria-label="Additional review images"
                      aria-labelledby={undefined}
                      className="data-[state=open]:duration-300 data-[state=closed]:duration-300"
                    >
                      <div className="pt-2.5 animate-in fade-in duration-300">
                        {row}
                      </div>
                    </DisclosureContent>
                  </AccordionItem>
                )
              })}
            </Accordion>

            <div className="flex items-center justify-between">
              <Button
                variant="link"
                visual="gray"
                onClick={() => setExpandedImages(true)}
                disabled={expandedImages}
                aria-hidden={expandedImages}
                tabIndex={expandedImages ? -1 : undefined}
                className={
                  expandedImages
                    ? "invisible"
                    : "opacity-50 hover:opacity-100 transition duration-300"
                }
              >
                <NextImage
                  src="/contracts/review-add-more-plus.svg"
                  alt=""
                  width={15}
                  height={15}
                />
                Add More
              </Button>

              <span className="inline-block text-xs text-gray-500">
                Supported formats: JPG, PNG
              </span>
            </div>
          </div>
          <ReviewFieldError
            id="review-images-error"
            message={errors.images}
            spacing="pt-6"
          />
        </div>

        <div className="mt-[50px] flex items-center justify-between">
          <Button size="md" variant="outlined" visual="gray">
            Need Help?
          </Button>

          <Button size="md" onClick={continueReview}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

export const TalentReview = (
  props: Omit<ReviewScreenProps, "revieweeType"> = {}
) => (
  <Default
    {...props}
    revieweeType="talent"
    revieweeName={props.revieweeName ?? "Chris"}
    projectTitle={props.projectTitle ?? "Senior UX Designer"}
    imageSrc={props.imageSrc ?? "/man.jpg"}
  />
)

export const SendFeedback = () => {
  return (
    <div className="bg-gray-25 min-h-screen">
      <div className="border-b sticky top-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with Referrizer
            </h1>

            <div className="flex items-center gap-x-3">
              <Image
                className="object-contain"
                src="/player.png"
                alt="Player"
                height={48}
                width={75.08}
              />

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  Referrizer Website
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    Contract Completed
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    3 weeks
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    $35,000 earned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div className="py-[100px] px-[200px]">
        <div className="space-y-3">
          <h1 className="text-[32px] leading-none font-bold text-dark-blue-400">
            Leave Private Feedback{" "}
            <span className="font-normal text-lg">(optional)</span>
          </h1>

          <p className="text-sm leading-5 text-gray-500">
            Your private feedback helps improve platform quality, but will not
            be shared publicly.
          </p>
        </div>

        <div className="mt-[50px]">
          <h1 className="text-[22px] font-bold leading-[30px] text-dark-blue-400">
            Was the process smooth, timely, and free of disputes?{" "}
            <span className="block">Select all that apply.</span>
          </h1>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold leading-none text-dark-blue-400">
              What went well?
            </h1>

            <div className="flex gap-3 mt-3 flex-wrap">
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-success-300 hover:bg-success-25 border-success-200 active:bg-white active:border-success-500 active:text-success-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
            </div>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold leading-none text-dark-blue-400">
              What went well?
            </h1>

            <div className="flex gap-3 mt-3 flex-wrap">
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
              <Button
                className="hover:border-error-300 hover:bg-error-25 border-error-200 active:bg-white active:border-error-500 active:text-error-600"
                variant="outlined"
                size="md"
                visual="gray"
              >
                Fast & hassle-free payment
              </Button>
            </div>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg leading-none text-dark-blue-400 font-semibold">
              Submit your private feedback
            </h1>

            <p className="mt-3 text-base leading-none text-gray-500">
              Your private feedback helps us improve the platform. This
              conversation remains private between you and the platform and will
              not be shared with the client.
            </p>

            <Textarea
              className="mt-6 h-[128px]"
              placeholder="Enter your private feedback here..."
            />
          </div>

          <div className="mt-[50px] flex items-center justify-between">
            <Button variant="outlined" visual="gray" size="md">
              Need Help?
            </Button>

            <div className="flex items-center justify-center gap-x-3">
              <Button size="md" variant="outlined" visual="gray">
                Skip
              </Button>

              <Button size="md">Submit Feedback</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const BrowserProjects = () => {
  return (
    <div className="bg-gray-25 min-h-screen flex flex-col">
      <div className="border-b sticky top-0 border-gray-200">
        <div className="py-[15px] px-6 bg-white py-[15px] flex items-start">
          <div className="flex-1 space-y-3">
            <h1 className="text-sm font-semibold text-dark-blue-400">
              Review Your Experience with Referrizer
            </h1>

            <div className="flex items-center gap-x-3">
              <Image
                className="object-contain"
                src="/player.png"
                alt="Player"
                height={48}
                width={75.08}
              />

              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-dark-blue-400">
                  Referrizer Website
                </h1>
                <div className="flex items-center gap-x-3">
                  <div className="flex items-center gap-x-1.5">
                    <Check className="size-[15px] shrink-0 text-success-500" />

                    <span className="inline-block text-sm leading-6 text-dark-blue-400">
                      Contract Completed
                    </span>
                  </div>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    Contract Completed
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    3 weeks
                  </span>

                  <span className="inline-block size-1 bg-gray-300 rounded-full shrink-0" />
                  <span className="inline-block text-sm leading-6 text-dark-blue-400">
                    $35,000 earned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <IconButton
            className="text-gray-500/50 hover:text-gray-500"
            variant="ghost"
            visual="gray"
          >
            <X className="size-6" />
          </IconButton>
        </div>
      </div>

      <div className="px-[200px] grid place-items-center flex-1 py-[100px]">
        <div className="max-w-[1040px] w-full">
          <div className="flex items-center justify-center">
            <div className="size-[56px] inline-flex text-success-500 items-center justify-center shrink-0 border-[10px] bg-success-100 rounded-full border-success-50">
              <CheckCircle className="size-7" />
            </div>
          </div>

          <h1 className="text-[30px] mt-6 text-center text-dark-blue-400 font-bold leading-none">
            Your review has been submitted, thank you!
          </h1>

          <div className="max-w-[600px] text-center mt-6 mx-auto">
            We’ve received your review and are processing it. This may take a
            few days, and we appreciate your patience. You’ll be notified once
            it’s published.
          </div>

          <div className="mt-[50px] flex justify-center items-center gap-x-6">
            <Button size="2xl" visual="gray" variant="outlined">
              <Edit03 className="size-[18px]" />
              Edit your review
            </Button>
            <Button size="2xl">Browse Projects</Button>
          </div>

          <div className="mt-[50px] flex justify-center">
            <Button size="lg" variant="ghost">
              <Home03 className="size-[15px]" /> Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const Modal = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Trigger</Button>
      </DialogTrigger>
      <DialogContent className="p-0 rounded-xl">
        <div className="p-6">
          <DialogTitle className="text-dark-blue-400">
            Are you sure you want to exit?
          </DialogTitle>
          <DialogDescription className="text-dark-blue-400 mt-2">
            Your feedback helps others make informed decisions. You can return
            within 3 days to complete it.
          </DialogDescription>
        </div>

        <div className="px-6 py-4 flex items-center border-t border-gray-200 justify-between bg-gray-25 rounded-b-xl">
          <DialogClose asChild>
            <Button variant="link" visual="gray">
              <X className="size-[15px]" />
              Cancel
            </Button>
          </DialogClose>

          <Button variant="outlined" visual="gray">
            Save & Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
