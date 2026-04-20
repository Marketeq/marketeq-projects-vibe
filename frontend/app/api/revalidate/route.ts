import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * On-demand ISR webhook called by cms-service Payload hooks.
 *
 * Per docs/md/Home Page/08-HP — Cache Strategy & Invalidation, the canonical
 * cache-invalidation path is RabbitMQ → api-gateway Redis. That doc covers
 * the *backend* cache layer; this route is the frontend complement: when an
 * editor publishes a project, cms-service hits this endpoint so Next.js
 * busts its RSC/Data Cache for the affected paths and a normal browser
 * refresh sees the new content immediately.
 *
 * Auth: shared bearer secret in `REVALIDATE_SECRET` (must match the env on
 * cms-service).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET not configured" },
      { status: 500 }
    )
  }

  let body: { secret?: string; paths?: string[]; path?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const paths = body.paths ?? (body.path ? [body.path] : [])
  if (paths.length === 0) {
    return NextResponse.json(
      { error: "Missing `paths` or `path`" },
      { status: 400 }
    )
  }

  const revalidated: string[] = []
  for (const path of paths) {
    if (typeof path !== "string" || !path.startsWith("/")) continue
    revalidatePath(path)
    revalidated.push(path)
  }

  return NextResponse.json({
    revalidated,
    now: Date.now(),
  })
}
