import { getId } from "@/utils/functions"
import type { CaseStudyBlock } from "@/service/http/case-study"

// Mirrors State["regions"][number]["region"] in components/case-study-builder.tsx.
export type CaseStudyBlockType =
  | "introduction"
  | "bold-statement"
  | "gallery"
  | "challenges"
  | "process"
  | "big-image"
  | "interview"
  | "personas"
  | "video"
  | "customer-journey"
  | "testimonial"
  | "image-text"
  | "results-metrics"
  | "prototype"
  | "conclusion"
  | "custom-columns"

// Block types whose fields are actually lifted to editor state today (see
// components/case-study-builder.tsx). The rest still render their existing,
// fully-styled editor UI, but nothing typed into them is captured/persisted
// yet — a follow-up, not something silently pretended to work here.
export const DATA_WIRED_BLOCK_TYPES: ReadonlySet<CaseStudyBlockType> = new Set([
  "introduction",
  "bold-statement",
  "challenges",
  "image-text",
  "conclusion",
  "interview",
  "big-image",
  "process",
  "personas",
  "results-metrics",
  "testimonial",
  "custom-columns",
  "gallery",
  "video",
  "customer-journey",
  "prototype",
])

export interface EditorRegion {
  id: number
  region: CaseStudyBlockType
  data?: Record<string, unknown>
}

/**
 * Zoom (1.0 = 100%, typical range 0.5–2.0) and rotation (degrees, one of
 * 0/90/180/270) applied to a case-study image via CSS `transform` at render
 * time — never baked into the file, so it stays reversible. See
 * components/case-study/image-edit-modal.tsx.
 */
export interface ImageTransform {
  imageZoom?: number
  imageRotation?: number
  /** 0-100, default 50 (centered) — see sections/_shared.tsx's imageTransformStyle. */
  imageOffsetX?: number
  imageOffsetY?: number
}

export interface IntroductionData extends ImageTransform {
  titleHtml: string
  bodyHtml: string
  imageUrl?: string
}
export interface BoldStatementData {
  html: string
}
export interface ChallengesData extends ImageTransform {
  titleHtml: string
  bodyHtml: string
  imageUrl?: string
}
export interface ImageTextData extends ImageTransform {
  titleHtml: string
  bodyHtml: string
  imageUrl?: string
}
export interface ConclusionData {
  titleHtml: string
  bodyHtml: string
}
export interface InterviewData {
  titleHtml: string
  bodyHtml: string
  items: { questionHtml: string; answerHtml: string }[]
}
export interface BigImageData extends ImageTransform {
  url: string
  caption?: string
}
export interface ProcessStep {
  titleHtml: string
  bodyHtml: string
}
export interface ProcessData {
  titleHtml: string
  bodyHtml: string
  steps: ProcessStep[]
}
export interface PersonasData extends ImageTransform {
  nameHtml: string
  roleHtml: string
  aboutHtml: string
  goalsHtml: string
  frustrationsHtml: string
  imageUrl?: string
}
export interface ResultMetricItem {
  value: string
  label: string
}
export interface ResultMetricsData {
  metrics: ResultMetricItem[]
}
export interface TestimonialItem {
  quoteHtml: string
  authorHtml: string
  roleHtml: string
}
export interface TestimonialData {
  items: TestimonialItem[]
}
export interface ColumnItem extends ImageTransform {
  titleHtml: string
  bodyHtml: string
  imageUrl?: string
  /** Relative grid `fr` weight — e.g. [2, 1] renders a 66/33 split. Defaults to 1 (equal). */
  width?: number
}
export interface CustomColumnsData {
  titleHtml: string
  columns: ColumnItem[]
}

const DEFAULT_COLUMN_TITLE = "This is your heading"
const DEFAULT_COLUMN_BODY =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"

/** Builds the initial data for a new custom-columns block from a picked layout's fr-widths. */
export function buildColumnsData(widths: number[]): CustomColumnsData {
  return {
    titleHtml: "These are your columns",
    columns: widths.map((width) => ({
      width,
      titleHtml: DEFAULT_COLUMN_TITLE,
      bodyHtml: DEFAULT_COLUMN_BODY,
    })),
  }
}
export interface GalleryImage extends ImageTransform {
  url: string
}
export interface GalleryData {
  images: GalleryImage[]
  caption?: string
}

/**
 * Gallery images used to be persisted as a plain `string[]` of URLs (no
 * per-image zoom/rotation). Normalizes either shape — old localStorage
 * drafts included — into the current `GalleryImage[]` so every reader only
 * has to handle one shape.
 */
export function normalizeGalleryImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): GalleryImage | null => {
      if (typeof entry === "string") {
        return entry ? { url: entry } : null
      }
      if (entry && typeof entry === "object" && typeof (entry as { url?: unknown }).url === "string") {
        const { url, imageZoom, imageRotation, imageOffsetX, imageOffsetY } = entry as GalleryImage
        return url ? { url, imageZoom, imageRotation, imageOffsetX, imageOffsetY } : null
      }
      return null
    })
    .filter((entry): entry is GalleryImage => entry !== null)
}
export interface VideoData {
  posterUrl?: string
  videoUrl: string
  caption?: string
}
export interface CustomerJourneyStage {
  titleHtml: string
  bodyHtml: string
}
export interface CustomerJourneyData {
  titleHtml: string
  bodyHtml: string
  stages: CustomerJourneyStage[]
}
export interface PrototypeData {
  url: string
  caption?: string
}

/**
 * regions (editor state) -> schemaJson.blocks (what CaseStudyAPI.Update persists).
 * Accepts any region-shaped array (not just EditorRegion[]) since the editor's
 * own reducer state type is a superset that also includes a few block types
 * with no picker button/renderer yet (see the comment on CaseStudyBlockType).
 */
export function regionsToSchemaJson(
  regions: { id: number; region: string; data?: Record<string, unknown> }[]
): {
  blocks: CaseStudyBlock[]
} {
  return {
    blocks: regions.map((r) => ({ type: r.region, data: r.data ?? {} })),
  }
}

/** Best-effort thumbnail: the first image URL found in any block's data. */
export function firstCaseStudyImageUrl(
  blocks: CaseStudyBlock[] | undefined
): string | undefined {
  for (const block of blocks ?? []) {
    const data = block.data as Record<string, unknown>
    if (typeof data?.imageUrl === "string" && data.imageUrl) {
      return data.imageUrl
    }
    if (typeof data?.url === "string" && data.url) {
      return data.url
    }
  }
  return undefined
}

/** Appends a new, empty region of the given type to a regions array (used by the "Use a Template" flow). */
export function addSection(
  sections: EditorRegion[],
  region: CaseStudyBlockType
): EditorRegion[] {
  return [...sections, { id: getId(), region }]
}

/** schemaJson.blocks (a loaded draft) -> regions (editor state), assigning fresh local ids */
export function schemaJsonToRegions(
  schemaJson: { blocks: CaseStudyBlock[] } | null | undefined,
  makeId: () => number
): EditorRegion[] {
  if (!schemaJson?.blocks?.length) return []
  return schemaJson.blocks.map((block) => ({
    id: makeId(),
    region: block.type as CaseStudyBlockType,
    data: block.data,
  }))
}
