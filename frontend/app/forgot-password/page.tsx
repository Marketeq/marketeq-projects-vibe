"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthAPI } from "@/service/http/auth"
import { cn, hookFormHasError } from "@/utils/functions"
import {
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  Lock01,
  Mail01,
  MessageDotsSquare,
  Phone,
  Send01,
  Smartphone,
} from "@blend-metrics/icons"
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { Spinner } from "@/components/ui/spinner/spinner"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  ErrorMessage,
  Input,
  Label,
  useToast,
} from "@/components/ui"
import { MagicLinkSentShowcase } from "@/components/magic-link-sent-showcase"
import { AccountNotFoundShowcase } from "@/components/account-not-found-showcaset"

const SENT_EMAIL_STORAGE_KEY = "forgotPasswordEmail"
const ACCOUNT_FOUND_STORAGE_KEY = "forgotPasswordAccountFound"

/**
 * The five ways back into an account, in Figma order.
 *
 * The icons are not interchangeable: the Figma pins each one's inset inside its
 * 44px box (Smartphone at 20.83% left/right because it is narrow and tall,
 * HelpCircle at a uniform 8.33% because it is a circle), which is what fixes
 * this particular set rather than any similar-looking alternative.
 */
const RECOVERY_OPTIONS = [
  { id: "phone", label: "Phone Verification", icon: Phone },
  { id: "email", label: "Email Verification", icon: Mail01 },
  { id: "questions", label: "Security Questions", icon: HelpCircle },
  { id: "authenticator", label: "App Authenticator", icon: Smartphone },
  { id: "support", label: "Contact Support", icon: MessageDotsSquare },
] as const

type RecoveryOptionId = (typeof RECOVERY_OPTIONS)[number]["id"]

/**
 * Renders jane@gmail.com as J***e@gmail.com.
 *
 * The run of stars is fixed at three rather than matching the hidden length, so
 * the mask does not leak how long the local part is. A local part of one or two
 * characters has no middle to hide, so it is starred whole rather than being
 * shown almost in full.
 */
const maskEmail = (email: string) => {
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf("@")
  if (at < 1) return trimmed

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at)

  if (local.length <= 2) return `${"*".repeat(local.length)}${domain}`
  return `${local[0]}***${local[local.length - 1]}${domain}`
}

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
  const [accountFound, setAccountFound] = useState(true)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [isEmailVerificationOpen, setIsEmailVerificationOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [isSendingRecoveryLink, setIsSendingRecoveryLink] = useState(false)

  // Both recovery modals are drawn on an empty page: the reset form and the
  // security tip behind them would otherwise show through the transparent
  // overlay. Hidden with visibility rather than unmounted, because the trigger
  // lives inside this subtree and Radix restores focus to it on close. The
  // dialogs themselves are portalled to document.body, so they stay visible.
  const isRecoveryFlowOpen = isRecoveryOpen || isEmailVerificationOpen

  useEffect(() => {
    if (searchParams?.get("sent") !== "1") return
    const storedEmail =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(SENT_EMAIL_STORAGE_KEY)
        : null
    if (storedEmail) {
      setSentEmail(storedEmail)
      setAccountFound(
        window.sessionStorage.getItem(ACCOUNT_FOUND_STORAGE_KEY) !== "0",
      )
      setSubmitted(true)
    }
  }, [searchParams])

  const {
    register,
    handleSubmit,
    watch,
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
    const response = await AuthAPI.ForgotPassword({ email, redirectUrl })
    return Boolean(response?.data?.accountFound)
  }

  const onSubmit: SubmitHandler<FormValues> = async ({ email }) => {
    setIsLoading(true)
    try {
      const found = await requestReset(email)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SENT_EMAIL_STORAGE_KEY, email)
        window.sessionStorage.setItem(
          ACCOUNT_FOUND_STORAGE_KEY,
          found ? "1" : "0",
        )
      }
      setSentEmail(email)
      setAccountFound(found)
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

  /**
   * Sends the magic link for the recovery flow. Separate from handleResend,
   * which is bound to the address that was already submitted through the form;
   * here the address is whatever is sitting in the email field, because
   * recovery can be started before the form has ever been submitted.
   */
  const sendRecoveryLink = async (email: string) => {
    setIsSendingRecoveryLink(true)
    try {
      await requestReset(email)
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.errors?.message ??
          error?.response?.data?.message ??
          "We could not send that link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingRecoveryLink(false)
    }
  }

  const handleRecoverySelect = (id: RecoveryOptionId) => {
    // Email verification is the only one of the five with a screen so far.
    if (id !== "email") return

    const email = watch("email").trim()
    if (!email) {
      toast({
        title: "Enter your email address first, then start account recovery.",
        variant: "destructive",
      })
      return
    }

    // Held in state rather than read from the field again, so the address the
    // modal names stays the one the link was actually sent to.
    setRecoveryEmail(email)
    setIsRecoveryOpen(false)
    setIsEmailVerificationOpen(true)
    void sendRecoveryLink(email)
  }

  const handleResend = async () => {
    if (!sentEmail) return
    setIsResending(true)
    try {
      const found = await requestReset(sentEmail)
      setAccountFound(found)
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          ACCOUNT_FOUND_STORAGE_KEY,
          found ? "1" : "0",
        )
      }
      toast({
        title: found
          ? "Magic link resent. Please check your inbox."
          : "No account found for this email.",
      })
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
      window.sessionStorage.removeItem(ACCOUNT_FOUND_STORAGE_KEY)
    }
    setSubmitted(false)
    setSentEmail("")
    setAccountFound(true)
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

      <div
        className={cn(
          "py-10 px-5 md:p-10 3xl:px-[120px] 3xl:py-[50px]",
          isRecoveryFlowOpen && "invisible"
        )}
      >
        {submitted ? (
          accountFound ? (
            <MagicLinkSentShowcase
              email={sentEmail}
              onResend={handleResend}
              goBack={handleBack}
              isResending={isResending}
            />
          ) : (
            <AccountNotFoundShowcase email={sentEmail} goBack={handleBack} />
          )
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
              <Dialog open={isRecoveryOpen} onOpenChange={setIsRecoveryOpen}>
                {/* Radix renders the trigger as a real button; type is set
                    explicitly because this one sits inside the reset form and
                    a default submit would fire it. */}
                <DialogTrigger
                  type="button"
                  className="underline font-semibold text-primary-500"
                >
                  Start account recovery
                </DialogTrigger>

                {/* Figma draws this 650x580 with 50px padding. It is scaled up
                    to 700x630 by widening the padding to 75px, which leaves the
                    content box at exactly 550px -- the width every row is drawn
                    at -- so the rows themselves are untouched and only the frame
                    grows. The extra height is what keeps the reset-password card
                    behind from peeking over the top edge, since the overlay is
                    transparent and the dialog is centred vertically.
                    No close button: the Figma ships one but sets it to
                    display:none. */}
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[630px] w-[700px] max-w-[700px] flex-col items-start gap-6 rounded-xl border border-gray-200 bg-white p-[75px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-start gap-2">
                    <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                      Account Recovery
                    </DialogTitle>
                    <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                      Choose a way to verify your identity. We&apos;ll use it to
                      confirm it&apos;s you before restoring access to your
                      account.
                    </DialogDescription>
                  </div>

                  <div className="flex w-full flex-col items-start gap-2.5">
                    {RECOVERY_OPTIONS.map(({ id, label, icon: Icon }) => (
                      <Button
                        key={id}
                        type="button"
                        onClick={() => handleRecoverySelect(id)}
                        variant="ghost"
                        visual="gray"
                        size="sm"
                        className="flex h-[68px] w-full items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                      >
                        <span className="flex items-center gap-x-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                            <Icon className="size-5 text-primary-500" />
                          </span>
                          <span className="text-sm font-medium leading-[17px] text-dark-blue-400">
                            {label}
                          </span>
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-[5px]">
                          <ChevronRight className="size-5 text-gray-500" />
                        </span>
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Email verification. 484x372 with 50px padding leaves the 384px
                  content column the Figma draws. The three stacked children are
                  content / Resend / Back at a 32px gap:
                  152 + 32 + 36 + 32 + 20 + 100 padding = 372. */}
              <Dialog
                open={isEmailVerificationOpen}
                onOpenChange={setIsEmailVerificationOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[372px] w-[484px] max-w-[484px] flex-col items-center justify-center gap-8 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-[384px] flex-col items-center gap-5">
                    {/* 48px outer including the 8px ring, so the glyph sits in
                        a 32px well. border-box is what keeps it at 48. */}
                    <span className="box-border flex size-12 shrink-0 items-center justify-center rounded-[28px] border-8 border-primary-25 bg-primary-50">
                      <Mail01 className="size-6 text-primary-500" />
                    </span>

                    <div className="flex w-full flex-col items-center gap-2">
                      <DialogTitle className="w-full text-center text-lg font-semibold leading-7 text-dark-blue-400">
                        Please check your email
                      </DialogTitle>
                      <DialogDescription className="w-full text-center text-sm leading-5 text-gray-500">
                        We sent a magic link to the email{" "}
                        <span className="font-semibold">
                          {maskEmail(recoveryEmail)}.
                        </span>
                      </DialogDescription>
                      <p className="w-full text-center text-sm leading-5 text-gray-500">
                        The link will expire in{" "}
                        <span className="font-semibold">24 hours</span>.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isSendingRecoveryLink}
                    onClick={() => void sendRecoveryLink(recoveryEmail)}
                  >
                    <Send01 className="size-[15px]" />
                    {isSendingRecoveryLink ? "Sending..." : "Resend Link"}
                  </Button>

                  {/* The Figma draws Back as bare 14/20 text, not a 36px
                      button, so the size-sm box and padding are cleared. */}
                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    className="h-5 p-0"
                    onClick={() => setIsEmailVerificationOpen(false)}
                  >
                    Back
                  </Button>
                </DialogContent>
              </Dialog>
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
              sure you're on marketeqdigital.com before entering your credentials.
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
