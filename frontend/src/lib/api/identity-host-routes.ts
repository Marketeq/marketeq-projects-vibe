// frontend/src/lib/api/identity-host-routes.ts
//
// When the identity verification host (contexts/identity-verification-host.tsx, mounted once in
// the root layout) is active. Pure: no UI, no network, no storage.
//
// The host is inert, and renders nothing, when nobody is signed in and on the sign-in, sign-up,
// password-recovery and invitation entry pages, so a public or authentication page never loads
// or shows any verification UI and never reads any identity state. Every other page may be a
// place verification opens over (a signed-in talent applying from a public job page, for
// instance), so those stay active for a signed-in user.

export const IDENTITY_HOST_PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/update-password",
  "/recovery-email",
  "/accept-invitation",
  "/invite",
  "/invite-talent",
  "/identity-verification-preview",
] as const

export function isIdentityHostPublicPath(
  pathname: string | null | undefined
): boolean {
  if (!pathname) return false
  return IDENTITY_HOST_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function isIdentityHostActive(input: {
  pathname: string | null | undefined
  userId: string | null | undefined
}): boolean {
  return Boolean(input.userId) && !isIdentityHostPublicPath(input.pathname)
}

/**
 * Everything the host holds (an open flow, a gate, a dialog, a held location) belongs to one
 * account on one page. When this key changes (another page, another account, another role,
 * a sign-out, a public page) the host closes and forgets all of it.
 */
export function identityHostResetKey(input: {
  pathname: string | null | undefined
  userId: string | null | undefined
  role: string | null | undefined
}): string {
  const active = isIdentityHostActive(input)
  return [
    active ? "active" : "inactive",
    input.pathname ?? "",
    input.userId ?? "",
    input.role ?? "",
  ].join("|")
}
