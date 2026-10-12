// Resolves a country's common display name (what CountriesCombobox's
// value/onValueChange work in — see own-combobox.tsx, a frozen Storybook
// component that exposes no code prop) to its ISO alpha-2 code, using the
// same shared `countriesCache` own-combobox.tsx itself populates and
// exports. Never maintains a second, independent name->code table — that
// would risk silently drifting from the combobox's own list.
//
// Returns null (never a guess) when the cache isn't populated yet or the
// name has no match. Callers must treat null as "country code not
// resolvable yet," not as a reason to fall back to a fabricated code.
import { countriesCache } from "@/components/own-combobox"

export function resolveCountryCodeByName(countryName: string): string | null {
  const list = countriesCache
  if (!list || !countryName) return null
  const match = list.find((country) => country.name.common === countryName)
  return match ? match.cca2 : null
}
