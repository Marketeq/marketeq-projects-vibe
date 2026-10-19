// Best-effort allow-list HTML sanitizer for rendering talent-authored rich
// text (RichTextEditor output) in a public-facing page — no DOM/DOMPurify
// dependency is available in this app yet, so this is a conservative regex
// pass: strip everything except a small safe tag set, drop all attributes
// except href on <a> (http/https only) and a tightly-restricted style on
// paragraphs/headings (text-align only — see sanitizeStyleAttr), and strip
// event handlers / scripts outright. This is not a substitute for a real
// sanitizer (e.g. isomorphic-dompurify) — swap it in before this renders
// untrusted content at real scale.
const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "a",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
])

// Only these tags may carry a `style` attribute, and only a single
// `text-align: <value>` declaration survives — this is what TipTap's
// TextAlign extension (configured for `types: ["heading", "paragraph"]`)
// actually emits. Nothing else in `style` is allowed through, so this can't
// be used to inject arbitrary CSS (no `url()`, `expression()`, multiple
// declarations, etc.).
const STYLE_ALLOWED_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6"])
const TEXT_ALIGN_VALUES = new Set(["left", "center", "right", "justify"])

function sanitizeStyleAttr(attrs: string): string {
  const styleMatch = /style\s*=\s*"([^"]*)"|style\s*=\s*'([^']*)'/i.exec(attrs)
  const rawStyle = styleMatch?.[1] ?? styleMatch?.[2] ?? ""
  if (!rawStyle) return ""

  const alignMatch = /^\s*text-align\s*:\s*([a-z]+)\s*;?\s*$/i.exec(rawStyle)
  const value = alignMatch?.[1]?.toLowerCase()

  return value && TEXT_ALIGN_VALUES.has(value)
    ? ` style="text-align: ${value}"`
    : ""
}

export function sanitizeRichText(input: unknown): string {
  if (typeof input !== "string" || !input) return ""

  // Drop script/style blocks entirely, including their content.
  let html = input.replace(
    /<(script|style)[\s\S]*?<\/\1>/gi,
    ""
  )

  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase()
    if (!ALLOWED_TAGS.has(tag)) return ""

    const isClosing = match.startsWith("</")
    if (isClosing) return `</${tag}>`

    if (tag === "a") {
      const hrefMatch = /href\s*=\s*["']([^"']*)["']/i.exec(attrs)
      const href = hrefMatch?.[1] ?? ""
      const safeHref = /^https?:\/\//i.test(href) ? href : ""
      return safeHref
        ? `<a href="${safeHref}" rel="noopener noreferrer nofollow" target="_blank">`
        : "<a>"
    }

    if (STYLE_ALLOWED_TAGS.has(tag)) {
      return `<${tag}${sanitizeStyleAttr(attrs)}>`
    }

    return `<${tag}>`
  })

  return html
}

// PMCM-255: project fullDescription allow-list — the RichTextEditor
// component (frontend/components/rich-text-editor.tsx, catalogued/frozen)
// produces a specific tag set that sanitizeRichText above doesn't cover:
// <img> (inline description images, with a `data-align` attribute for
// left/right/full-width layout) and <span data-font-size="..."> (the
// FontSizeExtension's heading-size mark — NOT real <h1>-<h6> tags). A
// separate function, not a change to sanitizeRichText itself, so the
// existing case-study caller (components/case-study/sections/_shared.tsx,
// which legitimately allows <a>) is completely unaffected. Per the spec:
// no links, no custom fonts/CSS beyond text-align — <a> is deliberately
// left out of this allow-list.
const PROJECT_DESCRIPTION_ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "blockquote",
  "span",
  "img",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
])

const FONT_SIZE_VALUES = new Set([
  "small-heading",
  "normal-heading",
  "large-heading",
])
const IMAGE_ALIGN_VALUES = new Set(["left", "right", "full-width"])

function sanitizeFontSizeAttr(attrs: string): string {
  const match = /data-font-size\s*=\s*"([^"]*)"|data-font-size\s*=\s*'([^']*)'/i.exec(
    attrs
  )
  const value = (match?.[1] ?? match?.[2] ?? "").toLowerCase()
  return value && FONT_SIZE_VALUES.has(value)
    ? ` data-font-size="${value}"`
    : ""
}

function sanitizeImageAttrs(attrs: string): string {
  const srcMatch = /src\s*=\s*"([^"]*)"|src\s*=\s*'([^']*)'/i.exec(attrs)
  const rawSrc = (srcMatch?.[1] ?? srcMatch?.[2] ?? "").trim()

  // PMCM-255 (follow-up): no committed frontend env template defines
  // NEXT_PUBLIC_R2_CDN_BASE (only the untracked local .env.local has it),
  // so on staging/live `storageOrigin` was always "" and this stripped
  // every description image. A plain startsWith check was also bypassable
  // (e.g. "https://cdn.marketeq.com.evil.com"). Scheme allow-list instead
  // — https/http only, matching the backend's sanitizeProjectFullDescription
  // allowedSchemes — no data:/javascript:/relative URLs.
  let safeSrc = ""
  try {
    const parsed = new URL(rawSrc)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      safeSrc = parsed.href.replace(/"/g, "%22")
    }
  } catch {
    safeSrc = ""
  }
  if (!safeSrc) return ""

  const altMatch = /alt\s*=\s*"([^"]*)"|alt\s*=\s*'([^']*)'/i.exec(attrs)
  const alt = (altMatch?.[1] ?? altMatch?.[2] ?? "").replace(/"/g, "&quot;")

  const alignMatch = /data-align\s*=\s*"([^"]*)"|data-align\s*=\s*'([^']*)'/i.exec(
    attrs
  )
  const align = (alignMatch?.[1] ?? alignMatch?.[2] ?? "").toLowerCase()
  const safeAlign = IMAGE_ALIGN_VALUES.has(align) ? align : "full-width"

  return ` src="${safeSrc}" alt="${alt}" data-align="${safeAlign}"`
}

export function sanitizeProjectDescription(input: unknown): string {
  if (typeof input !== "string" || !input) return ""

  let html = input.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")

  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, rawTag, attrs) => {
    const tag = String(rawTag).toLowerCase()
    if (!PROJECT_DESCRIPTION_ALLOWED_TAGS.has(tag)) return ""

    const isClosing = match.startsWith("</")
    if (isClosing) return tag === "img" || tag === "br" ? "" : `</${tag}>`

    if (tag === "img") {
      const imageAttrs = sanitizeImageAttrs(attrs)
      return imageAttrs ? `<img${imageAttrs} />` : ""
    }

    if (tag === "span") {
      return `<span${sanitizeFontSizeAttr(attrs)}>`
    }

    if (STYLE_ALLOWED_TAGS.has(tag)) {
      return `<${tag}${sanitizeStyleAttr(attrs)}>`
    }

    return `<${tag}>`
  })

  return html
}
