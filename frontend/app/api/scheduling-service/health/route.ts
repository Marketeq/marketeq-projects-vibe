import { NextRequest, NextResponse } from "next/server"

const DEFAULT_SCHEDULING_SERVICE_URL =
  process.env.NEXT_PUBLIC_SCHEDULING_SERVICE_URL || "http://localhost:3024"

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const requestedTarget = request.nextUrl.searchParams.get("target")
  const target = requestedTarget || DEFAULT_SCHEDULING_SERVICE_URL

  if (!isHttpUrl(target)) {
    return NextResponse.json(
      { ok: false, error: "Invalid scheduling service URL." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(target, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(3500),
    })

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scheduling service unavailable."

    return NextResponse.json({
      ok: false,
      error: message,
    })
  }
}
