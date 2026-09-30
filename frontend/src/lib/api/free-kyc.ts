// frontend/src/lib/api/free-kyc.ts
//
// The "Yes, this is my home country" path: complete the existing server-side
// home-country confirmation, then ask the backend for the Didit-hosted Free
// KYC session and redirect the browser to it. Didit then handles country and
// document selection, capture, liveness, face match and the decision.
//
// Nothing here marks anyone verified — a browser that comes back from Didit
// only ever re-reads authoritative status from our backend (GET /me).
//
// The travel branch ("No, I'm currently traveling") never calls any of this.

export interface FreeKycDeps {
  // POST /v1/identity-verification/home-country/confirm — the backend
  // resolves the country from the request IP itself; nothing is sent.
  confirmHomeCountry: () => Promise<unknown>
  // POST /v1/identity-verification/kyc-sessions — VPN/proxy guarded.
  startFreeKyc: () => Promise<{ data: { url: string } }>
  redirect: (url: string) => void
}

// Only a plain https URL on a Didit hostname may be navigated to.
const ALLOWED_HOST_SUFFIXES = ["didit.me"]

export function isDiditHostedUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return false
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  const host = url.hostname.toLowerCase()
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === "443") &&
    !isIpLiteral &&
    ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    )
  )
}

export type FreeKycOutcome = "redirected" | "failed"

// No Figma state exists for a failure here (VPN block, unavailable vendor,
// confirmation rejected, …), so this stays on the current screen and logs
// instead of inventing UI. The existing VPN/proxy dialog still runs earlier,
// at "Verify My Account".
export async function confirmHomeCountryAndStartFreeKyc(
  deps: FreeKycDeps
): Promise<FreeKycOutcome> {
  try {
    await deps.confirmHomeCountry()
    const { data } = await deps.startFreeKyc()
    if (!isDiditHostedUrl(data?.url)) {
      throw new Error("Free KYC returned an invalid redirect URL.")
    }
    deps.redirect(data.url)
    return "redirected"
  } catch (error) {
    console.error("[identity-verification] Free KYC start failed", error)
    return "failed"
  }
}

export type HomeCountryYesOutcome = FreeKycOutcome | "simulated"

// The single entry point for "Yes, this is my home country". In the
// development preview (simulate === true) it runs ONLY the supplied stub: it
// never loads the API client and never confirms, creates a session or
// redirects. The authenticated /talent-dashboard path passes simulate=false,
// which is the only path that performs the real calls.
export async function handleHomeCountryYes(options: {
  simulate: boolean
  onSimulated?: () => void
  getDeps: () => Promise<FreeKycDeps>
}): Promise<HomeCountryYesOutcome> {
  if (options.simulate) {
    options.onSimulated?.()
    return "simulated"
  }
  return confirmHomeCountryAndStartFreeKyc(await options.getDeps())
}
