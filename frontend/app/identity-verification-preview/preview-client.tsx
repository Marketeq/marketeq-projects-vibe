"use client"

// In-app, dev-only preview of the real IdentityVerificationFlow component —
// same "mount the real component directly" idea as /desktop-tracker-preview,
// but this route is server-gated to development only (see page.tsx) since
// that route isn't. No real backend session, no real Didit call, no
// localStorage — every simulated value here lives in ordinary React state
// (in memory, cleared on refresh) and is passed down as props. The shared
// component itself has no knowledge that this page is a preview: its
// default starting state, guards, and API calls are completely unchanged
// for every real caller (see identity-verification-flow.tsx's own comment
// on `initialState`).
import { useState } from "react"
import { Button, Checkbox, Label } from "@/components/ui"
import {
  IdentityVerificationFlow,
  type VerificationContext,
} from "@/components/identity-verification-flow"
import type { DetectedLocation } from "@/src/lib/api/detected-location"

const MOCK_DETECTED_LOCATION: DetectedLocation = {
  city: "Austin",
  region: "Texas",
  countryCode: "US",
  countryName: "United States",
  latitude: 30.2672,
  longitude: -97.7431,
  detected: true,
  serviceUnavailable: false,
}

type PreviewEntryPoint = "ideal" | "all-set" | "face-verification-handoff"

export function IdentityVerificationPreviewClient() {
  const [open, setOpen] = useState(false)
  // Forces IdentityVerificationFlow to remount (useStateMachine's initial
  // value is read once, on mount, same as useState/useReducer always work)
  // so each "Open ..." button below reliably lands on its own target
  // screen rather than reusing whatever screen a previous open left
  // mounted at.
  const [mountKey, setMountKey] = useState(0)
  const [entryPoint, setEntryPoint] = useState<PreviewEntryPoint>("ideal")
  const [simulateReady, setSimulateReady] = useState(false)
  const [simulatedNote, setSimulatedNote] = useState<string | null>(null)

  const openAt = (target: PreviewEntryPoint) => {
    setEntryPoint(target)
    setMountKey((k) => k + 1)
    setOpen(true)
  }

  const verificationContext: VerificationContext | null = simulateReady
    ? { documentId: "preview-simulated-document-id" }
    : null

  return (
    <div className="min-h-screen bg-[#F2F4F7] flex flex-col items-center justify-center gap-y-5 p-10">
      <p className="text-sm text-gray-600 max-w-md text-center">
        Dev-only preview — mounts the real IdentityVerificationFlow
        component. No real backend session, no real Didit request, no image
        upload. Nothing below is persisted; refreshing resets it.
      </p>

      <div className="flex items-center gap-x-2">
        <Checkbox
          id="simulate-ready"
          checked={simulateReady}
          onCheckedChange={(checked) => setSimulateReady(checked === true)}
        />
        <Label htmlFor="simulate-ready">
          Simulate: verification prerequisites ready (enables &ldquo;Begin
          verifying&rdquo;)
        </Label>
      </div>

      <div className="flex flex-col items-center gap-y-3">
        <Button onClick={() => openAt("ideal")}>
          Open Identity Verification Flow (normal start)
        </Button>
        <Button variant="outlined" visual="gray" onClick={() => openAt("all-set")}>
          Open &ldquo;You&rsquo;re all set!&rdquo; directly
        </Button>
        <Button
          variant="outlined"
          visual="gray"
          onClick={() => openAt("face-verification-handoff")}
        >
          Open &ldquo;face-verification-handoff&rdquo; directly
        </Button>
      </div>

      {simulatedNote && (
        <p className="text-sm text-gray-600 max-w-md text-center">
          {simulatedNote}
        </p>
      )}

      <IdentityVerificationFlow
        key={mountKey}
        open={open}
        onOpenChange={setOpen}
        detectedLocation={MOCK_DETECTED_LOCATION}
        initialState={entryPoint}
        verificationContext={verificationContext}
        onBeginVerifying={({ documentId }) => {
          // SIMULATION ONLY — no real request is sent, no real Didit URL is
          // opened, no account is updated, and this never claims the user
          // is actually verified.
          setSimulatedNote(
            `Simulated only — no real request was sent. In production this ` +
              `would call the real beginBiometricVerification endpoint for ` +
              `document "${documentId}" and open Didit's hosted page.`
          )
        }}
      />
    </div>
  )
}
