"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  mergeDashboardUserFields,
  resolveDashboardRoute,
  useAuth,
} from "@/contexts/auth"
import UnauthenticatedRoute from "@/hoc/UnauthenticatedRoute"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { containsOneLowerCaseLetter, hookFormHasError } from "@/utils/functions"
import { Eye, EyeOff } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, SubmitHandler, useForm } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner/spinner"
import GoogleLoginButton from "@/components/auth/GoogleLoginButton"
import LinkedInLoginButton from "@/components/auth/LinkedInLoginButton"
import { Logo } from "@/components/icons"
import { MarketeqIcon1 } from "@/components/marketeq-icon-1"
import NextLink from "@/components/next-link"
import {
  Button,
  Checkbox,
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

type SignInFormValues = z.infer<typeof signInSchema>

const getLoginErrorMessage = (error: any) => {
  const status = error?.response?.status
  const serverMessage =
    error?.response?.data?.message ??
    error?.response?.data?.errors?.message

  if (status === 401 || status === 403) {
    return "Invalid email or password"
  }

  if (status === 423) {
    return "Your account is temporarily locked. Please try again later or reset your password."
  }

  if (status === 408 || error?.code === "ECONNABORTED") {
    return "The login request timed out. Please try again."
  }

  if (!error?.response) {
    return "Authentication service is unavailable. Please try again shortly."
  }

  if (
    typeof serverMessage === "string" &&
    serverMessage.toLowerCase().includes("session")
  ) {
    return "Your session has expired. Please log in again."
  }

  return serverMessage || "Login failed. Please try again."
}

export default function SignIn() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isVisible, toggleIsVisible] = useToggle(false)

  const [isLoading, setIsLoading] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [partialToken, setPartialToken] = useState("")
  const [twoFactorMethod, setTwoFactorMethod] = useState<string>("totp")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [isVerifying2FA, setIsVerifying2FA] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [loginError, setLoginError] = useState<string | null>(null)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])
  const redirectTarget = searchParams.get("redirect")
  const nextRoute =
    redirectTarget &&
    redirectTarget.startsWith("/") &&
    !redirectTarget.startsWith("//")
      ? redirectTarget
      : "/"

  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: typeof window !== "undefined" ? localStorage.getItem("marketeq_remembered_email") ?? "" : "",
      password: "",
      rememberMe: typeof window !== "undefined" ? localStorage.getItem("marketeq_remembered_email") !== null : false,
    },
  })
  const handleVerify2FA = async () => {
    if (twoFactorCode.length < 6) return
    setIsVerifying2FA(true)
    try {
      const res = await AuthAPI.VerifyTwoFactor({
        code: twoFactorCode,
        partialToken,
      })
      if (res?.data?.user) {
        let nextUser = res.data.user
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

        const destination = redirectTarget
          ? nextRoute
          : resolveDashboardRoute(nextUser)
        router.push(destination)
        reset()
      } else {
        toast({ title: "Invalid response from server", variant: "destructive" })
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid verification code"
      toast({ title: msg, variant: "destructive" })
      setTwoFactorCode("")
    } finally {
      setIsVerifying2FA(false)
    }
  }

  const handleResendLoginCode = async () => {
    if (resendCooldown > 0) return
    try {
      await AuthAPI.ResendTwoFactorCode({ partialToken })
      setResendCooldown(60)
      toast({ title: "Verification code resent" })
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to resend code"
      toast({ title: msg, variant: "destructive" })
    }
  }

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
        if (response?.status === 200 && response?.data?.requiresTwoFactor) {
          setPartialToken(response.data.partialToken)
          setTwoFactorMethod(response.data.twoFactorMethod ?? "totp")
          setTwoFactorRequired(true)
          if (response.data.twoFactorMethod === "sms") {
            setResendCooldown(60)
          }
          setIsLoading(false)
          return
        }

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

          const destination = redirectTarget
            ? nextRoute
            : resolveDashboardRoute(nextUser)
          router.push(destination)
          reset()
        }
      })
      .catch((error) => {
        setLoginError(getLoginErrorMessage(error))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  return (
    <UnauthenticatedRoute>
      <div className="flex min-h-screen bg-white">
        <div className="relative hidden lg:flex overflow-hidden flex-col justify-between p-[75px] w-[480px] bg-dark-blue-500 shrink-0">
          <div>
            <Logo className="w-[245px] h-9" />

            <div className="mt-[94px]">
              <h1 className="text-[22px] leading-[26.63px] text-white">
                Welcome to the Marketeq Talent Network, Where tech projects come
                to life!
              </h1>
              <h1 className="text-2xl mt-[30px] leading-[29.05px] font-bold text-white line-clamp-1">
                You control the agency...
              </h1>
            </div>
          </div>

          <MarketeqIcon1 className="absolute -bottom-[36.41px] left-[41.11px]" />

          <div className="flex items-start gap-y-5 flex-col relative">
            <p className="text-white text-sm font-medium">
              Don't have an account?
            </p>

            <div className="inline-block relative">
              <NextLink href="/sign-up">
              <Button
                className="text-white hover:bg-white/10 border-white/20"
                visual="gray"
                variant="outlined"
                size="lg"
              >
                Join Us For Free
              </Button>
              </NextLink>
              <svg
                className="size-[23px] absolute right-[15.33px] top-[34px] text-primary-500"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5955 2.21973C9.29477 -0.162931 5.28434 0.73532 4.42508 3.82574L0.744613 17.0629C-0.0339209 19.8629 2.59557 22.5434 5.50714 21.8913C6.71521 21.6207 7.65054 20.7109 8.62686 19.7017C10.1067 18.172 12.274 17.6503 14.3559 18.3132C14.4019 18.3279 14.4477 18.3425 14.4934 18.3571C15.9509 18.8218 17.2961 19.2508 18.5757 18.9642L19.049 18.8582C22.2152 18.149 23.3072 14.3487 21.0395 12.0001L11.5955 2.21973Z"
                  fill="currentColor"
                  fillOpacity="0.5"
                  stroke="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-auto grid place-content-center px-5 md:px-10 py-16">
          {twoFactorRequired ? (
            <div className="max-w-[400px] w-full mx-auto">
              <h1 className="text-center text-2xl leading-9 font-semibold text-dark-blue-400">
                Two-Factor Authentication
              </h1>
              <p className="text-center text-base mt-2 leading-[19.36px] font-light text-dark-blue-400">
                {useBackupCode
                  ? "Enter one of your backup codes"
                  : twoFactorMethod === "sms"
                    ? "We sent a verification code to your phone"
                    : "Enter the 6-digit code from your authenticator app"}
              </p>

              <div className="mt-10 space-y-6">
                {useBackupCode ? (
                  <div className="space-y-1.5">
                    <Label className="text-dark-blue-500" size="sm">
                      Backup Code
                    </Label>
                    <Input
                      placeholder="xxxx-xxxx"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={twoFactorCode[i] || ""}
                        onChange={(e) => {
                          const char = e.target.value
                          if (!/^\d?$/.test(char)) return
                          const arr = twoFactorCode.split("")
                          while (arr.length < 6) arr.push("")
                          arr[i] = char
                          const next = arr.join("").slice(0, 6)
                          setTwoFactorCode(next)
                          if (char && i < 5) {
                            const nextInput = e.target.parentElement?.children[
                              i + 1
                            ] as HTMLInputElement
                            nextInput?.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Backspace" &&
                            !twoFactorCode[i] &&
                            i > 0
                          ) {
                            const prevInput = (e.target as HTMLElement)
                              .parentElement?.children[
                              i - 1
                            ] as HTMLInputElement
                            prevInput?.focus()
                          }
                        }}
                        disabled={isVerifying2FA}
                        className="w-11 h-12 text-center text-lg font-semibold border border-gray-200 rounded-lg focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors disabled:opacity-50"
                      />
                    ))}
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={isVerifying2FA || twoFactorCode.length < 6}
                  onClick={handleVerify2FA}
                >
                  {isVerifying2FA ? (
                    <Spinner
                      size={24}
                      className="stroke-white"
                      trackClassName="stroke-primary-500"
                      strokeWidth={2}
                    />
                  ) : (
                    "Verify"
                  )}
                </Button>

                {twoFactorMethod === "sms" && !useBackupCode && (
                  <p className="text-sm text-center text-gray-500">
                    Not seeing the code?{" "}
                    {resendCooldown > 0 ? (
                      <span className="text-gray-400">
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendLoginCode}
                        className="text-primary-500 hover:underline font-medium"
                      >
                        Resend
                      </button>
                    )}
                  </p>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-primary-500 hover:underline"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode)
                      setTwoFactorCode("")
                    }}
                  >
                    {useBackupCode
                      ? twoFactorMethod === "sms"
                        ? "Use SMS code instead"
                        : "Use authenticator app instead"
                      : "Use a backup code"}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:underline"
                    onClick={() => {
                      setTwoFactorRequired(false)
                      setPartialToken("")
                      setTwoFactorCode("")
                      setUseBackupCode(false)
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-[560px]">
              <h1 className="md:text-left text-center text-2xl leading-9 font-semibold text-dark-blue-400">
                Welcome Changemakers!
              </h1>
              <p className="md:text-left text-center text-base mt-2 leading-[19.36px] font-light text-dark-blue-400">
                Login to your account below
              </p>

              <div className="grid md:grid-cols-2 mt-10 md:mt-[50px] gap-3 items-center">
                <GoogleLoginButton
                  onSuccess={(user) =>
                    router.push(redirectTarget ? nextRoute : resolveDashboardRoute(user))
                  }
                />

                <LinkedInLoginButton
                  onSuccess={(user) =>
                    router.push(redirectTarget ? nextRoute : resolveDashboardRoute(user))
                  }
                />
              </div>

              <div className="flex gap-x-[9px] mt-6 items-center">
                <span className="inline-block bg-[#E1E6EA] flex-auto h-px" />
                <span className="text-xs text-[#939DA7] leading-5 font-medium">
                  Or use your email
                </span>
                <span className="inline-block bg-[#E1E6EA] flex-auto h-px" />
              </div>

              <form className="mt-5 md:mt-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="flex flex-col gap-y-1.5">
                  <Label
                    className="text-dark-blue-500"
                    size="sm"
                    htmlFor="email"
                  >
                    Email
                  </Label>
                  <Input
                    placeholder="you@email.com"
                    id="email"
                    type="email"
                    {...register("email")}
                    isInvalid={hookFormHasError({
                      errors,
                      name: "email",
                    })}
                  />
                  <HookFormErrorMessage
                    errors={errors}
                    name="email"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>
                <div className="flex flex-col mt-5 gap-y-1.5">
                  <Label
                    className="text-dark-blue-500"
                    size="sm"
                    htmlFor="password"
                  >
                    Password
                  </Label>
                  <InputGroup>
                    <Input
                      placeholder="enter your password"
                      id="password"
                      type={isVisible ? "text" : "password"}
                      {...register("password")}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "password",
                      })}
                    />
                    <InputRightElement>
                      <button
                        className="focus-visible:outline-none"
                        onClick={toggleIsVisible}
                        type="button"
                      >
                        {isVisible ? (
                          <EyeOff className="size-4 text-gray-500" />
                        ) : (
                          <Eye className="size-4 text-gray-500" />
                        )}
                      </button>
                    </InputRightElement>
                  </InputGroup>
                  <HookFormErrorMessage
                    errors={errors}
                    name="password"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {loginError && (
                  <p className="mt-2 text-sm text-red-500">{loginError}</p>
                )}

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    <Controller
                      name="rememberMe"
                      control={control}
                      render={({ field: { value, onChange, ...field } }) => (
                        <Checkbox
                          id="remember-me"
                          checked={value}
                          onCheckedChange={onChange}
                          {...field}
                        />
                      )}
                    />
                    <Label
                      className="text-[#939DA7] font-normal"
                      htmlFor="remember-me"
                    >
                      Keep me signed in
                    </Label>
                  </div>

                  <NextLink href="/forgot-password">
                    <Button
                      className="font-normal text-[#939DA7]"
                      size="sm"
                      variant="link"
                      visual="gray"
                      type="button"
                    >
                      Forgot password
                    </Button>
                  </NextLink>
                </div>

                <Button
                  className="mt-5 xs:max-md:text-sm xs:max-md:py-2 xs:max-md:px-[14px] xs:max-md:h-9 md:mt-6 w-full"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner
                      size={24}
                      className="stroke-white"
                      trackClassName="stroke-primary-500"
                      strokeWidth={2}
                    />
                  ) : (
                    "Login to my account"
                  )}
                </Button>

                <div className="flex gap-x-1 mt-10 md:mt-[50px] items-center">
                  <span className="text-sm leading-6 text-[#68707B]">
                    Don't have an account?
                  </span>
                  <NextLink
                    href="/sign-up"
                    className="underline font-normal text-blue-500 text-sm leading-6"
                  >
                    Sign up
                  </NextLink>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </UnauthenticatedRoute>
  )
}
