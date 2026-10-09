// frontend/src/lib/api/submit-identity-document.ts
//
// Real R2 upload for a captured front/back document image: requests a
// presigned PUT URL from the real, tested
// POST /v1/identity-verification/documents/upload-url endpoint, then PUTs
// the captured file's bytes directly to R2 (never through our own
// backend). Returns the resulting documentImageReference so the caller can
// hold onto it.
//
// This does NOT call the real document-submission endpoint
// (POST /v1/identity-verification/documents) or the two-stage
// document-check/begin-biometric-verification endpoints — this file only
// uploads the image bytes and hands back a reference. That is now a
// deliberate scope boundary for this pass, not a hard blocker: the backend
// DTO used to require documentNumber/expirationDate unconditionally, but
// now only requires them for captureMethod=manual_entry — for
// captureMethod=scan (what this flow uses) they are optional and get
// backfilled server-side from Didit's own OCR/MRZ extraction once the
// document-check runs, so nothing here would need to be fabricated to wire
// the real submission. Doing so is a separate, not-yet-made decision
// (it also needs the caller to decide what to show while the real
// document-check result comes back) — reported rather than done
// unilaterally in this pass.
export interface SubmitIdentityDocumentInput {
  documentType: string
  capturedFile: File | null
}

export interface SubmitIdentityDocumentResult {
  success: true
  documentImageReference: string
}

function resolveFileExtension(file: File): "jpg" | "jpeg" | "png" | "pdf" {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName === "jpg" || fromName === "jpeg" || fromName === "png" || fromName === "pdf") {
    return fromName
  }
  if (file.type === "image/png") return "png"
  if (file.type === "application/pdf") return "pdf"
  return "jpeg"
}

export async function submitIdentityDocument(
  input: SubmitIdentityDocumentInput
): Promise<SubmitIdentityDocumentResult> {
  if (!input.capturedFile) {
    throw new Error("No captured image to upload.")
  }

  const { IdentityVerificationAPI } = await import("@/service/http/identity-verification")
  const fileExtension = resolveFileExtension(input.capturedFile)
  const { data } = await IdentityVerificationAPI.createDocumentUploadUrl(fileExtension)

  const putResponse = await fetch(data.uploadUrl, {
    method: "PUT",
    body: input.capturedFile,
    headers: {
      "Content-Type": input.capturedFile.type || "application/octet-stream",
    },
  })
  if (!putResponse.ok) {
    throw new Error(`Document image upload failed with status ${putResponse.status}`)
  }

  return { success: true, documentImageReference: data.documentImageReference }
}
