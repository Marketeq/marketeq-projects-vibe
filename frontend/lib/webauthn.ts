/**
 * The browser half of fingerprint login.
 *
 * ⚠️ THIS IS A DEVICE CHECK, NOT AUTHENTICATION. ⚠️
 *
 * A real WebAuthn enrolment needs the server to issue the challenge, verify the
 * attestation, and store the resulting public key against the account. None of
 * that exists yet: there is no credentials table, no verification endpoint, and
 * no sign-in route that accepts an assertion.
 *
 * What this does is make the Fingerprint Login control honest about the one
 * thing it claims — "Confirm your fingerprint on your device" — by actually
 * invoking the platform authenticator, so Touch ID / Windows Hello really does
 * prompt and a cancelled or failed scan really does fail.
 *
 * Because the challenge is generated here rather than by the server, the
 * resulting credential proves nothing to the backend and is deliberately
 * discarded. Do not build a login path on this function; the enrolment it
 * performs is not recorded anywhere and cannot be verified later.
 */

/** Why an enrolment attempt did not produce a credential. */
export type FingerprintFailure =
  | "unsupported"
  | "no-authenticator"
  | "insecure-context"
  | "cancelled"
  | "already-registered"
  | "failed"

export interface FingerprintUser {
  id: string
  name: string
  displayName: string
}

/**
 * Whether this device can do a user-verifying platform authenticator —
 * Touch ID, Windows Hello, a fingerprint reader. A roaming security key does
 * not count: the control is specifically about the device in your hands.
 */
export async function isFingerprintAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (!window.PublicKeyCredential) return false
  if (!window.isSecureContext) return false
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Prompts the device's biometric sensor.
 *
 * Resolves once the person has confirmed with their fingerprint, and rejects
 * with a FingerprintFailure describing why not. The credential itself is thrown
 * away — see the file header.
 */
export async function promptForFingerprint(
  user: FingerprintUser
): Promise<void> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    throw "unsupported" as FingerprintFailure
  }
  // WebAuthn is unavailable outside a secure context, which in practice means
  // http:// on anything other than localhost.
  if (!window.isSecureContext) {
    throw "insecure-context" as FingerprintFailure
  }
  if (!(await isFingerprintAvailable())) {
    throw "no-authenticator" as FingerprintFailure
  }

  // Random locally, and only because the call needs one. A server-issued
  // challenge is what makes an enrolment verifiable, and there is no endpoint
  // to ask for one yet.
  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  try {
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Marketeq", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.name,
          displayName: user.displayName,
        },
        // ES256 then RS256 — the two every platform authenticator supports.
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          // "platform" is what keeps this to the built-in sensor rather than
          // offering a phone or a USB key, which is what the screen promises.
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60_000,
        // Nothing verifies attestation, so asking for it would collect a
        // device identifier for no purpose.
        attestation: "none",
      },
    })
  } catch (error: unknown) {
    const name = (error as { name?: string })?.name
    if (name === "NotAllowedError") throw "cancelled" as FingerprintFailure
    if (name === "InvalidStateError") {
      throw "already-registered" as FingerprintFailure
    }
    if (name === "SecurityError") throw "insecure-context" as FingerprintFailure
    if (name === "NotSupportedError") {
      throw "no-authenticator" as FingerprintFailure
    }
    throw "failed" as FingerprintFailure
  }
}

/** What to show the person when an attempt does not go through. */
export function fingerprintFailureMessage(failure: unknown): string {
  switch (failure) {
    case "unsupported":
      return "This browser doesn't support fingerprint login."
    case "no-authenticator":
      return "This device doesn't have a fingerprint sensor set up."
    case "insecure-context":
      return "Fingerprint login needs a secure (https) connection."
    case "cancelled":
      return "Fingerprint wasn't confirmed. Try again."
    case "already-registered":
      return "This device is already set up for fingerprint login."
    default:
      return "Couldn't turn on fingerprint login. Try again."
  }
}
