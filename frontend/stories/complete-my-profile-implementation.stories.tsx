import { useCallback, useEffect, useRef, useState } from "react"
import { cn, hookFormHasError } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  Clock,
  DotsHorizontal,
  Edit03,
  Info,
  LogOut,
  MarkerPin02,
  Plus,
  SearchMd,
  Star,
  Trash,
  Trash03,
  UserPlus,
  X,
  X2,
  XCircle,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Meta } from "@storybook/react"
import { isAfter, isBefore } from "date-fns"
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
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarGroup,
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
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Switch,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  inputVariants,
} from "@/components/ui"

const meta: Meta = {
  title: "Complete My Profile Implementation",
  parameters: {
    layout: "fullscreen",
  },
}

export default meta

const aboutMeFormSchema = z.object({
  aboutMe: z.string().min(1, "Please enter at least 1 character(s)"),
})

type AboutMeFormValues = z.infer<typeof aboutMeFormSchema>

const aboutMeFormDefaultValues = {
  aboutMe: "",
} satisfies AboutMeFormValues

export const AboutMeDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  onValueChange,
  value: valueProp,
  defaultValue,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: AboutMeFormValues
  }) => React.ReactNode
  defaultValue?: AboutMeFormValues
  value?: AboutMeFormValues
  onValueChange?: (value: AboutMeFormValues) => void
}) => {
  const [value, setValue] = useControllableState<AboutMeFormValues>({
    defaultValue: defaultValue ? defaultValue : aboutMeFormDefaultValues,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const {
    register,
    formState: { errors, isValid, isDirty },
    handleSubmit,
    reset,
  } = useForm<AboutMeFormValues>({
    resolver: zodResolver(aboutMeFormSchema),
    defaultValues: value,
  })
  const onSubmit: SubmitHandler<AboutMeFormValues> = (values) => {
    setValue(values)
    setOpen(false)
  }
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const resetFn = () => {
    reset()
    setValue(defaultValue ? defaultValue : aboutMeFormDefaultValues)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
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
                      resetFn()
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

const moreInfoFormSchema = z.object({
  jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
  saveAsDefault: z.boolean(),
  clientRate: z.number({ message: "Please enter an amount" }),
  earning: z.number({ message: "Please enter an amount" }),
  fee: z.number({ message: "Please enter an amount" }),
})

export type MoreInfoFormValues = z.infer<typeof moreInfoFormSchema>

const defaultValues: Partial<MoreInfoFormValues> = {
  jobTitle: "",
  saveAsDefault: false,
}

const MoreInfoForm = ({
  onShow,
  onSubmit,
}: {
  onShow: () => void
  onSubmit: () => void
}) => {
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
            Job Title 1
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
          isInvalid={hookFormHasError({
            errors,
            name: "jobTitle",
          })}
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
                      intlConfig={{
                        locale: "en-US",
                        currency: "USD",
                      }}
                      onValueChange={(value, name, values) =>
                        onChange(values?.float)
                      }
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
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
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
                      intlConfig={{
                        locale: "en-US",
                        currency: "USD",
                      }}
                      onValueChange={(value, name, values) =>
                        onChange(values?.float)
                      }
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
                          variant: hookFormHasError({
                            errors,
                            name: "earning",
                          })
                            ? "error"
                            : undefined,
                        })
                      )}
                      value={value ?? undefined}
                      intlConfig={{
                        locale: "en-US",
                        currency: "USD",
                      }}
                      onValueChange={(value, name, values) =>
                        onChange(values?.float)
                      }
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

export const MoreInfoDialog = ({
  onOpenedChange,
  opened,
  trigger,
  onValueChange,
  value,
}: {
  opened?: boolean
  onOpenedChange?: (opened: boolean) => void
  trigger?: (options: { open: boolean; toggle: () => void }) => React.ReactNode
  value?: MoreInfoFormValues[]
  onValueChange?: (vale: MoreInfoFormValues[] | undefined) => void
}) => {
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
    defaultValues,
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
        infoChunks?.map((qualification, index) =>
          index === editingIndex
            ? values
            : saveAsDefault
              ? { ...qualification, saveAsDefault: false }
              : qualification
        )
      )

      setEditingIndex(undefined)
    } else {
      setInfoChunks((prev) =>
        prev
          ? prev
              .map((qulification) =>
                saveAsDefault
                  ? { ...qulification, saveAsDefault: false }
                  : qulification
              )
              .concat(values)
          : [values]
      )
      setCanPerformAction(false)
    }
    reset(defaultValues)
  }
  const [clientRate, earning] = watch(["clientRate", "earning"])
  const previousClientRate = usePrevious(clientRate)
  const previousEarning = usePrevious(earning)

  useEffect(() => {
    function calculatePercentage({
      percentage,
      value,
    }: {
      value: number
      percentage: number
    }) {
      return (value * percentage) / 100
    }

    if (previousClientRate !== clientRate) {
      setValue("earning", clientRate)
    } else if (previousEarning !== earning) {
      setValue("clientRate", earning)
    }

    if (previousClientRate !== clientRate || previousEarning !== earning) {
      setValue(
        "fee",
        calculatePercentage({ percentage: 20, value: clientRate ?? earning })
      )
    }
  }, [previousClientRate, previousEarning, clientRate, earning, setValue])

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger?.({ open, toggle: () => setOpen((prev) => !prev) })}
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
                      reset(defaultValues)
                    }}
                  >
                    <Plus className="size-[15px]" type="button" />
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

                  {infoChunks?.map((infoChunk, index) =>
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
                            {infoChunk.jobTitle}
                          </h1>

                          <div className="mt-1 flex items-center gap-x-3">
                            <div className="flex items-center flex-none gap-x-2">
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Client rate {infoChunk.clientRate}/hr
                              </span>
                              <span className="inline-block size-1 bg-gray-300 rounded-full" />
                              <span className="text-xs leading-none font-light text-dark-blue-400">
                                Your earnings {infoChunk.earning}/hr
                              </span>
                            </div>

                            {infoChunk.saveAsDefault && (
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
                              reset(infoChunk)
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

            <Dialog open={show} onOpenChange={setShow}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Delete Job Title?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Your “Chief Technical Offer (CTO)” job title will be
                    removed. This cannot be undone.
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
                        setInfoChunks(
                          (prev) => prev?.filter((_, i) => i !== indexToRemove)
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
              <DialogClose asChild>
                <Button
                  type="button"
                  disabled={
                    !Boolean(infoChunks?.length) ||
                    typeof editingIndex == "number"
                  }
                >
                  Save
                </Button>
              </DialogClose>
              <Button ref={submitTriggerRef} className="sr-only">
                Save
              </Button>

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
                        reset(defaultValues)
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

const availabilityFormSchema = z.object({
  availability: z.string().min(1, "Please select at least 1 option(s)"),
})

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

export const Availability = () => {
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      availability: "",
    },
  })
  const onSubmit: SubmitHandler<AvailabilityFormValues> = (values) => {}
  const availability = useWatch({ control, name: "availability" })
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Availability
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Tell us more about your work schedule
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <div className="mt-8">
              <div className="pb-[50px]">
                <div className="space-y-1.5">
                  <Label size="sm" htmlFor="availability">
                    What’s your availability?
                  </Label>
                  <Controller
                    control={control}
                    name="availability"
                    render={({ field: { value, onChange } }) => (
                      <Listbox value={value} onChange={onChange}>
                        <ListboxButton
                          id="availability"
                          placeholder="Select availability"
                        />
                        <ListboxOptions>
                          <ListboxOption value="Full-time">
                            Full-time
                          </ListboxOption>
                          <ListboxOption value="Part-time">
                            Part-time
                          </ListboxOption>
                          <ListboxOption value="Custom">Custom</ListboxOption>
                        </ListboxOptions>
                      </Listbox>
                    )}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="availability"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {availability === "Custom" && (
                  <div className="mt-6">
                    {days.map((day) => (
                      <article
                        className="py-3 border-b last:border-b-0 flex items-center justify-between"
                        key={day}
                      >
                        <div className="pt-2.5 inline-flex gap-x-2">
                          <Switch id={day} />
                          <Label
                            htmlFor={day}
                            className="text-gray-700"
                            size="sm"
                          >
                            {day}
                          </Label>
                        </div>

                        <div className="inline-flex items-center gap-x-3">
                          <InputGroup>
                            <Input
                              className="[field-sizing:content] flex-auto text-xs leading-6"
                              defaultValue="9:00"
                            />
                            <InputRightAddon>AM</InputRightAddon>
                          </InputGroup>

                          <span className="inline-block text-base leading-8 font-semibold text-gray-400">
                            to
                          </span>

                          <InputGroup>
                            <Input
                              className="[field-sizing:content] flex-auto text-xs leading-6"
                              defaultValue="5:00"
                            />
                            <InputRightAddon>PM</InputRightAddon>
                          </InputGroup>

                          <IconButton
                            size="lg"
                            visual="gray"
                            variant="outlined"
                          >
                            <Plus className="size-[15px]" />
                          </IconButton>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="py-4 px-6 flex items-center justify-between">
            <Button variant="link" visual="gray" type="button">
              <X className="size-[15px]" />
              Cancel
            </Button>
            <Button>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const workExperienceFormSchema = z
  .object({
    employer: z.string().min(1, "Please enter at least 1 character(s)"),
    jobTitle: z.string().min(1, "Please enter at least 1 character(s)"),
    startDate: z.object({
      month: z
        .number()
        .min(1)
        .max(12)
        .refine((value) => Boolean(value), {
          message: "Please select a month",
        }),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .refine((value) => Boolean(value), {
          message: "Please select a year",
        }),
    }),
    endDate: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .optional(),
    }),
    currentlyWorkHere: z.boolean(),
    jobDescription: z.string().min(1, "Please enter at least 1 character(s)"),
    skills: z
      .array(z.object({ id: z.number(), name: z.string() }))
      .min(1, "Please select at least 1 skill(s)")
      .max(50, "You have reached the maximum limit of 50 skills"),
  })

  .refine(
    (data) =>
      data.currentlyWorkHere
        ? true
        : z
            .object({
              month: z.number().min(1).max(12),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a month",
      path: ["endDate.month"],
    }
  )
  .refine(
    (data) =>
      data.currentlyWorkHere
        ? true
        : z
            .object({
              year: z
                .number()
                .gte(new Date().getFullYear() - 100)
                .lte(new Date().getFullYear()),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a year",
      path: ["endDate.year"],
    }
  )

type WorkExperienceFormValues = z.infer<typeof workExperienceFormSchema>

const months = [
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

export const WorkExperienceDialog = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,

  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: WorkExperienceFormValues[] | undefined
    edit: (idx: number) => void
  }) => React.ReactNode
  value?: WorkExperienceFormValues[]
  onValueChange?: (value: WorkExperienceFormValues[] | undefined) => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValueFn] = useControllableState<
    WorkExperienceFormValues[] | undefined
  >({
    value: valueProp,
    onChange: onValueChange,
  })
  const [editingIdx, setEditingIdx] = useState<number>()

  const [skills] = useState([
    { id: 1, name: "Wade Cooper" },
    { id: 2, name: "Arlene Mccoy" },
    { id: 3, name: "Devon Webb" },
    { id: 4, name: "Tom Cook" },
    { id: 5, name: "Tanya Fox" },
    { id: 6, name: "Hellen Schmidt" },
    { id: 7, name: "Chris Torres" },
    { id: 8, name: "Max" },
    { id: 9, name: "David" },
    { id: 10, name: "Logan" },
    { id: 11, name: "Andrew" },
  ])

  const [query, setQuery] = useState("")

  const filteredSkills =
    query === ""
      ? skills
      : skills.filter((skill) =>
          skill.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    trigger,
    setValue,
    register,
    reset,
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: {
      currentlyWorkHere: false,
      jobDescription: "",
      jobTitle: "",
      employer: "",
      endDate: undefined,
      startDate: undefined,
      skills: [],
    },
  })
  const onSubmit: SubmitHandler<WorkExperienceFormValues> = (values) => {
    if (typeof editingIdx === "number") {
      setValueFn(
        value?.map((el, index) => (index === editingIdx ? values : el))
      )
      setEditingIdx(undefined)
    } else {
      setValueFn((prev) => (prev ? [...prev, values] : [values]))
    }
    reset()
  }

  const skillsField = useWatch({ control, name: "skills" })
  const submitTriggerRef = useRef<HTMLButtonElement>(null)

  const edit = (idx: number) => {
    setEditingIdx(idx)
    const workExperienceFormValues = value?.find((_, index) => index !== idx)
    reset(workExperienceFormValues)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        toggle: () => setOpen((prev) => !prev),
        open,
        formValues: value,
        edit,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Work Experience
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Tell us where you&apos;ve worked before!
                </p>
              </div>

              <IconButton
                variant="ghost"
                visual="gray"
                type="button"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8">
              <div className="pb-[50px]">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="employer"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Employer
                    </Label>
                    <Input
                      id="employer"
                      placeholder="Acme Inc."
                      {...register("employer")}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "employer",
                      })}
                    />
                    <HookFormErrorMessage
                      name="employer"
                      errors={errors}
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="job-title"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Job Title
                    </Label>
                    <Input
                      id="job-title"
                      placeholder="CEO"
                      {...register("jobTitle")}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "jobTitle",
                      })}
                    />
                    <HookFormErrorMessage
                      name="jobTitle"
                      errors={errors}
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label
                      htmlFor="start-date"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Start Date
                    </Label>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="startDate.month"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                placeholder="Month"
                                displayValue={(value: number) => value}
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "startDate.month",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {months
                                    .map((month) => month.value)
                                    .map((m) => (
                                      <ListboxOption key={m} value={m}>
                                        {m}
                                      </ListboxOption>
                                    ))}
                                </ScrollArea>
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="startDate.month"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="startDate.year"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                placeholder="Year"
                                displayValue={(value: number) => value}
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "startDate.year",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                    (month) => (
                                      <ListboxOption key={month} value={month}>
                                        {month}
                                      </ListboxOption>
                                    )
                                  )}
                                </ScrollArea>
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />

                        <HookFormErrorMessage
                          name="startDate.year"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label
                      htmlFor="end-date"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      End Date
                    </Label>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="endDate.month"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                placeholder="Month"
                                displayValue={(value: number) => value}
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "endDate.year",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {months
                                    .map((month) => month.value)
                                    .map((m) => (
                                      <ListboxOption key={m} value={m}>
                                        {m}
                                      </ListboxOption>
                                    ))}
                                </ScrollArea>
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="endDate.month"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          control={control}
                          name="endDate.year"
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                placeholder="Year"
                                displayValue={(value: number) => value}
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "endDate.year",
                                })}
                              />
                              <ListboxOptions>
                                <ScrollArea
                                  viewportClassName="max-h-[304px]"
                                  scrollBar={<ScrollBar className="w-4 p-1" />}
                                >
                                  {[2020, 2021, 2022, 2023, 2024, 2025].map(
                                    (month) => (
                                      <ListboxOption key={month} value={month}>
                                        {month}
                                      </ListboxOption>
                                    )
                                  )}
                                </ScrollArea>
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="endDate.year"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center gap-x-3">
                    <Controller
                      control={control}
                      name="currentlyWorkHere"
                      render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                          id="work-here"
                          checked={value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      )}
                    />
                    <Label
                      htmlFor="work-here"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      I currently work here
                    </Label>
                  </div>
                </div>

                <div className="mt-[30px]">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="job-description"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Job Description
                    </Label>
                    <Textarea
                      id="job-description"
                      placeholder="Tell us a little about the company you worked with..."
                      {...register("jobDescription")}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "jobDescription",
                      })}
                    />
                    <HookFormErrorMessage
                      name="jobDescription"
                      errors={errors}
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>
                </div>

                <Controller
                  name="skills"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Combobox
                      className="w-full mt-[30px]"
                      value={value}
                      onChange={onChange}
                      multiple
                    >
                      <ComboboxTrigger>
                        <ComboboxInput
                          size="lg"
                          displayValue={(user: { id: number; name: string }) =>
                            user.name
                          }
                          placeholder="Search for skills"
                          onChange={(event) => setQuery(event.target.value)}
                          invalid={hookFormHasError({
                            errors,
                            name: "skills",
                          })}
                        />
                        <ComboboxButton size="lg">
                          <SearchMd className="h-5 w-5" />
                        </ComboboxButton>
                      </ComboboxTrigger>
                      <ScaleOutIn afterLeave={() => setQuery("")}>
                        <ComboboxOptions>
                          <ScrollArea viewportClassName="max-h-[304px]">
                            {filteredSkills.map((skill) => (
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

                <HookFormErrorMessage
                  name="skills"
                  errors={errors}
                  render={({ message }) => (
                    <ErrorMessage className="mt-1.5" size="sm">
                      {message}
                    </ErrorMessage>
                  )}
                />

                <div className="mt-3 flex gap-3 flex-wrap">
                  {skillsField?.map((skill) => (
                    <Badge key={skill.id} visual="primary">
                      {skill.name}
                      <button
                        className="focus-visible:outline-none"
                        onClick={() => {
                          setValue(
                            "skills",
                            skillsField.filter((s) => s.id !== skill.id)
                          )
                          trigger("skills")
                        }}
                      >
                        <X2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
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
            <Button disabled={!isValid} ref={submitTriggerRef}>
              Save
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent className="max-w-[409px] p-0">
                <div className="p-6">
                  <DialogTitle className="text-dark-blue-400">
                    Save Work Experience?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Do you want to save your information?
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose onClick={() => reset()} asChild>
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

const educationFormSchema = z
  .object({
    schoolOrUniversity: z
      .string()
      .min(1, "Please enter at least 1 character(s)"),
    degree: z.string().min(1, "Please enter at least 1 character(s)"),
    major: z.string().min(1, "Please enter at least 1 character(s)"),
    startDate: z.object({
      month: z
        .number()
        .min(1)
        .max(12)
        .refine((value) => Boolean(value), {
          message: "Please select a month",
        }),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .refine((value) => Boolean(value), {
          message: "Please select a year",
        }),
    }),
    endDate: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z
        .number()
        .gte(new Date().getFullYear() - 100)
        .lte(new Date().getFullYear())
        .optional(),
    }),
    currentlyAttending: z.boolean(),
  })
  .refine(
    (data) =>
      data.currentlyAttending
        ? true
        : z
            .object({
              month: z.number().min(1).max(12),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a month",
      path: ["endDate.month"],
    }
  )
  .refine(
    (data) =>
      data.currentlyAttending
        ? true
        : z
            .object({
              year: z
                .number()
                .gte(new Date().getFullYear() - 100)
                .lte(new Date().getFullYear()),
            })
            .safeParse(data.endDate).success,
    {
      message: "Please select a year",
      path: ["endDate.year"],
    }
  )

type EducationFormValues = z.infer<typeof educationFormSchema>

const educationFormDefaultValues = {
  currentlyAttending: false,
  degree: "",
  major: "",
  schoolOrUniversity: "",
} as EducationFormValues

export const EducationDialog = ({
  opened,
  onOpenedChange,
  trigger,
  defaultValue,
  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: EducationFormValues
  }) => React.ReactNode
  defaultValue?: EducationFormValues
  value?: EducationFormValues
  onValueChange?: (value: EducationFormValues) => void
}) => {
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [value, setValue] = useControllableState<EducationFormValues>({
    defaultValue: defaultValue ? defaultValue : educationFormDefaultValues,
    value: valueProp,
    onChange: onValueChange,
  })

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
    },
  })

  const onSubmit: SubmitHandler<EducationFormValues> = (values) => {
    setValue(values)
    setOpen(false)
  }

  const currentlyAttending = useWatch({ control, name: "currentlyAttending" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 pt-6 px-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Education
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

            <div className="mt-8">
              <div className="pb-[50px]">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label
                      htmlFor="school-or-university"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      School or University
                    </Label>
                    <Input
                      id="school-or-university"
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
                      htmlFor="degree"
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
                            {[
                              "Option 1",
                              "Option 2",
                              "Option 3",
                              "Option 4",
                              "Option 5",
                            ].map((month) => (
                              <ListboxOption key={month} value={month}>
                                {month}
                              </ListboxOption>
                            ))}
                          </ListboxOptions>
                        </Listbox>
                      )}
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
                      htmlFor="major"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Major
                    </Label>
                    <Input
                      id="major"
                      placeholder="Engineering"
                      {...register("major")}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "major",
                      })}
                    />
                    <HookFormErrorMessage
                      name="major"
                      errors={errors}
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label
                      htmlFor="start-date"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      Start Date
                    </Label>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="space-y-1.5">
                        <Controller
                          name="startDate.month"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) => `${value}`}
                                placeholder="Month"
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "startDate.month",
                                })}
                              />
                              <ListboxOptions>
                                {months
                                  .map((month) => month.value)
                                  .map((m) => (
                                    <ListboxOption key={m} value={m}>
                                      {m}
                                    </ListboxOption>
                                  ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="startDate.month"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          name="startDate.year"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) => `${value}`}
                                placeholder="Year"
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "startDate.year",
                                })}
                              />
                              <ListboxOptions>
                                {[
                                  2020, 2021, 2022, 2023, 2024, 2025, 2026,
                                  2027,
                                ].map((month) => (
                                  <ListboxOption key={month} value={month}>
                                    {month}
                                  </ListboxOption>
                                ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />

                        <HookFormErrorMessage
                          name="startDate.year"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "space-y-1.5 col-span-2",
                      currentlyAttending && "pointer-events-none opacity-50"
                    )}
                  >
                    <Label
                      htmlFor="end-date"
                      className="text-dark-blue-400"
                      size="sm"
                    >
                      End Date
                    </Label>
                    <div className="grid grid-cols-2 gap-x-4">
                      <div className="space-y-1.5">
                        <Controller
                          name="endDate.month"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) => `${value}`}
                                placeholder="Month"
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "endDate.month",
                                })}
                              />
                              <ListboxOptions>
                                {months
                                  .map((month) => month.value)
                                  .map((m) => (
                                    <ListboxOption key={m} value={m}>
                                      {m}
                                    </ListboxOption>
                                  ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="endDate.month"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Controller
                          name="endDate.year"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <Listbox value={value} onChange={onChange}>
                              <ListboxButton
                                displayValue={(value: number) => `${value}`}
                                placeholder="Year"
                                isInvalid={hookFormHasError({
                                  errors,
                                  name: "endDate.year",
                                })}
                              />
                              <ListboxOptions>
                                {[
                                  2020, 2021, 2022, 2023, 2024, 2025, 2026,
                                  2027,
                                ].map((month) => (
                                  <ListboxOption key={month} value={month}>
                                    {month}
                                  </ListboxOption>
                                ))}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                        <HookFormErrorMessage
                          name="endDate.year"
                          errors={errors}
                          render={({ message }) => (
                            <ErrorMessage size="sm">{message}</ErrorMessage>
                          )}
                        />
                      </div>
                    </div>
                  </div>

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
                      I’m currently attending
                    </Label>
                  </div>
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

const languagesFormSchema = z.object({
  languages: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .min(1, "Please at least provide 1 language(s)"),
})

type LanguagesFormValues = z.infer<typeof languagesFormSchema>

const languagesFormDefaultValue = {
  languages: [],
} satisfies LanguagesFormValues

export const Languages = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: LanguagesFormValues
  }) => React.ReactNode
  defaultValue?: LanguagesFormValues
  value?: LanguagesFormValues
  onValueChange?: (value: LanguagesFormValues) => void
}) => {
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : languagesFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<LanguagesFormValues>({
    resolver: zodResolver(languagesFormSchema),
    defaultValues: value,
  })
  const [languages] = useState([
    { id: 1, name: "English 0" },
    { id: 2, name: "English 1" },
    { id: 3, name: "English 2" },
    { id: 4, name: "English 3" },
    { id: 5, name: "English 4" },
    { id: 6, name: "English 5" },
    { id: 7, name: "English 6" },
    { id: 8, name: "English 7" },
    { id: 9, name: "English 8" },
    { id: 10, name: "English 9" },
    { id: 11, name: "English 10" },
  ])

  const selected = useWatch({ control, name: "languages" })
  const [query, setQuery] = useState("")

  const filteredLanguages =
    query === ""
      ? languages
      : languages.filter((language) =>
          language.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const onRemove = (index: number) => {
    setValue("languages", selected?.filter((_, i) => i !== index))
    trigger()
  }

  const onSubmit: SubmitHandler<LanguagesFormValues> = (values) => {
    setValueFn(values)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
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

            <Controller
              name="languages"
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
                      displayValue={(language: { id: number; name: string }) =>
                        language.name
                      }
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Enter your language"
                      invalid={hookFormHasError({ errors, name: "languages" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredLanguages.map((language) => (
                          <ComboboxOption key={language.id} value={language}>
                            {language.name}
                          </ComboboxOption>
                        ))}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <HookFormErrorMessage
              errors={errors}
              name="languages"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((language, index) => (
                <Badge visual="primary" key={language.id}>
                  {language.name}
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

const skillsFormSchema = z.object({
  skills: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .min(1, "Please at least provide 1 language(s)"),
})

type SkillsFormValues = z.infer<typeof skillsFormSchema>

const skillsFormDefaultValue: SkillsFormValues = {
  skills: [],
}

export const Skills = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: SkillsFormValues
  }) => React.ReactNode
  defaultValue?: SkillsFormValues
  value?: SkillsFormValues
  onValueChange?: (value: SkillsFormValues) => void
}) => {
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : skillsFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<SkillsFormValues>({
    resolver: zodResolver(skillsFormSchema),
  })
  const [skills] = useState([
    { id: 1, name: "English 0" },
    { id: 2, name: "English 1" },
    { id: 3, name: "English 2" },
    { id: 4, name: "English 3" },
    { id: 5, name: "English 4" },
    { id: 6, name: "English 5" },
    { id: 7, name: "English 6" },
    { id: 8, name: "English 7" },
    { id: 9, name: "English 8" },
    { id: 10, name: "English 9" },
    { id: 11, name: "English 10" },
  ])

  const selected = useWatch({ control, name: "skills" })
  const [query, setQuery] = useState("")

  const filteredSkills =
    query === ""
      ? skills
      : skills.filter((language) =>
          language.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const onRemove = (index: number) => {
    setValue("skills", selected?.filter((_, i) => i !== index))
    trigger()
  }

  const onSubmit: SubmitHandler<SkillsFormValues> = (values) => {
    setValueFn(values)
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
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
                      displayValue={(skill: { id: number; name: string }) =>
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
                        {filteredSkills.map((skill) => (
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

            <HookFormErrorMessage
              errors={errors}
              name="languages"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
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

const industriesFormSchema = z.object({
  industries: z
    .array(z.object({ id: z.number(), name: z.string() }))
    .min(1, "Please at least provide 1 industry"),
})

type IndustriesFormValues = z.infer<typeof industriesFormSchema>

const industriesFormDefaultValue: IndustriesFormValues = {
  industries: [],
}

export const IndustryExpertise = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  defaultValue,
  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: IndustriesFormValues
  }) => React.ReactNode
  defaultValue?: IndustriesFormValues
  value?: IndustriesFormValues
  onValueChange?: (value: IndustriesFormValues) => void
}) => {
  const [value, setValueFn] = useControllableState({
    defaultValue: defaultValue ? defaultValue : industriesFormDefaultValue,
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const {
    control,
    formState: { isValid, errors },
    handleSubmit,
    setValue,
    trigger,
  } = useForm<IndustriesFormValues>({
    resolver: zodResolver(industriesFormSchema),
  })
  const [expertise] = useState([
    { id: 1, name: "Expertise 0" },
    { id: 2, name: "Expertise 1" },
    { id: 3, name: "Expertise 2" },
    { id: 4, name: "Expertise 3" },
    { id: 5, name: "Expertise 4" },
    { id: 6, name: "Expertise 5" },
    { id: 7, name: "Expertise 6" },
    { id: 8, name: "Expertise 7" },
    { id: 9, name: "Expertise 8" },
    { id: 10, name: "Expertise 9" },
    { id: 11, name: "Expertise 10" },
  ])
  const selected = useWatch({ control, name: "industries" })
  const [query, setQuery] = useState("")

  const filteredExpertise =
    query === ""
      ? expertise
      : expertise.filter((item) =>
          item.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const onRemove = (index: number) => {
    setValue("industries", selected?.filter((_, i) => i !== index))
    trigger()
  }
  const onSubmit: SubmitHandler<IndustriesFormValues> = (values) => {
    setValueFn(values)
    setOpen(false)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6 pb-[50px]">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Industry Expertise
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Let us know which industries you have experience with
                </p>
              </div>

              <DialogClose type="button" asChild>
                <IconButton variant="ghost" visual="gray">
                  <X className="size-5" />
                </IconButton>
              </DialogClose>
            </div>

            <Controller
              name="industries"
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
                      className="w-full"
                      size="lg"
                      displayValue={(industry: { id: number; name: string }) =>
                        industry.name
                      }
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search for industries"
                      invalid={hookFormHasError({ errors, name: "industries" })}
                    />
                    <ComboboxButton>
                      <SearchMd className="h-4 w-4" />
                    </ComboboxButton>
                  </ComboboxTrigger>
                  <ScaleOutIn afterLeave={() => setQuery("")}>
                    <ComboboxOptions>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {filteredExpertise.map((language) => (
                          <ComboboxOption key={language.id} value={language}>
                            {language.name}
                          </ComboboxOption>
                        ))}
                      </ScrollArea>
                    </ComboboxOptions>
                  </ScaleOutIn>
                </Combobox>
              )}
            />

            <HookFormErrorMessage
              errors={errors}
              name="industries"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5" size="sm">
                  {message}
                </ErrorMessage>
              )}
            />

            <div className="mt-3 flex gap-3 flex-wrap">
              {selected?.map((expertise, index) => (
                <Badge visual="primary" key={expertise.id}>
                  {expertise.name}
                  <button
                    className="focus-visible:outline-none"
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

const certificationsFormSchema = z
  .object({
    name: z.string().min(1, "Please provide at least 1 character(s)"),
    credentialId: z.string(),
    credentialsUrl: z
      .string()
      .refine(
        (url) => !url?.length || z.string().url().safeParse(url).success,
        {
          message: "Please provide a valid url",
        }
      ),
    skills: z
      .array(z.object({ id: z.number(), name: z.string() }))
      .min(1, "Please provide at least 1 skill(s)"),
    issuedDate: z.instanceof(Date, { message: "Please provide a valid date" }),
    expirationDate: z
      .instanceof(Date, {
        message: "Please provide a valid date",
      })
      .optional(),
    canNotExpire: z.boolean(),
  })
  .refine((data) => isBefore(data.issuedDate, new Date()), {
    message: "Please enter a valid date",
    path: ["issuedDate"],
  })
  .refine((data) => data.canNotExpire || Boolean(data.expirationDate), {
    message: "Please provide an expiration date",
    path: ["expirationDate"],
  })

type CertificationsFormValues = z.infer<typeof certificationsFormSchema>

export const Certifications = ({
  opened,
  onOpenedChange,
  trigger: triggerProp,
  onValueChange,
  value: valueProp,
}: {
  opened?: boolean
  onOpenedChange?: (open: boolean) => void
  trigger?: (options: {
    open: boolean
    toggle: () => void
    formValues: CertificationsFormValues[] | undefined
  }) => React.ReactNode
  value?: CertificationsFormValues[]
  onValueChange?: (value: CertificationsFormValues[] | undefined) => void
}) => {
  const submitTriggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useControllableState({
    defaultValue: false,
    value: opened,
    onChange: onOpenedChange,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValueFn] = useControllableState<
    CertificationsFormValues[] | undefined
  >({
    value: valueProp,
    onChange: onValueChange,
  })
  const {
    control,
    formState: { errors, isValid, isDirty },
    handleSubmit,
    setValue,
    reset,
    trigger,
  } = useForm<CertificationsFormValues>({
    resolver: zodResolver(certificationsFormSchema),
    defaultValues: {
      credentialId: "",
      credentialsUrl: "",
      name: "",
      canNotExpire: false,
      issuedDate: undefined,
      expirationDate: undefined,
      skills: [],
    },
  })
  const [isShowing, setIsShowing] = useState(false)
  const [skills] = useState([
    { id: 1, name: "Expertise 0" },
    { id: 2, name: "Expertise 1" },
    { id: 3, name: "Expertise 2" },
    { id: 4, name: "Expertise 3" },
    { id: 5, name: "Expertise 4" },
    { id: 6, name: "Expertise 5" },
    { id: 7, name: "Expertise 6" },
    { id: 8, name: "Expertise 7" },
    { id: 9, name: "Expertise 8" },
    { id: 10, name: "Expertise 9" },
    { id: 11, name: "Expertise 10" },
  ])
  const selected = useWatch({ control, name: "skills" })
  const [query, setQuery] = useState("")

  const filteredSkills =
    query === ""
      ? skills
      : skills.filter((skill) =>
          skill.name
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  const onSubmit: SubmitHandler<CertificationsFormValues> = (values) => {
    setValueFn((prev) => (prev ? [...prev, values] : [values]))
    setOpen(false)
    reset()
  }

  const onRemove = (index: number) => {
    setValue("skills", selected?.filter((_, i) => i !== index))
    trigger("skills")
  }

  const canNotExpire = useWatch({ control, name: "canNotExpire" })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerProp?.({
        open,
        toggle: () => setOpen((prev) => !prev),
        formValues: value,
      })}
      <DialogContent className="max-w-[700px] rounded-[12px] p-0">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-start gap-x-2">
              <div className="flex-auto">
                <h1 className="text-lg text-dark-blue-400 leading-7 font-semibold">
                  Certifications
                </h1>
                <p className="text-sm font-light text-dark-blue-400">
                  Showcase your training credentials!
                </p>
              </div>

              <IconButton
                type="button"
                variant="ghost"
                visual="gray"
                onClick={() => (isDirty ? setIsOpen(true) : setOpen(false))}
              >
                <X className="size-5" />
              </IconButton>
            </div>

            <div className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="certification-or-license" size="sm">
                  Name of Certification or License{" "}
                </Label>
                <Controller
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <Input
                      id="certification-or-license"
                      placeholder="Enter certification or license title"
                      {...field}
                      isInvalid={hookFormHasError({ errors, name: "name" })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="name"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-x-5">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date" size="sm">
                      Issue date
                    </Label>

                    <Controller
                      control={control}
                      name="issuedDate"
                      render={({ field: { value, onChange } }) => (
                        <DatePicker
                          inputClassName="w-full justify-start"
                          indicator={
                            <Calendar className="size-5 text-gray-500" />
                          }
                          placeholder="MM/DD/YYYY"
                          value={value}
                          onValueChange={onChange}
                        />
                      )}
                    />
                    <HookFormErrorMessage
                      errors={errors}
                      name="issuedDate"
                      render={({ message }) => (
                        <ErrorMessage size="sm">{message}</ErrorMessage>
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-x-3">
                    <Controller
                      control={control}
                      name="canNotExpire"
                      render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                          id="whether-expired"
                          checked={value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      )}
                    />
                    <Label size="sm" htmlFor="whether-expired">
                      It doesn’t expire
                    </Label>
                  </div>
                </div>
                <div
                  className={cn(
                    "space-y-1.5",
                    canNotExpire && "pointer-events-none opacity-50"
                  )}
                >
                  <Label htmlFor="expiration-date" size="sm">
                    Expiration Date
                  </Label>
                  <Controller
                    control={control}
                    name="expirationDate"
                    render={({ field: { value, onChange } }) => (
                      <DatePicker
                        inputClassName="w-full justify-start"
                        indicator={
                          <Calendar className="size-5 text-gray-500" />
                        }
                        placeholder="MM/DD/YYYY"
                        value={value}
                        onValueChange={onChange}
                      />
                    )}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="expirationDate"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credentials-id" size="sm">
                  Credentials ID <span className="font-light">(optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="credentialId"
                  render={({ field }) => (
                    <Input
                      id="credentials-id"
                      placeholder="Ex. 123456"
                      {...field}
                      isInvalid={hookFormHasError({ errors, name: "name" })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="credentialId"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="credentials-url" size="sm">
                  Credentials URL <span className="font-light">(optional)</span>
                </Label>
                <Controller
                  control={control}
                  name="credentialsUrl"
                  render={({ field: { onChange, value, ...field } }) => (
                    <InputGroup>
                      <InputLeftAddon>https://</InputLeftAddon>
                      <Input
                        type="text"
                        placeholder="website.com"
                        value={
                          value?.startsWith("https://") ? value.slice(8) : value
                        }
                        onChange={(e) =>
                          onChange(
                            e.target.value.startsWith("https://")
                              ? e.target.value
                              : `https://${e.target.value}`
                          )
                        }
                        {...field}
                        isInvalid={hookFormHasError({
                          errors,
                          name: "credentialsUrl",
                        })}
                      />
                    </InputGroup>
                  )}
                />

                <HookFormErrorMessage
                  errors={errors}
                  name="credentialsUrl"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>

              <div>
                <Label size="sm">Skills</Label>
                <span className="inline-block mt-2">
                  Which skills are associated with this license or certificate?
                </span>

                <div className="mt-3">
                  {isShowing ? (
                    <Controller
                      name="skills"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <Combobox
                          multiple
                          className="w-auto"
                          value={value}
                          onChange={onChange}
                        >
                          <ComboboxTrigger>
                            <ComboboxInput
                              className="w-full"
                              size="lg"
                              displayValue={(skill: {
                                id: number
                                name: string
                              }) => skill.name}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Find skills"
                            />
                            <ComboboxButton>
                              <SearchMd className="size-5" />
                            </ComboboxButton>
                          </ComboboxTrigger>
                          <ScaleOutIn afterLeave={() => setQuery("")}>
                            <ComboboxOptions>
                              <ScrollArea className="h-[304px]">
                                {filteredSkills.map((skill) => (
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
                  ) : (
                    <Button
                      visual="gray"
                      variant="outlined"
                      className="rounded-full"
                      onClick={() => setIsShowing(true)}
                    >
                      <Plus className="size-[15px]" />
                      Add Skills
                    </Button>
                  )}

                  <div className="mt-3 flex gap-3 flex-wrap">
                    {selected?.map((skill, index) => (
                      <Badge visual="primary" key={skill.id}>
                        {skill.name}
                        <button
                          className="focus-visible:outline-none"
                          onClick={() => onRemove(index)}
                        >
                          <X2 className="size-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
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
                    Save Job Title & Rate?
                  </DialogTitle>
                  <DialogDescription className="text-dark-blue-400 mt-2">
                    Do you want to save your information?
                  </DialogDescription>
                </div>

                <div className="border-t rounded-b-xl flex items-center justify-between border-gray-200 bg-gray-25 py-4 px-6">
                  <DialogClose onClick={() => reset()} asChild>
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

export const AffiliatedTeams = ({
  trigger,
}: {
  trigger?: (opts: { toggle: () => void }) => React.ReactNode
}) => {
  const [open, setOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({ toggle: () => setOpen((prev) => !prev) })}
      <DialogContent className="max-w-[452px] py-8">
        <IconButton
          visual="gray"
          variant="ghost"
          className="opacity-50 absolute top-2.5 right-2.5 hover:opacity-100"
          size="md"
        >
          <X className="size-5" />
        </IconButton>

        <div className="max-w-[352px] mx-auto flex flex-col">
          <div className="size-16 mx-auto rounded-full shrink-0 flex-none border-[8px] bg-gray-100 border-gray-50 inline-flex items-center justify-center">
            <XCircle className="size-6 text-gray-500" />
          </div>

          <h2 className="text-base text-center mt-4 font-semibold text-gray-950">
            You’re not affilated with any teams
          </h2>

          <p className="text-sm leading-5 text-gray-600 text-center mt-1">
            {" "}
            To get started with your first team browse the marketplace for the
            latest teams.
          </p>

          <div className="flex justify-center mt-6">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => setIsOpen(true)}
            >
              Browse Teams
            </Button>

            <AffiliatedTeams1 open={isOpen} onOpenChange={setIsOpen} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const AffiliatedTeams1 = ({
  onOpenChange,
  open,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) => {
  const [state, setState] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  })
  return (
    <Dialog open={state} onOpenChange={setState}>
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
          <article className="rounded-lg border p-5 flex items-start gap-x-2 border-gray-200 bg-white">
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
          <article className="rounded-lg border p-5 flex items-start gap-x-2 border-gray-200 bg-white">
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
          <article className="rounded-lg border p-5 flex items-start gap-x-2 border-gray-200 bg-white">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const MyOffers = ({
  trigger,
}: {
  trigger?: (opts: { toggle: () => void }) => React.ReactNode
}) => {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger?.({ toggle: () => setOpen((prev) => !prev) })}
      <DialogContent className="max-w-[1060px] rounded-[20px]">
        <div className="flex items-center justify-between">
          <h1 className="text-[36px] leading-11 tracking-[.02em] font-semibold text-dark-blue-400">
            My Offers
          </h1>

          <div className="flex items-center gap-x-2">
            <Button variant="outlined" visual="gray">
              <Plus className="size-[15px]" />
              New Offer
            </Button>

            <DialogClose asChild>
              <IconButton visual="gray" variant="ghost">
                <X className="size-4" />
              </IconButton>
            </DialogClose>
          </div>
        </div>

        <ScrollArea
          className="mt-5"
          viewportClassName="max-h-[578px]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="bg-gray-50 p-[30px] border-t border-x border-gray-200 grid grid-cols-3 gap-6">
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                <NextImage
                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                  src="/dashboard.png"
                  alt="Dashboard"
                  fill
                  sizes="33vw"
                />
              </div>

              <div className="mt-3 flex items-start gap-x-3">
                <NextLink
                  href="#"
                  className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                >
                  The Ultimate Mobile App Experience
                </NextLink>

                <div className="inline-flex items-center gap-x-1">
                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                    4.9 <span className="font-extralight">(5)</span>
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                Brief Description of the project. Lorem ipsum dolor sit amet,
                consectetur adipiscing elit, sed do eiusmod tempor incididunt.
              </p>

              <div className="mt-[14.5px] flex flex-col gap-y-3">
                <div className="flex items-center gap-x-[6.4px]">
                  <Clock className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    Starting from 12 weeks
                  </span>
                </div>

                <div className="flex items-center gap-x-[6.4px]">
                  <Money className="size-[18px] shrink-0 text-primary-500" />

                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                    $50,000 budget
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AvatarGroup
                        max={5}
                        size="sm"
                        excess
                        excessClassName="border-gray-300 text-gray-500"
                      >
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                        <Avatar
                          size="sm"
                          className="border-2 border-white hover:ring-0 active:ring-0"
                        >
                          <AvatarImage src="/woman.jpg" alt="Woman" />
                          <AvatarFallback>W</AvatarFallback>
                        </Avatar>
                      </AvatarGroup>
                    </TooltipTrigger>

                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                      <ScrollArea
                        className="h-[192px] p-3"
                        scrollBar={
                          <ScrollBar
                            className="w-4 p-1"
                            thumbClassName="bg-white/20"
                          />
                        }
                      >
                        <div className="space-y-3 pr-5">
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-x-[18px]">
                            <div className="flex items-center gap-x-2 flex-auto">
                              <Avatar>
                                <AvatarImage src="/woman.jpg" alt="Woman" />
                                <AvatarFallback>W</AvatarFallback>
                              </Avatar>

                              <div className="flex flex-col flex-auto">
                                <div className="flex items-center gap-x-0.5">
                                  <span className="text-xs leading-5 font-semibold text-white">
                                    Sevil
                                  </span>
                                  <span className="text-[10px] leading-none font-light text-white">
                                    @designsuperstar23
                                  </span>
                                </div>
                                <span className="text-[10px] font-light text-white">
                                  Full-stack Developer
                                </span>
                              </div>
                            </div>

                            <span className="text-sm font-semibold text-white leading-5">
                              $75{" "}
                              <span className="text-[10px] font-light leading-5">
                                /hr
                              </span>
                            </span>
                          </div>
                        </div>
                      </ScrollArea>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <IconButton
                  className="rounded-full text-gray-400 hover:text-gray-800"
                  visual="gray"
                  variant="ghost"
                >
                  <Edit03 className="size-4" />
                </IconButton>
              </div>
            </article>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
