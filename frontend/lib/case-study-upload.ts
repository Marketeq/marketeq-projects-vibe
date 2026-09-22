import { CaseStudyAPI } from "@/service/http/case-study"

/**
 * PUTs the raw bytes to the presigned URL, reporting how much of the body has
 * gone out. `fetch` exposes no upload progress at all, so this is XHR — it is
 * the only browser API that fires per-chunk events for a request body.
 */
function putWithProgress(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", uploadUrl)
    xhr.setRequestHeader("Content-Type", contentType)

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        // Without a total there is no percentage to report; leave the caller on
        // its last known value rather than jumping it to a made-up one.
        if (!event.lengthComputable) return
        onProgress(Math.round((event.loaded / event.total) * 100))
      })
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // The last progress event fires when the body is flushed to the socket,
        // which can be a touch before R2 answers — settle the bar at 100 so it
        // never finishes stuck at 98%.
        onProgress?.(100)
        resolve()
        return
      }
      reject(new Error(`Image upload failed (${xhr.status})`))
    })
    xhr.addEventListener("error", () =>
      reject(new Error("Image upload failed (network error)"))
    )
    xhr.addEventListener("abort", () =>
      reject(new Error("Image upload failed (aborted)"))
    )

    xhr.send(file)
  })
}

/**
 * Uploads a case-study image to R2 via portfolio-service's presigned-URL flow:
 * request a signed PUT URL, upload the raw bytes to it, return the public URL
 * the block/cover-image field should store. `contentType` comes back from
 * the request-upload call rather than being guessed client-side — it must
 * match exactly what the URL was signed with or R2 rejects the PUT.
 *
 * `onProgress` receives 0-100 for the byte upload itself. Callers that only
 * need the URL can ignore it and the flow is unchanged.
 */
export async function uploadCaseStudyImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const { data } = await CaseStudyAPI.RequestUpload(file.name, file.size)
  const { uploadUrl, publicUrl, contentType } = data

  await putWithProgress(uploadUrl, file, contentType, onProgress)

  return publicUrl
}
