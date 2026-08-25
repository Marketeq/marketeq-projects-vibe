import type { CaseStudyBlock } from "@/service/http/case-study"
import {
  DATA_WIRED_BLOCK_TYPES,
  type CaseStudyBlockType,
} from "@/lib/case-study-mapper"
import { SectionRenderer } from "./section-renderer"

interface CaseStudyViewerProps {
  /**
   * Optional — omit when the case study's title is already shown by the
   * surrounding page (e.g. the marketplace project header on the public
   * listing page) so it isn't rendered twice.
   */
  title?: string
  blocks: CaseStudyBlock[]
  className?: string
}

/**
 * Public, read-only case study content. Replaces the old
 * components/case-study-view.tsx — block rendering now goes through the same
 * SectionRenderer the editor uses, with isEditing={false}, instead of a
 * separate parallel switch statement. Covers all 16 block types.
 *
 * Unstyled for width/centering on purpose — it renders inside whatever
 * container the caller provides (a standalone page, or the ~818px main
 * column of the marketplace project page) rather than imposing its own
 * max-width.
 */
export default function CaseStudyViewer({
  title,
  blocks,
  className,
}: CaseStudyViewerProps) {
  const renderableBlocks = blocks.filter((b) =>
    DATA_WIRED_BLOCK_TYPES.has(b.type as CaseStudyBlockType)
  )

  return (
    <article className={className ?? "space-y-[100px]"}>
      {title ? (
        <h1 className="text-[40px] md:text-[64px] leading-tight font-semibold text-dark-blue-400">
          {title}
        </h1>
      ) : null}
      {renderableBlocks.map((block, i) => (
        <SectionRenderer
          key={`${block.type}-${i}`}
          region={block.type as CaseStudyBlockType}
          data={block.data}
          isEditing={false}
        />
      ))}
    </article>
  )
}
