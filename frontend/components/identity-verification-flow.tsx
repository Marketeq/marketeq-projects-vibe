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
// Front/back document images are uploaded for real, straight to R2, via
// the identity-verification-service's presigned-upload-URL endpoint (see
// src/lib/api/submit-identity-document.ts). What is NOT wired yet: the
// real submitDocument/document-check/begin-biometric-verification calls.
// This used to be a hard blocker (that DTO required documentNumber/
// expirationDate, which no screen here collects) — the backend now makes
// both optional for captureMethod=scan and backfills them from Didit's own
// OCR/MRZ extraction instead, so wiring the real submission is no longer
// blocked on missing fields. It is simply not done in this pass: no
// IdentityDocument row exists to track these images at all yet (and the
// old submitDocument endpoint that would create one is separately blocked
// server-side by its document-coverage gate, a backend-side decision this
// UI-only pass does not touch).
//
// Third screen added for the Figma face-verification handoff (node
// 13101-47597): "all-set" now advances (rather than closing) into
// "face-verification-handoff", whose "Begin verifying" action is wired to
// the caller-supplied onBeginVerifying prop plus a caller-supplied
// verificationContext, not to a fetch call made here — this pass is
// UI-only. That button is disabled unless BOTH are present, which no real
// caller supplies today (see VerificationContext's own comment): wiring
// the create-document step is a separate, not-yet-made decision, same
// boundary as the paragraph above.
// No notification or resume mechanism exists for the upload step either,
// so its copy makes no promise of one ("we'll let you know..." was removed
// for exactly that reason — state only what happened). Overall
// identity-verification-status is still backed by a temporary, isolated
// mock — see that mock file's own header for why. Detected location is a
// real backend integration (identity-verification-service +
// location-service, both via api-gateway — see detected-location.ts's
// header for the split and why).

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useMountedState } from "react-use"
import type { Map as LeafletMap } from "leaflet"
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
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
import { cn } from "@/utils/functions"
import {
  useDocumentPresenceDetector,
  type GuideBoxRect,
} from "@/utils/useDocumentPresenceDetector"
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
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/own-combobox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner/spinner"
import { useStateMachine } from "@/utils/hooks"
import type { DetectedLocation } from "@/src/lib/api/detected-location"
import { submitIdentityDocument } from "@/src/lib/api/submit-identity-document"
import { handleHomeCountryYes as runHomeCountryYes } from "@/src/lib/api/free-kyc"
import {
  openDiditOverlay,
  subscribeDiditOverlay,
} from "@/src/lib/api/didit-overlay"
import {
  recordTravelClassification,
  recordTravelDuration,
  SKIPPED_TRAVEL_DURATION_LABEL,
  type TravelModeDeps,
} from "@/src/lib/api/travel-mode-backend"
import { type TravelDuration } from "@/src/lib/api/travel-mode-reminder"
import {
  getAcceptedDocuments,
  type AcceptedDocumentTypeId,
} from "@/src/lib/api/accepted-documents"
import {
  getSupportedDocumentCountries,
  type SupportedDocumentCountry,
} from "@/src/lib/api/supported-document-countries"

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

// Renders the account's approximate detected location on a real, interactive
// map — Leaflet, tiled by LocationIQ (the provider already used elsewhere in
// this codebase, via location-service's reverse-geocode call — reusing it
// here instead of introducing a second, unrelated map provider). Coordinates
// are IP-derived and approximate (city-level, from location-service — see
// detected-location.ts's header for why identity-verification-service isn't
// the source of these). Deliberately never uses the browser Geolocation
// API: that would need browser permission for precise device location,
// which Technical Architecture §11 explicitly scopes out for this flow
// ("country-level resolution only, not precise/coordinate-based"). Zoom is 12
// to match the Figma map; the coordinates are still IP-derived, so the pin
// marks the approximate area, not an address.
//
// LOCATIONIQ_TILES_KEY is intentionally a *different* key from the
// LOCATIONIQ_API_KEY location-service's reverse-geocode call uses
// server-side. This one is embedded directly in tile request URLs the
// browser makes, so it must be a separate, HTTP-Referrer-restricted access
// token generated for that purpose (LocationIQ's own recommended pattern —
// docs.locationiq.com/docs/maps) — never the backend's unrestricted key.
//
// Attribution is mandatory on every tile view (LocationIQ's commercial-use
// terms require a link back on the free plan; OpenStreetMap's data license
// separately requires its own credit). Leaflet's in-map attribution control
// is turned off to match the Figma map, and the same credit is rendered as a
// compact overlay in the map's bottom-right corner instead — never removed.
const LEAFLET_VERSION = "1.9.4" // pinned to the installed leaflet package.json version

// Red location pin (Figma, all-layers CSS) — 20.91×30 box, #EA4335 body with an
// 8px #B01D1D dot at (6.45, 6.45). Drawn as an inline SVG divIcon so no remote
// marker image is needed. Figma centres the box on the map centre
// (left: calc(50% - w/2 + 0.45px), top: calc(50% - h/2)), so the icon anchor is
// the box's own centre offset by that 0.45px, not the tip.
const LOCATION_PIN_WIDTH = 20.91
const LOCATION_PIN_HEIGHT = 30
const LOCATION_PIN_HTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20.91" height="30" viewBox="0 0 20.91 30" fill="none"><path d="M10.455 0C4.681 0 0 4.681 0 10.455c0 7.841 10.455 19.545 10.455 19.545S20.91 18.296 20.91 10.455C20.91 4.681 16.229 0 10.455 0Z" fill="#EA4335"/><circle cx="10.451" cy="10.45" r="4" fill="#B01D1D"/></svg>'

let leafletCssInjected = false
function ensureLeafletCss() {
  if (leafletCssInjected || typeof document === "undefined") return
  leafletCssInjected = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`
  document.head.appendChild(link)
}

type LocationMapState =
  | "loading"
  | "ready"
  | "error"
  | "no-key"
  | "no-location"
  | "service-unavailable"

const DetectedLocationMap = ({
  latitude,
  longitude,
  serviceUnavailable,
}: {
  latitude: number | null
  longitude: number | null
  serviceUnavailable: boolean
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const [state, setState] = useState<LocationMapState>("loading")

  useEffect(() => {
    if (serviceUnavailable) {
      setState("service-unavailable")
      return
    }

    if (latitude == null || longitude == null) {
      setState("no-location")
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_TILES_KEY
    if (!apiKey) {
      setState("no-key")
      return
    }

    let cancelled = false
    setState("loading")
    ensureLeafletCss()

    import("leaflet")
      .then((L) => {
        if (cancelled || !containerRef.current) return

        mapRef.current?.remove()
        const map = L.map(containerRef.current, {
          center: [latitude, longitude],
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
        })
        mapRef.current = map

        // {s} = tile subdomain (a/b/c), lets the browser parallelize tile
        // fetches past the per-domain connection limit — LocationIQ's own
        // documented pattern (docs.locationiq.com/docs/maps).
        const tileUrl = `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${apiKey}`
        L.tileLayer(tileUrl, {
          subdomains: "abc",
          maxZoom: 20,
        }).addTo(map)

        L.marker([latitude, longitude], {
          icon: L.divIcon({
            html: LOCATION_PIN_HTML,
            className: "",
            iconSize: [LOCATION_PIN_WIDTH, LOCATION_PIN_HEIGHT],
            iconAnchor: [
              LOCATION_PIN_WIDTH / 2 - 0.45,
              LOCATION_PIN_HEIGHT / 2,
            ],
          }),
        }).addTo(map)

        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [latitude, longitude, serviceUnavailable])

  return (
    <div className="mt-6">
      <div className="rounded-lg overflow-hidden relative h-[170px] bg-gray-100">
        {/* Figma "Map Image": oversized -11% / -11.67% and clipped by the frame */}
        <div
          ref={containerRef}
          className="absolute -left-[11%] -right-[11%] -top-[11.67%] -bottom-[11.67%]"
        />
        {state !== "ready" && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-gray-100 px-4">
            {state === "loading" && <DotSpinner size={28} />}
            {state === "service-unavailable" && (
              <span className="text-xs text-center text-gray-500">
                Location service temporarily unavailable.
              </span>
            )}
            {state === "no-location" && (
              <span className="text-xs text-center text-gray-500">
                We couldn&rsquo;t detect your location
              </span>
            )}
            {state === "no-key" && (
              <span className="text-xs text-center text-gray-500">
                Map unavailable — LocationIQ tiles key not configured
              </span>
            )}
            {state === "error" && (
              <span className="text-xs text-center text-gray-500">
                Map failed to load
              </span>
            )}
          </div>
        )}
        {state === "ready" && (
          <p className="absolute bottom-0 right-0 z-[1000] rounded-tl bg-white/80 px-1 py-0 text-[8px] leading-[10px] text-gray-700">
            <a
              href="https://locationiq.com/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Search by LocationIQ.com
            </a>{" "}
            | ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OpenStreetMap
            </a>{" "}
            contributors
          </p>
        )}
      </div>
    </div>
  )
}

const HOW_TO_SCAN_TIPS = [
  "Use a well-lit space (avoid shadows or glare)",
  "Place your document on a dark, flat surface",
  "Hold your camera steady",
  "Ensure all edges and text are visible",
  "Avoid using flash directly on the document",
]

// Figma's "Tooltip/True/Dark/Bottom center" — centered over the camera
// preview box itself (its own absolute-position CSS resolves to the exact
// center of a 602x373 box, not the whole dialog), not anchored to the "How
// to Scan" link with a pointer/arrow. Toggled by clicking that link; reset
// closed on every screen change so it doesn't carry over from scan into
// loading/back-scan on the auto-advance timers.
const HowToScanTooltip = () => (
  <div className="pointer-events-none absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]">
    <div className="flex flex-col gap-1 rounded-[5px] bg-gray-900 p-3">
      <p className="text-xs font-semibold leading-[18px] text-white">
        Tips for a clear scan
      </p>
      <ul className="space-y-0">
        {HOW_TO_SCAN_TIPS.map((tip) => (
          <li
            key={tip}
            className="flex gap-1.5 text-xs font-normal leading-[18px] text-white"
          >
            <span>&bull;</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
)

// Camera box is a fixed 602x373 (WebCamera's own `style` prop, both
// scan/back-scan screens) — guide-box rects below are in that same
// coordinate space, matching each screen's corner-bracket guide div's
// Tailwind classes exactly (kept in sync by hand; Tailwind classes can't be
// read back at runtime). Used by useDocumentPresenceDetector to know which
// region of the live video to sample.
const CAMERA_BOX_WIDTH = 602
const CAMERA_BOX_HEIGHT = 373

// Matches the front-scan guide: inset-x-0 mx-auto bottom-[22px] h-[43px] w-[306px]
const SCAN_GUIDE_BOX: GuideBoxRect = {
  left: (CAMERA_BOX_WIDTH - 306) / 2,
  top: CAMERA_BOX_HEIGHT - 22 - 43,
  width: 306,
  height: 43,
}

// Matches the back-scan guide: left-1/2 -translate-x-1/2 top-[26%] h-[62px] w-[247px]
const BACK_SCAN_GUIDE_BOX: GuideBoxRect = {
  left: (CAMERA_BOX_WIDTH - 247) / 2,
  top: CAMERA_BOX_HEIGHT * 0.26,
  width: 247,
  height: 62,
}

// Figma's "No ID on screen" state (node 18021-2310) reuses the same dark
// "Tooltip/True/Dark" box as the How-to-Scan tooltip, title-only (Figma's
// supporting-text row is display:none) — 228x42, centered in the camera box.
// Shown only while useDocumentPresenceDetector reports "no-document";
// camera-loading/permission-denied/detection-unavailable are deliberately
// NOT this same copy (Chris's feedback: don't label those "no document
// detected").
// Figma's frame is sized "Hug" on both axes (228x42 is just the resulting
// size for "Place your ID in front of the camera", not a fixed box) — it
// grows to fit the text on one line rather than wrapping. Longer labels
// (Driver's License, Residence Permit, Birth Certificate) need the same
// auto-width behavior or they'd wrap inside a fixed-width box and overflow
// the fixed height. An absolutely-positioned element with no explicit
// width/height shrink-wraps its content by default, matching Figma's Hug.
const NoDocumentOverlay = ({ label }: { label: string }) => (
  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[5px] bg-gray-900 p-3">
    <p className="whitespace-nowrap text-xs font-semibold leading-[18px] text-white">
      Place your {label} in front of the camera
    </p>
  </div>
)

// Presentation only: label + icon per canonical document type id. Which of
// these are shown for a country is decided entirely by the backend's
// accepted-documents answer (see the fetch below) — never by this list.
// Birth Certificate deliberately removed (Identity Verification Decision
// Record §1.1/§3): Didit's document catalogue has no Birth Certificate
// type at all, so it can never be a real accepted-documents answer for any
// country. "Identification Card" is the approved label for the single
// backend `id_card` type (README §6: National ID / Local ID retired).
type DocumentTypeOption = {
  id: AcceptedDocumentTypeId
  label: string
  Icon: typeof Passport
}

const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  { id: "passport", label: "Passport", Icon: Passport },
  { id: "id_card", label: "Identification Card", Icon: CreditCardCheck },
  { id: "drivers_licence", label: "Driver's License", Icon: CreditCardCheck },
  { id: "residence_permit", label: "Residence Permit", Icon: FileCheck02 },
]

type FlowState =
  | "ideal"
  | "home-country-showcase"
  | "add-doc-showcase"
  | "scan"
  | "loading"
  | "back-scan"
  | "all-set"
  | "face-verification-handoff"
  | "current-location-showcase"
  | "traveling-showcase"
  | "travel-mode"

// The face-verification-handoff screen's "Begin verifying" action needs a
// real IdentityDocument id before it means anything. Nothing in this
// component ever produces one itself (see submit-identity-document.ts's
// header and this service's own coverage-provider gate — both still-open
// backend blockers this UI-only work does not resolve) — a real caller
// supplies it once that chain exists, and a dev preview wrapper can supply
// an in-memory simulated one of its own. Either way this is a plain prop,
// never internal state, and never anything read from browser storage.
export interface VerificationContext {
  documentId: string
}

export function IdentityVerificationFlow({
  open,
  onOpenChange,
  detectedLocation,
  verificationContext,
  onBeginVerifying,
  initialState,
  activeTravelModeUpdate,
  onTravelModeConfirmed,
  onPermanentlyRelocated,
  simulateUploadForPreview,
  simulateFreeKycForPreview,
  onSimulatedFreeKycStart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  detectedLocation: DetectedLocation
  // See VerificationContext's own comment. `null`/undefined (the real
  // app's state today) means "Begin verifying" stays disabled.
  verificationContext?: VerificationContext | null
  // Explicit hand-off point for the face-verification handoff screen's
  // "Begin verifying" action. Deliberately NOT an API call made from
  // inside this component — this pass is UI-only. Only ever invoked when
  // both this callback AND a real verificationContext are present — never
  // with a missing or invented documentId.
  onBeginVerifying?: (context: VerificationContext) => void
  // Lets a caller reach a specific screen directly instead of clicking through
  // the whole flow: the dev preview route (app/identity-verification-preview/)
  // and the dashboard's Travel Mode popup, whose Update action starts at
  // "current-location-showcase" (talent-dashboard/page.tsx). Optional and
  // defaulted to "ideal" — every other caller (account-verification-gate.tsx)
  // omits this entirely, so their starting state, guards (VpnProxyCheckGuard-gated
  // connection-check, etc.) and API behavior are byte-for-byte unchanged.
  // Only read once, on mount — a caller that needs a different starting
  // screen after the first render must remount (e.g. via a changing
  // `key`), not rely on this prop updating live.
  initialState?: FlowState
  // True only when the dashboard opened this flow from the Travel Mode popup's
  // day-3 / day-7 reminder while Travel Mode is STILL in force. Choosing
  // "Temporarily traveling" then changes nothing (the period keeps its duration
  // and activation), so it skips the duration screen, makes no API call and
  // closes with the existing "Travel mode is on." confirmation. Every other entry
  // (first-time, or an expired Travel Mode) leaves it unset and behaves exactly
  // as before, including the duration screen.
  activeTravelModeUpdate?: boolean
  // Called once when `activeTravelModeUpdate` is set and the user chooses "Temporarily
  // traveling" (the already-active traveler's confirmation). Never called for a first-time
  // activation, "Permanently relocated", closing or going back. Optional: callers that omit
  // it behave exactly as before (PMCM-651: the dashboard records the confirmation).
  onTravelModeConfirmed?: () => void
  // Called once when "Permanently relocated" is chosen, before the flow moves on, so the
  // caller can refresh `detectedLocation` (the dashboard's Update uses it to run browser
  // detection). The flow waits for it, then continues to the screen that shows the location.
  // Optional: callers that omit it (Verify My Account, the preview) behave exactly as before.
  onPermanentlyRelocated?: () => Promise<void>
  // Development preview only (app/identity-verification-preview/): skips the
  // real presigned-URL + R2 upload in handleCapture so every screen can be
  // walked through without storage credentials. Defaults to off and is
  // additionally gated on NODE_ENV === "development" below, so it can never
  // take effect in a production build even if a caller passes it.
  simulateUploadForPreview?: boolean
  // Development preview only (app/identity-verification-preview/): makes
  // "Yes, this is my home country" run the supplied stub instead of the real
  // confirmation + Free KYC session. Gated on NODE_ENV === "development"
  // below, off by default, and never passed by any real caller — the
  // authenticated /talent-dashboard path always performs the real calls.
  simulateFreeKycForPreview?: boolean
  onSimulatedFreeKycStart?: () => void
}) {
  const getIsMounted = useMountedState()
  const simulateUpload =
    simulateUploadForPreview === true && process.env.NODE_ENV === "development"
  const { toast } = useToast()
  const cameraHandler = useRef<WebCameraHandler>(null)
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentTypeOption | null>(null)
  // The issuing country is held as its ISO alpha-2 code (what the backend's
  // accepted-documents route takes), chosen from the backend's own
  // supported-document-countries list. It starts at the detected country's
  // code and is only honoured once that code is actually in the loaded list.
  const [issuingCountryCode, setIssuingCountryCode] = useState<string | null>(
    detectedLocation.countryCode || null
  )

  type SupportedCountriesStatus = "loading" | "ready" | "error"
  const [supportedCountriesStatus, setSupportedCountriesStatus] =
    useState<SupportedCountriesStatus>("loading")
  const [supportedCountries, setSupportedCountries] = useState<
    SupportedDocumentCountry[]
  >([])
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)

  const selectedIssuingCountry =
    supportedCountries.find(
      (country) => country.alpha2 === issuingCountryCode
    ) ?? null

  // issuingCountry is deliberately its own concept, separate from
  // detectedLocation (approximate, IP-based), verifiedHomeCountry
  // (confirmed residence), and identityVerificationStatus — it only
  // describes which country issued the document about to be submitted.
  // Changing it invalidates whatever document type was picked for the
  // previous country (and anything captured against it); this screen is
  // the only place issuingCountry can change, so there's nothing further
  // downstream to unwind yet.
  const handleIssuingCountryChange = (alpha2: string) => {
    setIssuingCountryCode(alpha2)
    setSelectedDocument(null)
    setFrontImageReference(null)
    setBackImageReference(null)
  }

  type AcceptedDocumentsStatus = "idle" | "loading" | "ready" | "empty" | "error"
  const [acceptedDocumentsStatus, setAcceptedDocumentsStatus] =
    useState<AcceptedDocumentsStatus>("idle")
  const [acceptedDocumentTypeIds, setAcceptedDocumentTypeIds] = useState<
    AcceptedDocumentTypeId[]
  >([])

  // Fetch the accepted document types for the selected country. The
  // `cancelled` flag guards against a response for a country the user has
  // since navigated away from overwriting a newer request's result.
  const selectedIssuingCountryCode = selectedIssuingCountry?.alpha2 ?? null
  useEffect(() => {
    if (!selectedIssuingCountryCode) {
      setAcceptedDocumentsStatus("idle")
      setAcceptedDocumentTypeIds([])
      return
    }

    let cancelled = false
    setAcceptedDocumentsStatus("loading")
    setAcceptedDocumentTypeIds([])

    getAcceptedDocuments(selectedIssuingCountryCode).then((result) => {
      if (cancelled) return
      if (result.unavailable) {
        setAcceptedDocumentsStatus("error")
        setAcceptedDocumentTypeIds([])
        return
      }
      setAcceptedDocumentTypeIds(result.acceptedDocumentTypes)
      setAcceptedDocumentsStatus(
        result.acceptedDocumentTypes.length === 0 ? "empty" : "ready"
      )
    })

    return () => {
      cancelled = true
    }
  }, [selectedIssuingCountryCode])

  const visibleDocumentOptions = DOCUMENT_TYPE_OPTIONS.filter((option) =>
    acceptedDocumentTypeIds.includes(option.id)
  )

  // UPDATE_LOCATION is defined on every state (not just the ones it's
  // reachable from in normal flow) so the travel-reminder toast's "Update"
  // button can jump straight to "current-location-showcase" regardless of
  // whatever screen this component's internal state was last left on.
  const [state, send] = useStateMachine<Record<FlowState, Record<string, FlowState>>>(
    initialState ?? "ideal",
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
        NEXT: "face-verification-handoff",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "face-verification-handoff": {
        BACK: "all-set",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "current-location-showcase": {
        BACK: "ideal",
        NEXT: "traveling-showcase",
        // "Permanently relocated" re-enters location verification from the
        // top (re-confirm home country) rather than asking a trip
        // duration, which only makes sense for "Temporarily traveling".
        RELOCATED: "ideal",
        UPDATE_LOCATION: "current-location-showcase",
      },
      "traveling-showcase": {
        BACK: "current-location-showcase",
        // Reached only once the duration (or Skip) was saved.
        NEXT: "travel-mode",
        UPDATE_LOCATION: "current-location-showcase",
      },
      // "Travel Mode is now active!" — no BACK: the activation is saved, and
      // going back would offer a second duration the backend refuses.
      "travel-mode": {
        UPDATE_LOCATION: "current-location-showcase",
      },
    }
  )

  // Load the supported-country list the first time the country screen is
  // reached (not on every dashboard visit that never opens this flow).
  const countriesRequestedRef = useRef(false)
  const isCountryScreen = state === "home-country-showcase"
  useEffect(() => {
    if (!isCountryScreen || countriesRequestedRef.current) return
    countriesRequestedRef.current = true
    getSupportedDocumentCountries().then((result) => {
      if (!getIsMounted()) return
      if (result.unavailable) {
        setSupportedCountriesStatus("error")
        setSupportedCountries([])
        return
      }
      setSupportedCountries(result.countries)
      setSupportedCountriesStatus("ready")
    })
  }, [isCountryScreen, getIsMounted])

  // A first activation (Confirm / Skip) ends on the "Travel Mode is now active!"
  // screen ("travel-mode" state). This top-right "Travel mode is on." Notification
  // toast (Figma node 13101-46846) is now only for a traveler whose Travel Mode is
  // already in force and who picks "Temporarily traveling" again — a separate, locally
  // controlled Toast instance rather than the shared useToast() queue, since
  // that queue renders through the app-wide Toaster's own dark, bottom-left
  // (on desktop) styling and can't be repositioned/restyled per call.
  const [travelModeNotificationOpen, setTravelModeNotificationOpen] =
    useState(false)
  const [travelDuration, setTravelDuration] = useState<TravelDuration | null>(
    null
  )
  // Set only by Skip, to pick the "Travel Mode is now active!" copy. The backend cannot
  // store a skipped duration (see SKIPPED_TRAVEL_DURATION_LABEL), so this is screen state.
  const [travelDurationSkipped, setTravelDurationSkipped] = useState(false)
  // The duration request failed: the duration screen stays open and says so.
  const [travelModeSaveFailed, setTravelModeSaveFailed] = useState(false)

  // "Travel time elapsed" reminder Notification (Figma node 13101-46860),
  // shown once the user's selected duration is up. Real trigger is a
  // backend-scheduled job that doesn't exist yet — see
  // scheduleTravelModeReminderMock's header for why this is mocked with a
  // short fixed delay instead of the real duration.
  const [travelReminderOpen, setTravelReminderOpen] = useState(false)

  // "How to Scan" tooltip (Figma node 13101-47041), shared across the
  // scan/loading/back-scan screens' identical "How to Scan" link. Reset
  // closed on every screen change so it doesn't carry over across the
  // scan -> loading -> back-scan auto-advance timers.
  const [howToScanOpen, setHowToScanOpen] = useState(false)
  useEffect(() => {
    setHowToScanOpen(false)
  }, [state])

  // Real-time "is a document actually in frame" detection for the
  // scan/back-scan screens (Chris's feedback + Figma node 18021-2310, "No ID
  // on screen") — see useDocumentPresenceDetector's header for the approach
  // and its limitations (a homegrown edge-density heuristic, not real
  // document recognition; no CV/ML capability exists anywhere else in this
  // codebase to reuse instead). Only one of scan/back-scan is ever mounted
  // at a time, so both hooks safely share the same container ref; the
  // inactive one just idles in "camera-loading".
  const cameraBoxRef = useRef<HTMLDivElement>(null)
  const [cameraError, setCameraError] = useState(false)
  useEffect(() => {
    setCameraError(false)
  }, [state])

  const scanPresence = useDocumentPresenceDetector({
    active: state === "scan",
    cameraError,
    containerRef: cameraBoxRef,
    containerWidth: CAMERA_BOX_WIDTH,
    containerHeight: CAMERA_BOX_HEIGHT,
    guideBox: SCAN_GUIDE_BOX,
  })
  const backScanPresence = useDocumentPresenceDetector({
    active: state === "back-scan",
    cameraError,
    containerRef: cameraBoxRef,
    containerWidth: CAMERA_BOX_WIDTH,
    containerHeight: CAMERA_BOX_HEIGHT,
    guideBox: BACK_SCAN_GUIDE_BOX,
  })

  // "Yes, this is my home country": complete the server-side confirmation,
  // then hand the browser to Didit's hosted Free KYC. Replaces the custom
  // country / document / scan / face-handoff screens on this path (their
  // components and states are kept, just no longer reachable from here).
  const [startingFreeKyc, setStartingFreeKyc] = useState(false)
  const startingFreeKycRef = useRef(false)
  // Didit now opens over this screen: if it is dismissed without a result (closed, camera
  // denied, expired), the same screen is usable again. A result is handled by the host.
  useEffect(
    () =>
      subscribeDiditOverlay((event) => {
        if (event.type !== "dismissed") return
        startingFreeKycRef.current = false
        setStartingFreeKyc(false)
      }),
    []
  )
  const handleHomeCountryYes = async () => {
    if (startingFreeKycRef.current) return
    startingFreeKycRef.current = true
    setStartingFreeKyc(true)
    const outcome = await runHomeCountryYes({
      simulate:
        simulateFreeKycForPreview === true &&
        process.env.NODE_ENV === "development",
      onSimulated: onSimulatedFreeKycStart,
      getDeps: async () => {
        const { IdentityVerificationAPI } = await import(
          "@/service/http/identity-verification"
        )
        return {
          confirmHomeCountry: () => IdentityVerificationAPI.confirmHomeCountry(),
          startFreeKyc: () => IdentityVerificationAPI.startFreeKyc(),
          redirect: (url: string) => void openDiditOverlay(url),
        }
      },
    })
    if (outcome !== "redirected" && getIsMounted()) {
      startingFreeKycRef.current = false
      setStartingFreeKyc(false)
    }
  }

  // Travel branch: persists what the travel screens collect.
  const travelModeDeps = async (): Promise<TravelModeDeps> => {
    const { IdentityVerificationAPI } = await import(
      "@/service/http/identity-verification"
    )
    return {
      recordTravelClassification: (c) =>
        IdentityVerificationAPI.recordTravelClassification(c),
      recordTravelDuration: (d) => IdentityVerificationAPI.recordTravelDuration(d),
    }
  }
  // Only "Permanently relocated" is saved at its click, and for an account that already
  // has a verified home country the backend records nothing for it (the claim is created
  // by the explicit country confirmation). "Temporarily traveling" saves nothing until a
  // duration is confirmed.
  const persistTravelClassification = (
    classification: "permanently_relocated"
  ) => {
    void travelModeDeps().then((deps) =>
      recordTravelClassification(deps, classification)
    )
  }

  // "Permanently relocated": saved once, then on to the screen that shows the location. With
  // `onPermanentlyRelocated` the flow first waits for the caller's refreshed location, and
  // ignores a second click meanwhile (one classification write per choice).
  const relocatingRef = useRef(false)
  const handlePermanentlyRelocated = async () => {
    if (relocatingRef.current) return
    persistTravelClassification("permanently_relocated")
    if (!onPermanentlyRelocated) {
      send("RELOCATED")
      return
    }
    relocatingRef.current = true
    try {
      await onPermanentlyRelocated()
    } finally {
      relocatingRef.current = false
    }
    if (!getIsMounted()) return
    send("RELOCATED")
  }

  // Confirm / Skip. The duration request saves the whole Travel Mode activation in one
  // atomic backend write, and the "Travel Mode is now active!" screen waits for it: a failed
  // save leaves this screen open, with nothing saved, and says so, to try again. Confirm
  // submits the selected duration and never a made-up one (its button is disabled until
  // one is chosen); Skip submits an explicit "Not sure" and ignores any earlier selection.
  const [activatingTravelMode, setActivatingTravelMode] = useState(false)
  const activatingTravelModeRef = useRef(false)
  const activateTravelMode = async (skipped: boolean) => {
    if (activatingTravelModeRef.current) return
    const duration = skipped ? SKIPPED_TRAVEL_DURATION_LABEL : travelDuration
    if (duration === null) return
    activatingTravelModeRef.current = true
    setActivatingTravelMode(true)
    setTravelModeSaveFailed(false)
    const saved = await travelModeDeps().then((deps) =>
      recordTravelDuration(deps, duration)
    )
    activatingTravelModeRef.current = false
    if (!getIsMounted()) return
    setActivatingTravelMode(false)
    if (!saved) {
      setTravelModeSaveFailed(true)
      return
    }
    setTravelDurationSkipped(skipped)
    send("NEXT")
  }

  // Guards against a second capture firing (e.g. a fast double-click) while
  // the first one is still submitting — capture is now a manual, user-timed
  // action (see the "scan"/"back-scan" screens' onClick below), not a blind
  // timer, so this replaces the timer's natural one-shot behavior.
  const capturingRef = useRef(false)

  // Real image references from the R2 upload (see submit-identity-document.ts)
  // for each side of the document. Held here only so a future submission
  // step has them ready — nothing downstream calls the real
  // submitDocument/document-check endpoints yet (see that file's header:
  // documentNumber/expirationDate aren't collected by any screen here).
  const [frontImageReference, setFrontImageReference] = useState<
    string | null
  >(null)
  const [backImageReference, setBackImageReference] = useState<
    string | null
  >(null)

  // Gates the face-verification-handoff screen's "Begin verifying" button.
  // Both the context AND the callback must be real — a caller that
  // supplies one without the other gets a disabled button, not a
  // half-wired action. Purely derived from props; no internal state, no
  // browser storage, nothing this component invents on its own.
  const canBeginVerifying = Boolean(verificationContext?.documentId) && Boolean(onBeginVerifying)

  const handleBeginVerifying = () => {
    // Guarded by the button's own `disabled` below — this is a second,
    // load-bearing guard, not decoration: never invoke the callback with a
    // missing or fabricated id.
    if (!verificationContext?.documentId || !onBeginVerifying) return
    onBeginVerifying(verificationContext)
  }

  const handleCapture = async (stage: "front" | "back") => {
    if (capturingRef.current) return
    capturingRef.current = true
    try {
      // Preview-only simulation (see simulateUploadForPreview): no capture
      // is required and nothing is uploaded; a placeholder reference stands
      // in for the stored image so the rest of the flow behaves the same.
      const documentImageReference = simulateUpload
        ? `simulated-${stage}-image`
        : (
            await submitIdentityDocument({
              documentType: selectedDocument?.id ?? "passport",
              capturedFile: (await cameraHandler.current?.capture()) ?? null,
            })
          ).documentImageReference
      if (getIsMounted()) {
        if (stage === "front") {
          setFrontImageReference(documentImageReference)
        } else {
          setBackImageReference(documentImageReference)
        }
        send("NEXT")
      }
    } finally {
      capturingRef.current = false
    }
  }

  // Loading screen auto-advances once processing finishes — no source
  // gives a real duration, so this is a fixed delay standing in for it.
  useEffect(() => {
    if (state !== "loading") return
    const timer = setTimeout(() => send("NEXT"), 2000)
    return () => clearTimeout(timer)
  }, [state, send])

  // city/region can be honestly empty (see detected-location.ts's header —
  // location-service's resolve-ip response has no region/city fields today,
  // so these are left unset rather than guessed) — filtered out here rather
  // than rendered as stray leading/double commas.
  const detectedLocationLabel = [
    detectedLocation.city,
    detectedLocation.region,
    detectedLocation.countryName,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      {state === "ideal" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-between gap-x-3">
            <div className="space-y-2 flex-auto">
              <h1 className="text-lg leading-5 text-dark-blue-400">
                {detectedLocation.serviceUnavailable
                  ? "Location service temporarily unavailable."
                  : detectedLocation.detected
                    ? "We detected your current location as:"
                    : "We couldn’t detect your current location"}
              </h1>
              {detectedLocation.detected && (
                <p className="text-lg font-bold leading-5 text-dark-blue-400">
                  {detectedLocationLabel}
                </p>
              )}
            </div>

            <DialogClose asChild>
              <IconButton
                className="rounded-lg text-gray-500/50 hover:text-gray-500"
                size="sm"
                visual="gray"
                variant="ghost"
              >
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <DetectedLocationMap
            latitude={detectedLocation.latitude}
            longitude={detectedLocation.longitude}
            serviceUnavailable={detectedLocation.serviceUnavailable}
          />

          <div className="mt-[50px]">
            <h1 className="text-lg font-semibold leading-5 text-center text-dark-blue-400">
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
                disabled={
                  startingFreeKyc || detectedLocation.locationMismatch === true
                }
                onClick={() => void handleHomeCountryYes()}
              >
                Yes, this is my home country
              </Button>
            </div>

            <div className="mt-6 text-center">
              <span className="text-xs leading-5 text-gray-500">
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
                Select your document&rsquo;s issuing country
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
              {/* List, scrolling and row hover as in the CountriesCombobox from
                  Storybook's checkout story (stories/checkout.stories.tsx +
                  own-combobox.tsx, read-only), composed here from the same
                  primitives because that component only accepts its own
                  built-in list. The field itself stays white with a solid
                  border in every state, and the list opens directly with no
                  search input. The country list and each flag come from the
                  backend's supported-document-countries answer (flag by
                  alpha-2), so nothing here is hard-coded — which is why its
                  "Popular" group is not reproduced. */}
              <Popover
                open={countryPickerOpen}
                onOpenChange={setCountryPickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    disabled={supportedCountriesStatus !== "ready"}
                    className={cn(
                      "bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5 disabled:cursor-not-allowed disabled:opacity-50",
                      "w-full h-11 bg-white border-solid border-gray-300 shadow-xs rounded-[5px] pl-[14px] pr-3 py-2.5 gap-3"
                    )}
                  >
                    {selectedIssuingCountry && (
                      <span className="inline-flex items-center justify-center size-6 shrink-0 rounded-full overflow-hidden bg-gray-100">
                        <img
                          className="w-full h-full object-cover"
                          src={`https://flagcdn.com/36x27/${selectedIssuingCountry.alpha2.toLowerCase()}.png`}
                          alt={selectedIssuingCountry.name}
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </span>
                    )}

                    <span className="text-xs inline-block truncate max-w-[120px] leading-[18px] font-medium text-gray-700">
                      {selectedIssuingCountry
                        ? selectedIssuingCountry.name
                        : "Select country"}
                    </span>

                    <ChevronDown className="ml-auto inline-block size-[18px] shrink-0 text-gray-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] pb-2 px-0 pt-0 z-50 bg-white border-gray-100 rounded-lg border shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
                  <Command>
                    <CommandList>
                      <CommandGroup heading="All Countries">
                        {supportedCountries.map((country) => (
                          <CommandItem
                            key={country.alpha2}
                            value={`${country.name} ${country.alpha2}`}
                            onSelect={() => {
                              handleIssuingCountryChange(country.alpha2)
                              setCountryPickerOpen(false)
                            }}
                          >
                            <span className="inline-flex items-center justify-center size-6 shrink-0 rounded-full overflow-hidden bg-gray-100">
                              <img
                                className="w-full h-full object-cover"
                                src={`https://flagcdn.com/36x27/${country.alpha2.toLowerCase()}.png`}
                                alt={country.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none"
                                }}
                              />
                            </span>
                            <span className="inline-block flex-grow truncate">
                              {country.name}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="mt-8">
              <h3 className="text-sm text-dark-blue-400 font-semibold">
                Accepted Documents
              </h3>

              {acceptedDocumentsStatus === "loading" && (
                <div className="mt-3 flex justify-center py-6">
                  <Spinner size={28} strokeWidth={4} />
                </div>
              )}

              {acceptedDocumentsStatus === "empty" && (
                <Alert variant="warning" className="rounded-[5px] mt-3">
                  <AlertIcon>
                    <Info className="size-5" />
                  </AlertIcon>
                  <AlertContent>
                    <AlertTitle>
                      No accepted document types are available for this
                      country yet.
                    </AlertTitle>
                  </AlertContent>
                </Alert>
              )}

              {acceptedDocumentsStatus === "ready" && (
                <div className="mt-3 space-y-2.5">
                  {visibleDocumentOptions.map((option) => (
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
              )}
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
              <Button
                className="underline underline-offset-4"
                variant="link"
                onClick={() => setHowToScanOpen((open) => !open)}
              >
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

          <div
            ref={cameraBoxRef}
            onClick={() => void handleCapture("front")}
            className="relative rounded-lg overflow-hidden mt-3 border border-gray-200 h-[373px] bg-gray-900 cursor-pointer"
          >
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 8, objectFit: "cover" }}
              captureMode="back"
              ref={cameraHandler}
              onError={() => {
                setCameraError(true)
                toast({
                  title: "Camera unavailable",
                  description:
                    "Check camera permissions for this site and try again.",
                  variant: "destructive",
                })
              }}
            />

            {/* Machine-readable-zone viewfinder guide. Figma's reference
                positions this against a static passport photo asset that
                doesn't exist in this codebase; against a live camera feed
                there's no fixed document to align pixel-for-pixel to, so
                this is a proportionally-placed approximation of the same
                corner-bracket guide (306x43px, centered near the bottom),
                not a literal copy of Figma's absolute coordinates.
                Neutral/white until scanPresence actually reports a document
                in frame — green is a detection signal, not a verification
                result (Figma node 18021-2310, "No ID on screen"). */}
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-[22px] mx-auto h-[43px] w-[306px] rounded-[4px] shadow-[1px_4px_4px_rgba(0,0,0,0.25)]",
                scanPresence === "document-detected" && "bg-success-500/20"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 size-3 rounded-[4px] border-[3px]",
                  scanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute right-0 top-0 size-3 rounded-[4px] border-[3px]",
                  scanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 bottom-0 size-3 rounded-[4px] border-[3px]",
                  scanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute right-0 bottom-0 size-3 rounded-[4px] border-[3px]",
                  scanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
            </div>

            {scanPresence === "no-document" && (
              <NoDocumentOverlay
                label={selectedDocument?.label ?? "Passport"}
              />
            )}

            {howToScanOpen && <HowToScanTooltip />}
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
              <Button
                className="underline underline-offset-4"
                variant="link"
                onClick={() => setHowToScanOpen((open) => !open)}
              >
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

            {howToScanOpen && <HowToScanTooltip />}
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
              <Button
                className="underline underline-offset-4"
                variant="link"
                onClick={() => setHowToScanOpen((open) => !open)}
              >
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

          <div
            ref={cameraBoxRef}
            className="relative rounded-lg overflow-hidden mt-3 border border-gray-200 h-[373px] bg-gray-900"
          >
            <WebCamera
              style={{ height: 373, width: 602 }}
              videoStyle={{ borderRadius: 8, objectFit: "cover" }}
              captureMode="back"
              ref={cameraHandler}
              onError={() => {
                setCameraError(true)
                toast({
                  title: "Camera unavailable",
                  description:
                    "Check camera permissions for this site and try again.",
                  variant: "destructive",
                })
              }}
            />

            {/* Wider guide covering the whole back-page area, proportioned
                from Figma's 247x62 box (~41%x17%) positioned in the upper
                third — this pass's own proportional placement, same
                reasoning as the front-scan guide (no fixed document to
                match Figma's absolute static-photo coordinates to).
                Neutral/white until backScanPresence actually reports a
                document in frame, same as the front-scan guide (Figma node
                18021-2310, "No ID on screen"). */}
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-[26%] -translate-x-1/2 h-[62px] w-[247px] rounded-[4px] shadow-[1px_4px_4px_rgba(0,0,0,0.25)]",
                backScanPresence === "document-detected" &&
                  "bg-success-500/25"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 size-4 rounded-[4px] border-[3px]",
                  backScanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute right-0 top-0 size-4 rounded-[4px] border-[3px]",
                  backScanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 bottom-0 size-4 rounded-[4px] border-[3px]",
                  backScanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
              <span
                className={cn(
                  "absolute right-0 bottom-0 size-4 rounded-[4px] border-[3px]",
                  backScanPresence === "document-detected"
                    ? "border-success-500"
                    : "border-white"
                )}
              />
            </div>

            {/* Success badge, centered in the whole camera box — only once
                a document is actually detected, not unconditionally
                (previously always rendered regardless of camera content). */}
            {backScanPresence === "document-detected" && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-success-500">
                <Check className="size-5 text-white" />
              </div>
            )}

            {backScanPresence === "no-document" && (
              <NoDocumentOverlay
                label={selectedDocument?.label ?? "Passport"}
              />
            )}

            {howToScanOpen && <HowToScanTooltip />}
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
            <Button onClick={() => void handleCapture("back")}>
              Continue
            </Button>
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
              You’re all set!
            </h1>

            {/* Deliberately not "verified" here — only the images have
                been received; face verification (next screen) still has to
                happen before identityVerificationStatus can ever become
                VERIFIED. See the face-verification-handoff screen below. */}
            <p className="mt-2 text-sm text-dark-blue-400 text-center">
              Your documents have been received. One more step is needed to
              verify your identity.
            </p>

            <div className="mt-[50px] grid">
              <Button onClick={() => send("NEXT")}>Continue</Button>
            </div>
          </div>
        </DialogContent>
      )}

      {state === "face-verification-handoff" && (
        <DialogContent className="max-w-[418px] pt-[50px]">
          <div className="flex flex-col items-center gap-y-5">
            <div className="size-12 rounded-full text-warning-600 bg-warning-100 border-[8px] border-warning-50 inline-flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6" />
            </div>

            <p className="text-sm text-dark-blue-400 text-center leading-5">
              To finish verifying your identity, you’ll complete a quick face
              check with our verification partner.
            </p>
          </div>

          <div className="mt-[50px] flex justify-center items-center gap-x-3">
            <Button
              visual="gray"
              variant="outlined"
              size="md"
              onClick={() => send("BACK")}
            >
              Back
            </Button>
            {/* Calls the caller-supplied onBeginVerifying callback only —
                this component makes no API call itself (UI-only pass).
                Disabled unless BOTH verificationContext and
                onBeginVerifying are supplied by the caller, which no real
                caller does today: nothing upstream of this screen creates
                an IdentityDocument row (see VerificationContext's own
                comment above). Never sends a request with a missing id,
                never invents one, never silently no-ops on click — the
                disabled state plus the explanation below are the honest
                alternative to that. */}
            <Button
              visual="primary"
              variant="light"
              size="md"
              disabled={!canBeginVerifying}
              onClick={handleBeginVerifying}
            >
              Begin verifying
            </Button>
          </div>

          {!canBeginVerifying && (
            <p className="mt-3 text-xs text-gray-500 text-center">
              Verification isn’t ready yet. Please check back once your
              documents finish processing.
            </p>
          )}
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
              onClick={() => {
                if (activeTravelModeUpdate) {
                  setTravelModeNotificationOpen(true)
                  onTravelModeConfirmed?.()
                  onOpenChange(false)
                  return
                }
                // Nothing is saved here: closing before a duration is chosen
                // leaves the account exactly as it was.
                send("NEXT")
              }}
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
              onClick={() => void handlePermanentlyRelocated()}
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
            onValueChange={(value) => {
              setTravelDuration(value as TravelDuration)
              setTravelModeSaveFailed(false)
            }}
          >
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem
                value="A few days"
                id="travel-duration-a-few-days"
              />{" "}
              <Label htmlFor="travel-duration-a-few-days">A few days</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem
                value="1–2 weeks"
                id="travel-duration-1-2-weeks"
              />{" "}
              <Label htmlFor="travel-duration-1-2-weeks">1–2 weeks</Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem
                value="More than 2 weeks"
                id="travel-duration-more-than-2-weeks"
              />{" "}
              <Label htmlFor="travel-duration-more-than-2-weeks">
                More than 2 weeks
              </Label>
            </div>
            <div className="inline-flex items-center gap-x-3">
              <RadioGroupItem value="Not sure" id="travel-duration-not-sure" />{" "}
              <Label htmlFor="travel-duration-not-sure">Not sure</Label>
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

          {travelModeSaveFailed && (
            <Alert variant="error" className="mt-3" role="alert">
              <AlertIcon>
                <AlertTriangle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle>
                  We couldn&rsquo;t save your travel details. Please try again.
                </AlertTitle>
              </AlertContent>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-x-3 mt-6">
            <Button
              variant="outlined"
              visual="gray"
              disabled={activatingTravelMode}
              onClick={() => void activateTravelMode(true)}
            >
              Skip
            </Button>
            <Button
              disabled={activatingTravelMode || travelDuration === null}
              onClick={() => void activateTravelMode(false)}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      )}

      {state === "travel-mode" && (
        <DialogContent className="max-w-[650px]">
          <div className="flex items-start justify-end">
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
              Travel Mode is now active!
            </h1>
            <p className="mt-1 font-light text-dark-blue-400">
              {travelDurationSkipped
                ? "You’re marked as temporarily traveling. Some features may be limited until you are back in your home country."
                : "You’re marked as temporarily traveling. You can now use the platform without restrictions."}
            </p>
          </div>

          <Alert className="mt-6">
            <AlertIcon>
              <Info className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>
                You&rsquo;ll remain in Travel Mode until you return to your home
                country or update your location.
              </AlertTitle>
            </AlertContent>
          </Alert>

          <div className="mt-6 grid">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
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
