"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/auth"
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
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import {
  Button,
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

const PasswordForm = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) => {
  const { toggleStepValidation } = useStepperContext()
  const { toast } = useToast()
  const { setUser } = useAuth()
  const {
    register,
    control,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<SecureYourAccountFormValues>({
    resolver: zodResolver(secureYourAccountFormSchema),
    mode: "onChange",
  })

  const password = useWatch({ control, name: "password" })
  const [showPassword, toggleShowPassword] = useToggle(false)
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentStep } = useStepRootContext()

  useEffect(() => {
    toggleStepValidation(currentStep)(isValid)
  }, [isValid, toggleStepValidation, currentStep])

  const onSubmit = async (data: SecureYourAccountFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await AuthAPI.CreatePassword({ password: data.password })
      const isSuccess =
        typeof response?.status === "number" &&
        response.status >= 200 &&
        response.status < 300
      if (isSuccess) {
        setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev))
        reset()
        onSuccess()
      } else {
        throw new Error("Failed to set password")
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.errors?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong"
      toast({
        title: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="w-full max-w-md space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
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

          <div className="flex justify-end gap-x-3 pt-6">
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Set Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const SaveChangesExit = ({ onClose }: { onClose: () => void }) => {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>All set! You've secured your account.</DialogTitle>
          <DialogDescription>
            Your password has been updated successfully. You can close this
            window to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-8">
          <Button variant="outlined" visual="gray" onClick={onClose}>
            Close
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
            <PasswordForm onClose={onCloseModal} onSuccess={() => setStep(1)} />
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
