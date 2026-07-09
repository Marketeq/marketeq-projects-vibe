"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthAPI } from "@/service/http/auth"
import { hookFormHasError } from "@/utils/functions"
import { ArrowLeft, Lock01, Mail01 } from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner/spinner"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Button, ErrorMessage, Input, Label, useToast } from "@/components/ui"

const SENT_EMAIL_STORAGE_KEY = "forgotPasswordEmail"

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email")
    .email("Please enter a valid email"),
})

type FormValues = z.infer<typeof schema>

function ForgotPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sentEmail, setSentEmail] = useState("")

  useEffect(() => {
    if (searchParams?.get("sent") !== "1") return
    const storedEmail =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(SENT_EMAIL_STORAGE_KEY)
        : null
    if (storedEmail) {
      setSentEmail(storedEmail)
      setSubmitted(true)
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
    mode: "onChange",
  })

  const requestReset = async (email: string) => {
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined
    await AuthAPI.ForgotPassword({ email, redirectUrl })
  }

  const onSubmit: SubmitHandler<FormValues> = async ({ email }) => {
    setIsLoading(true)
    try {
      await requestReset(email)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SENT_EMAIL_STORAGE_KEY, email)
      }
      setSentEmail(email)
      setSubmitted(true)
      router.replace("/forgot-password?sent=1")
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

  const handleResend = async () => {
    if (!sentEmail) return
    setIsResending(true)
    try {
      await requestReset(sentEmail)
      toast({ title: "Magic link resent. Please check your inbox." })
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleBack = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SENT_EMAIL_STORAGE_KEY)
    }
    setSubmitted(false)
    setSentEmail("")
    router.replace("/forgot-password")
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
        {submitted ? (
          <div className="max-w-[467px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)] text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-50">
              <Mail01 className="size-6 text-primary-500" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-dark-blue-400">
              Magic link sent!
            </h1>
            <p className="mt-2 text-sm leading-5 text-dark-blue-400">
              We sent a magic link to the email{" "}
              <span className="font-semibold">{sentEmail}</span>.
              <br />
              The link will expire in <span className="font-semibold">24 hours</span>.
            </p>

            <div className="mt-6 flex flex-col items-center gap-y-3">
              <Button
                size="sm"
                disabled={isResending}
                onClick={handleResend}
                type="button"
              >
                {isResending ? (
                  <Spinner
                    size={20}
                    className="stroke-white"
                    trackClassName="stroke-primary-500"
                    strokeWidth={2}
                  />
                ) : (
                  "Resend Link"
                )}
              </Button>
              <Button
                size="sm"
                variant="link"
                type="button"
                onClick={handleBack}
              >
                <ArrowLeft className="size-[15px]" /> Back
              </Button>
            </div>

            <p className="mt-5 text-sm leading-5 text-dark-blue-400">
              Still having trouble?{" "}
              <Link
                href="mailto:support@marketeqdigital.com"
                className="underline font-semibold text-primary-500"
              >
                Start account recovery
              </Link>
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="max-w-[467px] w-full mx-auto p-5 md:p-[50px] bg-white border rounded-xl border-gray-100 shadow-[0px_32px_64px_-12px_rgba(16,24,40,.05)]"
          >
            <h1 className="text-lg font-semibold text-dark-blue-400">
              Reset your password
            </h1>
            <p className="mt-2 text-sm leading-5 text-dark-blue-400">
              Enter your email address below in order to reset your password.
            </p>

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

            <div className="mt-6 flex flex-col gap-y-3">
              <Button size="sm" disabled={isLoading || !isValid} type="submit">
                {isLoading ? (
                  <Spinner
                    size={20}
                    className="stroke-white"
                    trackClassName="stroke-primary-500"
                    strokeWidth={2}
                  />
                ) : (
                  "Continue"
                )}
              </Button>
              <Link href="/sign-in">
                <Button size="sm" variant="link" type="button" className="w-full">
                  <ArrowLeft className="size-[15px]" /> Back
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-sm leading-5 text-dark-blue-400">
              Still having trouble?{" "}
              <Link
                href="mailto:support@marketeqdigital.com"
                className="underline font-semibold text-primary-500"
              >
                Start account recovery
              </Link>
            </p>
          </form>
        )}

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

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  )
}
