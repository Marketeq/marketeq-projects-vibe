"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function AcceptInvitationAliasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    const target = query ? `/invite/accept?${query}` : "/invite/accept"
    router.replace(target)
  }, [router, searchParams])

  return null
}
