"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import {
  type ContractDTO,
  getContractsForClient,
  getContractsForTalent,
} from "@/service/http/contracts"
import {
  type ScreenshotCardDTO,
  type ScreenshotCardsParams,
  getScreenshotCards,
} from "@/service/http/screenshots"
import { cn } from "@/utils/functions"
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Droplet,
  Edit03,
  FilterLines,
  HelpCircle,
  Image01,
  Keyboard01,
  MoreHorizontal,
  Mouse,
  Plus,
  SearchSm,
  Settings02,
  SwitchVertical01,
  Trash01,
  X,
  ZoomIn,
} from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import {
  Avatar,
  AvatarFallback,
  Button,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownCommand,
  DropdownCommandEmpty,
  DropdownCommandGroup,
  DropdownCommandInput,
  DropdownCommandItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownPopover,
  DropdownPopoverContent,
  DropdownPopoverTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScaleOutIn,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  useToast,
} from "@/components/ui"

// ─── Types ──────────────────────────────────────────────────────────────

interface Screenshot {
  id: string
  time: string
  imageUrl: string
  activityLevel: number // 0-100 progress bar
  apps: string[] // app icon labels like "chrome", "slack", "github"
  isDuplicate?: boolean
  duplicateCount?: number
  isNoActivity?: boolean
  keyboardPct?: number
  mousePct?: number
}

type ProjectColor =
  | "mint"
  | "salmon"
  | "lavender"
  | "cyan"
  | "gold"
  | "yellow"
  | "pink"
  | "teal"
  | "sage"
  | "lime"

interface ProjectBlock {
  projectName: string
  projectColor: ProjectColor
  taskName: string
  screenshots: Screenshot[]
}

interface TimeBlock {
  id: string
  hour: string // "10 am", "11 am", etc.
  date: string // "May 2nd, 2025"
  totalTime: string // "0:20 hrs"
  isManualTime?: boolean
  manualDuration?: string // "0:23hr"
  projects: ProjectBlock[]
}

// ─── Color map for project bars (using design system project-* tokens) ──

const projectBarColors: Record<ProjectColor, string> = {
  mint: "bg-project-mint/40 border-project-mint",
  salmon: "bg-project-salmon/40 border-project-salmon",
  lavender: "bg-project-lavender/40 border-project-lavender",
  cyan: "bg-project-cyan/40 border-project-cyan",
  gold: "bg-project-gold/40 border-project-gold",
  yellow: "bg-project-yellow/40 border-project-yellow",
  pink: "bg-project-pink/40 border-project-pink",
  teal: "bg-project-teal/40 border-project-teal",
  sage: "bg-project-sage/40 border-project-sage",
  lime: "bg-project-lime/40 border-project-lime",
}

const projectLabelColors: Record<ProjectColor, string> = {
  mint: "text-dark-blue-400",
  salmon: "text-dark-blue-400",
  lavender: "text-dark-blue-400",
  cyan: "text-dark-blue-400",
  gold: "text-dark-blue-400",
  yellow: "text-dark-blue-400",
  pink: "text-dark-blue-400",
  teal: "text-dark-blue-400",
  sage: "text-dark-blue-400",
  lime: "text-dark-blue-400",
}

// ─── App icon components (small colored dots) ───────────────────────────

function AppIcons({ apps }: { apps: string[] }) {
  const colors: Record<string, string> = {
    chrome: "bg-success-500",
    slack: "bg-error-400",
    github: "bg-gray-700",
    vscode: "bg-primary-500",
    figma: "bg-purple-500",
    terminal: "bg-gray-500",
  }
  return (
    <div className="flex items-center gap-0.5">
      {apps.map((app, i) => (
        <div
          key={i}
          className={cn("size-3 rounded-full", colors[app] || "bg-gray-400")}
          title={app}
        />
      ))}
    </div>
  )
}

// ─── Sample data ────────────────────────────────────────────────────────

const sampleScreenshots: Screenshot[] = [
  {
    id: "s1",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 72,
    apps: ["chrome", "slack", "github"],
  },
  {
    id: "s2",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 85,
    apps: ["chrome", "slack", "github"],
  },
  {
    id: "s3",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 60,
    apps: ["chrome", "slack", "github"],
    isDuplicate: true,
    duplicateCount: 2,
  },
  {
    id: "s4",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 0,
    apps: [],
    isNoActivity: true,
  },
  {
    id: "s5",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 90,
    apps: ["chrome", "slack", "github"],
  },
  {
    id: "s6",
    time: "11:11 am",
    imageUrl: "",
    activityLevel: 45,
    apps: ["chrome", "slack", "github"],
    isDuplicate: true,
    duplicateCount: 2,
  },
]

const sampleTimeBlocks: TimeBlock[] = [
  {
    id: "tb1",
    hour: "10 am",
    date: "May 2nd, 2025",
    totalTime: "0:20 hrs",
    projects: [
      {
        projectName: "Project 1",
        projectColor: "mint",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots.slice(0, 3),
      },
      {
        projectName: "Project 2",
        projectColor: "mint",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots.slice(3, 6),
      },
    ],
  },
  {
    id: "tb2",
    hour: "11 am",
    date: "May 2nd, 2025",
    totalTime: "0:20 hrs",
    isManualTime: true,
    manualDuration: "0:23hr",
    projects: [
      {
        projectName: "Project 2",
        projectColor: "mint",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots,
      },
    ],
  },
  {
    id: "tb3",
    hour: "12 pm",
    date: "May 2nd, 2025",
    totalTime: "0:20 hrs",
    projects: [
      {
        projectName: "Project 2",
        projectColor: "cyan",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots,
      },
    ],
  },
  {
    id: "tb4",
    hour: "1 pm",
    date: "May 2nd, 2025",
    totalTime: "0:20 hrs",
    projects: [
      {
        projectName: "Project 3",
        projectColor: "gold",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots.slice(0, 3),
      },
      {
        projectName: "Project 4",
        projectColor: "gold",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots.slice(3, 6),
      },
    ],
  },
  {
    id: "tb5",
    hour: "2 pm",
    date: "May 2nd, 2025",
    totalTime: "0:20 hrs",
    isManualTime: true,
    manualDuration: "0:23hr",
    projects: [
      {
        projectName: "Project 4",
        projectColor: "mint",
        taskName: "Creating logo for X brand",
        screenshots: sampleScreenshots,
      },
    ],
  },
]

// ─── Transform backend data → frontend TimeBlock[] ─────────────────────

const PROJECT_COLORS: ProjectColor[] = [
  "mint",
  "salmon",
  "lavender",
  "cyan",
  "gold",
  "yellow",
  "pink",
  "teal",
  "sage",
  "lime",
]

function transformScreenshotsToTimeBlocks(
  cards: ScreenshotCardDTO[]
): TimeBlock[] {
  // Group by hour
  const hourMap = new Map<string, { date: Date; cards: ScreenshotCardDTO[] }>()

  for (const card of cards) {
    const ts = card.capturedAt
      ? new Date(card.capturedAt)
      : new Date(card.createdAt)
    // Key = date + hour for grouping
    const hourKey = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}-${ts.getHours()}`
    if (!hourMap.has(hourKey)) {
      hourMap.set(hourKey, { date: ts, cards: [] })
    }
    hourMap.get(hourKey)!.cards.push(card)
  }

  // Color assignment by contractId
  const projectColorMap = new Map<string, ProjectColor>()
  let colorIdx = 0

  const getProjectColor = (contractId: string | null): ProjectColor => {
    const key = contractId ?? "__none__"
    if (!projectColorMap.has(key)) {
      projectColorMap.set(key, PROJECT_COLORS[colorIdx % PROJECT_COLORS.length])
      colorIdx++
    }
    return projectColorMap.get(key)!
  }

  const blocks: TimeBlock[] = []

  for (const [, { date, cards: hourCards }] of hourMap) {
    const hour = date.getHours()
    const ampm = hour >= 12 ? "pm" : "am"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const hourLabel = `${displayHour} ${ampm}`

    const dateLabel = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

    // Group by contractId within this hour
    const projectMap = new Map<string, ScreenshotCardDTO[]>()
    for (const c of hourCards) {
      const pid = c.contractId ?? "__none__"
      if (!projectMap.has(pid)) projectMap.set(pid, [])
      projectMap.get(pid)!.push(c)
    }

    const projects: ProjectBlock[] = []
    for (const [pid, pCards] of projectMap) {
      const screenshots: Screenshot[] = pCards.map((c) => {
        const capturedDate = c.capturedAt
          ? new Date(c.capturedAt)
          : new Date(c.createdAt)
        const timeStr = capturedDate
          .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase()

        const activityLevel = Math.round((c.keyboardPct + c.mousePct) / 2)
        const apps = c.apps
          ? c.apps.map((a) => a.appName.toLowerCase().replace(/\s+/g, ""))
          : []

        return {
          id: c.id,
          time: timeStr,
          imageUrl: c.thumbnailUrl || "",
          activityLevel,
          apps,
          isNoActivity: activityLevel === 0 && (!c.apps || c.apps.length === 0),
          keyboardPct: c.keyboardPct,
          mousePct: c.mousePct,
        }
      })

      projects.push({
        projectName: pid === "__none__" ? "No Project" : `Project`,
        projectColor: getProjectColor(pid === "__none__" ? null : pid),
        taskName: pCards[0]?.taskId ?? "No task",
        screenshots,
      })
    }

    // Total seconds in this hour block (rough: count * 10min intervals)
    const totalMinutes = hourCards.length * 10
    const hrs = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const totalTime = `${hrs}:${mins.toString().padStart(2, "0")} hrs`

    blocks.push({
      id: `tb-${date.getTime()}-${hour}`,
      hour: hourLabel,
      date: dateLabel,
      totalTime,
      projects,
    })
  }

  // Sort blocks by time descending
  blocks.sort((a, b) => b.id.localeCompare(a.id))

  return blocks
}

// ─── Screenshot Thumbnail ───────────────────────────────────────────────

function ScreenshotThumbnail({
  screenshot,
  selected,
  onSelect,
}: {
  screenshot: Screenshot
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "flex-none w-[158px] p-1 rounded-xl transition-colors cursor-pointer",
        selected
          ? "bg-gray-100 border border-gray-200"
          : "border border-transparent"
      )}
      onClick={() => onSelect(screenshot.id)}
    >
      <div className="relative aspect-[16/10] rounded-lg overflow-hidden">
        {screenshot.isNoActivity ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs text-gray-400">No Activity</span>
          </div>
        ) : screenshot.imageUrl ? (
          <img
            src={screenshot.imageUrl}
            alt={`Screenshot at ${screenshot.time}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        {/* Duplicate badge */}
        {screenshot.isDuplicate && screenshot.duplicateCount && (
          <div className="absolute bottom-1.5 right-1.5 bg-gray-800/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
            {screenshot.duplicateCount}x
            <Image01 className="size-3" />
          </div>
        )}
      </div>
      {/* Activity bar */}
      {!screenshot.isNoActivity && (
        <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full"
            style={{ width: `${screenshot.activityLevel}%` }}
          />
        </div>
      )}
      {/* Timestamp + app icons */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-gray-400">{screenshot.time}</span>
        {screenshot.apps.length > 0 && <AppIcons apps={screenshot.apps} />}
      </div>
    </div>
  )
}

// ─── Project Bar ────────────────────────────────────────────────────────

function ProjectBar({ project }: { project: ProjectBlock }) {
  const [projectName, setProjectName] = useState(project.projectName)
  const [taskName, setTaskName] = useState(project.taskName)
  const [tasks, setTasks] = useState<string[]>(taskOptions)
  const selectedProject =
    projectOptions.find((option) => option.name === projectName) ??
    ({
      id: projectName,
      name: projectName,
      handle: "",
      avatarColor: "bg-gray-300",
      initial: projectName.charAt(0).toUpperCase(),
    } satisfies ProjectOption)

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md border",
        projectBarColors[project.projectColor]
      )}
    >
      <DropdownPopover
        selected={selectedProject}
        onSelectedChange={(option: ProjectOption | null) => {
          if (option) setProjectName(option.name)
        }}
      >
        <DropdownPopoverTrigger
          className={cn(
            "h-auto w-auto shrink-0 border-0 bg-transparent p-0 text-left shadow-none ring-0 hover:bg-transparent data-[state=open]:border-0 data-[state=open]:bg-transparent data-[state=open]:ring-0",
            projectLabelColors[project.projectColor]
          )}
        >
          <span className="inline-flex items-center gap-1 text-base font-semibold leading-6">
            <span>{projectName}</span>
            <ChevronDown className="mt-px size-3.5 shrink-0" />
          </span>
        </DropdownPopoverTrigger>
        <DropdownPopoverContent
          sideOffset={4}
          className="w-[448px] max-w-[calc(100vw-3rem)] rounded-xl border border-gray-100 p-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]"
        >
          <DropdownCommand>
            <InputGroup>
              <InputLeftElement className="w-8 text-gray-400">
                <SearchSm className="size-4" />
              </InputLeftElement>
              <DropdownCommandInput
                placeholder="Find contracts"
                className="pl-8"
              />
            </InputGroup>
            <DropdownCommandEmpty>No contracts found.</DropdownCommandEmpty>
            <ScrollArea className="h-[224px]" type="always">
              <DropdownCommandGroup className="py-1">
                {projectOptions.map((option) => (
                  <DropdownCommandItem
                    key={option.id}
                    itemValue={option}
                    className="items-center gap-3 px-4 py-3 text-left data-[state=selected]:bg-gray-50"
                  >
                    <Avatar
                      size="sm"
                      className={cn(
                        "hover:ring-0 active:ring-0",
                        option.avatarColor
                      )}
                    >
                      <AvatarFallback className="bg-transparent text-white hover:bg-transparent">
                        {option.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-dark-blue-400">
                        {option.name}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {option.handle}
                      </div>
                    </div>
                  </DropdownCommandItem>
                ))}
              </DropdownCommandGroup>
            </ScrollArea>
          </DropdownCommand>
        </DropdownPopoverContent>
      </DropdownPopover>

      <div className="h-4 w-px bg-gray-300/70" />

      <DropdownPopover
        selected={taskName}
        onSelectedChange={(value: string | null) => {
          if (value) setTaskName(value)
        }}
      >
        <DropdownPopoverTrigger className="h-auto w-auto min-w-0 flex-1 justify-start border-0 bg-transparent p-0 text-left shadow-none ring-0 hover:bg-transparent data-[state=open]:border-0 data-[state=open]:bg-transparent data-[state=open]:ring-0">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[14px] leading-6 text-gray-500">
            <span className="truncate">{taskName}</span>
            <Edit03 className="mt-px size-3.5 shrink-0 text-gray-400" />
          </span>
        </DropdownPopoverTrigger>
        <DropdownPopoverContent
          align="start"
          sideOffset={4}
          className="w-[462px] max-w-[calc(100vw-3rem)] rounded-xl border border-gray-100 p-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]"
        >
          <DropdownCommand>
            <InputGroup>
              <InputLeftElement className="w-8 text-gray-400">
                <SearchSm className="size-4" />
              </InputLeftElement>
              <DropdownCommandInput placeholder="Find Tasks" className="pl-8" />
            </InputGroup>
            <DropdownCommandEmpty>No tasks found.</DropdownCommandEmpty>
            <ScrollArea className="h-[224px]" type="always">
              <DropdownCommandGroup className="py-1">
                {tasks.map((option) => (
                  <DropdownCommandItem
                    key={option}
                    itemValue={option}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium data-[state=selected]:bg-gray-50",
                      option === taskName
                        ? "text-dark-blue-400"
                        : "text-gray-500"
                    )}
                  >
                    {option}
                  </DropdownCommandItem>
                ))}
              </DropdownCommandGroup>
            </ScrollArea>
            <div className="border-t border-gray-100 px-4 py-3">
              <Button
                onClick={() => {
                  const nextTask = `Task ${tasks.length + 1}`
                  setTasks((current) => [...current, nextTask])
                  setTaskName(nextTask)
                }}
                variant="link"
                visual="gray"
                leftIcon={<Plus className="size-4" />}
                className="w-full justify-center text-sm"
              >
                Add New Task
              </Button>
            </div>
          </DropdownCommand>
        </DropdownPopoverContent>
      </DropdownPopover>
    </div>
  )
}

// ─── Time Block ─────────────────────────────────────────────────────────

function TimeBlockCard({
  block,
  selectedScreenshotId,
  onSelectScreenshot,
}: {
  block: TimeBlock
  selectedScreenshotId: string | null
  onSelectScreenshot: (id: string) => void
}) {
  return (
    <div className="py-4">
      {/* Block header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-dark-blue-400">{block.hour}</h3>
          <span className="text-sm text-gray-400">{block.date}</span>
        </div>
        <div className="flex items-center gap-3">
          {block.isManualTime && (
            <span className="text-sm text-gray-400">
              Manual time{" "}
              <span className="font-bold text-primary-500">
                {block.manualDuration}
              </span>
            </span>
          )}
          <span className="text-sm font-medium text-dark-blue-400">
            {block.totalTime}
          </span>
        </div>
      </div>

      {/* Project bars + screenshots */}
      <div className="space-y-4">
        {/* Render project bars in a row if multiple */}
        <div className="flex gap-2">
          {block.projects.map((project, i) => (
            <div key={i} className="flex-1">
              <ProjectBar project={project} />
            </div>
          ))}
        </div>

        {/* Screenshots row */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {block.projects.flatMap((project, pi) =>
            project.screenshots.map((screenshot, si) => (
              <ScreenshotThumbnail
                key={`${pi}-${si}`}
                screenshot={screenshot}
                selected={selectedScreenshotId === screenshot.id}
                onSelect={onSelectScreenshot}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Add Manual Time Dialog ─────────────────────────────────────────────

function AddManualTimeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [contract, setContract] = useState("")
  const [task, setTask] = useState("")
  const [notes, setNotes] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Select Date"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dark-blue-400">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="Enter start time"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-dark-blue-400">
                End Time
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="Enter end time"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Contract
            </label>
            <Select value={contract} onValueChange={setContract}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Contract" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project1">Project 1</SelectItem>
                <SelectItem value="project2">Project 2</SelectItem>
                <SelectItem value="project3">Project 3</SelectItem>
                <SelectItem value="project4">Project 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Task
            </label>
            <Select value={task} onValueChange={setTask}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editing">Editing Layouts</SelectItem>
                <SelectItem value="logo">Creating logo</SelectItem>
                <SelectItem value="wireframes">Wireframing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-dark-blue-400">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us what you worked on"
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <HelpCircle className="size-3.5 flex-none" />
            Manual time will appear in your timeline without screenshots and may
            be subject to review or approval.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outlined" visual="gray">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              onOpenChange(false)
              toast({
                title: "Manual time added",
                description: `${startTime} – ${endTime}`,
              })
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Filter system ──────────────────────────────────────────────────────

type FilterCategory =
  | "contracts"
  | "tasks"
  | "apps"
  | "urls"
  | "activity"
  | "timeEntry"

interface FilterOptionItem {
  value: string
  label: string
  subLabel?: string
  avatar?: { initial: string; color: string }
}

interface CategoryConfig {
  label: string
  pluralChip: string
  searchPlaceholder: string
  searchable: boolean
  combinable: boolean
  options: FilterOptionItem[]
}

const contractFilterOpts: FilterOptionItem[] = [
  {
    value: "Referrizer Website",
    label: "Referrizer Website",
    subLabel: "@referrizer",
    avatar: { initial: "R", color: "bg-warning-400" },
  },
  {
    value: "Alex",
    label: "Alex",
    subLabel: "@alex_guy21",
    avatar: { initial: "A", color: "bg-warning-400" },
  },
  {
    value: "Saas Landing Page",
    label: "Saas Landing Page",
    subLabel: "@client_name_234",
    avatar: { initial: "S", color: "bg-warning-400" },
  },
  {
    value: "Bitcoin Dev Team",
    label: "Bitcoin Dev Team",
    subLabel: "@bitcoinmasters321",
    avatar: { initial: "B", color: "bg-warning-400" },
  },
  {
    value: "Referrizer App",
    label: "Referrizer App",
    subLabel: "@referrizer",
    avatar: { initial: "R", color: "bg-warning-400" },
  },
]
const taskFilterOpts: FilterOptionItem[] = [
  { value: "Finalize homepage layout", label: "Finalize homepage layout" },
  { value: "Editing layouts", label: "Editing layouts" },
  { value: "Fix checkout flow bugs", label: "Fix checkout flow bugs" },
  {
    value: "Add analytics summary cards",
    label: "Add analytics summary cards",
  },
  { value: "No tasks assigned", label: "No tasks assigned" },
]
const appFilterOpts: FilterOptionItem[] = [
  {
    value: "Google Docs",
    label: "Google Docs",
    avatar: { initial: "G", color: "bg-primary-500" },
  },
  {
    value: "Notion",
    label: "Notion",
    avatar: { initial: "N", color: "bg-gray-800" },
  },
  {
    value: "Slack",
    label: "Slack",
    avatar: { initial: "S", color: "bg-error-400" },
  },
  {
    value: "Figma",
    label: "Figma",
    avatar: { initial: "F", color: "bg-purple-500" },
  },
]
const urlFilterOpts: FilterOptionItem[] = [
  {
    value: "https://youtube.com/wat...",
    label: "https://youtube.com/wat...",
    avatar: { initial: "Y", color: "bg-error-500" },
  },
  {
    value: "https://pinterest.com/ap...",
    label: "https://pinterest.com/ap...",
    avatar: { initial: "P", color: "bg-error-600" },
  },
  {
    value: "https://docs.google.com/...",
    label: "https://docs.google.com/...",
    avatar: { initial: "D", color: "bg-primary-500" },
  },
  {
    value: "https://www.google.com...",
    label: "https://www.google.com...",
    avatar: { initial: "G", color: "bg-success-500" },
  },
]
const activityFilterOpts: FilterOptionItem[] = [
  { value: "No Activity", label: "No Activity" },
  { value: "Low Activity", label: "Low Activity" },
  { value: "Medium Activity", label: "Medium Activity" },
  { value: "High Activity", label: "High Activity" },
]
const timeEntryFilterOpts: FilterOptionItem[] = [
  { value: "Auto Tracked Time", label: "Auto Tracked Time" },
  { value: "Manual Time", label: "Manual Time" },
  { value: "Edited Time", label: "Edited Time" },
]

const filterCategories: Record<FilterCategory, CategoryConfig> = {
  contracts: {
    label: "Contracts",
    pluralChip: "Projects",
    searchPlaceholder: "Filter by contract...",
    searchable: true,
    combinable: true,
    options: contractFilterOpts,
  },
  tasks: {
    label: "Tasks",
    pluralChip: "Tasks",
    searchPlaceholder: "Filter by task...",
    searchable: true,
    combinable: true,
    options: taskFilterOpts,
  },
  apps: {
    label: "Apps",
    pluralChip: "Apps",
    searchPlaceholder: "Filter by app...",
    searchable: true,
    combinable: true,
    options: appFilterOpts,
  },
  urls: {
    label: "URL's",
    pluralChip: "URL's",
    searchPlaceholder: "Filter by url...",
    searchable: true,
    combinable: true,
    options: urlFilterOpts,
  },
  activity: {
    label: "Activity Level",
    pluralChip: "",
    searchPlaceholder: "",
    searchable: false,
    combinable: false,
    options: activityFilterOpts,
  },
  timeEntry: {
    label: "Time Entry",
    pluralChip: "",
    searchPlaceholder: "",
    searchable: false,
    combinable: false,
    options: timeEntryFilterOpts,
  },
}

const filterCategoryOrder: FilterCategory[] = [
  "contracts",
  "tasks",
  "apps",
  "urls",
  "activity",
  "timeEntry",
]

type AppliedFilters = Record<FilterCategory, string[]>
const emptyAppliedFilters: AppliedFilters = {
  contracts: [],
  tasks: [],
  apps: [],
  urls: [],
  activity: [],
  timeEntry: [],
}

interface AppliedChip {
  category: FilterCategory
  value?: string
  count?: number
  label: string
}

function getAppliedChips(applied: AppliedFilters): AppliedChip[] {
  const chips: AppliedChip[] = []
  for (const cat of filterCategoryOrder) {
    const values = applied[cat]
    if (values.length === 0) continue
    const config = filterCategories[cat]
    if (!config.combinable || values.length === 1) {
      for (const v of values) chips.push({ category: cat, value: v, label: v })
    } else {
      chips.push({
        category: cat,
        count: values.length,
        label: config.pluralChip,
      })
    }
  }
  return chips
}

function FilterPopover({
  applied,
  onChange,
  children,
}: {
  applied: AppliedFilters
  onChange: (next: AppliedFilters) => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activeCategory, setActiveCategory] =
    useState<FilterCategory>("contracts")
  const [query, setQuery] = useState("")

  const config = filterCategories[activeCategory]
  const selected = applied[activeCategory]
  const filteredOptions =
    config.searchable && query
      ? config.options.filter((o) =>
          o.label.toLowerCase().includes(query.toLowerCase())
        )
      : config.options

  const toggle = (value: string) => {
    const curr = applied[activeCategory]
    const next = curr.includes(value)
      ? curr.filter((v) => v !== value)
      : [...curr, value]
    onChange({ ...applied, [activeCategory]: next })
  }

  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => selected.includes(o.value))

  const toggleSelectAll = () => {
    const values = filteredOptions.map((o) => o.value)
    if (allSelected) {
      onChange({
        ...applied,
        [activeCategory]: selected.filter((v) => !values.includes(v)),
      })
    } else {
      onChange({
        ...applied,
        [activeCategory]: Array.from(new Set([...selected, ...values])),
      })
    }
  }

  const clearCategory = () => onChange({ ...applied, [activeCategory]: [] })

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setQuery("")
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="p-0 w-auto bg-white border border-gray-100 shadow-lg rounded-lg overflow-hidden"
      >
        <div className="flex">
          {/* Categories panel */}
          <div className="w-[150px] py-2 border-r border-gray-100">
            {filterCategoryOrder.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat)
                  setQuery("")
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  activeCategory === cat
                    ? "bg-gray-50 text-dark-blue-400 font-semibold"
                    : "text-gray-500 hover:bg-gray-50"
                )}
              >
                {filterCategories[cat].label}
              </button>
            ))}
          </div>
          {/* Values panel */}
          <div className="w-[280px] flex flex-col">
            {config.searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <SearchSm className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={config.searchPlaceholder}
                    className="w-full h-9 pl-8 pr-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:border-primary-300"
                  />
                </div>
              </div>
            )}
            {config.searchable && filteredOptions.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-gray-700">Select All</span>
                </label>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCategory}
                    className="text-xs font-medium text-primary-500 hover:text-primary-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            <div className="max-h-[220px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-400 text-center">
                  No results
                </p>
              ) : (
                filteredOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.includes(opt.value)}
                      onCheckedChange={() => toggle(opt.value)}
                    />
                    {opt.avatar && (
                      <div
                        className={cn(
                          "size-8 rounded-full flex-none flex items-center justify-center text-xs font-semibold text-white",
                          opt.avatar.color
                        )}
                      >
                        {opt.avatar.initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-dark-blue-400 truncate">
                        {opt.label}
                      </div>
                      {opt.subLabel && (
                        <div className="text-xs text-gray-400 truncate">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Screenshot Details Dialog ──────────────────────────────────────────

interface FlatScreenshot {
  screenshot: Screenshot
  projectName: string
  taskName: string
  blockDate: string
  blockHour: string
}

function flattenScreenshots(blocks: TimeBlock[]): FlatScreenshot[] {
  return blocks.flatMap((b) =>
    b.projects.flatMap((p) =>
      p.screenshots.map((s) => ({
        screenshot: s,
        projectName: p.projectName,
        taskName: p.taskName,
        blockDate: b.date,
        blockHour: b.hour,
      }))
    )
  )
}

const appDisplay: Record<string, { name: string; color: string }> = {
  chrome: { name: "Chrome Browser", color: "bg-success-500" },
  slack: { name: "Slack", color: "bg-error-400" },
  github: { name: "Github Desktop", color: "bg-gray-700" },
  vscode: { name: "VS Code", color: "bg-primary-500" },
  figma: { name: "Figma", color: "bg-purple-500" },
  terminal: { name: "Terminal", color: "bg-gray-500" },
}

// ─── Contract / Task pickers ───────────────────────────────────────────

interface ProjectOption {
  id: string
  name: string
  handle: string
  avatarColor: string
  initial: string
}

const projectOptions: ProjectOption[] = [
  {
    id: "p1",
    name: "Crypto App / Mobile",
    handle: "@bitcoinmasters321",
    avatarColor: "bg-warning-400",
    initial: "C",
  },
  {
    id: "p2",
    name: "Logo Design",
    handle: "@christheclient234",
    avatarColor: "bg-gray-300",
    initial: "L",
  },
  {
    id: "p3",
    name: "Saas Landing Page",
    handle: "@referrizerllc",
    avatarColor: "bg-primary-100",
    initial: "S",
  },
  {
    id: "p4",
    name: "Website Redesign",
    handle: "@referrizerllc",
    avatarColor: "bg-primary-100",
    initial: "W",
  },
  {
    id: "p5",
    name: "App Redesign Sprint",
    handle: "@northstarstudio",
    avatarColor: "bg-success-400",
    initial: "A",
  },
  {
    id: "p6",
    name: "Design QA Support",
    handle: "@brandteam",
    avatarColor: "bg-gray-500",
    initial: "D",
  },
]

const taskOptions: string[] = [
  "Finalize homepage layout",
  "Editing layouts",
  "Fix checkout flow bugs",
  "Add analytics summary cards",
  "Research & Design Tooltips",
  "Prepare responsive polish pass",
]

function ContractPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = projectOptions.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )
  const selectedProject =
    projectOptions.find((project) => project.name === value) ??
    ({
      id: value,
      name: value,
      handle: "",
      avatarColor: "bg-gray-300",
      initial: value.charAt(0).toUpperCase(),
    } satisfies ProjectOption)

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-500">Contract</label>
      <Combobox
        value={selectedProject}
        onChange={(project: ProjectOption) => onChange(project.name)}
        className="w-full"
      >
        <ComboboxTrigger>
          <div className="relative">
            <ComboboxInput
              className="h-10 pl-3 pr-9 text-sm font-medium text-dark-blue-400"
              displayValue={(project: ProjectOption) => project?.name ?? ""}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ComboboxButton
              align="right"
              className="right-3 text-gray-400 peer-focus:text-gray-400"
            >
              <Edit03 className="size-3.5" />
            </ComboboxButton>
          </div>
        </ComboboxTrigger>
        <ScaleOutIn afterLeave={() => setQuery("")}>
          <ComboboxOptions className="mt-1 w-[448px] max-w-[calc(100vw-3rem)] space-y-0 rounded-xl border border-gray-100 bg-white px-0 py-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]">
            <ScrollArea viewportClassName="max-h-[272px]">
              {filtered.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-gray-400">
                  No contracts found
                </li>
              ) : (
                filtered.map((project) => (
                  <ComboboxOption
                    key={project.id}
                    value={project}
                    className="flex items-center gap-3 px-5 py-3 text-left ui-active:bg-gray-50 ui-active:text-inherit"
                  >
                    <Avatar
                      size="sm"
                      className={cn(
                        "hover:ring-0 active:ring-0",
                        project.avatarColor
                      )}
                    >
                      <AvatarFallback className="bg-transparent text-white hover:bg-transparent">
                        {project.initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-dark-blue-400">
                        {project.name}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        {project.handle}
                      </div>
                    </div>
                  </ComboboxOption>
                ))
              )}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>
    </div>
  )
}

function TaskPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [query, setQuery] = useState("")
  const [tasks, setTasks] = useState<string[]>(taskOptions)
  const filtered = tasks.filter((t) =>
    t.toLowerCase().includes(query.toLowerCase())
  )

  const addNewTask = () => {
    if (query.trim() && !tasks.includes(query.trim())) {
      const next = query.trim()
      setTasks([...tasks, next])
      onChange(next)
      setQuery("")
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm text-gray-500">Task</label>
      <Combobox
        value={value}
        onChange={(task: string) => onChange(task)}
        className="w-full"
        nullable
      >
        <ComboboxTrigger>
          <div className="relative">
            <ComboboxInput
              className="h-10 pl-3 pr-9 text-sm font-medium text-dark-blue-400"
              displayValue={(task: string) => task ?? ""}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ComboboxButton
              align="right"
              className="right-3 text-gray-400 peer-focus:text-gray-400"
            >
              <Edit03 className="size-3.5" />
            </ComboboxButton>
          </div>
        </ComboboxTrigger>
        <ScaleOutIn afterLeave={() => setQuery("")}>
          <ComboboxOptions className="left-auto right-0 mt-1 w-[462px] max-w-[calc(100vw-3rem)] space-y-0 rounded-xl border border-gray-100 bg-white px-0 py-0 shadow-[0_24px_48px_rgba(16,24,40,0.18)]">
            <ScrollArea viewportClassName="max-h-[224px]">
              {filtered.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-gray-400">
                  No tasks found
                </li>
              ) : (
                filtered.map((task) => (
                  <ComboboxOption
                    key={task}
                    value={task}
                    className={cn(
                      "px-5 py-3 text-sm font-medium text-left ui-active:bg-gray-50 ui-active:text-dark-blue-400",
                      task === value ? "text-dark-blue-400" : "text-gray-500"
                    )}
                  >
                    {task}
                  </ComboboxOption>
                ))
              )}
            </ScrollArea>
            <li className="border-t border-gray-100 px-5 py-3">
              <Button
                onClick={addNewTask}
                variant="link"
                visual="gray"
                leftIcon={<Plus className="size-4" />}
                className="w-full justify-center text-sm"
              >
                Add New Task
              </Button>
            </li>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>
    </div>
  )
}

function ScreenshotDetailsDialog({
  flatScreenshots,
  openId,
  onOpenChange,
  onNavigate,
}: {
  flatScreenshots: FlatScreenshot[]
  openId: string | null
  onOpenChange: (open: boolean) => void
  onNavigate: (id: string) => void
}) {
  const currentIndex = openId
    ? flatScreenshots.findIndex((f) => f.screenshot.id === openId)
    : -1
  const current = currentIndex >= 0 ? flatScreenshots[currentIndex] : null
  const total = flatScreenshots.length

  const goPrev = () => {
    if (currentIndex > 0)
      onNavigate(flatScreenshots[currentIndex - 1].screenshot.id)
  }
  const goNext = () => {
    if (currentIndex < total - 1)
      onNavigate(flatScreenshots[currentIndex + 1].screenshot.id)
  }

  if (!current) return null
  const s = current.screenshot
  const keyboardActivity = s.keyboardPct ?? s.activityLevel
  const mouseActivity =
    s.mousePct ?? Math.max(0, Math.round(s.activityLevel * 0.7))

  return (
    <Dialog open={!!openId} onOpenChange={onOpenChange}>
      <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none w-screen h-screen !rounded-none p-0 gap-0 flex flex-col overflow-hidden shadow-none">
        <TooltipProvider delayDuration={200}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-none">
            <div className="flex items-center gap-3">
              <IconButton
                variant="outlined"
                visual="gray"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="size-5" />
              </IconButton>
              <h2 className="text-base font-semibold text-dark-blue-400">
                Screen {currentIndex + 1} of {total}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton variant="outlined" visual="gray" size="sm">
                        <MoreHorizontal className="size-4" />
                      </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Download</DropdownMenuItem>
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="bottom">Options</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-5" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Exit</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex min-h-0">
            {/* Screenshot area */}
            <div className="flex-1 flex flex-col min-w-0 p-6 overflow-hidden">
              <div className="flex-1 flex items-center justify-center min-h-0 px-6">
                <div
                  className="relative"
                  style={{
                    width: "min(100%, calc((100vh - 320px) * 1.6), 1000px)",
                    aspectRatio: "16 / 10",
                  }}
                >
                  {/* Screenshot */}
                  {s.isNoActivity ? (
                    <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm text-gray-400">No Activity</span>
                    </div>
                  ) : s.imageUrl ? (
                    <img
                      src={s.imageUrl}
                      alt={`Screenshot at ${s.time}`}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-700 to-gray-900" />
                  )}

                  {/* Prev side panel (attached to left edge) */}
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={currentIndex <= 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-20 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous screenshot"
                  >
                    <ChevronRight className="size-5 rotate-180" />
                  </button>

                  {/* Next side panel (attached to right edge) */}
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={currentIndex >= total - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-20 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next screenshot"
                  >
                    <ChevronRight className="size-5" />
                  </button>

                  {/* Floating action icon row (bottom-right overlay) */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white rounded-lg shadow-md border border-gray-200 p-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <Download className="size-4" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <Droplet className="size-4" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Blur</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className="text-error-500 hover:text-error-600"
                        >
                          <Trash01 className="size-4" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton variant="ghost" visual="gray" size="sm">
                          <ZoomIn className="size-4" />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Zoom in</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex items-center gap-2 mt-6 flex-none">
                <div className="flex gap-3 overflow-x-auto flex-1 pb-1">
                  {flatScreenshots.map((f) => {
                    const isCurrent = f.screenshot.id === openId
                    return (
                      <button
                        key={f.screenshot.id}
                        type="button"
                        onClick={() => onNavigate(f.screenshot.id)}
                        className="flex-none w-[130px]"
                      >
                        <div
                          className={cn(
                            "relative aspect-[16/10] rounded-md overflow-hidden border-2 transition-all",
                            isCurrent
                              ? "border-primary-400 ring-2 ring-primary-100"
                              : "border-transparent hover:border-gray-300"
                          )}
                        >
                          {f.screenshot.isNoActivity ? (
                            <div className="w-full h-full bg-gray-100" />
                          ) : f.screenshot.imageUrl ? (
                            <img
                              src={f.screenshot.imageUrl}
                              alt={`Screenshot at ${f.screenshot.time}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                          )}
                        </div>
                        {/* Activity bar */}
                        {!f.screenshot.isNoActivity && (
                          <div className="h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{
                                width: `${f.screenshot.activityLevel}%`,
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-gray-400">
                            {f.screenshot.time}
                          </span>
                          {f.screenshot.apps.length > 0 && (
                            <AppIcons apps={f.screenshot.apps} />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <IconButton
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={goNext}
                  disabled={currentIndex >= total - 1}
                >
                  <ChevronRight className="size-4" />
                </IconButton>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-[320px] flex-none border-l border-gray-200 p-6 overflow-y-auto">
              <div className="space-y-5">
                {/* Time / Date */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500 w-14">Time</span>
                    <span className="text-base font-semibold text-dark-blue-400">
                      {s.time}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500 w-14">Date</span>
                    <span className="text-base font-semibold text-dark-blue-400">
                      {current.blockDate}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-gray-200" />

                {/* Activity bars */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Keyboard01 className="size-4 text-gray-500 flex-none" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${keyboardActivity}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-dark-blue-400 w-8 text-right">
                      {keyboardActivity}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mouse className="size-4 text-gray-500 flex-none" />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full"
                        style={{ width: `${mouseActivity}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-dark-blue-400 w-8 text-right">
                      {mouseActivity}%
                    </span>
                  </div>
                </div>

                <div className="h-px bg-gray-200" />

                {/* Contract */}
                <ContractPicker
                  value={current.projectName}
                  onChange={() => {}}
                />

                {/* Task */}
                <TaskPicker value={current.taskName} onChange={() => {}} />

                <div className="h-px bg-gray-200" />

                {/* Apps */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-500">Apps</label>
                  {s.apps.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No app activity recorded
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {s.apps.map((app, i) => {
                        const info = appDisplay[app] || {
                          name: app,
                          color: "bg-gray-400",
                        }
                        return (
                          <div key={i} className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "size-5 rounded-full flex-none",
                                info.color
                              )}
                            />
                            <span className="text-sm text-dark-blue-400">
                              {info.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}

// ─── Download Desktop Tracker Dialog ───────────────────────────────────
// Spec references:
//   doc 29 — Build, Packaging & Code Signing (productName, artifactName, arch)
//   doc 30 — Auto-Update & Release Channels  (GitHub releases feed)
//   doc 41 — In-App Help, Empty States & Onboarding Copy

// Stable download URLs. The underlying repo is a dedicated release-only repo
// (Marketeq/desktop-time-tracker) so the main codebase stays private while
// /releases/latest/download/<file> remains publicly downloadable.
//
// Filenames are intentionally versionless so these URLs never break across
// version bumps — GitHub redirects `/releases/latest/download/<file>` to the
// current release asset. This is the same pattern Obsidian, Standard Notes,
// and Linear use.
//
// electron-builder artifactName in desktop/electron-builder.yml MUST stay in
// sync with these filenames (doc 29 §1.1).
const DTT_RELEASES_BASE =
  "https://github.com/Marketeq/desktop-time-tracker/releases/latest/download"

type DesktopPlatform = "mac-arm64" | "mac-x64" | "win-x64" | "win-arm64"

interface PlatformOption {
  value: DesktopPlatform
  os: "mac" | "windows"
  label: string
  fileName: string
  fileSize: string
  downloadUrl: string
  available: boolean
}

const platformOptions: Record<DesktopPlatform, PlatformOption> = {
  "mac-arm64": {
    value: "mac-arm64",
    os: "mac",
    label: "macOS — Apple Silicon (M1/M2/M3)",
    fileName: "Marketeq-mac-arm64.dmg",
    fileSize: "102 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-mac-arm64.dmg`,
    available: true,
  },
  "mac-x64": {
    value: "mac-x64",
    os: "mac",
    label: "macOS — Intel",
    fileName: "Marketeq-mac-x64.dmg",
    fileSize: "107 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-mac-x64.dmg`,
    available: true,
  },
  "win-x64": {
    value: "win-x64",
    os: "windows",
    label: "Windows 10/11 — 64-bit",
    fileName: "Marketeq-Setup-win-x64.exe",
    fileSize: "~97 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-Setup-win-x64.exe`,
    available: true,
  },
  "win-arm64": {
    value: "win-arm64",
    os: "windows",
    label: "Windows 10/11 — ARM64",
    fileName: "Marketeq-Setup-win-arm64.exe",
    fileSize: "~94 MB",
    downloadUrl: `${DTT_RELEASES_BASE}/Marketeq-Setup-win-arm64.exe`,
    available: true,
  },
}

function detectPlatform(): DesktopPlatform {
  if (typeof window === "undefined") return "mac-arm64"
  const ua = window.navigator.userAgent.toLowerCase()
  const platform = (window.navigator.platform || "").toLowerCase()
  const isMac = platform.includes("mac") || ua.includes("mac os")
  const isWin = platform.includes("win") || ua.includes("windows")
  const isArm = ua.includes("arm") || ua.includes("aarch64")

  if (isMac) {
    // Safari/Chrome on Apple Silicon reports "MacIntel" — use max touch points
    // and available heuristics as a best effort. Default to Apple Silicon
    // (majority of new Macs).
    const isAppleSilicon =
      isArm ||
      (typeof navigator !== "undefined" &&
        (navigator as Navigator & { userAgentData?: { platform?: string } })
          .userAgentData?.platform === "macOS")
    return isAppleSilicon ? "mac-arm64" : "mac-x64"
  }
  if (isWin) return isArm ? "win-arm64" : "win-x64"
  return "mac-arm64"
}

function DownloadDesktopTrackerDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [platform, setPlatform] = useState<DesktopPlatform>("mac-arm64")
  const [downloadStarted, setDownloadStarted] = useState(false)

  const selected = platformOptions[platform]
  const isMac = selected.os === "mac"

  // Detect platform when dialog opens (reset + auto-trigger)
  useEffect(() => {
    if (open) {
      setPlatform(detectPlatform())
      setDownloadStarted(false)
    }
  }, [open])

  const triggerDownload = () => {
    const a = document.createElement("a")
    a.href = selected.downloadUrl
    a.download = selected.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setDownloadStarted(true)
    toast({
      title: "Download started",
      description: `${selected.fileName} is downloading to your Downloads folder.`,
    })
    if (typeof window !== "undefined") {
      window.location.href = selected.downloadUrl
    }
  }

  // Auto-start the download when the dialog opens (per flowchart Step 2).
  // Only for platforms whose installers actually exist — otherwise we'd
  // send the user into a 404 without their consent.
  useEffect(() => {
    if (!open || downloadStarted) return
    if (!selected.available) return
    const t = setTimeout(() => {
      const a = document.createElement("a")
      a.href = selected.downloadUrl
      a.download = selected.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDownloadStarted(true)
      toast({
        title: "Download started",
        description: `${selected.fileName} is downloading to your Downloads folder.`,
      })
      if (typeof window !== "undefined") {
        window.location.href = selected.downloadUrl
      }
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected.available])

  const otherOsPlatform: DesktopPlatform = isMac ? "win-x64" : "mac-arm64"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-primary-50 flex items-center justify-center flex-none">
              <Download className="size-5 text-primary-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-dark-blue-400">
                Download Marketeq Time Tracker
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Track your time, stay in sync, get paid.
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <IconButton variant="ghost" visual="gray" size="sm">
              <X className="size-4" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="px-6 pb-6 space-y-5">
          <p className="text-xs text-gray-600 leading-5">
            Marketeq Time Tracker helps you log billable hours, capture
            activity, and keep disputes to a minimum. Set up takes about 2
            minutes.
          </p>

          {/* Platform selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">
              Platform <span className="text-gray-400">(auto-detected)</span>
            </label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as DesktopPlatform)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mac-arm64">
                  macOS — Apple Silicon (M1/M2/M3)
                </SelectItem>
                <SelectItem value="mac-x64">macOS — Intel</SelectItem>
                <SelectItem value="win-x64">
                  Windows 10/11 — 64-bit (coming soon)
                </SelectItem>
                <SelectItem value="win-arm64">
                  Windows 10/11 — ARM64 (coming soon)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File card */}
          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-25">
            <div
              className={cn(
                "size-12 rounded-lg flex items-center justify-center flex-none text-white font-bold",
                isMac ? "bg-gray-900" : "bg-primary-500"
              )}
            >
              {isMac ? "" : "⊞"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-dark-blue-400 truncate">
                {selected.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {selected.fileSize} Stable channel
              </div>
            </div>
            <Button
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={triggerDownload}
            >
              Download
            </Button>
          </div>

          {/* Download started notice */}
          {downloadStarted && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-50 border border-primary-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <HelpCircle className="size-4 text-primary-500 flex-none mt-0.5" />
              <p className="text-xs text-primary-700 leading-5">
                Your download should begin automatically. If it didn&apos;t
                start,{" "}
                <button
                  type="button"
                  onClick={triggerDownload}
                  className="font-semibold underline hover:text-primary-800"
                >
                  click here
                </button>
                .
              </p>
            </div>
          )}

          {/* Next steps (spec: doc 41 Welcome + doc 40 §Install) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Next steps</p>
            <ol className="space-y-2">
              {(isMac
                ? [
                    "Open the downloaded .dmg file",
                    'Drag "Marketeq Time Tracker" into your Applications folder',
                    "Launch the app and sign in with your Marketeq account",
                    "Grant Screen Recording, Accessibility, and Notification permissions when prompted",
                  ]
                : [
                    "Open the downloaded .exe installer",
                    'Follow the setup wizard and click "Install"',
                    "Launch the app and sign in with your Marketeq account",
                    "Allow the tracker through Windows Firewall and SmartScreen if prompted",
                  ]
              ).map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="size-5 rounded-full bg-primary-50 text-primary-600 text-[11px] font-semibold flex items-center justify-center flex-none mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-600 leading-5">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-25">
          <button
            type="button"
            onClick={() => setPlatform(otherOsPlatform)}
            className="text-xs text-primary-500 hover:text-primary-600 font-medium"
          >
            Need the {isMac ? "Windows" : "macOS"} version?
          </button>
          <DialogClose asChild>
            <Button variant="outlined" visual="gray" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function TimeTrackingPage() {
  const { toast } = useToast()
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<
    string | null
  >(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [contractFilter, setContractFilter] = useState("all")
  const [dateRange] = useState("Jan 6, 2022 – Jan 13, 2022")
  const [timezone] = useState("UTC-4 New York (Me)")
  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false)
  const [showManualTimeDialog, setShowManualTimeDialog] = useState(false)
  const [showDownloadTracker, setShowDownloadTracker] = useState(false)
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>(emptyAppliedFilters)

  // --- Real contracts from API ---
  const { user } = useAuth()
  const [realContracts, setRealContracts] = useState<ContractDTO[]>([])

  useEffect(() => {
    if (!user?.id) return
    const role =
      (user as any).role?.toUpperCase?.() ||
      (user as any).accountType?.toUpperCase?.() ||
      ""
    const fetcher =
      role === "CLIENT" ? getContractsForClient : getContractsForTalent
    fetcher(user.id)
      .then((contracts) => setRealContracts(contracts))
      .catch(() => {})
  }, [user?.id])

  // --- Real data fetching ---
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(sampleTimeBlocks)
  const [isLoading, setIsLoading] = useState(true)
  const [totalTime, setTotalTime] = useState("03:24")
  const [screenshotCount, setScreenshotCount] = useState(0)

  const fetchScreenshots = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: ScreenshotCardsParams = {
        sortBy: "timestamp",
        sortOrder: "DESC",
        pageSize: 100,
      }
      if (contractFilter !== "all") {
        params.contractId = contractFilter
      }
      const res = await getScreenshotCards(params)
      if (res.data && res.data.length > 0) {
        const blocks = transformScreenshotsToTimeBlocks(res.data)
        setTimeBlocks(blocks)
        setScreenshotCount(res.total)
        // Compute total time from screenshot count (each ~10 min interval)
        const totalMin = res.data.length * 10
        const hrs = Math.floor(totalMin / 60)
        const mins = totalMin % 60
        setTotalTime(
          `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
        )
      } else {
        // No real data — keep sample data for demo
        setTimeBlocks(sampleTimeBlocks)
      }
    } catch {
      // API not available — fallback to sample data
      setTimeBlocks(sampleTimeBlocks)
    } finally {
      setIsLoading(false)
    }
  }, [contractFilter])

  useEffect(() => {
    fetchScreenshots()
  }, [fetchScreenshots])

  const flatScreenshots = useMemo(
    () => flattenScreenshots(timeBlocks),
    [timeBlocks]
  )
  const appliedChips = getAppliedChips(appliedFilters)
  const totalActiveFilters = Object.values(appliedFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  const selectScreenshot = (id: string) => {
    setSelectedScreenshotId(id)
    setDetailsOpen(true)
  }

  const removeChip = (chip: AppliedChip) => {
    if (chip.value === undefined) {
      setAppliedFilters({ ...appliedFilters, [chip.category]: [] })
    } else {
      setAppliedFilters({
        ...appliedFilters,
        [chip.category]: appliedFilters[chip.category].filter(
          (v) => v !== chip.value
        ),
      })
    }
  }

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[338px] min-[1024px]:pr-6 overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-dark-blue-400">
                Total time <span className="text-2xl">{totalTime}</span>
              </h1>
              <span className="text-sm text-gray-400">
                + Manual time{" "}
                <span className="font-bold text-primary-500">0:23hr</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                visual="gray"
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setShowManualTimeDialog(true)}
              >
                Add Manual Time
              </Button>
              <Button
                size="sm"
                visual="error"
                leftIcon={<Clock className="size-4" />}
                onClick={() => setShowDownloadTracker(true)}
              >
                Log Time
              </Button>
              <IconButton
                variant="ghost"
                visual="gray"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Help",
                    description:
                      "Visit support.marketeq.com for time tracking guides.",
                  })
                }
              >
                <HelpCircle className="size-4" />
              </IconButton>
              <IconButton
                variant="ghost"
                visual="gray"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Settings",
                    description: "Time tracking settings coming soon.",
                  })
                }
              >
                <Settings02 className="size-4" />
              </IconButton>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="flex items-center justify-between mt-5 gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  buttonVariants({
                    variant: "outlined",
                    visual: "gray",
                    size: "sm",
                  }),
                  "min-w-[56px] justify-between bg-white px-2.5"
                )}
              >
                <Checkbox
                  checked={bulkSelectionEnabled}
                  onCheckedChange={(checked) =>
                    setBulkSelectionEnabled(checked === true)
                  }
                  className="hover:ring-0 active:ring-0"
                />
                <ChevronDown className="size-4 text-gray-500" />
              </div>

              {/* Filter button */}
              <FilterPopover
                applied={appliedFilters}
                onChange={setAppliedFilters}
              >
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="bg-white"
                  leftIcon={<FilterLines className="size-4" />}
                >
                  <span>Filter</span>
                  <span
                    className={cn(
                      "inline-flex items-center justify-center overflow-hidden rounded-full bg-primary-500 text-white text-[10px] font-semibold transition-all duration-200 ease-out",
                      totalActiveFilters > 0
                        ? "size-4 ml-1.5 opacity-100"
                        : "size-0 ml-0 opacity-0"
                    )}
                  >
                    {totalActiveFilters > 0 ? totalActiveFilters : ""}
                  </span>
                </Button>
              </FilterPopover>

              {/* Contract filter */}
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="h-9 w-[160px] bg-white">
                  <SelectValue placeholder="All Contracts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contracts</SelectItem>
                  {realContracts.length > 0
                    ? realContracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title || "Untitled"}
                        </SelectItem>
                      ))
                    : [
                        <SelectItem key="project1" value="project1">
                          Project 1
                        </SelectItem>,
                        <SelectItem key="project2" value="project2">
                          Project 2
                        </SelectItem>,
                        <SelectItem key="project3" value="project3">
                          Project 3
                        </SelectItem>,
                        <SelectItem key="project4" value="project4">
                          Project 4
                        </SelectItem>,
                      ]}
                </SelectContent>
              </Select>

              {/* Date range */}
              <Button
                variant="outlined"
                visual="gray"
                size="sm"
                className="bg-white"
                leftIcon={<Calendar className="size-4" />}
              >
                {dateRange}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <IconButton variant="ghost" visual="gray" size="sm">
                <SwitchVertical01 className="size-4" />
              </IconButton>

              {/* Timezone */}
              <Select value={timezone}>
                <SelectTrigger className="w-[200px] h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC-4 New York (Me)">
                    UTC-4 New York (Me)
                  </SelectItem>
                  <SelectItem value="UTC-5 Chicago">UTC-5 Chicago</SelectItem>
                  <SelectItem value="UTC-7 Los Angeles">
                    UTC-7 Los Angeles
                  </SelectItem>
                  <SelectItem value="UTC+0 London">UTC+0 London</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Active filter chips ── */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              appliedChips.length > 0
                ? "grid-rows-[1fr] opacity-100 mt-3"
                : "grid-rows-[0fr] opacity-0 mt-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                {appliedChips.map((chip, i) => (
                  <span
                    key={`${chip.category}-${chip.value ?? "count"}`}
                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-full bg-primary-50 text-primary-600 text-xs font-medium animate-in fade-in slide-in-from-left-2 zoom-in-95 duration-200"
                  >
                    {chip.count !== undefined && (
                      <span className="size-4 rounded-full bg-primary-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {chip.count}
                      </span>
                    )}
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={() => removeChip(chip)}
                      className="size-4 rounded-full flex items-center justify-center hover:bg-primary-100"
                      aria-label={`Remove ${chip.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <FilterPopover
                  applied={appliedFilters}
                  onChange={setAppliedFilters}
                >
                  <button
                    type="button"
                    className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                  >
                    + Add Filter
                  </button>
                </FilterPopover>
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  onClick={() => setAppliedFilters(emptyAppliedFilters)}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* ── Time blocks ── */}
          <div className="mt-4 divide-y divide-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">
                    Loading screenshots...
                  </span>
                </div>
              </div>
            ) : timeBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Image01 className="size-10 text-gray-300" />
                <p className="text-sm text-gray-400">
                  No screenshots found for this period
                </p>
              </div>
            ) : (
              timeBlocks.map((block) => (
                <TimeBlockCard
                  key={block.id}
                  block={block}
                  selectedScreenshotId={selectedScreenshotId}
                  onSelectScreenshot={selectScreenshot}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AddManualTimeDialog
        open={showManualTimeDialog}
        onOpenChange={setShowManualTimeDialog}
      />

      <DownloadDesktopTrackerDialog
        open={showDownloadTracker}
        onOpenChange={setShowDownloadTracker}
      />

      <ScreenshotDetailsDialog
        flatScreenshots={flatScreenshots}
        openId={detailsOpen ? selectedScreenshotId : null}
        onOpenChange={(open) => setDetailsOpen(open)}
        onNavigate={setSelectedScreenshotId}
      />
    </AuthenticatedRoute>
  )
}
