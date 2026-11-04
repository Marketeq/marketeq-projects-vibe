"use client"

import React, { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { Reorder, motion, useDragControls, useMotionValue } from "framer-motion"
import { getId } from "@/utils/functions"
import {
  CaseStudyAPI,
  type CaseStudy,
  type CaseStudyStatus,
} from "@/service/http/case-study"
import {
  buildColumnsData,
  collectCaseStudyText,
  regionsToSchemaJson,
  DEFAULT_CASE_STUDY_TITLE,
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

/**
 * Everything undo/redo restores: the blocks plus the title and description.
 * Transient UI (validation errors, which dialog is open, the saved-at chip)
 * deliberately stays outside — undo moves the document back, not the editor
 * chrome.
 */
interface Doc {
  regions: EditorRegion[]
  title: string
  description: string
}

interface State {
  past: Doc[]
  present: Doc
  future: Doc[]
  /**
   * Bumped on every undo/redo. Section components initialise their own form
   * state from the `data` prop and never read it again, so restoring a
   * document has to remount them — this rides along in their React key to
   * force that. Editing doesn't bump it: a keystroke must not remount the
   * field being typed in.
   */
  epoch: number
  /**
   * Block ids that have already announced their data shape in the current
   * epoch. Every section announces exactly once from a mount effect, before
   * the user can touch it, so the first update-data a block sends after a
   * (re)mount is that announcement and any later one is a real edit.
   */
  announced: number[]
  /**
   * The coalesce key and timestamp of the last recorded edit. Consecutive
   * edits that share a key and land within COALESCE_MS collapse into the
   * existing history entry, so typing a sentence is one undo step rather
   * than one per keystroke.
   */
  lastKey: string | null
  lastAt: number
}

type Action =
  | {
      type: "add"
      payload: CaseStudyBlockType
      data?: Record<string, unknown>
      /**
       * Where to put the new block. Omitted (or out of range) appends to the
       * end — what the trailing "+" divider and the empty-canvas InitialBlock
       * want. A "+" divider sitting above block i passes i, so the new block
       * lands in that gap instead of at the bottom of the canvas.
       */
      index?: number
    }
  | { type: "reorder"; payload: EditorRegion[] }
  | { type: "hydrate"; payload: Doc }
  | { type: "remove"; payload: number }
  | { type: "duplicate"; payload: number }
  | { type: "move-up"; payload: number }
  | { type: "move-down"; payload: number }
  | { type: "update-data"; payload: { id: number; data: Record<string, unknown> } }
  | { type: "set-title"; payload: string }
  | { type: "set-description"; payload: string }
  | { type: "undo" }
  | { type: "redo" }

/**
 * Applies one edit to the document. Returns the same object it was given
 * when an action is a no-op (moving the first block up, removing an id that
 * isn't there) — the history wrapper uses that identity check to avoid
 * recording an undo step for an edit that changed nothing.
 */
function docReducer(state: Doc, action: Action): Doc {
  switch (action.type) {
    case "add": {
      const block: EditorRegion = {
        id: getId(),
        region: action.payload,
        data: action.data,
      }
      const at =
        action.index === undefined
          ? state.regions.length
          : Math.max(0, Math.min(action.index, state.regions.length))
      const regions = [...state.regions]
      regions.splice(at, 0, block)
      return { ...state, regions }
    }

    case "reorder":
      return { ...state, regions: action.payload }

    case "hydrate":
      return action.payload

    case "set-title":
      return state.title === action.payload
        ? state
        : { ...state, title: action.payload }

    case "set-description":
      return state.description === action.payload
        ? state
        : { ...state, description: action.payload }

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

/** How many undo steps are kept. Older entries fall off the back. */
const HISTORY_LIMIT = 100
/**
 * Edits of the same kind landing within this window join the previous undo
 * step instead of creating their own. Long enough that normal typing reads
 * as one step, short enough that a pause starts a new one.
 */
const COALESCE_MS = 600

/**
 * Block data is whatever ends up in schemaJson, so it is always
 * JSON-serialisable and comparing it this way is safe. Key order is stable
 * because updates merge into the existing object.
 */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Identifies runs of edits that should collapse into a single undo step —
 * keystrokes in the same field, or repeated changes to the same keys of the
 * same block. Structural edits (add, remove, reorder, duplicate, move)
 * return null: each one is its own step, however fast they arrive.
 */
function coalesceKey(action: Action): string | null {
  switch (action.type) {
    case "set-title":
      return "set-title"
    case "set-description":
      return "set-description"
    case "update-data":
      return `update-data:${action.payload.id}:${Object.keys(action.payload.data)
        .sort()
        .join(",")}`
    default:
      return null
  }
}

/**
 * Wraps docReducer in past/present/future stacks so the top bar's undo and
 * redo arrows have something to act on. `hydrate` (the initial load) starts
 * a fresh history rather than becoming an undoable step — there is nothing
 * before the document the user opened.
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "undo": {
      if (state.past.length === 0) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        epoch: state.epoch + 1,
        announced: [],
        lastKey: null,
        lastAt: 0,
      }
    }

    case "redo": {
      if (state.future.length === 0) return state
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
        epoch: state.epoch + 1,
        announced: [],
        lastKey: null,
        lastAt: 0,
      }
    }

    case "hydrate":
      return {
        past: [],
        present: action.payload,
        future: [],
        epoch: state.epoch + 1,
        announced: [],
        lastKey: null,
        lastAt: 0,
      }

    default: {
      const present = docReducer(state.present, action)
      if (present === state.present) return state

      // A section announcing its shape on mount isn't an edit — apply it,
      // but leave the undo and redo stacks exactly as they were. Recording
      // it would add a phantom undo step after adding a block and, worse,
      // the announcements that follow an undo would clear the redo stack the
      // user just filled.
      if (action.type === "update-data") {
        const id = action.payload.id
        const before = state.present.regions.find((r) => r.id === id)
        const after = present.regions.find((r) => r.id === id)
        // Nothing actually changed. A section announces more than once per
        // mount — its watched values settle a render after the first — so
        // this drops every echo after the one that lands.
        if (before && after && sameValue(before.data, after.data)) return state
        // The announcement itself: absorb the values, leave the stacks alone.
        if (!state.announced.includes(id)) {
          return { ...state, present, announced: [...state.announced, id] }
        }
      }

      const key = coalesceKey(action)
      const at = Date.now()
      // A new edit invalidates anything that was undone: redo only makes
      // sense while the user is still walking the same line of history.
      const coalesce =
        key !== null && key === state.lastKey && at - state.lastAt < COALESCE_MS
      return {
        past: coalesce
          ? state.past
          : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present,
        future: [],
        epoch: state.epoch,
        announced: state.announced,
        lastKey: key,
        lastAt: at,
      }
    }
  }
}

const emptyDoc: Doc = { regions: [], title: "", description: "" }

const defaultValue: State = {
  past: [],
  present: emptyDoc,
  future: [],
  epoch: 0,
  announced: [],
  lastKey: null,
  lastAt: 0,
}

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
        {/*
          `relative z-20` + `opacity-0` (rather than `invisible`) are both
          load-bearing here, not styling. The invisible hover-bridge span
          below starts at -top-16 — 64px above this block — so it blankets
          the bottom two thirds of this 41px plus button. It is a later
          sibling at the same z-index, so it used to win the hit test:
          approaching the "+" from the block below, the pointer hit the
          bridge, the spacer never registered as hovered, the divider stayed
          hidden, and any click went to the bridge. Only the top ~6px of the
          button responded. z-20 puts the divider above the bridge; opacity
          instead of visibility keeps it hit-testable while hidden, since a
          `visibility: hidden` element takes no pointer events at all and so
          could never be the thing that triggers its own reveal. The divider
          band sits at -70.5px..-29.5px and the toolbar at ~-40px..0, so
          the two overlap by ~8px at the top of the toolbar — hence
          `pointer-events-none` on the row with it re-enabled on the button
          alone: the lifted, always-hit-testable footprint is just the 41px
          circle in the middle of the canvas, nowhere near the toolbar at
          the right edge.
        */}
        <div className="relative z-20 opacity-0 group-hover/spacer:opacity-100 pointer-events-none [&_button]:pointer-events-auto">
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
 * Undo/redo run off past/present/future stacks of the whole document (see
 * `Doc` and `reducer`): every block edit plus the title and description.
 * Keystroke runs in one field collapse into a single step, structural edits
 * are one step each, and loading the case study starts a fresh history.
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
  // The document the editor is currently showing. Undo/redo swap which Doc
  // is `present`, so everything below reads through it rather than holding
  // its own copy.
  const { regions, title, description } = state.present
  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0
  const [open, setOpen] = useState(false)
  const [columnPickerOpen, setColumnPickerOpen] = useState(false)
  // Which slot the block picker is currently adding into. Set by whichever
  // "+" was clicked, read when the pick finally resolves — which can be one
  // or two dialogs later, since "Custom columns" hands off to
  // ColumnLayoutPicker (and that can hand back to the template dialog).
  // Deliberately not cleared when a dialog closes, only after the block is
  // added: the handoff closes the template dialog mid-flow.
  const [insertIndex, setInsertIndex] = useState<number | undefined>(undefined)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  // The title starts empty on purpose: the field shows a placeholder and the
  // user has to type their own title before the case study can be published.
  // `projectName` is only the fallback label for the top bars and the draft
  // record's server-side title, never a prefilled value in the input.
  // The title has no inline error state here — an empty or over-length title
  // is reported by the publish dialog, which owns the title field at publish
  // time. Duplicating it in the canvas showed the same message twice.
  const [descriptionError, setDescriptionError] = useState(false)
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

  /** Opens the block picker, remembering which gap the "+" belongs to. */
  const openBlockPicker = (index?: number) => {
    setInsertIndex(index)
    setOpen(true)
  }

  useEffect(() => {
    autoResizeTextarea(titleTextareaRef.current)
  }, [title])

  useEffect(() => {
    autoResizeTextarea(descriptionTextareaRef.current)
  }, [description])

  // A failed publish attempt can happen while scrolled far down the canvas
  // (or from the in-preview popup, which sits above the whole page as an
  // overlay) — closing the popup alone dropped the user back on the editor
  // with no visual cue where the error actually was. Scroll/focus the
  // description field into view whenever its error turns on so the error
  // is never off-screen.
  useEffect(() => {
    if (!descriptionError || isPreview) return
    const el = descriptionTextareaRef.current
    if (!el) return
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    el.focus({ preventScroll: true })
  }, [descriptionError, isPreview])

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
          setStatus(cs.status)
          dispatch({
            type: "hydrate",
            payload: {
              regions: schemaJsonToRegions(cs.schemaJson, getId),
              // A case study is created under DEFAULT_CASE_STUDY_TITLE
              // because the API demands a non-empty title, but that text is a
              // placeholder, not something the user wrote — so the field opens
              // empty and the placeholder shows through, forcing a real title
              // before publishing.
              title: cs.title === DEFAULT_CASE_STUDY_TITLE ? "" : cs.title,
              description: cs.description ?? "",
            },
          })
        } else {
          // The backend requires a non-empty title; the draft is created
          // under the placeholder text while the input stays empty for the user.
          const { data: cs } = await CaseStudyAPI.Create({
            title: DEFAULT_CASE_STUDY_TITLE,
          })
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
      // An empty title is a valid in-progress state in the editor but not a
      // valid value to save (the API rejects it), so it's left out entirely
      // and the draft keeps whatever title it already has.
      await CaseStudyAPI.Update(id, {
        ...(title.trim() ? { title } : {}),
        description,
        schemaJson: regionsToSchemaJson(regions),
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
  }, [title, description, regions, isReady, id])

  const handlePublish = async (details: PublishDetails) => {
    if (!id || isPublishing) return
    setIsPublishing(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    try {
      await CaseStudyAPI.Update(id, {
        title: details.title,
        description,
        schemaJson: regionsToSchemaJson(regions),
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
      dispatch({ type: "set-title", payload: cs.title })
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

  // Plain-text digest of everything the case study says — handed to the
  // publish dialog so its skill suggestions come from this project's actual
  // content rather than a fixed list. Recomputed only when the content
  // changes, not on every keystroke elsewhere in the editor.
  const contentText = useMemo(
    () =>
      collectCaseStudyText(
        regionsToSchemaJson(regions).blocks,
        title,
        description
      ),
    [regions, title, description]
  )

  // Gates the publish dialog on a non-empty description. Called from both
  // Publish entry points below (the main EditorTopBar and the in-preview
  // EditorPreviewBar) so neither can bypass the check. The description
  // field itself only exists in the main canvas, not the preview popup —
  // so a failed check also exits preview, otherwise the inline error would
  // render behind a bar the user can't see.
  // The title is deliberately not gated here: the publish dialog carries its
  // own title field and reports an empty one on submit, so blocking the
  // dialog on the title would leave the Publish button doing nothing visible.
  const handleOpenPublish = () => {
    const isDescriptionValid = description.trim().length > 0
    setDescriptionError(!isDescriptionValid)
    if (!isDescriptionValid) {
      setIsPreview(false)
      return
    }
    setPublishDialogOpen(true)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <EditorTopBar
        projectName={title || projectName}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => dispatch({ type: "undo" })}
        onRedo={() => dispatch({ type: "redo" })}
        lastSavedAt={lastSavedAt}
        isPreview={isPreview}
        onPreviewToggle={() => setIsPreview((v) => !v)}
        onPublish={handleOpenPublish}
        hasPublishError={descriptionError}
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
                      placeholder={DEFAULT_CASE_STUDY_TITLE}
                      onChange={(e) => {
                        const value = e.currentTarget.value.replace(
                          /\b\w/g,
                          (char) => char.toUpperCase()
                        )
                        // Still capped at TITLE_MAX_LENGTH, silently — the
                        // publish dialog is what tells the user they hit the
                        // limit.
                        dispatch({
                          type: "set-title",
                          payload: value.slice(0, TITLE_MAX_LENGTH),
                        })
                      }}
                      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[64px] leading-tight text-dark-blue-400 font-semibold placeholder:text-gray-500 focus-visible:outline-none focus:ring-0"
                    />
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
                      onChange={(e) => {
                        const value = e.currentTarget.value
                        dispatch({ type: "set-description", payload: value })
                        if (value.trim()) setDescriptionError(false)
                      }}
                      className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-2xl leading-snug font-light text-dark-blue-400 placeholder:text-gray-500 focus-visible:outline-none focus:ring-0"
                    />
                    {descriptionError && (
                      <p className="mt-1 text-sm font-medium text-error-500">
                        Please add a description.
                      </p>
                    )}
                  </div>
                </div>
              </TitleDescriptionBlock>

              {regions.length === 0 ? (
                <div className="mt-[100px]">
                  <InitialBlock onAddBlock={() => openBlockPicker()} />
                </div>
              ) : (
                <Reorder.Group
                  as="div"
                  className="isolate relative"
                  axis="y"
                  values={regions}
                  onReorder={(newRegions) => {
                    dispatch({ type: "reorder", payload: newRegions })
                  }}
                >
                  {regions.map((region, index) => (
                    <BlockRoot
                      key={region.id}
                      value={region}
                      onAdd={() => openBlockPicker(index)}
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
                      isLast={index === regions.length - 1}
                    >
                      <SectionRenderer
                        key={`${region.id}-${state.epoch}`}
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

              {regions.length > 0 && (
                <div className="mt-[100px]">
                  <AddBlockDivider.Horizontal onPlus={() => openBlockPicker()} />
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
              onPublish={handleOpenPublish}
              hasPublishError={descriptionError}
              onClose={() => setIsPreview(false)}
            />

            <ClientPreview
              blocks={regionsToSchemaJson(regions).blocks}
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
          dispatch({ type: "add", payload: type, index: insertIndex })
          setInsertIndex(undefined)
        }}
      />

      <ColumnLayoutPicker
        open={columnPickerOpen}
        onOpenChange={setColumnPickerOpen}
        onSelect={(widths) => {
          dispatch({
            type: "add",
            payload: "custom-columns",
            data: buildColumnsData(widths) as unknown as Record<string, unknown>,
            index: insertIndex,
          })
          setInsertIndex(undefined)
        }}
        onUseTemplate={() => {
          setColumnPickerOpen(false)
          setOpen(true)
        }}
      />

      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title={title}
        content={contentText}
        onPublish={handlePublish}
        publishing={isPublishing}
      />
    </div>
  )
}
