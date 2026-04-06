"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  CreateEducationData,
  CreateExperienceData,
  UserAPI,
} from "@/service/http/user"
import { cn, hookFormHasError } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  DotsHorizontal,
  Edit03,
  Info,
  LogOut,
  MarkerPin02,
  Plus,
  SearchMd,
  Trash03,
  UserPlus,
  X,
  X2,
  XCircle,
} from "@blend-metrics/icons"
import { AlertCircle } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import CurrencyInput from "react-currency-input-field"
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form"
import { usePrevious } from "react-use"
import { z } from "zod"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
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
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Textarea,
  inputVariants,
} from "@/components/ui"

// ─── MONTHS ──────────────────────────────────────────────────────────────────

export const months = [
  { name: "January", value: 1 },
  { name: "February", value: 2 },
  { name: "March", value: 3 },
  { name: "April", value: 4 },
  { name: "May", value: 5 },
  { name: "June", value: 6 },
  { name: "July", value: 7 },
  { name: "August", value: 8 },
  { name: "September", value: 9 },
  { name: "October", value: 10 },
  { name: "November", value: 11 },
  { name: "December", value: 12 },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 60 }, (_, i) => currentYear - i)

// ─── ABOUT ME DIALOG ─────────────────────────────────────────────────────────

const aboutMeFormSchema = z.object({
  aboutMe: z.string().min(1, "Please enter at least 1 character(s)"),
})

type AboutMeFormValues = z.infer<typeof aboutMeFormSchema>

export function AboutMeDialog({
  opened,
  onOpenedChange,
  initialBio,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  initialBio?: string
  onSaved?: (bio: string) => void
}) {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const {
    register,
    formState: { errors, isValid, isDirty },
    handleSubmit,
    reset,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: { aboutMe: initialBio ?? "" },
  })

  const onSubmit: SubmitHandler<AboutMeFormValues> = async (values) => {
    try {
      await UserAPI.updateBio({ bio: values.aboutMe })
      onSaved?.(values.aboutMe)
      setOpen(false)
    } catch {
      // keep dialog open on error
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  About Me
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Create a connection and let clients feel like they already
                  know you!
                </p>
              </div>

              <IconButton
                type="button"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
                variant="ghost"
                visual="gray"
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8">
              <Textarea
                className="h-[345px]"
                placeholder="Enter your bio here..."
                {...register("aboutMe")}
                isInvalid={hookFormHasError({ errors, name: "aboutMe" })}
              />
              <HookFormErrorMessage
                name="aboutMe"
                errors={errors}
                render={({ message }) => (
                  <ErrorMessage size="sm" className="mt-1.5">
                    {message}
                  </ErrorMessage>
                )}
              />
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <Button
              variant="link"
              visual="gray"
              type="button"
              onClick={() => setIsOpen(true)}
            >
              <X className="size-[15px]" />
              Cancel
            </Button>

            <Button disabled={!isValid} ref={submitTriggerRef}>
              Save
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Save About Me?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Do you want to save your information?
                  </DialogDescription>
                </div>
                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose
                    onClick={() => {
                      reset()
                      setOpen(false)
                    }}
                    asChild
                  >
                    <Button variant="link" visual="gray">
                      <X className="size-[15px]" /> Discard Changes
                    </Button>
                  </DialogClose>
                  <DialogClose
                    onClick={() => {
                      isValid
                        ? submitTriggerRef.current?.click()
                        : setIsOpen(false)
                    }}
                    asChild
                  >
                    <Button variant="outlined" visual="gray">
                      Yes, Save
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── MORE INFO DIALOG (Job Title + Rates) ────────────────────────────────────

const moreInfoFormSchema = z.object({
  jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  saveAsDefault: z.boolean(),
  clientRate: z.number({ message: "Please enter an amount" }),
  earning: z.number({ message: "Please enter an amount" }),
  fee: z.number({ message: "Please enter an amount" }),
})

export type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const moreInfoDefaults: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
}

function MoreInfoForm({
  onShow,
  onSubmit,
}: {
  onShow: () => void
  onSubmit: () => void
}) {
  const {
    control,
    formState: { errors, isValid },
    register,
    trigger,
  } = useFormContext<MoreInfoFormValues>()

  return (
    <div className="p-6 rounded-lg border-2 border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label size="sm" htmlFor="job-title-1">
            Job Title
          </Label>
          <div className="inline-flex items-center gap-x-1">
            <IconButton
              className="hover:bg-success-50 hover:text-success-500 rounded-full"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={() => (isValid ? onSubmit() : trigger())}
            >
              <Check className="size-4" />
            </IconButton>
            <IconButton
              className="hover:bg-error-50 hover:text-error-500 rounded-full"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={() => onShow()}
            >
              <Trash03 className="size-4" />
            </IconButton>
          </div>
        </div>

        <Input
          id="job-title-1"
          placeholder="e.g. Software Engineer"
          {...register("jobTitle")}
          isInvalid={hookFormHasError({ errors, name: "jobTitle" })}
        />
        <HookFormErrorMessage
          errors={errors}
          name="jobTitle"
          render={({ message }) => (
            <ErrorMessage size="sm">{message}</ErrorMessage>
          )}
        />
      </div>

      <div className="mt-3 flex items-center gap-x-3">
        <Controller
          control={control}
          name="saveAsDefault"
          render={({ field: { onChange, value } }) => (
            <Checkbox
              id="save-as-default"
              checked={value}
              onCheckedChange={onChange}
            />
          )}
        />
        <Label
          className="text-dark-blue-400"
          htmlFor="save-as-default"
          size="sm"
        >
          Save as default job title
        </Label>
      </div>

      <div className="space-y-6 mt-6">
        <div className="flex items-center gap-x-5">
          <div className="flex-auto space-y-[5px]">
            <h2 className="text-sm leading-none text-dark-blue-400">
              Client Rate
            </h2>
            <p className="text-xs leading-none text-dark-blue-400 font-light">
              This is what clients will see
            </p>
          </div>
          <div className="max-w-[292px] flex-auto">
            <div className="flex items-center gap-x-2 pr-4">
              <Label htmlFor="client-rate" className="sr-only">
                Client Rate
              </Label>
              <InputGroup>
                <InputLeftAddon className="inline-flex items-center gap-x-1">
                  USD
                  <Info className="size-4" />
                </InputLeftAddon>
                <Controller
                  control={control}
                  name="clientRate"
                  render={({ field: { value, onChange } }) => (
                    <CurrencyInput
                      id="client-rate"
                      className={cn(
                        inputVariants({
                          className: "text-right",
                          variant: hookFormHasError({
                            errors,
                            name: "clientRate",
                          })
                            ? "error"
                            : undefined,
                        })
                      )}
                      value={value ?? undefined}
                      intlConfig={{ locale: "en-US", currency: "USD" }}
                      onValueChange={(_, __, values) => onChange(values?.float)}
                      placeholder="$78"
                      decimalsLimit={0}
                    />
                  )}
                />
              </InputGroup>
              <span className="inline-block text-base text-gray-500">/hr</span>
            </div>
            <HookFormErrorMessage
              errors={errors}
              name="clientRate"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />
          </div>
        </div>

        <Alert>
          <AlertIcon>
            <AlertCircle className="h-5 w-5" />
          </AlertIcon>
          <AlertContent className="flex items-start gap-x-5">
            <div className="flex-auto">
              <AlertTitle className="text-gray-600">
                Marketeq Service Fee (20%)
              </AlertTitle>
              <AlertDescription>
                A 20% service fee is deducted from your client rate.
              </AlertDescription>
            </div>
            <div>
              <div className="inline-flex items-center gap-x-2">
                <Label htmlFor="fee" className="sr-only">
                  Fee
                </Label>
                <Controller
                  control={control}
                  name="fee"
                  render={({ field: { value, onChange } }) => (
                    <CurrencyInput
                      id="fee"
                      className={cn(
                        inputVariants({
                          className:
                            "text-right [field-sizing:content] pointer-events-none opacity-50",
                        })
                      )}
                      value={value ?? undefined}
                      intlConfig={{ locale: "en-US", currency: "USD" }}
                      onValueChange={(_, __, values) => onChange(values?.float)}
                      placeholder="$13"
                      decimalsLimit={0}
                    />
                  )}
                />
                <span className="inline-block text-base text-gray-500">
                  /hr
                </span>
              </div>
            </div>
          </AlertContent>
        </Alert>

        <div className="flex items-center gap-x-5">
          <div className="flex-auto space-y-[5px]">
            <h2 className="text-sm leading-none text-dark-blue-400">
              Your Earnings
            </h2>
            <p className="text-xs leading-none text-dark-blue-400 font-light">
              Estimated take-home pay after fees
            </p>
          </div>
          <div className="max-w-[292px] flex-auto">
            <div className="flex items-center gap-x-2 pr-4">
              <Label htmlFor="your-earning" className="sr-only">
                Your Earning
              </Label>
              <InputGroup>
                <InputLeftAddon className="inline-flex items-center gap-x-1">
                  USD
                  <Info className="size-4" />
                </InputLeftAddon>
                <Controller
                  control={control}
                  name="earning"
                  render={({ field: { value, onChange } }) => (
                    <CurrencyInput
                      id="your-earning"
                      className={cn(
                        inputVariants({
                          className: "text-right",
                          variant: hookFormHasError({ errors, name: "earning" })
                            ? "error"
                            : undefined,
                        })
                      )}
                      value={value ?? undefined}
                      intlConfig={{ locale: "en-US", currency: "USD" }}
                      onValueChange={(_, __, values) => onChange(values?.float)}
                      placeholder="$65"
                      decimalsLimit={0}
                    />
                  )}
                />
              </InputGroup>
              <span className="inline-block text-base text-gray-500">/hr</span>
            </div>
            <HookFormErrorMessage
              errors={errors}
              name="earning"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MoreInfoDialog({
  opened,
  onOpenedChange,
  value,
  onValueChange,
  onSaved,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  value?: MoreInfoFormValues[]
  onValueChange?: (val: MoreInfoFormValues[] | undefined) => void
  onSaved?: (chunks: MoreInfoFormValues[]) => void
}) {
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [show, setShow] = useState(false)
  const methods = useForm<MoreInfoFormValues>({
    resolver: zodResolver(moreInfoFormSchema),
    defaultValues: moreInfoDefaults,
  })
  const {
    handleSubmit,
    formState: { isValid, isDirty },
    reset,
    watch,
    setValue,
  } = methods
  const [canPerformAction, setCanPerformAction] = useState(true)
  const [editingIndex, setEditingIndex] = useState<number>()
  const [indexToRemove, setIndexToRemove] = useState<number>()
  const [infoChunks, setInfoChunks] = useControllableState<
    MoreInfoFormValues[] | undefined
  >({
    defaultValue: undefined,
    value,
    onChange: onValueChange,
  })

  const onSubmit: SubmitHandler<MoreInfoFormValues> = (values) => {
    const { saveAsDefault } = values
    if (editingIndex !== undefined) {
      setInfoChunks(
        infoChunks?.map((q, index) =>
          index === editingIndex
            ? values
            : saveAsDefault
              ? { ...q, saveAsDefault: false }
              : q
        )
      )
      setEditingIndex(undefined)
    } else {
      setInfoChunks((prev) =>
        prev
          ? prev
              .map((q) => (saveAsDefault ? { ...q, saveAsDefault: false } : q))
              .concat(values)
          : [values]
      )
      setCanPerformAction(false)
    }
    reset(moreInfoDefaults)
  }

  const [clientRate, earning] = watch(["clientRate", "earning"])
  const previousClientRate = usePrevious(clientRate)
  const previousEarning = usePrevious(earning)

  const calcFee = (v: number) => Math.round(v * 0.2)

  if (previousClientRate !== clientRate) {
    setValue("earning", clientRate)
    if (clientRate) setValue("fee", calcFee(clientRate))
  } else if (previousEarning !== earning) {
    setValue("clientRate", earning)
    if (earning) setValue("fee", calcFee(earning))
  }

  const handleSave = async () => {
    const defaultChunk =
      infoChunks?.find((c) => c.saveAsDefault) ?? infoChunks?.[0]
    if (defaultChunk) {
      try {
        await Promise.all([
          UserAPI.updateJobTitle({ recentJobTitle: defaultChunk.jobTitle }),
          UserAPI.updateRate({
            rate_min: defaultChunk.earning,
            rate_max: defaultChunk.clientRate,
          }),
        ])
        onSaved?.(infoChunks ?? [])
        setOpen(false)
      } catch {
        // keep open on error
      }
    } else {
      setOpen(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[700px] rounded-[24px] p-0">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="pt-6 border-b border-gray-200">
              <div className="flex px-6 items-start gap-x-2">
                <div className="flex-auto">
                  <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                    Job Title & Rates
                  </h1>
                  <p className="text-sm font-light text-dark-blue-400">
                    Tell us what you do and set your hourly rates
                  </p>
                </div>
                <div className="flex items-start gap-x-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={() => {
                      setCanPerformAction(true)
                      reset(moreInfoDefaults)
                    }}
                  >
                    <Plus className="size-[15px]" />
                    Add Job Title
                  </Button>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    type="button"
                    onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
                  >
                    <X className="size-5" />
                  </IconButton>
                </div>
              </div>

              <ScrollArea
                className="mt-8 px-6 pb-6"
                scrollBar={<ScrollBar className="w-4 p-1" />}
                viewportClassName="max-h-[652px]"
              >
                <div className="space-y-3">
                  {canPerformAction && (
                    <MoreInfoForm
                      onShow={() => setShow(true)}
                      onSubmit={() => submitTriggerRef.current?.click()}
                    />
                  )}
                  {infoChunks?.map((chunk, index) =>
                    editingIndex === index ? (
                      <MoreInfoForm
                        key={index}
                        onShow={() => setShow(true)}
                        onSubmit={() => submitTriggerRef.current?.click()}
                      />
                    ) : (
                      <article
                        key={index}
                        className="p-6 rounded-lg flex items-center bg-white border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                      >
                        <div className="flex-auto">
                          <h1 className="text-base leading-none font-bold text-dark-blue-400">
                            {chunk.jobTitle}
                          </h1>
                          <div className="mt-1 flex items-center gap-x-3">
                            <div className="flex items-center flex-none gap-x-2">
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Client rate ${chunk.clientRate}/hr
                              </span>
                              <span className="inline-block size-1 bg-gray-300 rounded-full" />
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Your earnings ${chunk.earning}/hr
                              </span>
                            </div>
                            {chunk.saveAsDefault && (
                              <Badge visual="primary">Default</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-x-1">
                          <IconButton
                            visual="gray"
                            variant="ghost"
                            type="button"
                            className="text-gray-400 rounded-full"
                            onClick={() => {
                              reset(chunk)
                              setEditingIndex(index)
                              setCanPerformAction(false)
                            }}
                          >
                            <Edit03 className="size-[15px]" />
                          </IconButton>
                          <IconButton
                            visual="gray"
                            variant="ghost"
                            type="button"
                            className="text-gray-400 rounded-full hover:text-error-500 hover:bg-error-50"
                            onClick={() => {
                              setShow(true)
                              setIndexToRemove(index)
                            }}
                          >
                            <Trash03 className="size-[15px]" />
                          </IconButton>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Delete confirmation dialog */}
            <Dialog open={show} onOpenChange={setShow}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Delete Job Title?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    This job title will be removed. This cannot be undone.
                  </DialogDescription>
                </div>
                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose asChild>
                    <Button variant="link" visual="gray">
                      <X className="size-[15px]" /> Cancel
                    </Button>
                  </DialogClose>
                  <DialogClose
                    onClick={() => {
                      if (indexToRemove !== undefined) {
                        setInfoChunks((prev) =>
                          prev?.filter((_, i) => i !== indexToRemove)
                        )
                        setIndexToRemove(undefined)
                      } else {
                        setCanPerformAction(false)
                      }
                    }}
                    asChild
                  >
                    <Button variant="outlined" visual="gray">
                      Yes, Delete
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>

            <div className="py-4 px-6 flex items-center justify-between">
              <Button
                variant="link"
                visual="gray"
                type="button"
                onClick={() => setIsOpen(true)}
              >
                <X className="size-[15px]" />
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  !Boolean(infoChunks?.length) ||
                  typeof editingIndex === "number"
                }
                onClick={handleSave}
              >
                Save
              </Button>
              <Button ref={submitTriggerRef} className="sr-only">
                Save
              </Button>

              {/* Discard changes dialog */}
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[409px] p-0">
                  <div className="p-6">
                    <DialogTitle className="text-dark-blue-400">
                      Save Job Title & Rate?
                    </DialogTitle>
                    <DialogDescription className="text-dark-blue-400 mt-2">
                      Do you want to save your information?
                    </DialogDescription>
                  </div>
                  <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                    <DialogClose
                      onClick={() => {
                        setCanPerformAction(false)
                        reset(moreInfoDefaults)
                      }}
                      asChild
                    >
                      <Button variant="link" visual="gray">
                        <X className="size-[15px]" /> Discard Changes
                      </Button>
                    </DialogClose>
                    <DialogClose
                      onClick={() => {
                        isValid
                          ? submitTriggerRef.current?.click()
                          : setIsOpen(false)
                      }}
                      asChild
                    >
                      <Button variant="outlined" visual="gray">
                        Yes, Save
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  )
}

// ─── WORK EXPERIENCE ENTRY DIALOG ────────────────────────────────────────────

const workExperienceFormSchema = z
  .object({
    employer: z.string().min(1, "Please enter at least 1 character(s)"),
    jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
    startDate: z.object({
      month: z.number().min(1).max(12),
      year: z
        .number()
        .gte(currentYear - 100)
        .lte(currentYear),
    }),
    endDate: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z
        .number()
        .gte(currentYear - 100)
        .lte(currentYear)
        .optional(),
    }),
    currentlyWorkHere: z.boolean(),
    jobDescription: z.string().min(1, "Please enter at least 1 character(s)"),
  })
  .refine(
    (data) =>
      data.currentlyWorkHere ? true : typeof data.endDate?.month === "number",
    { message: "Please select a month", path: ["endDate.month"] }
  )
  .refine(
    (data) =>
      data.currentlyWorkHere ? true : typeof data.endDate?.year === "number",
    { message: "Please select a year", path: ["endDate.year"] }
  )

export type WorkExperienceFormValues = z.infer<typeof workExperienceFormSchema>

export type WorkExperienceEntry = WorkExperienceFormValues & { id: string }

export function WorkExperienceEntryDialog({
  open,
  onOpenChange,
  experienceId,
  initialValues,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  experienceId?: string
  initialValues?: Partial<WorkExperienceFormValues>
  onSaved?: () => void
}) {
  const isEditing = !!experienceId
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    register,
    reset,
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: {
      currentlyWorkHere: false,
      jobDescription: "",
      jobTitle: "",
      employer: "",
      ...initialValues,
    },
  })

  const currentlyWorkHere = useWatch({ control, name: "currentlyWorkHere" })

  const onSubmit: SubmitHandler<WorkExperienceFormValues> = async (values) => {
    const monthStr = String(values.startDate.month).padStart(2, "0")
    const payload: CreateExperienceData = {
      title: values.jobTitle,
      company: values.employer,
      startDate: `${values.startDate.year}-${monthStr}-01`,
      isCurrentRole: values.currentlyWorkHere,
      description: values.jobDescription,
    }
    if (
      !values.currentlyWorkHere &&
      values.endDate?.month &&
      values.endDate?.year
    ) {
      const endMonthStr = String(values.endDate.month).padStart(2, "0")
      payload.endDate = `${values.endDate.year}-${endMonthStr}-01`
    }
    try {
      if (isEditing && experienceId) {
        await UserAPI.experiences.update(experienceId, payload)
      } else {
        await UserAPI.experiences.create(payload)
      }
      onSaved?.()
      onOpenChange(false)
      reset()
    } catch {
      // keep open on error
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  {isEditing ? "Edit Work Experience" : "Add Work Experience"}
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Tell us where you&apos;ve worked before!
                </p>
              </div>
              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <div className="mt-8 pb-[50px]">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="exp-employer"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    Employer
                  </Label>
                  <Input
                    id="exp-employer"
                    placeholder="Acme Inc."
                    {...register("employer")}
                    isInvalid={hookFormHasError({ errors, name: "employer" })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="employer"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="exp-job-title"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    Job Title
                  </Label>
                  <Input
                    id="exp-job-title"
                    placeholder="Software Engineer"
                    {...register("jobTitle")}
                    isInvalid={hookFormHasError({ errors, name: "jobTitle" })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="jobTitle"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-dark-blue-400" size="sm">
                    Start Date
                  </Label>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Controller
                      name="startDate.month"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) =>
                              months.find((m) => m.value === v)?.name ?? ""
                            }
                            placeholder="Month"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "startDate.month",
                            })}
                          />
                          <ListboxOptions>
                            {months.map((m) => (
                              <ListboxOption key={m.value} value={m.value}>
                                {m.name}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                    <Controller
                      name="startDate.year"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) => `${v}`}
                            placeholder="Year"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "startDate.year",
                            })}
                          />
                          <ListboxOptions>
                            {years.map((y) => (
                              <ListboxOption key={y} value={y}>
                                {y}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                  </div>
                </div>

                {/* End Date */}
                <div
                  className={cn(
                    "space-y-1.5",
                    currentlyWorkHere && "pointer-events-none opacity-50"
                  )}
                >
                  <Label className="text-dark-blue-400" size="sm">
                    End Date
                  </Label>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Controller
                      name="endDate.month"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) =>
                              months.find((m) => m.value === v)?.name ?? ""
                            }
                            placeholder="Month"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "endDate.month",
                            })}
                          />
                          <ListboxOptions>
                            {months.map((m) => (
                              <ListboxOption key={m.value} value={m.value}>
                                {m.name}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                    <Controller
                      name="endDate.year"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) => `${v}`}
                            placeholder="Year"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "endDate.year",
                            })}
                          />
                          <ListboxOptions>
                            {years.map((y) => (
                              <ListboxOption key={y} value={y}>
                                {y}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                  </div>
                </div>

                {/* Currently working here */}
                <div className="col-span-2 flex items-center gap-x-3">
                  <Controller
                    name="currentlyWorkHere"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox
                        checked={value}
                        onCheckedChange={onChange}
                        id="currently-work-here"
                      />
                    )}
                  />
                  <Label
                    htmlFor="currently-work-here"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    I currently work here
                  </Label>
                </div>

                {/* Job Description */}
                <div className="col-span-2 space-y-1.5">
                  <Label
                    htmlFor="exp-description"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    Job Description
                  </Label>
                  <Textarea
                    id="exp-description"
                    placeholder="Describe your responsibilities..."
                    className="h-[120px]"
                    {...register("jobDescription")}
                    isInvalid={hookFormHasError({
                      errors,
                      name: "jobDescription",
                    })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="jobDescription"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose onClick={() => reset()} asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!isValid}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── EDUCATION ENTRY DIALOG ───────────────────────────────────────────────────

const educationFormSchema = z.object({
  schoolOrUniversity: z.string().min(1, "Please enter at least 1 character(s)"),
  degree: z.string().min(1, "Please select a degree"),
  major: z.string(),
  startDate: z.object({
    month: z.number().min(1).max(12).optional(),
    year: z
      .number()
      .gte(currentYear - 100)
      .lte(currentYear),
  }),
  endDate: z.object({
    month: z.number().min(1).max(12).optional(),
    year: z
      .number()
      .gte(currentYear - 100)
      .lte(currentYear)
      .optional(),
  }),
  currentlyAttending: z.boolean(),
})

export type EducationFormValues = z.infer<typeof educationFormSchema>

const degreeOptions = [
  "High School Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctoral Degree (PhD)",
  "Professional Degree (MD/JD)",
  "Certificate",
  "Diploma",
  "Other",
]

export type EducationEntry = EducationFormValues & { id: string }

export function EducationEntryDialog({
  open,
  onOpenChange,
  educationId,
  initialValues,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  educationId?: string
  initialValues?: Partial<EducationFormValues>
  onSaved?: () => void
}) {
  const isEditing = !!educationId
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    register,
    reset,
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: {
      currentlyAttending: false,
      degree: "",
      major: "",
      schoolOrUniversity: "",
      ...initialValues,
    },
  })

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })

  const onSubmit: SubmitHandler<EducationFormValues> = async (values) => {
    const payload: CreateEducationData = {
      school: values.schoolOrUniversity,
      degree: values.degree,
      fieldOfStudy: values.major || undefined,
      startYear: values.startDate.year,
      startMonth: values.startDate.month,
      currentlyStudying: values.currentlyAttending,
    }
    if (!values.currentlyAttending && values.endDate?.year) {
      payload.endYear = values.endDate.year
      payload.endMonth = values.endDate.month
    }
    try {
      if (isEditing && educationId) {
        await UserAPI.education.update(educationId, payload)
      } else {
        await UserAPI.education.create(payload)
      }
      onSaved?.()
      onOpenChange(false)
      reset()
    } catch {
      // keep open on error
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  {isEditing ? "Edit Education" : "Add Education"}
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Show your qualifications to give clients confidence.
                </p>
              </div>
              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <div className="mt-8 pb-[50px]">
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1.5 col-span-2">
                  <Label
                    htmlFor="edu-school"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    School or University
                  </Label>
                  <Input
                    id="edu-school"
                    placeholder="Harvard University"
                    {...register("schoolOrUniversity")}
                    isInvalid={hookFormHasError({
                      errors,
                      name: "schoolOrUniversity",
                    })}
                  />
                  <HookFormErrorMessage
                    name="schoolOrUniversity"
                    errors={errors}
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="edu-degree"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    Degree
                  </Label>
                  <Controller
                    control={control}
                    name="degree"
                    render={({ field: { value, onChange } }) => (
                      <Listbox value={value} onChange={onChange}>
                        <ListboxButton
                          placeholder="Select Degree"
                          isInvalid={hookFormHasError({
                            errors,
                            name: "degree",
                          })}
                        />
                        <ListboxOptions>
                          {degreeOptions.map((d) => (
                            <ListboxOption key={d} value={d}>
                              {d}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Listbox>
                    )}
                  />
                  <HookFormErrorMessage
                    name="degree"
                    errors={errors}
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="edu-major"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    Major
                  </Label>
                  <Input
                    id="edu-major"
                    placeholder="Engineering"
                    {...register("major")}
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <Label className="text-dark-blue-400" size="sm">
                    Start Date
                  </Label>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Controller
                      name="startDate.month"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) =>
                              months.find((m) => m.value === v)?.name ?? ""
                            }
                            placeholder="Month"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "startDate.month",
                            })}
                          />
                          <ListboxOptions>
                            {months.map((m) => (
                              <ListboxOption key={m.value} value={m.value}>
                                {m.name}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                    <Controller
                      name="startDate.year"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) => `${v}`}
                            placeholder="Year"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "startDate.year",
                            })}
                          />
                          <ListboxOptions>
                            {years.map((y) => (
                              <ListboxOption key={y} value={y}>
                                {y}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                  </div>
                </div>

                {/* End Date */}
                <div
                  className={cn(
                    "space-y-1.5",
                    currentlyAttending && "pointer-events-none opacity-50"
                  )}
                >
                  <Label className="text-dark-blue-400" size="sm">
                    End Date
                  </Label>
                  <div className="grid grid-cols-2 gap-x-4">
                    <Controller
                      name="endDate.month"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) =>
                              months.find((m) => m.value === v)?.name ?? ""
                            }
                            placeholder="Month"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "endDate.month",
                            })}
                          />
                          <ListboxOptions>
                            {months.map((m) => (
                              <ListboxOption key={m.value} value={m.value}>
                                {m.name}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                    <Controller
                      name="endDate.year"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Listbox value={value} onChange={onChange}>
                          <ListboxButton
                            displayValue={(v: number) => `${v}`}
                            placeholder="Year"
                            isInvalid={hookFormHasError({
                              errors,
                              name: "endDate.year",
                            })}
                          />
                          <ListboxOptions>
                            {years.map((y) => (
                              <ListboxOption key={y} value={y}>
                                {y}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
                    />
                  </div>
                </div>

                {/* Currently attending */}
                <div className="col-span-2 flex items-center gap-x-3">
                  <Controller
                    name="currentlyAttending"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Checkbox
                        checked={value}
                        onCheckedChange={onChange}
                        id="currently-attending"
                      />
                    )}
                  />
                  <Label
                    htmlFor="currently-attending"
                    className="text-dark-blue-400"
                    size="sm"
                  >
                    I&apos;m currently attending
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose onClick={() => reset()} asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!isValid}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── AFFILIATED TEAMS DIALOG ──────────────────────────────────────────────────

export function AffiliatedTeamsBrowseDialog({
  open,
  onOpenChange,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [isOpen, setOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-w-[700px]">
        <div className="flex items-start gap-x-2">
          <div className="flex-auto">
            <h1 className="text-lg leading-7 font-semibold text-dark-blue-400">
              Affiliated Teams
            </h1>
            <p className="text-sm mt-2 leading-5 font-light text-dark-blue-400">
              Share your expertise and make your profile unforgettable!
            </p>
          </div>
          <DialogClose asChild>
            <IconButton
              className="opacity-50 hover:opacity-100"
              size="md"
              visual="gray"
              variant="ghost"
            >
              <X className="size-5" />
            </IconButton>
          </DialogClose>
        </div>

        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <article
              key={i}
              className="rounded-lg border p-5 flex items-start gap-x-2 border-gray-200 bg-white"
            >
              <Avatar size="sm">
                <AvatarImage src="/man.jpg" alt="Man" />
                <AvatarFallback>M</AvatarFallback>
              </Avatar>
              <div className="flex-auto">
                <h1 className="text-sm leading-none font-bold text-dark-blue-400">
                  Bitcoin Master Devs
                </h1>
                <div className="mt-1.5 inline-flex items-center gap-x-3">
                  <div className="inline-flex items-center gap-x-2">
                    <MarkerPin02 className="size-[12px] text-dark-blue-400" />
                    <span className="text-xs leading-none font-light">
                      Moscow, Russia
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-x-2">
                    <Clock className="size-[12px] text-primary-500" />
                    <span className="text-xs leading-none font-light">
                      450 hrs
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-x-2">
                    <Clock className="size-[12px] text-primary-500" />
                    <span className="text-xs leading-none font-light">
                      320 members
                    </span>
                  </div>
                </div>
                <div className="mt-1.5">
                  <span className="text-sm font-light leading-none text-gray-700">
                    Skilled developers building secure, scalable blockchain and
                    Bitcoin-based applications worldwide.
                  </span>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton variant="ghost" visual="gray">
                    <DotsHorizontal className="size-[15px]" />
                  </IconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" side="bottom" align="end">
                  <DropdownMenuItem>
                    <UserPlus className="h-4 w-4" /> Invite People
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell className="h-4 w-4" /> Manage Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <AlertTriangle className="h-4 w-4" /> Report Team
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem visual="destructive">
                    <LogOut className="h-4 w-4" /> Leave Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AffiliatedTeamsDialog({
  trigger,
}: {
  trigger?: (opts: { toggle: () => void }) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [browseOpen, setBrowseOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({ toggle: () => setOpen((prev) => !prev) })}
      <DialogContent className="max-w-[452px] py-8">
        <IconButton
          visual="gray"
          variant="ghost"
          className="opacity-50 absolute top-2.5 right-2.5 hover:opacity-100"
          size="md"
          onClick={() => setOpen(false)}
        >
          <X className="size-5" />
        </IconButton>

        <div className="max-w-[352px] mx-auto flex flex-col">
          <div className="size-16 mx-auto rounded-full shrink-0 flex-none border-[8px] bg-gray-100 border-gray-50 inline-flex items-center justify-center">
            <XCircle className="size-6 text-gray-500" />
          </div>

          <h2 className="text-base text-center mt-4 font-semibold text-gray-950">
            You&apos;re not affiliated with any teams
          </h2>

          <p className="text-sm leading-5 text-gray-600 text-center mt-1">
            To get started with your first team browse the marketplace for the
            latest teams.
          </p>

          <div className="flex justify-center mt-6">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => setBrowseOpen(true)}
            >
              Browse Teams
            </Button>
          </div>
        </div>
      </DialogContent>

      <AffiliatedTeamsBrowseDialog
        open={browseOpen}
        onOpenChange={setBrowseOpen}
      />
    </Dialog>
  )
}

// ─── LANGUAGE DIALOG ─────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  "Afrikaans",
  "Arabic",
  "Bengali",
  "Bulgarian",
  "Catalan",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "Croatian",
  "Czech",
  "Danish",
  "Dutch",
  "English",
  "Estonian",
  "Filipino",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Gujarati",
  "Hebrew",
  "Hindi",
  "Hungarian",
  "Indonesian",
  "Italian",
  "Japanese",
  "Kannada",
  "Korean",
  "Latvian",
  "Lithuanian",
  "Malay",
  "Malayalam",
  "Marathi",
  "Norwegian",
  "Persian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Romanian",
  "Russian",
  "Serbian",
  "Slovak",
  "Slovenian",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tamil",
  "Telugu",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
]

type LanguageItem = { id: string; name: string; fluency: string }

export function LanguageDialog({
  open,
  onOpenChange,
  languages: initialLanguages = [],
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  languages?: LanguageItem[]
  onSaved?: () => void
}) {
  const [selected, setSelected] = useState<
    Array<{ id: string | null; name: string }>
  >([])
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSelected(initialLanguages.map((l) => ({ id: l.id, name: l.name })))
      setQuery("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filteredOptions = LANGUAGE_OPTIONS.filter((lang) => {
    if (selected.some((s) => s.name === lang)) return false
    if (query === "") return true
    return lang.toLowerCase().includes(query.toLowerCase())
  }).map((name, i) => ({ id: i, name }))

  const handleAdd = (lang: { id: number; name: string } | null) => {
    if (!lang) return
    setSelected((prev) => [...prev, { id: null, name: lang.name }])
    setQuery("")
  }

  const handleRemove = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const originalIds = new Set(initialLanguages.map((l) => l.id))
      const selectedNames = new Set(selected.map((s) => s.name))

      // Delete removed languages
      const toDelete = initialLanguages.filter(
        (l) => !selectedNames.has(l.name)
      )
      // Create new languages
      const toCreate = selected.filter((s) => s.id === null)

      await Promise.all([
        ...toDelete.map((l) => UserAPI.languages.delete(l.id)),
        ...toCreate.map((s) =>
          UserAPI.languages.create({ name: s.name, fluency: "Fluent" })
        ),
      ])

      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!saving) onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <div className="border-b border-gray-200 p-6 pb-[50px]">
          <div className="flex items-start gap-x-2">
            <div className="flex-auto">
              <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                Languages
              </h1>
              <p className="text-sm font-light text-dark-blue-400">
                Share the languages you speak regularly
              </p>
            </div>
            <DialogClose type="button" asChild>
              <IconButton variant="ghost" visual="gray">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          <Combobox className="mt-8 w-auto" value={null} onChange={handleAdd}>
            <ComboboxTrigger>
              <ComboboxInput
                size="lg"
                displayValue={() => ""}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your language"
              />
              <ComboboxButton>
                <SearchMd className="h-4 w-4" />
              </ComboboxButton>
            </ComboboxTrigger>
            <ScaleOutIn afterLeave={() => setQuery("")}>
              <ComboboxOptions>
                <ScrollArea viewportClassName="max-h-[304px]">
                  {filteredOptions.map((lang) => (
                    <ComboboxOption key={lang.id} value={lang}>
                      {lang.name}
                    </ComboboxOption>
                  ))}
                </ScrollArea>
              </ComboboxOptions>
            </ScaleOutIn>
          </Combobox>

          <div className="mt-3 flex gap-3 flex-wrap">
            {selected.map((lang, index) => (
              <Badge visual="primary" key={index}>
                {lang.name}
                <button
                  className="focus-visible:outline-none"
                  type="button"
                  onClick={() => handleRemove(index)}
                >
                  <X2 className="size-2" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="py-4 px-6 flex items-center justify-between">
          <DialogClose asChild>
            <Button variant="link" visual="gray" type="button">
              <X className="size-[15px]" />
              Cancel
            </Button>
          </DialogClose>
          <Button
            disabled={saving || selected.length === 0}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── PROFILE SKILLS DIALOG ───────────────────────────────────────────────────

const skillsFormSchema = z.object({
  skills: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .min(1, "Please select at least 1 skill(s)"),
})

type ProfileSkillsFormValues = z.infer<typeof skillsFormSchema>

export type ApiSkill = { id: string; name: string; proficiency?: string }

export function ProfileSkillsDialog({
  open,
  onOpenChange,
  currentSkills,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentSkills: ApiSkill[]
  onSaved?: (skills: ApiSkill[]) => void
}) {
  const [query, setQuery] = useState("")

  // Predefined skill list for the combobox
  const skillOptions: ApiSkill[] = [
    { id: "ts", name: "TypeScript" },
    { id: "js", name: "JavaScript" },
    { id: "react", name: "React.js" },
    { id: "nextjs", name: "Next.js" },
    { id: "tailwind", name: "Tailwind CSS" },
    { id: "nodejs", name: "Node.js" },
    { id: "python", name: "Python" },
    { id: "figma", name: "Figma" },
    { id: "ux", name: "UX Design" },
    { id: "graphql", name: "GraphQL" },
    { id: "sql", name: "SQL" },
    { id: "docker", name: "Docker" },
  ]

  const filteredOptions =
    query === ""
      ? skillOptions
      : skillOptions.filter((s) =>
          s.name.toLowerCase().includes(query.toLowerCase())
        )

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    setValue,
    trigger,
  } = useForm<ProfileSkillsFormValues>({
    resolver: zodResolver(skillsFormSchema),
    defaultValues: {
      skills: currentSkills.map((s) => ({ id: s.id, name: s.name })),
    },
  })

  const selected = useWatch({ control, name: "skills" })

  const onRemove = (index: number) => {
    setValue(
      "skills",
      selected?.filter((_, i) => i !== index)
    )
    trigger()
  }

  const onSubmit: SubmitHandler<ProfileSkillsFormValues> = async (values) => {
    try {
      // Delete skills not in new list
      const newIds = new Set(values.skills.map((s) => s.id))
      const toDelete = currentSkills.filter((s) => !newIds.has(s.id))
      const toAdd = values.skills.filter(
        (s) => !currentSkills.find((cs) => cs.id === s.id)
      )
      await Promise.all([
        ...toDelete.map((s) => UserAPI.skills.delete(s.id)),
        ...toAdd.map((s) => UserAPI.skills.create({ name: s.name })),
      ])
      // Refresh by calling list
      const res = await UserAPI.skills.list()
      onSaved?.(res.data ?? [])
      onOpenChange(false)
    } catch {
      // keep open on error
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Skills
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Share your expertise and make your profile unforgettable!
                </p>
              </div>
              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Controller
              name="skills"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Combobox
                  multiple
                  className="mt-8 w-auto"
                  value={value}
                  onChange={onChange}
                >
                  <ComboboxTrigger>
                    <ComboboxInput
                      size="lg"
                      displayValue={(skill: { id: string; name: string }) =>
                        skill.name
                      }
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for skills"
                      invalid={hookFormHasError({ errors, name: "skills" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredOptions.map((skill) => (
                          <ComboboxOption key={skill.id} value={skill}>
                            {skill.name}
                          </ComboboxOption>
                        ))}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((skill, index) => (
                <Badge visual="primary" key={skill.id}>
                  {skill.name}
                  <button
                    className="focus-visible:outline-none"
                    type="button"
                    onClick={() => onRemove(index)}
                  >
                    <X2 className="size-2" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <DialogClose asChild>
              <Button variant="link" visual="gray" type="button">
                <X className="size-[15px]" />
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={!isValid}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
