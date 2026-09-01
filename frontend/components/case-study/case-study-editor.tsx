"use client"

import React, { useEffect, useReducer, useRef, useState } from "react"
import { Reorder, motion, useDragControls, useMotionValue } from "framer-motion"
import { getId } from "@/utils/functions"
import {
  CaseStudyAPI,
  type CaseStudy,
  type CaseStudyStatus,
} from "@/service/http/case-study"
import {
  buildColumnsData,
  regionsToSchemaJson,
  schemaJsonToRegions,
  type CaseStudyBlockType,
  type EditorRegion,
} from "@/lib/case-study-mapper"
import { useToast } from "@/components/ui"
import { BlockToolbar } from "./toolbars"
import { AddBlockDivider } from "./add-block-divider"
import { InitialBlock } from "./initial-block"
import { SECTION_TYPE_LABELS, TemplateDialog } from "./template-dialog"
import { ColumnLayoutPicker } from "./column-layout-picker"
import { PublishDialog, type PublishDetails } from "./publish-dialog"
import { SectionRenderer } from "./section-renderer"
import { EditorTopBar } from "./editor-top-bar"
import { EditorPreviewBar } from "./editor-preview-bar"
import { ClientPreview } from "./client-preview"

interface State {
  regions: EditorRegion[]
}

type Action =
  | {
      type: "add"
      payload: CaseStudyBlockType
      data?: Record<string, unknown>
    }
  | { type: "reorder"; payload: EditorRegion[] }
  | { type: "hydrate"; payload: EditorRegion[] }
  | { type: "remove"; payload: number }
  | { type: "duplicate"; payload: number }
  | { type: "move-up"; payload: number }
  | { type: "move-down"; payload: number }
  | { type: "update-data"; payload: { id: number; data: Record<string, unknown> } }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      return {
        ...state,
        regions: [
          ...state.regions,
          { id: getId(), region: action.payload, data: action.data },
        ],
      }

    case "reorder":
      return { ...state, regions: action.payload }

    case "hydrate":
      return { ...state, regions: action.payload }

    case "update-data":
      return {
        ...state,
        regions: state.regions.map((r) =>
          r.id === action.payload.id
            ? { ...r, data: { ...r.data, ...action.payload.data } }
            : r
        ),
      }

    case "remove":
      return {
        ...state,
        regions: state.regions.filter((r) => r.id !== action.payload),
      }

    case "duplicate": {
      const idx = state.regions.findIndex((r) => r.id === action.payload)
      if (idx === -1) return state
      const original = state.regions[idx]
      const copy: EditorRegion = { id: getId(), region: original.region, data: original.data }
      const newRegions = [...state.regions]
      newRegions.splice(idx + 1, 0, copy)
      return { ...state, regions: newRegions }
    }

    case "move-up": {
      const idx = state.regions.findIndex((r) => r.id === action.payload)
      if (idx <= 0) return state
      const newRegions = [...state.regions]
      ;[newRegions[idx - 1], newRegions[idx]] = [
        newRegions[idx],
        newRegions[idx - 1],
      ]
      return { ...state, regions: newRegions }
    }

    case "move-down": {
      const idx = state.regions.findIndex((r) => r.id === action.payload)
      if (idx === -1 || idx >= state.regions.length - 1) return state
      const newRegions = [...state.regions]
      ;[newRegions[idx], newRegions[idx + 1]] = [
        newRegions[idx + 1],
        newRegions[idx],
      ]
      return { ...state, regions: newRegions }
    }

    default:
      return state
  }
}

const defaultValue: State = { regions: [] }

const CANVAS_WIDTH = 1240
// The talent-view preview popup (Figma "Frame 1948757393") is a fixed
// 1340px frame — independent of the editor canvas width above.
const PREVIEW_WIDTH = 1340
const TITLE_MAX_LENGTH = 120

// Grows a textarea to fit its content so title/description always show
// every line while typing, instead of scrolling sideways in a fixed-height
// box. Driven by a useEffect keyed on the field's value (below) rather than
// an input handler, so it also sizes correctly the moment a loaded case
// study's title/description are hydrated in, not just on keystrokes.
function autoResizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

/** Per-region editor chrome: drag handle, hover outline, move/duplicate/remove toolbar. */
function BlockRoot({
  children,
  value,
  onAdd,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  children?: React.ReactNode
  value: EditorRegion
  onAdd?: () => void
  onRemove?: () => void
  onDuplicate?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst?: boolean
  isLast?: boolean
}) {
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={value}
      as="div"
      className="mt-[100px] group relative"
      style={{ y }}
      dragControls={dragControls}
      dragListener={false}
    >
      <div className="-top-[100px] h-[100px] flex flex-col justify-center inset-x-0 absolute group/spacer">
        <div className="group-hover/spacer:visible invisible">
          <AddBlockDivider.Horizontal onPlus={onAdd} />
        </div>
      </div>
      <motion.div className="absolute rounded-lg border-2 -inset-5 bg-white border-primary-500 hidden group-hover:block group-hover:group-focus-within:opacity-0 group-hover:group-focus-within:hidden group-has-[.child-card:hover]:!hidden" />

      {/*
        Invisible hover-bridge: purely-functional, unstyled twin of the
        highlight span below, sized to fully contain BlockToolbar's
        rendered footprint (offset -top-[20px] -right-[17px] from that
        span, which only extends -inset-5/20px). Without this, moving the
        pointer from the block into the toolbar crosses a gap the "group"
        hover state doesn't cover, so the toolbar vanishes (display:none)
        a beat before the click lands and clicks fall through to
        whatever's behind it. Kept separate from the visual span (instead
        of just enlarging that span) so the toolbar's rendered position
        stays exactly where the design puts it.
      */}
      <span className="absolute -top-16 -right-16 -bottom-5 -left-5 hidden group-hover:block group-has-[.child-card:hover]:!hidden" />

      <span className="absolute -inset-5 group-hover:inline-block opacity-0 hidden group-focus-within:opacity-0 group-hover:group-focus-within:opacity-0 group-focus-within:hidden group-hover:group-focus-within:hidden group-hover:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover:bg-primary-500/5 group-focus-within:bg-transparent group-hover:group-focus-within:bg-transparent group-hover:border-primary-200 group-has-[.child-card:hover]:!hidden">
        <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within:invisible group-hover:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover:group-focus-within:invisible">
          {SECTION_TYPE_LABELS[value.region] ?? "Block"}
        </span>
        <BlockToolbar
          className="group-hover:opacity-100 group-hover:inline-flex hidden opacity-0 transition duration-300 -top-[20px] -right-[17px] absolute z-10"
          canRemove
          canDuplicate
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onDrag={(event) => dragControls.start(event)}
          canMoveDown={!isLast}
          canMoveUp={!isFirst}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      </span>

      <div className="relative">{children}</div>
    </Reorder.Item>
  )
}

/**
 * Same hover-highlight border as BlockRoot gives every content block, so the
 * title/description area reads as "a block" visually — but with none of
 * BlockRoot's chrome: no drag handle, no label, no move/duplicate/remove
 * toolbar. This isn't a region in state.regions, so there's nothing for
 * those controls to act on.
 */
function TitleDescriptionBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="group relative">
      <span className="absolute -inset-5 rounded-lg border-2 border-transparent transition duration-300 group-hover:border-primary-500 group-hover:bg-primary-500/5 group-focus-within:border-primary-500 group-focus-within:bg-transparent" />
      <div className="relative">{children}</div>
    </div>
  )
}

/**
 * The case study builder. Replaces the old 4,496-line
 * components/case-study-builder.tsx monolith — section content lives in
 * components/case-study/sections/*, dispatched through SectionRenderer, and
 * the top bar lives in editor-top-bar.tsx.
 *
 * The undo/redo buttons are present but always disabled: the original
 * monolith's undo/redo buttons had no click handlers either (no history
 * stack ever existed), so this preserves that behavior rather than quietly
 * pretending undo/redo works. Wiring real history is a separate feature.
 *
 * The preview toggle opens a popup over the editor canvas (the canvas stays
 * mounted underneath): EditorPreviewBar as the header (title, saved-at,
 * Edit, Publish, close) and ClientPreview as the scrollable body — the same
 * read-only rendering SectionRenderer produces for the public viewer
 * (isEditing=false). There is only this one preview — no separate "talent
 * view" and no surrounding marketplace page chrome (site navbar, other-work
 * carousel, profile/collaboration sidebar) — since what matters here is a
 * quick look at the content a client will scroll through, not a mock of the
 * whole page.
 */
export default function CaseStudyEditor({
  onClose,
  onSave,
  caseStudyId,
  onPublished,
  projectName = "Untitled Case Study",
}: {
  onClose?: () => void
  onSave?: () => void
  caseStudyId?: string
  onPublished?: (caseStudy: CaseStudy) => void
  projectName?: string
}) {
  const [state, dispatch] = useReducer(reducer, defaultValue)
  const [open, setOpen] = useState(false)
  const [columnPickerOpen, setColumnPickerOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [title, setTitle] = useState(projectName)
  const [titleError, setTitleError] = useState(false)
  const [description, setDescription] = useState("")
  const [id, setId] = useState<string | undefined>(caseStudyId)
  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<CaseStudyStatus>("draft")
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  )
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    autoResizeTextarea(titleTextareaRef.current)
  }, [title])

  useEffect(() => {
    autoResizeTextarea(descriptionTextareaRef.current)
  }, [description])

  // Create (new) or load (existing) the case study once on mount, against
  // the real backend. A load failure leaves the dialog open but empty
  // (surfaced via toast); a create failure closes the editor outright since
  // there's no id to attach any further edits to.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (caseStudyId) {
          const { data: cs } = await CaseStudyAPI.Get(caseStudyId)
          if (cancelled) return
          setId(cs.id)
          setTitle(cs.title)
          setDescription(cs.description ?? "")
          setStatus(cs.status)
          dispatch({
            type: "hydrate",
            payload: schemaJsonToRegions(cs.schemaJson, getId),
          })
        } else {
          const { data: cs } = await CaseStudyAPI.Create({ title })
          if (cancelled) return
          setId(cs.id)
        }
        if (!cancelled) setIsReady(true)
      } catch (err) {
        if (cancelled) return
        toast({
          title: caseStudyId ? "Couldn't load case study" : "Couldn't create case study",
          description: "Please try again.",
        })
        if (!caseStudyId) onClose?.()
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveNow = async () => {
    if (!id) return
    try {
      await CaseStudyAPI.Update(id, {
        title,
        description,
        schemaJson: regionsToSchemaJson(state.regions),
      })
      setLastSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      )
    } catch (err) {
      toast({
        title: "Couldn't save changes",
        description: "Your latest edits may not be saved. Please check your connection.",
      })
    }
  }

  // Debounced autosave whenever the title, description, or block content changes.
  useEffect(() => {
    if (!isReady || !id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveNow()
    }, 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, state.regions, isReady, id])

  const handlePublish = async (details: PublishDetails) => {
    if (!id || isPublishing) return
    setIsPublishing(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try {
      await CaseStudyAPI.Update(id, {
        title: details.title,
        description,
        schemaJson: regionsToSchemaJson(state.regions),
      })
      const { data: cs } = await CaseStudyAPI.Publish(id, {
        coverImage: details.coverImage,
        coverImageZoom: details.coverImageZoom,
        coverImageRotation: details.coverImageRotation,
        coverImageOffsetX: details.coverImageOffsetX,
        coverImageOffsetY: details.coverImageOffsetY,
        skills: details.skills,
      })
      setLastSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      )
      setTitle(cs.title)
      setStatus(cs.status)
      setPublishDialogOpen(false)
      toast({
        title: "Case study published",
        description: `"${cs.title}" is now visible on your profile.`,
      })
      onPublished?.(cs)
    } catch (err) {
      toast({
        title: "Couldn't publish case study",
        description: "Please try again.",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <EditorTopBar
        projectName={title || projectName}
        canUndo={false}
        canRedo={false}
        lastSavedAt={lastSavedAt}
        isPreview={isPreview}
        onPreviewToggle={() => setIsPreview((v) => !v)}
        onPublish={() => setPublishDialogOpen(true)}
        onClose={onClose}
      />

      <div className="flex-1 overflow-auto relative">
        <div
          className="mx-auto my-[100px]"
          style={{ maxWidth: CANVAS_WIDTH }}
        >
          <div className="bg-white rounded-xl shadow-sm min-h-[calc(100vh-268px)]">
            <div className="p-[100px]">
              <TitleDescriptionBlock>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="case-study-title" className="sr-only">
                      Case study title
                    </label>
                    <textarea
                      id="case-study-title"
                      ref={titleTextareaRef}
                      rows={1}
                      value={title}
                      placeholder="Your Case Study Title"
                      onChange={(e) => {
                        const value = e.currentTarget.value.replace(
                          /\b\w/g,
                          (char) => char.toUpperCase()
                        )
                        if (value.length > TITLE_MAX_LENGTH) {
                          setTitleError(true)
                          setTitle(value.slice(0, TITLE_MAX_LENGTH))
                        } else {
                          setTitleError(false)
                          setTitle(value)
                        }
                      }}
                      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[64px] leading-tight text-dark-blue-400 font-semibold placeholder:text-gray-500 focus-visible:outline-none focus:ring-0"
                    />
                    {titleError && (
                      <p className="mt-1 text-sm font-medium text-error-500">
                        Max limit reached 120 characters
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="case-study-description" className="sr-only">
                      Case study description
                    </label>
                    <textarea
                      id="case-study-description"
                      ref={descriptionTextareaRef}
                      rows={1}
                      value={description}
                      placeholder="Write what into this design or add any details you want to mention"
                      onChange={(e) => setDescription(e.currentTarget.value)}
                      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-2xl leading-snug font-light text-dark-blue-400 placeholder:text-gray-500 focus-visible:outline-none focus:ring-0"
                    />
                  </div>
                </div>
              </TitleDescriptionBlock>

              {state.regions.length === 0 ? (
                <div className="mt-[100px]">
                  <InitialBlock onAddBlock={() => setOpen(true)} />
                </div>
              ) : (
                <Reorder.Group
                  as="div"
                  className="isolate relative"
                  axis="y"
                  values={state.regions}
                  onReorder={(newRegions) => {
                    dispatch({ type: "reorder", payload: newRegions })
                  }}
                >
                  {state.regions.map((region, index) => (
                    <BlockRoot
                      key={region.id}
                      value={region}
                      onAdd={() => setOpen(true)}
                      onRemove={() =>
                        dispatch({ type: "remove", payload: region.id })
                      }
                      onDuplicate={() =>
                        dispatch({ type: "duplicate", payload: region.id })
                      }
                      onMoveUp={() =>
                        dispatch({ type: "move-up", payload: region.id })
                      }
                      onMoveDown={() =>
                        dispatch({ type: "move-down", payload: region.id })
                      }
                      isFirst={index === 0}
                      isLast={index === state.regions.length - 1}
                    >
                      <SectionRenderer
                        region={region.region}
                        data={region.data}
                        isEditing
                        onDataChange={(data) =>
                          dispatch({
                            type: "update-data",
                            payload: { id: region.id, data },
                          })
                        }
                      />
                    </BlockRoot>
                  ))}
                </Reorder.Group>
              )}

              {state.regions.length > 0 && (
                <div className="mt-[100px]">
                  <AddBlockDivider.Horizontal onPlus={() => setOpen(true)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 md:p-10">
          <div className="w-full max-h-[90vh] flex flex-col bg-white rounded-[10px] border border-gray-200 shadow-xl overflow-hidden" style={{ maxWidth: PREVIEW_WIDTH }}>
            <EditorPreviewBar
              projectName={title || projectName}
              lastSavedAt={lastSavedAt}
              onEdit={() => setIsPreview(false)}
              onPublish={() => setPublishDialogOpen(true)}
              onClose={() => setIsPreview(false)}
            />

            <ClientPreview
              blocks={regionsToSchemaJson(state.regions).blocks}
            />
          </div>
        </div>
      ) : null}

      <TemplateDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(type) => {
          if (type === "custom-columns") {
            setColumnPickerOpen(true)
            return
          }
          dispatch({ type: "add", payload: type })
        }}
      />

      <ColumnLayoutPicker
        open={columnPickerOpen}
        onOpenChange={setColumnPickerOpen}
        onSelect={(widths) =>
          dispatch({
            type: "add",
            payload: "custom-columns",
            data: buildColumnsData(widths) as unknown as Record<string, unknown>,
          })
        }
        onUseTemplate={() => {
          setColumnPickerOpen(false)
          setOpen(true)
        }}
      />

      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title={title}
        onPublish={handlePublish}
        publishing={isPublishing}
      />
    </div>
  )
}
