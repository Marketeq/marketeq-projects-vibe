"use client"

import { Fragment, Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
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
  Checkbox,
  ErrorMessage,
  Input,
  InputGroup,
  InputRightElement,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SixDigitPinInput,
  Textarea,
  useToast,
} from "@/components/ui"
import {
  PhoneNumberInput,
  isPhoneValid,
} from "@/components/phone-number-input"
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
 * The address the page's original `mailto:` link used. Email Us now opens a
 * form instead, per the Figma, so this is only quoted in the fallbacks that
 * tell someone where to write while that form has no backend.
 */
const SUPPORT_EMAIL = "support@marketeqdigital.com"

/**
 * Figma order and labels. Rendered as one row of two plus three full-width
 * fields: 263 + 24 + 263 = 550, and the column is 70 + 24 + 70 + 24 + 70 + 24
 * + 214 = 496.
 */
const SUPPORT_MESSAGE_FIELDS = [
  { id: "firstName", label: "First Name", placeholder: "John" },
  { id: "lastName", label: "Last Name", placeholder: "Doe" },
  { id: "email", label: "Your Email", placeholder: "you@you.com" },
  { id: "subject", label: "Subject", placeholder: "Email subject line" },
] as const

/**
 * PLACEHOLDER. This is the number drawn in the Figma, not a real one -- there
 * is no support number anywhere in this repo. It renders as plain text rather
 * than a `tel:` link, which is what the Figma specifies and also means nobody
 * can dial it by accident. **Must be replaced or the row removed before this
 * reaches anyone.** See docs/ACCOUNT_RECOVERY_NOTES.md §4.5.
 */
const SUPPORT_PHONE_PLACEHOLDER = "+1 (123) 555-1212"

/**
 * Rows are the same 68px control the Account Recovery chooser uses -- the two
 * Figmas specify it identically (12px padding, 44px icon box at 1.5px, 20px
 * primary-500 glyph, 32px chevron), so the markup is shared rather than
 * re-derived.
 */
const SUPPORT_OPTIONS = [
  { id: "call", label: "Call Us", icon: Phone },
  { id: "email", label: "Email Us", icon: Mail01 },
  // The Figma repeats row 2's envelope here. Read as a slip and drawn with a
  // calendar instead -- see the deviations list in the notes.
  { id: "schedule", label: "Schedule a Call", icon: Calendar },
  { id: "chat", label: "Live Chat", icon: Smartphone },
] as const

type SupportOptionId = (typeof SUPPORT_OPTIONS)[number]["id"]

/** Which of the two support routes reached the shared 371x258 confirmation. */
type SupportSentKind = "message" | "call"

/**
 * Figma order and labels for Schedule a Call. Name, Email and Phone Number are
 * full width; the two preferences share a row: 263 + 24 + 263 = 550, and the
 * column is 70 + 24 + 70 + 24 + 70 + 24 + 70 = 352.
 */
const SCHEDULE_TEXT_FIELDS = [
  { id: "name", label: "Name", placeholder: "John Doe" },
  { id: "email", label: "Email", placeholder: "you@me.com" },
] as const

/**
 * Kept identical to the list Settings > Account Recovery offers, so a person is
 * asked here exactly what they were asked when they set the answers. Duplicated
 * rather than imported because the Settings copy lives inside a page component;
 * the two must be moved to one shared module once this gains a backend.
 */
const SECURITY_QUESTIONS = [
  "What is the name of your first pet?",
  "What was the name of your first school?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What is your favourite book?",
]

/**
 * The two ways the flow can end. Both land on the same 420x490 confirmation
 * screen; only the wording differs, because only the wording differs in the
 * Figma. The session options and the button are shared.
 */
type ConfirmationKind = "password" | "authenticated"

const CONFIRMATION_COPY: Record<
  ConfirmationKind,
  { title: string; description: string }
> = {
  password: {
    title: "Your password has been successfully updated!",
    description:
      "You can sign in with your new password from now on. Choose what should happen to sessions already open on your other devices.",
  },
  authenticated: {
    title: "You have been successfully authenticated!",
    description:
      "We matched the code from your authenticator app. Choose what should happen to sessions already open on your other devices.",
  },
}

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
  const [isSecurityQuestionsOpen, setIsSecurityQuestionsOpen] = useState(false)
  const [securityAnswers, setSecurityAnswers] = useState([
    { question: "", answer: "" },
    { question: "", answer: "" },
  ])
  // Errors appear per field once it has been left, not on mount -- the Figma
  // shows Submit disabled alongside the errors, so a submit attempt cannot be
  // what reveals them.
  const [touchedSecurityFields, setTouchedSecurityFields] = useState<
    Record<string, boolean>
  >({})
  const [isAuthenticatorOpen, setIsAuthenticatorOpen] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [isCallUsOpen, setIsCallUsOpen] = useState(false)
  const [isEmailUsOpen, setIsEmailUsOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    email: "",
    phone: "",
    date: "",
    time: "",
  })
  // Same 371x258 screen as the message confirmation -- the two Figmas are
  // identical bar the wording, so it is parameterised rather than duplicated.
  const [isSupportSentOpen, setIsSupportSentOpen] = useState(false)
  const [supportSentKind, setSupportSentKind] =
    useState<SupportSentKind>("message")
  const [supportMessage, setSupportMessage] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isUpdatePasswordOpen, setIsUpdatePasswordOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  // One confirmation screen serves both terminals. The Figma draws 420x490
  // twice with identical geometry, icon, option rows and button -- only the
  // heading and supporting text change -- so it is parameterised rather than
  // duplicated, which is what would let the two drift apart.
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [confirmationKind, setConfirmationKind] =
    useState<ConfirmationKind>("password")
  const [sessionChoice, setSessionChoice] = useState("stay")

  // Both recovery modals are drawn on an empty page: the reset form and the
  // security tip behind them would otherwise show through the transparent
  // overlay. Hidden with visibility rather than unmounted, because the trigger
  // lives inside this subtree and Radix restores focus to it on close. The
  // dialogs themselves are portalled to document.body, so they stay visible.
  const isRecoveryFlowOpen =
    isRecoveryOpen ||
    isEmailVerificationOpen ||
    isSecurityQuestionsOpen ||
    isAuthenticatorOpen ||
    isSupportOpen ||
    isCallUsOpen ||
    isEmailUsOpen ||
    isScheduleOpen ||
    isSupportSentOpen ||
    isUpdatePasswordOpen ||
    isConfirmationOpen

  const updateSecurityAnswer = (
    index: number,
    field: "question" | "answer",
    value: string
  ) =>
    setSecurityAnswers((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry))
    )

  // Both a question and a non-blank answer on every row, matching the rule
  // Settings uses to gate its own save.
  const canSubmitSecurityAnswers = securityAnswers.every(
    (entry) => entry.question !== "" && entry.answer.trim() !== ""
  )

  // The Figma lays the rules out in two columns -- three on the left, two on
  // the right -- rather than wrapping one list, so they are declared that way.
  const passwordRuleColumns = [
    [
      {
        label: "At least 8 characters",
        met: containsNumberOfChars({ value: newPassword, numberOfChars: 8 }),
      },
      {
        label: "One lowercase letter",
        met: containsOneLowerCaseLetter(newPassword),
      },
      {
        label: "One uppercase letter",
        met: containsOneUpperCaseLetter(newPassword),
      },
    ],
    [
      { label: "One number", met: containsOneNumber(newPassword) },
      { label: "One symbol", met: containsOneSymbol(newPassword) },
    ],
  ]

  const canSavePassword =
    passwordRuleColumns.flat().every((rule) => rule.met) &&
    newPassword === confirmPassword

  const touchSecurityField = (index: number, field: "question" | "answer") =>
    setTouchedSecurityFields((prev) => ({ ...prev, [`${index}-${field}`]: true }))

  const securityFieldError = (index: number, field: "question" | "answer") => {
    if (!touchedSecurityFields[`${index}-${field}`]) return false
    const value = securityAnswers[index][field]
    return field === "question" ? value === "" : value.trim() === ""
  }

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
    if (id === "questions") {
      setIsRecoveryOpen(false)
      setIsSecurityQuestionsOpen(true)
      return
    }

    // Support is reachable without knowing who you are, so it branches before
    // the address check the account-bound routes need.
    if (id === "support") {
      setIsRecoveryOpen(false)
      setIsSupportOpen(true)
      return
    }

    // Phone has no screen yet.
    if (id !== "email" && id !== "authenticator") return

    // Both remaining routes are tied to an account, so the address is required
    // before either can start. The authenticator needs it for the same reason
    // the emailed link does: the code only means anything against a known
    // user's TOTP secret.
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

    if (id === "authenticator") {
      setIsAuthenticatorOpen(true)
      return
    }

    setIsEmailVerificationOpen(true)
    void sendRecoveryLink(email)
  }

  /**
   * Advances to Update Password.
   *
   * The answers are NOT checked, because there is nothing to check them
   * against: security questions have no entity, no endpoint and no client API
   * on either side of the stack. This moves the flow on so the screens can be
   * reviewed end to end; it is not a verification.
   *
   * Once POST /auth/recovery/security-questions/verify exists this must call
   * it, keep the proof it returns, and open the next step only on a pass.
   * See docs/ACCOUNT_RECOVERY_NOTES.md.
   */
  const handleSecurityAnswersSubmit = () => {
    setIsSecurityQuestionsOpen(false)
    setIsUpdatePasswordOpen(true)
  }

  /**
   * Advances straight to the confirmation screen.
   *
   * This route does NOT pass through Update Password: the Figma ends the
   * authenticator path at "You have been successfully authenticated!" with
   * Continue to Dashboard, so proving the code is treated as regaining access
   * rather than as authorising a password change. Security questions still go
   * via Update Password.
   *
   * The code is NOT checked, and cannot be from here. Verifying it means
   * POSTing the six digits plus recoveryEmail to a route that loads that
   * user's TOTP secret and validates the window; auth-service exposes
   * /auth/2fa/verify, but it requires a partialToken from a completed login,
   * which nobody holds in a forgotten-password flow. So there is no endpoint
   * this screen can call yet.
   *
   * Worse, the digits are unreadable on the client too: SixDigitPinInput owns
   * its zag machine internally and exposes no value callback, so Submit cannot
   * even be gated on six digits being present. It stays enabled deliberately.
   *
   * See docs/ACCOUNT_RECOVERY_NOTES.md.
   */
  /**
   * Email Us is wired directly as a `mailto:` rather than going through here --
   * it is the address the page's original support link used, so keeping it
   * working is what stops this flow being a regression on what it replaced.
   *
   * Call Us has a screen, but the number on it is a placeholder.
   *
   * Schedule a Call and Live Chat need a scheduling integration and a chat
   * provider respectively; neither exists in this repo, so they say so. A toast
   * is a placeholder, not a design, and the copy is invented like the rest.
   */
  const handleSupportSelect = (id: SupportOptionId, label: string) => {
    if (id === "call") {
      setIsSupportOpen(false)
      setIsCallUsOpen(true)
      return
    }

    if (id === "email") {
      setIsSupportOpen(false)
      setIsEmailUsOpen(true)
      return
    }

    if (id === "schedule") {
      setIsSupportOpen(false)
      setIsScheduleOpen(true)
      return
    }

    toast({
      title: `${label} is not connected yet. Email ${SUPPORT_EMAIL} and the team will pick it up.`,
    })
  }

  const updateSupportMessage = (
    field: keyof typeof supportMessage,
    value: string
  ) => setSupportMessage((prev) => ({ ...prev, [field]: value }))

  // Every field is required and the address has to parse. Unlike the
  // authenticator's Submit, this one really can be gated -- these are our own
  // inputs, so the Figma's disabled state is reproduced rather than skipped.
  const canSendSupportMessage =
    supportMessage.firstName.trim() !== "" &&
    supportMessage.lastName.trim() !== "" &&
    supportMessage.subject.trim() !== "" &&
    supportMessage.message.trim() !== "" &&
    z.string().email().safeParse(supportMessage.email.trim()).success

  /**
   * Hands the message to the person's own mail client, addressed to
   * SUPPORT_EMAIL and prefilled from the form.
   *
   * This is a HANDOFF, not a server send. There is no support-ticket endpoint
   * anywhere in the backend -- searched `contact`, `contactUs`, `support-ticket`
   * and every POST route; nothing exists -- and a server send would need the
   * Brevo config that §3 is already blocked on. A `mailto:` is the only route
   * that actually reaches the address today.
   *
   * The consequence worth knowing: the confirmation screen opens as soon as the
   * client is handed the draft, so it can say thank you for a message the
   * person then abandons in their drafts. Replace both halves with a real
   * endpoint when one exists. See docs/ACCOUNT_RECOVERY_NOTES.md.
   */
  const handleSupportMessageSubmit = () => {
    const { firstName, lastName, email, subject, message } = supportMessage

    // The form collects a name and a reply-to that a bare mailto body would
    // otherwise lose -- the client sends from whatever account it is signed
    // into, which is not necessarily the address typed here.
    const body = [
      `From: ${firstName.trim()} ${lastName.trim()}`,
      `Reply to: ${email.trim()}`,
      "",
      message.trim(),
    ].join("\n")

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject.trim()
    )}&body=${encodeURIComponent(body)}`

    setIsEmailUsOpen(false)
    setSupportSentKind("message")
    setIsSupportSentOpen(true)
  }

  const updateScheduleForm = (
    field: keyof typeof scheduleForm,
    value: string
  ) => setScheduleForm((prev) => ({ ...prev, [field]: value }))

  // isPhoneValid comes from the same design-system module as the input, so the
  // rule here is the one Settings already enforces rather than a second guess.
  const canScheduleCall =
    scheduleForm.name.trim() !== "" &&
    scheduleForm.date.trim() !== "" &&
    scheduleForm.time.trim() !== "" &&
    isPhoneValid(scheduleForm.phone) &&
    z.string().email().safeParse(scheduleForm.email.trim()).success

  /**
   * NOT WIRED, and unlike Email Us there is no `mailto:` fallback that would
   * make sense -- a booking has to land in a calendar, not an inbox.
   *
   * `scheduling-service` (:3024) exists but exposes nothing for unauthenticated
   * support booking, so there is no endpoint to call. Nothing is reserved and
   * no one is told. The confirmation screen this opens therefore states a call
   * is booked when none is: the same class of untruth as the password screen in
   * §4.2, and it must not reach real users. See docs/ACCOUNT_RECOVERY_NOTES.md.
   */
  const handleScheduleSubmit = () => {
    setIsScheduleOpen(false)
    setSupportSentKind("call")
    setIsSupportSentOpen(true)
  }

  const handleAuthenticatorSubmit = () => {
    setIsAuthenticatorOpen(false)
    setConfirmationKind("authenticated")
    setIsConfirmationOpen(true)
  }

  /**
   * Advances to the confirmation screen.
   *
   * NOTHING IS PERSISTED. The password is not changed: every write path into
   * resetPassword needs a token proving identity, and the security-question
   * route issues none, so there is nothing to authorise the change with. This
   * exists so the flow can be walked end to end while the backend is built.
   * See docs/ACCOUNT_RECOVERY_NOTES.md for the endpoints this is waiting on.
   */
  /**
   * NOT WIRED. sessionChoice is collected and discarded: signing other devices
   * out means calling AuthAPI.RevokeAllOtherSessions, which needs a session
   * this unauthenticated flow does not have. Sends the person to sign in, which
   * is the only honest destination while the password was never actually
   * changed.
   */
  const handleContinueToDashboard = () => {
    setIsConfirmationOpen(false)
    router.push("/sign-in")
  }

  const handleUpdatePasswordSubmit = () => {
    setIsUpdatePasswordOpen(false)
    setConfirmationKind("password")
    setIsConfirmationOpen(true)
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
                        variant="outlined"
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

              {/* Security questions. Figma: 650x646 with 50px padding and a
                  50px gap, so the 550px column is 76 (heading) + 32 + 352
                  (fields) = 460, then 50 + 36 (buttons) + 50 to reach 646.
                  Two pairs come to exactly 4*70 + 3*24 = 352, so the field area
                  fills its box with nothing cut off. The Figma draws a third
                  pair and a scrollbar; it was dropped deliberately. The box
                  still scrolls when validation messages grow the fields. */}
              <Dialog
                open={isSecurityQuestionsOpen}
                onOpenChange={setIsSecurityQuestionsOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-auto max-h-[calc(100vh-4rem)] min-h-[646px] w-[650px] max-w-[650px] flex-col items-center justify-center gap-[50px] rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-start gap-8">
                    <div className="flex w-full flex-col items-start gap-2">
                      <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                        Security Questions
                      </DialogTitle>
                      <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                        Answer the questions you chose when you set up your
                        account, exactly as you answered them then.
                      </DialogDescription>
                    </div>

                    {/* The dropdown is Select, not Listbox: Listbox renders its
                        options inline and they are clipped by this scroll
                        container, which is the bug this same modal hit in
                        Settings. SelectContent is portalled. */}
                    <div className="flex min-h-0 w-full flex-1 flex-col items-start gap-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                      {securityAnswers.map((entry, index) => {
                        const questionInvalid = securityFieldError(index, "question")
                        const answerInvalid = securityFieldError(index, "answer")

                        return (
                          <Fragment key={index}>
                            <div className="flex w-full flex-col items-start gap-1.5">
                              <Label size="sm" className="text-dark-blue-400">
                                Security Question {index + 1}
                              </Label>
                              <Select
                                value={entry.question || undefined}
                                onValueChange={(value) => {
                                  updateSecurityAnswer(index, "question", value)
                                  touchSecurityField(index, "question")
                                }}
                                onOpenChange={(open) => {
                                  if (!open) touchSecurityField(index, "question")
                                }}
                              >
                                {/* In error the Figma swaps the chevron for a
                                    16px error-500 alert, so the indicator is
                                    dropped rather than shown alongside it. */}
                                <SelectTrigger
                                  invalid={questionInvalid}
                                  indicator={!questionInvalid}
                                  className={cn(
                                    "w-full text-base text-dark-blue-400 shadow-xs [&_svg]:size-4 [&_svg]:text-gray-400",
                                    questionInvalid && "border-error-300"
                                  )}
                                >
                                  <SelectValue placeholder="Select question" />
                                  {questionInvalid && (
                                    <AlertCircle className="size-4 shrink-0 !text-error-500" />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {SECURITY_QUESTIONS.map((question) => (
                                    <SelectItem key={question} value={question}>
                                      {question}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {questionInvalid && (
                                <ErrorMessage>
                                  Please enter your security question.
                                </ErrorMessage>
                              )}
                            </div>

                            <div className="flex w-full flex-col items-start gap-1.5">
                              <Label size="sm" className="text-dark-blue-400">
                                Your Answer
                              </Label>
                              <InputGroup className="w-full">
                                <Input
                                  placeholder="Enter your answer here"
                                  value={entry.answer}
                                  isInvalid={answerInvalid}
                                  className={cn(
                                    "text-dark-blue-400",
                                    answerInvalid && "pr-9"
                                  )}
                                  onChange={(e) =>
                                    updateSecurityAnswer(
                                      index,
                                      "answer",
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => touchSecurityField(index, "answer")}
                                />
                                {answerInvalid && (
                                  <InputRightElement>
                                    <AlertCircle className="size-4 text-error-500" />
                                  </InputRightElement>
                                )}
                              </InputGroup>
                              {answerInvalid && (
                                <ErrorMessage>
                                  Please enter your answer.
                                </ErrorMessage>
                              )}
                            </div>
                          </Fragment>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => {
                        setIsSecurityQuestionsOpen(false)
                        setIsRecoveryOpen(true)
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canSubmitSecurityAnswers}
                      onClick={handleSecurityAnswersSubmit}
                    >
                      <Check className="size-[15px]" />
                      Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* App authenticator. Figma: 680x444, 50px padding, 32px gap.
                  The buttons row is a sibling of the content column, not part
                  of it, so the 580px column is 76 (heading) + 32 + 56
                  (code label) + 32 + 80 (inputs) = 276, then
                  50 + 276 + 32 + 36 + 50 = 444.
                  The input row is exactly 580 too: 6*80 + 28 (separator)
                  + 6*12 = 580, which is why the gap is overridden to 12px.
                  Border is gray-100 here, not the gray-200 the other modals
                  use -- the Figma specifies #F2F4F7. */}
              <Dialog
                open={isAuthenticatorOpen}
                onOpenChange={setIsAuthenticatorOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[444px] w-[680px] max-w-[680px] flex-col items-center justify-center gap-8 rounded-xl border border-gray-100 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-start gap-8">
                    <div className="flex w-full flex-col items-start gap-2">
                      <DialogTitle className="w-full text-lg font-semibold leading-7 text-gray-black">
                        App Authenticator
                      </DialogTitle>
                      <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                        Open the authenticator app you paired with this account
                        and enter the six digit code it is showing.
                      </DialogDescription>
                    </div>

                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="w-full text-sm font-semibold leading-7 text-gray-black">
                        Enter the Verification Code
                      </span>
                      <span className="w-full text-sm leading-5 text-gray-500">
                        Type the verification code from your authenticator app
                        below.
                      </span>
                    </div>

                    {/* Typed digits are black; the placeholder zeros stay
                        gray-300, as does the separator. The variant paints the
                        value gray-300 too, and SixDigitPinInput passes
                        pinInputClassName straight through cva without cn/
                        twMerge -- so a plain text-gray-black would tie on
                        specificity and be decided by stylesheet order. The
                        important modifier is what makes it deterministic.
                        placeholder:text-gray-300 is a separate selector, so it
                        is untouched. */}
                    <SixDigitPinInput
                      size="md"
                      className="gap-x-3"
                      pinInputClassName="!text-gray-black"
                    />
                  </div>

                  <div className="flex w-full items-center justify-between gap-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => {
                        setIsAuthenticatorOpen(false)
                        setIsRecoveryOpen(true)
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAuthenticatorSubmit}
                    >
                      <Check className="size-[15px]" />
                      Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Contact support. Figma: 500x502, 50px padding, 24px gap ->
                  50 + 76 (heading) + 24 + 302 (rows) + 50 = 502, on a 400px
                  column (500 - 2*50). The rows block is 4*68 + 3*10 = 302.
                  The row itself is the same control the Account Recovery
                  chooser uses -- both Figmas specify it identically -- so the
                  markup is shared rather than re-derived. */}
              <Dialog open={isSupportOpen} onOpenChange={setIsSupportOpen}>
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[502px] w-[500px] max-w-[500px] flex-col items-center justify-center gap-6 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-start gap-2">
                    <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                      Contact Support
                    </DialogTitle>
                    <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                      Pick how you would like to reach us and someone from the
                      team will help you back into your account.
                    </DialogDescription>
                  </div>

                  <div className="flex w-full flex-col items-start gap-2.5">
                    {SUPPORT_OPTIONS.map(({ id, label, icon: Icon }) => {
                      const rowClassName =
                        "flex h-[68px] w-full items-center justify-between gap-x-5 rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"

                      const rowContent = (
                        <>
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
                        </>
                      )

                      return (
                        <Button
                          key={id}
                          type="button"
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          className={rowClassName}
                          onClick={() => handleSupportSelect(id, label)}
                        >
                          {rowContent}
                        </Button>
                      )
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Call us. Figma: 500x280, 50px padding, 32px gap ->
                  50 + 76 (heading) + 32 + 20 (number) + 32 + 20 (Back) + 50
                  = 280, on a 400px column (500 - 2*50).
                  items-start, not items-center: the Figma aligns this one left,
                  unlike the confirmation screens.
                  Back is 34x20 with zero padding here -- the 62x36 Back the
                  other modals use would not fit the 20px row, so size sm's
                  px-[14px]/h-9 is overridden. */}
              <Dialog open={isCallUsOpen} onOpenChange={setIsCallUsOpen}>
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[280px] w-[500px] max-w-[500px] flex-col items-start justify-center gap-8 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-start gap-2">
                    <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                      Call Us
                    </DialogTitle>
                    <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                      Support is open Monday to Friday. Have your account email
                      to hand so the team can find you quickly.
                    </DialogDescription>
                  </div>

                  {/* Plain text, not a tel: link -- the Figma draws it as body
                      copy, and the number is a placeholder that nobody should
                      be able to dial by accident. */}
                  <span className="text-lg font-normal leading-5 text-dark-blue-400">
                    {SUPPORT_PHONE_PLACEHOLDER}
                  </span>

                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    className="h-5 p-0"
                    onClick={() => {
                      setIsCallUsOpen(false)
                      setIsSupportOpen(true)
                    }}
                  >
                    Back
                  </Button>
                </DialogContent>
              </Dialog>

              {/* Email us. Figma draws 650x770; built 68px shorter at 650x702
                  by request -- the modal read as too tall on a laptop. The
                  message box absorbs the whole reduction (188 -> 120) because
                  it is the only element with slack; width, padding, gaps,
                  labels and the three single-line fields are all still
                  Figma-exact.
                  50 + 516 + 50 + 36 + 50 = 702, on a 550px column.
                  The 516 column is 56 (heading) + 32 + 428 (fields), and the
                  428 field box is 70 + 24 + 70 + 24 + 70 + 24 + 146 = 428.
                  flex-1/min-h-0 rather than fixed heights so the field box can
                  scroll, which is what the Figma marks it as doing. */}
              <Dialog open={isEmailUsOpen} onOpenChange={setIsEmailUsOpen}>
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[702px] max-h-[calc(100vh-4rem)] w-[650px] max-w-[650px] flex-col items-center justify-center gap-[50px] rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-start gap-8">
                    <div className="flex w-full shrink-0 flex-col items-start gap-2">
                      <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                        Email Us
                      </DialogTitle>
                      <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                        Use the form below to connect with one of our team
                        members.
                      </DialogDescription>
                    </div>

                    {/* -mb-1/pb-1 cancel out: the box takes 500px of border
                        box while consuming only 496px of layout, so the
                        content area stays exactly the Figma's 496 and the
                        buttons row does not move. The 4px of padding is what
                        stops overflow-y-auto shaving the last field's shadow-xs
                        -- content and container were exactly equal, so the
                        shadow paints straight onto the clip boundary. */}
                    <div className="-mb-1 flex min-h-0 w-full flex-1 flex-col items-start gap-6 overflow-y-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                      <div className="flex w-full shrink-0 items-start gap-6">
                        {SUPPORT_MESSAGE_FIELDS.slice(0, 2).map(
                          ({ id, label, placeholder }) => (
                            <div
                              key={id}
                              className="flex flex-1 flex-col items-start gap-1.5"
                            >
                              <Label
                                htmlFor={`support-${id}`}
                                size="sm"
                                className="text-dark-blue-400"
                              >
                                {label}
                              </Label>
                              <Input
                                id={`support-${id}`}
                                placeholder={placeholder}
                                value={supportMessage[id]}
                                onChange={(event) =>
                                  updateSupportMessage(id, event.target.value)
                                }
                              />
                            </div>
                          )
                        )}
                      </div>

                      {SUPPORT_MESSAGE_FIELDS.slice(2).map(
                        ({ id, label, placeholder }) => (
                          <div
                            key={id}
                            className="flex w-full shrink-0 flex-col items-start gap-1.5"
                          >
                            <Label
                              htmlFor={`support-${id}`}
                              size="sm"
                              className="text-dark-blue-400"
                            >
                              {label}
                            </Label>
                            <Input
                              id={`support-${id}`}
                              type={id === "email" ? "email" : "text"}
                              placeholder={placeholder}
                              value={supportMessage[id]}
                              onChange={(event) =>
                                updateSupportMessage(id, event.target.value)
                              }
                            />
                          </div>
                        )
                      )}

                      <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
                        <Label
                          htmlFor="support-message"
                          size="sm"
                          className="text-dark-blue-400"
                        >
                          Your Message
                        </Label>
                        {/* Textarea defaults to 128px. The Figma draws 188;
                            built at 120 to take the modal to 702 -- see the
                            geometry note on the dialog. */}
                        <Textarea
                          id="support-message"
                          className="h-[120px]"
                          placeholder="Let us know any details that might help."
                          value={supportMessage.message}
                          onChange={(event) =>
                            updateSupportMessage("message", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-between gap-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => {
                        setIsEmailUsOpen(false)
                        setIsSupportOpen(true)
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canSendSupportMessage}
                      onClick={handleSupportMessageSubmit}
                    >
                      <Check className="size-[15px]" />
                      Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Schedule a call. Figma: 650x626, 50px padding, 50px gap ->
                  50 + 440 + 50 + 36 + 50 = 626, on a 550px column.
                  The 440 column is 56 (heading) + 32 + 352 (fields), and the
                  352 field box is 70 + 24 + 70 + 24 + 70 + 24 + 70 = 352.
                  Same -mb-1/pb-1 trick as Email Us: content and container are
                  exactly equal, so without it the last row's shadow-xs is
                  shaved by the scroll clip. */}
              <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[626px] max-h-[calc(100vh-4rem)] w-[650px] max-w-[650px] flex-col items-center justify-center gap-[50px] rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-start gap-8">
                    <div className="flex w-full shrink-0 flex-col items-start gap-2">
                      <DialogTitle className="w-full text-lg font-semibold leading-7 text-dark-blue-400">
                        Schedule a Call
                      </DialogTitle>
                      <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                        Use the form below to schedule a call with one of our
                        team members.
                      </DialogDescription>
                    </div>

                    <div className="-mb-1 flex min-h-0 w-full flex-1 flex-col items-start gap-6 overflow-y-auto pb-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg">
                      {SCHEDULE_TEXT_FIELDS.map(
                        ({ id, label, placeholder }) => (
                          <div
                            key={id}
                            className="flex w-full shrink-0 flex-col items-start gap-1.5"
                          >
                            <Label
                              htmlFor={`schedule-${id}`}
                              size="sm"
                              className="text-dark-blue-400"
                            >
                              {label}
                            </Label>
                            <Input
                              id={`schedule-${id}`}
                              type={id === "email" ? "email" : "text"}
                              placeholder={placeholder}
                              value={scheduleForm[id]}
                              onChange={(event) =>
                                updateScheduleForm(id, event.target.value)
                              }
                            />
                          </div>
                        )
                      )}

                      {/* The Figma draws a country dropdown joined to the text
                          field. PhoneNumberInput is that control, and is what
                          Settings already uses.
                          Its size comes from global CSS variables, not props:
                          styles/globals.css sets the height to size.10 (40px)
                          and the font to 14px, so out of the box it renders 4px
                          shorter than every other field here. The variable is
                          re-set on this wrapper rather than globally, because
                          the global one also drives the Settings phone inputs.
                          The Figma wants 44px, a 14px country code and 16px
                          input text -- the var covers both halves, so the input
                          text is lifted to 16 on its own with !text-base and
                          the country code keeps the inherited 14.
                          rounded-[5px] + shadow-xs on the wrapper give the
                          outer box the Figma's shadow; the control itself
                          carries none. */}
                      <div className="flex w-full shrink-0 flex-col items-start gap-1.5">
                        <Label size="sm" className="text-dark-blue-400">
                          Phone Number
                        </Label>
                        <div className="w-full rounded-[5px] shadow-xs [--react-international-phone-height:44px]">
                          <PhoneNumberInput
                            defaultCountry="us"
                            placeholder="(555) 555-5555"
                            disableDialCodePrefill
                            inputClassName="!text-base"
                            value={scheduleForm.phone}
                            onChange={(value) =>
                              updateScheduleForm("phone", value)
                            }
                          />
                        </div>
                      </div>

                      {/* Free text, not pickers. The Figma draws a 44px field
                          with a trailing 16px glyph and a typed MM/DD/YYYY
                          placeholder; DatePicker is a 40px Button+Popover with
                          a LEADING indicator and a hardcoded trailing chevron,
                          and TimeField is segmented -- neither matches without
                          editing read-only component source.
                          Consequence: nothing validates these. canScheduleCall
                          only checks they are non-empty, so 99/99/9999 passes,
                          and no timezone is captured anywhere. Must be resolved
                          before the booking endpoint is built -- its payload
                          depends on it. See docs/ACCOUNT_RECOVERY_NOTES.md
                          §4.6. */}
                      <div className="flex w-full shrink-0 items-start gap-6">
                        {(
                          [
                            {
                              id: "date",
                              label: "Preferred Date",
                              placeholder: "MM/DD/YYYY",
                              icon: Calendar,
                            },
                            {
                              id: "time",
                              label: "Preferred Time",
                              placeholder: "HH:MM AM/PM",
                              icon: Clock,
                            },
                          ] as const
                        ).map(({ id, label, placeholder, icon: Icon }) => (
                          <div
                            key={id}
                            className="flex flex-1 flex-col items-start gap-1.5"
                          >
                            <Label
                              htmlFor={`schedule-${id}`}
                              size="sm"
                              className="text-dark-blue-400"
                            >
                              {label}
                            </Label>
                            <InputGroup className="w-full">
                              <Input
                                id={`schedule-${id}`}
                                placeholder={placeholder}
                                className="pr-9"
                                value={scheduleForm[id]}
                                onChange={(event) =>
                                  updateScheduleForm(id, event.target.value)
                                }
                              />
                              <InputRightElement>
                                <Icon className="size-4 text-gray-400" />
                              </InputRightElement>
                            </InputGroup>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-between gap-8">
                    <Button
                      type="button"
                      size="sm"
                      variant="link"
                      onClick={() => {
                        setIsScheduleOpen(false)
                        setIsSupportOpen(true)
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canScheduleCall}
                      onClick={handleScheduleSubmit}
                    >
                      <Check className="size-[15px]" />
                      Submit
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Message sent. Figma: 371x258, 50px padding ->
                  50 + 158 + 50 = 258, on a 271px column (371 - 2*50).
                  The 158 column is 48 (icon) + 20 + 90 (22 heading + 8 + 60
                  supporting). The Figma's modal gap of 32 never applies: the
                  only other child is the close button, which is display:none.
                  There is no dismiss control by design -- Esc and the overlay
                  close it, which Radix gives us. */}
              <Dialog
                open={isSupportSentOpen}
                onOpenChange={setIsSupportSentOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[258px] w-[371px] max-w-[371px] flex-col items-center justify-center gap-8 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-center gap-5">
                    <span className="box-border flex size-12 shrink-0 items-center justify-center rounded-[28px] border-8 border-success-50 bg-success-100">
                      <CheckCircle className="size-6 text-success-500" />
                    </span>

                    <div className="flex w-full flex-col items-center gap-2">
                      <DialogTitle className="text-center text-lg font-semibold leading-[22px] text-dark-blue-400">
                        {supportSentKind === "call"
                          ? "Your call has been scheduled"
                          : "Thank you for contacting us"}
                      </DialogTitle>
                      <DialogDescription className="w-full text-center text-sm leading-5 text-gray-500">
                        {supportSentKind === "call"
                          ? `We have you down for ${scheduleForm.date} at ${scheduleForm.time}. Someone will call the number you gave us.`
                          : "Your message is on its way to our support team. Someone will reply to the address you gave us."}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Update password. Figma: 592x582, 50px padding, 50px gap and
                  items-end so the button sits right. The 492px column is
                  76 (heading) + 24 + 296 (fields + rules) = 396, then
                  50 + 396 + 50 + 36 + 50 = 582. Built here rather than reusing
                  UpdatePasswordForm, which is a page-level form carrying its
                  own wrapper padding and no fixed height, so it cannot hit
                  these numbers. The validation helpers are shared. */}
              <Dialog
                open={isUpdatePasswordOpen}
                onOpenChange={setIsUpdatePasswordOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[582px] w-[592px] max-w-[592px] flex-col items-end justify-center gap-[50px] rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-start gap-6">
                    <div className="flex w-full flex-col items-start gap-3">
                      <DialogTitle className="text-lg font-semibold capitalize leading-6 text-dark-blue-400">
                        Update Password
                      </DialogTitle>
                      <DialogDescription className="w-full text-sm leading-5 text-gray-500">
                        Marketeq recommends avoiding using personal information
                        in passwords and using a unique password for each
                        account.{" "}
                        <Link href="#" className="underline text-primary-500">
                          Learn more
                        </Link>
                      </DialogDescription>
                    </div>

                    <div className="flex w-full flex-col items-start gap-6">
                      <div className="flex w-full flex-col items-start gap-6">
                        <div className="flex w-full flex-col items-start gap-1.5">
                          <Label
                            size="sm"
                            htmlFor="recovery-new-password"
                            className="text-dark-blue-400"
                          >
                            Create Password
                          </Label>
                          <InputGroup className="w-full">
                            <Input
                              id="recovery-new-password"
                              placeholder="Type your password"
                              type={isNewPasswordVisible ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <InputRightElement
                              onClick={() =>
                                setIsNewPasswordVisible((prev) => !prev)
                              }
                            >
                              {isNewPasswordVisible ? (
                                <EyeOff className="size-4 text-gray-400 hover:text-gray-500" />
                              ) : (
                                <Eye className="size-4 text-gray-400 hover:text-gray-500" />
                              )}
                            </InputRightElement>
                          </InputGroup>
                        </div>

                        <div className="flex w-full flex-col items-start gap-1.5">
                          <Label
                            size="sm"
                            htmlFor="recovery-confirm-password"
                            className="text-dark-blue-400"
                          >
                            Confirm Password
                          </Label>
                          <InputGroup className="w-full">
                            <Input
                              id="recovery-confirm-password"
                              placeholder="Type your password again"
                              type={
                                isConfirmPasswordVisible ? "text" : "password"
                              }
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                            />
                            <InputRightElement
                              onClick={() =>
                                setIsConfirmPasswordVisible((prev) => !prev)
                              }
                            >
                              {isConfirmPasswordVisible ? (
                                <EyeOff className="size-4 text-gray-400 hover:text-gray-500" />
                              ) : (
                                <Eye className="size-4 text-gray-400 hover:text-gray-500" />
                              )}
                            </InputRightElement>
                          </InputGroup>
                        </div>
                      </div>

                      {/* Same indicators Settings > Login & Password uses: the
                          design system Checkbox in its circular variant, which
                          fills primary-500 when checked. */}
                      <div className="flex w-[328px] flex-col items-start gap-3">
                        <Label size="sm" className="text-gray-700">
                          Password Requirements
                        </Label>
                        <div className="flex w-full items-start gap-x-10">
                          {passwordRuleColumns.map((column, columnIndex) => (
                            <div
                              key={columnIndex}
                              className={cn(
                                "flex flex-col items-start gap-2",
                                columnIndex === 0 ? "w-[173px]" : "w-[115px]"
                              )}
                            >
                              {column.map(({ label, met }) => (
                                <div
                                  key={label}
                                  className="flex items-center gap-x-3"
                                >
                                  <Checkbox
                                    size="md"
                                    variant="circular"
                                    checked={met}
                                  />
                                  <span className="text-sm font-medium leading-5 text-gray-700">
                                    {label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSavePassword}
                    onClick={handleUpdatePasswordSubmit}
                  >
                    <Check className="size-[15px]" />
                    Save Password
                  </Button>
                </DialogContent>
              </Dialog>

              {/* Confirmation. Figma: 420x490, 50px padding, 32px gap ->
                  50 + 180 + 32 + 110 + 32 + 36 + 50 = 490, on a 320px content
                  column (420 - 2*50). The content column is 48 (icon) + 20 +
                  112 (44 heading + 8 + 60 supporting) = 180, and the options
                  block is 50 + 10 + 50 = 110.
                  Shared by both terminals -- password updated, and
                  authenticated via the app authenticator. The Figma draws the
                  two with identical geometry and differing copy only, so the
                  wording comes from CONFIRMATION_COPY and everything else is
                  the same markup. */}
              <Dialog
                open={isConfirmationOpen}
                onOpenChange={setIsConfirmationOpen}
              >
                <DialogContent
                  dialogOverlay={<DialogOverlay className="bg-transparent" />}
                  className="flex h-[490px] w-[420px] max-w-[420px] flex-col items-center justify-center gap-8 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]"
                >
                  <div className="flex w-full flex-col items-center gap-5">
                    <span className="box-border flex size-12 shrink-0 items-center justify-center rounded-[28px] border-8 border-success-50 bg-success-100">
                      <CheckCircle className="size-6 text-success-500" />
                    </span>

                    <div className="flex w-full flex-col items-center gap-2">
                      <DialogTitle className="text-center text-lg font-semibold leading-[22px] text-dark-blue-400">
                        {CONFIRMATION_COPY[confirmationKind].title}
                      </DialogTitle>
                      <DialogDescription className="w-full text-center text-sm leading-5 text-gray-500">
                        {CONFIRMATION_COPY[confirmationKind].description}
                      </DialogDescription>
                    </div>
                  </div>

                  {/* The two choices are mutually exclusive, so this is a radio
                      group rather than the pair of checkboxes the Figma names
                      its layers after. */}
                  <RadioGroup
                    value={sessionChoice}
                    onValueChange={setSessionChoice}
                    className="flex w-full flex-col items-start gap-2.5"
                  >
                    {[
                      {
                        value: "stay",
                        title: "Stay logged in to my devices",
                        description: "Other sessions stay signed in.",
                      },
                      {
                        value: "signOut",
                        title: "Sign out of all other devices",
                        description: "Signs out everywhere else.",
                      },
                    ].map(({ value, title, description }) => (
                      <Label
                        key={value}
                        htmlFor={`session-${value}`}
                        className="flex h-[50px] w-full shrink-0 items-center gap-x-5 overflow-hidden rounded-[7px] border border-gray-200 bg-white px-5 py-2"
                      >
                        <RadioGroupItem
                          id={`session-${value}`}
                          value={value}
                          size="sm"
                        />
                        {/* min-w-0 + truncate keep both lines to 18px each, so
                            the pair stays 34px and cannot overflow the 50px
                            row -- a wrapped description was what pushed the
                            text over the row edge. */}
                        <span className="flex min-w-0 flex-1 flex-col items-start">
                          <span className="-mt-0.5 w-full truncate text-xs font-medium leading-[18px] text-dark-blue-400">
                            {title}
                          </span>
                          <span className="w-full truncate text-xs leading-[18px] text-gray-500">
                            {description}
                          </span>
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={handleContinueToDashboard}
                  >
                    <Check className="size-[15px]" />
                    Continue to Dashboard
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
