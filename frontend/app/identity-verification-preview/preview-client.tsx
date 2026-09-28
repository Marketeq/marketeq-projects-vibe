"use client"

// In-app, dev-only preview of the real IdentityVerificationFlow component —
// same "mount the real component directly" idea as /desktop-tracker-preview,
// but this route is server-gated to development only (see page.tsx) since
// that route isn't. The optional sandbox harness creates a real Didit test
// session through the development-only backend endpoint; all preview state
// remains in memory and is cleared on refresh. The shared component itself
// has no knowledge that this page is a preview: its default starting state,
// guards, and API calls are unchanged for every real caller.
import { useState } from "react"
import type { DetectedLocation } from "@/src/lib/api/detected-location"
import {
  IdentityVerificationFlow,
  type VerificationContext,
} from "@/components/identity-verification-flow"
import { Button, Checkbox, Label } from "@/components/ui"

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

// Sandbox-only diagnostic base URL for the identity-verification-service
// instance this page's "Begin verifying" button calls directly (not through
// the API Gateway — see identity-verification-sandbox.controller.ts on the
// backend for why). Defaults to the service's normal dev port; override via
// NEXT_PUBLIC_SANDBOX_IDV_URL when a second instance runs on a different
// port (e.g. a temporary worktree) alongside the one already on 3019.
const SANDBOX_IDV_BASE_URL =
  process.env.NEXT_PUBLIC_SANDBOX_IDV_URL || "http://localhost:3019"

// Didit's hosted-session API wants raw base64 image bytes, not a data URL —
// strips the "data:<mime>;base64," prefix FileReader adds.
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Failed to read reference selfie as base64"))
        return
      }
      const commaIndex = result.indexOf(",")
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1))
    }
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read reference selfie"))
    reader.readAsDataURL(file)
  })
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
  // Sandbox Didit biometric test harness state — separate from the flow's
  // own simulated state above. Selecting a reference selfie here is what
  // switches "Begin verifying" from the simulated no-op to a real call
  // against the sandbox identity-verification-service instance.
  const [referenceSelfie, setReferenceSelfie] = useState<File | null>(null)
  const [sandboxSubmitting, setSandboxSubmitting] = useState(false)
  const [sandboxError, setSandboxError] = useState<string | null>(null)

  const openAt = (target: PreviewEntryPoint) => {
    setEntryPoint(target)
    setMountKey((k) => k + 1)
    setOpen(true)
  }

  const verificationContext: VerificationContext | null = simulateReady
    ? { documentId: "preview-simulated-document-id" }
    : null

  const handleBeginVerifying = async ({ documentId }: VerificationContext) => {
    const selfieFile = referenceSelfie
    if (!selfieFile) {
      setSimulatedNote(
        `Simulated only — no real request was sent. Select a reference ` +
          `selfie above to use the Sandbox Didit test harness instead, ` +
          `which would call the real beginBiometricVerification endpoint ` +
          `for document "${documentId}" and open Didit's hosted page.`
      )
      return
    }

    setSandboxError(null)
    setSandboxSubmitting(true)
    try {
      const portraitImageBase64 = await fileToBase64(selfieFile)
      const response = await fetch(
        `${SANDBOX_IDV_BASE_URL}/v1/identity-verification/sandbox/begin-biometric-session`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ portraitImageBase64 }),
        }
      )

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const message =
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : `Sandbox request failed (${response.status})`
        throw new Error(message)
      }

      const data = (await response.json()) as { sessionId: string; url: string }
      window.location.href = data.url
    } catch (error) {
      setSandboxSubmitting(false)
      setSandboxError(
        error instanceof Error ? error.message : "Sandbox Didit request failed"
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F7] px-6 py-12">
      <main className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary-500">
            Development sandbox
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Test face verification
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Upload a reference photo, then open the face-verification screen.
            Didit will compare it with the live selfie captured during the test.
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-primary-100 bg-primary-50 p-4">
          <p className="text-sm text-gray-700">
            This creates a real Didit Sandbox session through the temporary
            backend. It does not create a document record or save anything to
            the application database.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-gray-800">Reference photo</p>
          <p className="mt-1 text-xs text-gray-500">
            Choose a clear JPG or PNG under 60 KB for this temporary test.
          </p>
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-6 py-8 text-center transition hover:border-primary-400 hover:bg-primary-50">
            <span className="text-sm font-semibold text-primary-600">
              {referenceSelfie
                ? "Change reference photo"
                : "Choose reference photo"}
            </span>
            {referenceSelfie && (
              <span className="mt-2 text-xs text-gray-600">
                {referenceSelfie.name} ·{" "}
                {(referenceSelfie.size / 1024).toFixed(1)} KB
              </span>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                setReferenceSelfie(event.target.files?.[0] ?? null)
                setSandboxError(null)
              }}
            />
          </label>
        </div>

        <div className="mt-6 flex items-start gap-x-3 rounded-lg border border-gray-200 p-4">
          <Checkbox
            id="simulate-ready"
            checked={simulateReady}
            onCheckedChange={(checked) => setSimulateReady(checked === true)}
          />
          <Label htmlFor="simulate-ready" className="leading-5">
            Mark document verification as ready for this test
          </Label>
        </div>

        <div className="mt-6 flex flex-col gap-y-3">
          <Button
            variant="filled"
            visual="primary"
            className="w-full justify-center"
            onClick={() => openAt("ideal")}
          >
            Start full identity flow
          </Button>
          <Button
            variant="filled"
            visual="primary"
            className="w-full justify-center"
            onClick={() => openAt("all-set")}
          >
            Preview completion screen
          </Button>
          <Button
            variant="filled"
            visual="primary"
            className="w-full justify-center"
            onClick={() => openAt("face-verification-handoff")}
          >
            Test face verification
          </Button>
        </div>

        {sandboxSubmitting && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Creating sandbox Didit session…
          </p>
        )}
        {sandboxError && (
          <p className="mt-4 text-center text-xs text-error-600">
            {sandboxError}
          </p>
        )}

        {simulatedNote && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {simulatedNote}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Refreshing this page clears the selected photo and test state.
        </p>
      </main>

      <IdentityVerificationFlow
        key={mountKey}
        open={open}
        onOpenChange={setOpen}
        detectedLocation={MOCK_DETECTED_LOCATION}
        initialState={entryPoint}
        verificationContext={verificationContext}
        onBeginVerifying={handleBeginVerifying}
      />
    </div>
  )
}
