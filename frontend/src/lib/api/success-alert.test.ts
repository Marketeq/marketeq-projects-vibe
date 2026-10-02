// Run like detected-location.test.ts (from the frontend/ directory).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const page = read("app", "(group)", "talent-dashboard", "page.tsx")

const alertStart = page.indexOf('<ToastProvider duration={5000} swipeDirection="right">')
const alertEnd = page.indexOf("</ToastProvider>", alertStart) + "</ToastProvider>".length
const alert = page.slice(alertStart, alertEnd)

const modalStart = page.indexOf("<Dialog open={verifiedModalOpen}")
const modalEnd = page.indexOf("</Dialog>", modalStart) + "</Dialog>".length
const modal = page.slice(modalStart, modalEnd)

describe("success alert: sequence (modal unchanged, alert only after Done)", () => {
  it("the alert is rendered, and sits outside the success modal", () => {
    assert.ok(alertStart > -1 && alertEnd > alertStart)
    assert.ok(alertStart >= modalEnd, "the alert is not part of the modal")
  })

  it("Done closes the modal first, then opens the alert — in that order, in one handler", () => {
    assert.match(
      page,
      /const handleSuccessDone = \(\) => \{\s+setVerifiedModalOpen\(false\)\s+setSuccessAlertOpen\(true\)\s+\}/
    )
    assert.ok(modal.includes("<Button onClick={handleSuccessDone}>Done</Button>"))
  })

  it("the alert opens from exactly one place: the Done handler, which only the Done button uses", () => {
    assert.equal((page.match(/setSuccessAlertOpen\(true\)/g) ?? []).length, 1)
    assert.equal((page.match(/handleSuccessDone/g) ?? []).length, 2) // definition + the Done button
  })

  it("it never opens while the modal opens, and not when the modal is dismissed any other way", () => {
    const trigger = page.slice(page.indexOf("if (shouldShowSuccessModal(summary))"), page.indexOf("// Anything else"))
    assert.ok(trigger.includes("setVerifiedModalOpen(true)"))
    assert.ok(!trigger.includes("setSuccessAlertOpen"))
    assert.ok(page.includes("<Dialog open={verifiedModalOpen} onOpenChange={setVerifiedModalOpen}>"), "dismiss path (X/escape/overlay) is unchanged and does not show the alert")
  })

  it("the existing success modal is unchanged: same copy, icon and Done label", () => {
    for (const expected of [
      'className="max-w-[456px] pt-[50px]"',
      "size-12 rounded-full border-[8px]",
      "text-success-600 border-success-50 bg-success-100",
      '<CheckCircle className="size-6" />',
      "You’re all set!",
      "Your identity and location have been successfully verified. You can",
      "now access all platform features.",
      'className="mt-[50px] grid"',
    ]) {
      assert.ok(modal.includes(expected), expected)
    }
  })
})

describe("success alert: exact reference values (Figma 13101-47566)", () => {
  it("uses only the approved title and body", () => {
    assert.match(alert, /All set! Your identity and location are verified\./)
    assert.match(alert, /You now have full access to all features\./)
    // the pending-review story copy and Travel Mode copy are not reused
    for (const wrong of ["location verification was submitted", "notify you once it is reviewed", "Travel mode", "Travel Mode"]) {
      assert.ok(!alert.includes(wrong), wrong)
    }
  })

  it("container: 400px, p-4, gap-5 (20px), rounded-xl, gray-100 border, white, lg shadow", () => {
    for (const c of [
      "w-[400px]",
      "p-4",
      "gap-5",
      "rounded-xl",
      "border border-gray-100",
      "bg-white",
      "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08),0px_4px_6px_-2px_rgba(16,24,40,0.03)]",
      "items-start",
    ]) {
      assert.ok(alert.includes(c), c)
    }
  })

  it("featured icon: 66px, primary-50 fill, 9.9px primary-25 border, 24.75px primary-500 icon with the 0.38/-0.62 offset", () => {
    assert.ok(alert.includes("size-[66px]"))
    assert.ok(alert.includes("rounded-full border-[9.9px] border-primary-25 bg-primary-50"))
    assert.ok(alert.includes('<CheckCircle className="size-[24.75px] translate-x-[0.38px] -translate-y-[0.62px] text-primary-500" />'))
  })

  it("text: pt-0.5 column with a 4px gap, 14/20 semibold gray-900 title and 14/20 regular gray-600 body", () => {
    assert.ok(alert.includes("flex min-w-0 flex-1 flex-col gap-1 pt-0.5"))
    assert.ok(alert.includes('<ToastTitle className="text-sm font-semibold leading-5 text-gray-900">'))
    assert.ok(alert.includes('<ToastDescription className="text-sm font-normal leading-5 text-gray-600">'))
  })

  it("close button: 36px (size-9) at 8px from the top and right, gray-500 X of 20px", () => {
    assert.ok(alert.includes('className="absolute right-2 top-2 size-9 text-gray-500"'))
    assert.ok(alert.includes('<X className="size-5" />'))
    assert.ok(alert.includes("onClick={() => setSuccessAlertOpen(false)}"))
  })

  it("timing and placement follow the Travel Mode notification: 5s, swipe right, top-right viewport", () => {
    assert.ok(alert.startsWith('<ToastProvider duration={5000} swipeDirection="right">'))
    assert.ok(alert.includes("data-[state=open]:sm:slide-in-from-top-full"))
    assert.ok(alert.includes('className="top-5 right-5 left-auto bottom-auto w-auto max-w-[400px]'))
    assert.ok(alert.includes("onOpenChange={setSuccessAlertOpen}"))
  })
})

describe("success alert: boundaries", () => {
  it("is composed only of design-system components already exported from @/components/ui", () => {
    const imports = page.slice(page.indexOf("import {\n  Button,"), page.indexOf('} from "@/components/ui"'))
    for (const name of ["Toast,", "ToastDescription,", "ToastProvider,", "ToastTitle,", "ToastViewport,", "IconButton,"]) {
      assert.ok(imports.includes(name), name)
    }
    assert.ok(!/<(button|input|dialog)\b/.test(alert), "no raw html controls")
  })

  it("the Travel Mode notification, the flow and the protected files were not modified by this work", () => {
    const flow = read("components", "identity-verification-flow.tsx")
    assert.ok(!flow.includes("successAlert"))
    assert.ok(!flow.includes("All set! Your identity and location are verified."))
    assert.ok(!read("components", "security-settings.tsx").includes("successAlert"))
    assert.ok(!read("contexts", "auth.tsx").includes("successAlert"))
  })
})
