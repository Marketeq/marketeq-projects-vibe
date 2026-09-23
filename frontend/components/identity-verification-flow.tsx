"use client"

// frontend/components/identity-verification-flow.tsx
//
// Exact markup/copy/behavior from the Storybook reference
// (stories/identity-verification-entire.stories.tsx: the IdentityVerification
// state machine, states "ideal" through "travel-mode") — not redesigned.
// Composed entirely from existing design-system primitives (Dialog, Button,
// Input, Label, RadioGroup, Alert, icons) plus the real useStateMachine
// hook already used the same way in that Storybook file.
//
// Two things Storybook's illustrative version doesn't fully specify, added
// here as the minimal necessary additions to make this a working flow
// (both flagged inline where they occur):
//   1. A "Capture" action on the scan screen — Storybook's scan screen has
//      no capture control at all.
//   2. Travel Mode's "Done" closes this flow (Storybook's only shows a
//      toast and never closes) — otherwise a user finishing setup would be
//      stuck with the modal open.
//
// Document submission and the captured location/status inputs are all
// backed by temporary, isolated mocks (src/lib/api/*) — see each mock
// file's own header for why, and what a real backend integration swaps in.

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useMountedState } from "react-use"
import {
  ArrowLeft,
  Camera,
  Certificate02,
  Check,
  CheckCircle,
  ChevronRight,
  CreditCardCheck,
  FileCheck02,
  Home03,
  Info,
  Luggage02,
  Passport,
  Plane,
  RefreshCw,
  Webcam02,
  X,
} from "@blend-metrics/icons"
import { WebCamera, WebCameraHandler } from "@shivantra/react-web-camera"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  IconButton,
  Label,
  RadioGroup,
  RadioGroupItem,
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToast,
} from "@/components/ui"
import { CountriesCombobox } from "@/components/own-combobox"
import { useStateMachine } from "@/utils/hooks"
import type { DetectedLocation } from "@/src/lib/api/detected-location"
import { submitIdentityDocument } from "@/src/lib/api/submit-identity-document"
import {
  scheduleTravelModeReminderMock,
  type TravelDuration,
} from "@/src/lib/api/travel-mode-reminder"

// Decorative icon only (matches Storybook's local QR constant exactly,
// same file, same paths) — not a design-system component, just static art.
const QR = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    className={className ?? "size-[47px]"}
    {...props}
  >
    <path
      fill="url(#a)"
      d="M.97 0A.97.97 0 0 0 0 .97v13.582c0 .535.434.97.97.97h13.582a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97H.97Zm17.74 0a.97.97 0 0 0-.97.97v2.495c0 .535.434.97.97.97h.276a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h1.248V.97a.97.97 0 0 0-.97-.97h-2.495Zm3.464 2.217v1.248c0 .535.434.97.97.97h1.247V3.188a.97.97 0 0 0-.97-.97h-1.247Zm2.217 2.218v2.217h3.465a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v2.495a.97.97 0 0 1-.97.97H24.39Zm0 2.217H18.71a.97.97 0 0 0-.97.97V7.9c0 .536.434.97.97.97h2.495a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v1.247h1.247a.97.97 0 0 1 .97.97v.278c0 .535.434.97.97.97h1.247v-1.248a.97.97 0 0 1 .97-.97h.278a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97H24.39v1.247a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v1.247h3.465a.97.97 0 0 1 .97.97v1.248h1.247a.97.97 0 0 0 .97-.97v-9.147a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97V9.84a.97.97 0 0 0-.97-.97h-.278a.97.97 0 0 1-.97-.97V6.651Zm2.218 15.522H25.36a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-1.247V28.826h1.247a.97.97 0 0 1 .97.97v2.495a.97.97 0 0 1-.97.97h-2.494a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-1.248h-1.247a.97.97 0 0 1-.97-.97v-3.465h-1.248a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v1.247h2.218V19.956h-3.465a.97.97 0 0 1-.97-.97V17.74h-5.682a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97H8.87v1.248a.97.97 0 0 1-.97.97h-.278a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97H8.87v-1.248a.97.97 0 0 0-.97-.97H5.404a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97H2.217V26.61h2.218V25.36a.97.97 0 0 1 .97-.97h5.682v-1.247a.97.97 0 0 1 .97-.97h1.247v-1.247a.97.97 0 0 1 .97-.97h.278a.97.97 0 0 1 .97.97v.277a.97.97 0 0 1-.97.97h-1.248v2.217h1.248a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-1.248v1.247c0 .536.435.97.97.97h2.495a.97.97 0 0 1 .97.97v4.712c0 .536.434.97.97.97h.277a.97.97 0 0 1 .97.97v1.248H25.64a.97.97 0 0 1 .97.97v.277a.97.97 0 0 1-.97.97h-4.712a.97.97 0 0 1-.97-.97v-1.247h-1.248a.97.97 0 0 0-.97.97v2.494c0 .536.434.97.97.97h.277a.97.97 0 0 1 .97.97v.278a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h2.495a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h6.93a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h4.712a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97h-2.494a.97.97 0 0 1-.97-.97V42.13h-1.248a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 0-.97-.97h-1.247v1.247a.97.97 0 0 1-.97.97h-3.465v1.248a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 1-.97-.97V43.1a.97.97 0 0 1 .97-.97h1.247v-5.682a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97H27.58a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97V25.36a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97v-1.247Zm6.652 17.739v-1.247a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h1.247Zm4.435 2.217H41.16a.97.97 0 0 0 .97-.97v-1.247H38.666a.97.97 0 0 0-.97.97v1.247Zm4.434-2.217h1.248a.97.97 0 0 0 .97-.97v-6.929a.97.97 0 0 0-.97-.97h-4.712a.97.97 0 0 1-.97-.97v-1.248h-2.218v1.247a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 0-.97.97v2.495c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v2.494c0 .536.435.97.97.97h2.495a.97.97 0 0 1 .97.97v1.248Zm-6.652-11.087V27.58a.97.97 0 0 0-.97-.97h-2.494a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97H35.478Zm2.218 0h1.247a.97.97 0 0 0 .97-.97v-4.712a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 1 .97.97v.277c0 .536.435.97.97.97h.278a.97.97 0 0 1 .97.97v1.248h1.247a.97.97 0 0 0 .97-.97v-2.495a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 1 .97-.97h.277a.97.97 0 0 0 .97-.97v-.278a.97.97 0 0 0-.97-.97H43.1a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-.277a.97.97 0 0 1-.97-.97v-.277a.97.97 0 0 0-.97-.97h-.277a.97.97 0 0 0-.97.97v.277a.97.97 0 0 1-.97.97h-.278a.97.97 0 0 0-.97.97v1.248h1.247a.97.97 0 0 1 .97.97v5.682Zm-2.218-6.652h-1.247a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-1.247Zm8.87 4.435H43.1a.97.97 0 0 0-.97.97v.277c0 .536.435.97.97.97h.278a.97.97 0 0 0 .97-.97v-1.247Zm-31.044 0V24.39h-2.217v2.218h2.217Zm-2.217 0H4.435v1.247c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97v-1.247Zm-8.87 0H.97a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-1.247Zm0-6.653V18.71a.97.97 0 0 0-.97-.97H.97a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h1.247ZM17.74 17.74h1.247a.97.97 0 0 0 .97-.97v-3.465H18.71a.97.97 0 0 0-.97.97v3.465ZM32.014 0a.97.97 0 0 0-.97.97v13.582c0 .535.434.97.97.97H45.595a.97.97 0 0 0 .97-.97V.97a.97.97 0 0 0-.97-.97H32.014ZM2.217 3.188a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.146a.97.97 0 0 1-.97.97H3.188a.97.97 0 0 1-.97-.97V3.188Zm31.044 0a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.146a.97.97 0 0 1-.97.97H34.23a.97.97 0 0 1-.97-.97V3.188ZM5.405 4.434a.97.97 0 0 0-.97.97v4.712c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97V5.405a.97.97 0 0 0-.97-.97H5.405Zm31.043 0a.97.97 0 0 0-.97.97v4.712c0 .536.435.97.97.97h4.712a.97.97 0 0 0 .97-.97V5.405a.97.97 0 0 0-.97-.97H36.448Zm-4.434 13.304a.97.97 0 0 0-.97.97v.277c0 .536.434.97.97.97h.277a.97.97 0 0 0 .97-.97v-.277a.97.97 0 0 0-.97-.97h-.277ZM.97 31.044a.97.97 0 0 0-.97.97V45.595c0 .536.434.97.97.97h13.582a.97.97 0 0 0 .97-.97V32.014a.97.97 0 0 0-.97-.97H.97Zm1.247 3.187a.97.97 0 0 1 .97-.97h9.147a.97.97 0 0 1 .97.97v9.147a.97.97 0 0 1-.97.97H3.188a.97.97 0 0 1-.97-.97V34.23Zm3.188 1.247a.97.97 0 0 0-.97.97v4.712c0 .536.434.97.97.97h4.712a.97.97 0 0 0 .97-.97V36.448a.97.97 0 0 0-.97-.97H5.405Zm39.913 6.652a.97.97 0 0 0-.97.97v.278c0 .535.434.97.97.97h.277a.97.97 0 0 0 .97-.97V43.1a.97.97 0 0 0-.97-.97h-.277Z"
    />
    <defs>
      <linearGradient
        id="a"
        x1={23.283}
        x2={23.283}
        y1={0}
        y2={46.565}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#032782" />
        <stop offset={1} stopColor="#306CFE" />
      </linearGradient>
    </defs>
  </svg>
)

// Decorative loading indicator only — not a design-system component. No
// existing component in this codebase matches Figma's ring-of-fading-dots
// design (components/ui/spinner draws a continuous arc stroke instead, a
// different visual). 16 dots evenly spaced around a circle, each a fixed
// opacity fading from fully opaque to nearly transparent; the whole ring
// rotates as one rigid group via Tailwind's animate-spin, which reproduces
// the "chasing dots" look without animating each dot individually.
const DOT_COUNT = 16
const DotSpinner = ({ size = 56 }: { size?: number }) => {
  const dotSize = size * 0.125
  const radius = size / 2 - dotSize / 2
  return (
    <div
      className="relative animate-spin"
      style={{ width: size, height: size, animationDuration: "900ms" }}
    >
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (i / DOT_COUNT) * 2 * Math.PI
        const x = size / 2 + radius * Math.sin(angle) - dotSize / 2
        const y = size / 2 - radius * Math.cos(angle) - dotSize / 2
        const opacity = 1 - i / DOT_COUNT
        return (
          <span
            key={i}
            className="absolute rounded-full bg-primary-500"
            style={{
              width: dotSize,
              height: dotSize,
              left: x,
              top: y,
              opacity,
            }}
          />
        )
      })}
    </div>
  )
}

type DocumentTypeOption = {
  id: "passport" | "drivers_licence" | "residence_permit" | "birth_certificate"
  label: string
  Icon: typeof Passport
}

const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  { id: "passport", label: "Passport", Icon: Passport },
  { id: "drivers_licence", label: "Driver's License", Icon: CreditCardCheck },
  { id: "residence_permit", label: "Residence Permit", Icon: FileCheck02 },
  { id: "birth_certificate", label: "Birth Certificate", Icon: Certificate02 },
]

type FlowState =
  | "ideal"
  | "home-country-showcase"
  | "add-doc-showcase"
  | "scan"
  | "loading"
  | "back-scan"
  | "all-set"
  | "current-location-showcase"
  | "traveling-showcase"

export function IdentityVerificationFlow({
  open,
  onOpenChange,
  detectedLocation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detectedLocation: DetectedLocation
}) {
  const getIsMounted = useMountedState()
  const { toast } = useToast()
  const cameraHandler = useRef<WebCameraHandler>(null)
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentTypeOption | null>(null)
  const [issuingCountry, setIssuingCountry] = useState(
    detectedLocation.countryName
  )

  // UPDATE_LOCATION is defined on every state (not just the ones it's
  // reachable from in normal flow) so the travel-reminder toast's "Update"
  // button can jump straight to "current-location-showcase" regardless of
  // whatever screen this component's internal state was last left on.
  const [state, send] = useStateMachine<Record<FlowState, Record<string, FlowState>>>(
    "ideal",
    {
      ideal: {
        NEXT: "home-country-showcase",
        NO: "current-location-showcase",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "home-country-showcase": {
        NEXT: "add-doc-showcase",
        BACK: "ideal",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "add-doc-showcase": {
        NEXT: "scan",
        BACK: "home-country-showcase",
        UPDATE_LOCATION: "current-location-showcase",
      },
      scan: {
        BACK: "add-doc-showcase",
        NEXT: "loading",
        UPDATE_LOCATION: "current-location-showcase",
      },
      loading: {
        BACK: "scan",
        NEXT: "back-scan",
        UPDATE_LOCATION: "current-location-showcase",
      },
      // No auto-advance timer here, unlike scan/loading — this screen's
      // Retake/Continue buttons are explicit manual controls per Figma,
      // not an auto-capture step.
      "back-scan": {
        BACK: "loading",
        RETAKE: "scan",
        NEXT: "all-set",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "all-set": {
        UPDATE_LOCATION: "current-location-showcase",
      },
      "current-location-showcase": {
        BACK: "ideal",
        NEXT: "traveling-showcase",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "traveling-showcase": {
        BACK: "current-location-showcase",
        UPDATE_LOCATION: "current-location-showcase",
      },
    }
  )

  // Travel Mode confirmation is a top-right Notification toast (Figma node
  // 13101-46846), not a screen in the dialog flow — a separate, locally
  // controlled Toast instance rather than the shared useToast() queue, since
  // that queue renders through the app-wide Toaster's own dark, bottom-left
  // (on desktop) styling and can't be repositioned/restyled per call.
  const [travelModeNotificationOpen, setTravelModeNotificationOpen] =
    useState(false)
  const [travelDuration, setTravelDuration] = useState<TravelDuration | null>(
    null
  )

  // "Travel time elapsed" reminder Notification (Figma node 13101-46860),
  // shown once the user's selected duration is up. Real trigger is a
  // backend-scheduled job that doesn't exist yet — see
  // scheduleTravelModeReminderMock's header for why this is mocked with a
  // short fixed delay instead of the real duration.
  const [travelReminderOpen, setTravelReminderOpen] = useState(false)

  const activateTravelMode = () => {
    setTravelModeNotificationOpen(true)
    onOpenChange(false)
    scheduleTravelModeReminderMock(travelDuration, () => {
      if (getIsMounted()) {
        setTravelReminderOpen(true)
      }
    })
  }

  const handleCapture = async () => {
    const file = (await cameraHandler.current?.capture()) ?? null
    await submitIdentityDocument({
      documentType: selectedDocument?.id ?? "passport",
      capturedFile: file,
    })
    if (getIsMounted()) {
      send("NEXT")
    }
  }

  // Figma's scan screen has no capture button — the corner-bracket guide
  // and success alert imply auto-capture once the document is framed.
  // There's no real alignment detection to trigger off of, so this
  // approximates it with a fixed delay after entering the screen.
  useEffect(() => {
    if (state !== "scan") return
    const timer = setTimeout(() => {
      void handleCapture()
    }, 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Loading screen auto-advances once processing finishes — no source
  // gives a real duration, so this is a fixed delay standing in for it.
  useEffect(() => {
    if (state !== "loading") return
    const timer = setTimeout(() => send("NEXT"), 2000)
    return () => clearTimeout(timer)
  }, [state, send])

  const detectedLocationLabel = `${detectedLocation.city}, ${detectedLocation.region}, ${detectedLocation.countryName}`

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {state === "ideal" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="space-y-2 flex-auto">
              <h1 className="text-lg leading-none text-dark-blue-400">
                We detected your current location as:
              </h1>
              <p className="text-lg font-bold text-dark-blue-400">
                {detectedLocationLabel}
              </p>
            </div>

            <DialogClose asChild>
              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          {/* No real map integration exists yet (no maps API key/dependency
              anywhere in this app, and the backend only stores city/region
              as text, not coordinates) — labeled placeholder in its place,
              same size/position as the Figma map, swappable later. */}
          <div className="rounded-lg overflow-hidden relative mt-6 h-[170px] bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-500">
              Map preview unavailable
            </span>
          </div>

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold text-center text-dark-blue-400">
              Is this your home country?
            </h1>

            <div className="mt-6 flex items-center justify-center gap-x-3">
              <Button
                size="md"
                variant="outlined"
                visual="gray"
                onClick={() => send("NO")}
              >
                No, I&rsquo;m currently traveling
              </Button>
              <Button
                className="bg-primary-50 hover:bg-primary-500 hover:text-white"
                size="md"
                variant="ghost"
                onClick={() => send("NEXT")}
              >
                Yes, this is my home country
              </Button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-xs leading-none text-gray-500">
                Your data is encrypted and handled securely.{" "}
                <Link href="#" className="focus-visible:outline-none underline">
                  Learn More
                </Link>
              </span>
            </div>
          </div>
        </DialogContent>
      )}

      {state === "home-country-showcase" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Please confirm your home country
              </h1>
            </div>

            <DialogClose asChild>
              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="mt-8">
            <div className="space-y-1.5">
              <Label size="sm" className="text-dark-blue-400">
                Issuing country
              </Label>
              <CountriesCombobox
                value={issuingCountry}
                onValueChange={setIssuingCountry}
                placeholder="Select country"
                // justify-between was pushing the flag and text apart —
                // the shared component's chevron icon is always
                // display:none by default (its group-data-[state=open]
                // class never applies, since the trigger isn't wrapped in
                // a `group`), so with only the flag+text left as flex
                // children, space-between shoved them to opposite edges.
                // Default (flex-start) keeps them together with the
                // Figma-specified 12px gap instead.
                triggerClassName="w-full h-11 bg-white border-solid border-gray-300 shadow-xs rounded-[5px] pl-[14px] pr-3 py-2.5 gap-3"
                contentClassName="w-[var(--radix-popover-trigger-width)]"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-sm text-dark-blue-400 font-semibold">
                Accepted Documents
              </h3>

              <div className="mt-3 space-y-2.5">
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedDocument(option)
                      send("NEXT")
                    }}
                    className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
                  >
                    <div className="inline-flex items-center gap-x-3">
                      <option.Icon className="size-5 shrink-0 text-primary-500" />{" "}
                      <span className="text-sm font-medium text-dark-blue-400">
                        {option.label}
                      </span>
                    </div>

                    <ChevronRight className="size-5 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      )}

      {state === "add-doc-showcase" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                How would you like to add your document?
              </h1>
            </div>

            <DialogClose asChild>
              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="mt-8">
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between rounded-lg border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]"
            >
              <div className="flex items-center gap-x-3">
                <Webcam02 className="size-5 text-primary-500" />
                <h1 className="text-sm leading-none font-medium text-dark-blue-400">
                  Take a photo with your webcam
                </h1>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>

            <div className="mt-6 flex gap-x-3 items-center">
              <span className="h-px inline-block flex-1 bg-gray-200" />
              <span className="text-xs leading-5 font-medium text-gray-500">
                Or
              </span>
              <span className="h-px inline-block flex-1 bg-gray-200" />
            </div>

            {/* QR mobile hand-off is decorative only, matching Storybook
                exactly — no onClick, since no real mobile-pairing session
                exists to power it yet. */}
            <div className="mt-6">
              <div className="p-3 pl-[18px] flex items-center gap-x-3 rounded-lg bg-white border border-gray-200 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                <QR className="shrink-0" />

                <div className="space-y-0.5">
                  <h1 className="text-sm leading-none font-medium text-dark-blue-400">
                    Scan with your mobile device
                  </h1>
                  <p className="text-xs font-light text-dark-blue-400">
                    Scan the QR code to use the camera on you mobile device
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      )}

      {state === "scan" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-center justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Scan your {selectedDocument?.label ?? "Passport"}
              </h1>
            </div>

            <div className="flex items-center gap-x-7">
              <Button className="underline underline-offset-4" variant="link">
                How to Scan
              </Button>
              <DialogClose asChild>
                <IconButton
                  className="text-gray-500/50 hover:text-gray-500"
                  size="md"
                  visual="gray"
                  variant="ghost"
                >
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden mt-3 border border-gray-200 h-[373px] bg-gray-900">
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 8, objectFit: "cover" }}
              captureMode="back"
              ref={cameraHandler}
              onError={() =>
                toast({
                  title: "Camera unavailable",
                  description:
                    "Check camera permissions for this site and try again.",
                  variant: "destructive",
                })
              }
            />

            {/* Machine-readable-zone viewfinder guide. Figma's reference
                positions this against a static passport photo asset that
                doesn't exist in this codebase; against a live camera feed
                there's no fixed document to align pixel-for-pixel to, so
                this is a proportionally-placed approximation of the same
                corner-bracket guide (306x43px, centered near the bottom),
                not a literal copy of Figma's absolute coordinates. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-[22px] mx-auto h-[43px] w-[306px] rounded-[4px] bg-success-500/20 shadow-[1px_4px_4px_rgba(0,0,0,0.25)]">
              <span className="absolute left-0 top-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 top-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute left-0 bottom-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 bottom-0 size-3 rounded-[4px] border-[3px] border-success-500" />
            </div>
          </div>

          <Alert variant="success" className="rounded-[5px] mt-3">
            <AlertIcon>
              <Camera className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle className="text-success-600">
                Scan the front of your {selectedDocument?.label ?? "passport"}.
              </AlertTitle>
            </AlertContent>
          </Alert>
        </DialogContent>
      )}

      {state === "loading" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-center justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Scan your {selectedDocument?.label ?? "Passport"}
              </h1>
            </div>

            <div className="flex items-center gap-x-7">
              <Button className="underline underline-offset-4" variant="link">
                How to Scan
              </Button>
              <DialogClose asChild>
                <IconButton
                  className="text-gray-500/50 hover:text-gray-500"
                  size="md"
                  visual="gray"
                  variant="ghost"
                >
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden mt-3 border border-gray-200 h-[373px] bg-gray-900">
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 8, objectFit: "cover" }}
              captureMode="back"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-[22px] mx-auto h-[43px] w-[306px] rounded-[4px] bg-success-500/20 shadow-[1px_4px_4px_rgba(0,0,0,0.25)]">
              <span className="absolute left-0 top-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 top-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute left-0 bottom-0 size-3 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 bottom-0 size-3 rounded-[4px] border-[3px] border-success-500" />
            </div>

            {/* Frosted processing overlay — Figma's Rectangle 256
                (bg-white/50, backdrop-blur). Value rounded from Figma's
                10.35px to the nearest whole pixel; Tailwind has no
                fractional-pixel blur utility. */}
            <div className="absolute inset-0 rounded-lg bg-white/50 backdrop-blur-[10px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-y-4">
                <DotSpinner size={56} />
                <p className="w-[246px] text-lg font-medium text-center text-gray-700">
                  Processing your document...
                </p>
              </div>
            </div>
          </div>

          <Alert variant="success" className="rounded-[5px] mt-3">
            <AlertIcon>
              <Camera className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle className="text-success-600">
                Scan the front of your {selectedDocument?.label ?? "passport"}.
              </AlertTitle>
            </AlertContent>
          </Alert>
        </DialogContent>
      )}

      {state === "back-scan" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-center justify-between gap-x-3">
            <div className="flex items-center gap-x-3 flex-auto">
              <IconButton
                size="md"
                visual="gray"
                variant="ghost"
                onClick={() => send("BACK")}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h1 className="text-lg leading-none text-dark-blue-400">
                Scan the back of your {selectedDocument?.label ?? "Passport"}
              </h1>
            </div>

            <div className="flex items-center gap-x-7">
              <Button className="underline underline-offset-4" variant="link">
                How to Scan
              </Button>
              <DialogClose asChild>
                <IconButton
                  className="text-gray-500/50 hover:text-gray-500"
                  size="md"
                  visual="gray"
                  variant="ghost"
                >
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden mt-3 border border-gray-200 h-[373px] bg-gray-900">
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 8, objectFit: "cover" }}
              captureMode="back"
            />

            {/* Wider guide covering the whole back-page area, proportioned
                from Figma's 247x62 box (~41%x17%) positioned in the upper
                third — this pass's own proportional placement, same
                reasoning as the front-scan guide (no fixed document to
                match Figma's absolute static-photo coordinates to). */}
            <div className="pointer-events-none absolute left-1/2 top-[26%] -translate-x-1/2 h-[62px] w-[247px] rounded-[4px] bg-success-500/25 shadow-[1px_4px_4px_rgba(0,0,0,0.25)]">
              <span className="absolute left-0 top-0 size-4 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 top-0 size-4 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute left-0 bottom-0 size-4 rounded-[4px] border-[3px] border-success-500" />
              <span className="absolute right-0 bottom-0 size-4 rounded-[4px] border-[3px] border-success-500" />
            </div>

            {/* Success badge, centered in the whole camera box. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-success-500">
              <Check className="size-5 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-x-3 mt-3">
            <Button
              variant="outlined"
              visual="gray"
              onClick={() => send("RETAKE")}
            >
              <RefreshCw className="size-[15px]" />
              Retake
            </Button>
            <Button onClick={() => send("NEXT")}>Continue</Button>
          </div>
        </DialogContent>
      )}

      {state === "all-set" && (
        <DialogContent className="max-w-[456px] pt-[50px]">
          <div className="flex items-center justify-center">
            <div className="size-12 rounded-full inline-flex items-center justify-center bg-success-100 border-[8px] border-success-50">
              <CheckCircle className="size-6" />
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-lg text-center font-semibold leading-7 text-dark-blue-400">
              You&rsquo;re all set!
            </h1>

            <p className="mt-2 text-sm text-dark-blue-400 text-center">
              Your identity and location have been successfully verified. You
              can now access all platform features.
            </p>

            <div className="mt-[50px] grid">
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        </DialogContent>
      )}

      {state === "current-location-showcase" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between">
            <IconButton
              size="md"
              visual="gray"
              variant="ghost"
              onClick={() => send("BACK")}
            >
              <ArrowLeft className="size-5" />
            </IconButton>

            <DialogClose asChild>
              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="mt-3">
            <h1 className="text-lg font-medium text-dark-blue-400">
              Tell us more about you current location
            </h1>
            <p className="mt-1 font-light text-dark-blue-400 max-w-[460px]">
              This helps us confirm if you&rsquo;re changing your home country or
              just on a short trip.
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
            >
              <div className="inline-flex items-center gap-x-3">
                <Luggage02 className="size-5 shrink-0 text-primary-500" />{" "}
                <span className="text-sm font-medium text-dark-blue-400">
                  Temporarily traveling
                </span>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>
            <button
              onClick={() => send("NEXT")}
              className="p-3 h-[56px] w-full focus-visible:outline-none hover:border-gray-300 hover:ring-1 hover:ring-gray-300 pl-[18px] flex items-center justify-between bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] border border-gray-200 rounded-lg"
            >
              <div className="inline-flex items-center gap-x-3">
                <Home03 className="size-5 shrink-0 text-primary-500" />{" "}
                <span className="text-sm font-medium text-dark-blue-400">
                  Permanently relocated
                </span>
              </div>

              <ChevronRight className="size-5 text-gray-500" />
            </button>
          </div>
        </DialogContent>
      )}

      {state === "traveling-showcase" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between">
            <IconButton
              size="md"
              visual="gray"
              variant="ghost"
              onClick={() => send("BACK")}
            >
              <ArrowLeft className="size-5" />
            </IconButton>

            <DialogClose asChild>
              <IconButton
                className="text-gray-500/50 hover:text-gray-500"
                size="md"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <div className="mt-3 max-w-[554px]">
            <h1 className="text-lg font-medium text-dark-blue-400">
              How long are you traveling?
            </h1>
            <p className="mt-1 font-light text-dark-blue-400">
              You&rsquo;re marked as temporarily traveling. Some features may be
              limited until you are back in your home country.
            </p>
          </div>

          <RadioGroup
            className="mt-6 space-y-2.5"
            value={travelDuration ?? undefined}
            onValueChange={(value) =>
              setTravelDuration(value as TravelDuration)
            }
          >
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="A few days" id="item-1" />{" "}
              <Label id="item-1">A few days</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="1–2 weeks" id="item-2" />{" "}
              <Label id="item-2">1–2 weeks</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="More than 2 weeks" id="item-3" />{" "}
              <Label id="item-3">More than 2 weeks</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="Not sure" id="item-4" />{" "}
              <Label id="item-4">Not sure</Label>
            </div>
          </RadioGroup>

          <Alert className="mt-6">
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                We&rsquo;ll remind you later to check if your status has changed.
              </AlertTitle>
            </AlertContent>
          </Alert>

          <div className="grid grid-cols-2 gap-x-3 mt-6">
            <Button variant="outlined" visual="gray" onClick={activateTravelMode}>
              Skip
            </Button>
            <Button onClick={activateTravelMode}>Confirm</Button>
          </div>
        </DialogContent>
      )}
    </Dialog>

      <ToastProvider duration={5000} swipeDirection="right">
        <Toast
          open={travelModeNotificationOpen}
          onOpenChange={setTravelModeNotificationOpen}
          className="relative w-[400px] max-w-full items-start gap-4 space-x-0 rounded-xl border border-gray-100 bg-white p-4 text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)] data-[state=open]:sm:slide-in-from-top-full"
        >
          <div className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
            <Plane className="size-[24.75px] text-primary-500" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <ToastTitle className="text-sm font-semibold leading-5 text-gray-900">
              Travel mode is on.
            </ToastTitle>
            <ToastDescription className="text-sm font-normal leading-5 text-gray-600">
              You can continue using the platform while away from your home
              country.
            </ToastDescription>
          </div>

          <IconButton
            className="absolute right-2 top-2 text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
            onClick={() => setTravelModeNotificationOpen(false)}
          >
            <X className="size-5" />
          </IconButton>
        </Toast>

        <Toast
          open={travelReminderOpen}
          onOpenChange={setTravelReminderOpen}
          className="relative w-[400px] max-w-full items-start gap-4 space-x-0 rounded-xl border border-gray-100 bg-white p-4 text-gray-900 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)] data-[state=open]:sm:slide-in-from-top-full"
        >
          <div className="flex size-[66px] shrink-0 items-center justify-center rounded-full border-[9.9px] border-primary-25 bg-primary-50">
            <Plane className="size-[24.75px] text-primary-500" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4 pt-0.5">
            <div className="flex flex-col gap-1">
              <ToastTitle className="text-sm font-semibold leading-5 text-gray-900">
                You are in Travel Mode
              </ToastTitle>
              <ToastDescription className="text-sm font-normal leading-5 text-gray-600">
                Update your status if your location changes
              </ToastDescription>
            </div>

            <Button
              variant="link"
              className="h-5 justify-start p-0 text-sm font-semibold leading-5"
              onClick={() => {
                setTravelReminderOpen(false)
                send("UPDATE_LOCATION")
                onOpenChange(true)
              }}
            >
              Update
            </Button>
          </div>

          <IconButton
            className="absolute right-2 top-2 text-gray-500"
            size="md"
            visual="gray"
            variant="ghost"
            onClick={() => setTravelReminderOpen(false)}
          >
            <X className="size-5" />
          </IconButton>
        </Toast>

        <ToastViewport className="top-5 right-5 left-auto bottom-auto w-auto max-w-[400px] flex-col gap-3 p-0 sm:top-5 sm:right-5 sm:left-auto sm:bottom-auto sm:flex-col md:max-w-[400px]" />
      </ToastProvider>
    </>
  )
}
