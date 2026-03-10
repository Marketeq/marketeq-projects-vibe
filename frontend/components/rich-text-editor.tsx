"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/utils/functions"
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
  ChevronDown,
} from "@blend-metrics/icons"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  HeadlessSelectTrigger,
  HeadlessSelectIcon,
  SelectValue,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExtension from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"

const RichTextToolbar = ({
  editor,
  className,
}: {
  editor: Editor | null
  className?: string
}) => {
  if (!editor) return null

  const handleHeadingChange = (value: string) => {
    switch (value) {
      case "Large Heading":
        editor.chain().focus().toggleHeading({ level: 1 }).run()
        break
      case "Normal Heading":
        editor.chain().focus().toggleHeading({ level: 2 }).run()
        break
      case "Small Heading":
        editor.chain().focus().toggleHeading({ level: 3 }).run()
        break
      case "Normal Text":
        editor.chain().focus().setParagraph().run()
        break
    }
  }

  const getCurrentHeading = () => {
    if (editor.isActive("heading", { level: 1 })) return "Large Heading"
    if (editor.isActive("heading", { level: 2 })) return "Normal Heading"
    if (editor.isActive("heading", { level: 3 })) return "Small Heading"
    return "Normal Text"
  }

  return (
    <div
      className={cn(
        "h-[41px] p-2 bg-black rounded-lg border border-gray-800 inline-flex items-center shrink-0 shadow-[0px_10px_13.33px_-3.33px_rgba(16,24,40,.08)]",
        className
      )}
    >
      <div className="first:pl-0 px-2 last:pr-0">
        <Select value={getCurrentHeading()} onValueChange={handleHeadingChange}>
          <HeadlessSelectTrigger className="flex text-xs leading-none whitespace-nowrap text-white hover:text-white/75 data-[state=open]:text-white shrink-0 h-[25px] rounded-[4px] bg-white/15 hover:bg-white/15 transition duration-300 data-[state=open]:bg-white/15 data-[placeholder]:bg-transparent data-[placeholder]:text-white/50 focus-visible:outline-none px-2 items-center gap-x-1">
            <SelectValue />
            <HeadlessSelectIcon>
              <ChevronDown className="size-[13.33px]" />
            </HeadlessSelectIcon>
          </HeadlessSelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="Normal Text">Normal Text</SelectItem>
              <SelectItem value="Large Heading">Large Heading</SelectItem>
              <SelectItem value="Normal Heading">Normal Heading</SelectItem>
              <SelectItem value="Small Heading">Small Heading</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="first:pl-0 inline-flex px-2 last:pr-0 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
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
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
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
              pressed={editor.isActive("underline")}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
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
              pressed={editor.isActive("strike")}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
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
      <div className="first:pl-0 inline-flex px-2 last:pr-0 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={editor.isActive({ textAlign: "left" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <ToLeft />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Left Align ⌘+Shift+L
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={editor.isActive({ textAlign: "center" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <ToCenter />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Center Align ⌘+Shift+E
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={editor.isActive({ textAlign: "right" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <ToRight />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Right Align ⌘+Shift+R
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="first:pl-0 inline-flex px-2 last:pr-0 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle
              pressed={editor.isActive("bulletList")}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
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
              pressed={editor.isActive("orderedList")}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              asChild
            >
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <OrderedList />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Ordered List
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
}: {
  defaultValue: string
  editorClassName?: string
  toolbarClassName?: string
  onUpdate?: (html: string) => void
  onBlur?: (html: string) => void
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    immediatelyRender: false,
    content: defaultValue || "",
    editorProps: {
      attributes: {
        class: cn(
          "focus:outline-none",
          editorClassName
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML())
    },
    onBlur: ({ editor }) => {
      onBlur?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor) {
      editor.commands.focus("end")
    }
  }, [editor])

  return (
    <div className="relative group/editor">
      <div className="absolute left-0 -top-[51px] z-10 inline-flex">
        <RichTextToolbar editor={editor} className={toolbarClassName} />
      </div>
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
}: {
  defaultValue?: string
  placeholder?: string
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  onUpdate?: (html: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(defaultValue || "")
  const containerRef = useRef<HTMLDivElement>(null)

  const handleBlur = useCallback((html: string) => {
    setContent(html)
    onUpdate?.(html)
    // Delay to allow click events to register on toolbar
    setTimeout(() => {
      setIsEditing(false)
    }, 200)
  }, [onUpdate])

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <div className={cn("relative", className)}>
        <ActiveEditor
          defaultValue={content}
          editorClassName={editorClassName}
          toolbarClassName={toolbarClassName}
          onUpdate={(html) => {
            setContent(html)
            onUpdate?.(html)
          }}
          onBlur={handleBlur}
        />
      </div>
    )
  }

  return (
    <div
      className={cn("relative cursor-text", className)}
      onClick={handleClick}
    >
      <div
        className={cn("focus:outline-none", editorClassName)}
        dangerouslySetInnerHTML={{ __html: content || placeholder || "" }}
      />
    </div>
  )
}

export { RichTextEditor, RichTextToolbar, useEditor, EditorContent }
export type { Editor }
export { StarterKit, UnderlineExtension, TextAlign }
