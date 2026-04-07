"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthAPI } from "@/service/http/auth"
import { hookFormHasError } from "@/utils/functions"
import { Eye, EyeOff, Lock01 } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { useToggle } from "react-use"
import { z } from "zod"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Spinner } from "@/components/ui/spinner/spinner"
import {
  Button,
  ErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  useToast,
} from "@/components/ui"

const schema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

type FormValues = z.infer<typeof schema>

function ResetPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, toggleIsVisible] = useToggle(false)
  const [isConfirmVisible, toggleIsConfirmVisible] = useToggle(false)

  const token = searchParams?.get("token") ?? ""

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit: SubmitHandler<FormValues> = async ({ password }) => {
    if (!token) {
      toast({
        title: "Missing or invalid reset token",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      await AuthAPI.ResetPassword({ token, password })
      toast({ title: "Password reset successfully. Please sign in." })
      router.push("/sign-in")
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "Reset failed. Your link may have expired.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="px-5 md:px-[100px] h-[64px] flex items-center justify-between">
        <Link href="/">
          <MarketeqLogo />
        </Link>
        <div className="flex items-center gap-x-3">
          <Link href="/sign-in">
            <Button size="md" variant="ghost">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="md">Sign Up</Button>
          </Link>
        </div>
      </div>

      <div className="py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-[467px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]"
        >
          <h1 className="text-lg font-semibold text-dark-blue-400">
            Set a new password
          </h1>
          <p className="mt-2 text-sm leading-5 text-dark-blue-400">
            Choose a new password for your account. Your reset link expires
            after 15 minutes.
          </p>

          {!token && (
            <div className="mt-[30px] rounded-md border border-red-200 bg-red-50 p-4 text-sm text-dark-blue-400">
              Missing reset token. Please use the link from your email or{" "}
              <Link
                href="/forgot-password"
                className="underline font-semibold text-primary-500"
              >
                request a new one
              </Link>
              .
            </div>
          )}

          <div className="mt-[30px]">
            <Label htmlFor="password" size="sm">
              New password
            </Label>
            <InputGroup className="mt-1.5">
              <Input
                id="password"
                type={isVisible ? "text" : "password"}
                placeholder="Enter your new password"
                {...register("password")}
                isInvalid={hookFormHasError({ errors, name: "password" })}
              />
              <InputRightElement>
                <button
                  type="button"
                  className="focus-visible:outline-none"
                  onClick={toggleIsVisible}
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
                <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
              )}
            />
          </div>

          <div className="mt-5">
            <Label htmlFor="confirmPassword" size="sm">
              Confirm new password
            </Label>
            <InputGroup className="mt-1.5">
              <Input
                id="confirmPassword"
                type={isConfirmVisible ? "text" : "password"}
                placeholder="Re-enter your new password"
                {...register("confirmPassword")}
                isInvalid={hookFormHasError({
                  errors,
                  name: "confirmPassword",
                })}
              />
              <InputRightElement>
                <button
                  type="button"
                  className="focus-visible:outline-none"
                  onClick={toggleIsConfirmVisible}
                >
                  {isConfirmVisible ? (
                    <EyeOff className="size-4 text-gray-500" />
                  ) : (
                    <Eye className="size-4 text-gray-500" />
                  )}
                </button>
              </InputRightElement>
            </InputGroup>
            <HookFormErrorMessage
              errors={errors}
              name="confirmPassword"
              render={({ message }) => (
                <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
              )}
            />
          </div>

          <div className="mt-6 flex flex-col gap-y-3">
            <Button size="sm" disabled={isLoading || !token} type="submit">
              {isLoading ? (
                <Spinner
                  size={20}
                  className="stroke-white"
                  trackClassName="stroke-primary-500"
                  strokeWidth={2}
                />
              ) : (
                "Reset password"
              )}
            </Button>
          </div>
        </form>

        <div className="max-w-[467px] mt-10 3xl:mt-[50px] mx-auto px-5 md:px-[50px] w-full">
          <div className="flex items-center gap-x-2">
            <Lock01 className="size-5 text-primary-500" />
            <span className="text-sm font-bold leading-5 text-dark-blue-400">
              Security Tip
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-sm leading-5 text-dark-blue-400">
              Use a unique password you don't use on other sites. A mix of
              letters, numbers, and symbols makes it much harder to guess.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

export default ResetPassword
