/**
 * Frontend-only image "upload" for case studies. portfolio-service's
 * /media/upload endpoint isn't reliably reachable (no api-gateway route yet,
 * service not always running locally), so every image/file field in the
 * case-study editor — Introduction, Challenges, Image & Text, Big Image,
 * Gallery, Personas, Custom Columns, Video poster, Prototype — resolves the
 * file to a local blob URL instead of hitting the network. No request is
 * made, so there's nothing to fail, retry, or show an error toast for.
 *
 * The blob URL only lives for the current tab session (it's revoked when the
 * page unloads) — acceptable per the local-only editing flow this backs.
 */
export async function uploadCaseStudyImage(file: File): Promise<string> {
  return URL.createObjectURL(file)
}
