// Test support for the source-text tests that pin the talent dashboard's verification code.
// That code now lives in two files: the dashboard page, and the identity verification host
// that the page mounts (contexts/identity-verification-host.tsx). Tests that pin what the
// dashboard "does" read both; tests about the host itself read only the host.
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (...parts: string[]) =>
  readFileSync(join(process.cwd(), ...parts), "utf8")

export const readDashboardPage = () =>
  read("app", "(group)", "talent-dashboard", "page.tsx")

export const readIdentityHost = () =>
  read("contexts", "identity-verification-host.tsx")

/** The page followed by the host, so a marker slice taken from the page is unchanged. */
export const readDashboardWithHost = () =>
  `${readDashboardPage()}\n${readIdentityHost()}`
