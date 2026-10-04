"use client"

/**
 * /contact-support — public support entry point.
 *
 * Reached from the "Contact Support" button on the recovery-email failure
 * modal, and deliberately public: someone whose recovery link did not work may
 * have no way into the account at all, so a signed-in-only support page would
 * be unreachable by exactly the people who need it. Hence the signed-out
 * header, matching /forgot-password.
 */
import Link from "next/link"
import {
  ChevronRight,
  Mail01,
  Phone,
  // Smartphone -- only used by the commented-out Live Chat row above.
} from "@blend-metrics/icons"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Button } from "@/components/ui"

// The address the transactional emails already point people at
// (auth-service BrevoService, BREVO_FROM_EMAIL).
const SUPPORT_EMAIL = "support@marketeqdigital.com"

type Channel = {
  label: string
  icon: typeof Phone
  href?: string
}

// Call Us and Live Chat are commented out, matching /forgot-password: per
// CTorres we are not running phone support or live chat yet, and neither row
// has a destination. Email Us is the only channel that reaches anyone.
const CHANNELS: Channel[] = [
  // { label: "Call Us", icon: Phone },
  { label: "Email Us", icon: Mail01, href: `mailto:${SUPPORT_EMAIL}` },
  { label: "Schedule a Call", icon: Mail01 },
  // { label: "Live Chat", icon: Smartphone },
]

export default function ContactSupportPage() {
  return (
    <>
      <div className="flex h-[64px] items-center justify-between px-5 md:px-[100px]">
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

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-10">
        <div className="flex w-[500px] max-w-full flex-col items-start gap-6 rounded-xl border border-gray-200 bg-white p-[50px] shadow-[0px_32px_64px_-12px_rgba(16,24,40,0.05)]">
          <div className="flex w-full flex-col items-start gap-2">
            <h1 className="w-full text-lg leading-7 font-semibold text-dark-blue-400">
              Contact Support
            </h1>
            <p className="w-full text-sm text-gray-500">
              Rorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc
              vulputate libero et velit interdum.
            </p>
          </div>

          <div className="flex w-full flex-col items-start gap-2.5">
            {CHANNELS.map(({ label, icon: Icon, href }) => {
              const row = (
                <span className="flex w-full items-center justify-between gap-5">
                  <span className="flex items-center gap-x-3">
                    <span className="flex size-11 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                      <Icon className="size-5 text-primary-500" />
                    </span>
                    <span className="text-sm font-medium leading-[17px] text-gray-900">
                      {label}
                    </span>
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-[5px]">
                    <ChevronRight className="size-5 text-gray-500" />
                  </span>
                </span>
              )

              const className =
                "flex h-[68px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"

              return href ? (
                <Button
                  key={label}
                  asChild
                  variant="ghost"
                  visual="gray"
                  size="sm"
                  className={className}
                >
                  <a href={href}>{row}</a>
                </Button>
              ) : (
                <Button
                  key={label}
                  variant="ghost"
                  visual="gray"
                  size="sm"
                  className={className}
                >
                  {row}
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
