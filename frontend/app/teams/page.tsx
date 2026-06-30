"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function TeamsAliasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    const target = query ? `/my-team?${query}` : "/my-team"
    router.replace(target)
  }, [router, searchParams])

  return null
}
