// Test support for the dashboard layout guards (profile-banner.test.ts and
// dashboard-verification-entry.test.ts). Those tests pin the content column byte for byte;
// the persistent status-alert stack (PMCM-651) is the one block allowed in front of the
// banner. This helper takes exactly that block out and is strict about it, so the guards
// keep their meaning:
//   - the block must start at the stack's marker and end exactly where the banner starts
//     (nothing else can sit between them);
//   - it must be ONE balanced JSX expression `{ ... }`, so extra elements cannot hide
//     after it, and exactly one such block may exist;
//   - the block's own contents are pinned by travel-mode-alert-markup.test.ts.
const STACK_START = "{(statusAlertStack.visible.length > 0 ||"
const BANNER_START = "{profileBannerShown && !profileBannerDismissed && ("

export function statusAlertStackBlock(source: string): {
  from: number
  to: number
} {
  const from = source.indexOf(STACK_START)
  if (from < 0 || source.indexOf(STACK_START, from + 1) !== -1) {
    throw new Error("expected exactly one status-alert stack block")
  }
  const to = source.indexOf(BANNER_START, from)
  if (to < 0) throw new Error("the banner must follow the stack block")
  const block = source.slice(from, to).trimEnd()
  let depth = 0
  for (let i = 0; i < block.length; i++) {
    if (block[i] === "{") depth++
    if (block[i] === "}") {
      depth--
      if (depth === 0 && i !== block.length - 1) {
        throw new Error("something sits between the stack block and the banner")
      }
    }
  }
  if (depth !== 0)
    throw new Error("the stack block is not one balanced expression")
  return { from, to }
}

export function withoutStatusAlertStack(source: string): string {
  const { from, to } = statusAlertStackBlock(source)
  return source.slice(0, from) + source.slice(to)
}
