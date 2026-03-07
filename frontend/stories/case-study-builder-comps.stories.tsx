import React, { SVGProps, useEffect, useReducer, useRef, useState } from "react"
import { cn, fromLength, getId } from "@/utils/functions"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Attachment01,
  BarChart10,
  Check,
  ChevronDown,
  Clock,
  Columns03,
  Copy02,
  Dataflow02,
  Dataflow03,
  Edit03,
  Eye,
  EyeOff,
  File02,
  File06,
  Image03,
  Image as ImageIcon,
  List,
  MapPin,
  MessageSquare,
  MessageSquare01,
  Mic,
  Monitor02,
  PlaySquare,
  Plus,
  ReverseLeft,
  ReverseRight,
  Send,
  Smile,
  Trash01,
  Type02,
  Upload,
  Users03,
  X,
} from "@blend-metrics/icons"
import { zodResolver } from "@hookform/resolvers/zod"
import { Meta } from "@storybook/react"
import {
  DragControls,
  HTMLMotionProps,
  MotionValue,
  Reorder,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion"
import { useDrag } from "react-aria"
import {
  Controller,
  SubmitHandler,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { useMotion } from "react-use"
import { z } from "zod"
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
import { Grid01 } from "@/components/icons/grid-01"
import NextImage from "@/components/next-image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  EditableArea,
  EditableInput,
  EditableLabel,
  EditablePreview,
  EditableRoot,
  HeadlessSelectIcon,
  HeadlessSelectTrigger,
  IconButton,
  PictureEditor,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Case Study Builder Comps",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

export const Toolbar = ({ className }: { className?: string }) => {
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <div className="py-1.5 px-1 bg-black border-b inline-flex justify-center items-center border-white/20 rounded-t-[7px]">
        <button className="inline-block focus-visible:outline-none opacity-40 hover:opacity-100 transition duration-300">
          <Grid01 className="text-white" />
        </button>
      </div>
      <div className="p-[7px] rounded-b-[7px] bg-black inline-flex flex-col gap-y-[7px]">
        <button className="size-[52.3px] flex flex-col items-center shrink-0 opacity-50 focus-visible:outline-none hover:border hover:border-white/30 hover:bg-white/10 hover:opacity-100 rounded-[5px] transition duration-300 justify-center">
          <Type02 className="size-6 text-white" />
          <span className="text-[9px] leading-none font-semibold text-white">
            Text
          </span>
        </button>
        <button className="size-[52.3px] flex flex-col items-center shrink-0 opacity-50 focus-visible:outline-none hover:border hover:border-white/30 hover:bg-white/10 hover:opacity-100 rounded-[5px] transition duration-300 justify-center">
          <Picture className="size-6 text-white" />
          <span className="text-[9px] leading-none font-semibold text-white">
            Image
          </span>
        </button>
        <button className="size-[52.3px] flex flex-col items-center shrink-0 opacity-50 focus-visible:outline-none hover:border hover:border-white/30 hover:bg-white/10 hover:opacity-100 rounded-[5px] transition duration-300 justify-center">
          <Columns03 className="size-6 text-white" />
          <span className="text-[9px] leading-none font-semibold text-white">
            Columns
          </span>
        </button>
        <button className="size-[52.3px] flex flex-col items-center shrink-0 opacity-50 focus-visible:outline-none hover:border hover:border-white/30 hover:bg-white/10 hover:opacity-100 rounded-[5px] transition duration-300 justify-center">
          <PlaySquare className="size-6 text-white" />
          <span className="text-[9px] leading-none font-semibold text-white">
            Video
          </span>
        </button>
        <button className="size-[52.3px] flex flex-col items-center shrink-0 opacity-50 focus-visible:outline-none hover:border hover:border-white/30 hover:bg-white/10 hover:opacity-100 rounded-[5px] transition duration-300 justify-center">
          <Smile className="size-6 text-white" />
          <span className="text-[9px] leading-none font-semibold text-white">
            Emoji
          </span>
        </button>
      </div>
    </div>
  )
}

const Grid = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={13}
    height={11}
    viewBox="0 0 13 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10.842.342a1.166 1.166 0 1 1 1.65 1.65 1.166 1.166 0 0 1-1.65-1.65M6.417 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m-5.25 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m9.675 4.675a1.166 1.166 0 1 1 1.65 1.65 1.166 1.166 0 0 1-1.65-1.65m-4.425-.342a1.167 1.167 0 1 0 0 2.334 1.167 1.167 0 0 0 0-2.334m-5.25 0a1.167 1.167 0 1 0 0 2.334 1.167 1.167 0 0 0 0-2.334m9.675 4.676a1.166 1.166 0 1 1 1.65 1.649 1.166 1.166 0 0 1-1.65-1.65m-4.425-.341a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333m-5.25 0a1.167 1.167 0 1 0 0 2.333 1.167 1.167 0 0 0 0-2.333"
      fill="currentColor"
    />
  </svg>
)

export const BlockToolbar = ({
  className,
  onDrag,
  canMoveLeft,
  canMoveRight,
  moveLeft,
  moveRight,
  onRemove,
  onDuplicate,
  canDuplicate,
  canRemove,
  canHide,
  canMoveDown,
  canMoveUp,
}: {
  className?: string
  onDrag?: (event: React.PointerEvent<HTMLElement>) => void
  moveLeft?: () => void
  canMoveLeft?: boolean
  moveRight?: () => void
  canMoveRight?: boolean
  onRemove?: () => void
  canRemove?: boolean
  onDuplicate?: () => void
  canDuplicate?: boolean
  canHide?: boolean
  canMoveDown?: boolean
  canMoveUp?: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "inline-flex rounded-[5px] bg-white border-gray-300 border divide-x divide-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]",
        className
      )}
    >
      <TooltipProvider delayDuration={75}>
        <Tooltip>
          <TooltipTrigger
            onPointerDown={onDrag}
            className="first:rounded-l-[5px] cursor-grab last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
          >
            <Grid />
          </TooltipTrigger>
          <TooltipContent visual="white">Drag</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {canMoveRight && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={moveRight}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowRight className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Right</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveDown && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950">
              <ArrowDown className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Down</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveUp && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950">
              <ArrowUp className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Up</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canMoveLeft && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={moveLeft}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <ArrowLeft className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Move Left</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canHide && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950">
              <EyeOff className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Hide Element </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canDuplicate && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={onDuplicate}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
            >
              <Copy02 className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Duplicate</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {canRemove && (
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setOpen(true)}
              className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-error-500 justify-center hover:bg-error-100 hover:text-error-600"
            >
              <Trash01 className="size-4" />
            </TooltipTrigger>
            <TooltipContent visual="white">Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[409px] p-0">
          <div className="p-6">
            <DialogTitle className="text-dark-blue-400">
              Delete this column?
            </DialogTitle>
            <DialogDescription className="text-dark-blue-400 mt-2">
              The column will be removed permanently.
            </DialogDescription>
          </div>

          <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
            <DialogClose asChild>
              <Button variant="link" visual="gray">
                <X className="size-[15px]" /> Cancel
              </Button>
            </DialogClose>

            <DialogClose onClick={onRemove} asChild>
              <Button variant="outlined" visual="gray">
                Yes, Delete
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const BlockImageToolbar = ({
  className,
  onAddImage,
  onRemove,
  onEdit,
  enableEdit,
  enableRemove,
}: {
  className?: string
  onAddImage: () => void
  onRemove: () => void
  onEdit: () => void
  enableEdit: boolean
  enableRemove: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={cn(
        "inline-flex rounded-[5px] bg-white border-gray-300 border divide-x divide-gray-300 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]",
        className
      )}
    >
      {enableEdit && (
        <button
          onClick={onEdit}
          className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
        >
          <Edit03 className="size-4" />
        </button>
      )}
      <button
        className="first:rounded-l-[5px] last:rounded-r-[5px] px-2.5 focus-visible:outline-none text-xs leading-5 font-semibold inline-flex items-center gap-x-2 h-9 shrink-0 text-gray-500 justify-center hover:bg-gray-100 hover:text-gray-950"
        onClick={onAddImage}
      >
        <Upload className="size-4" /> Add Image
      </button>
      {enableRemove && (
        <button
          className="first:rounded-l-[5px] last:rounded-r-[5px] focus-visible:outline-none inline-flex items-center size-9 shrink-0 text-error-500 justify-center hover:bg-error-100 hover:text-error-600"
          onClick={() => setOpen(true)}
        >
          <Trash01 className="size-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[409px] p-0">
          <div className="p-6 border-b border-gray-200">
            <DialogTitle>Delete this image?</DialogTitle>
            <DialogDescription className="mt-2">
              Your image will be removed permanently.
            </DialogDescription>
          </div>
          <div className="py-4 flex rounded-b-xl bg-gray-25 items-center justify-between px-6">
            <DialogClose asChild>
              <Button
                className="opacity-50 hover:opacity-100"
                visual="gray"
                variant="link"
              >
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>

            <Button
              variant="outlined"
              visual="gray"
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
            >
              Yes, Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const ToBeAdded = ({ onPlus }: { onPlus?: () => void }) => {
  return (
    <div className="flex items-center flex-auto">
      <div className="h-0.5 flex-auto bg-gray-200" />
      <button
        onClick={onPlus}
        className="size-[41px] shrink-0 focus-visible:outline-none rounded-full inline-flex justify-center items-center border-2 bg-gray-100 hover:bg-white text-gray-500 border-gray-300 hover:border-gray-400 shadow-[0px_4px_8px_-2px_rgba(16,24,40,.1)] transition duration-300"
      >
        <Plus className="size-5" />
      </button>
      <div className="h-0.5 flex-auto bg-gray-200" />
    </div>
  )
}

export const FlexibleToolbar = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "h-[41px] p-2 bg-black rounded-lg border border-gray-800 inline-flex items-center shrink-0 shadow-[0px_10px_13.33px_-3.33px_rgba(16,24,40,.08)]",
        className
      )}
    >
      <div className="first:pl-0 px-2 last:pr-0">
        <Select defaultValue="Normal Heading">
          <HeadlessSelectTrigger className="flex text-xs leading-none whitespace-nowrap text-white hover:text-white/75 data-[state=open]:text-white shrink-0 h-[25px] rounded-[4px] bg-white/15 hover:bg-white/15 transition duration-300 data-[state=open]:bg-white/15 data-[placeholder]:bg-transparent data-[placeholder]:text-white/50 focus-visible:outline-none px-2 items-center gap-x-1">
            <SelectValue defaultValue="Select a country" />
            <HeadlessSelectIcon>
              <ChevronDown className="size-[13.33px]" />
            </HeadlessSelectIcon>
          </HeadlessSelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="Large Heading">Large Heading</SelectItem>
              <SelectItem value="Normal Heading">Normal Heading</SelectItem>
              <SelectItem value="Small Heading">Small Heading</SelectItem>
              <SelectItem value="Bold Statement">Bold Statement</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="first:pl-0 inline-flex px-2 last:pr-0 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle asChild>
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <Bold />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Bold ⌘U
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle asChild>
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
            <Toggle asChild>
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
            <Toggle asChild>
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <StrikeThrough />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Strikethrough ⌘S
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <span className="h-4 inline-block w-px bg-white/20" />
      <div className="first:pl-0 inline-flex px-2 last:pr-0 items-center gap-x-1">
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle asChild>
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
            <Toggle asChild>
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <ToCenter />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Center Align ⌘+Shift+C
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle asChild>
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
            <Toggle asChild>
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <UnorderedList />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Bullet List ⌘L
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={75}>
          <Tooltip>
            <Toggle asChild>
              <TooltipTrigger className="inline-flex h-[25px] shrink-0 focus-visible:outline-none justify-center items-center rounded-[4px] hover:bg-white/15 data-[state=on]:bg-white/15 text-gray-50/50 hover:text-white/75 data-[state=on]:text-white data-[state=on]:hover:text-white transition duration-300">
                <OrderedList />
              </TooltipTrigger>
            </Toggle>
            <TooltipContent side="top" visual="white" sideOffset={9.14}>
              Ordered List ⌘O
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

export const InitialBlock = () => {
  return (
    <div className="border border-gray-200 p-[100px] bg-white rounded-[10px] flex flex-col gap-y-[100px]">
      <div className="space-y-3">
        <h1 className="text-[64px] leading-none text-dark-blue-400 font-semibold">
          Your Case Study Title
        </h1>
        <p className="text-2xl leading-none font-light text-dark-blue-400">
          Write what into this design or add any details you want to mention
        </p>
      </div>

      <div className="border-2 border-dashed text-gray-200 cursor-pointer data-[state=active]:bg-gray-100 bg-gray-50 p-6 rounded-[8px]">
        <div className="p-6">
          <div className="max-w-[206px] mx-auto">
            <h3 className="text-base text-center leading-6 font-medium text-gray-900">
              Drag Your Fields Here
            </h3>
            <p className="text-xs text-center leading-none mt-0.5 text-gray-500">
              No fields have been added yet. Let’s add some fields now.
            </p>
          </div>

          <div className="flex items-center justify-center mt-5">
            <Button className="bg-white" variant="outlined" visual="gray">
              <Plus className="size-[15px]" /> Add New Block
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TemplateDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-white" variant="outlined" visual="gray">
          <Plus className="size-[15px]" /> Add New Block
        </Button>
      </DialogTrigger>
      <DialogContent
        dialogOverlay={<DialogOverlay className="blur-lg" />}
        className="max-w-[875px] p-0"
      >
        <div className="pl-6 p-3 flex items-center justify-between border-b border-gray-200">
          <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
            Select your section
          </h1>

          <IconButton className="text-gray-500" variant="ghost" visual="gray">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="p-6 grid grid-cols-4 gap-3">
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <File02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Introduction
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Type02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Bold Statement
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Picture className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Gallery
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <List className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Challenges
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Dataflow02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Process
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <ImageIcon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Process
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Mic className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Interview
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Users03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Personas
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <PlaySquare className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Video
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Dataflow03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Customer Journey
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <MessageSquare className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Testimonial
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <ImageIcon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Image & Text
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <BarChart10 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Result Metrics
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Monitor02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Prototype
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <File06 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Conclusion
            </span>
          </button>
          <button className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
            <Columns03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
            <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none">
              Custom Columns
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const Addened = ({
  className,
  onAdd,
  triggerClassName,
}: {
  className?: string
  onAdd?: () => void
  triggerClassName?: string
}) => {
  return (
    <div className={cn("h-[402px] relative inline-flex", className)}>
      <div className="w-1 rounded-full bg-primary-500" />
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2",
          triggerClassName
        )}
      >
        <button
          onClick={onAdd}
          className="rounded-full focus-visible:outline-none transition duration-300 hover:bg-white hover:text-primary-500 bg-primary-500 shrink-0 text-white border-2 border-primary-500 size-[25px] inline-flex items-center justify-center"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}

const Picture = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width={84}
    height={76}
    viewBox="0 0 84 76"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.952 65.638 38.04 44.75c1.386-1.254 2.08-1.88 2.878-2.116a3.85 3.85 0 0 1 2.164 0c.799.235 1.492.862 2.878 2.116L68.894 65.5M49 47.5l10.04-9.084c1.386-1.254 2.08-1.881 2.878-2.116a3.85 3.85 0 0 1 2.164 0c.799.235 1.492.862 2.878 2.116L77 47.5m-42-19c0 3.498-3.134 6.333-7 6.333s-7-2.835-7-6.333 3.134-6.333 7-6.333 7 2.835 7 6.333m-11.2 38h36.4c5.88 0 8.82 0 11.067-1.035 1.976-.911 3.582-2.365 4.589-4.152C77 59.28 77 56.62 77 51.3V24.7c0-5.32 0-7.98-1.144-10.013-1.007-1.787-2.613-3.24-4.59-4.152C69.022 9.5 66.082 9.5 60.2 9.5H23.8c-5.88 0-8.82 0-11.067 1.035-1.976.911-3.582 2.365-4.589 4.152C7 16.72 7 19.38 7 24.7v26.6c0 5.32 0 7.98 1.144 10.013 1.007 1.787 2.613 3.24 4.59 4.152C14.978 66.5 17.918 66.5 23.8 66.5"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ControlledDraggable = ({
  children,
  withFragments = false,
  ...props
}: Omit<HTMLMotionProps<"h1">, "children"> & {
  children?: (dragControls: DragControls) => React.ReactNode
  withFragments?: boolean
}) => {
  const dragControls = useDragControls()

  if (withFragments) {
    return <>{children?.(dragControls)}</>
  }

  return (
    <motion.div
      drag
      dragListener={false}
      dragControls={dragControls}
      {...props}
    >
      {children?.(dragControls)}
    </motion.div>
  )
}

const inactiveShadow = "0px 0px 0px rgba(0,0,0,0)"

function useRaisedShadow(value: MotionValue<number>) {
  const boxShadow = useMotionValue(inactiveShadow)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          animate(boxShadow, "0px 32px 64px -12px rgba(16,24,40,.14)")
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          animate(boxShadow, inactiveShadow)
        }
      }
    })
  }, [value, boxShadow])

  return boxShadow
}

const inactiveBorderColor = "rgba(0,0,0,0)"

function useRaisedBorderColor(value: MotionValue<number>) {
  const borderColor = useMotionValue(inactiveBorderColor)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          animate(borderColor, "rgba(48,108,254,1)")
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          animate(borderColor, inactiveBorderColor)
        }
      }
    })
  }, [value, borderColor])

  return borderColor
}

function useRaisedBgColor(value: MotionValue<number>) {
  const bgColor = useMotionValue(inactiveBorderColor)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          animate(bgColor, "rgba(255,255,255,1)")
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          animate(bgColor, inactiveBorderColor)
        }
      }
    })
  }, [value, bgColor])

  return bgColor
}

function useBeingDragged(value: MotionValue<number>) {
  const [dragged, setDragged] = useState(false)

  useEffect(() => {
    let isActive = false
    value.on("change", (latest) => {
      const wasActive = isActive
      if (latest !== 0) {
        isActive = true
        if (isActive !== wasActive) {
          setDragged(true)
        }
      } else {
        isActive = false
        if (isActive !== wasActive) {
          setDragged(false)
        }
      }
    })
  }, [value])

  return dragged
}

const ArticleRoot = ({
  children,
  value,
  isLast,
  dragControls,
  className,
  outlinedContainer,
  outlinedContainerClassName,
}: {
  children?: React.ReactNode
  value: number
  isLast: boolean
  dragControls: DragControls
  className?: string
  outlinedContainer?: boolean
  outlinedContainerClassName?: string
}) => {
  const x = useMotionValue(0)
  const boxShadow = useRaisedShadow(x)
  const borderColor = useRaisedBorderColor(x)
  const isBeingDragged = useBeingDragged(x)

  return (
    <Reorder.Item
      as="article"
      value={value}
      style={{
        x,
        boxShadow: outlinedContainer ? inactiveShadow : boxShadow,
        borderColor: outlinedContainer ? inactiveBorderColor : borderColor,
      }}
      data-last={isLast}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "peer group/article relative rounded-lg border-2",
        className
      )}
      data-state={isBeingDragged ? "dragged" : ""}
    >
      {outlinedContainer ? (
        <motion.div
          className={cn(
            "absolute rounded-lg border-2 -inset-5 bg-white border-primary-500 hidden group-hover/article:block",
            outlinedContainerClassName
          )}
          style={{ boxShadow }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </Reorder.Item>
  )
}

const swap = <T extends any[]>(values: T, i: number, j: number) => {
  ;[values[i], values[j]] = [values[j], values[i]]
  return values.slice()
}

export const BlockWithCols = () => {
  const [items, setItems] = useState([0, 1])
  const len = items.length

  return (
    <div className="relative group/root border border-gray-200 p-[100px] bg-white rounded-[10px] flex flex-col gap-y-[100px]">
      <Toolbar className="top-[50px] absolute -right-[33px]" />

      <div className="space-y-3">
        <h1 className="group/block relative font-semibold">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <EditableRoot
            className="relative"
            defaultValue="Your Case Study Title"
          >
            <EditableLabel>Title</EditableLabel>
            <EditableArea>
              <EditableInput
                asChild
                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[64px] [field-sizing:content] resize-none scrollbar-none text-[64px] leading-none font-semibold text-dark-blue-400"
              >
                <textarea />
              </EditableInput>
              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[64px] leading-none font-semibold text-dark-blue-400" />
            </EditableArea>
          </EditableRoot>
        </h1>

        <p className="group/block relative">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <EditableRoot
            className="relative"
            defaultValue="Write what into this design or add any details you want to mention"
          >
            <EditableLabel>Sub Title</EditableLabel>
            <EditableArea>
              <EditableInput
                asChild
                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
              >
                <textarea />
              </EditableInput>
              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
            </EditableArea>
          </EditableRoot>
        </p>
      </div>

      <div className="relative group">
        <h1 className="relative group/block">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <EditableRoot
            className="relative"
            defaultValue="These are your columns"
          >
            <EditableLabel>These are your columns</EditableLabel>
            <EditableArea>
              <EditableInput
                asChild
                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
              >
                <textarea />
              </EditableInput>
              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
            </EditableArea>
          </EditableRoot>
        </h1>
        {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute hidden opacity-0 group-focus-within:group-hover:hidden group-focus-within:group-hover:opacity-0 group-hover:inline-flex group-hover:opacity-100 transition duration-300" />*/}

        <div className="mt-8">
          <Reorder.Group
            as="div"
            className="isolate relative grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:50px]"
            axis="x"
            style={{ ...({ "--cols": len } as Record<string, number>) }}
            values={items}
            onReorder={setItems}
          >
            {items.map((item, index) => (
              <React.Fragment key={item}>
                <ControlledDraggable withFragments>
                  {(dragControls) => (
                    <ArticleRoot
                      value={item}
                      isLast={index === len - 1}
                      dragControls={dragControls}
                    >
                      <BlockToolbar
                        className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[18px] -right-[17px] absolute z-10"
                        onDrag={(event) => dragControls.start(event)}
                        canMoveLeft={Boolean(index)}
                        moveLeft={() => setItems(swap(items, index, index - 1))}
                        canMoveRight={index < len - 1}
                        moveRight={() =>
                          setItems(swap(items, index, index + 1))
                        }
                        canRemove={len > 2}
                        onRemove={() =>
                          setItems(items.filter((itm) => itm !== item))
                        }
                        canDuplicate={len < 3}
                        onDuplicate={() => {
                          const uniqueId = getId() + 2
                          setItems(items.toSpliced(index, 0, uniqueId))
                        }}
                      />

                      <PictureEditor
                        startingPoint={({
                          dataUrl,
                          open,
                          style,
                          onRemove,
                          onEdit,
                        }) => (
                          <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image h-[250px] bg-gray-100 grid rounded-lg place-items-center hover:bg-black/20 hover:ring-2 hover:ring-primary-500 transition duration-300">
                            {dataUrl ? (
                              <div
                                className="size-full rounded-lg transform"
                                style={style}
                              >
                                <img
                                  src={dataUrl}
                                  aria-label="Picture"
                                  className="absolute object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <>
                                <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-white" />
                              </>
                            )}
                            <BlockImageToolbar
                              className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                              onAddImage={open}
                              onRemove={onRemove}
                              onEdit={onEdit}
                              enableEdit={!!dataUrl}
                              enableRemove={!!dataUrl}
                            />
                          </div>
                        )}
                      />
                      <div className="mt-6">
                        <h1 className="relative group/block">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute z-10 left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="This is your heading"
                          >
                            <EditableLabel>Title</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-semibold text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-semibold text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </h1>
                        <p className="relative group/block mt-3">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute z-10 left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
                          >
                            <EditableLabel>Sub Title</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </p>
                      </div>
                    </ArticleRoot>
                  )}
                </ControlledDraggable>

                {len < 3 && (
                  <div
                    style={{
                      ...({ "--pos": index + 1 } as Record<string, number>),
                    }}
                    className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
                  >
                    <Addened
                      className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                      onAdd={() => {
                        const uniqueId = getId() + 2
                        setItems(items.toSpliced(index, 0, uniqueId))
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </Reorder.Group>
        </div>
      </div>

      <ToBeAdded />
    </div>
  )
}

export const SplitCard = () => {
  return (
    <div className="p-[84px]">
      <div className="relative group/region p-5">
        <span className="absolute -inset-5 group-hover/region:inline-block group-focus-within/region:hidden group-hover/region:group-focus-within/region:hidden opacity-0 hidden group-hover/region:opacity-100 group-focus-within/region:opacity-0 group-hover/region:group-focus-within/region:opacity-0 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/region:bg-primary-500/5 group-focus-within/region:bg-transparent group-hover/region:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/region:invisible group-hover/region:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/region:group-focus-within/block:invisible">
            Region
          </span>
          <BlockToolbar className="-top-[46px] -right-[17px] absolute group-hover/region:visible invisible transition-[visibility] duration-300" />
        </span>

        <div className="relative grid grid-cols-2 gap-x-[50px]">
          <PictureEditor
            startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
              <div className="overflow-hidden relative group/image bg-gray-100 grid rounded-lg place-items-center group-hover/region:bg-primary-50 hover:bg-black/20 hover:ring-2 hover:ring-primary-500 transition duration-300">
                {dataUrl ? (
                  <div className="size-full rounded-lg transform" style={style}>
                    <img
                      src={dataUrl}
                      aria-label="Picture"
                      className="absolute object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-primary-300" />
                )}
                <BlockImageToolbar
                  className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                  onAddImage={open}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  enableEdit={!!dataUrl}
                  enableRemove={!!dataUrl}
                />
              </div>
            )}
          />

          <div>
            <h1 className="group/block relative font-semibold">
              <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                  Text
                </span>
                <BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
              </span>
              <EditableRoot
                className="relative"
                defaultValue="These are your challenges"
              >
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            </h1>

            <p className="group/block relative mt-5">
              <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                  Text
                </span>
                <BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
              </span>
              <EditableRoot
                className="relative"
                defaultValue="This is left aligned. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
              >
                <EditableLabel>Sub Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ClientView = () => {
  return (
    <div className="p-[100px] bg-white">
      <div className="border rounded-lg bg-border-200 gap-x-[53.33px] flex items-center justify-between flex-wrap p-[50px]">
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
      </div>

      <div className="mt-[100px]">
        <h1 className="text-[40px] leading-none font-semibold text-dark-blue-400">
          This is your process
        </h1>

        <p className="leading-none mt-3 text-dark-blue-400 text-2xl font-light">
          Lorem Ipsum is simply dummy text of the printing and typesetting
          industry.
        </p>

        <div className="grid grid-cols-4 gap-x-3 mt-8">
          {fromLength(4).map((key) => (
            <article className="group" key={key} data-last={key === 3}>
              <div className="flex items-center gap-x-3">
                <div className="size-[91px] rounded-full text-[39px] leading-none font-medium text-primary-500 border-[4.33px] border-primary-500 shrink-0 inline-flex items-center justify-center">
                  {key + 1}
                </div>

                <div className="group-data-[last=true]:hidden border-2 flex-auto border-primary-500 border-dashed opacity-20" />
              </div>

              <div className="pr-[38px] mt-5">
                <h1 className="text-2xl leading-[1.5] font-medium text-dark-blue-400">
                  Step Name
                </h1>
                <p className="text-base leading-none font-light text-dark-blue-400 mt-3">
                  This is sample description for process
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-[100px]">
        <h1 className="text-[40px] leading-none font-semibold text-dark-blue-400">
          Interview Pointers
        </h1>

        <div className="mt-6">
          <p className="leading-none text-dark-blue-400 text-2xl font-light">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>

          <ul className="mt-4 space-y-4">
            <li className="leading-none text-2xl text-dark-blue-400 font-light">
              <span className="font-bold">Bullet Point 1:</span> Sed ut
              perspiciatis unde omnis iste natus
            </li>
            <li className="leading-none text-2xl  text-dark-blue-400 font-light">
              <span className="font-bold">Bullet Point 2:</span> Sed ut
              perspiciatis unde omnis iste natus
            </li>
            <li className="leading-none text-2xl  text-dark-blue-400 font-light">
              <span className="font-bold">Bullet Point 3:</span> Sed ut
              perspiciatis unde omnis iste natus
            </li>
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-2 border border-gray-200 rounded-lg overflow-hidden mt-[100px]">
        <div className="relative rounded-l-lg p-[32px]">
          <NextImage
            className="object-cover"
            src="/woman.jpg"
            alt="Woman"
            sizes="50vw"
            fill
          />

          <div className="bg-black/20 p-8 flex flex-col justify-end absolute inset-0 rounded-l-lg">
            <div>
              <h1 className="text-[40px] leading-none font-semibold text-white">
                Jane Doe
              </h1>
              <p className="text-2xl mt-3 leading-none text-white">
                28, Professional Model
              </p>
              <div className="mt-3 flex items-center gap-x-3 flex-wrap">
                <div className="inline-flex shrink-0 items-center rounded-full px-3 h-7 bg-white text-gray-700 text-sm font-medium">
                  Passionate
                </div>
                <div className="inline-flex shrink-0 items-center rounded-full px-3 h-7 bg-white text-gray-700 text-sm font-medium">
                  Passionate
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-8">
          <h1 className="text-base font-semibold text-dark-blue-400 leading-none">
            About
          </h1>

          <p className="font-light text-dark-blue-400 mt-3 leading-none text-sm">
            Jane is a Professional Model who lives in New York. She has been
            modeling for about 10 years at different companies like GAP, Levi’s,
            Banana Republic and Theory. It was when she was around 21 when she
            was contacted by the agency.
          </p>

          <div className="mt-[34.45px]">
            <h1 className="text-base font-semibold text-dark-blue-400 leading-none">
              Goals
            </h1>

            <div className="space-y-3 mt-3">
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
            </div>
          </div>
          <div className="mt-[34.45px]">
            <h1 className="text-base font-semibold text-dark-blue-400 leading-none">
              Frustrations
            </h1>

            <div className="space-y-5 mt-5">
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
              <p className="font-light text-dark-blue-400 leading-none text-sm">
                Always stay up-to-date and follow on her dietary restrictions
                and schedule
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[100px] border rounded-lg bg-border-200 gap-x-[53.33px] flex items-center justify-between flex-wrap p-[50px]">
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
        <div className="space-y-2">
          <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
            50%
          </h1>
          <p className="text-xl leading-none text-dark-blue-400">
            Less Time Spent
          </p>
        </div>
      </div>

      <div className="mt-[100px]">
        <h1 className="font-bold text-[40px] leading-none text-dark-blue-400">
          Testimonials
        </h1>

        <div className="mt-[32px] grid grid-cols-2 gap-x-[50px]">
          <article className="p-6 rounded-[20px] bg-gray-100 rounded-bl-none">
            <div className="flex items-start gap-x-3">
              <h1 className="pt-[11px] leading-none text-dark-blue-400 font-bold text-[114.33px]">
                “
              </h1>
              <h1 className="pt-6 text-dark-blue-400 text-2xl leading-none">
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry.
              </h1>
            </div>

            <div className="mt-[50px] flex items-center gap-x-2">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                <h1 className="text-sm font-bold text-dark-blue-400 leading-none">
                  John Doe
                </h1>
                <p className="text-[10px] font-light text-dark-blue-400">
                  Acme Inc. President & CEO
                </p>
              </div>
            </div>
          </article>
          <article className="p-6 rounded-[20px] bg-gray-100 rounded-bl-none">
            <div className="flex items-start gap-x-3">
              <h1 className="pt-[11px] leading-none text-dark-blue-400 font-bold text-[114.33px]">
                “
              </h1>
              <h1 className="pt-6 text-dark-blue-400 text-2xl leading-none">
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry.
              </h1>
            </div>

            <div className="mt-[50px] flex items-center gap-x-2">
              <Avatar size="md">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                <h1 className="text-sm font-bold text-dark-blue-400 leading-none">
                  John Doe
                </h1>
                <p className="text-[10px] font-light text-dark-blue-400">
                  Acme Inc. President & CEO
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="mt-[100px]">
        <h1 className="font-semibold text-[40px] leading-none text-dark-blue-400">
          This is your Conclusion
        </h1>
        <p className="mt-6 text-dark-blue-400 text-2xl leading-none font-light">
          Lorem Ipsum is simply dummy text of the printing and typesetting
          industry. Lorem Ipsum has been the industry&apos;s standard dummy text
          ever since the 1500s, when an unknown printer took a galley of type
          and scrambled it to make a type specimen book.
        </p>
      </div>

      <div className="bg-gray-50 mt-[100px] p-[100px]">
        <h1 className="font-semibold text-[40px] leading-none text-dark-blue-400">
          More Projects
        </h1>

        <div className="grid grid-cols-3 gap-x-6 mt-6">
          {fromLength(3).map((key) => (
            <article
              key={key}
              className="rounded-lg min-h-[200px] border border-gray-200 overflow-hidden p-[15px] relative flex flex-col justify-end"
            >
              <NextImage
                className="object-cover"
                src="/robot-2.jpg"
                alt="Robot"
                sizes="25vw"
                fill
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_50.12%,rgba(0,0,0,.5)_82.64%)]" />
              <div className="relative">
                <h1 className="text-sm leading-none font-medium text-white">
                  React.js Front End Ecommerce Store
                </h1>

                <div className="flex items-center gap-x-[6.79px] mt-2">
                  <Badge className="bg-white/20 text-white">UI/UX Design</Badge>
                  <Badge className="bg-white/20 text-white">
                    Visual Design
                  </Badge>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center gap-x-1 mt-6">
          <div className="h-px bg-gray-200 flex-auto" />
          <Button className="text-xs" variant="link" visual="gray">
            View More
          </Button>
          <div className="h-px bg-gray-200 flex-auto" />
        </div>

        <div className="mt-6">
          <div className="bg-white rounded-[15px] border grid grid-cols-2 gap-x-[50px] p-[75px] border-gray-200">
            <div className="flex gap-x-3 items-start">
              <div className="relative inline-block">
                <Avatar className="size-[74px]" size="2xl">
                  <AvatarImage src="/man.jpg" alt="Man" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <div className="size-[20.77px] absolute left-0 top-[56px] rounded-full inline-flex items-center justify-center ring-[2.65px] text-white ring-white bg-success-500">
                  <Check className="size-[15px]" />
                </div>
              </div>

              <div>
                <h1 className="text-[22px] leading-none font-bold text-dark-blue-400">
                  Saumya{" "}
                  <span className="text-[22px] leading-none font-light text-dark-blue-400">
                    @saumyadesign23
                  </span>
                </h1>

                <p className="text-lg leading-none text-dark-blue-400 font-light mt-2">
                  UX Product Designer{" "}
                </p>

                <div className="mt-2 flex items-center gap-x-[9px]">
                  <MapPin className="size-[16px] text-dark-blue-400" />

                  <span className="text-sm leading-none font-medium text-dark-blue-400">
                    Jersey City, NJ, United States
                  </span>
                </div>

                <div className="mt-8 flex items-center gap-x-3">
                  <Button>
                    <Plus className="size-[15px]" /> Hire Me
                  </Button>
                  <Button
                    variant="outlined"
                    visual="gray"
                    className="border-primary-500 text-primary-500 hover:bg-primary-500 border-2 hover:text-white"
                  >
                    <MessageSquare01 className="size-[15px]" /> Message
                  </Button>
                </div>

                <div className="mt-8">
                  <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                    Related Skills
                  </h1>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <Badge size="lg" variant="rounded" visual="gray">
                      Typescript
                    </Badge>
                    <Badge size="lg" variant="rounded" visual="gray">
                      React.js
                    </Badge>
                    <Badge size="lg" variant="rounded" visual="gray">
                      Tailwind CSS
                    </Badge>
                    <Badge size="lg" variant="rounded" visual="gray">
                      Next.js
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-[22px] leading-none font-semibold text-dark-blue-400">
                Let’s collaborate on the next project!
              </h1>

              <div className="mt-6 flex flex-col">
                <textarea
                  className="h-[200px] resize-none rounded-t-lg border rounded-none border-gray-200 bg-gray-50 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] focus:ring-0 py-3.5 px-5 placeholder:text-gray-500 placeholder:italic"
                  placeholder="Leave a message for Saumya..."
                />
                <div className="p-3 bg-white border border-t-0 border-gray-200 rounded-b-lg flex items-center justify-between">
                  <div className="flex items-center gap-x-1">
                    <IconButton
                      className="rounded-full"
                      variant="ghost"
                      visual="gray"
                      size="lg"
                    >
                      <Smile className="size-[22px]" />
                    </IconButton>
                    <IconButton
                      className="rounded-full"
                      variant="ghost"
                      visual="gray"
                      size="lg"
                    >
                      <Image03 className="size-[22px]" />
                    </IconButton>
                    <IconButton
                      className="rounded-full"
                      variant="ghost"
                      visual="gray"
                      size="lg"
                    >
                      <Attachment01 className="size-[22px]" />
                    </IconButton>
                  </div>

                  <Button>
                    Send Message <Send className="size-[15px]" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const boldStatementSchema = z.object({
  statement: z.string().min(1, "Must contain at least 1 character(s)"),
})

type BoldStatementFormValues = z.infer<typeof boldStatementSchema>

const BoldStatement = () => {
  const { handleSubmit, control } = useForm<BoldStatementFormValues>({
    resolver: zodResolver(boldStatementSchema),
    defaultValues: {
      statement:
        "This is your sample bold statement, you can use this as your heading too.",
    },
  })

  const onSubmit: SubmitHandler<BoldStatementFormValues> = (values) => {}

  return (
    <form className=" relative group" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <Controller
          control={control}
          name="statement"
          render={({ field: { value, onChange } }) => (
            <EditableRoot
              className="relative"
              value={value}
              onChange={onChange}
            >
              <EditableLabel>Bold Statement</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[64px] [field-sizing:content] resize-none scrollbar-none text-[64px] leading-none font-bold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[64px] leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          )}
        />
      </h1>
    </form>
  )
}

const Process = () => {
  const [items, setItems] = useState([0, 1, 2])
  const len = items.length
  return (
    <div className=" relative group">
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <EditableRoot className="relative" defaultValue="This is your process">
          <EditableLabel>Title</EditableLabel>
          <EditableArea>
            <EditableInput
              asChild
              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
            >
              <textarea />
            </EditableInput>
            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
          </EditableArea>
        </EditableRoot>
      </h1>

      <p className="group/block relative mt-3">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <EditableRoot
          className="relative"
          defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."
        >
          <EditableLabel>Sub Title</EditableLabel>
          <EditableArea>
            <EditableInput
              asChild
              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
            >
              <textarea />
            </EditableInput>
            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
          </EditableArea>
        </EditableRoot>
      </p>

      <Reorder.Group
        as="div"
        className="relative grid gap-x-[--gap] [--gap:12px] mt-8 grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        axis="x"
        style={{ ...({ "--cols": len } as Record<string, number>) }}
        values={items}
        onReorder={setItems}
      >
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <ControlledDraggable withFragments>
              {(dragControls) => (
                <ArticleRoot
                  value={item}
                  isLast={index === len - 1}
                  dragControls={dragControls}
                  className="border-0"
                  outlinedContainer
                >
                  {/* <div className="absolute -inset-y-5 -inset-x-[--gap] border-2 border-primary-500 rounded-lg hidden group-hover/article:block" /> */}

                  <BlockToolbar
                    className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10"
                    onDrag={(event) => dragControls.start(event)}
                    canMoveLeft={Boolean(index)}
                    moveLeft={() => setItems(swap(items, index, index - 1))}
                    canMoveRight={index < len - 1}
                    moveRight={() => setItems(swap(items, index, index + 1))}
                    canRemove={len > 3}
                    onRemove={() =>
                      setItems(items.filter((itm) => itm !== item))
                    }
                    canDuplicate={len < 4}
                    onDuplicate={() => {
                      const uniqueId = getId() + 2
                      setItems(items.toSpliced(index, 0, uniqueId))
                    }}
                  />

                  <div className="relative">
                    <div className="flex items-center gap-x-3">
                      <div className="size-[91px] rounded-full text-[39px] leading-none font-medium text-primary-500 border-[4.33px] border-primary-500 shrink-0 inline-flex items-center justify-center">
                        {index + 1}
                      </div>

                      <div className="group-data-[last=true]/article:hidden border-2 flex-auto border-primary-500 border-dashed opacity-20" />
                    </div>

                    <div className="pr-[38px] mt-5">
                      <h1 className="group/block relative mt-3">
                        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                            Text
                          </span>
                          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                        </span>
                        <EditableRoot
                          className="relative"
                          defaultValue="Step Name"
                        >
                          <EditableLabel>Title</EditableLabel>
                          <EditableArea>
                            <EditableInput
                              asChild
                              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-medium text-dark-blue-400"
                            >
                              <textarea />
                            </EditableInput>
                            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-medium text-dark-blue-400" />
                          </EditableArea>
                        </EditableRoot>
                      </h1>

                      <p className="group/block relative mt-3">
                        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                            Text
                          </span>
                          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                        </span>
                        <EditableRoot
                          className="relative"
                          defaultValue="This is sample description for process"
                        >
                          <EditableLabel>Sub Title</EditableLabel>
                          <EditableArea>
                            <EditableInput
                              asChild
                              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-4 [field-sizing:content] resize-none scrollbar-none text-base leading-none font-light text-dark-blue-400"
                            >
                              <textarea />
                            </EditableInput>
                            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-base leading-none font-light text-dark-blue-400" />
                          </EditableArea>
                        </EditableRoot>
                      </p>
                    </div>
                  </div>
                </ArticleRoot>
              )}
            </ControlledDraggable>

            {len < 4 && (
              <div
                style={{
                  ...({ "--pos": index + 1 } as Record<string, number>),
                }}
                className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
              >
                <Addened
                  className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                  onAdd={() => {
                    const uniqueId = getId() + 2
                    setItems(items.toSpliced(index, 0, uniqueId))
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

const interviewPointsFormSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  points: z.array(
    z.object({
      title: z.string().min(1, "Please enter at least 1 character(s)"),
      subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
    })
  ),
})

type InterviewPointsFormValues = z.infer<typeof interviewPointsFormSchema>

const InterviewPointers = () => {
  const { handleSubmit, control } = useForm<InterviewPointsFormValues>({
    resolver: zodResolver(interviewPointsFormSchema),
    defaultValues: {
      title: "This is your introduction",
      subTitle:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
      points: [
        { title: "Bullet Point 1", subTitle: "Lorem ipsum donar solar" },
        { title: "Bullet Point 2", subTitle: "Lorem ipsum donar solar" },
        { title: "Bullet Point 3", subTitle: "Lorem ipsum donar solar" },
      ],
    },
  })

  const { fields } = useFieldArray({
    control,
    name: "points",
  })

  const onSubmit: SubmitHandler<InterviewPointsFormValues> = (values) => {}

  return (
    <form className=" group relative" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <EditableRoot
              className="relative"
              value={value}
              onChange={onChange}
            >
              <EditableLabel>Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          )}
        />
      </h1>

      <div className="mt-6">
        <p className="group/block relative">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="subTitle"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Sub Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </p>

        <ul className="mt-4 list-disc">
          {fields.map((field, index) => (
            <React.Fragment key={field.id}>
              <li className="relative group/block block first:mt-0 mt-5">
                <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                  <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                    Text
                  </span>
                  {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                  <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                </span>
                <Controller
                  control={control}
                  name={`points.${index}.title`}
                  render={({ field: { value, onChange } }) => (
                    <EditableRoot
                      className="relative"
                      value={value}
                      onChange={onChange}
                    >
                      <EditableLabel>List Item</EditableLabel>
                      <EditableArea>
                        <EditableInput
                          asChild
                          className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-[24px] leading-none font-bold text-dark-blue-400"
                        >
                          <textarea />
                        </EditableInput>
                        <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[24px] leading-none font-bold text-dark-blue-400" />
                      </EditableArea>
                    </EditableRoot>
                  )}
                />
              </li>

              <span className="relative group/block block mt-2">
                <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                  <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                    Text
                  </span>
                  {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                  <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                </span>
                <Controller
                  control={control}
                  name={`points.${index}.subTitle`}
                  render={({ field: { value, onChange } }) => (
                    <EditableRoot
                      className="relative"
                      value={value}
                      onChange={onChange}
                    >
                      <EditableLabel>List Item Description</EditableLabel>
                      <EditableArea>
                        <EditableInput
                          asChild
                          className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-[24px] leading-none font-light text-dark-blue-400"
                        >
                          <textarea />
                        </EditableInput>
                        <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[24px] leading-none font-light text-dark-blue-400" />
                      </EditableArea>
                    </EditableRoot>
                  )}
                />
              </span>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </form>
  )
}

const Personas = () => {
  return (
    <div className="grid grid-cols-2 border border-gray-200 rounded-lg  relative group">
      <div className="group/column relative rounded-l-lg flex flex-col justify-end">
        <PictureEditor
          startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
            <div className="group/image absolute inset-0 bg-gray-100 grid rounded-l-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
              {dataUrl ? (
                <div
                  className="size-full relative rounded-l-lg overflow-hidden transform"
                  style={style}
                >
                  <img
                    src={dataUrl}
                    aria-label="Picture"
                    className="size-full object-cover rounded-l-lg"
                  />
                </div>
              ) : null}
              <BlockImageToolbar
                className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                onAddImage={open}
                onRemove={onRemove}
                onEdit={onEdit}
                enableEdit={!!dataUrl}
                enableRemove={!!dataUrl}
              />
            </div>
          )}
        />

        <div className="rounded-l-lg relative group-hover/column:bg-none bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,.2)_100%)] p-8">
          <div>
            <h1 className="relative group/block">
              <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                  Text
                </span>
                {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
              </span>
              <EditableRoot className="relative" defaultValue="Jane Doe">
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-white group-data-[placeholder-shown]/area:text-white min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-white"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-white text-[40px] leading-none font-semibold text-white" />
                </EditableArea>
              </EditableRoot>
            </h1>
            <p className="relative group/block mt-3">
              <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                  Text
                </span>
                {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
              </span>
              <EditableRoot className="relative" defaultValue="Jane Doe">
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-white group-data-[placeholder-shown]/area:text-white min-h-6 [field-sizing:content] resize-none scrollbar-none text-2xl leading-none text-white"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-white text-2xl leading-none text-white" />
                </EditableArea>
              </EditableRoot>
            </p>

            <div className="mt-3 flex items-center gap-x-3 flex-wrap">
              <div className="inline-flex shrink-0 items-center rounded-full px-3 h-7 bg-white text-gray-700 text-sm font-medium">
                Passionate
              </div>
              <div className="inline-flex shrink-0 items-center rounded-full px-3 h-7 bg-white text-gray-700 text-sm font-medium">
                Passionate
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        <h1 className="relative group/block">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <EditableRoot className="relative" defaultValue="About">
            <EditableLabel>Title</EditableLabel>
            <EditableArea>
              <EditableInput
                asChild
                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-4 [field-sizing:content] resize-none scrollbar-none text-base leading-none font-semibold text-dark-blue-400"
              >
                <textarea />
              </EditableInput>
              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-base leading-none font-semibold text-dark-blue-400" />
            </EditableArea>
          </EditableRoot>
        </h1>

        <p className="group/block mt-3 relative">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <EditableRoot
            className="relative"
            defaultValue="Jane is a Professional Model who lives in New York. She has been modeling for about 10 years at different companies like GAP, Levi’s, Banana Republic and Theory. It was when she was around 21 when she was contacted by the agency."
          >
            <EditableLabel>Sub Title</EditableLabel>
            <EditableArea>
              <EditableInput
                asChild
                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-3.5 [field-sizing:content] resize-none scrollbar-none text-sm font-light leading-none text-dark-blue-400"
              >
                <textarea />
              </EditableInput>
              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-sm font-light leading-none text-dark-blue-400" />
            </EditableArea>
          </EditableRoot>
        </p>

        <div className="mt-[34.45px]">
          <h1 className="relative group/block">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot className="relative" defaultValue="Goals">
              <EditableLabel>Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-4 [field-sizing:content] resize-none scrollbar-none text-base leading-none font-semibold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-base leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </h1>

          <p className="group/block mt-3 relative">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot
              className="relative"
              defaultValue="Jane is a Professional Model who lives in New York. She has been modeling for about 10 years at different companies like GAP, Levi’s, Banana Republic and Theory. It was when she was around 21 when she was contacted by the agency."
            >
              <EditableLabel>Sub Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-3.5 [field-sizing:content] resize-none scrollbar-none text-sm font-light leading-none text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-sm font-light leading-none text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </p>
        </div>
        <div className="mt-[34.45px]">
          <h1 className="relative group/block">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot className="relative" defaultValue="Frustrations">
              <EditableLabel>Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-4 [field-sizing:content] resize-none scrollbar-none text-base leading-none font-semibold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-base leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </h1>

          <p className="group/block mt-3 relative">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot
              className="relative"
              defaultValue="Jane is a Professional Model who lives in New York. She has been modeling for about 10 years at different companies like GAP, Levi’s, Banana Republic and Theory. It was when she was around 21 when she was contacted by the agency."
            >
              <EditableLabel>Sub Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-3.5 [field-sizing:content] resize-none scrollbar-none text-sm font-light leading-none text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-sm font-light leading-none text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </p>
        </div>
      </div>
    </div>
  )
}

const ResultMetrics = () => {
  const [items, setItems] = useState([0, 1, 2, 3])
  const len = items.length
  return (
    <div className=" border rounded-lg bg-border-200 gap-x-[53.33px] p-[50px] group relative">
      <Reorder.Group
        as="div"
        className="isolate relative grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:53.33px]"
        axis="x"
        style={{ ...({ "--cols": len } as Record<string, number>) }}
        values={items}
        onReorder={setItems}
      >
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <ControlledDraggable withFragments>
              {(dragControls) => (
                <ArticleRoot
                  value={item}
                  isLast={index === len - 1}
                  dragControls={dragControls}
                  className="border-0"
                  outlinedContainer
                >
                  {/* <div className="absolute -inset-5 border-2 border-primary-500 rounded-lg hidden group-hover/article:block" /> */}

                  <BlockToolbar
                    className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10"
                    onDrag={(event) => dragControls.start(event)}
                    canMoveLeft={Boolean(index)}
                    moveLeft={() => setItems(swap(items, index, index - 1))}
                    canMoveRight={index < len - 1}
                    moveRight={() => setItems(swap(items, index, index + 1))}
                    canRemove={false}
                    onRemove={() =>
                      setItems(items.filter((itm) => itm !== item))
                    }
                    canDuplicate={false}
                    canHide={false}
                    onDuplicate={() => {
                      const uniqueId = getId() + 2
                      setItems(items.toSpliced(index, 0, uniqueId))
                    }}
                  />

                  <div className="relative space-y-2" key={index}>
                    <h1 className="relative group/block">
                      <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                        <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                          Text
                        </span>
                        {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                        <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                      </span>
                      <EditableRoot className="relative" defaultValue="50%">
                        <EditableLabel>Title</EditableLabel>
                        <EditableArea>
                          <EditableInput
                            asChild
                            className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-bold text-dark-blue-400"
                          >
                            <textarea />
                          </EditableInput>
                          <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-bold text-dark-blue-400" />
                        </EditableArea>
                      </EditableRoot>
                    </h1>

                    <p className="group/block relative">
                      <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                        <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                          Text
                        </span>
                        {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                        <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                      </span>
                      <EditableRoot
                        className="relative"
                        defaultValue="Less Time Spent"
                      >
                        <EditableLabel>Sub Title</EditableLabel>
                        <EditableArea>
                          <EditableInput
                            asChild
                            className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-5 [field-sizing:content] resize-none scrollbar-none text-xl leading-none text-dark-blue-400"
                          >
                            <textarea />
                          </EditableInput>
                          <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-xl leading-none text-dark-blue-400" />
                        </EditableArea>
                      </EditableRoot>
                    </p>
                  </div>
                </ArticleRoot>
              )}
            </ControlledDraggable>
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

const Testimonials = () => {
  const [items, setItems] = useState([0, 1])
  const len = items.length
  return (
    <div className=" group relative">
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <EditableRoot className="relative" defaultValue="Testimonials">
          <EditableLabel>Title</EditableLabel>
          <EditableArea>
            <EditableInput
              asChild
              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
            >
              <textarea />
            </EditableInput>
            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
          </EditableArea>
        </EditableRoot>
      </h1>

      <Reorder.Group
        as="div"
        className="isolate relative mt-[32px] grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:50px]"
        axis="x"
        style={{ ...({ "--cols": len } as Record<string, number>) }}
        values={items}
        onReorder={setItems}
      >
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <ControlledDraggable withFragments>
              {(dragControls) => (
                <ArticleRoot
                  value={item}
                  isLast={index === len - 1}
                  dragControls={dragControls}
                  className="border-0"
                  outlinedContainer
                >
                  {/* <div className="absolute -inset-5 border-2 border-primary-500 rounded-lg hidden group-hover/article:block" /> */}

                  <BlockToolbar
                    className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10"
                    onDrag={(event) => dragControls.start(event)}
                    canMoveLeft={Boolean(index)}
                    moveLeft={() => setItems(swap(items, index, index - 1))}
                    canMoveRight={index < len - 1}
                    moveRight={() => setItems(swap(items, index, index + 1))}
                    canRemove={len > 1}
                    onRemove={() =>
                      setItems(items.filter((itm) => itm !== item))
                    }
                    canDuplicate={len < 2}
                    canHide
                    onDuplicate={() => {
                      const uniqueId = getId() + 2
                      setItems(items.toSpliced(index, 0, uniqueId))
                    }}
                  />

                  <article className="p-6 rounded-[20px] bg-gray-100 rounded-bl-none relative">
                    <div className="flex items-start gap-x-3">
                      <h1 className="pt-[11px] leading-none text-dark-blue-400 font-bold text-[114.33px]">
                        “
                      </h1>

                      <h3 className="group/block relative pt-6">
                        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                            Text
                          </span>
                          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                        </span>
                        <EditableRoot
                          className="relative"
                          defaultValue="Lorem Ipsum is simply dummy text of the printing and typesetting industry."
                        >
                          <EditableLabel>Quote</EditableLabel>
                          <EditableArea>
                            <EditableInput
                              asChild
                              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none text-dark-blue-400"
                            >
                              <textarea />
                            </EditableInput>
                            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none text-dark-blue-400" />
                          </EditableArea>
                        </EditableRoot>
                      </h3>
                    </div>

                    <div className="mt-[50px] flex items-center gap-x-2">
                      <Avatar size="md">
                        <AvatarImage src="/man.jpg" alt="Man" />
                        <AvatarFallback>M</AvatarFallback>
                      </Avatar>

                      <div className="space-y-0.5">
                        <h3 className="group/block relative">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="John Doe"
                          >
                            <EditableLabel>Name</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-px w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-3.5 [field-sizing:content] resize-none scrollbar-none text-sm font-bold leading-none text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-sm font-bold leading-none text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </h3>

                        <p className="group/block relative">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="Acme Inc., President & CEO"
                          >
                            <EditableLabel>Sub Title</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-px w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[10px] [field-sizing:content] resize-none scrollbar-none text-[10px] leading-none font-light text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[10px] leading-none font-light text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </p>
                      </div>
                    </div>
                  </article>
                </ArticleRoot>
              )}
            </ControlledDraggable>

            {len < 2 && (
              <div
                style={{
                  ...({ "--pos": index + 1 } as Record<string, number>),
                }}
                className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
              >
                <Addened
                  className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                  onAdd={() => {
                    const uniqueId = getId() + 2
                    setItems(items.toSpliced(index, 0, uniqueId))
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </Reorder.Group>
    </div>
  )
}

const conclusionSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
})

type ConclusionFormValues = z.infer<typeof conclusionSchema>

const Conclusion = () => {
  const { handleSubmit, control } = useForm<ConclusionFormValues>({
    resolver: zodResolver(conclusionSchema),
    defaultValues: {
      title: "This is your Conclusion",
      subTitle:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })

  const onSubmit: SubmitHandler<ConclusionFormValues> = (values) => {}

  return (
    <form className=" group relative" onSubmit={handleSubmit(onSubmit)}>
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <EditableRoot
              className="relative"
              value={value}
              onChange={onChange}
            >
              <EditableLabel>Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          )}
        />
      </h1>
      <p className="group/block relative mt-6">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <Controller
          control={control}
          name="subTitle"
          render={({ field: { value, onChange } }) => (
            <EditableRoot
              className="relative"
              value={value}
              onChange={onChange}
            >
              <EditableLabel>Sub Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          )}
        />
      </p>
    </form>
  )
}

const Columns = () => {
  const [items, setItems] = useState([0, 1])
  const len = items.length
  return (
    <div className="relative group mt-[100px]">
      <h1 className="relative group/block">
        <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
          <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
            Text
          </span>
          {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
          <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
        </span>
        <EditableRoot
          className="relative"
          defaultValue="These are your columns"
        >
          <EditableLabel>These are your columns</EditableLabel>
          <EditableArea>
            <EditableInput
              asChild
              className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
            >
              <textarea />
            </EditableInput>
            <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
          </EditableArea>
        </EditableRoot>
      </h1>
      {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute hidden opacity-0 group-focus-within:group-hover:hidden group-focus-within:group-hover:opacity-0 group-hover:inline-flex group-hover:opacity-100 transition duration-300" />*/}

      <div className="mt-8">
        <Reorder.Group
          as="div"
          className="isolate relative grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-x-[--gap] [--gap:50px]"
          axis="x"
          style={{ ...({ "--cols": len } as Record<string, number>) }}
          values={items}
          onReorder={setItems}
        >
          {items.map((item, index) => (
            <React.Fragment key={item}>
              <ControlledDraggable withFragments>
                {(dragControls) => (
                  <ArticleRoot
                    value={item}
                    isLast={index === len - 1}
                    dragControls={dragControls}
                    className="border-0"
                    outlinedContainer
                  >
                    {/* <div className="absolute -inset-5 border-2 border-primary-500 rounded-lg hidden group-hover/article:block" /> */}

                    <BlockToolbar
                      className="group-hover/article:opacity-100 group-hover/article:inline-flex hidden opacity-0 transition duration-300 -top-[38px] -right-[37px] absolute z-10"
                      onDrag={(event) => dragControls.start(event)}
                      canMoveLeft={Boolean(index)}
                      moveLeft={() => setItems(swap(items, index, index - 1))}
                      canMoveRight={index < len - 1}
                      moveRight={() => setItems(swap(items, index, index + 1))}
                      canRemove={len > 2}
                      onRemove={() =>
                        setItems(items.filter((itm) => itm !== item))
                      }
                      canDuplicate={len < 3}
                      onDuplicate={() => {
                        const uniqueId = getId() + 2
                        setItems(items.toSpliced(index, 0, uniqueId))
                      }}
                    />

                    <div className="relative">
                      <PictureEditor
                        startingPoint={({
                          dataUrl,
                          open,
                          style,
                          onRemove,
                          onEdit,
                        }) => (
                          <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image h-[250px] bg-gray-100 grid rounded-lg place-items-center hover:bg-black/20 hover:ring-2 hover:ring-primary-500 transition duration-300">
                            {dataUrl ? (
                              <div
                                className="size-full rounded-lg transform"
                                style={style}
                              >
                                <img
                                  src={dataUrl}
                                  aria-label="Picture"
                                  className="absolute object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <>
                                <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-white" />
                              </>
                            )}
                            <BlockImageToolbar
                              className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                              onAddImage={open}
                              onRemove={onRemove}
                              onEdit={onEdit}
                              enableEdit={!!dataUrl}
                              enableRemove={!!dataUrl}
                            />
                          </div>
                        )}
                      />
                      <div className="mt-6">
                        <h1 className="relative group/block">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute z-10 left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="This is your heading"
                          >
                            <EditableLabel>Title</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-semibold text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-semibold text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </h1>
                        <p className="relative group/block mt-3">
                          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
                            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                              Text
                            </span>
                            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
                            <FlexibleToolbar className="absolute z-10 left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
                          </span>
                          <EditableRoot
                            className="relative"
                            defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
                          >
                            <EditableLabel>Sub Title</EditableLabel>
                            <EditableArea>
                              <EditableInput
                                asChild
                                className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                              >
                                <textarea />
                              </EditableInput>
                              <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                            </EditableArea>
                          </EditableRoot>
                        </p>
                      </div>
                    </div>
                  </ArticleRoot>
                )}
              </ControlledDraggable>

              {len < 3 && (
                <div
                  style={{
                    ...({ "--pos": index + 1 } as Record<string, number>),
                  }}
                  className="peer-data-[last=true]:hidden absolute w-[--gap] group/gap flex justify-center inset-y-0 left-[calc(calc(calc(calc(theme(size.full)-calc(var(--gap)*calc(var(--cols)-1)))/var(--cols))*var(--pos))+calc(var(--gap)*calc(var(--pos)-1)))]"
                >
                  <Addened
                    className="h-full group-hover/gap:visible invisible transition-[visibility] duration-300"
                    onAdd={() => {
                      const uniqueId = getId() + 2
                      setItems(items.toSpliced(index, 0, uniqueId))
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </Reorder.Group>
      </div>
    </div>
  )
}

const introductionSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type IntroductionFormValues = z.infer<typeof introductionSchema>

const Introduction = () => {
  const { handleSubmit, control } = useForm<IntroductionFormValues>({
    resolver: zodResolver(introductionSchema),
    defaultValues: {
      title: "This is your introduction",
      subTitle:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })

  const onSubmit: SubmitHandler<IntroductionFormValues> = (values) => {}

  return (
    <form
      className=" grid grid-cols-2 gap-x-[50px] group relative"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="py-[52px]">
        <h1 className="relative group/block">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </h1>
        <p className="group/block relative mt-5">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="subTitle"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Sub Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </p>
      </div>
      <div className="relative">
        <Controller
          control={control}
          name="files"
          render={({ field: { onChange } }) => (
            <PictureEditor
              onValueChange={onChange}
              startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image size-full bg-gray-100 grid rounded-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
                  {dataUrl ? (
                    <div
                      className="size-full rounded-lg transform"
                      style={style}
                    >
                      <img
                        src={dataUrl}
                        aria-label="Picture"
                        className="absolute object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-primary-300 group-hover:text-primary-300 group-hover:group-focus-within:text-gray-300" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                    onAddImage={open}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    enableEdit={!!dataUrl}
                    enableRemove={!!dataUrl}
                  />
                </div>
              )}
            />
          )}
        />
      </div>
    </form>
  )
}

const ImageTextSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type ImageTextFormValues = z.infer<typeof ImageTextSchema>

const ImageText = () => {
  const { handleSubmit, control } = useForm<ImageTextFormValues>({
    resolver: zodResolver(ImageTextSchema),
    defaultValues: {
      title: "This is your introduction",
      subTitle:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })

  const onSubmit: SubmitHandler<ImageTextFormValues> = (values) => {}

  return (
    <form
      className=" grid grid-cols-2 gap-x-[50px] relative group"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="py-[66.5px]">
        <h1 className="relative group/block">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </h1>
        <p className="group/block relative mt-5">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="subTitle"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Sub Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </p>
      </div>
      <div className="relative">
        <Controller
          control={control}
          name="files"
          render={({ field: { onChange } }) => (
            <PictureEditor
              onValueChange={onChange}
              startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image size-full bg-gray-100 grid rounded-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
                  {dataUrl ? (
                    <div
                      className="size-full rounded-lg transform"
                      style={style}
                    >
                      <img
                        src={dataUrl}
                        aria-label="Picture"
                        className="absolute object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-primary-300 group-hover:text-primary-300 group-hover:group-focus-within:text-gray-300" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                    onAddImage={open}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    enableEdit={!!dataUrl}
                    enableRemove={!!dataUrl}
                  />
                </div>
              )}
            />
          )}
        />
      </div>
    </form>
  )
}

const Gallery = () => {
  return (
    <div className="p-[50px]  rounded-[10px] bg-gray-100 group relative">
      <BigImage className="bg-gray-50 mt-0 static" />

      <div className="flex mt-6 gap-x-6 items-center">
        <button
          data-state="active"
          className="h-[55px] w-[82px] hover:border-primary-500 hover:ring hover:ring-primary-500 data-[state=active]:border-primary-500 border border-gray-200 data-[state=active]:ring-primary-500 data-[state=active]:ring bg-white inline-flex items-center shrink-0 rounded-[5px] justify-center"
        ></button>
        <button className="h-[55px] w-[82px] hover:border-primary-500 hover:ring hover:ring-primary-500 data-[state=active]:border-primary-500 border border-gray-200 data-[state=active]:ring-primary-500 data-[state=active]:ring bg-white shrink-0 rounded-[5px] inline-flex items-center justify-center">
          <Plus className="size-6 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

const bigImageSchema = z.object({
  caption: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type BigImageFormValues = z.infer<typeof bigImageSchema>

const BigImage = ({ className }: { className?: string }) => {
  const { handleSubmit, control } = useForm<BigImageFormValues>({
    resolver: zodResolver(bigImageSchema),
    defaultValues: {
      caption: "",
    },
  })

  const onSubmit: SubmitHandler<BigImageFormValues> = (values) => {}

  return (
    <form
      className={cn("relative  bg-gray-50 rounded-lg group", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="relative h-[498.2px] flex flex-col justify-end overflow-hidden">
        <Controller
          control={control}
          name="files"
          render={({ field: { onChange } }) => (
            <PictureEditor
              onValueChange={onChange}
              startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden absolute inset-0 group/image size-full grid rounded-lg place-items-center group-hover:bg-primary-50 transition duration-300">
                  {dataUrl ? (
                    <div
                      className="size-full rounded-lg transform"
                      style={style}
                    >
                      <img
                        src={dataUrl}
                        aria-label="Picture"
                        className="object-conver size-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover:text-white" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute hidden opacity-0 group-hover:inline-flex group-hover:opacity-100 transition duration-300"
                    onAddImage={open}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    enableEdit={!!dataUrl}
                    enableRemove={!!dataUrl}
                  />
                </div>
              )}
            />
          )}
        />

        <div className="p-8 rounded-b-lg relative bg-[linear-gradient(180deg,rgba(48,108,254,0)_0%,rgba(48,108,254,.296)_100%)]">
          <Controller
            control={control}
            name="caption"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                value={value}
                onChange={onChange}
                placeholder="Image Title"
              >
                <EditableLabel>Image Title</EditableLabel>
                <EditableArea>
                  <EditableInput className="bg-transparent" />
                  <EditablePreview className="group-hover:text-primary-500 text-white group-data-[placeholder-shown]/area:text-gray-500" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </div>
      </div>
    </form>
  )
}

const challengesSchema = z.object({
  title: z.string().min(1, "Please enter at least 1 character(s)"),
  subTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  files: z.array(z.instanceof(File)),
})

type ChallengesFormValues = z.infer<typeof challengesSchema>

const Challenges = () => {
  const { handleSubmit, control } = useForm<ChallengesFormValues>({
    resolver: zodResolver(challengesSchema),
    defaultValues: {
      title: "This is your introduction",
      subTitle:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
    },
  })

  const onSubmit: SubmitHandler<ChallengesFormValues> = (values) => {}

  return (
    <form
      className="grid grid-cols-2 gap-x-[50px] group relative"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="relative">
        <Controller
          control={control}
          name="files"
          render={({ field: { onChange } }) => (
            <PictureEditor
              onValueChange={onChange}
              startingPoint={({ dataUrl, open, style, onRemove, onEdit }) => (
                <div className="group-data-[state=dragged]/article:pointer-events-none overflow-hidden relative group/image size-full bg-gray-100 grid rounded-lg place-items-center hover:bg-primary-50 group-hover:bg-primary-50 group-hover:group-focus-within:bg-gray-100 hover:ring-2 hover:ring-primary-500 transition duration-300">
                  {dataUrl ? (
                    <div
                      className="size-full rounded-lg transform"
                      style={style}
                    >
                      <img
                        src={dataUrl}
                        aria-label="Picture"
                        className="absolute object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <Picture className="w-[84px] shrink-0 h-[76px] text-gray-300 group-hover/image:text-primary-300 group-hover:text-primary-300 group-hover:group-focus-within:text-gray-300" />
                    </>
                  )}
                  <BlockImageToolbar
                    className="top-5 left-5 absolute hidden opacity-0 group-hover/image:inline-flex group-hover/image:opacity-100 transition duration-300"
                    onAddImage={open}
                    onRemove={onRemove}
                    onEdit={onEdit}
                    enableEdit={!!dataUrl}
                    enableRemove={!!dataUrl}
                  />
                </div>
              )}
            />
          )}
        />
      </div>

      <div className="py-[28px]">
        <h1 className="relative group/block">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[40px] [field-sizing:content] resize-none scrollbar-none text-[40px] leading-none font-semibold text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[40px] leading-none font-semibold text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </h1>
        <p className="group/block relative mt-5">
          <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
            <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
              Text
            </span>
            {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
            <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
          </span>
          <Controller
            control={control}
            name="subTitle"
            render={({ field: { value, onChange } }) => (
              <EditableRoot
                className="relative"
                value={value}
                onChange={onChange}
              >
                <EditableLabel>Sub Title</EditableLabel>
                <EditableArea>
                  <EditableInput
                    asChild
                    className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                  >
                    <textarea />
                  </EditableInput>
                  <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
                </EditableArea>
              </EditableRoot>
            )}
          />
        </p>
      </div>
    </form>
  )
}

const BlockRoot = ({
  children,
  value,
  onAdd,
}: {
  children?: React.ReactNode
  value: number
  onAdd?: () => void
}) => {
  const y = useMotionValue(0)
  const boxShadow = useRaisedShadow(y)
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={value}
      as="div"
      className="mt-[100px] group relative"
      style={{
        y,
      }}
      dragControls={dragControls}
      dragListener={false}
    >
      <div className="-top-[100px] h-[100px] flex flex-col justify-center inset-x-0 absolute group/spacer">
        <div className="group-hover/spacer:visible invisible">
          <ToBeAdded onPlus={onAdd} />
        </div>
      </div>
      <motion.div
        className="absolute rounded-lg border-2 -inset-5 bg-white border-primary-500 hidden group-hover:block group-hover:group-focus-within:opacity-0 group-hover:group-focus-within:hidden"
        style={{ boxShadow }}
      />

      <span className="absolute -inset-5 group-hover:inline-block opacity-0 hidden group-focus-within:opacity-0 group-hover:group-focus-within:opacity-0 group-focus-within:hidden group-hover:group-focus-within:hidden group-hover:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover:bg-primary-500/5 group-focus-within:bg-transparent group-hover:group-focus-within:bg-transparent group-hover:border-primary-200">
        <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within:invisible group-hover:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover:group-focus-within:invisible">
          Block
        </span>
        <BlockToolbar
          className="group-hover:opacity-100 group-hover:inline-flex hidden opacity-0 transition duration-300 -top-[20px] -right-[17px] absolute z-10"
          canRemove
          canDuplicate
          onDrag={(event) => dragControls.start(event)}
          canMoveDown
          canMoveUp
        />
        {/* <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" /> */}
      </span>

      <div className="relative">{children}</div>
    </Reorder.Item>
  )
}

const Region = ({
  region,
}: {
  id: number
  region: State["regions"][number]["region"]
}) => {
  switch (region) {
    case "introduction":
      return <Introduction />

    case "bold-statement":
      return <BoldStatement />

    case "results-metrics":
      return <ResultMetrics />

    case "challenges":
      return <Challenges />

    case "image-text":
      return <ImageText />

    case "process":
      return <Process />

    case "custom-columns":
      return <Columns />

    case "interview":
      return <InterviewPointers />

    case "personas":
      return <Personas />

    case "testimonial":
      return <Testimonials />

    case "conclusion":
      return <Conclusion />

    case "big-image":
      return <BigImage />

    case "gallery":
      return <Gallery />

    default:
      throw new Error("The provide `type` does not exist in the union")
  }
}

interface State {
  regions: {
    id: number
    region:
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
  }[]
}

type Action =
  | { type: State["regions"][number]["region"] }
  | { type: "reorder"; payload: State["regions"] }

const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case "introduction":
    case "bold-statement":
    case "gallery":
    case "challenges":
    case "process":
    case "big-image":
    case "interview":
    case "personas":
    case "video":
    case "customer-journey":
    case "testimonial":
    case "image-text":
    case "results-metrics":
    case "prototype":
    case "conclusion":
    case "custom-columns":
      return {
        ...state,
        regions: [...state.regions, { id: getId(), region: action.type }],
      }

    case "reorder":
      console.log(action.payload)
      return {
        ...state,
        regions: action.payload,
      }

    default:
      return state
  }
}

const defaultValue = { regions: [] }

const GalleryIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("size-[26px]", className)}
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="m4.485 21.765 6.927-6.927c.415-.415.623-.623.863-.701a1.05 1.05 0 0 1 .65 0c.239.078.447.285.862.701l6.88 6.88M14.7 15.75l3.012-3.012c.416-.415.623-.623.863-.701a1.05 1.05 0 0 1 .65 0c.239.078.447.285.862.701L23.1 15.75m-12.6-6.3a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0m-3.36 12.6h10.92c1.764 0 2.646 0 3.32-.343a3.15 3.15 0 0 0 1.376-1.376c.344-.674.344-1.556.344-3.32V8.19c0-1.765 0-2.647-.344-3.32a3.15 3.15 0 0 0-1.376-1.377c-.674-.344-1.556-.344-3.32-.344H7.14c-1.765 0-2.647 0-3.32.344A3.15 3.15 0 0 0 2.443 4.87C2.1 5.544 2.1 6.426 2.1 8.19v8.82c0 1.765 0 2.647.343 3.32a3.15 3.15 0 0 0 1.377 1.377c.673.343 1.555.343 3.32.343"
      stroke="#667085"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const EditingPlayground = () => {
  const [state, dispatch] = useReducer(reducer, defaultValue)
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-gray-50">
      <nav className="h-[68px] flex items-center justify-between px-3 bg-white border-b border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
        <div className="flex items-center gap-x-6">
          <div className="inline-flex items-center gap-x-1">
            <TooltipProvider delayDuration={75}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    className="text-gray-500"
                    variant="ghost"
                    visual="gray"
                  >
                    <ReverseLeft className="size-[18px]" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent sideOffset={9} visual="gray" side="bottom">
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
                  >
                    <ReverseRight className="size-[18px]" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent sideOffset={9} visual="gray" side="bottom">
                  Redo
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TooltipProvider delayDuration={75}>
            <Tooltip>
              <TooltipTrigger asChild>
                <EditableRoot placeholder="Your case study’s title">
                  <EditableLabel>Title</EditableLabel>
                  <EditableArea>
                    <EditableInput className="text-base leading-6 font-semibold" />
                    <EditablePreview className="text-base leading-6 font-semibold" />
                  </EditableArea>
                </EditableRoot>
              </TooltipTrigger>
              <TooltipContent sideOffset={9} visual="gray" side="bottom">
                Rename
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                    <Clock className="size-[15px]" /> Saved at 10:38AM
                  </Button>
                </TooltipTrigger>
                <TooltipContent sideOffset={9} visual="gray" side="bottom">
                  Edited 5 mins ago
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <IconButton className="bg-primary-50 hover:bg-primary-500 text-primary-500 hover:text-white">
              <Eye className="size-3" />
            </IconButton>

            <Button>Publish</Button>
          </div>

          <IconButton className="text-gray-500" variant="ghost" visual="gray">
            <X className="size-6" />
          </IconButton>
        </div>
      </nav>

      <div className="p-[100px]">
        <div className="border border-gray-200 bg-white rounded-[10px] p-[100px]">
          <h1 className="relative group/block">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot
              className="relative"
              defaultValue="Your Case Study Title"
            >
              <EditableLabel>Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[64px] [field-sizing:content] resize-none scrollbar-none text-[64px] leading-none font-semibold text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-[64px] leading-none font-semibold text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </h1>
          <p className="group/block relative mt-3">
            <span className="absolute -inset-x-2.5 inset-0 group-hover/block:inline-block group-focus-within/block:inline-block opacity-0 hidden group-hover/block:opacity-100 group-focus-within/block:opacity-100 transition duration-300 border-2 rounded-lg border-primary-500 group-hover/block:bg-primary-500/5 group-focus-within/block:bg-transparent group-hover/block:group-focus-within/block:bg-transparent group-hover/block:border-primary-200">
              <span className="absolute left-0 invisible transition-[visibility] duration-300 group-focus-within/block:invisible group-hover/block:visible -top-[22px] text-xs text-primary-500 leading-none font-medium group-hover/block:group-focus-within/block:invisible">
                Text
              </span>
              {/*<BlockToolbar className="-top-[46px] -right-[17px] absolute group-focus-within/block:visible invisible transition-[visibility] duration-300" />*/}
              <FlexibleToolbar className="absolute left-0 -top-[51px] group-focus-within/block:visible invisible transition-[visibility] duration-300" />
            </span>
            <EditableRoot
              className="relative"
              defaultValue="Write what into this design or add any details you want to mention"
            >
              <EditableLabel>Sub Title</EditableLabel>
              <EditableArea>
                <EditableInput
                  asChild
                  className="bg-transparent py-2 w-full first-line:inline-block placeholder:text-dark-blue-400 group-data-[placeholder-shown]/area:text-dark-blue-400 min-h-[24px] [field-sizing:content] resize-none scrollbar-none text-2xl leading-none font-light text-dark-blue-400"
                >
                  <textarea />
                </EditableInput>
                <EditablePreview className=" group-data-[placeholder-shown]/area:text-dark-blue-400 text-2xl leading-none font-light text-dark-blue-400" />
              </EditableArea>
            </EditableRoot>
          </p>

          <Reorder.Group
            as="div"
            className="isolate relative"
            axis="y"
            values={state.regions}
            onReorder={(newRegions) => {
              console.log("onReorder", newRegions)
              dispatch({ type: "reorder", payload: newRegions })
            }}
          >
            {state.regions.map((region) => (
              <BlockRoot
                key={region.id}
                value={region.id}
                onAdd={() => setOpen(true)}
              >
                <Region {...region} />
              </BlockRoot>
            ))}
          </Reorder.Group>

          <div className="mt-[100px]">
            {state.regions.length ? (
              <ToBeAdded onPlus={() => setOpen(true)} />
            ) : (
              <div className="p-6 rounded-lg bg-gray-50 border-dashed border-2 border-gray-300">
                <div className="max-w-[206px] mx-auto">
                  <h1 className="text-base text-center leading-6 font-medium text-gray-900">
                    Add your first block
                  </h1>
                  <p className="text-xs text-center leading-none text-gray-500">
                    No content has been added yet. Let’s add some fields now.
                  </p>
                </div>

                <div className="mt-5 flex justify-center">
                  <Button
                    onClick={() => setOpen(true)}
                    variant="outlined"
                    visual="gray"
                    className="hover:bg-white"
                  >
                    <Plus className="size-[15px]" /> Add New Block
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
              dialogOverlay={<DialogOverlay className="blur-lg" />}
              className="max-w-[597px] p-0"
            >
              <div className="pl-6 p-3 flex items-center justify-between border-b border-gray-200">
                <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
                  Select your section
                </h1>

                <DialogClose asChild>
                  <IconButton
                    className="text-gray-500"
                    variant="ghost"
                    visual="gray"
                  >
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>
              <div className="p-6 grid grid-cols-3 gap-3">
                <DialogClose
                  onClick={() => dispatch({ type: "introduction" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <File02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Introduction
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "challenges" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <List className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Challenges
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "image-text" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <ImageIcon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Image & Text
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "big-image" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <ImageIcon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Big Image
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "bold-statement" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <Type02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Bold Statement
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "process" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <Dataflow02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Process
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "interview" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <Mic className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Interview
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "personas" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <Users03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Personas
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "testimonial" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <MessageSquare className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Testimonial
                  </span>
                </DialogClose>
                <DialogClose
                  onClick={() => dispatch({ type: "gallery" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <GalleryIcon className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Gallery
                  </span>
                </DialogClose>

                <DialogClose
                  onClick={() => dispatch({ type: "results-metrics" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <BarChart10 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Result Metrics
                  </span>
                </DialogClose>

                <DialogClose
                  onClick={() => dispatch({ type: "conclusion" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <File06 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Conclusion
                  </span>
                </DialogClose>

                {/* <DialogClose className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
                  <PlaySquare className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Video
                  </span>
                </DialogClose>
                <DialogClose className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
                  <Dataflow03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Customer Journey
                  </span>
                </DialogClose>

                <DialogClose className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500">
                  <Monitor02 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Prototype
                  </span>
                </DialogClose>
               
                <DialogClose
                  onClick={() => dispatch({ type: "custom-columns" })}
                  className="group p-5 focus-visible:outline-none flex flex-col items-center gap-y-3 rounded-lg border-2 border-transparent transition duration-300 hover:bg-primary-25 hover:border-primary-500"
                >
                  <Columns03 className="size-[25.2px] text-gray-500 group-hover:text-primary-500 shrink-0" />
                  <span className="inline-block text-[17.74px] text-gray-500 group-hover:text-primary-500 font-medium leading-none whitespace-nowrap">
                    Custom Columns
                  </span>
                </DialogClose> */}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
