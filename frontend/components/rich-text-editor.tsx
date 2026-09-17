"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { ProjectAPI } from "@/service/http/project"
import { cn } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  ChevronDown,
  Clock,
  Edit03,
  Eye,
  Image as ImageIcon,
  Lock01,
  LockUnlocked01,
  MagicWand01,
  Maximize01,
  Minimize01,
  Trash01,
  Type02,
  Upload,
  X,
} from "@blend-metrics/icons"
import { Extension, isAtStartOfNode, isNodeActive } from "@tiptap/core"
import ImageExtension from "@tiptap/extension-image"
import UnderlineExtension from "@tiptap/extension-underline"
import { Editor, EditorContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Italic,
  OrderedList,
  StrikeThrough,
  ToCenter,
  ToLeft,
  ToRight,
  Underline,
  UnorderedList,
} from "@/components/icons/editing-icons"
import {
  FontSizeExtension,
  type FontSizeVariant,
} from "@/components/tiptap-font-size"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  ImageEditor,
  RmDialog,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui"

type ImageAlignValue = "left" | "right" | "full-width"

const DEFAULT_IMAGE_ALIGN: ImageAlignValue = "full-width"
const RICH_TEXT_IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
const RICH_TEXT_IMAGE_UPLOAD_TARGET_BYTES = 8 * 1024 * 1024
const RICH_TEXT_IMAGE_UPLOAD_MAX_DIMENSION = 3840
const RICH_TEXT_HISTORY_LIMIT = 200
const EMPTY_RICH_TEXT_PARAGRAPH_PATTERN =
  /<p>(?:\s|&nbsp;|<br\s*\/?>|<br[^>]*class=(["'])ProseMirror-trailingBreak\1[^>]*>)*<\/p>/gi

const normalizeRichTextHtml = (value: string) => {
  if (!value.trim()) {
    return ""
  }

  const normalizedEmptyParagraph = "<p></p>"

  return value
    .replace(EMPTY_RICH_TEXT_PARAGRAPH_PATTERN, normalizedEmptyParagraph)
    .replace(/(?:<p><\/p>\s*){2,}/gi, `${normalizedEmptyParagraph}\n`)
    .replace(/^(?:\s*<p><\/p>)+/i, "")
    .replace(/(?:<p><\/p>\s*)+$/i, "")
    .trim()
}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => resolve(reader.result as string))
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Unable to read image."))
    })
    reader.readAsDataURL(blob)
  })

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Unable to load image."))
    image.src = src
  })

const getUploadMimeType = (file: File) => {
  if (file.type === "image/png" || file.type === "image/webp") {
    return "image/webp"
  }

  return "image/jpeg"
}

const ensureFileExtension = (fileName: string, mimeType: string) => {
  const baseName = fileName.replace(/\.[a-z0-9]+$/i, "")

  if (mimeType === "image/webp") {
    return `${baseName}.webp`
  }

  return `${baseName}.jpg`
}

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error("Unable to resize image."))
      },
      mimeType,
      quality
    )
  })

const prepareRichTextImageUpload = async (file: File) => {
  if (
    typeof window === "undefined" ||
    (file.size <= RICH_TEXT_IMAGE_UPLOAD_TARGET_BYTES &&
      file.type !== "image/gif")
  ) {
    return {
      file,
      wasResized: false,
    }
  }

  const dataUrl = await readBlobAsDataUrl(file)
  const image = await loadImageElement(dataUrl)
  const outputMimeType = getUploadMimeType(file)
  const outputFileName = ensureFileExtension(file.name, outputMimeType)
  const maxDimension = Math.max(image.naturalWidth, image.naturalHeight)
  const baseScale =
    maxDimension > RICH_TEXT_IMAGE_UPLOAD_MAX_DIMENSION
      ? RICH_TEXT_IMAGE_UPLOAD_MAX_DIMENSION / maxDimension
      : 1
  const qualitySteps = [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56]

  let scale = baseScale
  let bestBlob: Blob | null = null

  while (scale >= 0.35) {
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Unable to resize image.")
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(canvas, outputMimeType, quality)

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob
      }

      if (blob.size <= RICH_TEXT_IMAGE_UPLOAD_TARGET_BYTES) {
        return {
          file: new File([blob], outputFileName, {
            type: outputMimeType,
            lastModified: Date.now(),
          }),
          wasResized: true,
        }
      }
    }

    scale *= 0.85
  }

  if (!bestBlob) {
    return {
      file,
      wasResized: false,
    }
  }

  return {
    file: new File([bestBlob], outputFileName, {
      type: outputMimeType,
      lastModified: Date.now(),
    }),
    wasResized: true,
  }
}

const RichTextImageExtension = ImageExtension.extend({
  addAttributes() {
    return {
      ...(typeof this.parent === "function" ? this.parent() : {}),
      align: {
        default: DEFAULT_IMAGE_ALIGN,
        parseHTML: (element) => {
          const value = element.getAttribute("data-align")
          return value === "left" || value === "right" || value === "full-width"
            ? value
            : DEFAULT_IMAGE_ALIGN
        },
        renderHTML: (attributes) => {
          if (!attributes.align) {
            return {}
          }

          return {
            "data-align": attributes.align,
          }
        },
      },
    }
  },
})

const GoogleDocsListBackspace = Extension.create({
  name: "googleDocsListBackspace",
  priority: 1000,
  addKeyboardShortcuts() {
    const liftListItemLikeGoogleDocs = ({ editor }: { editor: Editor }) => {
      if (editor.state.selection.from !== editor.state.selection.to) {
        return false
      }

      if (!isNodeActive(editor.state, "listItem")) {
        return false
      }

      if (!isAtStartOfNode(editor.state)) {
        return false
      }

      return editor.chain().focus().liftListItem("listItem").run()
    }

    return {
      Backspace: liftListItemLikeGoogleDocs,
      "Mod-Backspace": liftListItemLikeGoogleDocs,
    }
  },
})

const selectionHasMark = (
  editor: Editor,
  markName: "bold" | "italic" | "underline" | "strike"
) => {
  const { state } = editor
  const { from, to, empty } = state.selection

  if (empty) {
    return editor.isActive(markName)
  }

  const markType = state.schema.marks[markName]

  if (!markType) {
    return false
  }

  let hasMark = false

  state.doc.nodesBetween(from, to, (node) => {
    if (!node.isText || hasMark) {
      return
    }

    hasMark = node.marks.some((mark) => mark.type === markType)
  })

  return hasMark
}

const selectionHasTextContent = (editor: Editor) => {
  const { state } = editor
  const { from, to, empty } = state.selection

  if (empty || from === to) {
    return false
  }

  return state.doc.textBetween(from, to, "", "").length > 0
}

const getCurrentHeadingLabel = (editor: Editor) => {
  const fontSize = editor.getAttributes("fontSize").size as
    | FontSizeVariant
    | undefined

  if (fontSize === "large-heading") return "Large Heading"
  if (fontSize === "normal-heading") return "Normal Heading"
  if (fontSize === "small-heading") return "Small Heading"

  if (editor.isActive("heading", { level: 1 })) return "Large Heading"
  if (editor.isActive("heading", { level: 2 })) return "Normal Heading"
  if (editor.isActive("heading", { level: 3 })) return "Small Heading"

  return "Normal Text"
}

const formatSavedTime = (value: Date) =>
  value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

const formatRelativeTime = (value: Date) => {
  const seconds = Math.floor((Date.now() - value.getTime()) / 1000)
  if (seconds < 60) return "Edited just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return "Edited 1 min ago"
  if (minutes < 60) return `Edited ${minutes} mins ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return "Edited 1 hour ago"
  return `Edited ${hours} hours ago`
}

const UndoArrowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
    <path
      d="M7.55 5.65 4.7 8.5l2.85 2.85"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.1 8.5c1.25-.02 2.98-.03 5.2-.03 1.95 0 3.47.4 4.56 1.2 1.09.8 1.64 2.06 1.64 3.78 0 .3-.02.62-.06.95"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RedoArrowIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
    <path
      d="M12.45 5.65 15.3 8.5l-2.85 2.85"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.9 8.5c-1.25-.02-2.98-.03-5.2-.03-1.95 0-3.47.4-4.56 1.2-1.09.8-1.64 2.06-1.64 3.78 0 .3.02.62.06.95"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const FullscreenToggleButton = ({
  isFullscreen,
  onClick,
}: {
  isFullscreen: boolean
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}) => {
  const tooltipLabel = isFullscreen ? "Close" : "Edit fullscreen"

  return (
    <TooltipProvider delayDuration={75}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          data-rich-text-fullscreen-toggle="true"
          onClick={onClick}
          className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
        >
          {isFullscreen ? (
            <X className="size-4" />
          ) : (
            <Maximize01 className="size-4" />
          )}
        </TooltipTrigger>
        <TooltipContent side="top" visual="white" sideOffset={8}>
          {tooltipLabel}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const preventToolbarFocusChange = (event: React.MouseEvent<HTMLElement>) => {
  event.preventDefault()
}

const RichTextImageToolbar = ({
  alignment,
  imageSource,
  imageFileName,
  style,
  onEditSave,
  onEditDialogOpenChange,
  onReplace,
  onDelete,
  onAlignChange,
  onMouseEnter,
  onMouseLeave,
  onAlignMenuOpenChange,
  onDeleteDialogOpenChange,
}: {
  alignment: ImageAlignValue
  imageSource: string
  imageFileName: string
  style: React.CSSProperties
  onEditSave: (file: File) => void | Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  onReplace: () => void
  onDelete: () => void
  onAlignChange: (value: ImageAlignValue) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onAlignMenuOpenChange: (open: boolean) => void
  onDeleteDialogOpenChange: (open: boolean) => void
}) => {
  const AlignmentIcon =
    alignment === "left" ? ToLeft : alignment === "right" ? ToRight : ToCenter

  return (
    <div
      data-rich-text-image-toolbar="true"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute z-10 inline-flex overflow-hidden rounded-[5px] border border-gray-300 bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] divide-x divide-gray-300"
    >
      <ImageEditor
        variant="image"
        defaultDataUrl={imageSource}
        defaultFileName={imageFileName}
        editDialogTitle="Edit Image"
        onSaveImage={onEditSave}
        onEditDialogOpenChange={onEditDialogOpenChange}
        startingPoint={({ onEdit }) => (
          <button
            type="button"
            onMouseDown={preventToolbarFocusChange}
            onClick={() => {
              onEditDialogOpenChange(true)
              onEdit()
            }}
            className="inline-flex size-9 shrink-0 items-center justify-center text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none first:rounded-l-[5px]"
            aria-label="Edit image"
          >
            <Edit03 className="size-4" />
          </button>
        )}
      />
      <button
        type="button"
        onMouseDown={preventToolbarFocusChange}
        onClick={onReplace}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-x-2 px-2.5 text-xs font-semibold leading-5 text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none"
      >
        <Upload className="size-4" />
        <span className="whitespace-nowrap">Replace Image</span>
      </button>
      <DropdownMenu onOpenChange={onAlignMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onMouseDown={preventToolbarFocusChange}
            className="inline-flex size-9 shrink-0 items-center justify-center text-gray-500 transition duration-200 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none"
            aria-label="Change image alignment"
          >
            <AlignmentIcon />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-rich-text-image-toolbar-menu="true"
          sideOffset={4}
          align="start"
          className="min-w-[162px] rounded-[10px] border-gray-300 p-1 shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08),0px_4px_6px_-2px_rgba(16,24,40,.03)]"
        >
          <DropdownMenuItem
            icon={<ToLeft />}
            onSelect={() => onAlignChange("left")}
            className={cn(
              "rounded-md",
              alignment === "left" && "bg-gray-50 text-gray-900"
            )}
          >
            Left Align
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<ToRight />}
            onSelect={() => onAlignChange("right")}
            className={cn(
              "rounded-md",
              alignment === "right" && "bg-gray-50 text-gray-900"
            )}
          >
            Right Align
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<ToCenter />}
            onSelect={() => onAlignChange("full-width")}
            className={cn(
              "rounded-md",
              alignment === "full-width" && "bg-gray-50 text-gray-900"
            )}
          >
            Full Width
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RmDialog
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        onRemove={onDelete}
        onOpenChange={onDeleteDialogOpenChange}
        trigger={({ setIsOpen }) => (
          <button
            type="button"
            onMouseDown={preventToolbarFocusChange}
            onClick={() => setIsOpen(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center text-error-500 transition duration-200 hover:bg-error-100 hover:text-error-600 focus-visible:outline-none last:rounded-r-[5px]"
            aria-label="Delete image"
          >
            <Trash01 className="size-4" />
          </button>
        )}
      />
    </div>
  )
}

const RichTextToolbar = ({
  editor,
  className,
  isUploadingImage,
  onInsertImage,
  isFontMenuOpen,
  onFontMenuOpenChange,
  onFontMenuTriggerMouseDown,
  getSelectionSnapshot,
  isPinned,
  onTogglePinned,
}: {
  editor: Editor | null
  className?: string
  isUploadingImage: boolean
  onInsertImage: () => void
  isFontMenuOpen: boolean
  onFontMenuOpenChange: (open: boolean) => void
  onFontMenuTriggerMouseDown: () => void
  getSelectionSnapshot: () => { from: number; to: number } | null
  isPinned: boolean
  onTogglePinned: () => void
}) => {
  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return null
      }

      return {
        bold: selectionHasMark(currentEditor, "bold"),
        italic: selectionHasMark(currentEditor, "italic"),
        underline: selectionHasMark(currentEditor, "underline"),
        strike: selectionHasMark(currentEditor, "strike"),
        bulletList: currentEditor.isActive("bulletList"),
        orderedList: currentEditor.isActive("orderedList"),
        heading: getCurrentHeadingLabel(currentEditor),
      }
    },
  })

  if (!editor || !toolbarState) return null

  const handleHeadingChange = (value: string) => {
    const selectionSnapshot = getSelectionSnapshot()
    const cursorFrom = selectionSnapshot?.from ?? editor.state.selection.from
    const cursorTo = selectionSnapshot?.to ?? editor.state.selection.to
    // Check BOTH the snapshot and the live editor selection for collapsed state.
    // The snapshot can be stale if a previous interaction didn't clear it.
    const isCollapsed =
      cursorFrom === cursorTo ||
      editor.state.selection.from === editor.state.selection.to
    const isLegacyHeading = editor.isActive("heading")

    if (isCollapsed) {
      // No text selected — set stored marks only (type-ahead formatting).
      // Do NOT modify existing text on the line.
      const cursorPos = editor.state.selection.from

      if (isLegacyHeading) {
        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .setParagraph()
          .run()
      }

      const { tr } = editor.state
      const fontSizeMarkType = editor.schema.marks.fontSize

      if (value === "Normal Text") {
        const currentStored =
          tr.storedMarks ?? editor.state.selection.$from.marks()
        const filtered = currentStored.filter(
          (m) => m.type !== fontSizeMarkType
        )
        tr.setStoredMarks(filtered)
      } else {
        const sizeMap: Record<string, string> = {
          "Large Heading": "large-heading",
          "Normal Heading": "normal-heading",
          "Small Heading": "small-heading",
        }
        const currentStored =
          tr.storedMarks ?? editor.state.selection.$from.marks()
        const filtered = currentStored.filter(
          (m) => m.type !== fontSizeMarkType
        )
        const newMark = fontSizeMarkType.create({ size: sizeMap[value] })
        tr.setStoredMarks([...filtered, newMark])
      }

      editor.view.dispatch(tr)
      // Restore cursor position explicitly so it doesn't disappear
      editor.commands.setTextSelection(cursorPos)
      editor.view.focus()
      return
    }

    // Text is selected — apply to selection
    const chain = editor.chain().focus(undefined, { scrollIntoView: false })
    chain.setTextSelection({ from: cursorFrom, to: cursorTo })

    switch (value) {
      case "Large Heading":
        if (isLegacyHeading) chain.setParagraph()
        chain.setFontSize("large-heading")
        break
      case "Normal Heading":
        if (isLegacyHeading) chain.setParagraph()
        chain.setFontSize("normal-heading")
        break
      case "Small Heading":
        if (isLegacyHeading) chain.setParagraph()
        chain.setFontSize("small-heading")
        break
      case "Normal Text":
        if (isLegacyHeading) chain.setParagraph()
        chain.extendMarkRange("fontSize").unsetFontSize()
        break
    }

    chain.setTextSelection({ from: cursorFrom, to: cursorTo }).run()
  }

  const getActiveInlineMarks = () => ({
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    fontSize: editor.getAttributes("fontSize").size as
      | FontSizeVariant
      | undefined,
  })

  const restoreInlineMarks = (
    chain: ReturnType<Editor["chain"]>,
    marks: ReturnType<typeof getActiveInlineMarks>
  ) => {
    if (marks.bold) {
      chain.setBold()
    }
    if (marks.italic) {
      chain.setItalic()
    }
    if (marks.underline) {
      chain.setUnderline()
    }
    if (marks.strike) {
      chain.setStrike()
    }
    if (marks.fontSize) {
      chain.setFontSize(marks.fontSize)
    }
  }

  const handleBulletListToggle = () => {
    if (editor.isActive("bulletList")) {
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .toggleBulletList()
        .run()
      return
    }

    const activeMarks = getActiveInlineMarks()
    const chain = editor.chain().focus(undefined, { scrollIntoView: false })
    if (editor.isActive("heading")) chain.setParagraph()
    chain.toggleBulletList()
    restoreInlineMarks(chain, activeMarks)
    chain.run()
  }

  const handleOrderedListToggle = () => {
    if (editor.isActive("orderedList")) {
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .toggleOrderedList()
        .run()
      return
    }

    const activeMarks = getActiveInlineMarks()
    const chain = editor.chain().focus(undefined, { scrollIntoView: false })
    if (editor.isActive("heading")) chain.setParagraph()
    chain.toggleOrderedList()
    restoreInlineMarks(chain, activeMarks)
    chain.run()
  }

  const imageTooltipLabel = isUploadingImage
    ? "Uploading image..."
    : "Upload Image"
  const pinTooltipLabel = isPinned ? "Unlock Toolbar" : "Lock Toolbar"

  return (
    <div
      data-rich-text-editor-toolbar="true"
      className={cn(
        "h-[41px] p-2 bg-black rounded-lg border border-gray-800 inline-flex items-center shrink-0 shadow-[0px_10px_13.33px_-3.33px_rgba(16,24,40,.08)]",
        className
      )}
    >
      <div className="pr-2">
        <DropdownMenu open={isFontMenuOpen} onOpenChange={onFontMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-rich-text-command="font-size"
              onMouseDown={(event) => {
                preventToolbarFocusChange(event)
                onFontMenuTriggerMouseDown()
              }}
              className="flex text-xs leading-none whitespace-nowrap text-white hover:text-white/75 data-[state=open]:text-white shrink-0 h-[25px] rounded-[4px] bg-white/15 hover:bg-white/15 transition duration-300 data-[state=open]:bg-white/15 focus-visible:outline-none px-2 items-center gap-x-1"
            >
              <span>{toolbarState.heading}</span>
              <ChevronDown className="size-[13.33px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-rich-text-editor-select-content="true"
            side="bottom"
            align="start"
            sideOffset={6}
            className="min-w-[152px]"
          >
            <DropdownMenuItem
              onSelect={() => handleHeadingChange("Normal Text")}
            >
              Normal Text
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleHeadingChange("Small Heading")}
            >
              Small Heading
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleHeadingChange("Normal Heading")}
            >
              Normal Heading
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => handleHeadingChange("Large Heading")}
            >
              Large Heading
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="inline-flex px-2 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.bold}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="bold"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <Bold />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Bold ⌘B
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.italic}
              onPressedChange={() =>
                editor.chain().focus().toggleItalic().run()
              }
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="italic"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <Italic />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Italic ⌘I
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.underline}
              onPressedChange={() =>
                editor.chain().focus().toggleUnderline().run()
              }
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="underline"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <Underline />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Underline ⌘U
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.strike}
              onPressedChange={() =>
                editor.chain().focus().toggleStrike().run()
              }
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="strike"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <StrikeThrough />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Strikethrough ⌘+Shift+S
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="inline-flex px-2 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.bulletList}
              onPressedChange={handleBulletListToggle}
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="bullet-list"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <UnorderedList />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Bullet List
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={toolbarState.orderedList}
              onPressedChange={handleOrderedListToggle}
              asChild
            >
              <TooltipTrigger
                data-rich-text-command="ordered-list"
                onMouseDown={preventToolbarFocusChange}
                className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300"
              >
                <OrderedList />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Ordered List
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="inline-flex px-2 items-center">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              type="button"
              data-rich-text-command="image"
              onMouseDown={preventToolbarFocusChange}
              className="inline-flex size-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 text-gray-50/50 hover:text-white/75 disabled:cursor-wait disabled:opacity-50 transition duration-300"
              onClick={onInsertImage}
              disabled={isUploadingImage}
            >
              <ImageIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              {imageTooltipLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="inline-flex pl-2 items-center">
        <button
          type="button"
          onMouseDown={preventToolbarFocusChange}
          className="inline-flex h-[25px] shrink-0 items-center justify-center gap-x-1 rounded-[4px] px-2 text-xs leading-none text-white/75 hover:bg-white/15 hover:text-white active:bg-white/15 active:text-white transition duration-300 focus-visible:outline-none"
        >
          <MagicWand01 className="size-4 shrink-0" />
          <span className="whitespace-nowrap">Edit with Smart Assistant</span>
        </button>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="inline-flex pl-2 items-center">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              type="button"
              data-rich-text-command="toggle-pin"
              onMouseDown={preventToolbarFocusChange}
              className={cn(
                "inline-flex size-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] transition duration-300",
                isPinned
                  ? "bg-white/15 text-white hover:text-white"
                  : "text-gray-50/50 hover:bg-white/15 hover:text-white/75"
              )}
              onClick={onTogglePinned}
            >
              {isPinned ? (
                <Lock01 className="size-4" />
              ) : (
                <LockUnlocked01 className="size-4" />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              {pinTooltipLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

const ActiveEditor = ({
  defaultValue,
  editorClassName,
  toolbarClassName,
  onUpdate,
  onBlur,
  onEditorReady,
  onInsertImageReady,
  onToolbarToggleReady,
  onToolbarPinnedChange,
  initialFocusPoint,
  stickyToolbar = false,
  stickyToolbarActions,
}: {
  defaultValue: string
  editorClassName?: string
  toolbarClassName?: string
  onUpdate?: (html: string) => void
  onBlur?: (html: string) => void
  onEditorReady?: (editor: Editor | null) => void
  onInsertImageReady?: (fn: () => void) => void
  onToolbarToggleReady?: (fn: (pinned: boolean) => void) => void
  onToolbarPinnedChange?: (pinned: boolean) => void
  initialFocusPoint?: {
    left: number
    top: number
  } | null
  stickyToolbar?: boolean
  stickyToolbarActions?: React.ReactNode
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadActionRef = useRef<
    | {
        mode: "insert"
      }
    | {
        mode: "replace"
        imagePos: number
      }
    | null
  >(null)
  const hoveredImageElementRef = useRef<HTMLImageElement | null>(null)
  const selectionRef = useRef<{
    from: number
    to: number
  } | null>(null)
  const fontMenuSelectionRef = useRef<{
    from: number
    to: number
  } | null>(null)
  const shouldRestoreBubbleMenuRef = useRef(false)
  const fontMenuAnchorSelectionRef = useRef(false)
  const draggedImageRef = useRef<{
    align: ImageAlignValue
    src: string
    element: HTMLImageElement | null
  } | null>(null)
  const scrollPositionRef = useRef<{
    x: number
    y: number
  } | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false)
  const [hasFontMenuAnchorSelection, setHasFontMenuAnchorSelection] =
    useState(false)
  const [isToolbarPinned, setIsToolbarPinned] = useState(false)
  const [bubbleMenuInstanceKey, setBubbleMenuInstanceKey] = useState(0)
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [isHoveringImageToolbar, setIsHoveringImageToolbar] = useState(false)
  const [isImageAlignMenuOpen, setIsImageAlignMenuOpen] = useState(false)
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const [hoveredImage, setHoveredImage] = useState<{
    pos: number
    top: number
    left: number
    alignment: ImageAlignValue
    src: string
    alt: string
  } | null>(null)

  const syncDropCursorPreview = useCallback(
    (align: ImageAlignValue, dropSide?: "left" | "right") => {
      if (typeof window === "undefined" || !containerRef.current) {
        return
      }

      window.requestAnimationFrame(() => {
        const dropCursor = containerRef.current?.querySelector(
          ".rich-text-dropcursor"
        ) as HTMLElement | null
        const proseMirrorElement = containerRef.current?.querySelector(
          ".ProseMirror"
        ) as HTMLElement | null

        if (!dropCursor || !proseMirrorElement) {
          return
        }

        const proseMirrorRect = proseMirrorElement.getBoundingClientRect()
        const proseMirrorWidth = proseMirrorRect.width
        const paddingLeft =
          parseFloat(getComputedStyle(proseMirrorElement).paddingLeft) || 0
        const paddingRight =
          parseFloat(getComputedStyle(proseMirrorElement).paddingRight) || 0
        const contentWidth = proseMirrorWidth - paddingLeft - paddingRight
        const halfGap = 24 // 24px gap on each side of center
        const halfWidth = (contentWidth - halfGap * 2) / 2
        const nextWidth = align === "full-width" ? contentWidth : halfWidth
        const nextLeft =
          align === "full-width"
            ? paddingLeft
            : dropSide === "right"
              ? paddingLeft + contentWidth - halfWidth
              : paddingLeft

        dropCursor.style.width = `${nextWidth}px`
        dropCursor.style.left = `${nextLeft}px`
        dropCursor.style.right = "auto"
        dropCursor.style.backgroundColor = "#306CFE"
        dropCursor.style.height = "2px"
      })
    },
    []
  )

  const clearDropCursorPreview = useCallback(() => {
    if (typeof document === "undefined" || !containerRef.current) {
      return
    }

    const dropCursor = containerRef.current.querySelector(
      ".rich-text-dropcursor"
    ) as HTMLElement | null

    if (!dropCursor) {
      return
    }

    dropCursor.style.removeProperty("width")
    dropCursor.style.removeProperty("left")
    dropCursor.style.removeProperty("right")
    dropCursor.style.removeProperty("background-color")
    dropCursor.style.removeProperty("height")
  }, [])

  const clearImageDragPreviewState = useCallback(() => {
    if (typeof document === "undefined") {
      return
    }

    clearDropCursorPreview()
    draggedImageRef.current?.element?.removeAttribute(
      "data-rich-text-drag-source"
    )
    draggedImageRef.current = null
    document.body.classList.remove("rich-text-image-dragging")
    delete document.body.dataset.richTextDragAlign
    delete document.body.dataset.richTextDropSide
  }, [clearDropCursorPreview])

  const editor = useEditor({
    extensions: [
      GoogleDocsListBackspace,
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        dropcursor: {
          color: "#306CFE",
          width: 2,
          class: "rich-text-dropcursor",
        },
      }),
      FontSizeExtension,
      RichTextImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      UnderlineExtension,
    ],
    immediatelyRender: false,
    content: defaultValue || "",
    editorProps: {
      attributes: {
        class: cn(
          "rich-text-content focus:outline-none w-full max-w-full min-w-0 overflow-x-hidden break-words [overflow-wrap:anywhere] [word-break:break-word]",
          editorClassName
        ),
      },
      handleDOMEvents: {
        dragstart: (_view, event) => {
          const target = event.target
          if (
            typeof document !== "undefined" &&
            target instanceof HTMLElement &&
            target.tagName === "IMG"
          ) {
            const imageTarget =
              target instanceof HTMLImageElement ? target : null
            const alignAttribute = target.getAttribute("data-align")
            const imageAlign: ImageAlignValue =
              alignAttribute === "left" ||
              alignAttribute === "right" ||
              alignAttribute === "full-width"
                ? alignAttribute
                : DEFAULT_IMAGE_ALIGN

            draggedImageRef.current = {
              align: imageAlign,
              src: imageTarget?.currentSrc || target.getAttribute("src") || "",
              element: imageTarget,
            }
            target.setAttribute("data-rich-text-drag-source", "true")
            document.body.classList.add("rich-text-image-dragging")
            document.body.dataset.richTextDragAlign = imageAlign

            if (imageAlign === "left" || imageAlign === "right") {
              document.body.dataset.richTextDropSide = imageAlign
            } else {
              delete document.body.dataset.richTextDropSide
            }

            syncDropCursorPreview(
              imageAlign,
              imageAlign === "left" || imageAlign === "right"
                ? imageAlign
                : undefined
            )
          }
          return false
        },
        dragover: (_view, event) => {
          if (
            typeof document === "undefined" ||
            !containerRef.current ||
            !draggedImageRef.current
          ) {
            return false
          }

          // Hide drop cursor when hovering over an image
          const elementUnderCursor = document.elementFromPoint(
            event.clientX,
            event.clientY
          )
          const isOverImage =
            elementUnderCursor?.tagName === "IMG" ||
            elementUnderCursor?.closest("img") !== null
          const dropCursor = containerRef.current.querySelector(
            ".rich-text-dropcursor"
          ) as HTMLElement | null
          if (dropCursor) {
            dropCursor.style.display = isOverImage ? "none" : ""
          }

          const currentAlign = draggedImageRef.current.align
          if (currentAlign === "full-width") {
            document.body.dataset.richTextDragAlign = currentAlign
            delete document.body.dataset.richTextDropSide
            if (!isOverImage) syncDropCursorPreview(currentAlign)
            return false
          }

          const containerRect = containerRef.current.getBoundingClientRect()
          const midpoint = containerRect.left + containerRect.width / 2
          const nextSide = event.clientX >= midpoint ? "right" : "left"

          document.body.dataset.richTextDragAlign = currentAlign
          document.body.dataset.richTextDropSide = nextSide
          if (!isOverImage) syncDropCursorPreview(currentAlign, nextSide)
          return false
        },
        dragend: () => {
          clearImageDragPreviewState()
          return false
        },
        drop: (_view, event) => {
          const draggedImage = draggedImageRef.current

          if (!draggedImage || !containerRef.current || !editor) {
            clearImageDragPreviewState()
            return false
          }

          const containerRect = containerRef.current.getBoundingClientRect()
          const midpoint = containerRect.left + containerRect.width / 2
          const dropSide: "left" | "right" =
            event.clientX >= midpoint ? "right" : "left"
          const oppositeSide = dropSide === "left" ? "right" : "left"

          // Check if dropping onto another image (for side-by-side)
          const elementUnderCursor = document.elementFromPoint(
            event.clientX,
            event.clientY
          )
          const targetImgEl =
            elementUnderCursor?.tagName === "IMG"
              ? (elementUnderCursor as HTMLImageElement)
              : (elementUnderCursor?.closest("img") as HTMLImageElement | null)

          const draggedEl = draggedImage.element

          if (targetImgEl && draggedEl && targetImgEl !== draggedEl) {
            // Side-by-side drop: intercept completely
            event.preventDefault()
            clearImageDragPreviewState()

            try {
              const draggedPos = editor.view.posAtDOM(draggedEl, 0)
              const targetPos = editor.view.posAtDOM(targetImgEl, 0)
              const draggedNode = editor.state.doc.nodeAt(draggedPos)
              const targetNode = editor.state.doc.nodeAt(targetPos)
              if (
                !draggedNode ||
                !targetNode ||
                draggedNode.type.name !== "image" ||
                targetNode.type.name !== "image"
              )
                return true

              const tr = editor.state.tr

              // Delete dragged image first (use higher position first
              // to keep lower positions stable)
              if (draggedPos > targetPos) {
                tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)
                // Insert after target
                const insertPos = targetPos + targetNode.nodeSize
                tr.insert(
                  insertPos,
                  draggedNode.type.create(
                    {
                      ...draggedNode.attrs,
                      align: dropSide === "left" ? "right" : "left",
                    },
                    draggedNode.content,
                    draggedNode.marks
                  )
                )
                // Set target alignment
                tr.setNodeMarkup(targetPos, undefined, {
                  ...targetNode.attrs,
                  align: dropSide === "left" ? "left" : "right",
                })
              } else {
                // Target is after dragged — set target first, then
                // delete dragged image and re-insert next to target
                const newTargetPos = targetPos - draggedNode.nodeSize
                tr.delete(draggedPos, draggedPos + draggedNode.nodeSize)
                // Insert before target
                tr.insert(
                  newTargetPos,
                  draggedNode.type.create(
                    { ...draggedNode.attrs, align: dropSide },
                    draggedNode.content,
                    draggedNode.marks
                  )
                )
                // Set target alignment (position shifted by insert)
                tr.setNodeMarkup(
                  newTargetPos + draggedNode.nodeSize,
                  undefined,
                  { ...targetNode.attrs, align: oppositeSide }
                )
              }

              editor.view.dispatch(tr)
            } catch {
              // If position lookup fails, just let ProseMirror handle it
            }
            return true
          }

          // Normal drop (not on image) — let ProseMirror handle the move
          clearImageDragPreviewState()
          return false
        },
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML())
    },
    onFocus: () => {
      setIsEditorFocused(true)
    },
    onBlur: ({ editor }) => {
      setIsEditorFocused(false)
      onBlur?.(editor.getHTML())
    },
  })

  const hasSelectedText = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return false
      }

      return selectionHasTextContent(currentEditor)
    },
  })

  const shouldKeepToolbarVisible = hasSelectedText || hasFontMenuAnchorSelection

  const updateFloatingToolbarPosition = useCallback(() => {
    if (!editor || !containerRef.current) {
      setFloatingToolbarPosition(null)
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      if (!hasFontMenuAnchorSelection) {
        setFloatingToolbarPosition(null)
      }
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    if (!rect.width && !rect.height) {
      if (!hasFontMenuAnchorSelection) {
        setFloatingToolbarPosition(null)
      }
      return
    }

    // Position toolbar 49px above the selection top, but clamp so it
    // never goes above the visible viewport (e.g. when Select All pushes
    // the selection start off-screen).
    const idealTop = rect.top - containerRect.top - 49
    const minVisibleTop = -containerRect.top + 8 // 8px below viewport top
    setFloatingToolbarPosition({
      top: Math.max(idealTop, minVisibleTop),
      left: rect.left - containerRect.left,
    })
  }, [editor, hasFontMenuAnchorSelection])

  const handleFontMenuOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsFontMenuOpen(false)
        fontMenuSelectionRef.current = null
        // If text is still selected after closing the menu (e.g. after a
        // font-size change), schedule a toolbar position update so the
        // floating toolbar stays visible instead of flickering away.
        if (editor && selectionHasTextContent(editor)) {
          requestAnimationFrame(() => {
            updateFloatingToolbarPosition()
          })
        }
        return
      }

      if (!editor) {
        return
      }

      // Allow opening with a collapsed cursor (for stored marks / type-ahead formatting)
      // Only block if there's truly no editor focus
      if (
        !selectionHasTextContent(editor) &&
        !hasFontMenuAnchorSelection &&
        !fontMenuAnchorSelectionRef.current &&
        !isToolbarPinned
      ) {
        return
      }

      fontMenuAnchorSelectionRef.current = true
      fontMenuSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      }
      setHasFontMenuAnchorSelection(true)
      setIsFontMenuOpen(true)

      if (!isToolbarPinned) {
        editor.view.dispatch(
          editor.state.tr.setMeta("bubbleMenu", "updatePosition")
        )
      }
    },
    [
      editor,
      hasFontMenuAnchorSelection,
      isToolbarPinned,
      updateFloatingToolbarPosition,
    ]
  )

  const handleFontMenuTriggerMouseDown = useCallback(() => {
    if (editor) {
      fontMenuAnchorSelectionRef.current = true
      fontMenuSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      }
      setHasFontMenuAnchorSelection(true)
    }
  }, [editor])

  useEffect(() => {
    onEditorReady?.(editor ?? null)

    return () => {
      onEditorReady?.(null)
    }
  }, [editor, onEditorReady])

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextContent = defaultValue || ""

    if (editor.getHTML() === nextContent) {
      return
    }

    editor.commands.setContent(nextContent, { emitUpdate: false })
  }, [defaultValue, editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const focusEditor = () => {
      if (initialFocusPoint) {
        const position = editor.view.posAtCoords(initialFocusPoint)

        if (position) {
          setIsEditorFocused(true)
          editor.commands.focus(position.pos, { scrollIntoView: false })
          return
        }
      }

      setIsEditorFocused(true)
      editor.commands.focus("end", { scrollIntoView: false })
    }

    if (typeof window === "undefined") {
      focusEditor()
      return
    }

    window.requestAnimationFrame(focusEditor)
  }, [editor, initialFocusPoint])

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("rich-text-image-dragging")
        delete document.body.dataset.richTextDragAlign
        delete document.body.dataset.richTextDropSide
      }
    }
  }, [clearImageDragPreviewState])

  const clearHoveredImage = useCallback(() => {
    if (hoveredImageElementRef.current) {
      hoveredImageElementRef.current.removeAttribute(
        "data-rich-text-image-hovered"
      )
    }
    hoveredImageElementRef.current = null
    setIsImageEditorOpen(false)
    setHoveredImage(null)
  }, [])

  const syncHoveredImage = useCallback(
    (imageElement?: HTMLImageElement | null) => {
      if (!editor || !containerRef.current) {
        clearHoveredImage()
        return
      }

      const targetImage = imageElement ?? hoveredImageElementRef.current

      if (!targetImage || !editor.view.dom.contains(targetImage)) {
        clearHoveredImage()
        return
      }

      try {
        const pos = editor.view.posAtDOM(targetImage, 0)
        const node = editor.state.doc.nodeAt(pos)

        if (!node || node.type.name !== "image") {
          clearHoveredImage()
          return
        }

        const imageRect = targetImage.getBoundingClientRect()
        const containerRect = containerRef.current.getBoundingClientRect()

        if (hoveredImageElementRef.current !== targetImage) {
          hoveredImageElementRef.current?.removeAttribute(
            "data-rich-text-image-hovered"
          )
          targetImage.setAttribute("data-rich-text-image-hovered", "true")
        }

        hoveredImageElementRef.current = targetImage

        // Hide toolbar if image is scrolled out of the editor's visible area
        const toolbarTop = imageRect.top - containerRect.top + 20
        const isImageVisible =
          imageRect.bottom > containerRect.top &&
          imageRect.top < containerRect.bottom

        if (!isImageVisible) {
          clearHoveredImage()
          return
        }

        setHoveredImage({
          pos,
          top: toolbarTop,
          left: imageRect.left - containerRect.left + 16,
          alignment:
            node.attrs.align === "left" ||
            node.attrs.align === "right" ||
            node.attrs.align === "full-width"
              ? node.attrs.align
              : DEFAULT_IMAGE_ALIGN,
          src: typeof node.attrs.src === "string" ? node.attrs.src : "",
          alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
        })
      } catch {
        clearHoveredImage()
      }
    },
    [clearHoveredImage, editor]
  )

  const getImageNodeAtPos = useCallback(
    (pos: number) => {
      if (!editor) {
        return null
      }

      const node = editor.state.doc.nodeAt(pos)
      if (!node || node.type.name !== "image") {
        return null
      }

      return node
    },
    [editor]
  )

  const refreshHoveredImageAtPos = useCallback(
    (pos: number) => {
      if (!editor) {
        return
      }

      if (typeof window === "undefined") {
        const nodeDom = editor.view.nodeDOM(pos)
        if (nodeDom instanceof HTMLImageElement) {
          syncHoveredImage(nodeDom)
        } else {
          clearHoveredImage()
        }
        return
      }

      window.requestAnimationFrame(() => {
        const nodeDom = editor.view.nodeDOM(pos)
        if (nodeDom instanceof HTMLImageElement) {
          syncHoveredImage(nodeDom)
        } else {
          clearHoveredImage()
        }
      })
    },
    [clearHoveredImage, editor, syncHoveredImage]
  )

  const updateImageAtPos = useCallback(
    (pos: number, attrs: Record<string, unknown>) => {
      if (!editor) {
        return
      }

      const node = getImageNodeAtPos(pos)
      if (!node) {
        return
      }

      const transaction = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        ...attrs,
      })

      editor.view.dispatch(transaction)
      editor.commands.focus(undefined, { scrollIntoView: false })
      refreshHoveredImageAtPos(pos)
    },
    [editor, getImageNodeAtPos, refreshHoveredImageAtPos]
  )

  const uploadRichTextImageFile = useCallback(
    async (file: File) => {
      const preparedUpload = await prepareRichTextImageUpload(file)

      if (preparedUpload.file.size > RICH_TEXT_IMAGE_UPLOAD_MAX_BYTES) {
        throw new Error(
          "We couldn't prepare that image for upload. Please try a different image."
        )
      }

      const formData = new FormData()
      formData.append("file", preparedUpload.file)

      const response = await ProjectAPI.UploadRichTextImage(formData)
      const imageSource = response?.data?.url

      if (typeof imageSource !== "string" || !imageSource.length) {
        throw new Error("Image upload did not return a valid URL.")
      }

      if (preparedUpload.wasResized) {
        toast({
          title: "Image resized",
          description: "Your image was optimized for upload.",
        })
      }

      return imageSource
    },
    [toast]
  )

  const removeImageAtPos = useCallback(
    (pos: number) => {
      if (!editor) {
        return
      }

      const node = getImageNodeAtPos(pos)
      if (!node) {
        return
      }

      const transaction = editor.state.tr.delete(pos, pos + node.nodeSize)
      editor.view.dispatch(transaction)
      editor.commands.focus(undefined, { scrollIntoView: false })
      clearHoveredImage()
    },
    [clearHoveredImage, editor, getImageNodeAtPos]
  )

  const handleInsertImage = useCallback(
    (mode: "insert" | "replace" = "insert", imagePos?: number) => {
      if (!editor || typeof window === "undefined" || isUploadingImage) return

      uploadActionRef.current =
        mode === "replace" && typeof imagePos === "number"
          ? {
              mode,
              imagePos,
            }
          : {
              mode: "insert",
            }

      if (mode === "insert") {
        selectionRef.current = {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        }
      } else {
        selectionRef.current = null
      }

      scrollPositionRef.current = {
        x: window.scrollX,
        y: window.scrollY,
      }
      fileInputRef.current?.click()
    },
    [editor, isUploadingImage]
  )

  useEffect(() => {
    if (onInsertImageReady) {
      onInsertImageReady(() => handleInsertImage("insert"))
    }
  }, [onInsertImageReady, handleInsertImage])

  const handleImageFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""

      if (!file) {
        if (typeof window !== "undefined" && scrollPositionRef.current) {
          window.scrollTo(
            scrollPositionRef.current.x,
            scrollPositionRef.current.y
          )
        }
        uploadActionRef.current = null
        scrollPositionRef.current = null
        return
      }

      if (!file.type.startsWith("image/")) {
        window.alert("Please choose an image file.")
        uploadActionRef.current = null
        return
      }

      if (!editor) {
        return
      }

      try {
        setIsUploadingImage(true)
        const imageSource = await uploadRichTextImageFile(file)

        const uploadAction = uploadActionRef.current

        if (uploadAction?.mode === "replace") {
          updateImageAtPos(uploadAction.imagePos, {
            src: imageSource,
            alt: file.name,
          })
          return
        }

        // Always INSERT a new image after the current position — never
        // replace the existing selected node.
        const insertPos = selectionRef.current
          ? selectionRef.current.to
          : editor.state.selection.to

        editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .command(({ tr }) => {
            // Force a collapsed cursor so insertContent cannot replace
            // an existing node selection.
            tr.setSelection(
              editor.state.selection.constructor.near(
                tr.doc.resolve(Math.min(insertPos, tr.doc.content.size))
              )
            )
            return true
          })
          .insertContent({
            type: "image",
            attrs: {
              src: imageSource,
              alt: file.name,
              align: DEFAULT_IMAGE_ALIGN,
            },
          })
          .run()
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.reason ||
          error?.message ||
          "We couldn't upload that image. Please try again."
        window.alert(message)
      } finally {
        if (typeof window !== "undefined" && scrollPositionRef.current) {
          window.scrollTo(
            scrollPositionRef.current.x,
            scrollPositionRef.current.y
          )
        }
        setIsUploadingImage(false)
        uploadActionRef.current = null
        selectionRef.current = null
        scrollPositionRef.current = null
      }
    },
    [editor, updateImageAtPos, uploadRichTextImageFile]
  )

  const handleEditorMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (
        target.closest("[data-rich-text-image-toolbar='true']") ||
        target.closest("[data-rich-text-image-toolbar-menu='true']")
      ) {
        return
      }

      const imageElement = target.closest("img")
      if (imageElement instanceof HTMLImageElement) {
        syncHoveredImage(imageElement)
        return
      }

      clearHoveredImage()
    },
    [clearHoveredImage, syncHoveredImage]
  )

  const handleEditorMouseLeave = useCallback(() => {
    if (
      !isHoveringImageToolbar &&
      !isImageAlignMenuOpen &&
      !isImageEditorOpen &&
      !isDeleteDialogOpen
    ) {
      clearHoveredImage()
    }
  }, [
    clearHoveredImage,
    isHoveringImageToolbar,
    isImageAlignMenuOpen,
    isImageEditorOpen,
    isDeleteDialogOpen,
  ])

  const handleToolbarPinnedChange = useCallback(
    (nextPinned: boolean) => {
      setIsFontMenuOpen(false)
      setIsToolbarPinned(nextPinned)

      if (!editor) {
        return
      }

      const hasSelectedTextNow = selectionHasTextContent(editor)
      if (hasSelectedTextNow) {
        fontMenuAnchorSelectionRef.current = true
        fontMenuSelectionRef.current = {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        }
        setHasFontMenuAnchorSelection(true)
      }

      const selectionRange = {
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      }

      if (!nextPinned) {
        shouldRestoreBubbleMenuRef.current = true
        setIsEditorFocused(true)
        setBubbleMenuInstanceKey((currentKey) => currentKey + 1)
      }

      const refocusEditor = () => {
        setIsEditorFocused(true)
        editor.commands.focus(selectionRange.from, { scrollIntoView: false })
        editor.view.focus()

        if (hasSelectedTextNow) {
          editor.commands.setTextSelection({
            from: fontMenuSelectionRef.current?.from ?? selectionRange.from,
            to: fontMenuSelectionRef.current?.to ?? selectionRange.to,
          })
        }

        if (!nextPinned) {
          editor.view.dispatch(
            editor.state.tr.setMeta("bubbleMenu", "updatePosition")
          )
        }

        if (hasSelectedTextNow) {
          window.requestAnimationFrame(() => {
            if (selectionHasTextContent(editor)) {
              fontMenuAnchorSelectionRef.current = false
              setHasFontMenuAnchorSelection(false)
            }
          })
        }
      }

      if (typeof window === "undefined") {
        refocusEditor()
        return
      }

      window.requestAnimationFrame(() => {
        refocusEditor()
        window.requestAnimationFrame(() => {
          refocusEditor()
          window.setTimeout(refocusEditor, 0)
        })
      })
    },
    [editor]
  )

  useEffect(() => {
    if (onToolbarToggleReady) {
      onToolbarToggleReady((pinned: boolean) => {
        handleToolbarPinnedChange(pinned)
      })
    }
  }, [onToolbarToggleReady, handleToolbarPinnedChange])

  useEffect(() => {
    onToolbarPinnedChange?.(isToolbarPinned)
  }, [isToolbarPinned, onToolbarPinnedChange])

  useEffect(() => {
    if (!editor || isToolbarPinned || !shouldRestoreBubbleMenuRef.current) {
      return
    }

    const selectionPosition = editor.state.selection.from

    const restoreBubbleMenu = () => {
      setIsEditorFocused(true)
      editor.commands.focus(selectionPosition, { scrollIntoView: false })
      editor.view.focus()
      editor.view.dispatch(
        editor.state.tr.setMeta("bubbleMenu", "updatePosition")
      )
    }

    if (typeof window === "undefined") {
      restoreBubbleMenu()
      shouldRestoreBubbleMenuRef.current = false
      return
    }

    window.requestAnimationFrame(() => {
      restoreBubbleMenu()
      window.requestAnimationFrame(() => {
        restoreBubbleMenu()
        window.setTimeout(() => {
          restoreBubbleMenu()
          shouldRestoreBubbleMenuRef.current = false
        }, 0)
      })
    })
  }, [bubbleMenuInstanceKey, editor, isToolbarPinned])

  useEffect(() => {
    if (!editor) {
      return
    }

    const handleTransaction = () => {
      if (!isToolbarPinned) {
        updateFloatingToolbarPosition()
      }

      if (hoveredImage) {
        refreshHoveredImageAtPos(hoveredImage.pos)
      }
    }

    editor.on("transaction", handleTransaction)
    return () => {
      editor.off("transaction", handleTransaction)
    }
  }, [
    editor,
    hoveredImage,
    isToolbarPinned,
    refreshHoveredImageAtPos,
    updateFloatingToolbarPosition,
  ])

  useEffect(() => {
    if (!hoveredImage) {
      return
    }

    const refreshPosition = () => {
      refreshHoveredImageAtPos(hoveredImage.pos)
    }

    window.addEventListener("resize", refreshPosition)
    window.addEventListener("scroll", refreshPosition, true)

    return () => {
      window.removeEventListener("resize", refreshPosition)
      window.removeEventListener("scroll", refreshPosition, true)
    }
  }, [hoveredImage, refreshHoveredImageAtPos])

  // Clear the font menu anchor when text is no longer selected
  // and the font menu is closed
  useEffect(() => {
    if (!hasSelectedText && !isFontMenuOpen && hasFontMenuAnchorSelection) {
      fontMenuAnchorSelectionRef.current = false
      setHasFontMenuAnchorSelection(false)
    }
  }, [hasSelectedText, isFontMenuOpen, hasFontMenuAnchorSelection])

  useEffect(() => {
    if (!shouldKeepToolbarVisible || isToolbarPinned) {
      if (!isFontMenuOpen) {
        setFloatingToolbarPosition(null)
      }
      return
    }

    updateFloatingToolbarPosition()
  }, [
    isFontMenuOpen,
    isToolbarPinned,
    shouldKeepToolbarVisible,
    updateFloatingToolbarPosition,
  ])

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 group/editor isolate"
      onMouseMove={handleEditorMouseMove}
      onMouseLeave={handleEditorMouseLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-rich-text-file-input="true"
        className="hidden"
        onChange={handleImageFileChange}
      />
      {editor && isToolbarPinned ? (
        <div
          className={cn(
            stickyToolbar
              ? "sticky top-0 z-20 flex items-center justify-between w-full bg-white px-3 py-2 border-b border-gray-200 rounded-t-xl"
              : "absolute left-0 -top-[51px] z-20 inline-flex",
            toolbarClassName
          )}
        >
          <RichTextToolbar
            editor={editor}
            isUploadingImage={isUploadingImage}
            onInsertImage={handleInsertImage}
            isFontMenuOpen={isFontMenuOpen}
            onFontMenuOpenChange={handleFontMenuOpenChange}
            onFontMenuTriggerMouseDown={handleFontMenuTriggerMouseDown}
            getSelectionSnapshot={() => fontMenuSelectionRef.current}
            isPinned={isToolbarPinned}
            onTogglePinned={() => handleToolbarPinnedChange(false)}
          />
          {stickyToolbar && stickyToolbarActions ? (
            <div className="flex items-center gap-x-1.5 shrink-0 ml-3">
              {stickyToolbarActions}
            </div>
          ) : null}
        </div>
      ) : null}
      {editor &&
      !isToolbarPinned &&
      shouldKeepToolbarVisible &&
      floatingToolbarPosition ? (
        <div
          className={cn(
            "absolute z-20 inline-flex origin-bottom-left",
            isFontMenuOpen
              ? "will-change-auto"
              : "will-change-[left,top,opacity] motion-safe:transition-[left,top,opacity] motion-safe:duration-200 motion-safe:ease-out"
          )}
          style={{
            top: floatingToolbarPosition.top,
            left: floatingToolbarPosition.left,
          }}
        >
          <RichTextToolbar
            editor={editor}
            className={toolbarClassName}
            isUploadingImage={isUploadingImage}
            onInsertImage={handleInsertImage}
            isFontMenuOpen={isFontMenuOpen}
            onFontMenuOpenChange={handleFontMenuOpenChange}
            onFontMenuTriggerMouseDown={handleFontMenuTriggerMouseDown}
            getSelectionSnapshot={() => fontMenuSelectionRef.current}
            isPinned={isToolbarPinned}
            onTogglePinned={() => handleToolbarPinnedChange(true)}
          />
        </div>
      ) : null}
      {hoveredImage ? (
        <RichTextImageToolbar
          alignment={hoveredImage.alignment}
          imageSource={hoveredImage.src}
          imageFileName={
            hoveredImage.alt.trim() ||
            hoveredImage.src.split("?")[0].split("/").pop() ||
            "project-image.png"
          }
          style={{
            top: hoveredImage.top,
            left: hoveredImage.left,
          }}
          onEditSave={async (file) => {
            setIsUploadingImage(true)

            try {
              const imageSource = await uploadRichTextImageFile(file)
              updateImageAtPos(hoveredImage.pos, {
                src: imageSource,
                alt: file.name,
              })
            } finally {
              setIsUploadingImage(false)
            }
          }}
          onEditDialogOpenChange={(open) => {
            setIsImageEditorOpen(open)
          }}
          onMouseEnter={() => setIsHoveringImageToolbar(true)}
          onMouseLeave={() => {
            setIsHoveringImageToolbar(false)
            if (
              !isImageAlignMenuOpen &&
              !isImageEditorOpen &&
              !isDeleteDialogOpen
            ) {
              clearHoveredImage()
            }
          }}
          onAlignMenuOpenChange={(open) => {
            setIsImageAlignMenuOpen(open)
            if (
              !open &&
              !isHoveringImageToolbar &&
              !isImageEditorOpen &&
              !isDeleteDialogOpen
            ) {
              clearHoveredImage()
            }
          }}
          onReplace={() => handleInsertImage("replace", hoveredImage.pos)}
          onDelete={() => removeImageAtPos(hoveredImage.pos)}
          onAlignChange={(value) => {
            updateImageAtPos(hoveredImage.pos, {
              align: value,
            })
          }}
          onDeleteDialogOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open && !isHoveringImageToolbar) {
              clearHoveredImage()
            }
          }}
        />
      ) : null}
      <EditorContent editor={editor} />
    </div>
  )
}

const RichTextEditor = ({
  defaultValue,
  placeholder,
  className,
  toolbarClassName,
  editorClassName,
  onUpdate,
  onBlur,
  allowFullscreen = false,
  fullscreenOpen: controlledFullscreenOpen,
  onFullscreenOpenChange,
  fullscreenHelperText,
  fullscreenCharacterCount,
  fullscreenMaxCharacterCount,
}: {
  defaultValue?: string
  placeholder?: string
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  onUpdate?: (html: string) => void
  onBlur?: (html: string) => void
  allowFullscreen?: boolean
  fullscreenOpen?: boolean
  onFullscreenOpenChange?: (open: boolean) => void
  fullscreenHelperText?: string
  fullscreenCharacterCount?: number
  fullscreenMaxCharacterCount?: number
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [internalFullscreenOpen, setInternalFullscreenOpen] = useState(false)
  const isFullscreenControlled = controlledFullscreenOpen !== undefined
  const isFullscreenOpen = isFullscreenControlled
    ? controlledFullscreenOpen
    : internalFullscreenOpen
  const setIsFullscreenOpen = useCallback(
    (open: boolean) => {
      if (isFullscreenControlled) {
        onFullscreenOpenChange?.(open)
      } else {
        setInternalFullscreenOpen(open)
      }
    },
    [isFullscreenControlled, onFullscreenOpenChange]
  )
  const [content, setContent] = useState(() =>
    normalizeRichTextHtml(defaultValue || "")
  )
  const [lastSavedAt, setLastSavedAt] = useState(() => new Date())
  const [initialFocusPoint, setInitialFocusPoint] = useState<{
    left: number
    top: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const shouldResumeInlineEditingRef = useRef(false)
  const fullscreenEditorRef = useRef<Editor | null>(null)
  const fullscreenInsertImageRef = useRef<(() => void) | null>(null)
  const fullscreenToolbarToggleRef = useRef<((pinned: boolean) => void) | null>(
    null
  )
  const [isFullscreenToolbarPinned, setIsFullscreenToolbarPinned] =
    useState(false)
  const historyEntriesRef = useRef<string[]>([
    normalizeRichTextHtml(defaultValue || ""),
  ])
  const historyIndexRef = useRef(0)
  const suppressNextHistoryEntryRef = useRef(false)
  const [historyVersion, setHistoryVersion] = useState(0)

  const syncHistoryVersion = useCallback(() => {
    setHistoryVersion((currentVersion) => currentVersion + 1)
  }, [])

  const recordHistoryEntry = useCallback(
    (html: string) => {
      const currentEntries = historyEntriesRef.current
      const currentIndex = historyIndexRef.current
      const currentValue = currentEntries[currentIndex] ?? ""

      if (currentValue === html) {
        return
      }

      let nextEntries = currentEntries.slice(0, currentIndex + 1)
      nextEntries.push(html)

      if (nextEntries.length > RICH_TEXT_HISTORY_LIMIT) {
        nextEntries = nextEntries.slice(
          nextEntries.length - RICH_TEXT_HISTORY_LIMIT
        )
      }

      historyEntriesRef.current = nextEntries
      historyIndexRef.current = nextEntries.length - 1
      syncHistoryVersion()
    },
    [syncHistoryVersion]
  )

  const canUndoHistory = historyVersion >= 0 && historyIndexRef.current > 0
  const canRedoHistory =
    historyVersion >= 0 &&
    historyIndexRef.current < historyEntriesRef.current.length - 1

  const handleEditorUpdate = useCallback(
    (html: string) => {
      setContent(html)

      if (suppressNextHistoryEntryRef.current) {
        suppressNextHistoryEntryRef.current = false
      } else {
        recordHistoryEntry(html)
      }

      onUpdate?.(html)
    },
    [onUpdate, recordHistoryEntry]
  )

  const handleBlur = useCallback(
    (html: string) => {
      const normalizedHtml = normalizeRichTextHtml(html)

      setContent(normalizedHtml)
      if (suppressNextHistoryEntryRef.current) {
        suppressNextHistoryEntryRef.current = false
      } else {
        recordHistoryEntry(normalizedHtml)
      }
      setLastSavedAt(new Date())
      onBlur?.(normalizedHtml)
    },
    [onBlur, recordHistoryEntry]
  )

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditing && !isFullscreenOpen) {
        setInitialFocusPoint({
          left: event.clientX,
          top: event.clientY,
        })
        setIsEditing(true)
      }
    },
    [isEditing, isFullscreenOpen]
  )

  const handleFullscreenToggle = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      if (isFullscreenOpen) {
        setIsFullscreenOpen(false)
        return
      }

      shouldResumeInlineEditingRef.current = isEditing
      setIsFullscreenOpen(true)
      setInitialFocusPoint(null)
      setIsEditing(false)
    },
    [isEditing, isFullscreenOpen, setIsFullscreenOpen]
  )

  const handleImageButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (!isEditing) {
        setIsEditing(true)
        // Defer so the ActiveEditor mounts, then trigger its insert-image flow
        requestAnimationFrame(() => {
          const fileInput =
            containerRef.current?.querySelector<HTMLInputElement>(
              "input[data-rich-text-file-input]"
            )
          fileInput?.click()
        })
      } else {
        // Already editing — trigger the file input directly (insert mode)
        const fileInput = containerRef.current?.querySelector<HTMLInputElement>(
          "input[data-rich-text-file-input]"
        )
        fileInput?.click()
      }
    },
    [isEditing]
  )

  const handleFullscreenOpenChange = useCallback(
    (open: boolean) => {
      setIsFullscreenOpen(open)

      if (!open) {
        setIsEditing(shouldResumeInlineEditingRef.current)
        shouldResumeInlineEditingRef.current = false
      }
    },
    [setIsFullscreenOpen]
  )

  useEffect(() => {
    if (!isEditing && !isFullscreenOpen) {
      const nextValue = normalizeRichTextHtml(defaultValue || "")
      setContent(nextValue)
      historyEntriesRef.current = [nextValue]
      historyIndexRef.current = 0
      suppressNextHistoryEntryRef.current = false
      syncHistoryVersion()
    }
  }, [defaultValue, isEditing, isFullscreenOpen, syncHistoryVersion])

  useClickOutside([containerRef], () => {
    if (!isEditing || isFullscreenOpen || typeof document === "undefined")
      return

    const activeElement = document.activeElement
    if (
      activeElement instanceof HTMLElement &&
      (activeElement.closest("[data-rich-text-editor-select-content='true']") ||
        activeElement.closest("[data-rich-text-image-toolbar-menu='true']"))
    ) {
      return
    }

    setIsEditing(false)
  })

  const contentClassName = cn(editorClassName)

  const handleFullscreenEditorReady = useCallback((editor: Editor | null) => {
    fullscreenEditorRef.current = editor
  }, [])

  const handleFullscreenUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) {
      return
    }

    historyIndexRef.current -= 1
    const previousContent =
      historyEntriesRef.current[historyIndexRef.current] ?? ""

    suppressNextHistoryEntryRef.current = true
    setContent(previousContent)
    setLastSavedAt(new Date())
    syncHistoryVersion()
    onUpdate?.(previousContent)
  }, [onUpdate, syncHistoryVersion])

  const handleFullscreenRedo = useCallback(() => {
    if (historyIndexRef.current >= historyEntriesRef.current.length - 1) {
      return
    }

    historyIndexRef.current += 1
    const nextContent = historyEntriesRef.current[historyIndexRef.current] ?? ""

    suppressNextHistoryEntryRef.current = true
    setContent(nextContent)
    setLastSavedAt(new Date())
    syncHistoryVersion()
    onUpdate?.(nextContent)
  }, [onUpdate, syncHistoryVersion])

  const editorSurface = isEditing ? (
    <ActiveEditor
      defaultValue={content}
      editorClassName={contentClassName}
      toolbarClassName={toolbarClassName}
      initialFocusPoint={initialFocusPoint}
      onUpdate={(html) => {
        handleEditorUpdate(html)
      }}
      onBlur={handleBlur}
    />
  ) : (
    <div
      className={cn(
        "rich-text-content focus:outline-none w-full max-w-full min-w-0 overflow-x-hidden break-words [overflow-wrap:anywhere] [word-break:break-word]",
        contentClassName
      )}
      dangerouslySetInnerHTML={{
        __html: content ? normalizeRichTextHtml(content) : placeholder || "",
      }}
    />
  )

  const fullscreenEditorClassName = cn(
    "[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:p-6"
  )

  const fullscreenToolbarActions = (
    <>
      <TooltipProvider delayDuration={75}>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              fullscreenInsertImageRef.current?.()
            }}
            className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
          >
            <ImageIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" visual="white" sideOffset={8}>
            Add image
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  )

  const fullscreenEditor = (
    <ActiveEditor
      defaultValue={content}
      editorClassName={fullscreenEditorClassName}
      toolbarClassName={toolbarClassName}
      initialFocusPoint={null}
      onEditorReady={handleFullscreenEditorReady}
      onInsertImageReady={(fn) => {
        fullscreenInsertImageRef.current = fn
      }}
      onToolbarToggleReady={(fn) => {
        fullscreenToolbarToggleRef.current = fn
      }}
      onToolbarPinnedChange={setIsFullscreenToolbarPinned}
      stickyToolbar
      stickyToolbarActions={fullscreenToolbarActions}
      onUpdate={(html) => {
        handleEditorUpdate(html)
      }}
      onBlur={handleBlur}
    />
  )

  const fullscreenSavedLabel = `Saved at ${formatSavedTime(lastSavedAt)}`

  return (
    <div
      ref={containerRef}
      className={cn("relative min-w-0 cursor-text", className)}
      onClick={handleClick}
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-x-1.5">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              type="button"
              onClick={handleImageButtonClick}
              className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
            >
              <ImageIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="top" visual="white" sideOffset={8}>
              Add image
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {allowFullscreen ? (
          <FullscreenToggleButton
            isFullscreen={false}
            onClick={handleFullscreenToggle}
          />
        ) : null}
      </div>
      {editorSurface}
      {allowFullscreen ? (
        <Dialog
          open={isFullscreenOpen}
          onOpenChange={handleFullscreenOpenChange}
        >
          <DialogContent
            accessibilityTitle="Fullscreen rich text editor"
            data-rich-text-fullscreen-dialog="true"
            className="!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !h-dvh w-screen !rounded-none !p-0 gap-0 overflow-hidden shadow-none flex flex-col"
          >
            <DialogTitle className="sr-only">Project Description</DialogTitle>
            <DialogDescription className="sr-only">
              Edit your project description in fullscreen.
            </DialogDescription>

            <nav className="sticky top-0 z-20 h-[70px] flex items-center justify-between px-3 bg-white border-b border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
              <div className="flex items-center gap-x-6">
                <div className="inline-flex items-center gap-x-1">
                  <TooltipProvider delayDuration={75}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          onClick={handleFullscreenUndo}
                          disabled={!canUndoHistory}
                        >
                          <UndoArrowIcon className="size-[18px]" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        Undo
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={75}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          onClick={handleFullscreenRedo}
                          disabled={!canRedoHistory}
                        >
                          <RedoArrowIcon className="size-[18px]" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        Redo
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                  Project Description
                </h2>
              </div>

              <div className="flex items-center gap-x-6">
                <div className="inline-flex items-center gap-x-3">
                  <TooltipProvider delayDuration={75}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="text-gray-500"
                          visual="gray"
                          variant="ghost"
                        >
                          <Clock className="size-[15px]" />{" "}
                          {fullscreenSavedLabel}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        {formatRelativeTime(lastSavedAt)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={75}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton className="bg-primary-50 hover:bg-primary-500 text-primary-500 hover:text-white">
                          <Eye className="size-3" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        Preview
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={75}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          className="text-gray-500"
                          variant="ghost"
                          visual="gray"
                          onClick={handleFullscreenToggle}
                        >
                          <X className="size-5" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        Close
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </nav>

            <div className="relative flex-1 bg-gray-50">
              <div className="absolute inset-0 overflow-y-auto">
                <div className="px-[50px] pt-[50px] pb-[100px]">
                  <div className="mx-auto w-full max-w-[818px]">
                    {(fullscreenHelperText ||
                      fullscreenMaxCharacterCount != null) && (
                      <div className="flex items-center justify-between mb-2">
                        {fullscreenHelperText && (
                          <p className="text-sm font-light text-dark-blue-400">
                            {fullscreenHelperText}
                          </p>
                        )}
                        {fullscreenMaxCharacterCount != null && (
                          <span
                            className={cn(
                              "text-xs shrink-0 ml-auto",
                              (fullscreenCharacterCount ?? 0) >
                                fullscreenMaxCharacterCount
                                ? "text-error-500"
                                : "text-gray-400"
                            )}
                          >
                            {(fullscreenCharacterCount ?? 0).toLocaleString()}/
                            {fullscreenMaxCharacterCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      data-rich-text-fullscreen-content="true"
                      className="relative bg-white border border-gray-200 rounded-xl shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-h-[calc(100vh-252px)]"
                    >
                      {!isFullscreenToolbarPinned && (
                        <div className="sticky top-6 z-10 h-0 overflow-visible">
                          <div className="flex items-center gap-x-1.5 justify-end mr-6 mt-6">
                            <TooltipProvider delayDuration={75}>
                              <Tooltip>
                                <TooltipTrigger
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    fullscreenToolbarToggleRef.current?.(true)
                                  }}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
                                >
                                  <Type02 className="size-4" />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  visual="white"
                                  sideOffset={8}
                                >
                                  Show toolbar
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={75}>
                              <Tooltip>
                                <TooltipTrigger
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    fullscreenInsertImageRef.current?.()
                                  }}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
                                >
                                  <ImageIcon className="size-4" />
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  visual="white"
                                  sideOffset={8}
                                >
                                  Add image
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      )}
                      {fullscreenEditor}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

export { RichTextEditor, RichTextToolbar, useEditor, EditorContent }
export type { Editor }
export { StarterKit, RichTextImageExtension, UnderlineExtension }
