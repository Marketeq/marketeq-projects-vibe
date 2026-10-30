// Run: npx tsc src/lib/api/identity-learn-more-hidden.test.ts --outDir <tmp> --module commonjs
//   --target es2020 --skipLibCheck --esModuleInterop --types node --lib es2020,dom
//   && (cd frontend && node --test <tmp>)   # run from the frontend/ directory
// BTB-373: the help article is undecided, so no identity-verification screen shows Learn More.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8")
const identityFiles = [
  ["components", "identity-verification-flow.tsx"],
  ["stories", "identity-verification-entire.stories.tsx"],
  ["contexts", "identity-verification-host.tsx"],
  ["app", "identity-verification-preview", "preview-client.tsx"],
]

describe("identity-verification Learn More", () => {
  it("renders no Learn More in any identity-verification source", () => {
    for (const f of identityFiles) {
      assert.doesNotMatch(read(...f), /learn\s?more/i, f.join("/"))
    }
  })

  it("keeps the footer copy in the component and the Storybook story", () => {
    for (const f of identityFiles.slice(0, 2)) {
      assert.match(
        read(...f),
        /Your data is encrypted and handled securely\./,
        f.join("/")
      )
    }
  })

  it("leaves unrelated Learn More links untouched", () => {
    assert.match(read("app", "(group)", "billing", "page.tsx"), /Learn More/)
    assert.match(read("components", "update-password-form.tsx"), /Learn More/)
    assert.match(read("app", "checkout", "payment", "page.tsx"), /Learn more/)
  })
})
