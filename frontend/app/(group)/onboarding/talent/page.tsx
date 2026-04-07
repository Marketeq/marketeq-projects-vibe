"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import industriesMock from "@/public/mock/industries.json"
import jobTitlesMock from "@/public/mock/job_titles.json"
import languagesMock from "@/public/mock/languages.json"
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
  getIsNotEmpty,
  hookFormHasError,
  noop,
} from "@/utils/functions"
import { useControllableState, useStepper } from "@/utils/hooks"
import { generateUsernameSuggestions } from "@/utils/username"
import {
  AlertCircle,
  Check,
  ChevronRight,
  File02,
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
import { Spinner } from "@/components/ui/spinner/spinner"
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
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  ErrorMessage,
  GoogleMap,
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

const optionalUsernameString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value
    const trimmedValue = value.trim()
    return trimmedValue.length ? trimmedValue : undefined
  },
  z
    .string()
    .min(3, "Please enter at least 3 character(s)")
    .regex(USERNAME_PATTERN, USERNAME_RULE_MESSAGE)
    .optional()
)

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
  const { nextStep, setStep } = useStepperContext()

  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.trim()

  const onSubmit: SubmitHandler<IntroduceYourselfFormValues> = ({
    avatar,
    firstName,
    lastName,
  }) => {
    setStepData({
      ...stepData,
      avatar: avatar?.[0],
      firstName,
      lastName,
    })
    nextStep()
  }

  const skip = () => {
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
              STEP 1 / 5
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
                      initialFile={stepData?.avatar ?? null}
                      onValueChange={onChange}
                      startingPoint={({ dataUrl, open, style, onChangePhoto }) => (
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
                              onClick={onChangePhoto}
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
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[488px] 2xl:max-w-[560px] self-end w-full mt-10 2xl:mt-[50px]">
          <div className="flex items-center justify-between">
            <Button
              size="md"
              variant="outlined"
              visual="gray"
              type="button"
              disabled
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

  const { username } = watch()
  const generatedUsernameSuggestions = useMemo(
    () =>
      generateUsernameSuggestions(
        stepData?.firstName || "",
        stepData?.lastName || "",
        stepData?.recentJobTitle || ""
      ),
    [stepData?.firstName, stepData?.lastName, stepData?.recentJobTitle]
  )

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

                    {index !== expandedSuggestions.length - 1 && <span>, </span>}
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

        <div className="mx-auto max-w-[488px] 2xl:max-w-[560px] self-end w-full mt-10 2xl:mt-[50px]">
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

const hasCaseInsensitiveExactMatch = (values: string[], candidate: string) => {
  const normalizedCandidate = candidate.trim().toLowerCase()
  if (!normalizedCandidate) return false
  return values.some((value) => value.trim().toLowerCase() === normalizedCandidate)
}

const submitAutocompleteValue = async (type: string, label: string) => {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return false

  try {
    await AutocompleteAPI.submit({ type, label: trimmedLabel })
    return true
  } catch {
    return false
  }
}

const LOCATIONIQ_API_KEY =
  process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY ||
  "pk.8d6cd3795ace5efa9a0a3469b55d08cb"

const reverseGeocodeLocation = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
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
const LOCATION_FALLBACK_OPTIONS = [
  "Birmingham, Alabama, United States",
  "Huntsville, Alabama, United States",
  "Mobile, Alabama, United States",
  "Anchorage, Alaska, United States",
  "Fairbanks, Alaska, United States",
  "Juneau, Alaska, United States",
  "Phoenix, Arizona, United States",
  "Tucson, Arizona, United States",
  "Scottsdale, Arizona, United States",
  "Little Rock, Arkansas, United States",
  "Fayetteville, Arkansas, United States",
  "Fort Smith, Arkansas, United States",
  "Los Angeles, California, United States",
  "San Francisco, California, United States",
  "San Diego, California, United States",
  "Denver, Colorado, United States",
  "Colorado Springs, Colorado, United States",
  "Boulder, Colorado, United States",
  "Stamford, Connecticut, United States",
  "Hartford, Connecticut, United States",
  "New Haven, Connecticut, United States",
  "Wilmington, Delaware, United States",
  "Dover, Delaware, United States",
  "Newark, Delaware, United States",
  "Miami, Florida, United States",
  "Orlando, Florida, United States",
  "Tampa, Florida, United States",
  "Atlanta, Georgia, United States",
  "Savannah, Georgia, United States",
  "Augusta, Georgia, United States",
  "Honolulu, Hawaii, United States",
  "Hilo, Hawaii, United States",
  "Kailua, Hawaii, United States",
  "Boise, Idaho, United States",
  "Idaho Falls, Idaho, United States",
  "Coeur d'Alene, Idaho, United States",
  "Chicago, Illinois, United States",
  "Aurora, Illinois, United States",
  "Naperville, Illinois, United States",
  "Indianapolis, Indiana, United States",
  "Fort Wayne, Indiana, United States",
  "Bloomington, Indiana, United States",
  "Des Moines, Iowa, United States",
  "Cedar Rapids, Iowa, United States",
  "Iowa City, Iowa, United States",
  "Wichita, Kansas, United States",
  "Overland Park, Kansas, United States",
  "Kansas City, Kansas, United States",
  "Louisville, Kentucky, United States",
  "Lexington, Kentucky, United States",
  "Bowling Green, Kentucky, United States",
  "New Orleans, Louisiana, United States",
  "Baton Rouge, Louisiana, United States",
  "Shreveport, Louisiana, United States",
  "Portland, Maine, United States",
  "Bangor, Maine, United States",
  "Augusta, Maine, United States",
  "Baltimore, Maryland, United States",
  "Bethesda, Maryland, United States",
  "Annapolis, Maryland, United States",
  "Boston, Massachusetts, United States",
  "Cambridge, Massachusetts, United States",
  "Worcester, Massachusetts, United States",
  "Detroit, Michigan, United States",
  "Grand Rapids, Michigan, United States",
  "Ann Arbor, Michigan, United States",
  "Minneapolis, Minnesota, United States",
  "St. Paul, Minnesota, United States",
  "Rochester, Minnesota, United States",
  "Jackson, Mississippi, United States",
  "Gulfport, Mississippi, United States",
  "Hattiesburg, Mississippi, United States",
  "St. Louis, Missouri, United States",
  "Kansas City, Missouri, United States",
  "Springfield, Missouri, United States",
  "Billings, Montana, United States",
  "Missoula, Montana, United States",
  "Bozeman, Montana, United States",
  "Omaha, Nebraska, United States",
  "Lincoln, Nebraska, United States",
  "Bellevue, Nebraska, United States",
  "Las Vegas, Nevada, United States",
  "Reno, Nevada, United States",
  "Henderson, Nevada, United States",
  "Manchester, New Hampshire, United States",
  "Nashua, New Hampshire, United States",
  "Concord, New Hampshire, United States",
  "Newark, New Jersey, United States",
  "Jersey City, New Jersey, United States",
  "Princeton, New Jersey, United States",
  "Albuquerque, New Mexico, United States",
  "Santa Fe, New Mexico, United States",
  "Las Cruces, New Mexico, United States",
  "New York City, New York, United States",
  "Buffalo, New York, United States",
  "Rochester, New York, United States",
  "Charlotte, North Carolina, United States",
  "Raleigh, North Carolina, United States",
  "Durham, North Carolina, United States",
  "Fargo, North Dakota, United States",
  "Bismarck, North Dakota, United States",
  "Grand Forks, North Dakota, United States",
  "Columbus, Ohio, United States",
  "Cleveland, Ohio, United States",
  "Cincinnati, Ohio, United States",
  "Oklahoma City, Oklahoma, United States",
  "Tulsa, Oklahoma, United States",
  "Norman, Oklahoma, United States",
  "Portland, Oregon, United States",
  "Eugene, Oregon, United States",
  "Salem, Oregon, United States",
  "Philadelphia, Pennsylvania, United States",
  "Pittsburgh, Pennsylvania, United States",
  "Allentown, Pennsylvania, United States",
  "Providence, Rhode Island, United States",
  "Warwick, Rhode Island, United States",
  "Newport, Rhode Island, United States",
  "Charleston, South Carolina, United States",
  "Columbia, South Carolina, United States",
  "Greenville, South Carolina, United States",
  "Sioux Falls, South Dakota, United States",
  "Rapid City, South Dakota, United States",
  "Pierre, South Dakota, United States",
  "Nashville, Tennessee, United States",
  "Memphis, Tennessee, United States",
  "Knoxville, Tennessee, United States",
  "Houston, Texas, United States",
  "Dallas, Texas, United States",
  "Austin, Texas, United States",
  "Salt Lake City, Utah, United States",
  "Provo, Utah, United States",
  "Ogden, Utah, United States",
  "Burlington, Vermont, United States",
  "Montpelier, Vermont, United States",
  "Rutland, Vermont, United States",
  "Virginia Beach, Virginia, United States",
  "Richmond, Virginia, United States",
  "Arlington, Virginia, United States",
  "Seattle, Washington, United States",
  "Bellevue, Washington, United States",
  "Spokane, Washington, United States",
  "Charleston, West Virginia, United States",
  "Morgantown, West Virginia, United States",
  "Huntington, West Virginia, United States",
  "Milwaukee, Wisconsin, United States",
  "Madison, Wisconsin, United States",
  "Green Bay, Wisconsin, United States",
  "Cheyenne, Wyoming, United States",
  "Casper, Wyoming, United States",
  "Jackson, Wyoming, United States",
]

const ShareYourLocation = ({
  sidebar,
  stepData,
  setStepData,
}: {
  sidebar: React.ReactNode
  stepData: CreateTalentType | null
  setStepData: React.Dispatch<React.SetStateAction<CreateTalentType | null>>
}) => {
  const initialDetectedLocation =
    stepData?.location?.trim() || LOCATION_FALLBACK_OPTIONS[0]
  const [detectedLocation, setDetectedLocation] = useState(
    initialDetectedLocation
  )
  const [detectedCoordinates, setDetectedCoordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)
  const [locationDetectError, setLocationDetectError] = useState<string | null>(
    null
  )

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    getValues,
    setValue,
    clearErrors,
    setError,
  } = useForm<ShareYourGoalsFormValues>({
    resolver: zodResolver(shareYourGoalsFormSchema),
    defaultValues: {
      location: [initialDetectedLocation],
      languages: parseMultiSelectString(stepData?.language),
    },
  })
  const [languagesQuery, setLanguagesQuery] = useState("")
  const [isLanguagesOpen, setIsLanguagesOpen] = useState(false)
  const [isHomeCountry, setIsHomeCountry] = useState(true)
  const [suppressLanguageFocusOpen, setSuppressLanguageFocusOpen] =
    useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    parseMultiSelectString(stepData?.language)
  )
  const [languageOptions, setLanguageOptions] = useState<string[]>(
    getUniqueOptions(languagesMock.map((item) => item.label))
  )
  const languagesRequestRef = useRef(0)
  const languagesDebounceTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const filteredLanguages = useMemo(() => {
    const query = languagesQuery.trim().toLowerCase()
    if (!query) return languageOptions
    return languageOptions.filter((item) =>
      item.toLowerCase().includes(query)
    )
  }, [languageOptions, languagesQuery])

  const addLanguageValue = async (
    nextValue: string,
    onChange: (values: string[]) => void
  ) => {
    const value = nextValue.trim()
    if (!value) return

    const isKnownSuggestion = hasCaseInsensitiveExactMatch(languageOptions, value)
    if (!isKnownSuggestion) {
      const accepted = await submitAutocompleteValue("languages", value)
      if (!accepted) {
        setError("languages", {
          type: "manual",
          message:
            "This value is not a valid language suggestion for this field.",
        })
        setLanguagesQuery("")
        setIsLanguagesOpen(false)
        return
      }
    }

    clearErrors("languages")
    setLanguageOptions((prev) => getUniqueOptions([...prev, value]))
    setSelectedLanguages((prev) => {
      if (prev.includes(value)) return prev
      const next = [...prev, value]
      onChange(next)
      return next
    })
    setLanguagesQuery("")
    setIsLanguagesOpen(false)
    setSuppressLanguageFocusOpen(true)
  }

  const removeLanguageValue = (
    target: string,
    onChange: (values: string[]) => void
  ) => {
    const next = selectedLanguages.filter((item) => item !== target)
    setSelectedLanguages(next)
    onChange(next)
  }
  const { toggleValidation } = useStepContext()
  const { nextStep, prevStep, setStep } = useStepperContext()

  useEffect(() => {
    setValue("location", [detectedLocation], { shouldValidate: true })
  }, [detectedLocation, setValue])

  useEffect(() => {
    if (detectedCoordinates) return

    let isCancelled = false

    ;(async () => {
      const resolvedCoordinates = await geocodeLocation(detectedLocation)
      if (isCancelled || !resolvedCoordinates) return
      setDetectedCoordinates(resolvedCoordinates)
    })()

    return () => {
      isCancelled = true
    }
  }, [detectedCoordinates, detectedLocation])

  useEffect(() => {
    const trimmedQuery = languagesQuery.trim()
    if (!trimmedQuery) return

    if (languagesDebounceTimerRef.current) {
      clearTimeout(languagesDebounceTimerRef.current)
    }

    languagesDebounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++languagesRequestRef.current
      try {
        const response = await AutocompleteAPI.getByType("languages", trimmedQuery)
        if (currentRequestId !== languagesRequestRef.current) return

        const values: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedOptions = getUniqueOptions(
          values.map((item) => normalizeAutocompleteLabel(item))
        )
        if (!getIsNotEmpty(normalizedOptions)) return
        setLanguageOptions((prev) =>
          getUniqueOptions([...prev, ...normalizedOptions])
        )
      } catch {
        // Keep current/fallback options when endpoint is unavailable.
      }
    }, 250)
  }, [languagesQuery])

  useEffect(() => {
    return () => {
      if (languagesDebounceTimerRef.current) {
        clearTimeout(languagesDebounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (stepData?.location?.trim()) return
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationDetectError(
        "Location detection is unavailable in this browser."
      )
      return
    }

    let isCancelled = false
    setIsDetectingLocation(true)
    setLocationDetectError(null)

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setDetectedCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })

        const resolvedLocation = await reverseGeocodeLocation(
          coords.latitude,
          coords.longitude
        )
        if (isCancelled) return

        if (resolvedLocation) {
          setDetectedLocation(resolvedLocation)
        } else {
          setLocationDetectError(
            "Could not detect exact location. Using default location."
          )
        }

        setIsDetectingLocation(false)
      },
      () => {
        if (isCancelled) return
        setLocationDetectError(
          "Location permission denied. Using default location."
        )
        setIsDetectingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    )

    return () => {
      isCancelled = true
    }
  }, [stepData?.location])
  useIsomorphicLayoutEffect(() => toggleValidation(isValid), [isValid])

  const onSubmit: SubmitHandler<ShareYourGoalsFormValues> = ({
    languages,
    location,
  }) => {
    setStepData({
      ...stepData,
      location: location?.join(", "),
      language: languages?.join(", "),
    })
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
      location: getValues("location")?.join(", "),
      language: getValues("languages")?.join(", "),
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
              STEP 2 / 5
            </span>
          </div>

          <h1 className="text-2xl leading-[36px] mt-2 text-dark-blue-400 font-semibold">
            Confirm your location
          </h1>

          <p className="text-base leading-[19.36px] text-dark-blue-400 mt-2 font-light">
            Share your information to tailor your experience and project
            matches..
          </p>

          <div className="mt-10 2xl:mt-[50px]">
            <div className="space-y-6">
              <Controller
                control={control}
                name="location"
                render={({ field }) => (
                  <input
                    type="hidden"
                    value={field.value?.[0] ?? ""}
                    readOnly
                  />
                )}
              />
              <Card className="block border-gray-200 p-4 md:p-5 shadow-none hover:border-gray-200 hover:ring-0">
                <p className="text-xs md:text-sm text-dark-blue-400">
                  We detected your current location as{" "}
                  <span className="font-semibold">{detectedLocation}</span>
                </p>
                {isDetectingLocation && (
                  <p className="mt-1 text-xs text-gray-600">
                    Detecting your precise location...
                  </p>
                )}
                {locationDetectError && (
                  <p className="mt-1 text-xs text-gray-600">
                    {locationDetectError}
                  </p>
                )}
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                  <GoogleMap
                    title="Detected location map"
                    location={detectedLocation}
                    latitude={detectedCoordinates?.latitude}
                    longitude={detectedCoordinates?.longitude}
                  />
                </div>
                <p className="mt-4 text-center text-sm font-semibold text-dark-blue-400">
                  Is this your home country?
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isHomeCountry ? "filled" : "outlined"}
                    visual={isHomeCountry ? "primary" : "gray"}
                    onClick={() => setIsHomeCountry(true)}
                  >
                    Yes, this is my home country
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!isHomeCountry ? "filled" : "outlined"}
                    visual={!isHomeCountry ? "primary" : "gray"}
                    onClick={() => setIsHomeCountry(false)}
                  >
                    No, I&apos;m currently traveling
                  </Button>
                </div>
              </Card>
              <div className="flex flex-col gap-y-1.5">
                <Label
                  className="text-dark-blue-400"
                  htmlFor="speaking-language"
                  size="sm"
                >
                  What languages do you speak?
                </Label>
                <Controller
                  control={control}
                  name="languages"
                  render={({ field: { onChange } }) => (
                    <div className="space-y-3">
                      <Combobox
                        className="w-full"
                        value={selectedLanguages}
                        onChange={(values) => {
                          const next = values as string[]
                          setSelectedLanguages(next)
                          onChange(next)
                          setLanguagesQuery("")
                          setIsLanguagesOpen(false)
                          setSuppressLanguageFocusOpen(true)
                        }}
                        multiple
                      >
                        <ComboboxTrigger>
                          <ComboboxInput
                            id="speaking-language"
                            size="lg"
                            className="pl-3.5"
                            placeholder="Enter your languages"
                            value={languagesQuery}
                            onFocus={() => {
                              if (suppressLanguageFocusOpen) {
                                setSuppressLanguageFocusOpen(false)
                                return
                              }
                              setIsLanguagesOpen(true)
                            }}
                            onBlur={() =>
                              setTimeout(() => setIsLanguagesOpen(false), 150)
                            }
                            onChange={(event) => {
                              setLanguagesQuery(event.target.value)
                              setIsLanguagesOpen(true)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === HOT_KEYS.ENTER) {
                                const hasSuggestions =
                                  isLanguagesOpen &&
                                  languagesQuery.trim().length > 0 &&
                                  filteredLanguages.length > 0

                                if (hasSuggestions) {
                                  event.preventDefault()
                                  const activeOption = document.querySelector(
                                    '[role="option"][data-headlessui-state~="active"]'
                                  ) as HTMLElement | null
                                  const activeLabel =
                                    activeOption?.textContent?.trim() ?? ""

                                  if (activeLabel) {
                                    void addLanguageValue(activeLabel, onChange)
                                    return
                                  }
                                }

                                event.preventDefault()
                                void addLanguageValue(languagesQuery, onChange)
                              }
                            }}
                            invalid={hookFormHasError({
                              errors,
                              name: "languages",
                            })}
                          />
                        </ComboboxTrigger>
                        <ScaleOutIn show={isLanguagesOpen}>
                          <ComboboxOptions>
                            <ScrollArea viewportClassName="max-h-[304px]">
                              {filteredLanguages.map((item) => (
                                <ComboboxOption
                                  key={item}
                                  value={item}
                                  onClick={() =>
                                    void addLanguageValue(item, onChange)
                                  }
                                >
                                  {item}
                                </ComboboxOption>
                              ))}
                            </ScrollArea>
                          </ComboboxOptions>
                        </ScaleOutIn>
                      </Combobox>

                      {getIsNotEmpty(selectedLanguages) && (
                        <div className="flex flex-wrap gap-3">
                          {selectedLanguages.map((item) => (
                            <Badge visual="primary" key={item}>
                              {item}
                              <button
                                className="focus-visible:outline-none"
                                onClick={() =>
                                  removeLanguageValue(item, onChange)
                                }
                                type="button"
                              >
                                <X2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="languages"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[488px] 2xl:max-w-[560px] self-end w-full mt-10 2xl:mt-[50px]">
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
const projectPreferenceOptions = [
  "Web Application",
  "Mobile Application",
  "Dashboard Development",
  "SaaS Platform",
  "E-commerce Platform",
  "Automation Tool",
  "Cloud Migration",
  "Legacy Modernization",
  "Data Platform",
  "AI Product",
  "Blockchain Platform",
  "Smart Contracts",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "C++",
  "C",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Kotlin",
  "Swift",
  "Dart",
  "Scala",
  "R",
  "MATLAB",
  "SQL",
  "Bash",
  "PowerShell",
  "React",
  "Next.js",
  "Vue.js",
  "Nuxt.js",
  "Angular",
  "Svelte",
  "Node.js",
  "NestJS",
  "Express.js",
  "Django",
  "FastAPI",
  "Spring Boot",
  "Ruby on Rails",
  ".NET",
  "Flutter",
  "React Native",
  "PyTorch",
  "TensorFlow",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Git",
  "GitHub",
  "GitLab",
  "Postman",
  "Figma",
  "Jira",
  "Notion",
  "Webpack",
  "Vite",
  "Jest",
  "Cypress",
  "Playwright",
]

const TopSkills = ({
  onValueChange,
  value: valueProp,
  invalid,
}: {
  value?: string[]
  onValueChange?: (values: string[]) => void
  invalid?: boolean
}) => {
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    value: valueProp,
    onChange: onValueChange,
  })
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [skillOptions, setSkillOptions] =
    useState<string[]>(FALLBACK_TOP_SKILLS)
  const requestIdRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetInputValue = () => setInputValue("")

  const addValue = () => {
    if (!inputValue) return

    setValues((prev) => {
      return prev.includes(inputValue) ? prev : [...prev, inputValue]
    })
    resetInputValue()
  }

  const removeValue = (index: number) => {
    const tag = values[index]

    setValues((prev) => {
      const nextState = prev.filter((_, i) => i !== index)
      return nextState
    })
    setSelected((prev) => {
      const nextState = prev.filter((value) => value !== tag)
      return nextState
    })
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setInputValue(value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) {
      addValue()
      setOpen(false)
    }
  }

  useEffect(() => {
    const query = inputValue.trim()
    if (!query) {
      setSkillOptions(FALLBACK_TOP_SKILLS)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
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
        ).filter((item) => item.length > 0)

        if (getIsNotEmpty(normalizedApiValues)) {
          setSkillOptions(normalizedApiValues)
          return
        }
      } catch {
        // keep fallback options when autocomplete API is unavailable
      }

      const fallbackMatches = FALLBACK_TOP_SKILLS.filter((skill) =>
        skill.toLowerCase().includes(query.toLowerCase())
      )
      setSkillOptions(fallbackMatches)
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputValue])

  const filteredRoles = inputValue.trim()
    ? skillOptions
        .filter((skill) =>
          skill.toLowerCase().includes(inputValue.trim().toLowerCase())
        )
        .slice(0, 40)
    : []

  useIsomorphicLayoutEffect(() => {
    setValues((prevValues) => {
      const filteredSelected = selected.filter(
        (value) => !prevValues.includes(value)
      )

      if (filteredSelected.length > 0) {
        return [...prevValues, ...filteredSelected]
      }

      return prevValues
    })
  }, [selected])

  return (
    <div className="space-y-3">
      <Combobox
        className="w-full"
        value={selected}
        onChange={(nextSelected) => {
          setSelected(nextSelected)
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
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            value={inputValue}
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={open && getIsNotEmpty(filteredRoles)}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filteredRoles.map((role, index) => (
                <ComboboxOption key={index} value={role}>
                  {role}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="flex flex-wrap gap-4">
          {values.map((item, index) => (
            <Badge
              visual="primary"
              size="md"
              className="rounded-[16px] bg-primary-100 text-primary-500 px-2.5 pr-2 font-medium text-sm leading-5"
              key={index}
            >
              {item}
              <button
                className="inline-flex size-3 shrink-0 items-center justify-center text-primary-300 hover:text-primary-500 focus-visible:outline-none"
                onClick={() => removeValue(index)}
                type="button"
              >
                <X2 className="h-3 w-3" />
              </button>
            </Badge>
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
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(
    parseMultiSelectString(stepData?.industriesWorkedIn)
  )
  const [jobTitleOptions, setJobTitleOptions] = useState<string[]>(
    getUniqueOptions(jobTitlesMock.map((item) => item.label))
  )
  const [industriesOptions, setIndustriesOptions] = useState<string[]>(
    getUniqueOptions(industriesMock.map((item) => item.label))
  )
  const jobTitleRequestRef = useRef(0)
  const industriesRequestRef = useRef(0)
  const jobTitleDebounceTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const industriesDebounceTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)

  const filteredJobTitles = useMemo(() => {
    const query = jobTitleQuery.trim().toLowerCase()
    if (!query) return jobTitleOptions
    return jobTitleOptions.filter((item) => item.toLowerCase().includes(query))
  }, [jobTitleOptions, jobTitleQuery])
  const filteredIndustries = useMemo(() => {
    const query = industriesQuery.trim().toLowerCase()
    const searchableIndustries = industriesOptions.filter(
      (item) => !selectedIndustries.includes(item)
    )
    if (!query) return searchableIndustries
    return searchableIndustries.filter((item) =>
      item.toLowerCase().includes(query)
    )
  }, [industriesOptions, industriesQuery, selectedIndustries])

  const addIndustryValue = async (nextValue: string) => {
    const value = nextValue.trim()
    if (!value) return

    const isKnownSuggestion = hasCaseInsensitiveExactMatch(industriesOptions, value)
    if (!isKnownSuggestion) {
      const accepted = await submitAutocompleteValue("industries", value)
      if (!accepted) {
        setError("industriesWorkedWith", {
          type: "manual",
          message:
            "This value is not a valid industry suggestion for this field.",
        })
        setIndustriesQuery("")
        setIsIndustriesOpen(false)
        return
      }
    }

    clearErrors("industriesWorkedWith")
    setIndustriesOptions((prev) => getUniqueOptions([...prev, value]))
    setSelectedIndustries((prev) => {
      if (prev.includes(value)) return prev
      const next = [...prev, value]
      setValue("industriesWorkedWith", next, { shouldValidate: true })
      return next
    })
    setIndustriesQuery("")
    setIsIndustriesOpen(false)
  }

  const removeIndustryValue = (target: string) => {
    const next = selectedIndustries.filter((item) => item !== target)
    setSelectedIndustries(next)
    setValue("industriesWorkedWith", next, { shouldValidate: true })
  }

  useEffect(() => {
    const trimmedQuery = jobTitleQuery.trim()
    if (!trimmedQuery) return

    if (jobTitleDebounceTimerRef.current) {
      clearTimeout(jobTitleDebounceTimerRef.current)
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
        setJobTitleOptions((prev) =>
          getUniqueOptions([...prev, ...normalizedOptions])
        )
      } catch {
        // Keep current/fallback options when endpoint is unavailable.
      }
    }, 250)
  }, [jobTitleQuery])

  useEffect(() => {
    const trimmedQuery = industriesQuery.trim()
    if (!trimmedQuery) return

    if (industriesDebounceTimerRef.current) {
      clearTimeout(industriesDebounceTimerRef.current)
    }

    industriesDebounceTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++industriesRequestRef.current
      try {
        const response = await AutocompleteAPI.getByType(
          "industries",
          trimmedQuery
        )
        if (currentRequestId !== industriesRequestRef.current) return

        const values: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const normalizedOptions = getUniqueOptions(
          values.map((item) => normalizeAutocompleteLabel(item))
        )
        if (!getIsNotEmpty(normalizedOptions)) return
        setIndustriesOptions((prev) =>
          getUniqueOptions([...prev, ...normalizedOptions])
        )
      } catch {
        // Keep current/fallback options when endpoint is unavailable.
      }
    }, 250)
  }, [industriesQuery])

  useEffect(() => {
    return () => {
      if (jobTitleDebounceTimerRef.current) {
        clearTimeout(jobTitleDebounceTimerRef.current)
      }
      if (industriesDebounceTimerRef.current) {
        clearTimeout(industriesDebounceTimerRef.current)
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
    setStepData({
      ...stepData,
      recentJobTitle,
      isStudent: studying,
      industriesWorkedIn: industriesWorkedWith?.join(", "),
      lookingToWorkWith: yourTopSkills,
    })
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
                          value={jobTitleQuery || value || ""}
                          onFocus={() => setIsJobTitleOpen(true)}
                          onBlur={() =>
                            setTimeout(() => setIsJobTitleOpen(false), 150)
                          }
                          onChange={(event) => {
                            setJobTitleQuery(event.target.value)
                            onChange(event.target.value)
                            setIsJobTitleOpen(true)
                          }}
                          onKeyDown={(event) => {
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
                            const isKnownSuggestion =
                              hasCaseInsensitiveExactMatch(
                                jobTitleOptions,
                                finalValue
                              )
                            const applyValue = () => {
                              onChange(finalValue)
                              setJobTitleOptions((prev) =>
                                getUniqueOptions([...prev, finalValue])
                              )
                              clearErrors("recentJobTitle")
                              setJobTitleQuery("")
                              setIsJobTitleOpen(false)
                            }

                            if (isKnownSuggestion) {
                              applyValue()
                              return
                            }

                            void (async () => {
                              const accepted = await submitAutocompleteValue(
                                "job_titles",
                                finalValue
                              )
                              if (!accepted) {
                                setError("recentJobTitle", {
                                  type: "manual",
                                  message:
                                    "This value is not a valid job title suggestion for this field.",
                                })
                                setJobTitleQuery("")
                                setIsJobTitleOpen(false)
                                return
                              }
                              applyValue()
                            })()
                          }}
                          invalid={hookFormHasError({
                            errors,
                            name: "recentJobTitle",
                          })}
                        />
                      </ComboboxTrigger>
                      <ScaleOutIn show={isJobTitleOpen}>
                        <ComboboxOptions>
                          <ScrollArea viewportClassName="max-h-[304px]">
                            {filteredJobTitles.map((item) => (
                              <ComboboxOption
                                key={item}
                                value={item}
                                onClick={() => {
                                  onChange(item)
                                  clearErrors("recentJobTitle")
                                  setJobTitleQuery("")
                                  setIsJobTitleOpen(false)
                                }}
                              >
                                {item}
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
                  name="recentJobTitle"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
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
                        const normalizedValues = (
                          nextValues as string[]
                        ).filter(Boolean)
                        setSelectedIndustries(normalizedValues)
                        onChange(normalizedValues)
                        setIndustriesQuery("")
                        setIsIndustriesOpen(false)
                      }}
                    >
                      <ComboboxTrigger>
                        <ComboboxInput
                          id="industries"
                          size="lg"
                          className="pl-3.5"
                          placeholder="e.g., Banking"
                          value={industriesQuery}
                          onFocus={() => setIsIndustriesOpen(true)}
                          onClick={() => setIsIndustriesOpen(true)}
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

                                if (activeLabel) {
                                  void addIndustryValue(activeLabel)
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
                                onClick={() => void addIndustryValue(item)}
                              >
                                {item}
                              </ComboboxOption>
                            ))}
                          </ScrollArea>
                        </ComboboxOptions>
                      </ScaleOutIn>
                    </Combobox>
                  )}
                />
                {selectedIndustries.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedIndustries.map((item) => (
                      <Badge visual="primary" key={item}>
                        {item}
                        <button
                          className="focus-visible:outline-none"
                          onClick={() => removeIndustryValue(item)}
                          type="button"
                        >
                          <X2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <HookFormErrorMessage
                  errors={errors}
                  name="industriesWorkedWith"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
                  )}
                />
              </div>

              <div className="flex flex-col gap-y-1.5">
                <Controller
                  control={control}
                  name="yourTopSkills"
                  render={({ field: { value, onChange } }) => (
                    <TopSkills
                      value={value}
                      onValueChange={onChange}
                      invalid={hookFormHasError({
                        errors,
                        name: "yourTopSkills",
                      })}
                    />
                  )}
                />
                <HookFormErrorMessage
                  errors={errors}
                  name="yourTopSkills"
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
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
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[488px] 2xl:max-w-[560px] self-end w-full mt-10 2xl:mt-[50px]">
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
  value: valueProp,
}: {
  invalid?: boolean
  onValueChange?: (values: string[]) => void
  value?: string[]
}) => {
  const [inputValue, setInputValue] = useState("")
  const [isProjectPreferencesOpen, setIsProjectPreferencesOpen] =
    useState(false)
  const [values, setValues] = useControllableState<string[]>({
    defaultValue: [],
    onChange: onValueChange,
    value: valueProp,
  })

  const resetInputValue = () => setInputValue("")

  const addValue = (nextValue: string) => {
    const value = nextValue.trim()
    if (!value) return

    setValues((prev) => {
      return prev.includes(value) ? prev : [...prev, value]
    })
    resetInputValue()
    setIsProjectPreferencesOpen(false)
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
    setIsProjectPreferencesOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== HOT_KEYS.ENTER) return

    const hasSuggestions = isProjectPreferencesOpen && filteredRoles.length > 0

    if (hasSuggestions) {
      event.preventDefault()
      const activeOption = document.querySelector(
        '[role="option"][data-headlessui-state~="active"]'
      ) as HTMLElement | null
      const activeLabel = activeOption?.textContent?.trim() ?? ""

      if (activeLabel) {
        addValue(activeLabel)
        return
      }
    }

    event.preventDefault()
    addValue(inputValue)
  }

  const filteredRoles = projectPreferenceOptions.filter((skill) => {
    if (values.includes(skill)) return false
    return skill.toLowerCase().includes(inputValue.toLowerCase())
  })

  return (
    <div className="space-y-3">
      <Combobox
        className="w-full"
        value={values}
        onChange={(nextValues) => {
          const normalizedValues = (nextValues as string[]).filter(Boolean)
          setValues(normalizedValues)
          resetInputValue()
          setIsProjectPreferencesOpen(false)
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
            onFocus={() => setIsProjectPreferencesOpen(true)}
            onClick={() => setIsProjectPreferencesOpen(true)}
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
                <ComboboxOption key={index} value={role}>
                  {role}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {getIsNotEmpty(values) && (
        <div className="flex flex-wrap gap-3">
          {values.map((item, index) => (
            <Badge visual="primary" key={index}>
              {item}
              <button
                className="focus-visible:outline-none"
                onClick={() => removeValue(index)}
                type="button"
              >
                <X2 className="h-3 w-3" />
              </button>
            </Badge>
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
        message: "End time cannot be earlier than start time",
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
      className={cn(
        "py-3 flex items-start justify-between border-b border-gray-200",
        !isOn && "opacity-50"
      )}
    >
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

  const onSubmit: SubmitHandler<SetYourPreferencesFormValues> = ({
    projects,
    yourAvailability,
    customAvailability,
  }) => {
    setIsLoading(true)

    const availability: AVAILABILITY = yourAvailability
      ?.replaceAll("-", "_")
      ?.toUpperCase() as AVAILABILITY

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

    projects?.forEach((item) => {
      formData.append("projectTypes", item)
    })

    if (stepData?.isStudent != null) {
      formData.append("isStudent", stepData.isStudent.toString())
    }

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

    TalentAPI.CreateTalent(formData)
      .then((response) => {
        if (
          response?.status === 201 &&
          response?.data &&
          response?.data?.user
        ) {
          nextStep()
          setStepData(null)
          setTalentUser(response?.data?.user)
        }
      })
      .catch((error) => {
        if (error?.response?.data?.errors?.message) {
          toast({
            title: error?.response?.data?.errors?.message,
            variant: "destructive",
          })
        } else if (
          Array.isArray(error?.response?.data?.message) &&
          error?.response?.data?.message?.length > 0
        ) {
          toast({
            title: error?.response?.data?.message?.[0],
            variant: "destructive",
          })
        } else {
          toast({
            title: error?.response?.data?.message,
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const { totalSteps, currentStep } = useStepRootContext()

  const progress = ((currentStep + 1) / totalSteps) * 100

  const skip = async () => {
    try {
      toggleValidation(true)
      const nextStepIndex = currentStep + 1
      setStep(nextStepIndex)
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
    setValue("customAvailability", data)
  }

  const handleCustomAvailabityDisable = (day: string) => {
    const data =
      getValues("customAvailability")?.filter((item) => item?.day !== day) || []
    setValue("customAvailability", data)
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
                    />
                  )}
                />
                <HookFormErrorMessage
                  name="projects"
                  errors={errors}
                  render={({ message }) => (
                    <ErrorMessage size="sm">{message}</ErrorMessage>
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
                      />
                    )
                  })}

                  <HookFormErrorMessage
                    name="customAvailability"
                    errors={errors}
                    render={({ message }) => (
                      <ErrorMessage size="sm" className="mt-2">
                        {message}
                      </ErrorMessage>
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[488px] 2xl:max-w-[560px] self-end w-full mt-10 2xl:mt-[50px]">
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
  const handleFinish = async () => {
    try {
      setIsLoading(true)
      const response = await UserAPI.handleSkip({ role: ROLE.TALENT })

      let nextUser = response?.data?.user as User | undefined
      if (!nextUser) {
        const fallbackUser = talentUser ?? user
        if (fallbackUser) {
          nextUser = {
            ...fallbackUser,
            onboardingDismissed: true,
            role: fallbackUser.role ?? ROLE.TALENT,
          }
        }
      }

      if (nextUser) {
        setUser(nextUser)
      }

      try {
        const userResponse = await UserAPI.me()
        if (userResponse?.data?.user) {
          setUser(userResponse.data.user)
        }
      } catch (error) {
        console.error("Failed to refresh user after onboarding", error)
      }

      router.push("/talent-dashboard")
    } catch (error) {
      console.error("Failed to complete onboarding", error)
      // Show error toast if needed
    } finally {
      setIsLoading(false)
    }
  }

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
              onClick={() => {
                if (talentUser) {
                  setUser(talentUser)
                }
                router.push("/talent-dashboard")
              }}
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
              onClick={() => {
                if (talentUser) {
                  setUser(talentUser)
                }
                router.push("/publish-project")
              }}
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
              onClick={() => {
                if (talentUser) {
                  setUser(talentUser)
                }
                router.push("/publish-project")
              }}
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
              onClick={() => {
                if (talentUser) {
                  setUser(talentUser)
                }
                router.push("/publish-project")
              }}
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

const steps: Steps[] = [
  { label: "introduce-yourself", isValid: false, disabled: false },
  { label: "confirm-your-location", isValid: false, disabled: true },
  { label: "showcase-your-talent", isValid: false, disabled: true },
  { label: "create-your-username", isValid: false, disabled: true },
  { label: "set-your-preferences", isValid: false, disabled: true },
  { label: "do-next", isValid: false, disabled: true },
]

const TalentOnboarding = ({
  introduceYourself,
  createYourUsername,
  shareYourLocation,
  showcaseYourTalent,
  setYourPreferences,
  doNext,
}: {
  introduceYourself: React.ReactNode
  createYourUsername: React.ReactNode
  shareYourLocation: React.ReactNode
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
          <Step>{introduceYourself}</Step>
          <Step>{shareYourLocation}</Step>
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
      shareYourLocation={
        <ShareYourLocation
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
