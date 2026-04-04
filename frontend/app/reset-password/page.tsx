"use client"

import React from "react"
import Link from "next/link"
import { AccountNotFoundShowcase } from "@/components/account-not-found-showcaset"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { MagicLinkSentShowcase } from "@/components/magic-link-sent-showcase"
import { ResetPasswordForm } from "@/components/reset-password-form"
import { Button } from "@/components/ui"

function ResetPassword() {
  const [status, setStatus] = React.useState<"ideal" | "success" | "error">(
    "ideal"
  )

  return (
    <>
      <div className="px-[100px] h-[64px] flex items-center justify-between">
        <Link href="/">
          <MarketeqLogo />
        </Link>

        <div className="flex items-center gap-x-3">
          <Button size="md" variant="ghost">
            Sign In
          </Button>
          <Button size="md">Sign Up</Button>
        </div>
      </div>

      <div className="min-h-[calc(theme(height.screen)-theme(size.16))] flex flex-col justify-center">
        <div>
          {status === "ideal" && (
            <ResetPasswordForm
              onSubmit={() => {
                const randomInt = Math.floor(Math.random() * 10)
                if (randomInt < 5) {
                  setStatus("success")
                } else {
                  setStatus("error")
                }
              }}
            />
          )}
          {status === "success" && (
            <MagicLinkSentShowcase goBack={() => setStatus("ideal")} />
          )}
          {status === "error" && (
            <AccountNotFoundShowcase goBack={() => setStatus("ideal")} />
          )}
        </div>
      </div>
    </>
  )
}

export default ResetPassword
