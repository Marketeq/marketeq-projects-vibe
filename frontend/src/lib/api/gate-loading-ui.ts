// Test support for the source-pinned tests on components/account-verification-gate.tsx.
//
// Button loading states (Phase B) added a small, approved set of lines to the gate: an optional
// `retrying` prop, a loading spinner + `aria-busy` on Retry and on Verify My Account, Retry's
// refresh icon moved into `leftIcon` (so the spinner replaces it), the old "Checking..." label
// swap replaced by the unchanged "Verify My Account" label, and the width reserved for the spinner.
//
// `gateWithoutLoadingUi` takes exactly those additions back out. The pins that proved the gate was
// unchanged (a hash of its source) keep checking the ORIGINAL gate through it, so nothing else in
// the component can change without those tests failing; each pin also asserts the gate as it is now.
const REVERSALS: Array<[string, string]> = [
  ["  onCancel,\n  retrying = false,\n}: {", "  onCancel,\n}: {"],
  [
    `  // Optional. True only while a Retry pressed on the connection-error presentation is running:
  // that presentation stays on screen until the answer, so Retry shows its spinner (the shared
  // Button's, replacing its icon) and is disabled. Absent or false (every other caller): nothing
  // changes. Dismiss stays available, since dismissing cancels the check.
  retrying?: boolean
`,
    "",
  ],
  [
    `                className="min-w-[93px] text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                size="md"
                leftIcon={<RefreshCw className="size-[15px]" />}
                loading={retrying}
                aria-busy={retrying}
                onClick={onRetryConnectionCheck}
              >
                Retry`,
    `                className="text-primary-500 bg-primary-50 hover:text-white hover:bg-primary-500"
                size="md"
                onClick={onRetryConnectionCheck}
              >
                <RefreshCw className="size-[15px]" />
                Retry`,
  ],
  [
    `              <Button
                className="min-w-[178px]"
                onClick={onVerify}
                disabled={connectionCheckState === "checking"}
                loading={connectionCheckState === "checking"}
                aria-busy={connectionCheckState === "checking"}
              >
                Verify My Account
              </Button>`,
    `              <Button
                onClick={onVerify}
                disabled={connectionCheckState === "checking"}
              >
                {connectionCheckState === "checking"
                  ? "Checking..."
                  : "Verify My Account"}
              </Button>`,
  ],
]

export function gateWithoutLoadingUi(source: string): string {
  return REVERSALS.reduce((text, [now, before]) => {
    if (!text.includes(now)) throw new Error("the gate no longer contains an approved loading-state addition")
    return text.replace(now, before)
  }, source)
}
