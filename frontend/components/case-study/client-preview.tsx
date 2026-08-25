"use client"

import type { CaseStudyBlock } from "@/service/http/case-study"
import { ScrollArea, ScrollBar } from "@/components/ui"
import CaseStudyViewer from "./case-study-viewer"

/**
 * Client View — the in-editor preview of how a client will see this case
 * study once published. It's the scrollable body rendered inside the popup
 * CaseStudyEditor opens over the editor page — the popup's header
 * (EditorPreviewBar: title, saved-at, Edit, Publish, close) lives one level
 * up since it's editor chrome, not part of what a client would see. This
 * component itself renders only the read-only case study content
 * SectionRenderer produces — no site navbar, no "more from this talent"
 * carousel, no profile/collaboration sidebar — those belong to the real
 * published page (public-view-page.tsx), not this preview.
 *
 * This is the editor's only preview mode — there is no separate talent view.
 */
export function ClientPreview({
  blocks,
}: {
  blocks: CaseStudyBlock[]
}) {
  return (
    <ScrollArea
      className="flex-1 min-h-0 flex flex-col"
      viewportClassName="flex-1 min-h-0"
      type="always"
      scrollBar={<ScrollBar className="w-4 px-1 bg-gray-50" />}
    >
      <div className="px-[100px] py-[100px]">
        <CaseStudyViewer blocks={blocks} />
      </div>
    </ScrollArea>
  )
}
