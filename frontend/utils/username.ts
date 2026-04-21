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
  lastName: string,
  recentJobTitleOrEmail = ""
): string[] {
  const clean = (value: string) =>
    (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim()

  const f = clean(firstName)
  const l = clean(lastName)
  const lInitial = l.charAt(0)

  // Extract tokens from all source material (teamName, role, email)
  const sourceValue = (recentJobTitleOrEmail || "").toLowerCase()
  // Split on @ to get email local part, but also keep the full string for non-email tokens
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
    sourceTextTokens.find((token) => token !== f && token !== l) || ""
  const secondarySourceText =
    sourceTextTokens.find(
      (token) => token !== sourceText && token !== f && token !== l
    ) || ""
  const num = sourceNumberTokens[0] || String(10 + getRandomInt(90))
  const num2 = String(10 + getRandomInt(90))

  const suggestions: string[] = []
  const seen = new Set<string>()

  const add = (candidate: string) => {
    const normalized = clean(candidate)
    if (!normalized || normalized.length < 3 || normalized.length > 24) return
    if (!/^[a-z][a-z0-9_]*$/.test(normalized)) return
    if (seen.has(normalized)) return

    if (f && normalized.indexOf(f) !== normalized.lastIndexOf(f)) return
    if (l && normalized.indexOf(l) !== normalized.lastIndexOf(l)) return
    if (/(\d{2,})\1/.test(normalized) || /(\d)\1{2,}/.test(normalized)) return

    seen.add(normalized)
    suggestions.push(normalized)
  }

  // Name-based combinations
  add(f)
  add(l)
  add(`${f}${lInitial}`)
  add(`${f}${num}`)
  add(`${f}${num}${lInitial}`)
  add(`${f}${l}`)
  add(`${f}${l}${num}`)
  add(`${l}${f}`)
  add(`${l}${num}`)

  // Name + source combinations
  add(`${f}${sourceText}`)
  add(`${sourceText}${f}`)
  add(`${sourceText}${f}${num}`)
  add(`${f}${sourceText}${num}`)
  add(sourceText)
  add(`${sourceText}${l}`)
  add(`${f}${sourceText}${lInitial}`)
  add(`${f}${sourceText}${secondarySourceText}`)

  // Source token combinations (for cases where name is empty)
  for (const token of sourceTextTokens) {
    add(token)
    add(`${token}${num}`)
    add(`${token}${num2}`)
  }
  // Combine pairs of source tokens
  for (let i = 0; i < sourceTextTokens.length; i++) {
    for (let j = i + 1; j < sourceTextTokens.length; j++) {
      add(`${sourceTextTokens[i]}${sourceTextTokens[j]}`)
      add(`${sourceTextTokens[j]}${sourceTextTokens[i]}`)
      add(`${sourceTextTokens[i]}${sourceTextTokens[j]}${num}`)
    }
  }

  // Email local part as-is (stripped of special chars)
  const emailClean = clean(sourceLocal)
  add(emailClean)
  add(`${emailClean}${num}`)

  // If still not enough, add random suffix variations
  if (suggestions.length < 6) {
    const bases = [f, l, sourceText, emailClean].filter(
      (b) => b && b.length >= 2
    )
    for (const base of bases) {
      for (let i = 0; i < 3 && suggestions.length < 10; i++) {
        add(`${base}${String(10 + getRandomInt(990))}`)
      }
    }
  }

  return suggestions
    .sort((a, b) => {
      const aHasLast = l ? a.includes(l) || a.endsWith(lInitial) : false
      const bHasLast = l ? b.includes(l) || b.endsWith(lInitial) : false
      if (aHasLast !== bHasLast) return aHasLast ? -1 : 1
      return a.length - b.length
    })
    .slice(0, 20)
}
