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
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  RmDialog,
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
  const tooltipLabel = isFullscreen ? "Exit fullscreen" : "Edit fullscreen"

  return (
    <TooltipProvider delayDuration={75}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          data-rich-text-fullscreen-toggle="true"
          onClick={onClick}
          className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none"
        >
          {isFullscreen ? (
            <Minimize01 className="size-4" />
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
    const chain = editor.chain().focus()
    const selectionSnapshot = getSelectionSnapshot()
    const isLegacyHeading = editor.isActive("heading")

    if (selectionSnapshot && selectionSnapshot.from !== selectionSnapshot.to) {
      chain.setTextSelection(selectionSnapshot)
    }

    switch (value) {
      case "Large Heading":
        if (isLegacyHeading) {
          chain.setParagraph()
        }
        chain.setFontSize("large-heading").run()
        break
      case "Normal Heading":
        if (isLegacyHeading) {
          chain.setParagraph()
        }
        chain.setFontSize("normal-heading").run()
        break
      case "Small Heading":
        if (isLegacyHeading) {
          chain.setParagraph()
        }
        chain.setFontSize("small-heading").run()
        break
      case "Normal Text":
        if (isLegacyHeading) {
          chain.setParagraph()
        }
        chain.extendMarkRange("fontSize").unsetFontSize().run()
        break
    }
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
      editor.chain().focus().toggleBulletList().run()
      return
    }

    const activeMarks = getActiveInlineMarks()
    const chain = editor.chain().focus().setParagraph().toggleBulletList()
    restoreInlineMarks(chain, activeMarks)
    chain.run()
  }

  const handleOrderedListToggle = () => {
    if (editor.isActive("orderedList")) {
      editor.chain().focus().toggleOrderedList().run()
      return
    }

    const activeMarks = getActiveInlineMarks()
    const chain = editor.chain().focus().setParagraph().toggleOrderedList()
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
  initialFocusPoint,
}: {
  defaultValue: string
  editorClassName?: string
  toolbarClassName?: string
  onUpdate?: (html: string) => void
  onBlur?: (html: string) => void
  onEditorReady?: (editor: Editor | null) => void
  initialFocusPoint?: {
    left: number
    top: number
  } | null
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

        const proseMirrorWidth =
          proseMirrorElement.getBoundingClientRect().width
        const nextWidth =
          align === "full-width" ? proseMirrorWidth : proseMirrorWidth / 2
        const nextLeft =
          align === "full-width"
            ? 0
            : dropSide === "right"
              ? proseMirrorWidth - nextWidth
              : 0

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

          const currentAlign = draggedImageRef.current.align
          if (currentAlign === "full-width") {
            document.body.dataset.richTextDragAlign = currentAlign
            delete document.body.dataset.richTextDropSide
            syncDropCursorPreview(currentAlign)
            return false
          }

          const containerRect = containerRef.current.getBoundingClientRect()
          const midpoint = containerRect.left + containerRect.width / 2
          const nextSide = event.clientX >= midpoint ? "right" : "left"

          document.body.dataset.richTextDragAlign = currentAlign
          document.body.dataset.richTextDropSide = nextSide
          syncDropCursorPreview(currentAlign, nextSide)
          return false
        },
        dragend: () => {
          clearImageDragPreviewState()
          return false
        },
        drop: (_view, event) => {
          const draggedImage = draggedImageRef.current

          if (
            draggedImage &&
            containerRef.current &&
            draggedImage.align !== "full-width"
          ) {
            const containerRect = containerRef.current.getBoundingClientRect()
            const midpoint = containerRect.left + containerRect.width / 2
            const nextSide: ImageAlignValue =
              event.clientX >= midpoint ? "right" : "left"

            if (nextSide !== draggedImage.align) {
              window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                  if (!editor || !containerRef.current) {
                    return
                  }

                  const images = Array.from(
                    containerRef.current.querySelectorAll("img")
                  ) as HTMLImageElement[]

                  const draggedImageElement = images.find((image) =>
                    image.hasAttribute("data-rich-text-drag-source")
                  )

                  const matchingImages = draggedImage.src
                    ? images.filter(
                        (image) =>
                          (image.currentSrc ||
                            image.getAttribute("src") ||
                            "") === draggedImage.src
                      )
                    : images

                  const candidateImage =
                    draggedImageElement ??
                    matchingImages
                      .map((image) => {
                        const rect = image.getBoundingClientRect()
                        const centerX = rect.left + rect.width / 2
                        const centerY = rect.top + rect.height / 2
                        const distance = Math.hypot(
                          centerX - event.clientX,
                          centerY - event.clientY
                        )

                        return { image, distance }
                      })
                      .sort((left, right) => left.distance - right.distance)[0]
                      ?.image

                  if (!(candidateImage instanceof HTMLImageElement)) {
                    return
                  }

                  try {
                    const pos = editor.view.posAtDOM(candidateImage, 0)
                    const node = editor.state.doc.nodeAt(pos)

                    if (
                      node?.type.name === "image" &&
                      node.attrs.align !== nextSide
                    ) {
                      updateImageAtPos(pos, { align: nextSide })
                    }
                  } catch {
                    return
                  }
                })
              })
            }
          }

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

    setFloatingToolbarPosition({
      top: rect.top - containerRect.top - 49,
      left: rect.left - containerRect.left,
    })
  }, [editor, hasFontMenuAnchorSelection])

  const handleFontMenuOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        fontMenuAnchorSelectionRef.current = false
        fontMenuSelectionRef.current = null
        setIsFontMenuOpen(false)
        setHasFontMenuAnchorSelection(false)
        return
      }

      if (
        !editor ||
        (!selectionHasTextContent(editor) &&
          !hasFontMenuAnchorSelection &&
          !fontMenuAnchorSelectionRef.current)
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
    [editor, hasFontMenuAnchorSelection, isToolbarPinned]
  )

  const handleFontMenuTriggerMouseDown = useCallback(() => {
    if (editor && selectionHasTextContent(editor)) {
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
        setHoveredImage({
          pos,
          top: imageRect.top - containerRect.top + 20,
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

        const selection = selectionRef.current
        const insertChain = editor.chain().focus(undefined, {
          scrollIntoView: false,
        })

        if (selection) {
          insertChain.setTextSelection(selection)
        }

        insertChain
          .setImage({
            src: imageSource,
            alt: file.name,
            align: DEFAULT_IMAGE_ALIGN,
          } as any)
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
      {editor && isToolbarPinned && shouldKeepToolbarVisible ? (
        <div
          className={cn(
            "absolute left-0 -top-[51px] z-20 inline-flex",
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
            if (!isImageAlignMenuOpen && !isImageEditorOpen && !isDeleteDialogOpen) {
              clearHoveredImage()
            }
          }}
          onAlignMenuOpenChange={(open) => {
            setIsImageAlignMenuOpen(open)
            if (!open && !isHoveringImageToolbar && !isImageEditorOpen && !isDeleteDialogOpen) {
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
      <TooltipProvider delayDuration={75}>
        <Tooltip>
          <TooltipTrigger
            type="button"
            onClick={() => handleInsertImage()}
            disabled={isUploadingImage}
            className="absolute right-[50px] top-3 z-10 inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white/95 text-gray-500 shadow-sm transition duration-200 hover:bg-white hover:text-dark-blue-400 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50"
          >
            <ImageIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top" visual="white" sideOffset={8}>
            Add image
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
}: {
  defaultValue?: string
  placeholder?: string
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  onUpdate?: (html: string) => void
  onBlur?: (html: string) => void
  allowFullscreen?: boolean
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [content, setContent] = useState(() =>
    normalizeRichTextHtml(defaultValue || "")
  )
  const [lastSavedAt, setLastSavedAt] = useState(() => new Date())
  const [initialFocusPoint, setInitialFocusPoint] = useState<{
    left: number
    top: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldResumeInlineEditingRef = useRef(false)
  const fullscreenEditorRef = useRef<Editor | null>(null)
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
    [isEditing, isFullscreenOpen]
  )

  const handleFullscreenOpenChange = useCallback((open: boolean) => {
    setIsFullscreenOpen(open)

    if (!open) {
      setIsEditing(shouldResumeInlineEditingRef.current)
      shouldResumeInlineEditingRef.current = false
    }
  }, [])

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
    contentClassName,
    "min-h-[calc(100vh-168px)] [&_.ProseMirror]:min-h-[calc(100vh-220px)]"
  )

  const fullscreenEditor = (
    <ActiveEditor
      defaultValue={content}
      editorClassName={fullscreenEditorClassName}
      toolbarClassName={toolbarClassName}
      initialFocusPoint={null}
      onEditorReady={handleFullscreenEditorReady}
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
      {allowFullscreen ? (
        <div className="absolute right-3 top-3 z-10">
          <FullscreenToggleButton
            isFullscreen={false}
            onClick={handleFullscreenToggle}
          />
        </div>
      ) : null}
      {editorSurface}
      {allowFullscreen ? (
        <Dialog
          open={isFullscreenOpen}
          onOpenChange={handleFullscreenOpenChange}
        >
          <DialogContent
            accessibilityTitle="Fullscreen rich text editor"
            data-rich-text-fullscreen-dialog="true"
            className="!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none !h-dvh w-screen !rounded-none !p-0 gap-0 overflow-y-auto shadow-none flex flex-col"
          >
            <DialogTitle className="sr-only">Project Description</DialogTitle>
            <DialogDescription className="sr-only">
              Edit your project description in fullscreen.
            </DialogDescription>

            <nav className="sticky top-0 z-20 h-[68px] flex items-center justify-between px-3 bg-white border-b border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
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
                        Edited recently
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
                          <Minimize01 className="size-5" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent
                        sideOffset={9}
                        visual="gray"
                        side="bottom"
                      >
                        Minimize
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </nav>

            <div className="relative flex-1 bg-gray-50">
              <div className="px-[50px]">
                <div
                  data-rich-text-fullscreen-content="true"
                  className="mx-auto w-full max-w-[818px]"
                >
                  {fullscreenEditor}
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
