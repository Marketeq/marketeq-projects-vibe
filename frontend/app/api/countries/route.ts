import { NextResponse } from "next/server"

const FALLBACK_COUNTRY_CODES: Array<{ common: string; cca2: string }> = [
  { common: "United States", cca2: "US" },
  { common: "United Kingdom", cca2: "GB" },
  { common: "Canada", cca2: "CA" },
  { common: "India", cca2: "IN" },
  { common: "Germany", cca2: "DE" },
  { common: "Australia", cca2: "AU" },
  { common: "Brazil", cca2: "BR" },
  { common: "Philippines", cca2: "PH" },
  { common: "Ukraine", cca2: "UA" },
  { common: "Poland", cca2: "PL" },
  { common: "Pakistan", cca2: "PK" },
]

const FALLBACK_COUNTRIES = FALLBACK_COUNTRY_CODES.map(({ common, cca2 }) => ({
  cca2,
  flags: {
    png: `https://flagcdn.com/36x27/${cca2.toLowerCase()}.png`,
    svg: `https://flagcdn.com/${cca2.toLowerCase()}.svg`,
    alt: common,
  },
  name: {
    common,
    official: common,
    nativeName: {},
  },
}))

export async function GET() {
  try {
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,flags,cca2",
      { next: { revalidate: 60 * 60 * 24 } }
    )

    if (!response.ok) {
      return NextResponse.json(FALLBACK_COUNTRIES)
    }

    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json(FALLBACK_COUNTRIES)
  }
}
