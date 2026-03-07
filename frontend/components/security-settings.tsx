"use client"

import React, { useEffect, useMemo, useState } from "react"
import { AuthAPI } from "@/service/http/auth"
import {
  cn,
  containsNumberOfChars,
  containsOneLowerCaseLetter,
  containsOneNumber,
  containsOneSymbol,
  containsOneUpperCaseLetter,
  hookFormHasError,
} from "@/utils/functions"
import { useStepper } from "@/utils/hooks"
import { Check, Eye, EyeOff } from "@blend-metrics/icons"
import { ArrowRight } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  Step,
  StepControl,
  StepRootProvider,
  StepperProvider,
  useStepRootContext,
  useStepperContext,
  useToast,
} from "@/components/ui"

const steps = [
  { label: "secure-password", isValid: false, disabled: false },
  { label: "save-changes-exit", isValid: false, disabled: true },
]

const secureYourAccountFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Please enter at least 8 character(s)")
      .refine(containsOneUpperCaseLetter, {
        message: "Please enter at least 1 uppercase letter(s)",
      })
      .refine(containsOneSymbol, {
        message: "Please enter at least 1 symbol(s)",
      })
      .refine(containsOneLowerCaseLetter, {
        message: "Please enter at least 1 lowercase letter(s)",
      })
      .refine(containsOneNumber, {
        message: "Please enter at least 1 number(s)",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SecureYourAccountFormValues = z.infer<typeof secureYourAccountFormSchema>

const Step1 = ({ formData, setFormData }: any) => {
  const { setStep, toggleStepValidation } = useStepperContext()
  const { toast } = useToast()
  const {
    register,
    control,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<SecureYourAccountFormValues>({
    resolver: zodResolver(secureYourAccountFormSchema),
    mode: "onChange",
    defaultValues: {
      password: formData.password || "",
      confirmPassword: formData.password || "",
    },
  })

  const password = useWatch({ control, name: "password" })
  const [showPassword, toggleShowPassword] = useToggle(false)
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false)
  const { currentStep, totalSteps } = useStepRootContext()

  useEffect(() => {
    toggleStepValidation(currentStep)(isValid)
  }, [isValid, toggleStepValidation, currentStep])

  const onSubmit = async (data: SecureYourAccountFormValues) => {
    try {
      const response = await AuthAPI.CreatePassword({ password: data.password })
      const isSuccess =
        typeof response?.status === "number" &&
        response.status >= 200 &&
        response.status < 300
      if (isSuccess) {
        setFormData((prev: any) => ({ ...prev, password: data.password }))
        setStep(1)
        reset()
      } else {
        throw new Error("Failed to set password")
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.errors?.message ||
        error?.message ||
        "Something went wrong"
      toast({
        title: errorMessage,
        variant: "destructive",
      })
    } finally {
    }
  }

  // const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <Dialog open>
      <DialogContent className="w-full max-w-md space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          {/* <div className="flex items-center gap-2">
          <CircularProgress value={progress} size={15.43} strokeWidth={2.5} />
          <span className="text-xs text-gray-700">
            STEP {currentStep + 1} / {totalSteps}
          </span>
        </div> */}

          <h2 className="text-2xl font-semibold text-dark-blue-400">
            Secure your account
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="password">Create Password</Label>
            <InputGroup>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Type your password"
                {...register("password")}
                isInvalid={hookFormHasError({ errors, name: "password" })}
              />
              <InputRightElement>
                <button type="button" onClick={toggleShowPassword}>
                  {showPassword ? (
                    <EyeOff className="text-gray-400 size-4" />
                  ) : (
                    <Eye className="text-gray-400 size-4" />
                  )}
                </button>
              </InputRightElement>
            </InputGroup>
            <HookFormErrorMessage
              errors={errors}
              name="password"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <InputGroup>
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Type your password again"
                {...register("confirmPassword")}
                isInvalid={hookFormHasError({
                  errors,
                  name: "confirmPassword",
                })}
              />
              <InputRightElement>
                <button type="button" onClick={toggleShowConfirmPassword}>
                  {showConfirmPassword ? (
                    <EyeOff className="text-gray-400 size-4" />
                  ) : (
                    <Eye className="text-gray-400 size-4" />
                  )}
                </button>
              </InputRightElement>
            </InputGroup>
            <HookFormErrorMessage
              errors={errors}
              name="confirmPassword"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <ul className="space-y-2 text-sm text-gray-600 mt-4">
            <li className="flex gap-2 items-center">
              <Check
                className={cn(
                  "size-4",
                  containsNumberOfChars({
                    value: password,
                    numberOfChars: 8,
                  }) && "text-green-500"
                )}
              />
              At least 8 characters
            </li>
            <li className="flex gap-2 items-center">
              <Check
                className={cn(
                  "size-4",
                  containsOneLowerCaseLetter(password) && "text-green-500"
                )}
              />
              One lowercase letter
            </li>
            <li className="flex gap-2 items-center">
              <Check
                className={cn(
                  "size-4",
                  containsOneUpperCaseLetter(password) && "text-green-500"
                )}
              />
              One uppercase letter
            </li>
            <li className="flex gap-2 items-center">
              <Check
                className={cn(
                  "size-4",
                  containsOneNumber(password) && "text-green-500"
                )}
              />
              One number
            </li>
            <li className="flex gap-2 items-center">
              <Check
                className={cn(
                  "size-4",
                  containsOneSymbol(password) && "text-green-500"
                )}
              />
              One symbol
            </li>
          </ul>

          <div className="flex justify-end pt-6">
            <Button type="submit">Continue</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/*

  const secondStepFormSchema = z.object({
    phoneNumber: z.string().min(1, "Please enter your phone number"),
  })

  type SecondStepFormValues = z.infer<typeof secondStepFormSchema>

  export const Step2 = () => {
    const {
      control,
      formState: { errors },
      handleSubmit,
    } = useForm<SecondStepFormValues>({
      resolver: zodResolver(secondStepFormSchema),
    })
    const onSubmit: SubmitHandler<SecondStepFormValues> = (values) => {}

    return (
      <Dialog>
        <DialogTrigger>
          <Button>Trigger</Button>
        </DialogTrigger>
        <DialogContent className="max-w-[408px]">
          <div className="flex items-center gap-x-2">
            <CircularProgress
              strokeWidth={1.5}
              size={15.43}
              value={30}
              show={false}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 2 / 3
            </span>
          </div>

          <div className="mt-2">
            <h3 className="text-2xl leading-9 font-semibold text-dark-blue-400">
              Secure your account
            </h3>
          </div>

          <div className="mt-8">
            <h1 className="text-lg leading-7 font-medium text-dark-blue-400">
              Set up two-factor authentication
            </h1>
            <p className="text-sm leading-5 mt-3 text-dark-blue-400">
              Enter your phone number and we’ll send a magic link to the number
              entered. This helps keep your account secure.
            </p>
          </div>

          <form className="mt-6" onClick={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label size="sm" htmlFor="phone-number" className="text-gray-700">
                Phone Number
              </Label>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field }) => (
                  <PhoneNumberInput
                    {...field}
                    invalid={hookFormHasError({
                      errors,
                      name: "phoneNumber",
                    })}
                  />
                )}
              />

              <HookFormErrorMessage
                name="phoneNumber"
                errors={errors}
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            <div className="flex items-center justify-between mt-[168px]">
              <Button size="md" variant="ghost" visual="gray">
                <ArrowLeft className="size-[15px]" />
                Back
              </Button>
              <Button size="md">Continue</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  export const Step3 = () => {
    return (
      <Dialog>
        <DialogTrigger>
          <Button>Trigger</Button>
        </DialogTrigger>
        <DialogContent className="max-w-[408px]">
          <div className="flex items-center gap-x-2">
            <CircularProgress
              strokeWidth={1.5}
              size={15.43}
              value={30}
              show={false}
            />
            <span className="text-[11px] leading-[15.43px] text-gray-700">
              STEP 2 / 3
            </span>
          </div>

          <div className="mt-2">
            <h3 className="text-2xl leading-9 font-semibold text-dark-blue-400">
              Secure your account
            </h3>
          </div>

          <div className="mt-8">
            <h1 className="text-lg leading-7 font-medium text-dark-blue-400">
              Set up two-factor authentication
            </h1>
            <p className="text-sm leading-5 mt-3 text-dark-blue-400 whitespace-pre-line">
              We sent a magic link sent to phone number ending with 7890. Click
              the link to confirm your phone number. The link will expire in 24
              hours.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-x-2">
            <span className="text-sm leading-5 text-dark-blue-400">
              Not seeing the link?
            </span>
            <Button variant="link">Resend</Button>
          </div>

          <div className="flex items-center justify-between mt-[160px]">
            <Button size="md" variant="ghost" visual="gray">
              <ArrowLeft className="size-[15px]" />
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
  
*/

const SaveChangesExit = ({ onClose }: { onClose: () => void }) => {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>All set! You’ve secured your account.</DialogTitle>
          <DialogDescription>
            Click the link below to continue setting up your account... Or close
            this window to start browsing the marketplace. We’re excited to have
            you with us!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-8">
          <Button variant="outlined" visual="gray" onClick={onClose}>
            Close Window
          </Button>
          <Button>
            Continue Setup
            <ArrowRight className="size-[15px]" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const SecuritySettingsStepper = ({
  onCloseModal,
}: {
  onCloseModal: () => void
}) => {
  const [formData, setFormData] = useState<{ password?: string }>({})

  const {
    nextStep,
    prevStep,
    setStep,
    toggleStepValidation,
    state: { currentStep, hasNextStep, hasPreviousStep, totalSteps },
    stepsState,
  } = useStepper({ steps })

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
          <Step>
            <Step1 formData={formData} setFormData={setFormData} />
          </Step>
          <Step>
            <SaveChangesExit onClose={onCloseModal} />
          </Step>
        </StepControl>
      </StepRootProvider>
    </StepperProvider>
  )
}

export default SecuritySettingsStepper
