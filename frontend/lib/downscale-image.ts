/**
 * Shrinks an image so its longest side is at most `maxDimension` before it is
 * uploaded. Returns the original file untouched when it is already small
 * enough or cannot be decoded (the server then validates it as usual).
 *
 * Why: the avatar upload is capped at 5 MB (gateway + user-service), and the
 * image editor hands over a full-resolution render, so an ordinary phone
 * photo arrives as a 413. user-service resizes every avatar to at most
 * 1024px anyway, so shrinking first loses nothing that would be stored.
 */
export async function downscaleImage(
  file: File,
  maxDimension: number
): Promise<File> {
  if (typeof createImageBitmap !== "function") return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height)
    if (longest <= maxDimension) return file

    const scale = maxDimension / longest
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    // Keep PNG for PNGs (transparency); everything else goes out as JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg"
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, type === "image/jpeg" ? 0.9 : undefined)
    )
    if (!blob) return file

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image"
    const extension = type === "image/png" ? "png" : "jpg"
    return new File([blob], `${baseName}.${extension}`, { type })
  } finally {
    bitmap.close()
  }
}
