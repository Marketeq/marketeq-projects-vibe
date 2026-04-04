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
  if (!firstName && !lastName && !recentJobTitleOrEmail) return []

  const clean = (value: string) =>
    (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim()

  const f = clean(firstName)
  const l = clean(lastName)
  const lInitial = l.charAt(0)

  const sourceValue = (recentJobTitleOrEmail || "").toLowerCase()
  const sourceLocal = ((sourceValue || "").split("@")[0] || "").toLowerCase()
  const sourceTextTokens = Array.from(
    new Set((sourceLocal.match(/[a-z]+/g) || []).filter((token) => token.length >= 2))
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

  const suggestions: string[] = []
  const seen = new Set<string>()

  const add = (candidate: string) => {
    const normalized = clean(candidate)
    if (!normalized || normalized.length < 3) return
    if (!/^[a-z0-9]+$/.test(normalized)) return
    if (seen.has(normalized)) return

    if (f && normalized.indexOf(f) !== normalized.lastIndexOf(f)) return
    if (l && normalized.indexOf(l) !== normalized.lastIndexOf(l)) return
    if (/(\d{2,})\1/.test(normalized) || /(\d)\1{2,}/.test(normalized)) return

    seen.add(normalized)
    suggestions.push(normalized)
  }

  add(f)
  add(l)
  add(`${f}${lInitial}`)
  add(`${f}${num}`)
  add(`${f}${num}${lInitial}`)
  add(`${f}${l}`)
  add(`${f}${l}${num}`)
  add(`${l}${f}`)
  add(`${l}${num}`)

  add(`${f}${sourceText}`)
  add(`${sourceText}${f}`)
  add(`${sourceText}${f}${num}`)
  add(`${f}${sourceText}${num}`)
  add(sourceText)
  add(`${sourceText}${l}`)
  add(`${f}${sourceText}${lInitial}`)
  add(`${f}${sourceText}${secondarySourceText}`)

  return suggestions
    .sort((a, b) => {
      const aHasLast = l ? a.includes(l) || a.endsWith(lInitial) : false
      const bHasLast = l ? b.includes(l) || b.endsWith(lInitial) : false
      if (aHasLast !== bHasLast) return aHasLast ? -1 : 1
      return a.length - b.length
    })
    .slice(0, 20)
}
