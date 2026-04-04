"use client"

import React from "react"
import Link from "next/link"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { NavigationForm } from "@/components/navigation-form"
import { Button } from "@/components/ui"
import { UpdatePasswordForm } from "@/components/update-password-form"

function UpdatePassword() {
  const [status, setStatus] = React.useState<"ideal" | "success">("ideal")

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
            <UpdatePasswordForm onSubmit={() => setStatus("success")} />
          )}
          {status === "success" && <NavigationForm />}
        </div>
      </div>
    </>
  )
}

export default UpdatePassword
