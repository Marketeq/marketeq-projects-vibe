"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import UnauthenticatedRoute from "@/hoc/UnauthenticatedRoute"
import { AuthAPI } from "@/service/http/auth"
import { UserAPI } from "@/service/http/user"
import { containsOneLowerCaseLetter, hookFormHasError } from "@/utils/functions"
import { Eye, EyeOff } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import Cookies from "js-cookie"
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

export default function SignIn() {
  const router = useRouter()

  const { setUser } = useAuth()
  const { toast } = useToast()

  const [isVisible, toggleIsVisible] = useToggle(false)

  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })
  const onSubmit: SubmitHandler<SignInFormValues> = ({ email, password }) => {
    setIsLoading(true)

    AuthAPI.LoginWithEmail({ email, password })
      .then(async (response) => {
        if (response?.status === 200 && response?.data?.access_token) {
          Cookies.set("access_token", response?.data?.access_token)

          let nextUser = response?.data?.user
          if (!nextUser) {
            try {
              const meResponse = await UserAPI.me()
              if (meResponse?.status === 200) {
                nextUser =
                  meResponse?.data?.user ??
                  meResponse?.data?.data?.user ??
                  meResponse?.data
              }
            } catch {
              // noop: auth context will refresh user on load
            }
          }

          if (nextUser && typeof nextUser === "object") {
            setUser(nextUser)
          }

          router.push("/")
          reset()
        }
      })
      .catch((error) => {
        if (error?.response?.data?.errors?.message) {
          toast({
            title: error?.response?.data?.errors?.message,
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  // const onSubmit: SubmitHandler<SignInFormValues> = ({ email, password }) => {
  //   setIsLoading(true)

  //   AuthAPI.LoginWithEmail({ email, password })
  //     .then((response) => {
  //       if (
  //         response?.status === 200 &&
  //         response?.data?.access_token &&
  //         response?.data?.user
  //       ) {
  //         Cookies.set("access_token", response?.data?.access_token)
  //         setUser(response?.data?.user)

  //         router.push("/")
  //         reset()
  //       }
  //     })
  //     .catch((error) => {
  //       if (error?.response?.data?.errors?.message) {
  //         toast({
  //           title: error?.response?.data?.errors?.message,
  //           variant: "destructive",
  //         })
  //       }
  //     })
  //     .finally(() => {
  //       setIsLoading(false)
  //     })
  // }

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
            {/* <Button
              className="text-white"
              visual="gray"
              variant="outline"
              size="md"
            >
              Already have an account?
            </Button> */}
            <p className="text-white text-sm font-medium">
              Already have an account?
            </p>

            <div className="inline-block relative">
              <Button
                className="text-white hover:bg-white/10 border-white/20"
                visual="gray"
                variant="outlined"
                size="lg"
              >
                Sign In
              </Button>
              <svg
                className="size-[23px] absolute right-[15.33px] top-[34px] text-primary-500"
                viewBox="0 0 23 23"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5955 2.21973C9.29477 -0.162931 5.28434 0.73532 4.42508 3.82574L0.744613 17.0629C-0.0339209 19.8629 2.59557 22.5434 5.50714 21.8913C6.71521 21.6207 7.65054 20.7109 8.62686 19.7017C10.1067 18.172 12.274 17.6503 14.3559 18.3132C14.4019 18.3279 14.4477 18.3425 14.4934 18.3571C15.9509 18.8218 17.2961 19.2508 18.5757 18.9642L19.049 18.8582C22.2152 18.149 23.3072 14.3487 21.0395 12.0001L11.5955 2.21973Z"
                  fill="currentColor"
                  fill-opacity="0.5"
                  stroke="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-auto grid place-content-center px-5 md:px-10 py-16">
          <div className="max-w-[560px]">
            <h1 className="md:text-left text-center text-2xl leading-9 font-semibold text-dark-blue-400">
              Welcome Changemakers!
            </h1>
            <p className="md:text-left text-center text-base mt-2 leading-[19.36px] font-light text-dark-blue-400">
              Login to your account below
            </p>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-10 md:mt-[50px] grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUser({
                      id: "dev-client",
                      email: "client@marketeq.dev",
                      firstName: "Christopher",
                      lastName: "Torres",
                      role: "CLIENT" as any,
                      provider: "EMAIL" as any,
                      hasPassword: true,
                      emailVerified: true,
                      onboardingDismissed: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      deletedAt: null,
                    })
                    router.push("/client-dashboard")
                  }}
                  className="h-10 rounded-md border border-dashed border-gray-400 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Dev: Client Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUser({
                      id: "dev-talent",
                      email: "talent@marketeq.dev",
                      firstName: "Alex",
                      lastName: "Smith",
                      role: "TALENT" as any,
                      provider: "EMAIL" as any,
                      hasPassword: true,
                      emailVerified: true,
                      onboardingDismissed: true,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      deletedAt: null,
                    })
                    router.push("/talent-dashboard")
                  }}
                  className="h-10 rounded-md border border-dashed border-gray-400 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Dev: Talent Login
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-2 mt-4 gap-3 items-center">
              <GoogleLoginButton />

              <LinkedInLoginButton />
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
                <Label className="text-dark-blue-500" size="sm" htmlFor="email">
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
                    Remember me
                  </Label>
                </div>

                <Button
                  className="font-normal text-[#939DA7]"
                  size="sm"
                  variant="link"
                  visual="gray"
                  type="button"
                >
                  Forgot password
                </Button>
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
                  Don’t have an account?
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
        </div>
      </div>
    </UnauthenticatedRoute>
  )
}

