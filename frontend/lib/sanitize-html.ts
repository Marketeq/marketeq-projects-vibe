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
