"use client"

import {
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import React from "react"
import dynamic from "next/dynamic"
import { cn, getId, hookFormHasError } from "@/utils/functions"
import {
  useCallbackRef,
  useControllableState,
  useUncontrolledState,
} from "@/utils/hooks"
import { createStrictContext } from "@/utils/react-utils"
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpLeft,
  Check,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Copy,
  Edit03,
  Lightbulb05,
  MoreHorizontal,
  PlayCircle,
  Plus,
  SearchMd,
  Trash2,
  Type,
  X,
} from "@blend-metrics/icons"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { createColumnHelper } from "@tanstack/react-table"
import {
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Controller,
  SubmitHandler,
  get,
  useForm,
  useWatch,
} from "react-hook-form"
import {
  useIsomorphicLayoutEffect,
  useUpdateEffect,
} from "react-use"
import { z } from "zod"
import { Prettify } from "@/types/core"
import { GripVertical2 } from "@/components/icons/grip-vertical-2"
import { Network } from "@/components/icons/network"
import { Network1 } from "@/components/icons/network-1"
import { Network2 } from "@/components/icons/network-2"
import { Network3 } from "@/components/icons/network-3"
import { Network4 } from "@/components/icons/network-4"
import { CountriesCombobox, OwnCombobox } from "@/components/own-combobox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
} from "@/components/ui"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScrollArea,
  ScrollBar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToastAction,
  Toaster,
  useToast,
} from "@/components/ui"

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false })
const PROJECT_SCOPE_TIP_VIDEO_URL =
  process.env.NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL ?? ""

// ─── Schemas & Constants ────────────────────────────────────────────────

const DURATION_TYPE = ["days", "weeks", "hours"] as const

const formatDurationUnit = (
  value: number,
  type: (typeof DURATION_TYPE)[number]
) => {
  if (value === 1) {
    if (type === "days") return "day"
    if (type === "weeks") return "week"
    return "hour"
  }

  return type
}

const durationToDays = (
  value: number,
  type: (typeof DURATION_TYPE)[number]
) => {
  if (type === "weeks") return value * 7
  if (type === "hours") return Math.max(1, Math.ceil(value / 24))
  return value
}

const EXPERIENCE_LEVELS = [
  "Student",
  "Junior",
  "Medior",
  "Senior",
  "Guru",
] as const
type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

const taskFormSchema = z.object({
  task: z.string().min(1, "Please enter at least 1 character(s)"),
  role: z.string().min(1, "Please enter/select at least 1 role(s)"),
  location: z.string().min(1, "Please enter/select at least 1 location(s)"),
  experience: z.enum(EXPERIENCE_LEVELS, {
    required_error: "Please enter/select at least 1 experience level",
    invalid_type_error: "Please enter/select at least 1 experience level",
  }),
  duration: z.object({
    value: z.coerce.number({
      invalid_type_error: "Please enter a valid number",
    }),
    type: z.enum(DURATION_TYPE, {
      invalid_type_error: "Please select an option",
      required_error: "Please select an option",
    }),
  }),
})

const rowSchema = taskFormSchema.merge(
  z.object({
    id: z.string().min(1, "Please enter at least 1 character(s)"),
  })
)

const pickFromProjectScopeSchema = (
  options: {
    [Property in keyof z.infer<typeof rowSchema>]?: true
  } = {}
) => {
  return {
    safeParse: (data: unknown, params?: Partial<z.ParseParams>) => {
      const { success } = z
        .array(
          z.object({
            phaseName: z
              .string()
              .min(1, "Please enter at least 1 character(s)"),
            rows: z
              .array(rowSchema.pick(options))
              .min(1, "Please add at least 1 task(s)"),
          })
        )
        .min(1, "Please add at least 1 phase(s)")
        .safeParse(data, params)
      return success
    },
  }
}

const projectScopeSchema = pickFromProjectScopeSchema()

const phaseNameFormSchema = z.object({
  name: z.string().min(1, "Please enter at least 1 character(s)"),
})

type PhaseNameFormValues = z.infer<typeof phaseNameFormSchema>

// ─── Types ──────────────────────────────────────────────────────────────

type TaskFormValues = z.infer<typeof taskFormSchema>

export type PhaseRow = Prettify<
  {
    id: string
    role?: string
    location?: string
    experience?: string
  } & TaskFormValues
>

export interface Phase {
  phaseName?: string
  rows?: PhaseRow[]
}

// ─── Table meta augmentation ────────────────────────────────────────────

declare module "@tanstack/react-table" {
  // @ts-expect-error
  interface TableMeta<TData extends PhaseRow> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
    openDurationDialog: (index: number) => void
    roles: string[]
  }
}

// ─── Helper functions ───────────────────────────────────────────────────

const getPhaseDurationInDays = (phase?: Phase) => {
  const rows = phase?.rows ?? []
  const durations = rows
    .map((row) => {
      const value = Number(row?.duration?.value)
      const type = row?.duration?.type

      if (!Number.isFinite(value) || value <= 0 || !type) return null
      return durationToDays(value, type)
    })
    .filter((value): value is number => typeof value === "number")

  return durations.length ? Math.max(...durations) : 0
}

const getPhaseDayRange = (phases: Phase[], phaseIndex: number) => {
  const priorDays = phases
    .slice(0, phaseIndex)
    .reduce((sum, phase) => sum + getPhaseDurationInDays(phase), 0)
  const startDay = priorDays + 1
  const duration = getPhaseDurationInDays(phases[phaseIndex])
  const endDay = duration > 0 ? startDay + duration - 1 : undefined

  return { startDay, endDay }
}

const getPhaseDayRangeLabel = (phases: Phase[], phaseIndex: number) => {
  const { startDay, endDay } = getPhaseDayRange(phases, phaseIndex)

  if (typeof endDay !== "number" || endDay === startDay) {
    return `Day ${startDay}`
  }

  return `Day ${startDay} - Day ${endDay}`
}

const getPhaseSearchTargetId = (phaseIndex: number) =>
  `project-scope-phase-${phaseIndex}`

const getTaskSearchTargetId = (phaseIndex: number, rowIndex: number) =>
  `project-scope-phase-${phaseIndex}-task-${rowIndex}`

const normalizeSearchText = (value?: string) =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim()

const numberToWord = (num: number) => {
  const words = [
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
  ]
  return words[num] || num + 1 // fallback for numbers > 10
}

// ─── Roles ──────────────────────────────────────────────────────────────

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Database Administrator",
  "Security Engineer",
  "Mobile Developer",
  "QA Engineer",
  "System Architect",
  "Network Engineer",
  "Site Reliability Engineer (SRE)",
  "Software Engineer",
  "UI/UX Designer",
  "Graphic Designer",
  "Product Designer",
  "Interaction Designer",
  "Visual Designer",
  "Motion Designer",
  "Web Designer",
  "Brand Designer",
  "Illustrator",
  "Information Architect",
  "User Researcher",
  "Content Strategist",
  "Design Technologist",
  "Experience Designer",
  "Service Designer",
]

// ─── State types ────────────────────────────────────────────────────────

type PhaseNameDialogAction =
  | {
      type: "TOGGLE"
      payload?: {
        open?: boolean
        addTo?: "start" | "end" | "below"
        targetPhaseIndex?: number
      }
    }
  | { type: "EDIT"; payload: number }

type PhaseNameDialogState = {
  open: boolean
  editingPhaseIndex: number | null
  action: "EDIT" | null
  addTo: "start" | "end" | "below"
}

const phaseNameDialogReducer = (
  state: PhaseNameDialogState,
  action: PhaseNameDialogAction
): PhaseNameDialogState => {
  switch (action.type) {
    case "TOGGLE":
      const { payload } = action
      return {
        ...state,
        action: null,
        editingPhaseIndex:
          typeof payload?.targetPhaseIndex === "number"
            ? payload.targetPhaseIndex
            : null,
        open: typeof payload?.open === "boolean" ? payload.open : !state.open,
        addTo: typeof payload?.addTo === "string" ? payload.addTo : "end",
      }
    case "EDIT":
      return {
        ...state,
        addTo: "end",
        action: "EDIT",
        open: true,
        editingPhaseIndex: action.payload,
      }

    default:
      return state
  }
}

const defaultPhaseNameDialogState: PhaseNameDialogState = {
  action: null,
  editingPhaseIndex: null,
  open: false,
  addTo: "end",
}

type TaskDialogState = {
  open: boolean
  editingPhaseIndex: number | null
}

interface DurationDialogState extends TaskDialogState {
  editingPhaseRowIndex: number | null
}

type DeletePhaseDialogState = {
  open: boolean
  phaseIndex: number | null
}

// ─── Duration form types ────────────────────────────────────────────────

type DurationFormValues = {
  duration: {
    value: number
    type: "days" | "weeks" | "hours"
  }
}

interface DurationDialogProps {
  open: boolean
  durationFormValues?: DurationFormValues
  onDurationFormValuesChange: (values: DurationFormValues) => void
  onOpenChange: (open: boolean) => void
}

// ─── Sub-components ─────────────────────────────────────────────────────

const ProjectScopeTip = ({
  showArrow,
  closeTrigger,
  className,
}: {
  showArrow?: boolean
  closeTrigger?: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}

      {closeTrigger}

      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-normal font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-normal block text-dark-blue-400">
          Clarify phases, owners, and deliverables.
        </span>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Ensure all phases and tasks align with your project goals and
            deliverables.
          </li>
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Review dependencies, timelines, and assignments for clarity.
          </li>
        </ul>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-3 px-0" variant="link" type="button">
            <PlayCircle className="size-5" /> Show me how
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Project Scope Tip Video</DialogTitle>
          </DialogHeader>
          {PROJECT_SCOPE_TIP_VIDEO_URL ? (
            <ReactPlayer
              controls
              width="100%"
              height={300}
              url={PROJECT_SCOPE_TIP_VIDEO_URL}
            />
          ) : (
            <p className="text-sm text-gray-500">
              Tip video URL is not configured yet. Add
              `NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL` in `.env`.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-normal text-gray-500">
            Use the project planner to edit existing phases or tasks
            effortlessly.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Double-check for any overlapping or missing tasks to maintain
            efficiency.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Add new phases, tasks, or processes quickly with the + Add option.
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Leaving phases or tasks incomplete or ambiguous.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Try not to overload a single phase with too many tasks; break them
            down if needed.
          </li>
        </ul>
      </div>
    </div>
  )
}

const PhaseNameDialog = ({
  onOpenChange,
  onAddPhaseName,
  open,
  defaultName,
  placeholder = "Enter Phase Name",
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAddPhaseName: (phaseName: string) => void
  defaultName?: string
  placeholder?: string
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PhaseNameFormValues>({
    resolver: zodResolver(phaseNameFormSchema),
    defaultValues: { name: defaultName ?? "" },
  })

  // whenever dialog opens for a different phase, sync the input
  useEffect(() => {
    if (isOpen) {
      reset({ name: defaultName ?? "" })
    }
  }, [isOpen, defaultName, reset])

  const onSubmit: SubmitHandler<PhaseNameFormValues> = (values) => {
    const { name } = values
    onAddPhaseName(name)

    toggleIsOpen(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
          <form
            className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="phase-name"
                className="text-dark-blue-400"
                size="sm"
              >
                Phase Name
              </Label>
              <Input
                id="phase-name"
                className="text-gray-900"
                placeholder={placeholder}
                {...register("name")}
                isInvalid={hookFormHasError({ errors, name: "name" })}
              />
              <HookFormErrorMessage
                errors={errors}
                name="name"
                render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
              />
            </div>

            <DialogFooter className="mt-8 grid gap-x-3">
              <DialogClose asChild>
                <Button type="button" variant="outlined" visual="gray">
                  Cancel
                </Button>
              </DialogClose>

              <Button>Done</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

const TaskDialog = ({
  open,
  onOpenChange,
  onAddTask,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onAddTask: (values: TaskFormValues) => void
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      task: "",
      role: "",
      location: "",
      experience: undefined,
      duration: {
        type: "days",
        value: 1,
      },
    },
  })
  const taskDurationValue = useWatch({
    control,
    name: "duration.value",
    defaultValue: 1,
  })
  const onSubmit: SubmitHandler<TaskFormValues> = (values) => {
    onAddTask(values)
    toggleIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <form
          className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-name" className="text-gray-700" size="sm">
              Task Name
            </Label>
            <Input
              id="task-name"
              className="text-gray-900"
              {...register("task")}
              isInvalid={hookFormHasError({ errors, name: "task" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="task"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="duration" className="text-gray-700" size="sm">
              Duration
            </Label>
            <div className="grid grid-cols-2 gap-x-3">
              <Input
                id="duration"
                className="text-gray-900"
                type="number"
                min={1}
                {...register("duration.value")}
                isInvalid={hookFormHasError({ errors, name: "duration.value" })}
              />
              <Controller
                control={control}
                name="duration.type"
                render={({ field: { value, onChange } }) => (
                  <Listbox value={value} onChange={onChange} id="duration">
                    <ListboxButton placeholder="Select">
                      {({ value: selectedValue }) =>
                        formatDurationUnit(
                          Number(taskDurationValue) || 0,
                          selectedValue as (typeof DURATION_TYPE)[number]
                        ).replace(/^./, (character) => character.toUpperCase())
                      }
                    </ListboxButton>
                    <ListboxOptions>
                      {DURATION_TYPE.map((format) => (
                        <ListboxOption key={format} value={format}>
                          {formatDurationUnit(
                            Number(taskDurationValue) || 0,
                            format
                          ).replace(/^./, (character) =>
                            character.toUpperCase()
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Listbox>
                )}
              />
            </div>

            {(hookFormHasError({ errors, name: "duration.value" }) ||
              hookFormHasError({
                errors,
                name: "duration.type",
              })) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message") ||
                  get(errors, "duration.type.message")}
              </ErrorMessage>
            )}
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="role-name" className="text-gray-700" size="sm">
              Role
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange } }) => (
                <OwnCombobox
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select role"
                  options={ROLES}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="role"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="location" className="text-gray-700" size="sm">
              Location
            </Label>
            <Controller
              control={control}
              name="location"
              render={({ field: { value, onChange } }) => (
                <CountriesCombobox
                  placeholder="Select country"
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="location"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="experience" className="text-gray-700" size="sm">
              Experience
            </Label>
            <Controller
              control={control}
              name="experience"
              render={({ field: { value, onChange } }) => (
                <Dropdown
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select experience"
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="experience"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" type="button" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button>Done</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const TaskSearchDialog = ({
  open,
  onOpenChange,
  phases,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  phases: Phase[]
}) => {
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  const [query, setQuery] = useState("")

  const searchableItems = useMemo(
    () =>
      phases.flatMap((phase, phaseIndex) => {
        const phaseLabel = `Phase ${phaseIndex + 1}: ${phase.phaseName || "Untitled"}`
        const rows = Array.isArray(phase.rows) ? phase.rows : []
        const tasks = rows.map((row, rowIndex) => ({
          label: `Task ${rowIndex + 1}: ${row.task}`,
        }))
        return [{ label: phaseLabel }, ...tasks]
      }),
    [phases]
  )

  const filteredItems = useMemo(() => {
    if (!query.trim()) return searchableItems
    const normalized = query.trim().toLowerCase()
    return searchableItems.filter((item) =>
      item.label.toLowerCase().includes(normalized)
    )
  }, [query, searchableItems])

  useEffect(() => {
    if (!isOpen) {
      setQuery("")
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[420px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Task Name</DialogTitle>
          <DialogDescription>
            Find a phase or task from your project scope.
          </DialogDescription>

          <div className="mt-3">
            <Input
              type="text"
              placeholder="Find a phase or task"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[240px] overflow-auto rounded-md border border-gray-200">
            {filteredItems.length ? (
              filteredItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  {item.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500">
                No phase or task found.
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
}: {
  onValueChange?: (value: ExperienceLevel | undefined) => void
  value?: ExperienceLevel
  placeholder?: string
}) => {
  const [state, setState] = useControllableState<ExperienceLevel | undefined>({
    onChange: onValueChange,
    value,
  })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => setState(nextValue as ExperienceLevel)}
        >
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Student"
          >
            <Network />
            Student (0 - 2 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Junior"
          >
            <Network1 />
            Junior (2 - 3 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Medior"
          >
            <Network2 />
            Medior (3 - 5 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Senior"
          >
            <Network3 />
            Senior (5 - 10 years)
          </DropdownMenuRadioItem>

          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Guru"
          >
            <Network4 />
            Guru (10+ years)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const DeletePhaseDialog = ({
  onOpenChange,
  open,
  onDeletePhase,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onDeletePhase: () => void
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Delete this phase</DialogTitle>
          <DialogDescription>
            This phase will be deleted permanently. You will not be able to
            recover it.
          </DialogDescription>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button
              onClick={() => {
                onDeletePhase()
                toggleIsOpen(false)
              }}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const MoreDropdown = (props: {
  openDeletePhaseDialog: () => void
  openPhaseDialog: () => void
  onChangeDuration: () => void
  onInsertBelow: () => void
  onInsertAbove: () => void
  onDuplicatePhase: () => void
  onSwapPhases: (to: number) => void
}) => {
  const {
    openDeletePhaseDialog,
    openPhaseDialog,
    onChangeDuration,
    onInsertAbove,
    onInsertBelow,
    onDuplicatePhase,
    onSwapPhases: onSwapPhasesProp,
  } = props
  const arrayNavigator = useArrayNavigationContext()
  const selectedIndex = arrayNavigator?.selectedIndex

  const onSwapPhases = useCallbackRef(onSwapPhasesProp)

  useUpdateEffect(() => {
    if (selectedIndex !== undefined) {
      onSwapPhases(selectedIndex)
    }
  }, [onSwapPhases, selectedIndex])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-[23px] px-1.5 py-1 text-gray-500"
          variant="ghost"
          visual="gray"
        >
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!arrayNavigator?.canMoveLeft}
          onSelect={arrayNavigator?.moveToLeft}
        >
          <ArrowUp className="h-4 w-4" /> Move Up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!arrayNavigator?.canMoveRight}
          onSelect={arrayNavigator?.moveToRight}
        >
          <ArrowDown className="h-4 w-4" /> Move Down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDuplicatePhase}>
          <Copy className="h-4 w-4" /> Duplicate Phase
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onInsertAbove}>
          <ArrowUpLeft className="h-4 w-4" /> Insert Phase Above
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onInsertBelow}>
          <ArrowDownLeft className="h-4 w-4" /> Insert Phase Below
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openPhaseDialog}>
          <Type className="h-4 w-4" /> Rename Phase
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onChangeDuration}>
          <Clock className="h-4 w-4" /> Change Duration
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem visual="destructive" onSelect={openDeletePhaseDialog}>
          <Trash2 className="h-4 w-4" /> Delete Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const PlusDropdown = ({
  addPhase,
  addTask,
}: {
  addTask: () => void
  addPhase: () => void
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton className="text-gray-500" variant="outlined" visual="gray">
          <Plus className="size-3" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto" align="end">
        <DropdownMenuItem onSelect={addTask}>
          <Plus className="size-4" /> Add Task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={addPhase}>
          <Plus className="h-4 w-4" /> Add Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Array Navigator ────────────────────────────────────────────────────

const useArrayNavigator = <T,>(items: T[], itemIndex: number) => {
  const [selectedIndex, setSelectedIndex] = useState(itemIndex)

  const canMoveLeft = itemIndex > 0
  const canMoveRight = itemIndex < items.length - 1

  const moveToLeft = useCallback(() => {
    if (canMoveLeft) {
      setSelectedIndex((prev) => prev - 1)
    }
  }, [canMoveLeft])

  const moveToRight = useCallback(() => {
    if (canMoveRight) {
      setSelectedIndex((prev) => prev + 1)
    }
  }, [canMoveRight])

  return useMemo(
    () => ({
      moveToRight,
      moveToLeft,
      canMoveLeft,
      canMoveRight,
      selectedIndex,
    }),
    [moveToRight, moveToLeft, canMoveLeft, canMoveRight, selectedIndex]
  )
}

const [ArrayNavigatorProvider, useArrayNavigationContext] = createStrictContext<
  ReturnType<typeof useArrayNavigator>
>({
  displayName: "ArrayNavigatorContext",
  errorMessage: `useArrayNavigatorContext returned is 'undefined'. Seems you forgot to wrap the components in "<ArrayNavigator />"`,
})

const ArrayNavigator = ({
  children,
  value,
  index,
}: {
  children?: React.ReactNode
  value: { phaseName?: string; rows?: PhaseRow[] }[]
  index: number
}) => {
  const arrayNavigation = useArrayNavigator(value, index)
  return (
    <ArrayNavigatorProvider value={arrayNavigation}>
      {children}
    </ArrayNavigatorProvider>
  )
}

// ─── Table components ───────────────────────────────────────────────────

interface PhaseTableRowProps {
  row: Row<PhaseRow>
}

const PhaseTableRow = ({ row }: PhaseTableRowProps) => {
  const { transform, transition, setNodeRef, isDragging, isOver } = useSortable(
    {
      id: row.original.id,
    }
  )

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform), //let dnd-kit do its thing
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  }

  return (
    <TableRow
      className={cn(
        "group/row hover:bg-transparent relative",
        isOver &&
          "after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary-500"
      )}
      ref={setNodeRef}
      style={style}
    >
      {row.getVisibleCells().map((cell) => (
        <Fragment key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </Fragment>
      ))}
    </TableRow>
  )
}

const RowDragHandleCell = ({ rowId }: { rowId: string }) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  })
  return (
    <button
      className="focus-visible:outline-none transition duration-300 group-hover/row:opacity-100 opacity-0 text-gray-900/50 hover:text-gray-900"
      {...attributes}
      {...listeners}
    >
      <GripVertical2 />
    </button>
  )
}

const columnHelper = createColumnHelper<PhaseRow>()

const columns = [
  columnHelper.accessor("task", {
    cell: ({ getValue, row: { id } }) => (
      <TableCell className="py-4 px-6 max-w-[220px]">
        <span className="inline-flex items-center gap-x-1.5 max-w-full">
          <RowDragHandleCell rowId={id} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {getValue()}
          </span>
        </span>
      </TableCell>
    ),
    header: "Task Name",
  }),
  columnHelper.accessor("role", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState({
        defaultValue: getValue(),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      })

      return (
        <TableCell className="py-4 px-6 max-w-[180px]">
          <OwnCombobox
            value={value}
            onValueChange={setValue}
            placeholder="Add Role"
            options={table.options.meta?.roles}
            triggerClassName="max-w-full truncate"
          />
        </TableCell>
      )
    },
    header: "Role",
  }),
  columnHelper.accessor("location", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState({
        defaultValue: getValue(),
        onChange: () => {
          table.options.meta?.updateData(index, id, value)
        },
      })
      return (
        <TableCell className="px-3 py-4 max-w-[160px]">
          <CountriesCombobox
            placeholder="Location"
            value={value}
            onValueChange={setValue}
          />
        </TableCell>
      )
    },
    header: "Location",
  }),
  columnHelper.accessor("experience", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState<
        ExperienceLevel | undefined
      >({
        defaultValue: getValue(),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      })
      return (
        <TableCell className="py-4 px-6 max-w-[150px]">
          <Dropdown
            placeholder="Experience"
            value={value}
            onValueChange={(nextValue) => {
              if (!nextValue) return
              setValue(nextValue)
            }}
          />
        </TableCell>
      )
    },
    header: "Experience",
  }),
  columnHelper.accessor("duration", {
    cell: ({ getValue, table, row: { index } }) => (
      <TableCell className="py-4 px-3 text-right">
        <button
          className="focus-visible:outline-none truncate text-sm"
          type="button"
          onClick={() => table.options.meta?.openDurationDialog(index)}
        >
          {getValue().value}{" "}
          {formatDurationUnit(getValue().value, getValue().type)}
        </button>
      </TableCell>
    ),
    header: "Duration",
  }),
]

interface PhaseTableProps {
  rows: PhaseRow[]
  onRowsChange: (rows: PhaseRow[]) => void
  openDurationDialog: (index: number) => void
}

const PhaseTable = ({
  rows,
  onRowsChange,
  openDurationDialog,
}: PhaseTableProps) => {
  const [data, setData] = useControllableState({
    value: rows,
    onChange: onRowsChange,
  })

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
    meta: {
      updateData: (rowIndex, columnId, value) => {
        setData((prev) =>
          prev.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              }
            }
            return row
          })
        )
      },
      openDurationDialog,
      roles: ROLES,
    },
  })

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data]
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <Table className="table-fixed w-full">
        <colgroup>
          <col className="w-[28%]" />
          <col className="w-[24%]" />
          <col className="w-[20%]" />
          <col className="w-[18%]" />
          <col className="w-[10%]" />
        </colgroup>
        <TableHeader className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <SortableContext
            items={dataIds}
            strategy={verticalListSortingStrategy}
          >
            {table.getRowModel().rows.map((row) => (
              <PhaseTableRow key={row.id} row={row} />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}

// ─── Duration Dialog ────────────────────────────────────────────────────

const DurationDialog = ({
  open,
  durationFormValues,
  onDurationFormValuesChange,
  onOpenChange,
}: DurationDialogProps) => {
  const { control, handleSubmit, reset } = useForm<DurationFormValues>({
    defaultValues: durationFormValues || {
      duration: { value: 1, type: "days" },
    },
    values: durationFormValues,
  })
  const selectedDurationValue = useWatch({
    control,
    name: "duration.value",
    defaultValue: 1,
  })

  React.useEffect(() => {
    if (open && durationFormValues) {
      reset(durationFormValues)
    }
  }, [open, durationFormValues, reset])

  const onSubmit = (data: DurationFormValues) => {
    onDurationFormValuesChange(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Duration</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <Controller
              name="duration.value"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  className="w-24"
                  placeholder="Value"
                />
              )}
            />
            <Controller
              name="duration.type"
              control={control}
              render={({ field }) => (
                <select {...field} className="border rounded px-2 py-1">
                  <option value="days">
                    {formatDurationUnit(
                      Number(selectedDurationValue) || 0,
                      "days"
                    ).replace(/^./, (character) => character.toUpperCase())}
                  </option>
                  <option value="weeks">
                    {formatDurationUnit(
                      Number(selectedDurationValue) || 0,
                      "weeks"
                    ).replace(/^./, (character) => character.toUpperCase())}
                  </option>
                  <option value="hours">
                    {formatDurationUnit(
                      Number(selectedDurationValue) || 0,
                      "hours"
                    ).replace(/^./, (character) => character.toUpperCase())}
                  </option>
                </select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ScopeBuilder component ────────────────────────────────────────

export interface ScopeBuilderProps {
  phases?: Phase[]
  onPhasesChange?: (phases: Phase[]) => void
  /** When true, renders without the ScrollArea wrapper and tip sidebar (for embedding in other pages) */
  embedded?: boolean
}

export function ScopeBuilder({ phases: initialPhases, onPhasesChange, embedded }: ScopeBuilderProps) {
  const { toast } = useToast()
  const lastUndo = useRef<null | (() => void)>(null)
  const [taskDialogState, setTaskDialogState] = useState<TaskDialogState>({
    editingPhaseIndex: null,
    open: false,
  })
  const [durationDialogState, setDurationDialogState] =
    useState<DurationDialogState>({
      editingPhaseIndex: null,
      editingPhaseRowIndex: null,
      open: false,
    })
  const [phaseDialogState, dispatch] = useReducer(
    phaseNameDialogReducer,
    defaultPhaseNameDialogState
  )
  const [accordionState, setAccordionState] = useState(["item-0"])

  // Local state for phases — replaces useProjectScopeContext
  const [phases, setPhases] = useControllableState<Phase[]>({
    defaultValue: initialPhases ?? [{ phaseName: "" }],
    value: initialPhases,
    onChange: (value) => {
      onPhasesChange?.(value)
      expandAll()
    },
  })

  // Task search dialog state — managed internally
  const [isTaskSearchDialogOpen, setTaskSearchDialogOpen] = useState(false)

  const [deletePhaseDialogState, setDeletePhaseDialogState] =
    useState<DeletePhaseDialogState>({
      phaseIndex: null,
      open: false,
    })

  const expandAll = useCallback(() => {
    setAccordionState(phases.map((_, index) => `item-${index}`))
  }, [phases])

  const collapseAll = useCallback(() => {
    setAccordionState([])
  }, [])

  const handleOpenTaskDialog = useCallback(
    (phaseIndex: number) => {
      const { phaseName } = phases[phaseIndex]

      if (!phaseName) {
        dispatch({ type: "EDIT", payload: phaseIndex })
      } else {
        setTaskDialogState({
          open: true,
          editingPhaseIndex: phaseIndex,
        })
      }
    },
    [phases]
  )

  const handleRowsChange = useCallback(
    (phaseIndex: number, rows: PhaseRow[]) => {
      setPhases((prev) =>
        prev.map((phase, index) => {
          if (index === phaseIndex) {
            return {
              ...phase,
              rows,
            }
          }
          return phase
        })
      )
    },
    [setPhases]
  )

  const handleSwapPhases = useCallback(
    (from: number, to: number) => {
      setPhases((prev) => arrayMove(prev, from, to))
    },
    [setPhases]
  )

  // Helper to show success toast with Undo
  const pushSuccess = useCallback(
    (label: string, onUndo?: () => void) => {
      toast({
        variant: "success",
        title: label,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => onUndo?.()}
          >
            Undo
          </ToastAction>
        ),
      })
    },
    [toast]
  )

  const onAddPhaseName = useCallback(
    (phaseName: string) => {
      const { action, editingPhaseIndex, addTo } = phaseDialogState

      if (action === "EDIT" && typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const oldName = prev[editingPhaseIndex]?.phaseName ?? ""
          const nextState = prev.map((item, index) =>
            index === editingPhaseIndex ? { ...item, phaseName } : item
          )

          // prepare undo: restore old name
          lastUndo.current = () =>
            setPhases((s) =>
              s.map((p, i) =>
                i === editingPhaseIndex ? { ...p, phaseName: oldName } : p
              )
            )

          // Toast
          toast({
            variant: "success",
            title: "Phase Renamed",
            action: (
              <ToastAction
                altText="Undo"
                className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                onClick={() => {
                  lastUndo.current?.()
                  lastUndo.current = null
                }}
              >
                Undo
              </ToastAction>
            ),
          })

          return nextState
        })

        return
      }

      // Do the add
      let insertedPhaseIndex = 0
      setPhases((prev) => {
        const next = [...prev]
        const hasTargetPhase =
          typeof editingPhaseIndex === "number" &&
          editingPhaseIndex >= 0 &&
          editingPhaseIndex < next.length

        insertedPhaseIndex =
          addTo === "start" && hasTargetPhase
            ? editingPhaseIndex
            : addTo === "below" && hasTargetPhase
              ? editingPhaseIndex + 1
              : next.length

        next.splice(insertedPhaseIndex, 0, { phaseName })
        return next
      })

      // Prepare Undo for this action
      lastUndo.current = () =>
        setPhases((prev) =>
          prev.filter((_, index) => index !== insertedPhaseIndex)
        )

      // Toast
      const phaseAddedTitle =
        addTo === "start"
          ? "Phase Added Above"
          : addTo === "below"
            ? "Phase Added Below"
            : "Phase Added"

      toast({
        variant: "success",
        title: phaseAddedTitle,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => {
              lastUndo.current?.()
              lastUndo.current = null // clear after use
            }}
          >
            Undo
          </ToastAction>
        ),
      })
    },
    [phaseDialogState, setPhases, toast]
  )

  const onAddTask = useCallback(
    (values: TaskFormValues) => {
      const { editingPhaseIndex } = taskDialogState

      if (typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const newPhases = prev.map((phase, index) => {
            if (index === editingPhaseIndex) {
              const newRow = { ...values, id: `${getId()}` }
              const { rows } = phase

              return {
                ...phase,
                rows: rows ? [...rows, newRow] : [newRow],
              }
            }
            return phase
          })

          return newPhases
        })
      }
    },
    [taskDialogState, setPhases]
  )

  const onDurationFormValuesChange = useCallback(
    (durationFormValues: DurationFormValues) => {
      const { editingPhaseIndex: pIdx, editingPhaseRowIndex: rIdx } =
        durationDialogState
      if (typeof pIdx !== "number" || typeof rIdx !== "number") return

      // we'll detect if anything actually changed, capture a snapshot for Undo,
      // then show the toast.
      let didChange = false
      let oldRowSnapshot: any = null

      setPhases((prev) => {
        const phase = prev[pIdx]
        const rows = phase?.rows ?? []
        const oldRow = rows[rIdx] ?? {}

        // shallow-compare only keys present in durationFormValues
        didChange = Object.keys(durationFormValues).some(
          (k) => (oldRow as any)?.[k] !== (durationFormValues as any)[k]
        )
        if (!didChange) return prev

        oldRowSnapshot = oldRow

        const newRows = rows.map((row, i) =>
          i === rIdx ? { ...row, ...durationFormValues } : row
        )
        const newPhases = prev.map((ph, i) =>
          i === pIdx ? { ...ph, rows: newRows } : ph
        )

        // prepare Undo: restore the old row snapshot
        lastUndo.current = () =>
          setPhases((s) => {
            const sPhase = s[pIdx]
            const sRows = (sPhase?.rows ?? []).slice()
            sRows[rIdx] = oldRowSnapshot
            const out = s.slice()
            out[pIdx] = { ...sPhase, rows: sRows }
            return out
          })

        return newPhases
      })

      if (didChange) {
        toast({
          variant: "success",
          title: "Duration Changed",
          action: (
            <ToastAction
              altText="Undo"
              className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
              onClick={() => {
                lastUndo.current?.()
                lastUndo.current = null
              }}
            >
              Undo
            </ToastAction>
          ),
        })
      }
    },
    [durationDialogState, setPhases, toast]
  )

  const durationFormValues = useMemo(() => {
    const { editingPhaseIndex, editingPhaseRowIndex } = durationDialogState
    if (
      typeof editingPhaseIndex === "number" &&
      typeof editingPhaseRowIndex === "number"
    ) {
      const { rows } = phases[editingPhaseIndex]
      const { duration } = (rows ?? [])[editingPhaseRowIndex]

      return {
        duration: { ...duration },
      }
    }
  }, [durationDialogState, phases])

  const onDeletePhase = useCallback(
    (id: string) => {
      setPhases((prev) => {
        const idx = prev.findIndex(
          (p, i) => String(i) === id || (p as any).id === id
        )
        if (idx < 0) return prev
        const removed = prev[idx]

        // prepare undo: reinsert at same index
        lastUndo.current = () =>
          setPhases((s) => {
            const next = [...s]
            next.splice(idx, 0, removed)
            return next
          })

        // do delete
        const next = [...prev]
        next.splice(idx, 0) // no-op to satisfy TS if needed
        return prev.filter((_, i) => i !== idx)
      })

      pushSuccess("Phase Deleted", lastUndo.current || undefined)
      lastUndo.current = null
    },
    [pushSuccess, setPhases]
  )

  const handleOpenDeletePhaseDialog = useCallback((phaseIndex: number) => {
    setDeletePhaseDialogState({
      phaseIndex,
      open: true,
    })
  }, [])

  const handleOpenPhaseDurationDialog = useCallback(
    (phaseIndex: number) => {
      const rows = phases[phaseIndex]?.rows ?? []
      if (!rows.length) {
        toast({
          title: "Please add at least 1 task before changing duration",
          variant: "destructive",
        })
        return
      }
      setDurationDialogState({
        editingPhaseIndex: phaseIndex,
        editingPhaseRowIndex: 0,
        open: true,
      })
    },
    [phases, toast]
  )

  const onDuplicatePhase = useCallback(
    (idx: number) => {
      setPhases((prev) => {
        const source = prev[idx]
        if (!source) return prev
        const dup = { ...source } // add new id if you have ids
        const next = [...prev]
        next.splice(idx + 1, 0, dup)

        // undo: remove the new duplicate at idx+1
        lastUndo.current = () =>
          setPhases((s) => s.filter((_, i) => i !== idx + 1))

        return next
      })

      pushSuccess("Phase Duplicated", lastUndo.current || undefined)
      lastUndo.current = null
    },
    [pushSuccess, setPhases]
  )

  const currentPhaseName =
    phaseDialogState.action === "EDIT" &&
    typeof phaseDialogState.editingPhaseIndex === "number"
      ? (phases[phaseDialogState.editingPhaseIndex]?.phaseName ?? "")
      : ""

  const coreContent = (
          <div className="space-y-6 flex-auto min-w-0">
            <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
              <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
                Project Scope
              </h1>

              <div className="flex items-center md:gap-x-3">
                <div className="flex items-center">
                  <Button
                    className="border-r-0 rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    onClick={expandAll}
                  >
                    <ChevronsDown className="size-[15px]" /> Expand All
                  </Button>
                  <Button
                    className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    onClick={collapseAll}
                  >
                    <ChevronsUp className="size-[15px]" /> Collapse All
                  </Button>
                </div>

                <Button
                  className="border-l-0 rounded-l-none md:border-l md:rounded-l-[5px]"
                  variant="outlined"
                  visual="gray"
                  onClick={() => dispatch({ type: "TOGGLE" })}
                >
                  <Plus className="size-[15px]" /> Add Phase
                </Button>
              </div>
            </div>

            <InputGroup>
              <Input type="text" placeholder="Find a phase or task" />
              <InputLeftElement>
                <SearchMd className="text-gray-500 h-5 w-5" />
              </InputLeftElement>
            </InputGroup>

            <Accordion
              value={accordionState}
              onValueChange={setAccordionState}
              type="multiple"
              className="flex-auto space-y-3"
            >
              {phases.map(({ phaseName, rows }, index) => (
                <ArrayNavigator key={index} value={phases} index={index}>
                  {rows ? (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                Phase {numberToWord(index)}{" "}
                                <button
                                  type="button"
                                  className="font-light hover:underline focus-visible:outline-none"
                                  onClick={() =>
                                    dispatch({
                                      type: "EDIT",
                                      payload: index,
                                    })
                                  }
                                >
                                  {phaseName}
                                </button>
                              </span>
                            </div>

                            <div className="inline-flex items-center justify-start gap-x-2 pl-10 md:w-[118px] md:pl-0">
                              <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                {getPhaseDayRangeLabel(phases, index)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
                              openPhaseDialog={() =>
                                dispatch({ type: "EDIT", payload: index })
                              }
                              onChangeDuration={() =>
                                handleOpenPhaseDurationDialog(index)
                              }
                              openDeletePhaseDialog={() =>
                                handleOpenDeletePhaseDialog(index)
                              }
                              onInsertAbove={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "start",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onInsertBelow={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "below",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onDuplicatePhase={() => onDuplicatePhase(index)}
                            />
                            <PlusDropdown
                              addTask={() => handleOpenTaskDialog(index)}
                              addPhase={() => dispatch({ type: "TOGGLE" })}
                            />
                          </div>
                        </div>

                        <DisclosureContent className="overflow-hidden">
                          <PhaseTable
                            rows={rows}
                            onRowsChange={(rows) =>
                              handleRowsChange(index, rows)
                            }
                            openDurationDialog={(editingPhaseRowIndex) =>
                              setDurationDialogState({
                                editingPhaseIndex: index,
                                editingPhaseRowIndex,
                                open: true,
                              })
                            }
                          />
                        </DisclosureContent>
                      </div>
                    </AccordionItem>
                  ) : (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <div className="inline-flex md:flex-row gap-x-1.5 flex-col md:items-center gap-y-3 md:gap-x-5">
                                <span className="text-base md:text-[18px] font-semibold md:font-light leading-7 text-gray-900">
                                  Phase {numberToWord(index)}
                                </span>{" "}
                                {phaseName ? (
                                  <button
                                    type="button"
                                    className="text-lg leading-8 font-semibold text-gray-900 hover:underline focus-visible:outline-none"
                                    onClick={() =>
                                      dispatch({
                                        type: "EDIT",
                                        payload: index,
                                      })
                                    }
                                  >
                                    {phaseName}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="focus-visible:outline-none inline-flex items-center gap-x-2"
                                    onClick={() =>
                                      dispatch({
                                        type: "EDIT",
                                        payload: index,
                                      })
                                    }
                                  >
                                    <Edit03 className="size-[15px] text-gray-800" />
                                    <span className="inline-block text-sm leading-5 font-semibold text-gray-800">
                                      Edit Phase Name
                                    </span>
                                  </button>
                                )}
                                <div className="inline-block md:hidden">
                                  <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                    {getPhaseDayRangeLabel(phases, index)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden items-center justify-start gap-x-2 pl-10 md:inline-flex md:w-[118px] md:pl-0">
                              <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                {getPhaseDayRangeLabel(phases, index)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
                              openPhaseDialog={() =>
                                dispatch({ type: "EDIT", payload: index })
                              }
                              onChangeDuration={() =>
                                handleOpenPhaseDurationDialog(index)
                              }
                              openDeletePhaseDialog={() =>
                                handleOpenDeletePhaseDialog(index)
                              }
                              onInsertAbove={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "start",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onInsertBelow={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "below",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onDuplicatePhase={() => onDuplicatePhase(index)}
                            />
                            <PlusDropdown
                              addTask={() => handleOpenTaskDialog(index)}
                              addPhase={() => dispatch({ type: "TOGGLE" })}
                            />
                          </div>
                        </div>
                        <DisclosureContent className="overflow-auto">
                          <div className="w-full overflow-auto flex border-t border-gray-200 flex-col justify-center min-h-[208px] md:min-h-[228px]">
                            <div className="max-w-[352px] mx-auto">
                              <h1 className="text-base font-semibold text-center leading-6 text-gray-800">
                                {index === 0
                                  ? "Create your first task"
                                  : "Create a task"}
                              </h1>
                              <p className="text-sm mt-1 leading-5 text-center text-gray-800">
                                {index === 0
                                  ? "Start defining your project scope with a clear, actionable step."
                                  : "Define your project scope with a clear, actionable step."}
                              </p>
                              <div className="mt-6 flex justify-center">
                                <Button
                                  className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                                  onClick={() => handleOpenTaskDialog(index)}
                                >
                                  <Plus className="size-[15px]" />
                                  Add Task
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DisclosureContent>
                      </div>
                    </AccordionItem>
                  )}
                </ArrayNavigator>
              ))}
            </Accordion>

            <Button
              className="mt-5"
              variant="ghost"
              visual="gray"
              onClick={() => dispatch({ type: "TOGGLE" })}
            >
              <Plus className="size-[15px]" /> Add Phase
            </Button>

            <PhaseNameDialog
              onOpenChange={(open) =>
                dispatch({ type: "TOGGLE", payload: { open } })
              }
              open={phaseDialogState.open}
              onAddPhaseName={onAddPhaseName}
              defaultName={currentPhaseName}
              placeholder={
                phaseDialogState.action === "EDIT"
                  ? "Edit Phase name"
                  : "Enter Phase Name"
              }
            />

            <TaskDialog
              open={taskDialogState.open}
              onOpenChange={(open) =>
                setTaskDialogState((prev) => ({
                  ...prev,
                  open,
                  editingPhaseIndex: null,
                }))
              }
              onAddTask={onAddTask}
            />
            <DurationDialog
              durationFormValues={durationFormValues}
              open={durationDialogState.open}
              onDurationFormValuesChange={onDurationFormValuesChange}
              onOpenChange={(open) =>
                setDurationDialogState({
                  editingPhaseIndex: null,
                  editingPhaseRowIndex: null,
                  open,
                })
              }
            />
            <DeletePhaseDialog
              open={deletePhaseDialogState.open}
              onOpenChange={(open) =>
                setDeletePhaseDialogState({
                  phaseIndex: null,
                  open,
                })
              }
              onDeletePhase={() => {
                if (deletePhaseDialogState.phaseIndex !== null) {
                  onDeletePhase(String(deletePhaseDialogState.phaseIndex))
                }
              }}
            />
            <TaskSearchDialog
              open={isTaskSearchDialogOpen}
              onOpenChange={setTaskSearchDialogOpen}
              phases={phases}
            />
          </div>
  )

  if (embedded) {
    return (
      <>
        {coreContent}
        <Toaster />
      </>
    )
  }

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] min-[1024px]:flex space-y-10 min-[1024px]:space-y-0 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    A great title gives your audience a reason to open your
                    project
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" type="button">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <ProjectScopeTip
                      className="w-full"
                      closeTrigger={
                        <DialogClose asChild>
                          <IconButton
                            className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                            variant="light"
                            visual="gray"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {coreContent}

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectScopeTip showArrow />
          </div>
        </div>
      </ScrollArea>
      <Toaster />
    </>
  )
}

export default ScopeBuilder
