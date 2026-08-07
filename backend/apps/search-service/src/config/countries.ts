/**
 * Country recognition for the Location filters.
 *
 * The Location pickers offer countries only — never cities. Talent records
 * carry an ISO `country` attribute, so recognising a country there is just a
 * code lookup. Teams do not: a team's location is a single free-text string
 * ("Berlin, Germany", "Germany", "Remote"), so the only way to offer countries
 * for teams without changing what is stored is to recognise which of those
 * strings ARE countries and drop the rest. That is what this module is for.
 *
 * Names come from Intl rather than a hand-maintained table, so the display
 * name a filter option shows is byte-for-byte the one the result card renders
 * for the same country — the two can't drift apart, and there is no country
 * list to keep up to date. Only the CODES are enumerated here, because Intl
 * can turn a code into a name but cannot list the codes.
 */

// ISO 3166-1 alpha-2. The set is a published standard that changes at most
// once every few years, which is why enumerating it is safe where hardcoding
// display names would not be.
const ISO_3166_ALPHA2 = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
] as const;

/**
 * Null on a runtime without the region data, which leaves every lookup below
 * returning '' — the Location pickers then offer nothing rather than offering
 * cities, which is the safer degradation for a country-only filter.
 */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    return null;
  }
})();

/**
 * An ISO country code's English display name, or '' if it isn't one.
 *
 * Intl returns the input unchanged for a well-formed but unknown code, which
 * is how an unknown code is told apart from a real one.
 */
export function countryDisplayName(code: string): string {
  if (!regionNames || !code) return '';
  try {
    const name = regionNames.of(code.toUpperCase());
    return name && name.toUpperCase() !== code.toUpperCase() ? name : '';
  } catch {
    return '';
  }
}

/** Comparison key — case and surrounding punctuation/whitespace insensitive. */
function key(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Display name -> codes, and code -> display name, for every ISO country.
 *
 * A name maps to a LIST of codes because Intl gives a handful of territories
 * the same English name as their parent; filtering has to cover all of them or
 * an offered option could miss records filed under the sibling code.
 */
const { codesByName, nameByCode } = (() => {
  const codesByName = new Map<string, string[]>();
  const nameByCode = new Map<string, string>();
  for (const code of ISO_3166_ALPHA2) {
    const name = countryDisplayName(code);
    if (!name) continue;
    nameByCode.set(code, name);
    const existing = codesByName.get(key(name));
    if (existing) existing.push(code);
    else codesByName.set(key(name), [code]);
  }
  return { codesByName, nameByCode };
})();

/**
 * The canonical display name for a value that names a country, or '' if it
 * doesn't name one.
 *
 * Accepts either an ISO code ("US") or a name in any casing ("united states"),
 * and returns the one canonical spelling ("United States") so counts for the
 * same country arriving in different forms merge into a single filter option.
 *
 * Deliberately strict about what counts as a country: "San Francisco, CA" and
 * "Berlin, Germany" both return '' rather than being parsed down to a country,
 * because a substring rule would also promote "Georgia" out of "Georgia, USA"
 * and file a US profile under the wrong country. A record that wants to be
 * findable by country stores the country as its whole location string.
 */
export function toCountryName(value: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const byCode = nameByCode.get(trimmed.toUpperCase());
    if (byCode) return byCode;
  }
  const codes = codesByName.get(key(trimmed));
  return codes ? (nameByCode.get(codes[0]) ?? '') : '';
}

/**
 * Every ISO code a country display name stands for — what a `country:"..."`
 * filter clause has to be built from, since records store the code and the
 * picker offers the name. Empty for a value that names no country.
 */
export function countryCodesForName(value: string): string[] {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  if (/^[A-Za-z]{2}$/.test(trimmed) && nameByCode.has(trimmed.toUpperCase())) {
    return [trimmed.toUpperCase()];
  }
  return codesByName.get(key(trimmed)) ?? [];
}
