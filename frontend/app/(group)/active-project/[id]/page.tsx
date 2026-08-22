"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { addDays, addWeeks, endOfWeek, format, isBefore, isValid, parse, startOfDay, startOfWeek } from "date-fns"
import { preventDefault } from "@/utils/dom-utils"
import { getFirstItem } from "@/utils/functions"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Alert,
  AlertContent,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupButton,
  AvatarImage,
  AvatarRoot,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  IconButton,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  CloseButton,
  Textarea,
  ToastAction,
  useToast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  DisclosureContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Input,
  InputGroup,
  InputLeftElement,
  DropdownPopover,
  DropdownPopoverTrigger,
  DropdownPopoverContent,
  DropdownCommand,
  DropdownCommandInput,
  DropdownCommandEmpty,
  DropdownCommandGroup,
  DropdownCommandItem,
  CommandList,
  comboboxInputVariants,
  EditableRoot,
  EditableArea,
  EditableInput,
  EditablePreview,
  Calendar as CalendarPicker,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui"
import {
  ArrowDown,
  AlertTriangle,
  Attachment01,
  Calendar,
  CalendarCheck01,
  Check,
  Check1,
  CheckCircle,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CurrencyDollar,
  Copy07,
  CornerRightUp,
  Download01,
  Edit03,
  Edit05,
  Expand01,
  FilterLines,
  FolderClosed,
  Folder,
  File02,
  File06,
  FileCheck02,
  HelpCircle,
  Home,
  LinkExternal01,
  List as ListIcon,
  Mail,
  Menu02,
  MessageSquare01,
  Laptop01,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Settings,
  Shield,
  SearchMd,
  Send01,
  Trash01,
  UploadCloud,
  Users,
  Users01,
  X,
  XCircle,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { Grid } from "@/components/icons/grid"
import { List } from "@/components/icons/list"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"

interface TeamMember {
  name: string
  username: string
  role: string
  avatar: string
}

interface Meeting {
  date: string
  day: string
  title: string
  time: string
  type: "internal" | "client"
}

const sampleMembers: TeamMember[] = [
  { name: "Devon Lane", username: "@uxdesignerdevon", role: "Account Manager", avatar: "/man.jpg" },
  { name: "Ian Somerhalder", username: "@iansomerhalder_official", role: "President of Sales", avatar: "/man.jpg" },
  { name: "Harold Finch", username: "@haroldfinchdesigns", role: "Marketing Coordinator", avatar: "/man.jpg" },
  { name: "Max Finch", username: "@maxfinchcreative", role: "Web Designer", avatar: "/man.jpg" },
  { name: "Fiona Gallagher", username: "@fionagallagherux", role: "Software Developer", avatar: "/man.jpg" },
  { name: "Elena Gilbert", username: "@elenagilbertdesign", role: "Ethical Hacker", avatar: "/man.jpg" },
  { name: "Isla Fisher", username: "@islafisherprojects", role: "Project Manager", avatar: "/man.jpg" },
]

const vacantRoles = [
  "UX/UI Designer",
  "Front-end Developer",
  "Full Stack Engineer",
  "Nest.js Backend Engi...",
  "Lead Designer",
]

const sampleMeetings: Meeting[] = [
  { date: "July 24th", day: "Wed", title: "Daily Checkin", time: "10:00 - 11:00 AM", type: "internal" },
  { date: "July 24th", day: "Wed", title: "Milestone Update", time: "1:00 - 2:00 PM", type: "internal" },
  { date: "July 24th", day: "Wed", title: "Milestone Update", time: "1:00 - 2:00 PM", type: "client" },
]

const activityItems = [
  { icon: File06, title: "You placed the order", date: "Thu, Feb 6 (5 days ago)", expandable: false, category: "order" as const },
  { icon: null, title: "Amir Khan", date: "Thu, Feb 6 (5 days ago)", expandable: true, isAvatar: true, category: "member" as const },
  { icon: Check, title: "Due date", date: "Thu, Feb 6 (5 days ago)", expandable: false, category: "milestone" as const },
  { icon: Users, title: "4 project members joined", date: "Thu, Feb 6 (5 days ago)", expandable: true, category: "team" as const },
  { icon: Check, title: "You submitted the requirements", date: "View requirements - Thu, Feb 6 (3 days ago)", expandable: false, category: "milestone" as const },
  { icon: Edit05, title: "Design Email Marketing", date: "Moved to Complete - Thu, Feb 6 (5 days ago)", expandable: false, category: "task" as const },
  { icon: Settings, title: "Quick review design", date: "Thu, Feb 6 (5 days ago) - Task", expandable: false, category: "review" as const },
]

const activityCategoryStyles: Record<string, { bg: string; icon: string }> = {
  order: { bg: "bg-primary-50", icon: "text-primary-500" },
  member: { bg: "bg-gray-100", icon: "text-gray-500" },
  milestone: { bg: "bg-success-50", icon: "text-success-500" },
  team: { bg: "bg-primary-50", icon: "text-primary-500" },
  task: { bg: "bg-warning-50", icon: "text-warning-500" },
  review: { bg: "bg-error-50", icon: "text-error-500" },
}

interface TaskAttachment {
  name: string
  size: string
  progress: number
  /** object URL, set for image files so the card can show a thumbnail */
  url?: string
}

interface ChecklistItem {
  text: string
  checked: boolean
  dueDate: string
  attachments: TaskAttachment[]
}

interface Task {
  id: string
  name: string
  assignee: string
  avatar: string
  status: "Completed" | "Not Started" | "In Progress"
  dueDate: string
  description: string
  milestone: string
  attachments: TaskAttachment[]
  checklist: ChecklistItem[]
}

const initialThisWeekTasks: Task[] = [
  { id: "t1", name: "Homepage Wireframes", assignee: "Devon Lane", avatar: "/man.jpg", status: "Completed", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t2", name: "Nav Redesign", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t3", name: "Mobile Breakpoints", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t4", name: "Component Audit", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t5", name: "Empty State Copy", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t6", name: "Motion Spec", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "t7", name: "Accessibility Pass", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
]

const initialNextWeekTasks: Task[] = [
  { id: "n1", name: "Checkout Flow Spec", assignee: "Devon Lane", avatar: "/man.jpg", status: "Completed", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "n2", name: "Payment Error States", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "n3", name: "Order Summary UI", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "n4", name: "Receipt Email Template", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "n5", name: "Refund Policy Page", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 23, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
]

const initialOverdueTasks: Task[] = [
  { id: "o1", name: "Competitor Analysis", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "Jul 9, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "o2", name: "Stakeholder Interviews", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 11, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "o3", name: "Content Audit", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Jul 15, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
]

const initialLaterTasks: Task[] = [
  { id: "l1", name: "Design QA", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Aug 12, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "l2", name: "Usability Testing", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "Aug 20, 2024", description: "", milestone: "None", attachments: [], checklist: [] },
]

const initialNoDueDateTasks: Task[] = [
  { id: "d1", name: "Design System Cleanup", assignee: "Devon Lane", avatar: "/man.jpg", status: "Not Started", dueDate: "", description: "", milestone: "None", attachments: [], checklist: [] },
  { id: "d2", name: "Icon Library Review", assignee: "Devon Lane", avatar: "/man.jpg", status: "In Progress", dueDate: "", description: "", milestone: "None", attachments: [], checklist: [] },
]

const taskStatusStyles: Record<string, { bg: string; text: string }> = {
  "Completed": { bg: "bg-success-50", text: "text-success-700" },
  "Not Started": { bg: "bg-gray-100", text: "text-gray-500" },
  "In Progress": { bg: "bg-primary-50", text: "text-primary-500" },
}

type TaskListKey = "this" | "next" | "overdue" | "later" | "none"

interface SortableTaskRowProps {
  task: Task
  list: TaskListKey
  i: number
  openTask: (task: Task, list: TaskListKey, index: number) => void
  renamingTaskKey: string | null
  setRenamingTaskKey: (key: string | null) => void
  renameTask: (list: TaskListKey, index: number, name: string) => void
  duplicateTask: (list: TaskListKey, index: number) => void
  deleteTask: (list: TaskListKey, index: number) => void
  onManageFiles: (task: Task, list: TaskListKey, index: number) => void
  selectedIds: string[]
  onSelectChange: (id: string, selected: boolean) => void
  isLast: boolean
  dragOverId: string | null
}


interface AssigneePickerProps {
  selected: TeamMember[]
  onSelectedChange: (value: TeamMember[]) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** defaults to the dashed + button used in the task dialog */
  trigger?: React.ReactNode
  triggerClassName?: string
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
}

const AssigneePicker = ({
  selected,
  onSelectedChange,
  open,
  onOpenChange,
  trigger,
  triggerClassName = "!inline-flex !h-8 !w-8 !rounded-full !p-0 !text-gray-400 transition-colors duration-300 hover:!border-gray-400 hover:!text-gray-500",
  side,
  sideOffset,
}: AssigneePickerProps) => {
  const [search, setSearch] = React.useState("")

  return (
  <DropdownPopover
    open={open}
    onOpenChange={onOpenChange}
    multiple
    selected={selected}
    onSelectedChange={(value: TeamMember[]) => onSelectedChange(value)}
  >
    <DropdownPopoverTrigger asChild className={triggerClassName}>
      {trigger ?? (
        <AvatarGroupButton size="sm">
          <Plus className="h-4 w-4" />
        </AvatarGroupButton>
      )}
    </DropdownPopoverTrigger>
    <DropdownPopoverContent
      side={side}
      align="start"
      collisionPadding={16}
      sideOffset={sideOffset}
      className="w-72 border border-gray-100 p-0"
    >
      <DropdownCommand>
        <div className="border-b border-gray-100 p-3.5">
          <InputGroup>
            <InputLeftElement className="w-8">
              <SearchMd className="size-4 text-gray-500" />
            </InputLeftElement>
            <DropdownCommandInput
              placeholder="Search names, emails, or roles"
              className={comboboxInputVariants({ visual: "default", size: "sm" })}
              value={search}
              onValueChange={setSearch}
            />
          </InputGroup>
        </div>

        <CommandList className="max-h-72 pr-2.5 scrollbar scrollbar-w-2 scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
          <DropdownCommandEmpty>No team members found</DropdownCommandEmpty>
          {[
            { heading: "My team", members: sampleMembers.slice(0, 3) },
            { heading: "Suggested", members: sampleMembers.slice(3) },
          ].map((group) => (
            <DropdownCommandGroup
              key={group.heading}
              heading={group.heading}
              className="[&_[cmdk-group-heading]]:mb-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-800"
            >
              {group.members.map((member) => (
                <DropdownCommandItem
                  key={member.username}
                  itemValue={member}
                  value={`${member.name} ${member.username} ${member.role}`}
                  className="items-center gap-2 rounded-md bg-transparent py-2 data-[selected=true]:bg-gray-50"
                >
                  <Avatar size="sm">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                    <p className="truncate text-[13px] font-medium leading-[13px] text-gray-700 transition-colors group-data-[selected=true]:text-gray-900">
                      {member.name.split(" ")[0]}{" "}
                      <span className="font-normal text-gray-500 transition-colors group-data-[selected=true]:text-gray-700">
                        {member.username}
                      </span>
                    </p>
                    <p className="truncate text-[11px] font-light leading-[13px] text-gray-500 transition-colors group-data-[selected=true]:text-gray-700">
                      {member.role}
                    </p>
                  </div>
                  <Check1 className="ml-auto size-4 shrink-0 text-primary-500 opacity-0 group-data-[state=selected]:opacity-100" />
                </DropdownCommandItem>
              ))}
            </DropdownCommandGroup>
          ))}
        </CommandList>

        <Button
          variant="ghost"
          visual="gray"
          className="group h-auto w-full shrink-0 justify-start gap-2 rounded-none border-t border-gray-100 p-3.5 hover:bg-gray-50"
        >
          <Users01 className="size-4 text-gray-500 transition-colors group-hover:text-gray-900" />
          <span className="text-[13px] font-medium leading-[13px] text-gray-500 transition-colors group-hover:text-gray-900">
            Invite team member
          </span>
        </Button>
      </DropdownCommand>
    </DropdownPopoverContent>
  </DropdownPopover>
  )
}

const StickySectionBar = ({
  children,
}: {
  children: (stuck: boolean) => React.ReactNode
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // the sentinel sits just above the bar; once it passes under the fixed nav
    // the bar is pinned
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { rootMargin: "-117px 0px 0px 0px", threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" />
      {children(stuck)}
    </>
  )
}

// Reusable dropdowns extracted from the task dialog. Default props reproduce the
// dialog's exact markup and behaviour; the pinned bar passes its own trigger.
const TaskStatusMenu = ({
  value,
  onChange,
  trigger,
  align = "start",
  sideOffset,
  contentClassName = "w-[174px]",
}: {
  value: string
  onChange: (status: Task["status"]) => void
  trigger?: React.ReactNode
  align?: "start" | "center" | "end"
  sideOffset?: number
  contentClassName?: string
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      {trigger ?? (
        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          className="w-[174px] h-9 justify-between rounded-[5px] shadow-xs"
        >
          <span className="text-sm font-semibold text-gray-800">{value}</span>
          <ChevronDown className="size-[15px] text-gray-500" />
        </Button>
      )}
    </DropdownMenuTrigger>
    <DropdownMenuContent align={align} sideOffset={sideOffset} className={contentClassName}>
      <DropdownMenuItem onClick={() => onChange("Not Started")}>Not Started</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onChange("In Progress")}>In Progress</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onChange("Completed")}>Completed</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

const TaskDueDatePicker = ({
  value,
  onChange,
  open,
  onOpenChange,
  trigger,
  side = "right",
}: {
  value?: Date
  onChange: (value: Date) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
}) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild>
      {trigger ?? (
        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          className="group h-9 gap-2 rounded-[5px] shadow-xs"
        >
          <Calendar className="size-[15px] text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">
            {value ? format(value, "LLL d, yyyy") : "Select date"}
          </span>
          {value && (
            <span
              role="button"
              aria-label="Clear due date"
              className="hidden opacity-50 transition-opacity duration-300 hover:opacity-100 group-hover:inline-flex"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onChange(undefined as unknown as Date)
              }}
            >
              <XCircle className="size-4 text-gray-500" />
            </span>
          )}
        </Button>
      )}
    </PopoverTrigger>
    <DropdownPopoverContent
      side={side}
      align="start"
      avoidCollisions={false}
      sideOffset={8}
      onOpenAutoFocus={preventDefault}
      onMouseUp={(event) => {
        const el = (event.target as HTMLElement).closest("button")
        if (el) el.blur()
      }}
      className="w-[330px] overflow-hidden rounded-lg border border-gray-100 bg-white p-0 shadow-xl data-[state=closed]:hidden data-[state=closed]:animate-none"
    >
      <CalendarPicker
        minValue={new Date()}
        className="border-none shadow-none"
        value={value}
        onValueChange={onChange}
      />
    </DropdownPopoverContent>
  </Popover>
)

const SortableTaskRow = ({
  task,
  list,
  i,
  openTask,
  renamingTaskKey,
  setRenamingTaskKey,
  renameTask,
  duplicateTask,
  deleteTask,
  onManageFiles,
  selectedIds,
  onSelectChange,
  isLast,
  dragOverId,
}: SortableTaskRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    activeIndex,
    index,
  } = useSortable({ id: task.id, data: { list } })
  // 4px blue rule marking where the card will land
  const dropBefore = activeIndex === -1 || activeIndex > index
  // hovering past the last row targets the section itself, so mark its bottom edge
  const overSection = isLast && dragOverId === `section-${list}`
  const dropLine = overSection
    ? "border-b-4 border-b-primary-500"
    : !isOver
      ? ""
      : dropBefore
        ? "border-t-4 border-t-primary-500"
        : "border-b-4 border-b-primary-500"
  const rowStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const style = taskStatusStyles[task.status]

  return (

                              <TableRow ref={setNodeRef} style={rowStyle} className={`cursor-pointer ${isLast ? "[&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-br-lg" : "[&>td]:border-b [&>td]:border-gray-200"} ${isDragging ? "opacity-40" : ""} ${dropLine} ${
                                  i >= 5 ? "animate-in fade-in slide-in-from-top-1 duration-150" : ""
                                }`} onClick={() => openTask(task, list, i)}>
                                <TableCell className="w-[50px] py-4 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                                  <img
                                    src="/icons/drag.svg"
                                    alt=""
                                    className={`box-content mx-auto w-2 h-3 cursor-grab -my-2 p-2 transition-opacity duration-300 hover:opacity-100 active:cursor-grabbing ${
                                      isDragging ? "opacity-100" : "opacity-50"
                                    }`}
                                    {...attributes}
                                    {...listeners}
                                  />
                                </TableCell>
                                <TableCell className="w-11 py-4 pl-4 pr-4" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedIds.includes(task.id)}
                                    onCheckedChange={(checked) =>
                                      onSelectChange(task.id, checked === true)
                                    }
                                  />
                                </TableCell>
                                <TableCell
                                  className="w-full max-w-0 py-4 px-6 text-sm text-gray-600"
                                  onClick={(e) => {
                                    if (renamingTaskKey === list + "-" + i) e.stopPropagation()
                                  }}
                                >
                                  <EditableRoot
                                    value={task.name}
                                    edit={renamingTaskKey === list + "-" + i}
                                    submitMode="both"
                                    onEditChange={(details) => {
                                      if (!details.edit) setRenamingTaskKey(null)
                                    }}
                                    onValueChange={(details) => renameTask(list, i, details.value)}
                                  >
                                    <EditableArea className="w-full">
                                      <EditableInput className="w-full truncate whitespace-nowrap bg-transparent text-sm font-normal leading-5 text-gray-600 shadow-none" />
                                      <EditablePreview className="truncate text-sm font-normal leading-5 text-gray-600" />
                                    </EditableArea>
                                  </EditableRoot>
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                  <Avatar size="sm">
                                    <AvatarImage src={task.avatar} alt={task.assignee} />
                                    <AvatarFallback>{task.assignee[0]}</AvatarFallback>
                                  </Avatar>
                                </TableCell>
                                <TableCell className="py-4 px-6 whitespace-nowrap">
                                  <Badge className={`${style.bg} ${style.text} border-0`}>{task.status}</Badge>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap truncate">{task.dueDate}</TableCell>
                                <TableCell className="w-[50px] py-4 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                                  <IconButton visual="gray" variant="outlined" size="sm" className="rounded-full w-7 h-7 hover:bg-gray-200 focus:bg-transparent transition-colors duration-300 group/attach">
                                    <Paperclip className="w-3 h-3 group-hover/attach:hidden" />
                                    <Plus className="w-3 h-3 text-gray-800 hidden group-hover/attach:block" />
                                  </IconButton>
                                </TableCell>
                                <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <IconButton visual="gray" variant="ghost" size="sm" className="rounded-full hover:bg-gray-200 focus:bg-transparent data-[state=open]:bg-gray-200 transition-colors duration-300">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </IconButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[165px]" onCloseAutoFocus={preventDefault}>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => setRenamingTaskKey(list + "-" + i)}
                                      >
                                        <Edit03 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Rename</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => duplicateTask(list, i)}
                                      >
                                        <Copy07 className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Duplicate task</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="gap-2" onClick={() => onManageFiles(task, list, i)}>
                                        <FolderClosed className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs font-medium text-gray-500">Manage files</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gap-2 text-error-600 focus:bg-error-50 focus:text-error-600"
                                        onClick={() => deleteTask(list, i)}
                                      >
                                        <Trash01 className="w-4 h-4" />
                                        <span className="text-xs font-medium">Delete task</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                              )
}


export default function ActiveProjectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const contractTitle = searchParams.get("title") || "Marketeq Client Portal - Redesigning and Optimizing Website for Enhanced User Experience."
  const groupName = searchParams.get("group") || "My Contracts"
  const [activeTab, setActiveTab] = useState("overview")
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [taskName, setTaskName] = useState("")
  const [taskPhase, setTaskPhase] = useState("Phase 1 Research")
  const [taskMilestone, setTaskMilestone] = useState("None")
  const [taskStatus, setTaskStatus] = useState("Not Started")
  const [taskDueDate, setTaskDueDate] = useState<Date>()
  const [dueDateOpen, setDueDateOpen] = useState(false)
  // "Phase 1 Research" -> label "Phase 1" keeps its style, name "Research" is lighter
  const phaseLabel = taskPhase.split(" ").slice(0, 2).join(" ")
  const phaseName = taskPhase.split(" ").slice(2).join(" ")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([])
  const [taskAssignees, setTaskAssignees] = useState<TeamMember[]>([])
  const [assigneeSearch, setAssigneeSearch] = useState("")
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [dragOverChecklistIdx, setDragOverChecklistIdx] = useState<number | null>(null)
  const [renamingChecklistIdx, setRenamingChecklistIdx] = useState<number | null>(null)
  const [checklistMenuIdx, setChecklistMenuIdx] = useState<number | null>(null)
  const [checklistDateIdx, setChecklistDateIdx] = useState<number | null>(null)
  const [dateConfirmIdx, setDateConfirmIdx] = useState<number | null>(null)
  const [dateTipIdx, setDateTipIdx] = useState<number | null>(null)
  const [clipConfirmIdx, setClipConfirmIdx] = useState<number | null>(null)
  const [clipTipIdx, setClipTipIdx] = useState<number | null>(null)
  const clipConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checklistFileInputRef = useRef<HTMLInputElement>(null)
  const checklistFileTargetIdx = useRef<number | null>(null)
  const dateConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteChecklistIdx, setDeleteChecklistIdx] = useState<number | null>(null)
  const [deleteChecklistOpen, setDeleteChecklistOpen] = useState(false)
  const [deleteAttachmentIdx, setDeleteAttachmentIdx] = useState<number | null>(null)
  const [deleteAllAttachmentsOpen, setDeleteAllAttachmentsOpen] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [convertItemIdx, setConvertItemIdx] = useState<number | null>(null)
  const [convertPhase, setConvertPhase] = useState("Phase 1 Research")
  const [convertAssignees, setConvertAssignees] = useState<TeamMember[]>([])
  const [convertAssigneeOpen, setConvertAssigneeOpen] = useState(false)
  const [allAttachmentsOpen, setAllAttachmentsOpen] = useState(false)
  const [attachmentSearch, setAttachmentSearch] = useState("")
  const [attachmentScope, setAttachmentScope] = useState(["all"])
  const [attachmentView, setAttachmentView] = useState(["grid"])
  const { toast } = useToast()

  const removeChecklistItem = (index: number, keepAttachments: boolean) => {
    const removed = checklistItems[index]
    if (!removed) return
    const count = removed.attachments.length
    const kept = keepAttachments ? removed.attachments : []
    if (kept.length > 0) setTaskAttachments(prev => [...prev, ...kept])
    setChecklistItems(prev => prev.filter((_, i) => i !== index))
    toast({
      variant: "success",
      title:
        count === 0
          ? "Checklist item deleted"
          : keepAttachments
            ? `Checklist item deleted. ${count} attachments were kept in task files`
            : `Checklist item and ${count} attachments deleted`,
      action: (
        <ToastAction
          altText="Undo"
          className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
          onClick={() => {
            setChecklistItems(prev => {
              const next = [...prev]
              next.splice(index, 0, removed)
              return next
            })
            if (kept.length > 0) {
              setTaskAttachments(prev => prev.slice(0, prev.length - kept.length))
            }
          }}
        >
          Undo
        </ToastAction>
      ),
    })
  }
  const [keepChecklistAttachments, setKeepChecklistAttachments] = useState(false)
  const taskBodyRef = useRef<HTMLDivElement>(null)
  const checklistEndRef = useRef<HTMLDivElement>(null)

  // only scroll when the "Add new item" row is not already fully visible
  const revealChecklistEnd = () =>
    requestAnimationFrame(() => {
      const row = checklistEndRef.current
      const body = taskBodyRef.current
      if (!row || !body) return
      const rowRect = row.getBoundingClientRect()
      const bodyRect = body.getBoundingClientRect()
      const fullyVisible =
        rowRect.top >= bodyRect.top && rowRect.bottom <= bodyRect.bottom
      if (!fullyVisible) {
        row.scrollIntoView({ behavior: "smooth", block: "end" })
      }
    })
  const [taskDragOver, setTaskDragOver] = useState(false)
  const [thisWeekTasks, setThisWeekTasks] = useState<Task[]>(initialThisWeekTasks)
  const [nextWeekTasks, setNextWeekTasks] = useState<Task[]>(initialNextWeekTasks)
  const [overdueTasks, setOverdueTasks] = useState<Task[]>(initialOverdueTasks)
  const [laterTasks, setLaterTasks] = useState<Task[]>(initialLaterTasks)
  const [noDueDateTasks, setNoDueDateTasks] = useState<Task[]>(initialNoDueDateTasks)

  const [renamingTaskKey, setRenamingTaskKey] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<{ list: TaskListKey; index: number; original: Task } | null>(null)

  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  // table checkboxes are multi-select, not completion
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkAssignees, setBulkAssignees] = useState<TeamMember[]>([])
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkAssignSearch, setBulkAssignSearch] = useState("")
  const [bulkDueOpen, setBulkDueOpen] = useState(false)

  const updateSelectedTasks = (patch: (task: Task) => Task) =>
    allTaskSections.forEach(sec =>
      taskListSetter(sec.key)(prev =>
        prev.map(t => (selectedTaskIds.includes(t.id) ? patch(t) : t))
      )
    )

  const duplicateSelectedTasks = () =>
    allTaskSections.forEach(sec =>
      taskListSetter(sec.key)(prev =>
        prev.flatMap(t =>
          selectedTaskIds.includes(t.id)
            ? [t, { ...t, id: `task-${Date.now()}-${t.id}`, name: `${t.name} (copy)` }]
            : [t]
        )
      )
    )

  const deleteSelectedTasks = () =>
    allTaskSections.forEach(sec =>
      taskListSetter(sec.key)(prev => prev.filter(t => !selectedTaskIds.includes(t.id)))
    )
  // count at the moment the alert was dismissed; a different count re-shows it,
  // and the state resets on refresh so unresolved overdue tasks surface again
  const [dismissedOverdueCount, setDismissedOverdueCount] = useState<number | null>(null)
  // how many rows each section is currently showing; 5 until expanded
  const [sectionLimits, setSectionLimits] = useState<Partial<Record<TaskListKey, number>>>({})
  const [collapsedSections, setCollapsedSections] = useState<Partial<Record<TaskListKey, boolean>>>({})

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // which group a task belongs to, derived from its due date
  const sectionForDueDate = (dueDate: string): TaskListKey => {
    if (!dueDate) return "none"
    const due = parse(dueDate, "LLL d, yyyy", new Date())
    if (!isValid(due)) return "none"
    const today = startOfDay(new Date())
    if (isBefore(due, today)) return "overdue"
    if (due <= endOfWeek(today, { weekStartsOn: 1 })) return "this"
    if (due <= endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })) return "next"
    return "later"
  }

  // Friday of the week a section covers; No due date clears it
  const dueDateForSection = (list: TaskListKey) => {
    if (list === "none") return ""
    const weeks = { overdue: -1, this: 0, next: 1, later: 2 }[list] ?? 0
    const friday = addDays(startOfWeek(addWeeks(new Date(), weeks), { weekStartsOn: 1 }), 4)
    return format(friday, "LLL d, yyyy")
  }

  const handleTaskDragEnd = (event: DragEndEvent) => {
    // the dragged card has pointer-events off, so hold the cursor on the document
    document.body.style.cursor = ""
    setActiveDragTask(null)
    setDragOverId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const findList = (id: string): TaskListKey | null =>
      allTaskSections.find(section => section.items.some(t => t.id === id))?.key ?? null
    const overId = String(over.id)
    const from = findList(String(active.id))
    const to = overId.startsWith("section-")
      ? (overId.slice("section-".length) as TaskListKey)
      : (findList(overId) ?? (over.data.current?.list as TaskListKey | undefined))
    if (!from || !to) return

    if (from === to) {
      if (overId.startsWith("section-")) return
      const items = allTaskSections.find(section => section.key === from)?.items ?? []
      const oldIndex = items.findIndex(t => t.id === active.id)
      const newIndex = items.findIndex(t => t.id === over.id)
      taskListSetter(from)(prev => arrayMove(prev, oldIndex, newIndex))
      return
    }

    // moving between sections also rewrites the due date to match the new range
    const source = allTaskSections.find(section => section.key === from)?.items ?? []
    const target = allTaskSections.find(section => section.key === to)?.items ?? []
    const moved = source.find(t => t.id === active.id)
    if (!moved) return
    const insertAt = target.findIndex(t => t.id === over.id)
    const previousDueDate = moved.dueDate
    const dropped = { ...moved, dueDate: dueDateForSection(to) }
    taskListSetter(from)(prev => prev.filter(t => t.id !== active.id))
    taskListSetter(to)(prev => {
      const next = [...prev]
      next.splice(insertAt < 0 ? next.length : insertAt, 0, dropped)
      return next
    })
    if (previousDueDate !== dropped.dueDate) {
      toast({
        variant: "success",
        title: "Due date updated",
        action: (
          <ToastAction
            altText="Undo"
            className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => {
              taskListSetter(to)(prev => prev.filter(t => t.id !== dropped.id))
              taskListSetter(from)(prev => [...prev, { ...moved, dueDate: previousDueDate }])
            }}
          >
            Undo
          </ToastAction>
        ),
      })
    }
  }

  const taskListSetter = (list: TaskListKey) =>
    ({
      this: setThisWeekTasks,
      next: setNextWeekTasks,
      overdue: setOverdueTasks,
      later: setLaterTasks,
      none: setNoDueDateTasks,
    })[list]

  const allTaskSections: { key: TaskListKey; label: string; items: Task[] }[] = [
    { key: "this", label: "To-do for This Week", items: thisWeekTasks },
    { key: "next", label: "To-do for Next Week", items: nextWeekTasks },
    { key: "overdue", label: "Overdue Tasks", items: overdueTasks },
    { key: "later", label: "To-do Later", items: laterTasks },
    { key: "none", label: "No Due Date", items: noDueDateTasks },
  ]
  // an empty section is hidden entirely, but This Week always stays so
  // there is somewhere to add a task from
  const taskSections = allTaskSections.filter(
    section => section.items.length > 0 || section.key === "this"
  )

  const renameTask = (list: TaskListKey, index: number, name: string) =>
    taskListSetter(list)(prev => prev.map((t, i) => (i === index ? { ...t, name } : t)))

  const duplicateTask = (list: TaskListKey, index: number) =>
    taskListSetter(list)(prev => [
      ...prev.slice(0, index + 1),
      {
        ...prev[index],
        id: `task-${Date.now()}`,
        name: `${prev[index].name} (copy)`,
      },
      ...prev.slice(index + 1),
    ])

  const deleteTask = (list: TaskListKey, index: number) =>
    taskListSetter(list)(prev => prev.filter((_, i) => i !== index))

  const openTask = (task: Task, list: TaskListKey, index: number) => {
    setEditingTask({ list, index, original: task })
    setTaskName(task.name)
    setTaskStatus(task.status)
    setTaskDescription(task.description)
    setTaskMilestone(task.milestone)
    setTaskDueDate(task.dueDate ? parse(task.dueDate, "LLL d, yyyy", new Date()) : undefined)
    setTaskAssignees(sampleMembers.filter(m => m.name === task.assignee))
    setTaskAttachments(task.attachments)
    setChecklistItems(task.checklist)
    setShowChecklist(task.checklist.length > 0)
    setCreateTaskOpen(true)
  }

  // completing a task never moves it out of its due-date group
  const toggleTaskComplete = (list: TaskListKey, index: number, complete: boolean) =>
    taskListSetter(list)(prev =>
      prev.map((t, i) =>
        i === index ? { ...t, status: complete ? "Completed" : "Not Started" } : t
      )
    )

  const openTaskFiles = (task: Task, list: TaskListKey, index: number) => {
    // load the task's data without opening the task dialog behind the files view
    setEditingTask({ list, index, original: task })
    setTaskName(task.name)
    setTaskAttachments(task.attachments)
    setChecklistItems(task.checklist)
    setAllAttachmentsOpen(true)
  }

  const draftTask: Task = {
    id: editingTask ? editingTask.original.id : `task-${Date.now()}`,
    name: taskName.trim(),
    assignee: taskAssignees[0] ? taskAssignees[0].name : "Unassigned",
    avatar: taskAssignees[0] ? taskAssignees[0].avatar : "/man.jpg",
    status: taskStatus as Task["status"],
    dueDate: taskDueDate ? format(taskDueDate, "LLL d, yyyy") : "",
    description: taskDescription,
    milestone: taskMilestone,
    attachments: taskAttachments,
    checklist: checklistItems,
  }
  const taskDirty =
    !editingTask ||
    JSON.stringify(draftTask) !== JSON.stringify(editingTask.original)

  const describeFiles = (files: FileList | null): TaskAttachment[] =>
    files
      ? Array.from(files).map(f => ({
          name: f.name,
          size:
            f.size < 1024 * 1024
              ? `${Math.round(f.size / 1024)} KB`
              : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
          progress: 100,
          url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
        }))
      : []

  const addTaskFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newFiles = describeFiles(files)
    setTaskAttachments(prev => [...prev, ...newFiles])
    // reveal the upload progress as soon as the files land
    requestAnimationFrame(() => {
      const body = taskBodyRef.current
      if (body) {
        body.scrollTo({ top: body.scrollHeight, behavior: "smooth" })
      }
    })
  }
  const taskFileInputRef = useRef<HTMLInputElement>(null)

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AuthenticatedRoute>
      <div className={`flex bg-gray-50 min-h-screen transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="inline-flex items-center">
                <Home className="size-3.5" />
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/client-dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/my-contracts">My Contracts</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>{contractTitle.length > 30 ? contractTitle.slice(0, 30) + "..." : contractTitle}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Page Header */}
          <div className="flex items-center justify-between mt-5">
            <h1 className="text-[28px] font-bold text-dark-blue-400 leading-[34px] flex-1">
              {contractTitle}
            </h1>
            <div className="flex items-center gap-6 flex-none">
              <Button variant="ghost" visual="gray" size="sm" leftIcon={<HelpCircle className="size-[15px]" />} className="text-sm font-semibold text-gray-500">
                Get help
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outlined" visual="gray" size="sm" leftIcon={<LinkExternal01 className="size-[15px]" />} className="rounded-[5px]">
                  View in Marketplace
                </Button>
                <IconButton variant="outlined" visual="gray" size="sm" className="rounded-[5px] size-9">
                  <Settings className="size-3" />
                </IconButton>
                <IconButton variant="outlined" visual="gray" size="sm" className="rounded-[5px] size-9">
                  <MoreHorizontal className="size-3" />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          <div className="mt-5 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)] overflow-hidden">
            {/* Top section with stats */}
            <div className="px-6 py-6 border-b border-gray-200">
              <p className="text-sm font-bold text-dark-blue-400 mb-6">Order Summary</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <File02 className="size-5 text-primary-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-light text-dark-blue-400">Order number</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">#F04098529345U9RT</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <CalendarCheck01 className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Order Placed</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">May 24, 2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <CurrencyDollar className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Project Cost</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2">$94,000</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-11 rounded-lg border-[1.5px] border-gray-200 flex-none">
                    <Clock className="size-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs font-light text-dark-blue-400">Project Duration</p>
                    <p className="text-sm font-bold text-dark-blue-400 mt-2 flex items-center gap-1">
                      6 months, 12 days
                      <HelpCircle className="size-3.5 text-gray-400" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom section with image + description */}
            <div className="px-6 py-6 flex items-start gap-4">
              <div className="w-[125px] h-20 rounded-md bg-gray-200 flex-none overflow-hidden">
                <img src="/man.jpg" alt="Project" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-light text-gray-700 leading-[17px] line-clamp-2">
                  Lorem ipsum dolor sit amet consectetur. Mi eu ipsum augue in integer lacus amet semper. Non dictum phasellus elit turpis
                  nisi vitae et. Tristique ultricies habitasse tortor vehicula elementum. Nulla turpis moncus venenatis at. In porta viverra fauci...
                </p>
                <div className="flex items-center justify-between mt-3.5">
                  <AvatarGroup size="sm" max={4} excess excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white">
                    {sampleMembers.slice(0, 6).map((m, i) => (
                      <Avatar key={i} size="sm" className="hover:ring-0 active:ring-0">
                        <AvatarImage src={m.avatar} alt={m.name} />
                        <AvatarFallback>{m.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <Link href="/billing">
                    <Button variant="outlined" visual="gray" size="sm" leftIcon={<FileCheck02 className="size-[15px]" />} className="rounded-[5px]">
                      View Billing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs + Content */}
          <div className="mt-8 flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="px-5 w-full !justify-start [&>*+*]:ml-8 [&>*]:text-base">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="scope">Scope</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6 mt-6">
                    {/* Project Summary + Progress Overview (single card with divider) */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                      {/* Project Summary section */}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-bold text-dark-blue-400">Project Summary</h2>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-light text-gray-400">Team Status</span>
                            <Badge visual="success" size="sm" className="rounded-full">Active</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 leading-[17px]">
                          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
                          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
                          consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200" />

                      {/* Progress Overview section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-dark-blue-400">Progress Overview</h2>

                        {/* Tasks Progress inner card */}
                        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-dark-blue-400">Tasks Progress</h3>
                            <Button variant="link" visual="primary" size="sm" className="capitalize" onClick={() => setActiveTab("tasks")}>View Tasks</Button>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 mb-4">
                              Project Duration: 4 months, 6 days
                            </p>
                            <div className="flex items-center gap-[3px] h-[23px] w-full mb-2">
                              <div className="h-[23px] bg-success-200 rounded" style={{ width: "12%" }} />
                              <div className="h-[23px] bg-primary-200 rounded" style={{ width: "34%" }} />
                              <div className="h-[23px] bg-gray-200 rounded flex-1" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-success-200" />
                                <span className="text-[11px] font-semibold text-gray-400">Completed</span>
                                <span className="text-[11px] font-medium text-gray-400">2 tasks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-primary-200" />
                                <span className="text-[11px] font-semibold text-gray-400">In Progress</span>
                                <span className="text-[11px] font-medium text-gray-400">4 tasks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="size-3 rounded bg-gray-200" />
                                <span className="text-[11px] font-semibold text-gray-400">Not Started</span>
                                <span className="text-[11px] font-medium text-gray-400">6 tasks</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-4">
                              <span className="font-normal">2 out of </span>
                              <span className="font-semibold">12 tasks</span>
                              <span className="font-light"> complete</span>
                            </p>
                          </div>
                        </div>

                        {/* Hours Logged inner card */}
                        <div className="border border-gray-200 rounded-lg p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-dark-blue-400">Hours Logged</h3>
                            <Link href="/time-tracking">
                              <Button variant="link" visual="primary" size="sm" className="capitalize">View Timesheet</Button>
                            </Link>
                          </div>
                          <div className="flex items-center justify-between gap-2 drop-shadow-[0px_1px_4px_rgba(0,0,0,0.03)] rounded-lg">
                            {[
                              { label: "Today", value: "4h 30m" },
                              { label: "This Week", value: "4h 30m" },
                              { label: "This Month", value: "4h 30m" },
                              { label: "Total Hours", value: "142h 30m" },
                            ].map((stat) => (
                              <div key={stat.label} className="flex flex-col items-start gap-2 flex-1">
                                <p className="text-sm font-medium text-dark-blue-400 leading-5">{stat.label}</p>
                                <p className="text-base font-bold text-dark-blue-400 leading-[19px]">
                                  {stat.value} <span className="text-[10px] font-normal">Logged</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Members + Vacant Roles (single card with divider) */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                      {/* Team Members section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-xl font-bold text-dark-blue-400">Team Members</h2>
                        <div className="grid grid-cols-3 gap-6">
                          {/* Add Member */}
                          <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="flex items-center justify-center size-10 rounded-full border border-dashed border-gray-300 bg-white flex-none group-hover:border-gray-500 transition-colors">
                              <Plus className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </div>
                            <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline">Add Member</span>
                          </div>
                          {sampleMembers.map((member, i) => (
                            <div key={i} className="flex items-center gap-3 min-w-0 cursor-pointer group">
                              <Avatar size="md" className="hover:ring-0 active:ring-0 flex-none !size-10">
                                <AvatarImage src={member.avatar} alt={member.name} />
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 space-y-1">
                                <p className="text-base leading-[19px] text-dark-blue-400 hover:underline truncate">
                                  <span className="font-semibold">{member.name.split(" ")[0]}</span> <span className="font-normal">{member.username}</span>
                                </p>
                                <p className="text-xs font-medium text-dark-blue-400 truncate">{member.role}</p>
                              </div>
                            </div>
                          ))}
                          {/* View Team */}
                          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab("team")}>
                            <div className="flex items-center justify-center size-10 rounded-full border-2 border-gray-300 bg-white flex-none">
                              <span className="text-xs font-medium text-gray-500">+5</span>
                            </div>
                            <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline">View Team</span>
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200" />

                      {/* Vacant Roles section */}
                      <div className="p-6 space-y-6">
                        <h2 className="text-base font-bold text-dark-blue-400">Vacant Roles</h2>
                        <div className="grid grid-cols-3 gap-6">
                          {vacantRoles.map((role) => (
                            <div key={role} className="flex items-center gap-3 min-w-0 cursor-pointer group">
                              <div className="flex items-center justify-center size-10 rounded-full border border-dashed border-gray-300 bg-white flex-none group-hover:border-gray-500 transition-colors">
                                <Plus className="size-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                              </div>
                              <span className="text-base font-semibold text-dark-blue-400 leading-[19px] group-hover:underline truncate">{role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-dark-blue-400">Recent Activity</h2>
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <MoreHorizontal className="size-4" />
                        </IconButton>
                      </div>
                      <div className="relative space-y-0">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-10 bottom-4 w-px bg-gray-200" />
                        {activityItems.map((item, i) => {
                          const Icon = item.icon
                          return (
                            <div key={i} className="flex items-start gap-3 relative py-2.5">
                              {item.isAvatar ? (
                                <Avatar size="sm" className="hover:ring-0 active:ring-0 flex-none mt-0.5 z-10 !size-8">
                                  <AvatarImage src="/man.jpg" alt={item.title} />
                                  <AvatarFallback>{item.title[0]}</AvatarFallback>
                                </Avatar>
                              ) : Icon ? (
                                <div className={`flex items-center justify-center size-8 rounded-full flex-none mt-0.5 z-10 ${activityCategoryStyles[item.category]?.bg || "bg-gray-100"}`}>
                                  <Icon className={`size-4 ${activityCategoryStyles[item.category]?.icon || "text-gray-500"}`} />
                                </div>
                              ) : (
                                <div className="size-8 flex-none" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-dark-blue-400">{item.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                                {item.title === "Amir Khan" && (
                                  <div className="mt-2">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
                                      magna aliqua.
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 px-3 py-2 border border-gray-200 rounded-lg">
                                      <File06 className="size-5 text-gray-400" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-dark-blue-400">Marketeq Sanity Nextjs</p>
                                        <p className="text-xs text-gray-400">53.27 kB  pdf</p>
                                      </div>
                                      <IconButton variant="ghost" visual="gray" size="sm">
                                        <MoreHorizontal className="size-4" />
                                      </IconButton>
                                    </div>
                                  </div>
                                )}
                                {item.title === "4 project members joined" && (
                                  <div className="flex items-center gap-1 mt-2">
                                    {[1, 2, 3].map((j) => (
                                      <Avatar key={j} size="sm" className="hover:ring-0 active:ring-0">
                                        <AvatarImage src="/man.jpg" alt="member" />
                                        <AvatarFallback>M</AvatarFallback>
                                      </Avatar>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <Button variant="outlined" visual="gray" size="sm" className="w-full justify-center mt-6" onClick={() => setActiveTab("activity")}>
                        View More
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tasks">
                  <div className="mt-6 flex flex-col items-start p-6 gap-4 bg-white border border-gray-200 shadow-xs rounded-lg">
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragStart={(event) => {
                        document.body.style.cursor = "grabbing"
                        const id = String(event.active.id)
                        setActiveDragTask(
                          allTaskSections.flatMap(section => section.items).find(t => t.id === id) ??
                            null
                        )
                      }}
                      onDragOver={(event) =>
                        setDragOverId(event.over ? String(event.over.id) : null)
                      }
                      onDragCancel={() => {
                        document.body.style.cursor = ""
                        setActiveDragTask(null)
                        setDragOverId(null)
                      }}
                      onDragEnd={handleTaskDragEnd}
                    >
                    {overdueTasks.length > 0 &&
                      dismissedOverdueCount !== overdueTasks.length && (
                      <Alert
                        variant="warning"
                        className="w-full gap-3 rounded-lg p-4"
                        value={dismissedOverdueCount !== overdueTasks.length}
                        onValueChange={(open) =>
                          setDismissedOverdueCount(open ? null : overdueTasks.length)
                        }
                      >
                        <AlertIcon>
                          <AlertTriangle className="h-5 w-5" />
                        </AlertIcon>
                        <AlertContent>
                          <div className="flex items-center gap-6">
                            <AlertTitle className="text-sm font-semibold leading-5 text-warning-600">
                              You have {overdueTasks.length} overdue{" "}
                              {overdueTasks.length === 1 ? "task" : "tasks"}
                            </AlertTitle>
                            <Button
                              variant="link"
                              visual="gray"
                              className="h-auto gap-2 p-0 text-sm font-semibold text-warning-600 hover:text-warning-600 hover:underline focus:text-warning-600 active:text-warning-600"
                              onClick={() =>
                                document
                                  .getElementById("task-section-overdue")
                                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
                              }
                            >
                              <ArrowDown className="size-3.5" />
                              View tasks
                            </Button>
                          </div>
                        </AlertContent>
                        <CloseButton className="text-warning-600" />
                      </Alert>
                    )}
                    {selectedTaskIds.length > 0 && (
                      <StickySectionBar>
                        {(barStuck) => (
                      <div className={`sticky top-[65px] z-30 flex items-center justify-between gap-6 bg-gray-25 py-2 shadow-xs ${
                          barStuck
                            ? "-mx-6 w-[calc(100%+3rem)] self-stretch border-b border-gray-200 px-6"
                            : "w-full rounded-lg border border-gray-200 px-4"
                        }`}>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={
                              allTaskSections.flatMap(sec => sec.items).length > 0 &&
                              allTaskSections
                                .flatMap(sec => sec.items)
                                .every(t => selectedTaskIds.includes(t.id))
                                ? true
                                : selectedTaskIds.length > 0
                                  ? "indeterminate"
                                  : false
                            }
                            onCheckedChange={(checked) =>
                              setSelectedTaskIds(
                                checked === true
                                  ? allTaskSections.flatMap(sec => sec.items).map(t => t.id)
                                  : []
                              )
                            }
                          />
                          <span className="whitespace-nowrap text-sm font-medium text-gray-700">
                            {selectedTaskIds.length} selected
                          </span>
                          <Button
                            variant="link"
                            visual="primary"
                            className="h-auto p-0 text-sm font-medium"
                            onClick={() => setSelectedTaskIds([])}
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="ml-auto flex items-center gap-6">
                          <AssigneePicker
                            selected={bulkAssignees}
                            onSelectedChange={(value) => {
                              setBulkAssignees(value)
                              const first = value[0]
                              if (first) {
                                updateSelectedTasks(t => ({
                                  ...t,
                                  assignee: first.name,
                                  avatar: first.avatar,
                                }))
                              }
                            }}
                            open={bulkAssignOpen}
                            onOpenChange={setBulkAssignOpen}
                            side="bottom"
                            sideOffset={8}
                            triggerClassName="!h-auto !w-auto !border-0 bg-transparent data-[state=open]:!ring-0 data-[state=open]:!border-0"
                            trigger={
                              <Button variant="link" visual="gray" className="group/act -mx-2 -my-1.5 h-auto gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900 hover:no-underline">
                                <UserCircle className="size-4 text-gray-500 transition-colors duration-300 group-hover/act:text-gray-900" />
                                Assign to
                              </Button>
                            }
                          />
                          <TaskStatusMenu
                            value=""
                            onChange={(status) => updateSelectedTasks(t => ({ ...t, status }))}
                            sideOffset={8}
                            trigger={
                              <Button variant="link" visual="gray" className="group/act -mx-2 -my-1.5 h-auto gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900 hover:no-underline">
                                <CheckCircle className="size-4 text-gray-500 transition-colors duration-300 group-hover/act:text-gray-900" />
                                Status
                              </Button>
                            }
                          />
                          <TaskDueDatePicker
                            open={bulkDueOpen}
                            onOpenChange={setBulkDueOpen}
                            side="bottom"
                            onChange={(value) => {
                              updateSelectedTasks(t => ({
                                ...t,
                                dueDate: format(value, "LLL d, yyyy"),
                              }))
                              setBulkDueOpen(false)
                            }}
                            trigger={
                              <Button variant="link" visual="gray" className="group/act -mx-2 -my-1.5 h-auto gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900 hover:no-underline">
                                <Calendar className="size-4 text-gray-500 transition-colors duration-300 group-hover/act:text-gray-900" />
                                Due Date
                              </Button>
                            }
                          />
                          <Button
                            variant="link"
                            visual="gray"
                            className="group/act -mx-2 -my-1.5 h-auto gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900 hover:no-underline"
                            onClick={() => duplicateSelectedTasks()}
                          >
                            <Copy07 className="size-4 text-gray-500 transition-colors duration-300 group-hover/act:text-gray-900" />
                            Duplicate
                          </Button>
                          <span className="h-5 w-px bg-gray-200" />
                          <div className="flex items-center gap-1">
                          <IconButton variant="ghost" visual="gray" size="sm" className="size-8 rounded-full p-0 text-gray-500 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900">
                            <Download01 className="size-4" />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className="size-8 rounded-full p-0 text-gray-500 transition-colors duration-300 hover:bg-error-50 hover:text-error-500"
                            onClick={() => {
                              deleteSelectedTasks()
                              setSelectedTaskIds([])
                            }}
                          >
                            <Trash01 className="size-4" />
                          </IconButton>
                          </div>
                          <span className="ml-0 h-5 w-px bg-gray-200" />
                          <IconButton
                            variant="ghost"
                            visual="gray"
                            size="sm"
                            className={`-ml-4 size-8 rounded-full p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${barStuck ? "-mr-4" : "-mr-2"}`}
                            onClick={() => setSelectedTaskIds([])}
                          >
                            <X className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                        )}
                      </StickySectionBar>
                    )}
                    {taskSections.map((section) => (
                      <div key={section.key} className="contents">
                                          <div
                          id={`task-section-${section.key}`}
                          className={`self-stretch flex flex-col gap-3 scroll-mt-24 ${
                            collapsedSections[section.key] ? "pb-6" : ""
                          }`}
                        >
                        <StickySectionBar>
                          {(stuck) => (
                            <>
                            <div className={`z-20 flex items-center justify-between bg-white pt-2 pb-4 ${
                                selectedTaskIds.length > 0 ? "" : "sticky top-[65px]"
                              }`}>
                          <div
                            className="flex cursor-pointer items-center gap-2"
                            onClick={() =>
                              setCollapsedSections(prev => {
                                const collapsing = !prev[section.key]
                                // expanding returns the group to its default five rows
                                if (!collapsing) {
                                  setSectionLimits(limits => ({ ...limits, [section.key]: 5 }))
                                }
                                return { ...prev, [section.key]: collapsing }
                              })
                            }
                          >
                            <IconButton variant="ghost" visual="gray" size="sm" className="-m-1 flex size-7 items-center justify-center rounded-md p-0 transition-colors duration-300 hover:!bg-gray-100 focus:bg-transparent">
                              <ChevronDown
                                className={`w-4.5 h-4.5 text-gray-500 transition-transform duration-300 ${
                                  collapsedSections[section.key] ? "-rotate-90" : ""
                                }`}
                              />
                            </IconButton>
                            <h2 className="text-lg font-semibold text-dark-blue-400">{section.label}</h2>
                          </div>
                          {section.key === "this" && (
                            <Button variant="outlined" visual="gray" size="sm" onClick={() => { setEditingTask(null); setCreateTaskOpen(true) }}>
                              <Plus className="w-3 h-3" />
                              Add Task
                            </Button>
                          )}
                            </div>
                        <div
                          className={`grid w-full transition-all duration-300 ease-out ${
                            collapsedSections[section.key]
                              ? "grid-rows-[0fr] opacity-0"
                              : "grid-rows-[1fr] opacity-100"
                          }`}
                        >
                          <div
                            className={`relative flex min-h-0 flex-col ${
                              collapsedSections[section.key] ? "overflow-hidden" : ""
                            }`}
                          >
                        <div className="bg-white border border-gray-200 shadow-xs rounded-lg [&>div]:overflow-visible [&>div]:rounded-lg">
                        <Table className="border-separate border-spacing-0">
                          <TableHeader className="[&_tr]:border-t-0">
                            <TableRow>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[50px] rounded-tl-lg bg-gray-50 bg-clip-padding py-3 pl-4 pr-0 border-b border-gray-200`} />
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-11 bg-gray-50 py-3 pl-4 pr-4 border-b border-gray-200`}><Checkbox
                                  checked={
                                    section.items.length > 0 &&
                                    section.items.every(t => selectedTaskIds.includes(t.id))
                                      ? true
                                      : section.items.some(t => selectedTaskIds.includes(t.id))
                                        ? "indeterminate"
                                        : false
                                  }
                                  onCheckedChange={(checked) => {
                                    const ids = section.items.map(t => t.id)
                                    setSelectedTaskIds(prev =>
                                      checked === true
                                        ? [...new Set([...prev, ...ids])]
                                        : prev.filter(id => !ids.includes(id))
                                    )
                                  }}
                                /></TableHead>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-full max-w-0 min-w-[143px] whitespace-nowrap bg-gray-50 py-3 px-6 border-b border-gray-200`}>Task</TableHead>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[105px] whitespace-nowrap bg-gray-50 py-3 px-6 border-b border-gray-200`}>Assigned to</TableHead>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[131px] whitespace-nowrap bg-gray-50 py-3 px-6 border-b border-gray-200`}>Status</TableHead>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[131px] whitespace-nowrap bg-gray-50 py-3 px-6 border-b border-gray-200`}>Due Date</TableHead>
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[52px] bg-gray-50 py-3 pr-0 pl-6 border-b border-gray-200`} />
                              <TableHead className={`z-10 ${selectedTaskIds.length > 0 ? "" : "sticky"} ${selectedTaskIds.length > 0 ? "" : "top-[117px]"} w-[75px] rounded-tr-lg bg-gray-50 bg-clip-padding py-3 px-6 border-b border-gray-200`} />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <SortableContext
                              items={section.items.slice(0, sectionLimits[section.key] ?? 5).map(t => t.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {section.items.slice(0, sectionLimits[section.key] ?? 5).map((task, i) => (
                                <SortableTaskRow
                                  key={task.id}
                                  task={task}
                                  list={section.key}
                                  i={i}
                                  openTask={openTask}
                                  renamingTaskKey={renamingTaskKey}
                                  setRenamingTaskKey={setRenamingTaskKey}
                                  renameTask={renameTask}
                                  duplicateTask={duplicateTask}
                                  deleteTask={deleteTask}
                                  onManageFiles={openTaskFiles}
                                  selectedIds={selectedTaskIds}
                                  onSelectChange={(id, selected) =>
                                    setSelectedTaskIds(prev =>
                                      selected ? [...prev, id] : prev.filter(x => x !== id)
                                    )
                                  }
                                  isLast={
                                    i ===
                                    section.items.slice(0, sectionLimits[section.key] ?? 5).length - 1
                                  }
                                  dragOverId={dragOverId}
                                />
                              ))}
                            </SortableContext>
                          </TableBody>
                        </Table>
                        </div>
                          <div className="absolute right-0 top-full flex justify-end pt-2">
                            {section.items.length > 5 && (
                            <div className="flex items-center">
                            <Button
                              variant="link"
                              visual="gray"
                              className="h-auto p-0"
                              onClick={() =>
                                setSectionLimits(prev => {
                                  const shown = prev[section.key] ?? 5
                                  // expand to the whole list, collapse back to five
                                  return {
                                    ...prev,
                                    [section.key]:
                                      shown >= section.items.length ? 5 : section.items.length,
                                  }
                                })
                              }
                            >
                              {(sectionLimits[section.key] ?? 5) >= section.items.length
                                ? "View less"
                                : `View ${section.items.length - (sectionLimits[section.key] ?? 5)} more`}
                            </Button>
                            </div>
                            )}
                          </div>
                          </div>
                        </div>

                            </>
                          )}
                        </StickySectionBar>
                      </div>
                      </div>
                    ))}
                    <DragOverlay>
                      {activeDragTask ? (
                        <div className="flex cursor-grabbing items-center gap-6 rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-xl">
                          <img src="/icons/drag.svg" alt="" className="h-3 w-2" />
                          <Checkbox />
                          <span className="flex-1 truncate text-sm text-gray-600">
                            {activeDragTask.name}
                          </span>
                          <Avatar size="sm">
                            <AvatarImage src={activeDragTask.avatar} alt={activeDragTask.assignee} />
                            <AvatarFallback>{activeDragTask.assignee[0]}</AvatarFallback>
                          </Avatar>
                          <Badge
                            className={`${taskStatusStyles[activeDragTask.status].bg} ${
                              taskStatusStyles[activeDragTask.status].text
                            } border-0`}
                          >
                            {activeDragTask.status}
                          </Badge>
                          <span className="whitespace-nowrap text-sm text-gray-600">
                            {activeDragTask.dueDate}
                          </span>
                        </div>
                      ) : null}
                    </DragOverlay>
                    </DndContext>
                  </div>
                </TabsContent>
                <TabsContent value="chat">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg overflow-hidden flex flex-col" style={{ height: "700px" }}>
                    {/* Header - matches inbox chats-comp header */}
                    <div className="px-8 shrink-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10">
                      <div className="inline-flex items-center gap-x-3">
                        <Avatar className="size-[43px]" size="md" isOnline>
                          <AvatarImage src="/group-default.png" alt="Project Group" />
                          <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-y-1">
                          <div className="inline-flex items-center gap-x-1.5">
                            <span className="text-lg font-semibold text-dark-blue-400">Project Group Chat</span>
                          </div>
                          <div className="inline-flex items-center gap-x-2">
                            <span className="text-sm text-dark-blue-400">3 active now</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-1">
                        <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                          <SearchMd className="size-[22px]" />
                        </IconButton>
                        <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                          <MoreHorizontal className="size-[22px]" />
                        </IconButton>
                      </div>
                    </div>

                    {/* Message list - matches inbox ScrollArea + bubble structure */}
                    <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
                      <div className="p-8 grid gap-y-6">
                        {/* Date separator */}
                        <div className="flex items-center gap-x-3 py-1" role="separator">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="text-[11px] font-medium text-gray-500 shrink-0">Today</span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>

                        {/* YourBubble - received message (left aligned with avatar) */}
                        {[
                          { sender: sampleMembers[1], text: "Hey team, I just pushed the latest designs for the dashboard. Can everyone take a look?", time: "09:30 AM" },
                          { sender: sampleMembers[2], text: "I finished the API integration for the user profiles. Ready for review.", time: "10:15 AM" },
                        ].map((msg, i) => (
                          <div key={`them-${i}`} className="flex justify-start rounded-lg">
                            <article className="flex items-end gap-x-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[680px]">
                              <Avatar size="md" className="hover:ring-0 active:ring-primary-100 shrink-0" isOnline>
                                <AvatarImage src={msg.sender.avatar} alt={msg.sender.name} />
                                <AvatarFallback>{msg.sender.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col items-start gap-y-2 min-w-0 flex-1">
                                <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                                  <div className="flex items-end justify-between">
                                    <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                      {msg.sender.name}{" "}
                                      <span className="text-xs leading-[14.52px] font-normal">{msg.sender.username}</span>
                                    </h3>
                                  </div>
                                  <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                    {msg.text}
                                  </span>
                                </div>
                                <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                                  Sent <span className="font-bold">{msg.time}</span>
                                </span>
                              </div>
                            </article>
                          </div>
                        ))}

                        {/* Bubble - sent message (right aligned, no avatar) */}
                        <div className="flex justify-end rounded-lg">
                          <article className="flex flex-col items-start gap-y-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[640px]">
                            <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                              <div className="flex items-end justify-between">
                                <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                  Me{" "}
                                  <span className="text-xs leading-[14.52px] font-normal">@uxdesignpro22</span>
                                </h3>
                              </div>
                              <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                Looks great! I have a few notes on the sidebar navigation. Will share feedback shortly.
                              </span>
                            </div>
                            <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                              Seen <span className="font-bold">09:45 AM</span>
                            </span>
                          </article>
                        </div>

                        {/* Another received message */}
                        <div className="flex justify-start rounded-lg">
                          <article className="flex items-end gap-x-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[680px]">
                            <Avatar size="md" className="hover:ring-0 active:ring-primary-100 shrink-0" isOnline>
                              <AvatarImage src={sampleMembers[3].avatar} alt={sampleMembers[3].name} />
                              <AvatarFallback>{sampleMembers[3].name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start gap-y-2 min-w-0 flex-1">
                              <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                                <div className="flex items-end justify-between">
                                  <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                    {sampleMembers[3].name}{" "}
                                    <span className="text-xs leading-[14.52px] font-normal">{sampleMembers[3].username}</span>
                                  </h3>
                                </div>
                                <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                  Sounds good. I&apos;ll have the test cases ready by then. Let&apos;s sync up this afternoon to go over everything before the sprint review.
                                </span>
                              </div>
                              <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                                Sent <span className="font-bold">11:00 AM</span>
                              </span>
                            </div>
                          </article>
                        </div>

                        {/* Another sent message */}
                        <div className="flex justify-end rounded-lg">
                          <article className="flex flex-col items-start gap-y-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[640px]">
                            <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
                              <div className="flex items-end justify-between">
                                <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
                                  Me{" "}
                                  <span className="text-xs leading-[14.52px] font-normal">@uxdesignpro22</span>
                                </h3>
                              </div>
                              <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
                                Perfect. Let&apos;s sync up this afternoon to go over everything before the sprint review.
                              </span>
                            </div>
                            <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
                              Sent <span className="font-bold">10:30 AM</span>
                            </span>
                          </article>
                        </div>
                      </div>
                    </div>

                    {/* Composer - matches inbox composer */}
                    <div className="bg-white shrink-0 border-t border-gray-200">
                      <div className="p-3 flex min-h-[68px] items-end gap-x-3">
                        <div className="flex items-center gap-x-1">
                          <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                            <Plus className="size-[22px]" />
                          </IconButton>
                          <IconButton visual="gray" variant="ghost" size="lg" className="rounded-full">
                            <Paperclip className="size-[22px]" />
                          </IconButton>
                        </div>
                        <InputGroup className="flex-auto">
                          <Input placeholder="Send message..." className="h-9 pr-11" />
                        </InputGroup>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="scope">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-dark-blue-400">Project Scope</h2>
                      <Button variant="outlined" visual="gray" size="sm">
                        <Plus className="size-[15px]" />
                        Add Phase
                      </Button>
                    </div>

                    <Accordion type="multiple" defaultValue={["phase-0", "phase-1"]}>
                      {[
                        {
                          name: "Discovery & Planning",
                          tasks: [
                            { task: "Stakeholder interviews", role: "UX Researcher", location: "Remote", experience: "Senior", duration: "1 week" },
                            { task: "Competitive analysis", role: "Product Designer", location: "Remote", experience: "Mid", duration: "3 days" },
                            { task: "Requirements documentation", role: "Business Analyst", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                        {
                          name: "Design & Prototyping",
                          tasks: [
                            { task: "Wireframe creation", role: "UX Designer", location: "Remote", experience: "Senior", duration: "2 weeks" },
                            { task: "High-fidelity mockups", role: "UI Designer", location: "Remote", experience: "Senior", duration: "2 weeks" },
                            { task: "Interactive prototype", role: "UI Designer", location: "Remote", experience: "Mid", duration: "1 week" },
                            { task: "Design system setup", role: "UI Designer", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                        {
                          name: "Development",
                          tasks: [
                            { task: "Frontend architecture", role: "Frontend Developer", location: "Remote", experience: "Senior", duration: "1 week" },
                            { task: "Backend API development", role: "Backend Developer", location: "Remote", experience: "Senior", duration: "3 weeks" },
                            { task: "Database schema design", role: "Backend Developer", location: "Remote", experience: "Senior", duration: "1 week" },
                          ],
                        },
                      ].map((phase, index) => (
                        <AccordionItem key={index} value={`phase-${index}`} asChild>
                          <div className="rounded-lg border border-gray-200 shadow-sm mb-4">
                            <div className="mb-3 flex items-center justify-between px-3 pt-3">
                              <div className="inline-flex items-center gap-x-3.5 min-w-0">
                                <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                  <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                                </AccordionTrigger>
                                <span className="text-base font-semibold leading-7 text-gray-900">
                                  Phase {index + 1}{" "}
                                  <span className="font-light">{phase.name}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge visual="gray" className="rounded-full">{phase.tasks.length} tasks</Badge>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <MoreHorizontal className="size-4" />
                                </IconButton>
                                <IconButton variant="ghost" visual="gray" size="sm">
                                  <Plus className="size-4" />
                                </IconButton>
                              </div>
                            </div>
                            <DisclosureContent className="overflow-auto">
                              <Table>
                                <TableHeader className="[&_tr]:border-t-0">
                                  <TableRow>
                                    <TableHead className="py-3 px-6">Task</TableHead>
                                    <TableHead className="py-3 px-6">Role</TableHead>
                                    <TableHead className="py-3 px-6">Location</TableHead>
                                    <TableHead className="py-3 px-6">Experience</TableHead>
                                    <TableHead className="py-3 px-6">Duration</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {phase.tasks.map((t, ti) => (
                                    <TableRow key={ti}>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.task}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.role}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.location}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.experience}</TableCell>
                                      <TableCell className="py-4 px-6 text-sm text-gray-600">{t.duration}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </DisclosureContent>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </TabsContent>

                <TabsContent value="team">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    {/* Project Owner */}
                    <div>
                      <span className="text-sm font-semibold text-dark-blue-400">Project Owner</span>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <Avatar size="md">
                            <AvatarImage src="/man.jpg" alt="Chris" />
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-sm font-bold text-dark-blue-400">Chris</span>
                            <span className="text-sm font-light text-gray-500"> @uxdesignpro22</span>
                            <p className="text-xs font-light text-dark-blue-400">Project Owner</p>
                          </div>
                        </div>
                        <Badge visual="primary" className="rounded-[4px] bg-primary-50">Account Manager</Badge>
                      </div>
                    </div>

                    {/* Assign Project Lead & Select Label */}
                    <div className="mt-8 grid grid-cols-2 gap-x-6">
                      <div>
                        <span className="text-sm font-semibold text-dark-blue-400">Assign Project Lead</span>
                        <div className="mt-2">
                          <InputGroup>
                            <Input className="h-[44px]" placeholder="Search team members" />
                            <InputLeftElement>
                              <SearchMd className="text-gray-500 h-4 w-4" />
                            </InputLeftElement>
                          </InputGroup>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-dark-blue-400">Select label</span>
                        <div className="mt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outlined"
                                visual="gray"
                                className="inline-flex h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm hover:border-gray-300 focus-visible:outline-none"
                              >
                                <span className="text-gray-500">None selected</span>
                                <ChevronDown className="size-4 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}>
                              {["Account Manager", "Project Manager", "Client Relations Manager", "Team Manager"].map((l) => (
                                <DropdownMenuItem key={l}>{l}</DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>Use Profile Job Title</DropdownMenuItem>
                              <DropdownMenuItem>Create Custom Label</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="mt-10">
                      <div className="flex items-start justify-between">
                        <h2 className="text-xl leading-[30px] font-semibold text-dark-blue-400">Team Members</h2>
                        <Button variant="outlined" visual="gray">
                          <Plus className="size-[15px]" />
                          Add Team Member
                        </Button>
                      </div>

                      <div className="mt-4">
                        <h3 className="text-sm font-semibold text-dark-blue-400">All assignees ({sampleMembers.length})</h3>
                        <p className="mt-1 text-xs font-light text-dark-blue-400">
                          View and manage all users currently assigned to this project below.
                        </p>
                      </div>

                      <div className="mt-4">
                        <span className="text-sm font-semibold text-dark-blue-400">Add team members to this project</span>
                        <InputGroup className="mt-2">
                          <Input placeholder="Add users to this project" />
                          <InputLeftElement>
                            <SearchMd className="text-gray-500 h-4 w-4" />
                          </InputLeftElement>
                        </InputGroup>
                      </div>

                      <div className="mt-6">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs font-medium text-gray-500">Name</TableHead>
                              <TableHead className="text-xs font-medium text-gray-500">Project Role</TableHead>
                              <TableHead className="text-xs font-medium text-gray-500">Status</TableHead>
                              <TableHead className="w-[40px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sampleMembers.map((member, mi) => {
                              const isOwner = mi === 0
                              const role = isOwner ? "Owner" : mi % 3 === 0 ? "Manager" : mi % 3 === 1 ? "Contributor" : "Viewer"
                              return (
                                <TableRow key={mi}>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-x-3">
                                      <Avatar size="sm">
                                        <AvatarImage src={member.avatar} alt={member.name} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <span className="text-sm font-semibold text-dark-blue-400">{member.name}</span>
                                        <span className="text-sm font-light text-gray-500"> {member.username}</span>
                                        {mi === 0 && <span className="text-sm font-semibold text-dark-blue-400"> (You)</span>}
                                        <p className="text-xs font-light text-dark-blue-400">{member.role}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {isOwner ? (
                                      <div className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                                        Owner
                                        <ChevronDown className="size-4 opacity-50" />
                                      </div>
                                    ) : (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="outlined"
                                            visual="gray"
                                            className="inline-flex h-[36px] w-[150px] items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-dark-blue-400 hover:border-gray-300 focus-visible:outline-none"
                                          >
                                            {role}
                                            <ChevronDown className="size-4 text-gray-500" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-[288px]">
                                          {["Manager", "Contributor", "Viewer"].map((r) => (
                                            <DropdownMenuItem key={r} className="flex flex-col items-start gap-0.5 py-2">
                                              <span className="flex items-center gap-x-2 text-sm font-semibold text-dark-blue-400">
                                                {role === r ? <Check className="size-4 text-primary-500" /> : <span className="size-4" />}
                                                {r}
                                              </span>
                                              <span className="pl-6 text-xs font-light text-gray-500">
                                                This is where the role&apos;s permissions and limitations are briefly explained.
                                              </span>
                                            </DropdownMenuItem>
                                          ))}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                            <XCircle className="size-4" />
                                            Remove from project
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <span className="text-sm font-semibold text-success-500">Active</span>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <IconButton variant="ghost" visual="gray" size="sm">
                                          <MoreHorizontal className="size-4" />
                                        </IconButton>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-[200px]">
                                        <DropdownMenuItem>Manage User</DropdownMenuItem>
                                        <DropdownMenuItem>Assign Team Lead</DropdownMenuItem>
                                        <DropdownMenuItem>Transfer Ownership</DropdownMenuItem>
                                        {!isOwner && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                              <XCircle className="size-4" />
                                              Remove from project
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="files">
                  <div className="mt-6 bg-white border border-gray-200 shadow-xs rounded-lg p-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<UploadCloud className="size-[15px]" />}>
                          Upload
                        </Button>
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<Plus className="size-[15px]" />}>
                          New Folder
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <SearchMd className="size-4" />
                        </IconButton>
                        <Button variant="outlined" visual="gray" size="sm" leftIcon={<FilterLines className="size-[15px]" />}>
                          Filters
                        </Button>
                        <ToggleGroupRoot className="p-0 gap-x-0">
                          <ToggleGroupItem className="size-10 py-0 px-0 rounded-l-lg rounded-r-none" value="grid">
                            <Grid />
                          </ToggleGroupItem>
                          <ToggleGroupItem className="size-10 py-0 px-0 rounded-r-lg rounded-l-none" value="list">
                            <List />
                          </ToggleGroupItem>
                        </ToggleGroupRoot>
                        <IconButton variant="outlined" visual="gray" size="sm">
                          <Expand01 className="size-4" />
                        </IconButton>
                      </div>
                    </div>

                    {/* Folder pills */}
                    <div className="mt-6 flex items-center gap-4">
                      {[
                        { name: "Design Logo", count: 2 },
                        { name: "Research Best i...", count: 3 },
                        { name: "Build Informatio...", count: 3 },
                      ].map((folder) => (
                        <div key={folder.name} className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-300 h-16">
                          <div className="flex items-center justify-center size-10 bg-white rounded-[5px]">
                            <img src="/icons/folder.svg" alt="" className="w-9 h-8" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-medium text-gray-800 leading-5">{folder.name}</p>
                            <p className="text-xs text-gray-500 capitalize leading-5">{folder.count} Files</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-center px-6 py-5 bg-gray-100 border border-gray-200 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-300 h-16">
                        <span className="text-sm font-medium text-gray-800 text-center">+ 3</span>
                      </div>
                    </div>

                    {/* File cards grid */}
                    <div className="mt-6 grid grid-cols-3 gap-5">
                      {[
                        { name: "Software Desi... .pdf", task: "Design Logo", author: "Chris", time: "just now", type: "pdf" },
                        { name: "Value Proposit... .pdf", task: "Define project goals", author: "Chris", time: "1 hour ago", type: "pdf" },
                        { name: "Product Design.png", task: "Create sitemap", author: "Chris", time: "Yesterday at 8:04 am", type: "image" },
                      ].map((file, fi) => (
                        <div key={fi} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors duration-300">
                          {/* Preview area */}
                          <div className="relative h-[180px] bg-gray-50 flex items-center justify-center">
                            <Checkbox className="absolute top-3 left-3" />
                            {file.type === "image" ? (
                              <img src="/man.jpg" alt={file.name} className="size-full object-cover" />
                            ) : (
                              <File02 className="size-12 text-gray-300" />
                            )}
                          </div>
                          {/* File info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-dark-blue-400 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{file.task}</p>
                                <p className="text-xs text-gray-400 mt-1">{file.author} · {file.time}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton variant="ghost" visual="gray" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Download</DropdownMenuItem>
                                  <DropdownMenuItem>Rename</DropdownMenuItem>
                                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                    <Trash01 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                      {[
                        { name: "Wireframes_v2.pdf", task: "Design wireframes", author: "Chris", time: "2 days ago", type: "pdf" },
                        { name: "Sprint_Report.pdf", task: "Weekly report", author: "Chris", time: "3 days ago", type: "pdf" },
                        { name: "User_Flow.pdf", task: "Map user flows", author: "Chris", time: "4 days ago", type: "pdf" },
                      ].map((file, fi) => (
                        <div key={`row2-${fi}`} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors duration-300">
                          <div className="relative h-[180px] bg-gray-50 flex items-center justify-center">
                            <Checkbox className="absolute top-3 left-3" />
                            <File02 className="size-12 text-gray-300" />
                          </div>
                          <div className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-dark-blue-400 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{file.task}</p>
                                <p className="text-xs text-gray-400 mt-1">{file.author} · {file.time}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton variant="ghost" visual="gray" size="sm">
                                    <MoreHorizontal className="size-4" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Download</DropdownMenuItem>
                                  <DropdownMenuItem>Rename</DropdownMenuItem>
                                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-error-600 focus:text-error-600">
                                    <Trash01 className="size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="contract">
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg">
                    {/* Project Summary */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Project Summary</h2>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-light text-gray-400">Project Status</span>
                          <span className="px-2 py-0.5 text-xs font-medium text-success-500 bg-success-50 rounded-full">Active</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Project Team</p>
                          <AvatarGroup size="md" max={5} excess excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white !size-11">
                            {sampleMembers.slice(0, 6).map((m, i) => (
                              <Avatar key={i} size="md" className="hover:ring-0 active:ring-0 !size-11">
                                <AvatarImage src={m.avatar} alt={m.name} />
                                <AvatarFallback>{m.name[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Client</p>
                          <Avatar size="md" className="hover:ring-0 active:ring-0 !size-11">
                            <AvatarImage src="/man.jpg" alt="Client" />
                            <AvatarFallback>C</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Order Number</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">12345678</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Project Type</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Web App</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-1">Start Date <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Feb 5th, 2025</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-1">End Date <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Sep 4th, 2025</p>
                          </div>
                        </div>
                      </div>

                      <div className="border border-gray-300 rounded-lg p-[15px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]"><span>Project Duration</span> <span className="font-bold text-dark-blue-400">4 months, 6 days</span></p>
                          <p className="text-xs font-medium text-gray-400 leading-[160%] text-right"><span>Remaining</span> <span className="font-bold text-dark-blue-400">1 month, 6 days</span></p>
                        </div>
                        <div className="h-2 bg-gray-300 rounded opacity-80 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded" style={{ width: "75%" }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-400 leading-[160%]">Scope Summary</p>
                          <Button variant="link" visual="primary" className="h-auto p-0 text-[10px] font-semibold text-primary-500 capitalize" onClick={() => setActiveTab("scope")}>View Scope</Button>
                        </div>
                        <p className="text-sm text-gray-500 leading-6">
                          Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae pellen metus bibebibe
                          Quisque faucibus ex sapien dolor sit amet. Duis aute irure dolor in reprehenderit in voluptate velit esse cillvelit a
                          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deseru...
                        </p>
                        <Button variant="link" visual="gray" className="h-auto p-0 text-xs font-semibold text-gray-500">Read More</Button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Client Payment */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Client Payment</h2>
                        <span className="px-2 py-0.5 text-xs font-medium text-warning-700 bg-warning-50 rounded-full">Pending</span>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-[26px]">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Payment Type</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Installment Plan - $4,000 per week</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Total Project Value</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$94,000</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-[26px]">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Payments to Date</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$74,000</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Remaining Balance</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$12,000</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Time & Earnings */}
                    <div className="p-6 space-y-8">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-dark-blue-400 leading-6">Time & Earnings</h2>
                        <Link href="/earnings">
                          <span className="text-[10px] font-semibold text-primary-500 capitalize">View Earnings History</span>
                        </Link>
                      </div>

                      <div className="space-y-[26px]">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%]">Your Hours Tracked</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">12h 45m</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-5">Your Earnings to Date</p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">$45,000</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-0.5">Overtime <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Not allowed</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-400 leading-[160%] flex items-center gap-0.5">Manual Time <HelpCircle className="size-3 text-gray-400" /></p>
                            <p className="text-base font-bold text-dark-blue-400 leading-5">Not allowed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200" />

                    {/* Footer */}
                    <div className="p-6 flex justify-center">
                      <p className="text-xs text-gray-400 leading-[160%] text-center">
                        This contract is governed by Marketeq's{" "}
                        <span className="text-primary-500 cursor-pointer">Terms of Service</span>,{" "}
                        <span className="text-primary-500 cursor-pointer">Privacy Policy</span>,{" "}
                        <span className="text-primary-500 cursor-pointer">Dispute Policy</span>, and{" "}
                        <span className="text-primary-500 cursor-pointer">Work Protection Guidelines</span>.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity">
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-dark-blue-400">Activity</h2>
                      <IconButton variant="ghost" visual="gray" size="sm">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </div>
                    <div className="relative space-y-0">
                      <div className="absolute left-4 top-10 bottom-4 w-px bg-gray-200" />
                      {activityItems.map((item, i) => {
                        const Icon = item.icon
                        return (
                          <div key={i} className="flex items-start gap-3 relative py-2.5">
                            {item.isAvatar ? (
                              <Avatar size="sm" className="hover:ring-0 active:ring-0 flex-none mt-0.5 z-10 !size-8">
                                <AvatarImage src="/man.jpg" alt={item.title} />
                                <AvatarFallback>{item.title[0]}</AvatarFallback>
                              </Avatar>
                            ) : Icon ? (
                              <div className={`flex items-center justify-center size-8 rounded-full flex-none mt-0.5 z-10 ${activityCategoryStyles[item.category]?.bg || "bg-gray-100"}`}>
                                <Icon className={`size-4 ${activityCategoryStyles[item.category]?.icon || "text-gray-500"}`} />
                              </div>
                            ) : (
                              <div className="size-8 flex-none" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-dark-blue-400">{item.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                              {item.title === "Amir Khan" && (
                                <div className="mt-2">
                                  <p className="text-sm text-gray-600 leading-relaxed">
                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
                                    magna aliqua.
                                  </p>
                                  <div className="flex items-center gap-3 mt-3 px-3 py-2 border border-gray-200 rounded-lg">
                                    <File06 className="size-5 text-gray-400" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-dark-blue-400">Marketeq Sanity Nextjs</p>
                                      <p className="text-xs text-gray-400">53.27 kB  pdf</p>
                                    </div>
                                    <IconButton variant="ghost" visual="gray" size="sm">
                                      <MoreHorizontal className="size-4" />
                                    </IconButton>
                                  </div>
                                </div>
                              )}
                              {item.title === "4 project members joined" && (
                                <div className="flex items-center gap-1 mt-2">
                                  {[1, 2, 3].map((j) => (
                                    <Avatar key={j} size="sm" className="hover:ring-0 active:ring-0">
                                      <AvatarImage src="/man.jpg" alt="member" />
                                      <AvatarFallback>M</AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar */}
            <div className="w-[335px] flex-none space-y-5">
              {/* Account Manager */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-start gap-3">
                  <Avatar size="2xl" className="hover:ring-0 active:ring-0 flex-none !size-16">
                    <AvatarImage src="/man.jpg" alt="Chris" />
                    <AvatarFallback>C</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="size-[10px] rounded-full bg-[#19BD1F] border-[1.3px] border-white" />
                      <span className="text-xs text-dark-blue-400">Online</span>
                    </div>
                    <p className="text-lg leading-[22px] text-dark-blue-400">
                      <span className="font-semibold">Chris</span> <span className="font-normal">@uxdesignpro22</span>
                    </p>
                    <p className="text-sm font-medium text-dark-blue-400">Account Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outlined" visual="gray" size="sm" className="justify-center rounded-[5px]" leftIcon={<Mail className="size-[15px]" />}>
                    Message
                  </Button>
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1 justify-center rounded-[5px]" leftIcon={<Phone className="size-[15px]" />}>
                    Schedule Call
                  </Button>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-primary-25 border border-primary-500 rounded-[5px]">
                  <span className="text-[10px] font-medium text-primary-500">Your next meeting is on</span>
                  <span className="text-[10px] font-bold text-primary-500">July 2nd @ 2:30 pm</span>
                </div>
              </div>

              {/* Project Manager */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-start gap-3">
                  <Avatar size="2xl" className="hover:ring-0 active:ring-0 flex-none !size-16">
                    <AvatarImage src="/man.jpg" alt="Adam" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-1">
                      <span className="size-[10px] rounded-full bg-[#19BD1F] border-[1.3px] border-white" />
                      <span className="text-xs text-dark-blue-400">Online</span>
                    </div>
                    <p className="text-lg leading-[22px] text-dark-blue-400">
                      <span className="font-semibold">Adam</span> <span className="font-normal">@uxdesignpro22</span>
                    </p>
                    <p className="text-sm font-medium text-dark-blue-400">Project Manager</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outlined" visual="gray" size="sm" className="justify-center rounded-[5px]" leftIcon={<Mail className="size-[15px]" />}>
                    Message
                  </Button>
                  <Button variant="outlined" visual="gray" size="sm" className="flex-1 justify-center rounded-[5px]" leftIcon={<Phone className="size-[15px]" />}>
                    Schedule Call
                  </Button>
                </div>
              </div>

              {/* NDA */}
              <div className="bg-white border border-gray-200 rounded-lg py-5 px-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)] space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 rounded-full bg-primary-50 flex-none">
                    <Shield className="size-[18px] text-primary-500" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-dark-blue-400 leading-[30px]">Non-Disclosure Agreement</p>
                    <p className="text-xs text-gray-500">Upgrade with an NDA</p>
                  </div>
                </div>
                <Button variant="outlined" visual="gray" size="sm" className="w-full justify-center rounded-[5px]" leftIcon={<Plus className="size-[15px]" />}>
                  Add NDA
                </Button>
              </div>

              {/* Upcoming Meetings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex flex-col gap-3">
                  {/* Header row */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-6">
                      <h3 className="text-sm font-bold text-dark-blue-400 capitalize">Upcoming Meetings</h3>
                      <p className="text-xs font-semibold text-dark-blue-400 leading-[13px]">Internal</p>
                    </div>
                    <Button variant="outlined" visual="gray" size="sm" className="flex h-auto items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 rounded shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors">
                      <Plus className="size-3 text-dark-blue-400" />
                      <span className="text-xs font-semibold text-dark-blue-400">New</span>
                    </Button>
                  </div>

                  {/* Internal meetings */}
                  {sampleMeetings.filter((m) => m.type === "internal").map((meeting, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-[5px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col items-center justify-center w-20 h-12 bg-primary-25 border border-primary-500 rounded-md shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex-none relative overflow-visible">
                        <span className="text-xs font-bold text-primary-500 text-center leading-snug">{meeting.date}</span>
                        <span className="text-[10px] text-primary-500 text-center leading-snug">{meeting.day}</span>
                        <div className="absolute -left-[5px] -bottom-[5px] z-10 size-6 rounded-full border-2 border-white overflow-hidden">
                          <img src="/man.jpg" alt="organizer" className="size-full object-cover" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center -mt-0.5">
                        <p className="text-sm font-semibold text-dark-blue-400 capitalize leading-6">{meeting.title}</p>
                        <p className="text-xs text-dark-blue-400 leading-[13px]">{meeting.time}</p>
                      </div>
                    </div>
                  ))}

                  {/* Client label */}
                  <p className="text-xs font-semibold text-dark-blue-400 leading-[13px]">Client</p>

                  {/* Client meetings */}
                  {sampleMeetings.filter((m) => m.type === "client").map((meeting, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-[5px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)]">
                      <div className="flex flex-col items-center justify-center w-20 h-12 bg-primary-25 border border-primary-500 rounded-md shadow-[0px_1px_4px_rgba(0,0,0,0.03)] flex-none relative overflow-visible">
                        <span className="text-xs font-bold text-primary-500 text-center leading-snug">{meeting.date}</span>
                        <span className="text-[10px] text-primary-500 text-center leading-snug">{meeting.day}</span>
                        <div className="absolute -left-[5px] -bottom-[5px] z-10 size-6 rounded-full border-2 border-white overflow-hidden">
                          <img src="/man.jpg" alt="organizer" className="size-full object-cover" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center -mt-0.5">
                        <p className="text-sm font-semibold text-dark-blue-400 capitalize leading-6">{meeting.title}</p>
                        <p className="text-xs text-dark-blue-400 leading-[13px]">{meeting.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-dark-blue-400 mb-4">Support</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 cursor-pointer group rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center size-10 rounded-full bg-gray-50 group-hover:bg-primary-50 flex-none transition-colors">
                      <MessageSquare01 className="size-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-blue-400 group-hover:text-primary-500 transition-colors">Chat With Us</p>
                      <p className="text-xs text-gray-400">Chat with someone. We'll respond as soon as we can</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 flex-none group-hover:text-primary-500 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 cursor-pointer group rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center size-10 rounded-full bg-gray-50 group-hover:bg-primary-50 flex-none transition-colors">
                      <FileCheck02 className="size-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-dark-blue-400 group-hover:text-primary-500 transition-colors">Report</p>
                      <p className="text-xs text-gray-400">Chat with someone. We'll respond as soon as we can</p>
                    </div>
                    <ChevronRight className="size-4 text-gray-400 flex-none group-hover:text-primary-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Create Task Modal */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] p-0 gap-0 flex flex-col overflow-visible">
          <TooltipProvider delayDuration={300}>
          {/* Header — phase selector + close (pinned) */}
          <div className="flex items-center justify-between gap-4 px-6 py-5 shrink-0 bg-white rounded-t-lg z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="w-60 h-9 gap-2 rounded-[5px] shadow-xs justify-start"
                >
                  <Menu02 className="size-5 text-gray-500 shrink-0" />
                  <span className="flex-1 truncate text-left text-sm text-gray-800">
                    <span className="font-semibold">{phaseLabel}</span>{" "}
                    <span className="font-light leading-5">{phaseName}</span>
                  </span>
                  <ChevronDown className="size-[15px] text-gray-500 shrink-0 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuItem onClick={() => setTaskPhase("Phase 1 Research")}>Phase 1 Research</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTaskPhase("Phase 2 Design")}>Phase 2 Design</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTaskPhase("Phase 3 Front-End")}>Phase 3 Front-End</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTaskPhase("Phase 4 Back-End")}>Phase 4 Back-End</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Plus className="size-4 mr-2" />
                  Add new phase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogClose asChild>
              <IconButton size="md" variant="ghost" visual="gray" className="rounded-lg size-9 opacity-50 hover:opacity-100 transition-opacity">
                <X className="size-5 text-gray-500" />
              </IconButton>
            </DialogClose>
          </div>

          {/* Scrollable content */}
          <div
            ref={taskBodyRef}
            className="flex-1 overflow-y-auto px-6"
            onDragOver={(event) => {
              event.preventDefault()
              if (!taskDragOver) {
                setTaskDragOver(true)
                // bring the drop area into view as soon as a drag starts
                requestAnimationFrame(() => {
                  const body = taskBodyRef.current
                  if (body) {
                    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" })
                  }
                })
              }
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setTaskDragOver(false)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              setTaskDragOver(false)
              addTaskFiles(event.dataTransfer.files)
            }}
          >
          {/* Form fields */}
          <div className="space-y-5">
            {/* Task Name */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-600">Task Name</span>
              <Input
                placeholder="Enter task name..."
                className="h-11 rounded-[5px]"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </div>

            {/* Milestone (Optional) */}
            <div className="flex items-center gap-4">
              <div className="w-20 shrink-0 flex flex-col justify-center">
                <span className="text-sm font-medium text-gray-600">Milestone</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="w-[174px] h-9 justify-between rounded-[5px] shadow-xs"
                  >
                    <span className="text-sm font-semibold text-gray-800">{taskMilestone || "None"}</span>
                    <ChevronDown className="size-[15px] text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[174px] py-0">
                  <div className="max-h-48 overflow-y-auto scrollbar scrollbar-w-2 scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                  <DropdownMenuItem onClick={() => setTaskMilestone("None")}>None</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 1")}>Milestone 1</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 2")}>Milestone 2</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 3")}>Milestone 3</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 4")}>Milestone 4</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 5")}>Milestone 5</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 6")}>Milestone 6</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 7")}>Milestone 7</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 8")}>Milestone 8</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 9")}>Milestone 9</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 10")}>Milestone 10</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 11")}>Milestone 11</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskMilestone("Milestone 12")}>Milestone 12</DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="my-1">
                    <Plus className="size-4 mr-2" />
                    Add Milestone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status */}
            <div className="flex items-start gap-4">
              <div className="w-20 shrink-0">
                <span className="text-sm font-medium text-gray-600">Status</span>
              </div>
              <div className="flex items-start gap-3">
                <TaskStatusMenu value={taskStatus} onChange={setTaskStatus} />
                {taskStatus !== "Completed" && (
                <Button
                  variant="link"
                  visual="gray"
                  size="sm"
                  className="group h-9 gap-2 text-gray-500 transition-colors duration-300 hover:text-primary-500 hover:no-underline"
                  onClick={() => setTaskStatus("Completed")}
                >
                  <Check className="size-[15px] transition-colors duration-300 group-hover:text-primary-500" />
                  <span className="text-sm font-semibold transition-colors duration-300 group-hover:text-primary-500">
                    Mark complete
                  </span>
                </Button>
                )}
              </div>
            </div>

            {/* Due Date (Optional) */}
            <div className="flex items-center gap-4">
              <div className="w-20 shrink-0 flex flex-col justify-center">
                <span className="text-sm font-medium text-gray-600">Due Date</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <TaskDueDatePicker
                value={taskDueDate}
                onChange={(value) => {
                  setTaskDueDate(value)
                  setDueDateOpen(false)
                }}
                open={dueDateOpen}
                onOpenChange={setDueDateOpen}
              />
            </div>

            {/* Assigned to */}
            <div className="flex items-center gap-4">
              <div className="w-20 shrink-0">
                <span className="text-sm font-medium text-gray-600">Assigned to</span>
              </div>
              <AvatarRoot>
                {taskAssignees.length > 0 && (
                  <AvatarGroup size="sm" max={3} excess excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white">
                    {taskAssignees.map((member, idx) => (
                      <div key={idx} className="group/avatar relative inline-flex flex-none">
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span
                          role="button"
                          aria-label={`Remove ${member.name}`}
                          className="absolute -right-1 -top-1 z-10 hidden size-4 items-center justify-center rounded-full bg-gray-700 text-white transition-colors duration-300 hover:bg-gray-900 group-hover/avatar:flex"
                          onClick={() =>
                            setTaskAssignees(prev =>
                              prev.filter(a => a.username !== member.username)
                            )
                          }
                        >
                          <X className="size-2.5" />
                        </span>
                      </div>
                    ))}
                  </AvatarGroup>
                )}
                <AssigneePicker
                  selected={taskAssignees}
                  onSelectedChange={setTaskAssignees}
                  open={assigneePopoverOpen}
                  onOpenChange={setAssigneePopoverOpen}
                />
              </AvatarRoot>
            </div>

            {/* Description (Optional) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-gray-600">Description</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <Textarea
                placeholder="Enter a description"
                className="h-[92px] min-h-[92px] resize-none rounded-[5px]"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Checklist */}
          {showChecklist && (
            <div className="mt-4">
              <div className="mb-2 flex h-[22px] items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium leading-5 text-gray-600">Checklist</span>
                  <Badge>
                    {checklistItems.filter(i => i.checked).length}/{checklistItems.length}
                  </Badge>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      className="size-7 rounded-full text-gray-500 transition-colors duration-300 hover:bg-error-50 hover:text-error-500"
                      onClick={() => {
                        setKeepChecklistAttachments(false)
                        setDeleteChecklistOpen(true)
                      }}
                    >
                      <Trash01 className="size-[15px]" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>Delete checklist</TooltipContent>
                </Tooltip>
              </div>
              <div className="border border-gray-300 rounded-[7px] shadow-xs bg-white overflow-hidden">
                {checklistItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex h-[46px] items-stretch border-b border-gray-300 shadow-xs group/item transition-colors duration-300 ${
                      dragOverChecklistIdx === idx ? "" : "hover:bg-gray-50"
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setDragOverChecklistIdx(idx)
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDragOverChecklistIdx(null)
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setTaskDragOver(false)
                      setDragOverChecklistIdx(null)
                      const dropped = describeFiles(event.dataTransfer.files)
                      if (dropped.length > 0) {
                        setChecklistItems(prev =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, attachments: [...it.attachments, ...dropped] } : it
                          )
                        )
                      }
                    }}
                  >
                    {dragOverChecklistIdx === idx ? (
                      <div className="m-1 flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary-400 bg-primary-25 shadow-xs">
                        <UploadCloud className="size-4 text-primary-400" />
                        <span className="text-sm font-medium leading-5 text-primary-500">
                          Drop files to attach to this item
                        </span>
                      </div>
                    ) : (
                    <>
                    <div className="flex items-center pl-5 gap-[10px] shrink-0">
                      <Checkbox
                        size="sm"
                        variant="circular"
                        checked={item.checked}
                        onCheckedChange={(checked) => {
                          setChecklistItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: checked === true } : it))
                        }}
                      />
                    </div>
                    <div className="flex flex-1 items-center px-5">
                      <EditableRoot
                        className="w-full"
                        value={item.text}
                        edit={renamingChecklistIdx === idx}
                        activationMode="dblclick"
                        submitMode="both"
                        onEditChange={(details) =>
                          setRenamingChecklistIdx(details.edit ? idx : null)
                        }
                        onValueChange={(details) =>
                          setChecklistItems(prev =>
                            prev.map((it, i) => (i === idx ? { ...it, text: details.value } : it))
                          )
                        }
                      >
                        <EditableArea>
                          <EditableInput className="w-full bg-transparent text-xs font-normal leading-[17px] text-gray-600 shadow-none" />
                          <EditablePreview
                            className={`text-xs font-normal leading-[17px] ${
                              item.checked ? "line-through text-gray-400" : "text-gray-600"
                            }`}
                          />
                        </EditableArea>
                      </EditableRoot>
                    </div>
                    <div
                      className={`flex items-center justify-center gap-3.5 px-5 transition-opacity duration-300 ${
                        checklistMenuIdx === idx ||
                        checklistDateIdx === idx ||
                        dateConfirmIdx === idx ||
                        clipConfirmIdx === idx
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none group-hover/item:pointer-events-auto group-hover/item:opacity-100"
                      }`}
                    >
                      <Popover
                        open={checklistDateIdx === idx}
                        onOpenChange={(open) => setChecklistDateIdx(open ? idx : null)}
                      >
                        <Tooltip
                          open={dateTipIdx === idx || dateConfirmIdx === idx}
                          onOpenChange={(open) => setDateTipIdx(open ? idx : null)}
                        >
                        <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          {item.dueDate ? (
                            <Button
                              variant="outlined"
                              visual="gray"
                              size="sm"
                              className="group/date h-6 gap-1 rounded-md border-gray-300 bg-gray-100 px-2 text-gray-700 transition-colors duration-300 hover:border-gray-400 hover:bg-gray-200 hover:text-gray-900"
                            >
                              <Calendar className="size-3.5 text-gray-500 transition-colors duration-300 group-hover/date:text-gray-900" />
                              <span className="text-xs font-medium">{item.dueDate}</span>
                            </Button>
                          ) : (
                            <IconButton variant="ghost" visual="gray" size="sm" className="size-6 rounded-full p-0 text-gray-500 transition-colors duration-300 hover:bg-gray-200 hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900">
                              <Calendar className="size-3.5" />
                            </IconButton>
                          )}
                        </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          {dateConfirmIdx === idx ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Check className="size-3.5 text-success-500" />
                              Due date updated
                            </span>
                          ) : (
                            "Set due date"
                          )}
                        </TooltipContent>
                        </Tooltip>
                        <PopoverContent
                          align="end"
                          collisionPadding={16}
                          onMouseUp={(event) => {
                            const el = (event.target as HTMLElement).closest("button")
                            if (el) el.blur()
                          }}
                          onOpenAutoFocus={preventDefault}
                          className="w-[330px] overflow-hidden rounded-lg border border-gray-100 bg-white p-0 shadow-xl data-[state=closed]:hidden data-[state=closed]:animate-none"
                        >
                          <CalendarPicker
                            minValue={new Date()}
                            className="border-none shadow-none [&_[data-today]]:bg-transparent [&_[data-today]]:font-semibold [&_[data-today]]:text-primary-500 [&_[data-today][data-selected]]:bg-primary-500 [&_[data-today][data-selected]]:text-white"
                            onValueChange={(value: Date) => {
                              setChecklistItems(prev =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, dueDate: format(value, "LLL d") } : it
                                )
                              )
                              setChecklistDateIdx(null)
                              setDateConfirmIdx(idx)
                              // closing the popover returns focus to the trigger, which would
                              // pop its tooltip open during the confirmation window
                              requestAnimationFrame(() => {
                                const active = document.activeElement as HTMLElement | null
                                if (active) active.blur()
                              })
                              if (dateConfirmTimer.current) clearTimeout(dateConfirmTimer.current)
                              dateConfirmTimer.current = setTimeout(() => {
                                setDateConfirmIdx(null)
                                setDateTipIdx(null)
                              }, 2500)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="relative">
                        <Tooltip
                          open={clipTipIdx === idx || clipConfirmIdx === idx}
                          onOpenChange={(open) => setClipTipIdx(open ? idx : null)}
                        >
                        <TooltipTrigger asChild>
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className={`size-6 rounded-full p-0 transition-colors duration-300 hover:bg-gray-200 hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900 ${
                            item.attachments.length > 0
                              ? "border border-gray-300 bg-gray-100 text-gray-700 hover:border-gray-400 hover:bg-gray-200"
                              : "text-gray-500"
                          }`}
                          onClick={(event) => {
                            event.currentTarget.blur()
                            checklistFileTargetIdx.current = idx
                            checklistFileInputRef.current?.click()
                          }}
                        >
                          <Paperclip className="size-3.5" />
                        </IconButton>
                        </TooltipTrigger>
                        <TooltipContent>
                          {clipConfirmIdx === idx ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Check className="size-3.5 text-success-500" />
                              Attachment added
                            </span>
                          ) : (
                            "Attach file"
                          )}
                        </TooltipContent>
                        </Tooltip>
                        {item.attachments.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-gray-600 text-white text-[9px] flex items-center justify-center font-medium">{item.attachments.length}</span>
                        )}
                      </div>
                      <DropdownMenu
                        open={checklistMenuIdx === idx}
                        onOpenChange={(open) => setChecklistMenuIdx(open ? idx : null)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <IconButton variant="ghost" visual="gray" size="sm" className="size-6 rounded-full p-0 text-gray-500 transition-colors duration-300 hover:bg-gray-200 hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-gray-200 data-[state=open]:text-gray-900">
                                <MoreHorizontal className="size-3.5" />
                              </IconButton>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>More options</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={preventDefault}>
                          <DropdownMenuItem onClick={() => setRenamingChecklistIdx(idx)}>
                            <Edit03 className="h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Paperclip className="h-4 w-4" /> Attachments
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-[300px] space-y-3 p-3.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-semibold leading-7 text-gray-800">
                                    Attachments
                                  </span>
                                  <Badge>{item.attachments.length}</Badge>
                                </div>
                                <IconButton
                                  variant="ghost"
                                  visual="gray"
                                  size="sm"
                                  className="size-7 rounded-md p-0 text-gray-500 transition-colors duration-300 hover:text-gray-900"
                                  onClick={() => {
                                    checklistFileTargetIdx.current = idx
                                    checklistFileInputRef.current?.click()
                                  }}
                                >
                                  <Folder className="size-[15px]" />
                                </IconButton>
                              </div>
                              {item.attachments.map((file, fileIdx) => (
                                <div
                                  key={fileIdx}
                                  className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
                                >
                                  <div className="relative shrink-0">
                                    <File06 className="size-7 text-gray-400" />
                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-white px-0.5 text-[6px] font-bold text-error-500">
                                      PDF
                                    </span>
                                  </div>
                                  <p className="truncate text-sm font-medium text-gray-700">
                                    {file.name}
                                  </p>
                                </div>
                              ))}
                              <div
                                className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 px-3 py-5"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.preventDefault()
                                  const dropped = describeFiles(event.dataTransfer.files)
                                  if (dropped.length > 0) {
                                    setChecklistItems(prev =>
                                      prev.map((it, i) =>
                                        i === idx
                                          ? { ...it, attachments: [...it.attachments, ...dropped] }
                                          : it
                                      )
                                    )
                                  }
                                }}
                              >
                                <span className="flex size-10 items-center justify-center rounded-full bg-gray-50">
                                  <UploadCloud className="size-5 text-gray-500" />
                                </span>
                                <p className="text-sm text-gray-500">
                                  Drop files or{" "}
                                  <Button
                                    variant="link"
                                    visual="primary"
                                    className="h-auto p-0 text-sm font-semibold"
                                    onClick={() => {
                                      checklistFileTargetIdx.current = idx
                                      checklistFileInputRef.current?.click()
                                    }}
                                  >
                                    Browse
                                  </Button>
                                </p>
                              </div>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {/* only offered once the parent task itself exists */}
                          {editingTask && (
                            <DropdownMenuItem
                              onClick={() => {
                                setConvertPhase(taskPhase)
                                setConvertAssignees([])
                                setConvertItemIdx(idx)
                              }}
                            >
                              <CornerRightUp className="h-4 w-4" /> Convert to task
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            visual="destructive"
                            onClick={() => {
                              // only confirm when the item carries a due date or files
                              if (item.dueDate || item.attachments.length > 0) {
                                setKeepChecklistAttachments(false)
                                setDeleteChecklistIdx(idx)
                              } else {
                                removeChecklistItem(idx, false)
                              }
                            }}
                          >
                            <Trash01 className="h-4 w-4" /> Delete item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </>
                    )}
                  </div>
                ))}
                <div ref={checklistEndRef} className="flex h-[46px] items-stretch rounded-md shadow-xs scroll-mb-4">
                  <div className="flex items-center pl-5 gap-[10px] shrink-0 opacity-50 pointer-events-none">
                    <Checkbox size="sm" variant="circular" />
                  </div>
                  <div className="flex flex-1 items-center px-5">
                    <input
                      className="w-full border-0 p-0 text-xs font-normal leading-[17px] text-gray-600 placeholder:text-gray-600 placeholder:opacity-50 bg-transparent outline-none focus:ring-0"
                      placeholder="Add new item"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newChecklistItem.trim()) {
                          setChecklistItems(prev => [...prev, { text: newChecklistItem.trim(), checked: false, dueDate: "", attachments: [] }])
                          setNewChecklistItem("")
                          revealChecklistEnd()
                        }
                      }}
                      onBlur={() => {
                        if (newChecklistItem.trim()) {
                          setChecklistItems(prev => [...prev, { text: newChecklistItem.trim(), checked: false, dueDate: "", attachments: [] }])
                          setNewChecklistItem("")
                          revealChecklistEnd()
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File attachments */}
          {(taskAttachments.length > 0 || showAttachments) && (
            <div className="mt-4">
              <div className="mb-2 flex h-[22px] items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium leading-5 text-gray-600">Attachments</span>
                  <Badge>{taskAttachments.length}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="size-7 rounded-full text-gray-500 transition-colors duration-300 hover:text-gray-900"
                      >
                        <Download01 className="size-[15px]" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Download all</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="size-7 rounded-full text-gray-500 transition-colors duration-300 hover:text-gray-900"
                        onClick={() => setAllAttachmentsOpen(true)}
                      >
                        <Folder className="size-[15px]" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>View files</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="size-7 rounded-full text-gray-500 transition-colors duration-300 hover:bg-error-50 hover:text-error-500"
                        onClick={() => setDeleteAllAttachmentsOpen(true)}
                      >
                        <Trash01 className="size-[15px]" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent>Remove all</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              {taskAttachments.length === 0 && !taskDragOver && (
                <Button
                  variant="outlined"
                  visual="gray"
                  className="h-auto w-full justify-center gap-2 rounded-md border-dashed py-6"
                  onClick={() => taskFileInputRef.current?.click()}
                >
                  <UploadCloud className="size-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-500">
                    Drop files here or browse
                  </span>
                </Button>
              )}
              <div className="grid grid-cols-2 gap-3">
                {taskAttachments.map((file, idx) => (
                  <div
                    key={idx}
                    className={`relative flex items-center gap-3 overflow-hidden rounded-lg border border-gray-200 px-3 py-2.5 ${
                      taskAttachments.length === 1 ? "col-span-2" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <File06 className="size-8 text-gray-400" />
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-white px-0.5 text-[6px] font-bold text-error-500">PDF</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="truncate whitespace-nowrap text-[10px] text-gray-500">{file.size} – {file.progress}% uploaded</p>
                    </div>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <IconButton variant="ghost" visual="gray" size="sm" className="size-8 rounded-full text-gray-400 transition-colors duration-300 hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900">
                              <MoreHorizontal className="size-4" />
                            </IconButton>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>More options</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          visual="destructive"
                          onClick={() => setDeleteAttachmentIdx(idx)}
                        >
                          <Trash01 className="h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {file.progress < 100 && (
                      <span
                        className="absolute bottom-0 left-0 h-1 rounded-full bg-primary-500"
                        style={{ width: `${file.progress}%` }}
                      />
                    )}
                  </div>
                ))}
                {taskDragOver && (
                  <div className="col-span-2 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary-400 bg-primary-25 py-6 shadow-xs">
                    <UploadCloud className="size-4 text-primary-400" />
                    <span className="text-sm font-medium leading-5 text-primary-500">
                      Drop files to attach to this task
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Drop area before any attachment exists */}
          {taskAttachments.length === 0 && taskDragOver && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary-400 bg-primary-25 py-6 shadow-xs">
              <UploadCloud className="size-4 text-primary-400" />
              <span className="text-sm font-medium leading-5 text-primary-500">
                Drop files to attach to this task
              </span>
            </div>
          )}

          {/* Hidden file input for checklist item attachments */}
          <input
            ref={checklistFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              const target = checklistFileTargetIdx.current
              if (files && files.length > 0 && target !== null) {
                setChecklistItems(prev =>
                  prev.map((it, i) =>
                    i === target
                      ? { ...it, attachments: [...it.attachments, ...describeFiles(files)] }
                      : it
                  )
                )
                setClipConfirmIdx(target)
                if (clipConfirmTimer.current) clearTimeout(clipConfirmTimer.current)
                clipConfirmTimer.current = setTimeout(() => {
                  setClipConfirmIdx(null)
                  setClipTipIdx(null)
                }, 2500)
              }
              checklistFileTargetIdx.current = null
              e.target.value = ""
            }}
          />

          {/* Hidden file input */}
          <input
            ref={taskFileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={(e) => {
              addTaskFiles(e.target.files)
              e.target.value = ""
            }}
          />

          </div>
          {/* Footer — subtask + attachment buttons + create (pinned) */}
          <div className="flex items-center justify-between gap-4 px-6 py-5 shrink-0 bg-white rounded-b-lg z-10">
            <div className="flex items-center gap-[9.36px] flex-1">
              {!showChecklist && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      variant="outlined"
                      visual="gray"
                      className="size-[33px] rounded-[5.85px] shadow-xs p-0"
                      onClick={() => setShowChecklist(true)}
                    >
                      <ListIcon className="size-[14px] text-gray-500" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent>Add checklist</TooltipContent>
                </Tooltip>
              )}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        variant="outlined"
                        visual="gray"
                        className="size-[33px] rounded-[5.85px] shadow-xs p-0"
                        onClick={() => setShowAttachments(true)}
                      >
                        <Attachment01 className="size-[14px] text-gray-500" />
                      </IconButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add attachment</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-[180px]">
                  <DropdownMenuItem onClick={() => taskFileInputRef.current?.click()}>
                    <Laptop01 className="size-4 mr-2 text-gray-500" />
                    Your computer
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <GoogleDrive1Brand className="size-4 mr-2" />
                    Google Drive
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DropboxBrand className="size-4 mr-2" />
                    Dropbox
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MsOnedriveBrand className="size-4 mr-2" />
                    OneDrive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button
              size="sm"
              disabled={!taskName.trim() || !taskDirty}
              className="h-9 rounded-[5px] px-4 text-xs font-semibold disabled:opacity-50"
              onClick={() => {
                if (!taskName.trim()) return
                const newTask = draftTask
                if (editingTask) {
                  const belongs = sectionForDueDate(newTask.dueDate)
                  if (belongs === editingTask.list) {
                    taskListSetter(editingTask.list)(prev =>
                      prev.map((t, i) => (i === editingTask.index ? newTask : t))
                    )
                  } else {
                    taskListSetter(editingTask.list)(prev =>
                      prev.filter((_, i) => i !== editingTask.index)
                    )
                    taskListSetter(belongs)(prev => [newTask, ...prev])
                  }
                  setEditingTask(null)
                  setCreateTaskOpen(false)
                  return
                }
                taskListSetter(sectionForDueDate(newTask.dueDate))(prev => [newTask, ...prev])
                setTaskName("")
                setTaskDescription("")
                setTaskDueDate(undefined)
                setTaskAssignees([])
                setTaskAttachments([])
                setChecklistItems([])
                setShowChecklist(false)
                setTaskStatus("Not Started")
                setTaskMilestone("None")
                setCreateTaskOpen(false)
              }}
            >
              {editingTask ? "Save" : "Add Task"}
            </Button>
          </div>
          </TooltipProvider>
        </DialogContent>
      </Dialog>

      {/* Delete checklist item confirmation */}
      <Dialog
        open={deleteChecklistIdx !== null}
        onOpenChange={(open) => !open && setDeleteChecklistIdx(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          {(() => {
            const item =
              deleteChecklistIdx !== null ? checklistItems[deleteChecklistIdx] : undefined
            const attachments = item ? item.attachments.length : 0
            return (
              <>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Delete checklist item?
                </DialogTitle>
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete “{item ? item.text : ""}”
                  {attachments > 0 ? ` and its ${attachments} attachments` : ""} from this
                  checklist.
                </p>
                {attachments > 0 && (
                  <div className="mt-5 flex gap-3">
                    <Checkbox
                      size="sm"
                      className="mt-0.5"
                      checked={keepChecklistAttachments}
                      onCheckedChange={(checked) =>
                        setKeepChecklistAttachments(checked === true)
                      }
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Keep Attachments</span>
                      <span className="text-xs text-gray-400">
                        Attachments will no longer be linked to this checklist item but will
                        remain available from the task.
                      </span>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    onClick={() => setDeleteChecklistIdx(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    visual="error"
                    onClick={() => {
                      if (deleteChecklistIdx !== null) {
                        removeChecklistItem(deleteChecklistIdx, keepChecklistAttachments)
                      }
                      setDeleteChecklistIdx(null)
                    }}
                  >
                    Delete Item
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
      {/* Delete whole checklist confirmation */}
      <Dialog open={deleteChecklistOpen} onOpenChange={setDeleteChecklistOpen}>
        <DialogContent className="sm:max-w-[400px]">
          {(() => {
            const attachments = checklistItems.reduce((sum, it) => sum + it.attachments.length, 0)
            return (
              <>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Delete checklist?
                </DialogTitle>
                <p className="mt-2 text-sm text-gray-500">
                  This will permanently delete this checklist and its {checklistItems.length}{" "}
                  {checklistItems.length === 1 ? "item" : "items"}
                  {attachments > 0
                    ? ` and ${attachments} ${attachments === 1 ? "attachment" : "attachments"}`
                    : ""}
                  .
                </p>
                {attachments > 0 && (
                  <div className="mt-5 flex gap-3">
                    <Checkbox
                      size="sm"
                      className="mt-0.5"
                      checked={keepChecklistAttachments}
                      onCheckedChange={(checked) => setKeepChecklistAttachments(checked === true)}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-700">Keep Attachments</span>
                      <span className="text-xs text-gray-400">
                        Attachments will no longer be linked to this checklist but will remain
                        available from the task.
                      </span>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    onClick={() => setDeleteChecklistOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    visual="error"
                    onClick={() => {
                      const removedItems = checklistItems
                      const kept = keepChecklistAttachments
                        ? checklistItems.flatMap(it => it.attachments)
                        : []
                      if (kept.length > 0) setTaskAttachments(prev => [...prev, ...kept])
                      setChecklistItems([])
                      setShowChecklist(false)
                      setDeleteChecklistOpen(false)
                      toast({
                        variant: "success",
                        title: "Checklist removed",
                        action: (
                          <ToastAction
                            altText="Undo"
                            className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                            onClick={() => {
                              setChecklistItems(removedItems)
                              setShowChecklist(true)
                              if (kept.length > 0) {
                                setTaskAttachments(prev => prev.slice(0, prev.length - kept.length))
                              }
                            }}
                          >
                            Undo
                          </ToastAction>
                        ),
                      })
                    }}
                  >
                    Delete Checklist
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
      {/* All task attachments */}
      <Dialog open={allAttachmentsOpen} onOpenChange={setAllAttachmentsOpen}>
        <DialogContent className="sm:max-w-[1096px] h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
          <TooltipProvider delayDuration={300}>
          {(() => {
            const checklistFiles = checklistItems.flatMap(it =>
              it.attachments.map(f => ({ file: f, source: it.text }))
            )
            const taskFiles = taskAttachments.map(f => ({ file: f, source: "" }))
            const query = attachmentSearch.trim().toLowerCase()
            const match = (entry: { file: TaskAttachment }) =>
              entry.file.name.toLowerCase().includes(query)
            const shownTask =
              getFirstItem(attachmentScope) === "checklist" ? [] : taskFiles.filter(match)
            const shownChecklist =
              getFirstItem(attachmentScope) === "task" ? [] : checklistFiles.filter(match)
            const total = taskFiles.length + checklistFiles.length

            const card = (
              entry: { file: TaskAttachment; source: string },
              key: React.Key
            ) => (
              <div
                key={key}
                className={`group/file flex flex-col items-start overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs transition-colors duration-300 hover:border-gray-300 hover:ring-1 hover:ring-gray-300 ${
                  getFirstItem(attachmentView) === "list"
                    ? "!flex-row w-full items-center gap-3 p-3"
                    : "h-[220px] w-[250px]"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center bg-gray-100 transition-colors duration-300 group-hover/file:bg-gray-200 ${
                    getFirstItem(attachmentView) === "list"
                      ? "size-10 shrink-0 rounded-md"
                      : `w-full flex-1 self-stretch rounded-t-lg overflow-hidden ${
                          entry.file.url ? "" : "py-[30px]"
                        }`
                  }`}
                >
                  {entry.file.url ? (
                    <img
                      src={entry.file.url}
                      alt={entry.file.name}
                      className={
                        getFirstItem(attachmentView) === "list"
                          ? "size-10 rounded-md object-cover"
                          : "size-full rounded-t-lg object-cover"
                      }
                    />
                  ) : getFirstItem(attachmentView) === "list" ? (
                    <File06 className="size-5 text-gray-400" />
                  ) : (
                    <img src="/icons/file-icon.svg" alt="" className="size-[78px]" />
                  )}
                  {getFirstItem(attachmentView) === "grid" && (
                    <div className="absolute right-[7.5px] top-2 hidden items-center gap-1.5 group-hover/file:flex">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <IconButton
                            variant="outlined"
                            visual="gray"
                            className="size-[35px] rounded-[5px] border-gray-300 bg-white p-0 shadow-xs"
                          >
                            <Download01 className="size-[15px] text-gray-500" />
                          </IconButton>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <IconButton
                            variant="outlined"
                            visual="gray"
                            className="size-[35px] rounded-[5px] border-gray-300 bg-white p-0 shadow-xs"
                          >
                            <Expand01 className="size-[15px] text-gray-500" />
                          </IconButton>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
                <div
                  className={
                    getFirstItem(attachmentView) === "list"
                      ? "min-w-0 flex-1"
                      : "flex w-full flex-col items-start gap-1.5 px-4 py-3"
                  }
                >
                  <div className="flex w-full items-start gap-8">
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <p className="w-full truncate text-base font-medium leading-[19px] text-gray-black">
                        {entry.file.name}
                      </p>
                      {entry.source && (
                        <span className="w-full truncate text-[10px] font-medium capitalize leading-4 text-gray-500">
                          {entry.source}
                        </span>
                      )}
                    </div>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="-m-1.5 size-8 shrink-0 rounded-full p-0 text-gray-600 transition-colors duration-300 hover:bg-gray-100 hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-gray-100"
                            >
                              <MoreHorizontal className="size-5" />
                            </IconButton>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>More options</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>
                          <Download01 className="h-4 w-4" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem visual="destructive">
                          <Trash01 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="w-full truncate text-xs font-medium leading-[18px] text-gray-500 opacity-50">
                    {entry.file.size}
                  </p>
                </div>
              </div>
            )

            return (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-4 pl-6 pr-4 pt-5">
                  <div className="flex min-w-0 flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-lg font-semibold leading-7 text-gray-800">
                        Task attachments
                      </DialogTitle>
                      <Badge>{total}</Badge>
                    </div>
                    <p className="truncate text-sm font-normal leading-5 text-gray-500">
                      {taskName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          className="size-9 rounded-[5px] p-0 shadow-xs"
                        >
                          <Download01 className="size-[15px] text-gray-500" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Download all</TooltipContent>
                    </Tooltip>
                    <Button
                      size="sm"
                      className="h-9 gap-2 rounded-[5px] px-3.5 text-sm font-semibold shadow-xs"
                      onClick={() => taskFileInputRef.current?.click()}
                    >
                      <UploadCloud className="size-[15px]" />
                      Upload
                    </Button>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <IconButton variant="ghost" visual="gray" size="sm" className="size-9 rounded-[5px] p-0">
                            <LinkExternal01 className="size-[18px] text-gray-500" />
                          </IconButton>
                        </TooltipTrigger>
                        <TooltipContent>Open in new tab</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogClose asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              size="sm"
                              className="size-9 rounded-[5px] p-0 opacity-50 transition-opacity duration-300 hover:opacity-100"
                            >
                              <X className="size-[18px] text-gray-500" />
                            </IconButton>
                          </DialogClose>
                        </TooltipTrigger>
                        <TooltipContent>Close</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Tabs / grid view container */}
                <div className="flex flex-1 flex-col items-start gap-3 overflow-hidden pt-4">
                <div className="flex w-full items-center gap-3 px-6">
                  <InputGroup className="w-[200px]">
                    <InputLeftElement>
                      <SearchMd className="size-4 text-gray-400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search for files"
                      className="h-10 pl-9"
                      value={attachmentSearch}
                      onChange={(e) => setAttachmentSearch(e.target.value)}
                    />
                  </InputGroup>
                  <ToggleGroupRoot
                    value={attachmentScope}
                    onValueChange={(details) => details.value.length > 0 && setAttachmentScope(details.value)}
                  >
                    <ToggleGroupItem value="all">All files</ToggleGroupItem>
                    <ToggleGroupItem value="task">Task files</ToggleGroupItem>
                    <ToggleGroupItem value="checklist">Checklist files</ToggleGroupItem>
                  </ToggleGroupRoot>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outlined" visual="gray" size="sm" className="h-10 gap-2">
                        Format
                        <ChevronDown className="size-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40">
                      <DropdownMenuItem>PDF</DropdownMenuItem>
                      <DropdownMenuItem>Images</DropdownMenuItem>
                      <DropdownMenuItem>Documents</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ToggleGroupRoot
                    className="ml-auto gap-x-0 p-0"
                    value={attachmentView}
                    onValueChange={(details) => details.value.length > 0 && setAttachmentView(details.value)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem className="size-10 rounded-l-lg rounded-r-none px-0 py-0" value="grid">
                          <Grid />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>Grid view</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ToggleGroupItem className="size-10 rounded-l-none rounded-r-lg px-0 py-0" value="list">
                          <List />
                        </ToggleGroupItem>
                      </TooltipTrigger>
                      <TooltipContent>List view</TooltipContent>
                    </Tooltip>
                  </ToggleGroupRoot>
                </div>

                {/* Files */}
                <div className="w-full flex-1 overflow-y-auto px-6 pb-6">
                  {getFirstItem(attachmentScope) !== "checklist" && shownTask.length > 0 && (
                    <>
                      <p className="mb-3 text-sm text-gray-500">Task files</p>
                      {(
                        <div
                          className={
                            getFirstItem(attachmentView) === "grid"
                              ? "flex flex-wrap gap-4"
                              : "flex flex-col gap-2"
                          }
                        >
                          {shownTask.map((entry, i) => card(entry, `task-${i}`))}
                        </div>
                      )}
                    </>
                  )}
                  {getFirstItem(attachmentScope) !== "task" && shownChecklist.length > 0 && (
                    <>
                      <p className="mb-3 mt-6 text-sm text-gray-500">Checklist files</p>
                      {(
                        <div
                          className={
                            getFirstItem(attachmentView) === "grid"
                              ? "flex flex-wrap gap-4"
                              : "flex flex-col gap-2"
                          }
                        >
                          {shownChecklist.map((entry, i) => card(entry, `check-${i}`))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                </div>
              </>
            )
          })()}
          </TooltipProvider>
        </DialogContent>
      </Dialog>

      {/* Convert checklist item to task */}
      <Dialog
        open={convertItemIdx !== null}
        onOpenChange={(open) => !open && setConvertItemIdx(null)}
      >
        <DialogContent className="sm:max-w-[454px]">
          {(() => {
            const source = convertItemIdx !== null ? checklistItems[convertItemIdx] : undefined
            const phaseHead = convertPhase.split(" ").slice(0, 2).join(" ")
            const phaseRest = convertPhase.split(" ").slice(2).join(" ")
            return (
              <>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  New task “{source ? source.text : ""}”
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500">Choose where to add the new task.</p>

                <div className="mt-6 flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm font-medium text-gray-600">
                    Scope Phase
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="h-9 w-60 gap-2 justify-start rounded-[5px] shadow-xs"
                      >
                        <Menu02 className="size-5 shrink-0 text-gray-500" />
                        <span className="flex-1 truncate text-left text-sm text-gray-800">
                          <span className="font-semibold">{phaseHead}</span>{" "}
                          <span className="font-light leading-5">{phaseRest}</span>
                        </span>
                        <ChevronDown className="size-[15px] shrink-0 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60">
                      {["Phase 1 Research", "Phase 2 Design", "Phase 3 Front-End", "Phase 4 Back-End"].map(
                        (phase) => (
                          <DropdownMenuItem key={phase} onClick={() => setConvertPhase(phase)}>
                            {phase}
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm font-medium text-gray-600">
                    Assigned to
                  </span>
                  <AvatarRoot>
                    {convertAssignees.length > 0 && (
                      <AvatarGroup
                        size="sm"
                        max={3}
                        excess
                        excessClassName="!border-gray-300 !text-gray-500 !text-xs !font-medium !bg-white"
                      >
                        {convertAssignees.map((member, i) => (
                          <Avatar
                            key={i}
                            size="sm"
                            className="border-2 border-white hover:ring-0 active:ring-0"
                          >
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </AvatarGroup>
                    )}
                    <AssigneePicker
                      selected={convertAssignees}
                      onSelectedChange={setConvertAssignees}
                      open={convertAssigneeOpen}
                      onOpenChange={setConvertAssigneeOpen}
                    />
                  </AvatarRoot>
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  <Button variant="outlined" visual="gray" onClick={() => setConvertItemIdx(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (convertItemIdx === null || !source || !editingTask) return
                      const list = editingTask.list
                      const assignee = convertAssignees[0]
                      const converted: Task = {
                        id: `task-${Date.now()}`,
                        name: source.text,
                        assignee: assignee ? assignee.name : "Unassigned",
                        avatar: assignee ? assignee.avatar : "/man.jpg",
                        status: "Not Started",
                        dueDate: source.dueDate,
                        description: "",
                        milestone: "None",
                        attachments: source.attachments,
                        checklist: [],
                      }
                      const removedIdx = convertItemIdx
                      taskListSetter(list)(prev => [...prev, converted])
                      setChecklistItems(prev => prev.filter((_, i) => i !== removedIdx))
                      setConvertItemIdx(null)
                      toast({
                        variant: "success",
                        title: "Checklist item converted to task",
                        action: (
                          <ToastAction
                            altText="View task"
                            className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                            onClick={() => {
                              const items = list === "this" ? thisWeekTasks : nextWeekTasks
                              openTask(converted, list, items.length)
                            }}
                          >
                            View task
                          </ToastAction>
                        ),
                      })
                    }}
                  >
                    Add Task
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete all attachments confirmation */}
      <Dialog open={deleteAllAttachmentsOpen} onOpenChange={setDeleteAllAttachmentsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Delete all attachments?
          </DialogTitle>
          <p className="mt-2 text-sm text-gray-500">
            This will permanently remove {taskAttachments.length}{" "}
            {taskAttachments.length === 1 ? "attachment" : "attachments"} from this task.
          </p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              variant="outlined"
              visual="gray"
              onClick={() => setDeleteAllAttachmentsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              visual="error"
              onClick={() => {
                const removed = taskAttachments
                setTaskAttachments([])
                setShowAttachments(false)
                setDeleteAllAttachmentsOpen(false)
                toast({
                  variant: "success",
                  title: "All attachments deleted",
                  action: (
                    <ToastAction
                      altText="Undo"
                      className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                      onClick={() => setTaskAttachments(removed)}
                    >
                      Undo
                    </ToastAction>
                  ),
                })
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete attachment confirmation */}
      <Dialog
        open={deleteAttachmentIdx !== null}
        onOpenChange={(open) => !open && setDeleteAttachmentIdx(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          {(() => {
            const file =
              deleteAttachmentIdx !== null ? taskAttachments[deleteAttachmentIdx] : undefined
            return (
              <>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  Delete this attachment?
                </DialogTitle>
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <File06 className="size-8 text-gray-400" />
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-white px-0.5 text-[6px] font-bold text-error-500">
                      PDF
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-700">
                      {file ? file.name : ""}
                    </p>
                    <p className="text-xs text-gray-500">{file ? file.size : ""}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    onClick={() => setDeleteAttachmentIdx(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    visual="error"
                    onClick={() => {
                      const removedIdx = deleteAttachmentIdx
                      const removed = file
                      setTaskAttachments(prev => prev.filter((_, i) => i !== removedIdx))
                      setDeleteAttachmentIdx(null)
                      toast({
                        variant: "success",
                        title: "Attachment deleted",
                        action: (
                          <ToastAction
                            altText="Undo"
                            className="ml-auto h-auto px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                            onClick={() => {
                              if (!removed || removedIdx === null) return
                              setTaskAttachments(prev => {
                                const next = [...prev]
                                next.splice(removedIdx, 0, removed)
                                return next
                              })
                            }}
                          >
                            Undo
                          </ToastAction>
                        ),
                      })
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

    </AuthenticatedRoute>
  )
}
