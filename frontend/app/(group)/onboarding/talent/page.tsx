"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import industriesMock from "@/public/mock/industries.json"
import jobTitlesMock from "@/public/mock/job_titles.json"
import languagesMock from "@/public/mock/languages.json"
import rawProjectTypeSuggestions from "@/public/mock/projectsnew.json"
import rawSkillSuggestions from "@/public/mock/skills.json"
import { AuthAPI } from "@/service/http/auth"
import {
  AutocompleteAPI,
  type AutocompleteCategorySuggestion,
  type AutocompleteTypeSuggestion,
} from "@/service/http/autocomplete"
import { TalentAPI } from "@/service/http/talent"
import { UserAPI } from "@/service/http/user"
import { DAY_PERIODS, HOT_KEYS, TIMES } from "@/utils/constants"
import {
  capitalize,
  cn,
  convertToTitleCase,
  getIsNotEmpty,
  hookFormHasError,
  noop,
} from "@/utils/functions"
import { useControllableState, useStepper } from "@/utils/hooks"
import {
  nonsenseKeywordCheck,
  profanityCheck,
  spellCheck,
} from "@/utils/jobTitleValidation"
import { generateUsernameSuggestions } from "@/utils/username"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronRight,
  File02,
  FileText,
  Home03,
  Plus,
  RefreshCw01,
  SearchLg,
  Trash03,
  Upload,
  User01,
  Users03,
  X,
  X2,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Steps } from "headless-stepper"
import {
  Controller,
  SubmitHandler,
  UseFormSetValue,
  useForm,
  useWatch,
} from "react-hook-form"
import { useDebounce, useIsomorphicLayoutEffect, useToggle } from "react-use"
import { z } from "zod"
import { DAYS } from "@/types/day"
import { AVAILABILITY, type CreateTalentType } from "@/types/talent"
import { ROLE, type User } from "@/types/user"
import { Logo } from "@/components/icons"
import { Pointer } from "@/components/icons/pointer"
import NextLink from "@/components/next-link"
import { Triangles } from "@/components/triangles"
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Combobox,
  ComboboxInput,
  Dialog,
  DialogContent,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  ErrorMessage,
  IconButton,
  ImageEditor,
  Input,
  Label,
  ScaleOutIn,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Step,
  StepControl,
  StepRootProvider,
  StepperProvider,
  Switch,
  useStepContext,
  useStepRootContext,
  useStepperContext,
  useToast,
} from "@/components/ui"
import { Spinner } from "@/components/ui/spinner/spinner"

const skillSuggestions = Array.isArray(rawSkillSuggestions)
  ? rawSkillSuggestions
  : []

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/
const USERNAME_RULE_MESSAGE =
  "Username can only contain letters, numbers, and underscores"

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const trimmedValue = value.trim()
  return trimmedValue.length ? trimmedValue : undefined
}, z.string().optional())

const optionalUsernameString = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const trimmedValue = value.trim()
  return trimmedValue.length ? trimmedValue : undefined
}, z.string().min(3, "Please enter at least 3 character(s)").regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE).optional())

const optionalStringArray = z.preprocess((value) => {
  if (!Array.isArray(value)) return value

  const normalizedValues = value
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter(
      (item): item is string => typeof item === "string" && item.length > 0
    )

  return normalizedValues.length ? normalizedValues : undefined
}, z.array(z.string()).optional())

const optionalFileArray = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) return value
    return value.length ? value : undefined
  },
  z.array(z.instanceof(File)).optional()
)

const introduceYourselfFormSchema = z.object({
  avatar: optionalFileArray,
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
})

type IntroduceYourselfFormValues = z.infer<typeof introduceYourselfFormSchema>

const IntroduceYourself = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
}) => {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (stepData?.avatar instanceof File) {
      const url = URL.createObjectURL(stepData.avatar)
      setAvatarPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [])

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
    watch,
  } = useForm<IntroduceYourselfFormValues>({
    resolver: zodResolver(introduceYourselfFormSchema),
    defaultValues: {
      avatar: stepData?.avatar ? [stepData.avatar] : undefined,
      firstName: stepData?.firstName || "",
      lastName: stepData?.lastName || "",
    },
  })
  const { firstName, lastName } = watch()

  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.trim()

  const onSubmit: SubmitHandler<IntroduceYourselfFormValues> = ({
    avatar,
    firstName,
    lastName,
  }) => {
    const hasAnyField = (avatar && avatar.length > 0) || firstName || lastName
    if (!hasAnyField) {
      setFormError("Please enter at least one field")
      return
    }
    setFormError(null)
    setStepData({
      ...stepData,
      avatar: avatar?.[0],
      firstName,
      lastName,
    })
    toggleValidation(true)
    nextStep()
  }

  const skip = () => {
    setStepData({
      ...stepData,
      avatar: undefined,
      firstName: undefined,
      lastName: undefined,
    })
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}

      <form
        className="relative grid items-start flex-auto py-10 px-5 md:px-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] lg:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 2 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Introduce yourself!
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Tell us a bit about you to help us connect you with the right
            opportunities!
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="space-y-6">
              <div className="flex flex-col gap-y-1.5">
                <Label
                  className="text-dark-blue-400"
                  htmlFor="profile-photo"
                  asChild
                >
                  <span>Profile Photo</span>
                </Label>
                <Controller
                  control={control}
                  name="avatar"
                  render={({ field: { onChange } }) => (
                    <ImageEditor
                      onValueChange={onChange}
                      defaultDataUrl={avatarPreviewUrl}
                      startingPoint={({ dataUrl, open, style }: any) => (
                        <div className="flex flex-col gap-y-3 sm:flex-row sm:items-center sm:gap-x-4">
                          <div className="relative overflow-hidden size-[96px] bg-gray-100 rounded-full inline-flex items-center justify-center shrink-0">
                            {dataUrl ? (
                              <img
                                alt="Avatar"
                                src={dataUrl}
                                className="rounded-full absolute inset-0 size-full object-cover transform"
                                style={style}
                              />
                            ) : (
                              <User01 className="size-11 text-gray-300" />
                            )}
                          </div>

                          {dataUrl ? (
                            <Button
                              className="rounded-full"
                              size="md"
                              onClick={open}
                              type="button"
                              variant="filled"
                              visual="gray"
                            >
                              <Upload className="size-[15px]" /> Change Photo
                            </Button>
                          ) : (
                            <Button
                              className="rounded-full"
                              size="md"
                              type="button"
                              variant="outlined"
                              visual="gray"
                              onClick={open}
                            >
                              <Upload className="size-[15px]" /> Upload Picture
                            </Button>
                          )}
                        </div>
                      )}
                    />
                  )}
                />

                <HookFormErrorMessage
                  errors={errors}
                  name="avatar"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>

              <div className="grid 2xl:grid-cols-2 gap-6">
                <div className="flex flex-col gap-y-1.5">
                  <Label
                    className="text-dark-blue-400"
                    htmlFor="first-name"
                    size="sm"
                  >
                    First Name
                  </Label>
                  <Input
                    placeholder="John"
                    id="first-name"
                    {...register("firstName")}
                    isInvalid={hookFormHasError({ errors, name: "firstName" })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="firstName"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-y-1.5">
                  <Label
                    className="text-dark-blue-400"
                    htmlFor="last-name"
                    size="sm"
                  >
                    Last Name
                  </Label>
                  <Input
                    placeholder="Doe"
                    id="last-name"
                    {...register("lastName")}
                    isInvalid={hookFormHasError({ errors, name: "lastName" })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="lastName"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
              </div>

              {formError && <ErrorMessage size="sm">{formError}</ErrorMessage>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-6 w-full max-w-[488px] self-end bg-white py-4 2xl:mt-8 2xl:max-w-[560px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={prevStep}
            >
              Back
            </Button>

            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
              >
                Skip
              </Button>
              <Button size="md" visual="primary">
                Continue
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const createYourUsernameFormSchema = z.object({
  username: optionalUsernameString,
})

type CreateYourUsernameFormValues = z.infer<typeof createYourUsernameFormSchema>

const CreateYourUsername = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
}) => {
  const [show, toggleShow] = useToggle(false)
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null)
  const [isUsernameLoading, setIsUsernameLoading] = useToggle(false)
  const [availableSuggestions, setAvailableSuggestions] = React.useState<
    string[]
  >([])
  const [isSuggestionsLoading, setIsSuggestionsLoading] = React.useState(false)
  const collapsedSuggestions = availableSuggestions.slice(0, 3)
  const expandedSuggestions = availableSuggestions.slice(0, 6)

  const {
    watch,
    formState: { errors, isValid },
    setValue,
    register,
    handleSubmit,
    trigger,
    clearErrors,
    setError,
  } = useForm<CreateYourUsernameFormValues>({
    resolver: zodResolver(createYourUsernameFormSchema),
    defaultValues: {
      username: stepData?.username || "",
    },
  })

  const { user } = useAuth()
  const { username } = watch()
  const generatedUsernameSuggestions = useMemo(() => {
    const contextParts = [stepData?.recentJobTitle, user?.email]
      .filter(Boolean)
      .join(" ")
      .trim()
    return generateUsernameSuggestions(
      stepData?.firstName || "",
      "",
      contextParts
    )
  }, [stepData?.firstName, stepData?.recentJobTitle, user?.email])

  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const onSubmit: SubmitHandler<CreateYourUsernameFormValues> = ({
    username,
  }) => {
    setStepData({
      ...stepData,
      username,
    })
    nextStep()
  }
  const setFormValue: UseFormSetValue<CreateYourUsernameFormValues> = (
    key,
    value
  ) => {
    setValue(key, value)
    trigger(key)
  }

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const back = () => {
    setStepData({
      ...stepData,
      username,
    })
    prevStep()
  }

  const checkUsernameAvailability = () => {
    if (
      typeof username === "string" &&
      username.length > 2 &&
      USERNAME_PATTERN.test(username)
    ) {
      setIsUsernameLoading(true)
      clearErrors("username")

      AuthAPI.CheckUsername({ username })
        .then((response) => {
          if (response?.status === 200 && response?.data?.available) {
            setIsAvailable(response?.data?.available)
          } else {
            setIsAvailable(false)
          }
        })
        .catch((error) => {
          if (error?.response?.data?.errors?.message) {
            setError(
              "username",
              {
                ...errors?.username,
                message: error?.response?.data?.errors?.message,
              },
              {
                shouldFocus: true,
              }
            )
            setIsAvailable(false)
          }
        })
        .finally(() => {
          setIsUsernameLoading(false)
        })
    } else {
      setIsAvailable(null)
    }
  }

  useDebounce(checkUsernameAvailability, 700, [username])

  useEffect(() => {
    let isCancelled = false

    const loadAvailableSuggestions = async () => {
      if (generatedUsernameSuggestions.length === 0) {
        setAvailableSuggestions([])
        return
      }

      setIsSuggestionsLoading(true)

      try {
        const results = await Promise.all(
          generatedUsernameSuggestions.map(async (suggestion) => {
            try {
              const response = await AuthAPI.CheckUsername({
                username: suggestion,
              })

              if (response?.status === 200 && response?.data?.available) {
                return suggestion
              }
            } catch {
              return null
            }

            return null
          })
        )

        if (isCancelled) return

        setAvailableSuggestions(
          results.filter(
            (suggestion): suggestion is string => typeof suggestion === "string"
          )
        )
      } finally {
        if (!isCancelled) {
          setIsSuggestionsLoading(false)
        }
      }
    }

    loadAvailableSuggestions()

    return () => {
      isCancelled = true
    }
  }, [generatedUsernameSuggestions])

  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}

      <form
        className="relative grid items-start flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 4 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Create your username
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Your username is one-of-a-kind, and you can always update it
            later...
          </p>

          <div className="mt-[50px]">
            <div className="flex flex-col gap-y-1.5">
              <Label className="text-dark-blue-400" id="username" size="sm">
                Enter Your Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  {...register("username")}
                  isInvalid={hookFormHasError({ errors, name: "username" })}
                  onKeyUp={(e) => {
                    if (!username || username.length < 3) {
                      setIsAvailable(null)
                    }
                  }}
                  className="pr-32"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  {isUsernameLoading ? (
                    <Spinner size={20} strokeWidth={2} />
                  ) : (
                    <>
                      {isAvailable === false && (
                        <ErrorMessage
                          size="sm"
                          className="flex flex-row items-center gap-0.5"
                        >
                          <X width={20} height={20} /> Not Available
                        </ErrorMessage>
                      )}

                      {isAvailable && (
                        <ErrorMessage
                          size="sm"
                          className="text-emerald-600 flex flex-row items-center gap-0.5"
                        >
                          <Check />
                          Available
                        </ErrorMessage>
                      )}
                    </>
                  )}
                </div>
              </div>
              <HookFormErrorMessage
                errors={errors}
                name="username"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            {isSuggestionsLoading ? (
              <div className="mt-6">
                <span className="block text-sm leading-[16.94px] text-gray-500">
                  Checking username suggestions...
                </span>
              </div>
            ) : show ? (
              <div className="mt-6">
                {expandedSuggestions.map((username, index) => (
                  <React.Fragment key={username}>
                    <Button
                      className="text-primary-500/50 hover:text-primary-500"
                      size="lg"
                      visual="gray"
                      variant="link"
                      type="button"
                      onClick={() => setFormValue("username", username)}
                    >
                      {username}
                    </Button>

                    {index !== expandedSuggestions.length - 1 && (
                      <span>, </span>
                    )}
                  </React.Fragment>
                ))}
                {availableSuggestions.length === 0 && (
                  <span className="block text-sm leading-[16.94px] text-gray-500">
                    No available suggestions right now. Try entering your own
                    username.
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-6">
                {availableSuggestions.length > 0 ? (
                  <>
                    <span className="block text-sm leading-[16.94px] text-gray-500">
                      {collapsedSuggestions.map((username, index) => (
                        <React.Fragment key={username}>
                          <Button
                            className="text-primary-500/50 hover:text-primary-500"
                            size="lg"
                            visual="gray"
                            variant="link"
                            type="button"
                            onClick={() => setFormValue("username", username)}
                          >
                            {username}
                          </Button>

                          {index === 0 && collapsedSuggestions.length > 1 && (
                            <span>, </span>
                          )}
                          {index === 1 && collapsedSuggestions.length > 2 && (
                            <span> and </span>
                          )}
                        </React.Fragment>
                      ))}{" "}
                      are available
                    </span>

                    {availableSuggestions.length > 3 && (
                      <Button
                        className="mt-3"
                        size="md"
                        variant="link"
                        type="button"
                        visual="gray"
                        onClick={toggleShow}
                      >
                        <Plus className="size-[15px]" />
                        More suggestions
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="block text-sm leading-[16.94px] text-gray-500">
                    Username suggestions use your name and recent job title once
                    you add them.
                  </span>
                )}
              </div>
            )}

            <div className="mt-[50px]">
              <Alert>
                <AlertIcon>
                  <AlertCircle className="size-5" />
                </AlertIcon>
                <AlertContent>
                  <AlertDescription className="mt-0">
                    {`Feel free to browse projects and explore talent without a username. To connect with profiles or post a project, you'll need to create one.`}
                  </AlertDescription>
                </AlertContent>
              </Alert>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-6 w-full max-w-[488px] self-end bg-white py-4 2xl:mt-8 2xl:max-w-[560px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={back}
            >
              Back
            </Button>

            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
              >
                Skip
              </Button>
              <Button
                disabled={isAvailable === false}
                size="md"
                visual="primary"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const shareYourGoalsFormSchema = z.object({
  location: optionalStringArray,
  languages: optionalStringArray,
})

type ShareYourGoalsFormValues = z.infer<typeof shareYourGoalsFormSchema>
const parseMultiSelectString = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const normalizeAutocompleteLabel = (
  item: AutocompleteCategorySuggestion | AutocompleteTypeSuggestion
) => {
  if ("value" in item && typeof item.value === "string") return item.value
  if ("label" in item && typeof item.label === "string") return item.label
  return ""
}

const getUniqueOptions = (values: string[]) =>
  Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length))
  )

const sortAlphabetically = (values: string[]) =>
  getUniqueOptions(values).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )

const formatSkillLabel = (value: string) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) return ""

  if (
    trimmedValue.toLowerCase() === "react.js" ||
    trimmedValue.toLowerCase() === "react js"
  ) {
    return "React JS"
  }

  if (!/[./]/.test(trimmedValue)) {
    return convertToTitleCase(trimmedValue)
  }

  return convertToTitleCase(trimmedValue.replace(/[./]+/g, " "))
}

const projectPreferenceStaticOptions = getUniqueOptions(
  (Array.isArray(rawProjectTypeSuggestions) ? rawProjectTypeSuggestions : [])
    .map((item) => (typeof item?.label === "string" ? item.label : ""))
    .filter((item) => item.length > 0)
)

const hasCaseInsensitiveExactMatch = (values: string[], candidate: string) => {
  const normalizedCandidate = candidate.trim().toLowerCase()
  if (!normalizedCandidate) return false
  return values.some(
    (value) => value.trim().toLowerCase() === normalizedCandidate
  )
}

const COMMON_SHORT_TOKENS = new Set([
  "ai",
  "ml",
  "ui",
  "ux",
  "qa",
  "hr",
  "it",
  "bi",
  "db",
  "ios",
  "api",
  "aws",
  "gcp",
  "seo",
  "sem",
  "saas",
  "b2b",
  "b2c",
  "erp",
  "crm",
])

const SKILL_ROLE_WORDS = new Set([
  "developer",
  "engineer",
  "engineering",
  "manager",
  "managerial",
  "specialist",
  "consultant",
  "architect",
  "architectural",
  "analyst",
  "administrator",
  "admin",
  "lead",
  "leader",
  "intern",
  "trainee",
])

const normalizeWordToken = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]/g, "")
    .trim()

const toVocabulary = (values: string[]) =>
  new Set(
    values
      .flatMap((value) => value.split(/[^a-zA-Z0-9+#./-]+/))
      .map((word) => normalizeWordToken(word))
      .filter((word) => word.length >= 3)
  )

const normalizeSkillInputForChecks = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const getEditDistance = (a: string, b: string) => {
  const aLen = a.length
  const bLen = b.length

  if (!aLen) return bLen
  if (!bLen) return aLen

  const matrix = Array.from({ length: aLen + 1 }, () =>
    new Array<number>(bLen + 1).fill(0)
  )

  for (let i = 0; i <= aLen; i += 1) matrix[i][0] = i
  for (let j = 0; j <= bLen; j += 1) matrix[0][j] = j

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[aLen][bLen]
}

const hasLikelyMisspelledToken = (
  value: string,
  vocabulary: Set<string>
): boolean => {
  const tokens = value
    .split(/[^a-zA-Z0-9+#./-]+/)
    .map((token) => normalizeWordToken(token))
    .filter(Boolean)

  return tokens.some((token) => {
    if (token.length <= 2) return false
    if (COMMON_SHORT_TOKENS.has(token)) return false
    if (/[0-9+#./-]/.test(token)) return false
    if (!/[aeiou]/.test(token) && token.length > 3) return true
    if (/([a-z])\1\1/i.test(token)) return true
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(token)) return true
    if (vocabulary.has(token) || token.length < 5) return false

    for (const word of vocabulary) {
      if (Math.abs(word.length - token.length) > 2) continue
      const distance = getEditDistance(token, word)
      if (distance <= 1) return true
    }

    return false
  })
}

const isReasonableCustomEntry = async (
  rawValue: string,
  {
    maxWords,
    maxLength,
    vocabulary,
  }: {
    maxWords: number
    maxLength: number
    vocabulary: Set<string>
  }
) => {
  const trimmed = rawValue.trim()
  if (trimmed.length < 2 || trimmed.length > maxLength) return false
  if (trimmed.split(/\s+/).length > maxWords) return false
  if (!/^[a-zA-Z0-9\s\-.&+#/]+$/.test(trimmed)) return false
  if (/^\d+$/.test(trimmed)) return false
  if (hasLikelyMisspelledToken(trimmed, vocabulary)) return false
  if (
    trimmed
      .split(/\s+/)
      .some((token) => SKILL_ROLE_WORDS.has(token.toLowerCase()))
  ) {
    return false
  }

  const normalizedForChecks = normalizeSkillInputForChecks(trimmed)
  if (!normalizedForChecks) return false
  try {
    if (!(await spellCheck(normalizedForChecks))) return false
  } catch {
    // If the remote spell-check service is unavailable, keep the local checks.
  }
  if (!profanityCheck(normalizedForChecks)) return false
  if (!nonsenseKeywordCheck(normalizedForChecks)) return false
  return true
}

const AUTOCOMPLETE_SUBMIT_TYPE_MAP: Record<string, string> = {
  skills: "skill",
  job_titles: "title",
  languages: "language",
  industries: "industry",
  project_types: "project_type",
}

const submitAutocompleteValue = async (type: string, label: string) => {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return false

  try {
    await AutocompleteAPI.submit({
      type: AUTOCOMPLETE_SUBMIT_TYPE_MAP[type] ?? type,
      value: trimmedLabel,
    })
    return true
  } catch {
    return false
  }
}

const SelectionBadge = ({
  children,
  onRemove,
}: {
  children: React.ReactNode
  onRemove: () => void
}) => (
  <Badge visual="primary" size="sm" variant="rounded">
    {children}
    <button
      className="focus-visible:outline-none"
      onClick={onRemove}
      type="button"
    >
      <X2 className="h-3 w-3" />
    </button>
  </Badge>
)

const HighlightedSuggestion = ({
  label,
  query,
  active = false,
}: {
  label: string
  query: string
  active?: boolean
}) => {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return (
      <span className={active ? "font-semibold" : "font-normal"}>{label}</span>
    )
  }

  const normalizedLabel = label.toLowerCase()
  const normalizedQuery = trimmedQuery.toLowerCase()

  if (!normalizedLabel.startsWith(normalizedQuery)) {
    return <span className="font-normal">{label}</span>
  }

  const highlightedPart = label.slice(0, trimmedQuery.length)
  const remainingPart = label.slice(trimmedQuery.length)

  return (
    <span className="font-normal">
      <span className="font-semibold text-gray-900">{highlightedPart}</span>
      {remainingPart}
    </span>
  )
}

const LOCATIONIQ_API_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY?.trim()

const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  if (!LOCATIONIQ_API_KEY) return null

  try {
    const response = await fetch(
      `https://api.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${latitude}&lon=${longitude}&format=json`
    )
    if (!response.ok) return null

    const data = await response.json()
    const address = data?.address ?? {}
    const city =
      address.city || address.town || address.village || address.hamlet
    const state = address.state || address.region
    const country = address.country
    const parts = [city, state, country].filter(Boolean)

    if (parts.length === 0) return null

    return parts.join(", ")
  } catch {
    return null
  }
}

const geocodeLocation = async (
  location: string
): Promise<{ latitude: number; longitude: number } | null> => {
  if (!LOCATIONIQ_API_KEY) return null

  try {
    const response = await fetch(
      `https://api.locationiq.com/v1/search?key=${LOCATIONIQ_API_KEY}&q=${encodeURIComponent(
        location
      )}&format=json&limit=1`
    )
    if (!response.ok) return null

    const data = await response.json()
    const first = Array.isArray(data) ? data[0] : null
    const latitude = Number(first?.lat)
    const longitude = Number(first?.lon)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}

const FALLBACK_TOP_SKILLS = Array.from(
  new Set(
    (Array.isArray(skillSuggestions) ? skillSuggestions : [])
      .map((item) => item?.label?.trim())
      .filter((item): item is string => Boolean(item))
  )
)

const PROJECT_PREFERENCE_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML",
  "CSS",
  "Git",
  "REST APIs",
  "GraphQL",
  "SQL",
  "NoSQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Google Cloud",
  "Agile Methodologies",
  "Test-Driven Development (TDD)",
  "CI/CD",
  "Machine Learning",
  "Data Analysis",
  "UI/UX Design",
  "Version Control",
  "Web Security",
]
const TopSkills = ({
  onValueChange,
  value: valueProp,
  invalid,
  onAcceptedValue,
}: {
  value?: string[]
  onValueChange?: (values: string[]) => void
  invalid?: boolean
  onAcceptedValue?: () => void
}) => {
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    value: valueProp,
    onChange: onValueChange,
  })
  const [open, setOpen] = useState(false)
  const [customSkillOptions, setCustomSkillOptions] = useState<string[]>([])
  const [skillOptions, setSkillOptions] = useState<string[]>(
    sortAlphabetically(FALLBACK_TOP_SKILLS)
  )
  const requestIdRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skillsVocabulary = useMemo(
    () => toVocabulary(skillOptions),
    [skillOptions]
  )

  const resetInputValue = () => setInputValue("")

  const resolveSkillLabel = (value: string) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return ""

    const exactMatch = skillOptions.find(
      (option) => option.trim().toLowerCase() === trimmedValue.toLowerCase()
    )

    return exactMatch
      ? formatSkillLabel(exactMatch)
      : formatSkillLabel(trimmedValue)
  }

  const addValue = async (nextValue = inputValue) => {
    const trimmedValue = nextValue.trim()
    if (!trimmedValue) return
    const normalizedValue = resolveSkillLabel(trimmedValue)

    if (hasCaseInsensitiveExactMatch(values, normalizedValue)) {
      onAcceptedValue?.()
      resetInputValue()
      setOpen(false)
      return
    }

    const isKnownSuggestion = hasCaseInsensitiveExactMatch(
      skillOptions,
      normalizedValue
    )
    if (!isKnownSuggestion) {
      if (
        !isReasonableCustomEntry(normalizedValue, {
          maxWords: 6,
          maxLength: 80,
          vocabulary: skillsVocabulary,
        })
      ) {
        resetInputValue()
        setOpen(false)
        return
      }
      const accepted = await submitAutocompleteValue("skills", normalizedValue)
      if (!accepted) {
        resetInputValue()
        setOpen(false)
        return
      }
    }

    onAcceptedValue?.()
    if (!isKnownSuggestion) {
      setCustomSkillOptions((prev) =>
        sortAlphabetically([...prev, normalizedValue])
      )
    }
    setSkillOptions((prev) => sortAlphabetically([...prev, normalizedValue]))
    setValues((prev) => getUniqueOptions([...prev, normalizedValue]))
    resetInputValue()
    setOpen(false)
  }

  const removeValue = (index: number) => {
    setValues((prev) => {
      return prev.filter((_, i) => i !== index)
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
    setOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) {
      event.preventDefault()
      const activeOption = document.querySelector(
        '[role="option"][data-headlessui-state~="active"]'
      ) as HTMLElement | null
      const activeLabel = activeOption?.textContent?.trim() ?? ""
      void addValue(activeLabel || inputValue)
    }
  }

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const query = inputValue.trim()
    if (!query) {
      requestIdRef.current += 1
      setSkillOptions(
        sortAlphabetically([...FALLBACK_TOP_SKILLS, ...customSkillOptions])
      )
      return
    }

    debounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current
      try {
        const response = await AutocompleteAPI.getByType("skills", query)
        if (currentRequestId !== requestIdRef.current) return

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []

        const normalizedApiValues = Array.from(
          new Set(apiValues.map((item) => normalizeAutocompleteLabel(item)))
        )
          .map((item) => formatSkillLabel(item))
          .filter((item) => item.length > 0)

        if (getIsNotEmpty(normalizedApiValues)) {
          const fallbackMatches = FALLBACK_TOP_SKILLS.filter((skill) =>
            skill.toLowerCase().includes(query.toLowerCase())
          )
          setSkillOptions(
            sortAlphabetically([
              ...fallbackMatches,
              ...customSkillOptions,
              ...normalizedApiValues,
            ])
          )
          return
        }
      } catch {
        // keep fallback options when autocomplete API is unavailable
      }

      const fallbackMatches = FALLBACK_TOP_SKILLS.filter((skill) =>
        skill.toLowerCase().includes(query.toLowerCase())
      )
      setSkillOptions(
        sortAlphabetically([...fallbackMatches, ...customSkillOptions])
      )
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue, customSkillOptions])

  const filteredRoles = inputValue.trim()
    ? skillOptions.filter(
        (skill) =>
          !hasCaseInsensitiveExactMatch(values, skill) &&
          skill.toLowerCase().startsWith(inputValue.trim().toLowerCase())
      )
    : []

  return (
    <div className="flex flex-col gap-y-1.5">
      <Combobox
        className="w-full"
        value={values}
        onChange={(nextSelected) => {
          setValues(
            getUniqueOptions((nextSelected as string[]).filter(Boolean))
          )
          setOpen(false)
          setInputValue("")
        }}
        multiple
      >
        <ComboboxTrigger className="flex flex-col gap-y-1.5">
          <ComboboxLabel size="sm" className="text-dark-blue-400">
            What are your top skills?
          </ComboboxLabel>
          <ComboboxInput
            size="lg"
            className="pl-3.5"
            placeholder="e.g., react.js, css"
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            value={inputValue}
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={open && getIsNotEmpty(filteredRoles)}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredRoles.map((role, index) => (
                <ComboboxOption
                  key={index}
                  value={role}
                  className="font-normal ui-active:font-normal"
                >
                  {({ active }) => (
                    <HighlightedSuggestion
                      label={role}
                      query={inputValue}
                      active={active}
                    />
                  )}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="flex flex-wrap gap-3">
          {values.map((item, index) => (
            <SelectionBadge key={index} onRemove={() => removeValue(index)}>
              {item}
            </SelectionBadge>
          ))}
        </div>
      )}
    </div>
  )
}

const showcaseYourTalentFormSchema = z.object({
  recentJobTitle: optionalTrimmedString,
  industriesWorkedWith: optionalStringArray,
  yourTopSkills: optionalStringArray,
  studying: z.boolean(),
})

type ShowcaseYourTalentFormValues = z.infer<typeof showcaseYourTalentFormSchema>

const ShowcaseYourTalent = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
}) => {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isValid },
    handleSubmit,
    control,
    getValues,
    setValue,
    clearErrors,
    setError,
  } = useForm<ShowcaseYourTalentFormValues>({
    resolver: zodResolver(showcaseYourTalentFormSchema),
    defaultValues: {
      industriesWorkedWith: parseMultiSelectString(
        stepData?.industriesWorkedIn
      ),
      yourTopSkills: stepData?.lookingToWorkWith || [],
      recentJobTitle: stepData?.recentJobTitle || "",
      studying: stepData?.isStudent || false,
    },
  })
  const [jobTitleQuery, setJobTitleQuery] = useState("")
  const [industriesQuery, setIndustriesQuery] = useState("")
  const [isJobTitleOpen, setIsJobTitleOpen] = useState(false)
  const [isIndustriesOpen, setIsIndustriesOpen] = useState(false)
  const [suppressIndustryFocusOpen, setSuppressIndustryFocusOpen] =
    useState(false)
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    parseMultiSelectString(stepData?.industriesWorkedIn)
  )
  const [customJobTitleOptions, setCustomJobTitleOptions] = useState<string[]>(
    []
  )
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>(
    sortAlphabetically(jobTitlesMock.map((item) => item.label))
  )
  const industriesOptions = useMemo(
    () => getUniqueOptions(industriesMock.map((item) => item.label)),
    []
  )
  const jobTitleRequestRef = useRef(0)
  const jobTitleDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )

  const filteredJobTitles = useMemo(() => {
    const query = jobTitleQuery.trim().toLowerCase()
    if (!query) return jobTitleOptions
    return jobTitleOptions.filter((item) =>
      item.toLowerCase().startsWith(query)
    )
  }, [jobTitleOptions, jobTitleQuery])

  const resolveJobTitleLabel = (value: string) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return ""

    const exactMatch = jobTitleOptions.find(
      (option) => option.trim().toLowerCase() === trimmedValue.toLowerCase()
    )

    return exactMatch ?? convertToTitleCase(trimmedValue)
  }
  const filteredIndustries = useMemo(() => {
    const query = industriesQuery.trim().toLowerCase()
    const searchableIndustries = industriesOptions.filter(
      (item) => !selectedIndustries.includes(item)
    )
    if (!query) return searchableIndustries
    return searchableIndustries.filter((item) =>
      item.toLowerCase().startsWith(query)
    )
  }, [industriesOptions, industriesQuery, selectedIndustries])

  const addIndustryValue = async (nextValue: string) => {
    const value = nextValue.trim()
    if (!value) return

    const matchedValue = industriesOptions.find(
      (option) => option.trim().toLowerCase() === value.toLowerCase()
    )
    if (!matchedValue) {
      setIndustriesQuery("")
      setIsIndustriesOpen(false)
      setSuppressIndustryFocusOpen(true)
      return
    }

    clearErrors("industriesWorkedWith")
    if (!selectedIndustries.includes(matchedValue)) {
      const next = [...selectedIndustries, matchedValue]
      setSelectedIndustries(next)
      setValue("industriesWorkedWith", next, { shouldValidate: true })
    }
    setIndustriesQuery("")
    setIsIndustriesOpen(false)
    setSuppressIndustryFocusOpen(true)
  }

  const removeIndustryValue = (target: string) => {
    const next = selectedIndustries.filter((item) => item !== target)
    setSelectedIndustries(next)
    setValue("industriesWorkedWith", next, { shouldValidate: true })
  }

  useEffect(() => {
    if (jobTitleDebounceTimerRef.current) {
      clearTimeout(jobTitleDebounceTimerRef.current)
    }

    const trimmedQuery = jobTitleQuery.trim()
    if (!trimmedQuery) {
      jobTitleRequestRef.current += 1
      setJobTitleOptions(
        sortAlphabetically([
          ...jobTitlesMock.map((item) => item.label),
          ...customJobTitleOptions,
        ])
      )
      return
    }

    jobTitleDebounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++jobTitleRequestRef.current
      try {
        const response = await AutocompleteAPI.getByType(
          "job_titles",
          trimmedQuery
        )
        if (currentRequestId !== jobTitleRequestRef.current) return

        const values: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedOptions = getUniqueOptions(
          values.map((item) => normalizeAutocompleteLabel(item))
        )
        if (!getIsNotEmpty(normalizedOptions)) return
        setCustomJobTitleOptions((prev) =>
          sortAlphabetically([...prev, ...normalizedOptions])
        )
        setJobTitleOptions((prev) =>
          sortAlphabetically([...prev, ...normalizedOptions])
        )
      } catch {
        // Keep current/fallback options when endpoint is unavailable.
      }
    }, 250)
  }, [jobTitleQuery])

  useEffect(() => {
    return () => {
      if (jobTitleDebounceTimerRef.current) {
        clearTimeout(jobTitleDebounceTimerRef.current)
      }
    }
  }, [])
  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const onSubmit: SubmitHandler<ShowcaseYourTalentFormValues> = ({
    recentJobTitle,
    studying,
    industriesWorkedWith,
    yourTopSkills,
  }) => {
    const hasAnyField =
      recentJobTitle ||
      (industriesWorkedWith && industriesWorkedWith.length > 0) ||
      (yourTopSkills && yourTopSkills.length > 0)
    if (!hasAnyField) {
      setFormError("Please enter at least one field")
      return
    }
    setFormError(null)
    setStepData({
      ...stepData,
      recentJobTitle,
      isStudent: studying,
      industriesWorkedIn: industriesWorkedWith?.join(", "),
      lookingToWorkWith: yourTopSkills,
    })
    toggleValidation(true)
    nextStep()
  }

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const skip = () => {
    toggleValidation(true)
    const nextStepIndex = currentStep + 1
    setStep(nextStepIndex)
  }

  const back = () => {
    setStepData({
      ...stepData,
      recentJobTitle: getValues("recentJobTitle"),
      isStudent: getValues("studying"),
      industriesWorkedIn: getValues("industriesWorkedWith")?.join(", "),
      lookingToWorkWith: getValues("yourTopSkills"),
    })
    prevStep()
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}

      <form
        className="relative grid items-start flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 3 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Showcase your talent
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Highlight your skills and expertise to attract the projects that
            suit you best
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="space-y-6">
              <div className="flex flex-col gap-y-1.5">
                <Label
                  size="sm"
                  className="text-dark-blue-400"
                  htmlFor="recent-job-title"
                >
                  What’s your most recent job title?
                </Label>
                <Controller
                  control={control}
                  name="recentJobTitle"
                  render={({ field: { value, onChange } }) => (
                    <div className="flex flex-col gap-y-1.5">
                      <Combobox
                        className="w-full"
                        value={value}
                        onChange={(nextValue) => {
                          onChange(nextValue)
                          setJobTitleQuery("")
                          setIsJobTitleOpen(false)
                        }}
                      >
                        <ComboboxTrigger>
                          <ComboboxInput
                            id="recent-job-title"
                            size="lg"
                            className="pl-3.5"
                            placeholder="e.g., Software Developer"
                            value={jobTitleQuery}
                            onFocus={() => {
                              if (!value && jobTitleQuery.trim()) {
                                setIsJobTitleOpen(true)
                              }
                            }}
                            onBlur={() =>
                              setTimeout(() => setIsJobTitleOpen(false), 150)
                            }
                            onChange={(event) => {
                              setJobTitleQuery(event.target.value)
                              if (value) onChange("")
                              setIsJobTitleOpen(true)
                            }}
                            onKeyDown={async (event) => {
                              if (event.key !== HOT_KEYS.ENTER) return
                              event.preventDefault()
                              const activeOption = document.querySelector(
                                '[role="option"][data-headlessui-state~="active"]'
                              ) as HTMLElement | null
                              const activeLabel =
                                activeOption?.textContent?.trim() ?? ""
                              const finalValue =
                                activeLabel || jobTitleQuery.trim()
                              if (!finalValue) return
                              const normalizedValue =
                                resolveJobTitleLabel(finalValue)
                              const isKnownSuggestion =
                                hasCaseInsensitiveExactMatch(
                                  jobTitleOptions,
                                  normalizedValue
                                )
                              const applyValue = () => {
                                onChange(normalizedValue)
                                setCustomJobTitleOptions((prev) =>
                                  sortAlphabetically([...prev, normalizedValue])
                                )
                                setJobTitleOptions((prev) =>
                                  sortAlphabetically([...prev, normalizedValue])
                                )
                                clearErrors("recentJobTitle")
                                setJobTitleQuery("")
                                setIsJobTitleOpen(false)
                              }

                              if (!isKnownSuggestion) {
                                const accepted = await submitAutocompleteValue(
                                  "job_titles",
                                  normalizedValue
                                )
                                if (!accepted) {
                                  setJobTitleQuery("")
                                  setIsJobTitleOpen(false)
                                  return
                                }
                              }

                              applyValue()
                            }}
                            invalid={hookFormHasError({
                              errors,
                              name: "recentJobTitle",
                            })}
                          />
                        </ComboboxTrigger>
                        <ScaleOutIn
                          show={
                            isJobTitleOpen &&
                            jobTitleQuery.trim().length > 0 &&
                            getIsNotEmpty(filteredJobTitles)
                          }
                        >
                          <ComboboxOptions>
                            <ScrollArea viewportClassName="max-h-[304px]">
                              {filteredJobTitles.map((item) => (
                                <ComboboxOption
                                  key={item}
                                  value={item}
                                  className="font-normal ui-active:font-normal"
                                  onClick={() => {
                                    onChange(item)
                                    clearErrors("recentJobTitle")
                                    setJobTitleQuery("")
                                    setIsJobTitleOpen(false)
                                  }}
                                >
                                  {({ active }) => (
                                    <HighlightedSuggestion
                                      label={item}
                                      query={jobTitleQuery}
                                      active={active}
                                    />
                                  )}
                                </ComboboxOption>
                              ))}
                            </ScrollArea>
                          </ComboboxOptions>
                        </ScaleOutIn>
                      </Combobox>

                      {value && (
                        <div className="flex flex-wrap gap-3">
                          <SelectionBadge
                            onRemove={() => {
                              onChange("")
                              clearErrors("recentJobTitle")
                              setJobTitleQuery("")
                            }}
                          >
                            {value}
                          </SelectionBadge>
                        </div>
                      )}
                    </div>
                  )}
                />
              </div>
              <div className="flex flex-col gap-y-1.5">
                <Label
                  size="sm"
                  className="text-dark-blue-400"
                  htmlFor="industries"
                >
                  Which industries have you worked in?
                </Label>
                <Controller
                  control={control}
                  name="industriesWorkedWith"
                  render={({ field: { onChange } }) => (
                    <Combobox
                      className="w-full"
                      value={selectedIndustries}
                      multiple
                      onChange={(nextValues) => {
                        const normalizedValues = getUniqueOptions(
                          (nextValues as string[]).filter(Boolean)
                        )
                        setSelectedIndustries(normalizedValues)
                        onChange(normalizedValues)
                        setIndustriesQuery("")
                        setIsIndustriesOpen(false)
                        setSuppressIndustryFocusOpen(true)
                      }}
                    >
                      <ComboboxTrigger>
                        <ComboboxInput
                          id="industries"
                          size="lg"
                          className="pl-3.5"
                          placeholder="e.g., Banking"
                          value={industriesQuery}
                          onFocus={() => {
                            if (suppressIndustryFocusOpen) {
                              setSuppressIndustryFocusOpen(false)
                              return
                            }
                            setIsIndustriesOpen(true)
                          }}
                          onClick={() => {
                            if (suppressIndustryFocusOpen) {
                              setSuppressIndustryFocusOpen(false)
                              return
                            }
                            setIsIndustriesOpen(true)
                          }}
                          onBlur={() =>
                            setTimeout(() => setIsIndustriesOpen(false), 150)
                          }
                          onChange={(event) => {
                            setIndustriesQuery(event.target.value)
                            setIsIndustriesOpen(true)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === HOT_KEYS.ENTER) {
                              const hasSuggestions =
                                isIndustriesOpen &&
                                filteredIndustries.length > 0

                              if (hasSuggestions) {
                                event.preventDefault()
                                const activeOption = document.querySelector(
                                  '[role="option"][data-headlessui-state~="active"]'
                                ) as HTMLElement | null
                                const activeLabel =
                                  activeOption?.textContent?.trim() ?? ""

                                const selectedLabel =
                                  activeLabel || filteredIndustries[0]

                                if (selectedLabel) {
                                  void addIndustryValue(selectedLabel)
                                  return
                                }
                              }

                              event.preventDefault()
                              void addIndustryValue(industriesQuery)
                            }
                          }}
                          invalid={hookFormHasError({
                            errors,
                            name: "industriesWorkedWith",
                          })}
                        />
                      </ComboboxTrigger>
                      <ScaleOutIn show={isIndustriesOpen}>
                        <ComboboxOptions>
                          <ScrollArea viewportClassName="max-h-[304px]">
                            {filteredIndustries.map((item) => (
                              <ComboboxOption
                                key={item}
                                value={item}
                                className="font-normal ui-active:font-normal"
                                onClick={() => void addIndustryValue(item)}
                              >
                                {({ active }) => (
                                  <HighlightedSuggestion
                                    label={item}
                                    query={industriesQuery}
                                    active={active}
                                  />
                                )}
                              </ComboboxOption>
                            ))}
                          </ScrollArea>
                        </ComboboxOptions>
                      </ScaleOutIn>
                    </Combobox>
                  )}
                />
                {selectedIndustries.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {selectedIndustries.map((item) => (
                      <SelectionBadge
                        key={item}
                        onRemove={() => removeIndustryValue(item)}
                      >
                        {item}
                      </SelectionBadge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="yourTopSkills"
                  render={({ field: { value, onChange } }) => (
                    <TopSkills
                      value={value}
                      onValueChange={onChange}
                      onAcceptedValue={() => clearErrors("yourTopSkills")}
                      invalid={hookFormHasError({
                        errors,
                        name: "yourTopSkills",
                      })}
                    />
                  )}
                />
              </div>

              <div className="mt-6 flex flex-row-reverse justify-end items-center gap-x-5">
                <Label size="sm" htmlFor="studying">
                  I’m currently a student{" "}
                </Label>
                <Controller
                  control={control}
                  name="studying"
                  render={({ field: { value, onChange, ...field } }) => (
                    <Checkbox
                      id="studying"
                      checked={value}
                      onCheckedChange={onChange}
                      {...field}
                    />
                  )}
                />
              </div>

              {formError && <ErrorMessage size="sm">{formError}</ErrorMessage>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-6 w-full max-w-[488px] self-end bg-white py-4 2xl:mt-8 2xl:max-w-[560px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={back}
            >
              Back
            </Button>

            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
              >
                Skip
              </Button>
              <Button size="md" visual="primary">
                Continue
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const ProjectPreferences = ({
  invalid,
  onValueChange,
  onAcceptedValue,
  value: valueProp,
}: {
  invalid?: boolean
  onValueChange?: (values: string[]) => void
  onAcceptedValue?: () => void
  value?: string[]
}) => {
  const [inputValue, setInputValue] = useState("")
  const [isProjectPreferencesOpen, setIsProjectPreferencesOpen] =
    useState(false)
  const [
    suppressProjectPreferencesFocusOpen,
    setSuppressProjectPreferencesFocusOpen,
  ] = useState(false)
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    onChange: onValueChange,
    value: valueProp,
  })

  const resetInputValue = () => setInputValue("")

  const selectSuggestedValue = (nextValue: string) => {
    const value = nextValue.trim()
    if (!value) return

    const alreadySelected = values.some(
      (item) => item.trim().toLowerCase() === value.toLowerCase()
    )
    if (alreadySelected) {
      resetInputValue()
      setIsProjectPreferencesOpen(false)
      setSuppressProjectPreferencesFocusOpen(true)
      return
    }

    onAcceptedValue?.()
    setValues((prev) => [...prev, value])
    resetInputValue()
    setIsProjectPreferencesOpen(false)
    setSuppressProjectPreferencesFocusOpen(true)
  }

  const addValue = (nextValue: string) => {
    const value = nextValue.trim()
    if (!value) return

    const alreadySelected = values.some(
      (item) => item.trim().toLowerCase() === value.toLowerCase()
    )
    if (alreadySelected) {
      resetInputValue()
      setIsProjectPreferencesOpen(false)
      setSuppressProjectPreferencesFocusOpen(true)
      return
    }

    const matchedSuggestion = projectPreferenceStaticOptions.find(
      (item) => item.trim().toLowerCase() === value.toLowerCase()
    )
    if (!matchedSuggestion) {
      resetInputValue()
      setIsProjectPreferencesOpen(false)
      setSuppressProjectPreferencesFocusOpen(true)
      return
    }

    onAcceptedValue?.()
    setValues((prev) => [...prev, matchedSuggestion])
    resetInputValue()
    setIsProjectPreferencesOpen(false)
    setSuppressProjectPreferencesFocusOpen(true)
  }

  const removeValue = (index: number) => {
    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
    onAcceptedValue?.()
    setIsProjectPreferencesOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== HOT_KEYS.ENTER) return

    const hasSuggestions = isProjectPreferencesOpen && filteredRoles.length > 0

    event.preventDefault()

    if (hasSuggestions) {
      const activeOption = document.querySelector(
        '[role="option"][data-headlessui-state~="active"]'
      ) as HTMLElement | null
      const activeLabel = activeOption?.textContent?.trim() ?? ""
      const fallbackSuggestion = filteredRoles[0]?.trim() ?? ""
      const selectedSuggestion = activeLabel || fallbackSuggestion

      if (selectedSuggestion) {
        selectSuggestedValue(selectedSuggestion)
        return
      }
    }

    void addValue(inputValue)
  }

  const filteredRoles = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    return projectPreferenceStaticOptions.filter((projectType) => {
      if (
        values.some(
          (value) =>
            value.trim().toLowerCase() === projectType.trim().toLowerCase()
        )
      ) {
        return false
      }

      if (!query) return true
      return projectType.toLowerCase().startsWith(query)
    })
  }, [inputValue, values])

  return (
    <div className="flex flex-col gap-y-1.5">
      <Combobox
        className="w-full"
        value={values}
        onChange={(nextValues) => {
          const normalizedValues = (nextValues as string[]).filter(Boolean)
          setValues(normalizedValues)
          resetInputValue()
          setIsProjectPreferencesOpen(false)
          setSuppressProjectPreferencesFocusOpen(true)
        }}
        multiple
      >
        <ComboboxTrigger className="flex flex-col gap-y-1.5">
          <ComboboxLabel size="sm" className="text-dark-blue-400">
            What types of projects would you like to work on?
          </ComboboxLabel>
          <ComboboxInput
            size="lg"
            className="pl-3.5"
            placeholder="Enter your project preferences (e.g., Data Analysis)"
            onChange={onChange}
            onKeyDown={onKeyDown}
            value={inputValue}
            onFocus={() => {
              if (suppressProjectPreferencesFocusOpen) {
                setSuppressProjectPreferencesFocusOpen(false)
                return
              }
              setIsProjectPreferencesOpen(true)
            }}
            onClick={() => {
              if (suppressProjectPreferencesFocusOpen) {
                setSuppressProjectPreferencesFocusOpen(false)
                return
              }
              setIsProjectPreferencesOpen(true)
            }}
            onBlur={() =>
              setTimeout(() => setIsProjectPreferencesOpen(false), 150)
            }
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={isProjectPreferencesOpen}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredRoles.map((role, index) => (
                <ComboboxOption
                  key={index}
                  value={role}
                  className="font-normal ui-active:font-normal"
                  onClick={() => selectSuggestedValue(role)}
                >
                  {({ active }) => (
                    <HighlightedSuggestion
                      label={role}
                      query={inputValue}
                      active={active}
                    />
                  )}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="flex flex-wrap gap-3">
          {values.map((item, index) => (
            <SelectionBadge key={index} onRemove={() => removeValue(index)}>
              {item}
            </SelectionBadge>
          ))}
        </div>
      )}
    </div>
  )
}

const availabilities = ["Full-time", "Part-time", "Custom"]

const YourAvailability = ({
  invalid,
  onValueChange,
  value,
}: {
  invalid?: boolean
  value?: string
  onValueChange?: (value: string) => void
}) => {
  const [state, setState] = useControllableState({
    value,
    onChange: onValueChange,
  })

  return (
    <div className="w-full flex flex-col gap-y-1.5">
      <Select value={state} onValueChange={setState}>
        <Label size="sm" className="text-dark-blue-400" htmlFor="availability">
          What’s your availability?
        </Label>
        <SelectTrigger
          className="rounded-[5px]"
          id="availability"
          invalid={invalid}
        >
          <SelectValue placeholder="Select availability" />
        </SelectTrigger>

        <SelectContent>
          <ScrollArea viewportClassName="max-h-[304px]">
            {availabilities.map((availability, index) => (
              <SelectItem value={availability} key={index}>
                {availability}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  )
}

const TimeSchema = z.object({
  startTime: z.string().optional(),
  startTimeDayPeriod: z.string().optional(),
  endTime: z.string().optional().optional(),
  endTimeDayPeriod: z.string().optional(),
})

const DaySchema = z.object({
  day: z.string().optional(),
  times: z.array(TimeSchema).optional(),
})

const toMinutes = (time?: string, dayPeriod?: string) => {
  if (!time || !dayPeriod) return null

  const [hoursPart, minutesPart] = time.split(":").map(Number)
  if (!Number.isFinite(hoursPart) || !Number.isFinite(minutesPart)) return null

  const normalizedHours =
    dayPeriod === "AM"
      ? hoursPart === 12
        ? 0
        : hoursPart
      : hoursPart === 12
        ? 12
        : hoursPart + 12

  return normalizedHours * 60 + minutesPart
}

const hasOverlappingCustomAvailability = (
  customAvailability?: Array<z.infer<typeof DaySchema>>
) =>
  customAvailability?.some((day) => hasOverlappingTimeSlots(day.times)) ?? false

const hasOverlappingTimeSlots = (times?: Array<z.infer<typeof TimeSchema>>) => {
  const intervals = (times ?? [])
    .map((time) => {
      const startMinutes = toMinutes(time.startTime, time.startTimeDayPeriod)
      const endMinutes = toMinutes(time.endTime, time.endTimeDayPeriod)

      if (
        startMinutes == null ||
        endMinutes == null ||
        endMinutes <= startMinutes
      ) {
        return null
      }

      return { startMinutes, endMinutes }
    })
    .filter(
      (interval): interval is { startMinutes: number; endMinutes: number } =>
        interval != null
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)

  return intervals.some((interval, index) => {
    const previous = intervals[index - 1]
    return previous ? interval.startMinutes < previous.endMinutes : false
  })
}

const setYourPreferencesFormSchema = z
  .object({
    projects: optionalStringArray,
    yourAvailability: optionalTrimmedString,
    customAvailability: z.array(DaySchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.yourAvailability !== "Custom") return

    const hasInvalidRange = values.customAvailability?.some((day) =>
      day.times?.some((time) => {
        const startMinutes = toMinutes(time.startTime, time.startTimeDayPeriod)
        const endMinutes = toMinutes(time.endTime, time.endTimeDayPeriod)

        return (
          startMinutes != null &&
          endMinutes != null &&
          endMinutes < startMinutes
        )
      })
    )

    if (hasInvalidRange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customAvailability"],
        message: "Please ensure end time is later than start time.",
      })
    }

    if (hasOverlappingCustomAvailability(values.customAvailability)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customAvailability"],
        message: "Please adjust your times so they do not overlap.",
      })
    }
  })

type SetYourPreferencesFormValues = z.infer<typeof setYourPreferencesFormSchema>

const CustomAvailabilityTimeSelector = ({
  label,
  value,
  onValueChange,
  disabled,
  onToggle,
  error,
}: {
  label: string
  value?: Array<{
    startTime: string
    startTimeDayPeriod: string
    endTime: string
    endTimeDayPeriod: string
  }>
  onValueChange?: (
    value: Array<{
      startTime: string
      startTimeDayPeriod: string
      endTime: string
      endTimeDayPeriod: string
    }>
  ) => void
  disabled?: boolean
  onToggle: (
    value: boolean,
    times: Array<{
      startTime: string
      startTimeDayPeriod: string
      endTime: string
      endTimeDayPeriod: string
    }>
  ) => void
  error?: string
}) => {
  const defaultSlot = {
    startTime: "09:00",
    startTimeDayPeriod: "AM",
    endTime: "05:00",
    endTimeDayPeriod: "PM",
  }

  const [state, setState] = useControllableState<
    Array<{
      startTime: string
      startTimeDayPeriod: string
      endTime: string
      endTimeDayPeriod: string
    }>
  >({
    defaultValue: [defaultSlot],
    value,
    onChange: onValueChange,
  })

  const isOn = disabled != null ? !disabled : true

  const add = () => {
    setState((prev) => [...prev, defaultSlot])
  }

  const remove = (index: number) => {
    setState((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <article
      className={cn("py-3 border-b border-gray-200", !isOn && "opacity-50")}
    >
      <div className="flex items-start justify-between">
        <div className="inline-flex items-center gap-x-3 pt-2.5">
          <Switch
            checked={isOn}
            onCheckedChange={(checked) => onToggle(checked, state)}
            size="sm"
            id={label}
          />

          <Label size="sm" className="text-dark-blue-400" htmlFor={label}>
            {label}
          </Label>
        </div>

        <div className="flex items-star gap-x-3">
          <div className="flex flex-col gap-y-3">
            {state.map((t, index) => (
              <div className="inline-flex items-center gap-x-3" key={index}>
                <div className="flex items-center">
                  <Select
                    disabled={!isOn}
                    value={t.startTime}
                    onValueChange={(value) =>
                      setState((prev) => {
                        const nextState = prev
                          .slice()
                          .map((item, i) =>
                            i === index ? { ...item, startTime: value } : item
                          )

                        return nextState
                      })
                    }
                  >
                    <SelectTrigger indicator={false} className="rounded-r-none">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {TIMES.map((time, index) => (
                          <SelectItem value={time} key={index}>
                            {time}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select
                    disabled={!isOn}
                    value={t.startTimeDayPeriod}
                    onValueChange={(value) =>
                      setState((prev) => {
                        const nextState = prev
                          .slice()
                          .map((item, i) =>
                            i === index
                              ? { ...item, startTimeDayPeriod: value }
                              : item
                          )

                        return nextState
                      })
                    }
                  >
                    <SelectTrigger
                      indicator={false}
                      className="rounded-l-none rounded-r-[5px] border-l-0"
                    >
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {DAY_PERIODS.map((dayPeriod, index) => (
                          <SelectItem value={dayPeriod} key={index}>
                            {dayPeriod}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-base leading-8 font-semibold text-gray-400">
                  to
                </span>
                <div className="flex items-center">
                  <Select
                    disabled={!isOn}
                    value={t.endTime}
                    onValueChange={(value) =>
                      setState((prev) => {
                        const nextState = prev
                          .slice()
                          .map((item, i) =>
                            i === index ? { ...item, endTime: value } : item
                          )

                        return nextState
                      })
                    }
                  >
                    <SelectTrigger indicator={false} className="rounded-r-none">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {TIMES.map((time, index) => (
                          <SelectItem value={time} key={index}>
                            {time}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                  <Select
                    disabled={!isOn}
                    value={t.endTimeDayPeriod}
                    onValueChange={(value) =>
                      setState((prev) => {
                        const nextState = prev
                          .slice()
                          .map((item, i) =>
                            i === index
                              ? { ...item, endTimeDayPeriod: value }
                              : item
                          )

                        return nextState
                      })
                    }
                  >
                    <SelectTrigger
                      indicator={false}
                      className="rounded-l-none rounded-r-[5px] border-l-0"
                    >
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <ScrollArea viewportClassName="max-h-[304px]">
                        {DAY_PERIODS.map((dayPeriod, index) => (
                          <SelectItem value={dayPeriod} key={index}>
                            {dayPeriod}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                {index > 0 ? (
                  <IconButton
                    className="rounded-full opacity-0 hover:opacity-100"
                    visual="error"
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={() => remove(index)}
                  >
                    <Trash03 className="size-[15px]" />
                  </IconButton>
                ) : (
                  <IconButton
                    className="rounded-[5px] bg-white"
                    variant="outlined"
                    visual="gray"
                    size="md"
                    type="button"
                    onClick={isOn ? add : noop}
                    disabled={!isOn}
                  >
                    <Plus className="size-[15px]" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {error ? (
        <ErrorMessage size="sm" className="mt-2 pl-[46px]">
          {error}
        </ErrorMessage>
      ) : null}
    </article>
  )
}

const days: { id: number; lable: DAYS; disabled: boolean }[] = [
  { id: 1, lable: DAYS.SUNDAY, disabled: true },
  { id: 2, lable: DAYS.MONDAY, disabled: true },
  { id: 3, lable: DAYS.TUESDAY, disabled: true },
  { id: 4, lable: DAYS.WEDNESDAY, disabled: true },
  { id: 5, lable: DAYS.THURSDAY, disabled: true },
  { id: 6, lable: DAYS.FRIDAY, disabled: true },
  { id: 7, lable: DAYS.SATURDAY, disabled: true },
]

const DEFAULT_CUSTOM_WORKING_DAYS = [
  DAYS.MONDAY,
  DAYS.TUESDAY,
  DAYS.WEDNESDAY,
  DAYS.THURSDAY,
  DAYS.FRIDAY,
]

const DEFAULT_CUSTOM_TIME_SLOT = [
  {
    startTime: "09:00",
    startTimeDayPeriod: "AM",
    endTime: "05:00",
    endTimeDayPeriod: "PM",
  },
]

const SetYourPreferences = ({
  sidebar,
  stepData,
  setStepData,
  setTalentUser,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
  setTalentUser: React.Dispatch<React.SetStateAction<User | null>>
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isValid },
    control,
    handleSubmit,
  } = useForm<SetYourPreferencesFormValues>({
    resolver: zodResolver(setYourPreferencesFormSchema),
    defaultValues: {
      projects: stepData?.projectTypes,
      yourAvailability: capitalize(
        stepData?.availability?.replaceAll("_", "-") || ""
      ),
      customAvailability: stepData?.customAvailability,
    },
  })
  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()
  const availability = useWatch({
    control,
    name: "yourAvailability",
  })
  const customAvailability = useWatch({
    control,
    name: "customAvailability",
  })
  const hasInitializedCustomDefault = React.useRef(false)

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  useEffect(() => {
    if (availability !== "Custom") return
    if (hasInitializedCustomDefault.current) return
    if ((customAvailability?.length || 0) > 0) {
      hasInitializedCustomDefault.current = true
      return
    }

    setValue(
      "customAvailability",
      DEFAULT_CUSTOM_WORKING_DAYS.map((day) => ({
        day,
        times: DEFAULT_CUSTOM_TIME_SLOT,
      }))
    )
    hasInitializedCustomDefault.current = true
  }, [availability, customAvailability, setValue])

  const buildStepDataFormData = (): FormData => {
    const formData = new FormData()

    if (stepData?.avatar instanceof File) {
      formData.append("avatar", stepData.avatar)
    }
    if (stepData?.username?.trim()) {
      formData.append("username", stepData.username.trim())
    }
    if (stepData?.firstName?.trim()) {
      formData.append("firstName", stepData.firstName.trim())
    }
    if (stepData?.lastName?.trim()) {
      formData.append("lastName", stepData.lastName.trim())
    }
    if (stepData?.location?.trim()) {
      formData.append("location", stepData.location.trim())
    }
    if (stepData?.language?.trim()) {
      formData.append("language", stepData.language.trim())
    }
    if (stepData?.recentJobTitle?.trim()) {
      formData.append("recentJobTitle", stepData.recentJobTitle.trim())
    }
    if (stepData?.industriesWorkedIn?.trim()) {
      formData.append("industriesWorkedIn", stepData.industriesWorkedIn.trim())
    }

    stepData?.lookingToWorkWith?.forEach((item) => {
      formData.append("lookingToWorkWith", item)
    })

    if (stepData?.isStudent != null) {
      formData.append("isStudent", stepData.isStudent.toString())
    }

    return formData
  }

  const submitTalent = (formData: FormData) => {
    setIsLoading(true)

    TalentAPI.CreateTalent(formData)
      .then((response) => {
        if (response?.status === 201) {
          nextStep()
          setStepData(null)
          const returnedUser = response?.data?.user ?? response?.data
          if (returnedUser) {
            setTalentUser(returnedUser)
          }
        }
      })
      .catch((error) => {
        const status = error?.response?.status
        const msg = error?.response?.data?.message

        // 422 means talent profile already exists — advance anyway.
        if (status === 422) {
          nextStep()
          setStepData(null)
          return
        }

        if (error?.response?.data?.errors?.message) {
          toast({
            title: error?.response?.data?.errors?.message,
            variant: "destructive",
          })
        } else if (Array.isArray(msg) && msg.length > 0) {
          toast({
            title: msg[0],
            variant: "destructive",
          })
        } else {
          toast({
            title: msg || "Something went wrong. Please try again.",
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const onSubmit: SubmitHandler<SetYourPreferencesFormValues> = ({
    projects,
    yourAvailability,
    customAvailability,
  }) => {
    const availability: AVAILABILITY = yourAvailability
      ?.replaceAll("-", "_")
      ?.toUpperCase() as AVAILABILITY

    const formData = buildStepDataFormData()

    projects?.forEach((item) => {
      formData.append("projectTypes", item)
    })

    if (availability) {
      formData.append("availability", availability)
    }

    if (
      availability === AVAILABILITY.CUSTOM &&
      (customAvailability?.length || 0) > 0
    ) {
      formData.append(
        "customAvailability",
        JSON.stringify(customAvailability) || ""
      )
    }

    submitTalent(formData)
  }

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const skip = async () => {
    try {
      if (isLoading) return
      const formData = buildStepDataFormData()
      submitTalent(formData)
    } catch (error) {
      toast({
        title: "Failed to skip onboarding. Please try again.",
        variant: "destructive",
      })
    }
  }

  const back = () => {
    const availability: AVAILABILITY = getValues("yourAvailability")
      ?.replaceAll("-", "_")
      ?.toUpperCase() as AVAILABILITY

    setStepData({
      ...stepData,
      projectTypes: getValues("projects"),
      availability: availability,
      customAvailability: getValues("customAvailability"),
    })
    prevStep()
  }

  const handleCustomAvailabity = (
    day: string,
    times: {
      startTimeDayPeriod?: string
      endTimeDayPeriod?: string
      startTime?: string
      endTime?: string
    }[]
  ) => {
    const data =
      getValues("customAvailability")?.filter((item) => item?.day !== day) || []

    data?.push({ day, times })
    setValue("customAvailability", data, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const handleCustomAvailabityDisable = (day: string) => {
    const data =
      getValues("customAvailability")?.filter((item) => item?.day !== day) || []
    setValue("customAvailability", data, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}

      <form
        className="relative grid items-start flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 5 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Set your preferences
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Give us insights into your team to help us make things even
            smoother.
          </p>

          <div className="mt-[50px]">
            <div className="space-y-6">
              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="projects"
                  render={({ field: { value, onChange } }) => (
                    <ProjectPreferences
                      value={value}
                      onValueChange={onChange}
                      invalid={hookFormHasError({ errors, name: "projects" })}
                      onAcceptedValue={() => clearErrors("projects")}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="yourAvailability"
                  render={({ field: { value, onChange } }) => (
                    <YourAvailability
                      value={value}
                      onValueChange={onChange}
                      invalid={hookFormHasError({ errors, name: "projects" })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  name="yourAvailability"
                  errors={errors}
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>

              {availability === "Custom" && (
                <div className="flex flex-col">
                  {days?.map(({ id, lable, disabled }) => {
                    const dayValue = customAvailability?.find(
                      ({ day }) => day === lable
                    )?.times as
                      | Array<{
                          startTime: string
                          startTimeDayPeriod: string
                          endTime: string
                          endTimeDayPeriod: string
                        }>
                      | undefined
                    const isDayEnabled = !!dayValue?.length
                    const dayOverlapError =
                      isDayEnabled && hasOverlappingTimeSlots(dayValue)
                        ? "Custom availability times cannot overlap."
                        : undefined

                    return (
                      <CustomAvailabilityTimeSelector
                        key={id}
                        label={lable}
                        disabled={!isDayEnabled && disabled}
                        value={dayValue?.length ? dayValue : undefined}
                        onValueChange={(value) => {
                          handleCustomAvailabity(lable, value)
                        }}
                        onToggle={(checked, times) => {
                          if (checked) {
                            handleCustomAvailabity(lable, times)
                          } else {
                            handleCustomAvailabityDisable(lable)
                          }
                        }}
                        error={dayOverlapError}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-6 w-full max-w-[488px] self-end bg-white py-4 2xl:mt-8 2xl:max-w-[560px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={back}
            >
              Back
            </Button>

            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
                disabled={isLoading}
              >
                Skip
              </Button>
              <Button disabled={isLoading} size="md" visual="primary">
                {isLoading ? (
                  <Spinner
                    size={24}
                    className="stroke-white"
                    trackClassName="stroke-primary-500"
                    strokeWidth={2}
                  />
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const DoNext = ({
  sidebar,
  talentUser,
}: {
  sidebar: React.ReactNode
  talentUser: User | null
}) => {
  const router = useRouter()
  const { setUser, user } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)

  const requiresPasswordSetup = (candidate?: User | null) => {
    const safeUser = candidate as
      | { provider?: string; hasPassword?: boolean }
      | null
      | undefined
    return safeUser?.provider === "EMAIL" && !safeUser?.hasPassword
  }

  const getPostOnboardingRoute = (
    targetRoute: string,
    candidate?: User | null
  ) => {
    // Enforce password setup before allowing post-onboarding route jumps.
    return requiresPasswordSetup(candidate) ? "/talent-dashboard" : targetRoute
  }

  const completeOnboardingAndNavigate = async (targetRoute: string) => {
    setIsLoading(true)

    // Mark onboarding as dismissed locally first so AuthenticatedRoute won't bounce back
    const fallbackUser = talentUser ?? user
    const finishedUser = fallbackUser
      ? {
          ...fallbackUser,
          onboardingDismissed: true,
          talentOnboardedAt: new Date().toISOString(),
          userType: "talent",
        }
      : null
    if (finishedUser) {
      setUser(finishedUser as User)
    }

    try {
      await UserAPI.handleSkip({ role: ROLE.TALENT })
      const userResponse = await UserAPI.me()
      if (userResponse?.data?.user) {
        setUser(userResponse.data.user)
      }
    } catch (error) {
      console.error("Failed to complete onboarding on server", error)
    }

    setIsLoading(false)
    router.push(targetRoute)
  }

  const handleFinish = () => completeOnboardingAndNavigate("/talent-dashboard")

  return (
    <div className="min-h-screen flex md:pl-[480px] bg-white">
      {sidebar}
      <div className="relative grid items-start flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[150px]">
        <div className="max-w-[608px] 2xl:max-w-[660px] w-full mx-auto">
          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            What would you like to do next?
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Choose your next move and get started
          </p>

          <div className="mt-10 2xl:mt-[50px] grid md:grid-cols-2 gap-2.5 2xl:gap-5">
            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => completeOnboardingAndNavigate("/projects")}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <SearchLg className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Find open projects
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => completeOnboardingAndNavigate("/teams")}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <Users03 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Join a Team
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => completeOnboardingAndNavigate("/publish-project")}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <File02 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Create a new project
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>

            <div
              className="p-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
              onClick={() => completeOnboardingAndNavigate("/services")}
            >
              <div className="flex items-center gap-x-3">
                <div className="size-11 rounded-lg border-[1.5px] shrink-0 inline-flex items-center justify-center border-[#EAECF0] text-primary-500">
                  <RefreshCw01 className="size-5" />
                </div>
                <span className="text-sm leading-[16.94px] inline-block font-medium text-gray-900">
                  Launch a new service
                </span>
              </div>

              <ChevronRight className="shrink-0 size-5" />
            </div>
          </div>
        </div>

        <div className="mt-10 2xl:mt-[50px] mx-auto w-full max-w-[608px] 2xl:max-w-[660px] flex self-end justify-end">
          <Button
            onClick={handleFinish}
            className="text-primary-500"
            variant="link"
            visual="gray"
          >
            <Home03 className="size-[15px]" /> Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

const Sidebar = () => {
  return (
    <div className="fixed inset-y-0 left-0 p-[75px] w-[480px] xs:max-2xl:hidden shrink-0 flex flex-col bg-dark-blue-500">
      <NextLink href="/" className="focus-visible:outline">
        <Logo className="h-9 w-[245px] shrink-0" />
      </NextLink>

      <div className="mt-[80px]">
        <h1 className="text-[30px] leading-[36.31px] font-bold text-white">
          The Future of Remote Work Is Here...
        </h1>

        <ul className="mt-[30px] space-y-5">
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Find Tailored Projects
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Discover curated matches to elevate your talent.
              </p>
            </div>
          </li>
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Connect with Ideal Teams
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Collaborate with teams that align with your expertise.
              </p>
            </div>
          </li>
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Get Paid, Stress Free
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Secure contracts. Fast, hassle-free payments every time.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <Triangles className="absolute bottom-0 right-0" />

      <div className="relative mt-auto flex flex-col gap-y-5">
        <span className="text-base leading-[19.36px] text-white focus-visible:outline-none">
          Already have an account?
        </span>

        <div className="relative self-start">
          <NextLink href="/onboarding" className="focus-visible:outline">
            <Button
              className="hover:bg-white hover:text-dark-blue-400 border-white/[.2] text-white hover:border-white"
              size="lg"
              visual="gray"
              variant="outlined"
            >
              Sign In
            </Button>
          </NextLink>

          <Pointer className="absolute top-[34px] right-0 -rotate-6" />
        </div>
      </div>
    </div>
  )
}

const DoNextSidebar = () => {
  return (
    <div className="fixed inset-y-0 left-0 p-[75px] w-[480px] xs:max-2xl:hidden shrink-0 flex flex-col bg-dark-blue-500">
      <NextLink href="/" className="focus-visible:outline">
        <Logo className="h-9 w-[245px] shrink-0" />
      </NextLink>

      <div className="mt-[94px]">
        <h1 className="text-[30px] leading-[36.31px] font-bold text-white">
          The Future of Remote Work Is Here...
        </h1>

        <ul className="mt-[30px] space-y-5">
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Find Tailored Projects
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Discover curated matches to elevate your talent.
              </p>
            </div>
          </li>
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Connect with Ideal Teams
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Collaborate with teams that align with your expertise.
              </p>
            </div>
          </li>
          <li className="flex gap-x-3">
            <Check className="size-7 shrink-0 text-primary-500" />

            <div className="pt-[5px] space-y-1 flex-auto">
              <h3 className="text-base leading-[19.36px] text-white font-bold">
                Get Paid, Stress Free
              </h3>
              <p className="text-sm leading-[16.94px] text-white">
                Secure contracts. Fast, hassle-free payments every time.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <Triangles className="absolute bottom-0 right-0" />
    </div>
  )
}

// Mirrors the resume upload gates and copy used on the talent profile
// (talent-profile/page.tsx:488-518, 4716-4750) so both entry points reject the
// same files with the same wording.
const RESUME_ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"]
const RESUME_ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const RESUME_MAX_SIZE = 5 * 1024 * 1024 // 5MB, matches resume.controller.ts

// Byte transfer is ~1s of a ~16s operation and the review time can't be known
// up front (varies with resume length; the model client also retries once). So
// both phases share ONE scale: bytes fill 0-15%, review eases 15-99% on a
// decelerating curve — it never stalls on a round number and never claims
// completion early. Rather than hardcode the review duration, each successful
// upload records its own elapsed time and the running median calibrates the
// next one, so the estimate converges on this user's real conditions.
// The transfer is the first slice of the single timeline; past this the label
// moves on to reading. Keyed to progress, not the network event, so the
// uploading label is always visible even when bytes land instantly.
const UPLOAD_LABEL_UNTIL = 15

const TOTAL_ESTIMATE_KEY = "marketeq:resume-total-ms-v2"
const TOTAL_ESTIMATE_DEFAULT_MS = 6000

const readTotalEstimateMs = (): number => {
  try {
    const raw = window.localStorage.getItem(TOTAL_ESTIMATE_KEY)
    const samples = raw ? (JSON.parse(raw) as number[]) : []
    const usable = samples.filter((n) => Number.isFinite(n) && n > 0)
    if (!usable.length) return TOTAL_ESTIMATE_DEFAULT_MS
    const sorted = [...usable].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  } catch {
    return TOTAL_ESTIMATE_DEFAULT_MS
  }
}

const recordTotalDurationMs = (ms: number) => {
  if (!Number.isFinite(ms) || ms <= 0) return
  try {
    const raw = window.localStorage.getItem(TOTAL_ESTIMATE_KEY)
    const samples = raw ? (JSON.parse(raw) as number[]) : []
    const next = [...samples.filter((n) => Number.isFinite(n) && n > 0), ms].slice(-5)
    window.localStorage.setItem(TOTAL_ESTIMATE_KEY, JSON.stringify(next))
  } catch {
    // best-effort calibration only
  }
}

const dashedBorderImage = (hex: string) =>
  `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='%23${hex}' stroke-width='4' stroke-dasharray='7%2c 6'/%3e%3c/svg%3e")`

const DASH_BORDER_IDLE = dashedBorderImage("D0D5DD")
const DASH_BORDER_ACTIVE = dashedBorderImage("306CFE")

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

type ResumeUploadStatus =
  | "idle"
  | "dragging"
  | "uploading"
  | "uploaded"
  | "failed"
  | "service-busy"
  | "size-limit"
  | "unsupported"
  | "not_a_resume"
  | "nothing_found"
  | "name_mismatch"

// Two sentences each; Figma puts the second on its own line.
const RESUME_ERROR_MESSAGES: Partial<
  Record<ResumeUploadStatus, readonly [string, string]>
> = {
  "service-busy": [
    "We couldn't read your resume just now.",
    "Nothing was changed on your profile. Please try again in a moment.",
  ],
  "size-limit": [
    "Uploaded file exceeds the size limit of 5MB.",
    "Please select a different file.",
  ],
  unsupported: [
    "Unsupported file type.",
    "Only PDF, DOC, and DOCX files are accepted.",
  ],
  not_a_resume: [
    "This doesn't look like a resume.",
    "Please upload a resume file in PDF, DOC, or DOCX format.",
  ],
  nothing_found: [
    "We couldn't pull any details out of this file.",
    "Please try uploading a different resume.",
  ],
  name_mismatch: [
    "This resume appears to belong to someone else.",
    "Please upload your own resume.",
  ],
}

// Figma 21023:11125 — shown while the resume is being read. Replaces the
// in-card percentage: the read duration can't be predicted, so an indeterminate
// popup is honest where a progress number was not.
// Figma 21023:11290 provides the shell — white card, 76px featured icon,
// bouncing dots, 18px dark-blue label. The step list is an addition: the modal
// now reports what it actually found rather than cycling one line, which is
// both more informative and gives the wait a sense of progress.
const READING_LABEL_DEFAULT = "Reading your resume..."
const READING_STEP_MS = 700

type ReadingStep = { label: string; count?: number }

const ReadingResumeModal = ({
  open,
  label,
  steps,
  completed,
}: {
  open: boolean
  label: string
  steps: ReadingStep[]
  completed: number
}) => (
  <Dialog open={open}>
    <DialogContent
      className="w-[490px] max-w-none overflow-hidden border-0 bg-white p-[50px] rounded-xl shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
      accessibilityTitle="Reading your resume"
      // not dismissible: it mirrors work in flight, so closing it would lie
      onEscapeKeyDown={(event) => event.preventDefault()}
      onPointerDownOutside={(event) => event.preventDefault()}
      onInteractOutside={(event) => event.preventDefault()}
    >
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="size-[76px] shrink-0 rounded-full border-[14px] border-primary-25 bg-primary-50 inline-flex items-center justify-center">
          <FileText className="size-8 text-primary-500" />
        </div>

        <p className="text-center text-lg leading-5 text-dark-blue-400">
          {label}
        </p>

        {steps.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {steps.map((step, index) => {
              const isDone = index < completed
              const isActive = index === completed
              if (!isDone && !isActive) return null
              return (
                <div
                  key={step.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
                    isDone ? "bg-primary-25" : "bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                      isDone ? "bg-primary-500" : "bg-gray-200"
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3 text-white" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-gray-500" />
                    )}
                  </span>
                  <span className="flex-auto text-sm leading-5 text-dark-blue-400">
                    {step.label}
                  </span>
                  {isDone && typeof step.count === "number" && (
                    <span className="text-xs font-semibold leading-5 text-primary-500">
                      {step.count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex h-[39px] items-center justify-center gap-2">
          {[
            "bg-primary-700",
            "bg-primary-600",
            "bg-primary-400",
            "bg-primary-100",
          ].map((color, index) => (
            <span
              key={color}
              className={cn("size-2.5 rounded-full animate-bounce", color)}
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </DialogContent>
  </Dialog>
)

const UploadYourResume = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
}) => {
  const router = useRouter()
  const resumeInputRef = useRef<HTMLInputElement>(null)
  const [resumeStatus, setResumeStatus] = useState<ResumeUploadStatus>("idle")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploadedAt, setUploadedAt] = useState<Date | null>(null)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [isReviewing, setIsReviewing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Reading your resume...")
  const reviewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reviewStartedAtRef = useRef<number | null>(null)
  const [isDropzoneHovered, setIsDropzoneHovered] = useState(false)
  const [readingLabel, setReadingLabel] = useState(READING_LABEL_DEFAULT)
  const [readingSteps, setReadingSteps] = useState<ReadingStep[]>([])
  const [readingCompleted, setReadingCompleted] = useState(0)

  const { toggleValidation } = useStepContext()
  const { nextStep, setStep } = useStepperContext()
  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100
  const errorMessage = RESUME_ERROR_MESSAGES[resumeStatus]
  const hasError = resumeStatus === "failed" || Boolean(errorMessage)

  const stopProgressTicker = () => {
    if (reviewTimerRef.current) {
      clearInterval(reviewTimerRef.current)
      reviewTimerRef.current = null
    }
  }

  // The LLM review time is folded INTO the upload time: one clock, one
  // percentage, started when the file is handed over and running until the
  // profile write finishes. The expected total is the median of this user's
  // last five uploads, so it calibrates to their real conditions instead of a
  // hardcoded guess. Past the estimate it keeps creeping toward 99 rather than
  // parking, and only genuine completion shows 100.
  const startProgressTicker = () => {
    stopProgressTicker()
    const startedAt = Date.now()
    reviewStartedAtRef.current = startedAt
    const total = Math.max(3000, readTotalEstimateMs())
    reviewTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt
      // Linear to 95% across the expected total, then a constant slow crawl.
      // Deliberately NOT asymptotic: an easing curve decays toward zero rate,
      // which is exactly what reads as "frozen at 98%". A constant rate always
      // visibly moves, so an overrun looks slow rather than stuck.
      const pct =
        elapsed <= total
          ? (elapsed / total) * 95
          : 95 + (elapsed - total) / 3000
      setUploadPercent(Math.min(99, Math.max(1, Math.round(pct))))
    }, 200)
  }

  const resetResume = () => {
    stopProgressTicker()
    setReadingLabel(READING_LABEL_DEFAULT)
    setReadingSteps([])
    setReadingCompleted(0)
    setIsReviewing(false)
    setResumeFile(null)
    setUploadedAt(null)
    setUploadPercent(0)
    setResumeStatus("idle")
  }

  // Upload -> parse -> autofill the remaining onboarding steps -> apply to the
  // profile in the background. New account, so there is nothing to conflict
  // with; the conflict and summary UI the talent profile shows is not needed.
  const processResume = async (file: File) => {
    setResumeFile(file)

    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase()
    if (
      !RESUME_ACCEPTED_TYPES.includes(file.type) &&
      !RESUME_ACCEPTED_EXTENSIONS.includes(extension)
    ) {
      setResumeStatus("unsupported")
      return
    }
    if (file.size > RESUME_MAX_SIZE) {
      setResumeStatus("size-limit")
      return
    }

    setResumeStatus("uploading")
    setReadingLabel(READING_LABEL_DEFAULT)
    setReadingSteps([])
    setReadingCompleted(0)
    setUploadPercent(0)
    startProgressTicker()

    try {
      const { data } = await UserAPI.uploadResume(file, (percent) => {
        if (percent >= 100) setIsReviewing(true)
      })
      // Deliberately NOT completing here. The response has landed but
      // applyResume still has to run, and Continue stays disabled until it
      // does — showing 100% now is a completion signal the user can't act on.
      setLoadingMessage("Reading your resume...")

      if (data?.status === "not_a_resume") {
        stopProgressTicker()
        setIsReviewing(false)
        setResumeStatus("not_a_resume")
        return
      }
      if (data?.status === "nothing_found") {
        stopProgressTicker()
        setIsReviewing(false)
        setResumeStatus("nothing_found")
        return
      }
      // The account already carries the registered name, so this still guards
      // against someone uploading a resume that is not theirs.
      if (data?.nameMismatch) {
        stopProgressTicker()
        setIsReviewing(false)
        setResumeStatus("name_mismatch")
        return
      }

      const additions = data?.additions ?? {}
      const nameOf = (item: any): string =>
        typeof item === "string" ? item : (item?.name ?? "")
      const skills = (additions.skills?.items ?? [])
        .map((item: any) => ({ name: nameOf(item) }))
        .filter((item: { name: string }) => item.name)
      const industries = (additions.industries?.items ?? [])
        .map((item: any) => ({ name: nameOf(item) }))
        .filter((item: { name: string }) => item.name)
      const education = (additions.education?.items ?? [])
        .map((item: any) => ({
          school: item?.institution ?? item?.school ?? "",
          degree: item?.degree ?? "",
          fieldOfStudy: item?.fieldOfStudy ?? item?.field_of_study ?? "",
        }))
        .filter((item: { school: string; degree: string }) => item.school || item.degree)
      const workExperience = (additions.workExperience?.items ?? []).map(
        (item: any) => ({
          title: item.title ?? "",
          company: item.company ?? "",
          startDate: item.startDate,
          endDate: item.endDate,
          description: item.description ?? "",
        })
      )
      const certifications = (additions.certifications?.items ?? [])
        .map((item: any) => ({
          name: nameOf(item),
          issuer: item?.issuingBody ?? item?.issuer ?? "",
        }))
        .filter((item: { name: string }) => item.name)

      const extractedName = (data?.extractedName ?? "").trim()
      const [firstName, ...remainingNameParts] = extractedName
        .split(/\s+/)
        .filter(Boolean)
      const lastName = remainingNameParts.join(" ")
      const recentJobTitle = data?.jobTitles?.[0]
      const skillNames = skills
        .map((skill: { name: string }) => skill.name)
        .filter(Boolean)
      const industryNames = industries
        .map((industry: { name: string }) => industry.name)
        .filter(Boolean)

      // Only fill what the resume actually yielded; never overwrite a field the
      // talent already filled in with an empty value.
      setStepData((previous) => ({
        ...previous,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(recentJobTitle ? { recentJobTitle } : {}),
        ...(industryNames.length
          ? { industriesWorkedIn: industryNames.join(", ") }
          : {}),
        // Step 3 reads its skills field back out of lookingToWorkWith.
        ...(skillNames.length ? { lookingToWorkWith: skillNames } : {}),
      }))

        // Only surface categories the parse actually returned. A resume with no
      // certifications never claims to be extracting them. Figma's wording.
      const clientCompanies = Array.from(
        new Set(
          workExperience
            .map((item: { company: string }) => item.company)
            .filter(Boolean)
        )
      )
      const foundSteps: ReadingStep[] = [
        ...(extractedName ? [{ label: "Personal info" }] : []),
        ...(workExperience.length
          ? [{ label: "Work experience", count: workExperience.length }]
          : []),
        ...(education.length
          ? [{ label: "Education", count: education.length }]
          : []),
        ...(certifications.length
          ? [{ label: "Certifications", count: certifications.length }]
          : []),
        ...(clientCompanies.length
          ? [{ label: "Previous clients", count: clientCompanies.length }]
          : []),
        ...(industryNames.length
          ? [{ label: "Industry expertise", count: industryNames.length }]
          : []),
      ]
      setReadingSteps(foundSteps)

      try {

      setLoadingMessage("Updating your profile...")
        await UserAPI.applyResume({
          parseResultId: data?.parseResultId,
          skills,
          education,
          workExperience,
          certifications,
          industries,
        })
        if (workExperience.length > 0) {
        }
      } catch (applyError) {
        // Autofill already landed in stepData, so onboarding can continue even
        // if the background profile write fails.
        console.error("Failed to auto-apply resume data:", applyError)
      }

      // Let the step list finish playing before the modal closes, so the user
      // actually sees what was found rather than a flash.
      for (let index = 0; index < foundSteps.length; index++) {
        setReadingLabel(`Extracting your ${foundSteps[index].label.toLowerCase()}...`)
        setReadingCompleted(index + 1)
        await new Promise((resolve) => setTimeout(resolve, READING_STEP_MS))
      }

      // Everything is genuinely done; complete and enable Continue together.
      stopProgressTicker()
      if (reviewStartedAtRef.current) {
        recordTotalDurationMs(Date.now() - reviewStartedAtRef.current)
        reviewStartedAtRef.current = null
      }
      setUploadPercent(100)
      setIsReviewing(false)
      setUploadedAt(data?.uploadedAt ? new Date(data.uploadedAt) : new Date())
      setResumeStatus("uploaded")
      toggleValidation(true)
    } catch (error) {
      stopProgressTicker()
      setIsReviewing(false)
      // 502/503 means the upload itself succeeded and the extraction service
      // couldn't answer — telling the user "upload failed" is wrong, and hides
      // that retrying usually works.
      const status = (error as { response?: { status?: number } })?.response
        ?.status
      setResumeStatus(
        status === 502 || status === 503 || status === 504
          ? "service-busy"
          : "failed"
      )
    }
  }


  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    toggleValidation(true)
    nextStep()
  }

  const skip = () => {
    toggleValidation(true)
    setStep(currentStep + 1)
  }

  return (
    <div className="min-h-screen flex 2xl:pl-[480px] bg-white">
      {sidebar}

      <ReadingResumeModal
        open={resumeStatus === "uploading"}
        label={readingLabel}
        steps={readingSteps}
        completed={readingCompleted}
      />

      <form
        className="relative grid items-start flex-auto px-5 md:px-10 py-10 2xl:py-[100px] 2xl:px-[200px]"
        onSubmit={onSubmit}
      >
        <div className="max-w-[488px] 2xl:max-w-[560px] w-full mx-auto">
          <div className="flex gap-x-2 items-center">
            <CircularProgress
              show={false}
              size={15.43}
              strokeWidth={2.5}
              value={progress}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 1 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Upload your resume
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Add your resume to complete your profile faster!
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            {/* Always mounted, so Replace can open the picker straight from the
                uploaded state. Cancelling the picker fires no change event, so
                the existing file simply stays. */}
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void processResume(file)
                event.target.value = ""
              }}
            />
            <div className="space-y-6">
              {hasError ? (
                <div className="flex min-h-[148px] w-full flex-col gap-3 items-center justify-center rounded-lg border border-error-300 bg-error-25 px-6 py-4">
                  <div className="size-14 shrink-0 rounded-full border-8 border-error-50 bg-error-100 inline-flex items-center justify-center">
                    <AlertTriangle className="size-7 text-error-500" />
                  </div>

                  <p className="text-sm font-medium text-error-500 text-center">
                    {resumeStatus === "failed" ? (
                      <>
                        Upload failed, please try again.
                        <br />
                        <span className="font-normal">{resumeFile?.name}</span>
                      </>
                    ) : errorMessage ? (
                      <>
                        {errorMessage[0]}
                        <br />
                        {errorMessage[1]}
                      </>
                    ) : null}
                  </p>

                  <button
                    type="button"
                    className="text-sm font-semibold leading-5 text-error-500 underline decoration-error-500/30 hover:decoration-error-500"
                    onClick={resetResume}
                  >
                    Try again
                  </button>
                </div>
              ) : resumeStatus === "uploading" ? (
                <div className="relative flex h-16 w-full flex-col items-start gap-2 overflow-hidden rounded-lg border border-gray-200 bg-white p-3.5">
                  {/* Figma "Progress fill" (21020:10515): behind the row, offset
                      -1px so it covers the border, width tracks the upload. */}
                  <div
                    className="absolute left-[-1px] top-[-1px] h-16 bg-gray-50 transition-[width]"
                    style={{ width: `${uploadPercent}%` }}
                  />
                  <div className="relative flex w-full items-center justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
                      <div className="size-9 shrink-0 rounded-full bg-primary-50 inline-flex items-center justify-center">
                        <File02 className="size-4 text-primary-500" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="truncate text-xs font-medium leading-5 text-dark-blue-400">
                          {resumeFile?.name}
                        </p>
                        <p className="truncate text-[11px] leading-[18px] text-gray-500">
                          {uploadPercent < UPLOAD_LABEL_UNTIL
                            ? `${formatFileSize(resumeFile?.size ?? 0)} \u2013 ${uploadPercent}% uploaded`
                            : `${loadingMessage} ${uploadPercent}%`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-center">
                      <CircularProgress size={32} strokeWidth={4} value={uploadPercent} />
                    </div>
                  </div>
                </div>
              ) : resumeStatus === "uploaded" ? (
                <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border-2 border-primary-500 bg-primary-25 p-3.5">
                  <div className="flex w-full items-center gap-2 pr-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2 self-stretch">
                      <div className="size-9 shrink-0 rounded-full bg-primary-50 inline-flex items-center justify-center">
                        <File02 className="size-4 text-primary-500" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="truncate text-xs font-medium leading-5 text-dark-blue-400">
                          {resumeFile?.name}
                        </p>
                        <p className="text-[11px] leading-[18px] text-gray-500">
                          {uploadedAt
                            ? `Added on ${uploadedAt.toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : "Added"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold leading-5 text-primary-500 hover:underline"
                      onClick={() => resumeInputRef.current?.click()}
                    >
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "group flex min-h-[148px] w-full cursor-pointer flex-col gap-3 items-center justify-center rounded-lg px-6 py-4 transition-colors",
                    resumeStatus === "dragging"
                      ? "bg-primary-25"
                      : "bg-white hover:bg-primary-25"
                  )}
                  style={{
                    backgroundImage:
                      resumeStatus === "dragging"
                        ? DASH_BORDER_ACTIVE
                        : isDropzoneHovered
                          ? DASH_BORDER_ACTIVE
                          : DASH_BORDER_IDLE,
                  }}
                  onMouseEnter={() => setIsDropzoneHovered(true)}
                  onMouseLeave={() => setIsDropzoneHovered(false)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setResumeStatus("dragging")
                  }}
                  onDragLeave={() => setResumeStatus("idle")}
                  onClick={() => resumeInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault()
                    setResumeStatus("idle")
                    const file = event.dataTransfer.files?.[0]
                    if (file) void processResume(file)
                  }}
                >
                  <div className="size-14 shrink-0 rounded-full border-8 border-primary-25 bg-primary-50 inline-flex items-center justify-center">
                    <FileText className="size-7 text-primary-500" />
                  </div>

                  <p className="text-xs leading-5 text-gray-600 text-center">
                    Drag &amp; drop or{" "}
                    <button
                      type="button"
                      className="font-medium capitalize leading-5 text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500"
                      onClick={(event) => {
                        // stop the parent handler so the picker opens once, and
                        // open it here since this button owns the interaction
                        event.stopPropagation()
                        resumeInputRef.current?.click()
                      }}
                    >
                      Choose file
                    </button>{" "}
                    to upload
                  </p>
                  <p className="text-[11px] font-medium leading-[18px] text-gray-600 text-center">
                    PDF, DOC, DOCX (max 5MB)
                  </p>

                </div>
              )}

              <p className="text-xs font-light leading-normal text-dark-blue-400">
                Your resume will remain private and will not be shared with any
                third parties. See our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium capitalize text-primary-500 underline decoration-primary-500/30 hover:decoration-primary-500"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 mx-auto mt-6 w-full max-w-[488px] self-end bg-white py-4 2xl:mt-8 2xl:max-w-[560px]">
          <div className="flex items-start justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              onClick={() => router.push("/onboarding")}
            >
              Back
            </Button>

            <div className="flex items-center gap-x-6">
              <Button
                className="opacity-50 hover:opacity-100"
                variant="ghost"
                visual="gray"
                type="button"
                size="md"
                onClick={skip}
              >
                Skip
              </Button>
              <Button
                size="md"
                visual="primary"
                disabled={resumeStatus === "uploading"}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

const steps: Steps[] = [
  { label: "upload-your-resume", isValid: false, disabled: false },
  { label: "introduce-yourself", isValid: false, disabled: true },
  { label: "showcase-your-talent", isValid: false, disabled: true },
  { label: "create-your-username", isValid: false, disabled: true },
  { label: "set-your-preferences", isValid: false, disabled: true },
  { label: "do-next", isValid: false, disabled: true },
]

const TalentOnboarding = ({
  uploadYourResume,
  introduceYourself,
  createYourUsername,
  showcaseYourTalent,
  setYourPreferences,
  doNext,
}: {
  uploadYourResume: React.ReactNode
  introduceYourself: React.ReactNode
  createYourUsername: React.ReactNode
  showcaseYourTalent: React.ReactNode
  setYourPreferences: React.ReactNode
  doNext: React.ReactNode
}) => {
  const {
    nextStep,
    prevStep,
    setStep,
    toggleStepValidation,
    state: { currentStep, hasNextStep, hasPreviousStep, totalSteps },
    stepsState,
  } = useStepper({
    steps,
  })

  const stepperValue = useMemo(
    () => ({ nextStep, prevStep, setStep, toggleStepValidation }),
    [nextStep, prevStep, setStep, toggleStepValidation]
  )
  const stepperRootValue = useMemo(
    () => ({
      currentStep,
      hasNextStep,
      hasPreviousStep,
      totalSteps,
      stepsState,
    }),
    [currentStep, hasNextStep, hasPreviousStep, totalSteps, stepsState]
  )

  return (
    <StepperProvider value={stepperValue}>
      <StepRootProvider value={stepperRootValue}>
        <StepControl>
          <Step>{uploadYourResume}</Step>
          <Step>{introduceYourself}</Step>
          <Step>{showcaseYourTalent}</Step>
          <Step>{createYourUsername}</Step>
          <Step>{setYourPreferences}</Step>
          <Step>{doNext}</Step>
        </StepControl>
      </StepRootProvider>
    </StepperProvider>
  )
}

export default function TalentOnboardingRoot() {
  const [talentUser, setTalentUser] = useState<User | null>(null)
  const [stepData, setStepData] = React.useState<CreateTalentType | null>(null)

  return (
    <TalentOnboarding
      uploadYourResume={
        <UploadYourResume
          sidebar={<Sidebar />}
          stepData={stepData}
          setStepData={setStepData}
        />
      }
      introduceYourself={
        <IntroduceYourself
          sidebar={<Sidebar />}
          stepData={stepData}
          setStepData={setStepData}
        />
      }
      createYourUsername={
        <CreateYourUsername
          sidebar={<Sidebar />}
          stepData={stepData}
          setStepData={setStepData}
        />
      }
      showcaseYourTalent={
        <ShowcaseYourTalent
          sidebar={<Sidebar />}
          stepData={stepData}
          setStepData={setStepData}
        />
      }
      setYourPreferences={
        <SetYourPreferences
          sidebar={<Sidebar />}
          stepData={stepData}
          setStepData={setStepData}
          setTalentUser={setTalentUser}
        />
      }
      doNext={<DoNext talentUser={talentUser} sidebar={<DoNextSidebar />} />}
    />
  )
}
