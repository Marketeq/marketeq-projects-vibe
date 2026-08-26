// utils/username.ts

function getRandomInt(max: number): number {
  if (max <= 0) return 0

  const cryptoObject = globalThis.crypto
  if (cryptoObject?.getRandomValues) {
    const range = Math.floor(0x100000000 / max) * max
    const randomValues = new Uint32Array(1)

    do {
      cryptoObject.getRandomValues(randomValues)
    } while (randomValues[0] >= range)

    return randomValues[0] % max
  }

  return Math.floor(Math.random() * max)
}

export function generateUsernameSuggestions(
  firstName: string,
  _lastName: string,
  recentJobTitleOrEmail = ""
): string[] {
  const clean = (value: string) =>
    (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim()

  const f = clean(firstName)

  // Extract tokens from all source material (jobTitle, role, email)
  const sourceValue = (recentJobTitleOrEmail || "").toLowerCase()
  const sourceLocal = ((sourceValue || "").split("@")[0] || "").toLowerCase()
  const allSourceText = sourceValue.split("@")[0] || sourceValue
  const sourceTextTokens = Array.from(
    new Set(
      (allSourceText.match(/[a-z]+/g) || []).filter(
        (token) => token.length >= 2
      )
    )
  )
  const sourceNumberTokens = Array.from(
    new Set((sourceLocal.match(/\d+/g) || []).filter(Boolean))
  )

  const sourceText =
    sourceTextTokens.find((token) => token !== f) || ""
  const secondarySourceText =
    sourceTextTokens.find(
      (token) => token !== sourceText && token !== f
    ) || ""
  const num = sourceNumberTokens[0] || String(10 + getRandomInt(90))
  const num2 = String(10 + getRandomInt(90))

  // Two buckets, interleaved at the end, so the row alternates a longer
  // name+title handle with a short one instead of running all of one shape.
  // Separators (. and _) ride on the longer forms, where they read as a break
  // between the name and the job title.
  const shortForms: string[] = []
  const longForms: string[] = []
  const seen = new Set<string>()

  // Unlike clean(), this keeps "_" so separated handles survive. Dots are NOT
  // allowed: USERNAME_PATTERN is /^[a-z0-9_]+$/ on the backend
  // (user-mangement/dtos/username-validation.ts and talent/dto/
  // create-talent.dto.ts) and /^[a-zA-Z0-9_]+$/ on the client, so a suggestion
  // containing "." would be rejected the moment it was picked.
  const normalize = (value: string) =>
    (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")

  const add = (candidate: string, bucket: string[] = shortForms) => {
    const normalized = normalize(candidate)
    if (!normalized || normalized.length < 3 || normalized.length > 24) return
    if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(normalized)) return
    if (seen.has(normalized)) return

    if (f && normalized.indexOf(f) !== normalized.lastIndexOf(f)) return
    if (/(\d{2,})\1/.test(normalized) || /(\d)\1{2,}/.test(normalized)) return

    seen.add(normalized)
    bucket.push(normalized)
  }

  // The spec is "first name + job title" (docs/md/User Service/User Onboarding/
  // Suggested Usernames Based on First Name and Job Title.md), so combinations
  // of the two lead. Bare job-title words like "chief" or "product" are not
  // anybody's username and must not come first.
  if (f) {
    add(f, shortForms)
    add(`${f}${num}`, shortForms)
    add(`${f}${num2}`, shortForms)

    for (const token of sourceTextTokens) {
      add(`${f}${token}`, longForms)
      add(`${f}_${token}${num}`, longForms)
      add(`${f}_${token}`, longForms)
      add(`${token}${f}`, longForms)
      add(`${f}${token}${num}`, longForms)
      add(`${token}_${f}`, longForms)
      // Short counterparts built off the same token
      add(`${f}${token.slice(0, 3)}`, shortForms)
      add(`${token}${num}`, shortForms)
    }

    // Two job-title words, e.g. christopher.productofficer
    for (let i = 0; i < sourceTextTokens.length; i++) {
      for (let j = i + 1; j < sourceTextTokens.length; j++) {
        add(`${f}${sourceTextTokens[i]}${sourceTextTokens[j]}`, longForms)
        add(`${f}_${sourceTextTokens[i]}${sourceTextTokens[j]}`, longForms)
      }
    }
  }

  // Job-title-only forms are a fallback, not the headline
  for (const token of sourceTextTokens) {
    add(token, shortForms)
    add(`${token}${num2}`, shortForms)
  }
  for (let i = 0; i < sourceTextTokens.length; i++) {
    for (let j = i + 1; j < sourceTextTokens.length; j++) {
      add(`${sourceTextTokens[i]}${sourceTextTokens[j]}`, longForms)
      add(`${sourceTextTokens[i]}_${sourceTextTokens[j]}`, longForms)
      add(`${sourceTextTokens[i]}${sourceTextTokens[j]}${num}`, longForms)
    }
  }

  // Email local part as-is (stripped of special chars)
  const emailClean = clean(sourceLocal)
  add(emailClean, shortForms)
  add(`${emailClean}${num}`, shortForms)

  // Top up so the row has enough to fill even on a wide screen
  const bases = [f, sourceText, emailClean].filter((b) => b && b.length >= 2)
  for (const base of bases) {
    for (let i = 0; i < 4; i++) {
      add(`${base}${String(10 + getRandomInt(990))}`, shortForms)
    }
  }

  // Nothing to build from - no first name, no job title, no email. Without
  // this the function returns an empty array and step 4 renders no suggestions
  // at all. Fall back to neutral, professional handles so the user always has
  // something to pick from or edit.
  if (shortForms.length === 0 && longForms.length === 0) {
    const GENERIC_BASES = [
      "creator",
      "builder",
      "maker",
      "specialist",
      "consultant",
      "freelancer",
      "professional",
      "designer",
      "developer",
      "strategist",
    ]
    for (const base of GENERIC_BASES) {
      add(`${base}${String(10 + getRandomInt(90))}`, shortForms)
      add(`${base}_${String(10 + getRandomInt(990))}`, longForms)
    }
  }

  // Interleave long/short so any prefix of the list is a mix. The row renders
  // a dynamic number of these based on its measured width, so ordering has to
  // hold up at every cut-off point, not just at the end.
  const mixed: string[] = []
  const longest = Math.max(shortForms.length, longForms.length)
  for (let i = 0; i < longest; i++) {
    if (longForms[i]) mixed.push(longForms[i])
    if (shortForms[i]) mixed.push(shortForms[i])
  }

  return mixed.slice(0, 30)
}
