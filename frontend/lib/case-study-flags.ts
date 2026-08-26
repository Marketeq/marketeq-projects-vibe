/**
 * Case studies are stored client-side only today (localStorage, see
 * lib/hooks/use-case-study-store.ts) and their images are
 * `URL.createObjectURL()` blob references scoped to one browser tab.
 *
 * That is fine for building and testing the editor, but it makes "publish"
 * a promise the app cannot keep: the author gets a /case-studies/[slug]
 * link that renders broken images for every other viewer, and nothing for
 * anyone on a different device.
 *
 * So the editor ships enabled and the two surfaces that imply real
 * persistence stay off:
 *   - the Publish action in the editor top bar
 *   - the public /case-studies/[slug] route
 *
 * Flip this to `true` in the same PR that wires the frontend to
 * portfolio-service's case-study API (which also needs the frontend and
 * backend block-type lists reconciled first).
 */
export const CASE_STUDY_PUBLISH_ENABLED = false
