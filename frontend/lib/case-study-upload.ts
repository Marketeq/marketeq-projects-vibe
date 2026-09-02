import { CaseStudyAPI } from "@/service/http/case-study"

/**
 * Uploads a case-study image to R2 via portfolio-service's presigned-URL flow:
 * request a signed PUT URL, upload the raw bytes to it, return the public URL
 * the block/cover-image field should store. `contentType` comes back from
 * the request-upload call rather than being guessed client-side — it must
 * match exactly what the URL was signed with or R2 rejects the PUT.
 */
export async function uploadCaseStudyImage(file: File): Promise<string> {
  const { data } = await CaseStudyAPI.RequestUpload(file.name, file.size)
  const { uploadUrl, publicUrl, contentType } = data

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  })

  if (!putResponse.ok) {
    throw new Error(`Image upload failed (${putResponse.status})`)
  }

  return publicUrl
}
