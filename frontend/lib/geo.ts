// Location helpers. Profile locations arrive at varying granularity
// ("San Francisco, CA", "CA", "New York", "United States", …). For the
// project team display we want a country. When the value is a US state
// (or a US alias) resolve it to "USA"; otherwise take the last comma
// segment (usually the country) and return it as-is.

const US_STATES = new Set([
  // abbreviations
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS",
  "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "DC",
  // full names
  "ALABAMA", "ALASKA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO",
  "CONNECTICUT", "DELAWARE", "FLORIDA", "GEORGIA", "HAWAII", "IDAHO",
  "ILLINOIS", "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA", "MAINE",
  "MARYLAND", "MASSACHUSETTS", "MICHIGAN", "MINNESOTA", "MISSISSIPPI",
  "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA", "NEW HAMPSHIRE", "NEW JERSEY",
  "NEW MEXICO", "NEW YORK", "NORTH CAROLINA", "NORTH DAKOTA", "OHIO",
  "OKLAHOMA", "OREGON", "PENNSYLVANIA", "RHODE ISLAND", "SOUTH CAROLINA",
  "SOUTH DAKOTA", "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINIA",
  "WASHINGTON", "WEST VIRGINIA", "WISCONSIN", "WYOMING",
])

const US_ALIASES = new Set([
  "USA", "US", "U.S.", "U.S.A.", "UNITED STATES",
  "UNITED STATES OF AMERICA", "AMERICA",
])

export const countryOf = (loc?: string | null): string => {
  if (!loc) return ""
  const parts = loc
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const last = parts.length ? parts[parts.length - 1] : loc.trim()
  const up = last.toUpperCase()
  if (US_STATES.has(up) || US_ALIASES.has(up)) return "USA"
  return last
}
