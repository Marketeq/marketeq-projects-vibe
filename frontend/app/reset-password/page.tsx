"use client"

import React from "react"
import Link from "next/link"
import { MarketeqLogo } from "@/components/icons/marketeq-logo"
import { Button } from "@/components/ui"

function ResetPassword() {
  return (
    <>
      <div className="px-[100px] h-[64px] flex items-center justify-between">
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

      <div className="min-h-[calc(theme(height.screen)-theme(size.16))] flex flex-col justify-center items-center">
        <div className="max-w-md w-full mx-auto text-center">
          <h1 className="text-2xl font-semibold mb-2">Reset Password</h1>
          <p className="text-gray-500">This page is under construction.</p>
        </div>
      </div>
    </>
  )
}

export default ResetPassword
