"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthAPI } from "@/service/http/auth"
import { hookFormHasError } from "@/utils/functions"
import { ArrowLeft, Lock01 } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner/spinner"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Button, ErrorMessage, Input, Label, useToast } from "@/components/ui"

const schema = z.object({
  email: z
    .string()
    .min(1, "Please enter your email")
    .email("Please enter a valid email"),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPassword() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const onSubmit: SubmitHandler<FormValues> = async ({ email }) => {
    setIsLoading(true)
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined
      await AuthAPI.ForgotPassword({ email, redirectUrl })
      setSubmitted(true)
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "Something went wrong. Please try again.",
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
            Reset your password
          </h1>
          <p className="mt-2 text-sm leading-5 text-dark-blue-400">
            Enter the email address associated with your account and we'll send
            you a link to reset your password.
          </p>

          {submitted ? (
            <div className="mt-[30px] rounded-md border border-green-200 bg-green-50 p-4 text-sm text-dark-blue-400">
              If an account with that email exists, we've sent a password reset
              link. Please check your inbox.
            </div>
          ) : (
            <div className="mt-[30px]">
              <Label htmlFor="email" size="sm">
                Email
              </Label>
              <Input
                {...register("email")}
                isInvalid={hookFormHasError({ errors, name: "email" })}
                className="mt-1.5"
                id="email"
                type="email"
                placeholder="you@email.com"
              />
              <HookFormErrorMessage
                errors={errors}
                name="email"
                render={({ message }) => (
                  <ErrorMessage className="mt-1.5">{message}</ErrorMessage>
                )}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-y-3">
            {!submitted && (
              <Button size="sm" disabled={isLoading} type="submit">
                {isLoading ? (
                  <Spinner
                    size={20}
                    className="stroke-white"
                    trackClassName="stroke-primary-500"
                    strokeWidth={2}
                  />
                ) : (
                  "Send reset link"
                )}
              </Button>
            )}
            <Link href="/sign-in">
              <Button size="sm" variant="link" type="button" className="w-full">
                <ArrowLeft className="size-[15px]" /> Back to sign in
              </Button>
            </Link>
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
              Marketeq will never ask for your password over email. Always make
              sure you're on marketeq.com before entering your credentials.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
