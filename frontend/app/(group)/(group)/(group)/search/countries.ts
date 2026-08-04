/**
 * The vocabulary of the Location filters: countries, and nothing else.
 *
 * Every Location picker offers this list in full the moment it is focused,
 * alphabetically, rather than deriving suggestions from the records that
 * happen to exist — a country nobody is in yet is still a legitimate thing to
 * search for, and a picker whose contents shift with the catalogue is not one
 * a user can learn.
 *
 * Names come from Intl rather than a hand-maintained table, so they are
 * byte-for-byte the ones backend/apps/search-service/src/config/countries.ts
 * matches against (both ask Intl for the same 'en' display name of the same
 * ISO code). Keep the two code lists in step: only the CODES are enumerated,
 * because Intl can turn a code into a name but cannot list the codes.
 */

// ISO 3166-1 alpha-2 — a published standard that changes at most once every
// few years, which is why enumerating it is safe where hardcoding display
// names would not be.
const ISO_3166_ALPHA2 = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
]

/**
 * Null on a runtime without the region data, which leaves the list empty — the
 * picker then offers nothing rather than offering something that isn't a
 * country, matching how the backend degrades.
 */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" })
  } catch {
    return null
  }
})()

/**
 * Every ISO country's English display name, alphabetical, de-duplicated.
 *
 * Intl returns the input unchanged for a well-formed but unknown code, which
 * is how an unknown code is dropped. A handful of territories share their
 * parent's English name; only one entry is offered for each name, since the
 * backend expands a name back to all the codes it stands for.
 */
export const COUNTRIES: string[] = Array.from(
  new Set(
    ISO_3166_ALPHA2.map((code) => {
      if (!regionNames) return ""
      try {
        const name = regionNames.of(code)
        return name && name.toUpperCase() !== code ? name : ""
      } catch {
        return ""
      }
    }).filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b, "en"))

/** Comparison key — case and inner-whitespace insensitive. */
const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ")

const canonicalByKey = new Map(COUNTRIES.map((name) => [key(name), name]))

/**
 * The canonical spelling of a country the user typed, or "" if what they typed
 * is not a country. Location inputs use this to reject free text ("Berlin",
 * "remote") instead of sending a filter value that can never match, and to
 * fold "united states" into the one spelling the backend matches.
 */
export function canonicalCountry(value: string): string {
  return canonicalByKey.get(key(value ?? "")) ?? ""
}
