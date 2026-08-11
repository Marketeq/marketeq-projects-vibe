"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  mergeDashboardUserFields,
  resolveDashboardRoute,
  useAuth,
} from "@/contexts/auth"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { hookFormHasError } from "@/utils/functions"
import { Eye, EyeOff } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, SubmitHandler, useForm } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner/spinner"
import GoogleLoginButton from "@/components/auth/GoogleLoginButton"
import LinkedInLoginButton from "@/components/auth/LinkedInLoginButton"
import SecuritySettingsStepper from "@/components/security-settings"
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  ErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  useToast,
} from "@/components/ui"

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter at least 1 character(s)")
    .email("Please enter a valid email"),
  password: z.string().min(1, "Please enter at least 1 character(s)"),
  rememberMe: z.boolean(),
})

const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "Please enter at least 1 character(s)")
    .email("Please enter a valid email"),
  agreesToTermsPrivacyPolicy: z.boolean().refine((value) => value, {
    message: "Please accept Terms of Use and Privacy Policy",
  }),
})

type SignInFormValues = z.infer<typeof signInSchema>
type SignUpFormValues = z.infer<typeof signUpSchema>

function SignInForm({ onSwitchToSignUp, onClose }: { onSwitchToSignUp: () => void; onClose: () => void }) {
  const router = useRouter()
  const { setUser, closeAuthModal, pendingRedirect, setPendingRedirect } = useAuth()
  const { toast } = useToast()
  const [isVisible, toggleIsVisible] = useToggle(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const savedEmail = typeof window !== "undefined" ? localStorage.getItem("marketeq_remembered_email") ?? "" : ""

  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: savedEmail, password: "", rememberMe: savedEmail !== "" },
  })

  const onSubmit: SubmitHandler<SignInFormValues> = ({ email, password, rememberMe }) => {
    if (rememberMe) {
      localStorage.setItem("marketeq_remembered_email", email)
    } else {
      localStorage.removeItem("marketeq_remembered_email")
    }
    setIsLoading(true)
    setLoginError(null)
    AuthAPI.LoginWithEmail({ email, password, rememberMe })
      .then(async (response) => {
        if (response?.status === 200 && response?.data?.user) {
          let nextUser = response.data.user
          try {
            const meResponse = await UserAPI.me()
            if (meResponse?.status === 200) {
              const profileUser =
                meResponse?.data?.user ??
                meResponse?.data?.data?.user ??
                meResponse?.data
              if (profileUser && typeof profileUser === "object") {
                nextUser = mergeDashboardUserFields(nextUser, profileUser)
              }
            }
          } catch {
            // fall back to auth payload
          }
          if (nextUser && typeof nextUser === "object") {
            setUser(nextUser)
          }
          closeAuthModal()
          onClose()
          if (pendingRedirect) {
            router.push(pendingRedirect)
            setPendingRedirect(null)
          }
          reset()
        } else if (response?.status === 200 && response?.data?.requiresTwoFactor) {
          // 2FA required — redirect to full sign-in page
          router.push("/sign-in")
        }
      })
      .catch((error) => {
        const status = error?.response?.status
        if (status === 401 || status === 403) {
          setLoginError("Invalid email or password")
        } else {
          setLoginError(
            error?.response?.data?.message || "Login failed. Please try again."
          )
        }
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <>
      <h1 className="text-[28px] leading-9 font-semibold text-dark-blue-400">
        Welcome back
      </h1>
      <p className="text-base font-light mt-2 text-dark-blue-400">
        Sign in to your Marketeq account
      </p>

      <div className="mt-5">
        <div className="grid gap-y-3">
          <GoogleLoginButton onSuccess={(user) => { closeAuthModal(); onClose(); router.push(pendingRedirect ?? resolveDashboardRoute(user)); setPendingRedirect(null); }} />
          <LinkedInLoginButton onSuccess={(user) => { closeAuthModal(); onClose(); router.push(pendingRedirect ?? resolveDashboardRoute(user)); setPendingRedirect(null); }} />
        </div>

        <div className="mt-5 flex gap-x-[9px] items-center">
          <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
          <span className="inline-block text-xs font-medium text-gray-400">
            Or use your email
          </span>
          <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
        </div>

        <form className="mt-5" onSubmit={handleSubmit(onSubmit)}>
          {loginError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-sm text-red-600">
              {loginError}
            </div>
          )}

          <div className="flex flex-col gap-y-1.5">
            <Label size="sm">Email</Label>
            <Input
              placeholder="you@email.com"
              {...register("email")}
              isInvalid={hookFormHasError({ errors, name: "email" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="email"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="flex flex-col gap-y-1.5 mt-5">
            <Label size="sm">Password</Label>
            <InputGroup>
              <Input
                type={isVisible ? "text" : "password"}
                placeholder="enter your password"
                {...register("password")}
                isInvalid={hookFormHasError({ errors, name: "password" })}
              />
              <InputRightElement>
                <button type="button" onClick={toggleIsVisible} className="focus:outline-none">
                  {isVisible ? (
                    <EyeOff className="text-gray-400 h-4 w-4" />
                  ) : (
                    <Eye className="text-gray-400 h-4 w-4" />
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

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <Controller
                control={control}
                name="rememberMe"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label className="font-normal text-gray-400" size="sm">
                Keep me signed in
              </Label>
            </div>
            <Button
              className="underline"
              visual="gray"
              variant="link"
              type="button"
              onClick={() => window.location.assign("/forgot-password")}
            >
              Forgot password
            </Button>
          </div>

          <div className="mt-5">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : "Sign In"}
            </Button>
          </div>
        </form>

        <div className="mt-10">
          <div className="text-sm text-gray-500">
            <span>Don't have an account?</span>{" "}
            <Button
              variant="link"
              className="font-normal underline"
              onClick={onSwitchToSignUp}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function SignUpForm({ onSwitchToSignIn, onClose }: { onSwitchToSignIn: () => void; onClose: () => void }) {
  const router = useRouter()
  const { setUser, closeAuthModal, pendingRedirect, setPendingRedirect } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showSecuritySettings, setShowSecuritySettings] = useState(false)

  const {
    register,
    formState: { errors },
    control,
    clearErrors,
    handleSubmit,
    reset,
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", agreesToTermsPrivacyPolicy: false },
  })

  const onSubmit: SubmitHandler<SignUpFormValues> = ({ email }) => {
    setIsLoading(true)
    setFormError(null)
    clearErrors("email")

    AuthAPI.SignUpWithEmail({ email })
      .then((response) => {
        if (response?.status === 201 && response?.data?.user) {
          setUser(response?.data?.user)
          closeAuthModal()
          onClose()
          setShowSecuritySettings(true)
          // Mirror app/sign-up/page.tsx: a brand-new signup must go through
          // onboarding (role selection etc.), not be left on whatever page
          // the popup happened to be opened from.
          router.push(pendingRedirect ?? "/onboarding")
          setPendingRedirect(null)
          reset()
        } else {
          setFormError("Something went wrong. Please try again.")
        }
      })
      .catch((error) => {
        const errorMessage =
          error?.response?.data?.errors?.message ||
          (Array.isArray(error?.response?.data?.message) &&
          error?.response?.data?.message?.length > 0
            ? error?.response?.data?.message?.[0]
            : error?.response?.data?.message)

        const isEmailError =
          typeof errorMessage === "string" &&
          /email|user already exists/i.test(errorMessage)

        if (isEmailError) {
          setError("email", { type: "server", message: errorMessage })
        } else {
          setFormError(
            typeof errorMessage === "string"
              ? errorMessage
              : "Something went wrong. Please try again."
          )
        }
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <>
      <h1 className="text-[28px] leading-9 font-semibold text-dark-blue-400">
        Create your free account
      </h1>
      <p className="text-base font-light mt-2 text-dark-blue-400">
        Get the most of Marketeq
      </p>

      <div className="mt-5">
        <div className="grid gap-y-3">
          <GoogleLoginButton onSuccess={(user) => { closeAuthModal(); onClose(); router.push(pendingRedirect ?? resolveDashboardRoute(user)); setPendingRedirect(null); }} />
          <LinkedInLoginButton onSuccess={(user) => { closeAuthModal(); onClose(); router.push(pendingRedirect ?? resolveDashboardRoute(user)); setPendingRedirect(null); }} />
        </div>

        <div className="mt-5 flex gap-x-[9px] items-center">
          <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
          <span className="inline-block text-xs font-medium text-gray-400">
            Or use your email
          </span>
          <span className="inline-block h-px bg-[#E1E6EA] flex-auto" />
        </div>

        <form className="mt-5" onSubmit={handleSubmit(onSubmit)}>
          {formError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-y-1.5">
            <Label size="sm">Email</Label>
            <Input
              placeholder="you@email.com"
              {...register("email")}
              isInvalid={hookFormHasError({ errors, name: "email" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="email"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="mt-5 flex items-start gap-x-2">
            <Controller
              control={control}
              name="agreesToTermsPrivacyPolicy"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              )}
            />
            <Label className="font-normal text-gray-400 leading-5" size="sm">
              I agree to Marketeq's Terms of Use and Privacy Policy
            </Label>
          </div>
          <HookFormErrorMessage
            errors={errors}
            name="agreesToTermsPrivacyPolicy"
            render={({ message }) => (
              <ErrorMessage className="mt-1">{message}</ErrorMessage>
            )}
          />

          <div className="mt-5">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : "Create my account"}
            </Button>
          </div>
        </form>

        <div className="mt-10">
          <div className="text-sm text-gray-500">
            <span>Already have an account?</span>{" "}
            <Button
              variant="link"
              className="font-normal underline"
              onClick={onSwitchToSignIn}
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {showSecuritySettings && (
        <SecuritySettingsStepper
          onCloseModal={() => {
            setShowSecuritySettings(false)
            if (pendingRedirect) {
              router.push(pendingRedirect)
              setPendingRedirect(null)
            }
          }}
        />
      )}
    </>
  )
}

export function AuthModal({
  open,
  onOpenChange,
  defaultView = "sign-in",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultView?: "sign-in" | "sign-up"
}) {
  const [view, setView] = useState<"sign-in" | "sign-up">(defaultView)

  // Reset view whenever the modal opens with a (possibly new) default. A
  // plain onOpenChange handler only fires on Radix-internal close events
  // (Escape, overlay click), not when a parent flips `open` externally —
  // so the reset has to live here instead.
  useEffect(() => {
    if (open) setView(defaultView)
  }, [open, defaultView])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[408px]">
        {view === "sign-in" ? (
          <SignInForm onSwitchToSignUp={() => setView("sign-up")} onClose={() => onOpenChange(false)} />
        ) : (
          <SignUpForm onSwitchToSignIn={() => setView("sign-in")} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
