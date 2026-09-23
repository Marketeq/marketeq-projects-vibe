// frontend/src/lib/api/submit-identity-document.ts
//
// Isolated document-submission client. The real identity-verification-service
// POST /v1/identity-verification/documents endpoint (plus the vendor
// verification session it kicks off) exists on a separate, not-yet-merged
// backend branch. This is a temporary, self-contained mock — it never
// calls a real backend, never uploads the captured file anywhere, and
// always resolves successfully after a short delay so the flow's UI can
// be built and tested end to end. Swap this function's body for the real
// upload + submission calls once that branch is merged; call sites (the
// identity-verification-flow component) do not need to change shape.
export interface SubmitIdentityDocumentInput {
  documentType: string
  capturedFile: File | null
}

const MOCK_SUBMIT_DELAY_MS = 600

export async function submitIdentityDocument(
  _input: SubmitIdentityDocumentInput
): Promise<{ success: true }> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_SUBMIT_DELAY_MS))
  return { success: true }
}
