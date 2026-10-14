// Search configuration — single source of truth for Algolia index settings
// and filter field definitions. Used by search-service for validation and
// by algolia-service for index configuration.

export const ALGOLIA_INDEX_SETTINGS = {
  projects: {
    searchableAttributes: [
      'title',
      'description',
      'skills',
      'tags',
      'technologies',
      'industry',
      'project_category',
    ],
    attributesForFaceting: [
      'filterOnly(status)',
      'searchable(skills)',
      'searchable(tags)',
      'searchable(technologies)',
      // Carries the taxonomy leaf name (e.g. "Full Stack Development"), which
      // is what BOTH the sidebar's category and subcategory filters match
      // against — see SearchService.buildAlgoliaFilters. The record's
      // `subcategories` array is deliberately not faceted: it holds free-form
      // editorial tags ("SaaS", "Research"), not taxonomy names.
      'project_category',
      'project_type',
      'industry',
      'project_duration_range',
      'team_size_range',
      'location',
      'industries',
    ],
    // `rating` used to lead here, which made the "Featured" default ranking
    // identical to the dedicated Top Rated sort (its own replica ranks
    // purely by desc(rating) — see ALGOLIA_REPLICA_SETTINGS below) for any
    // listing that already had a rating set, so clicking Top Rated visibly
    // changed nothing. created_at now leads instead, rating stays as the
    // tiebreaker.
    customRanking: ['desc(created_at)', 'desc(rating)'],
    replicas: [
      'projects_sort_created_at_desc',
      'projects_sort_budget_asc',
      'projects_sort_budget_desc',
      'projects_sort_rating_desc',
    ],
  },

  talent: {
    searchableAttributes: [
      'name',
      'headline',
      'skills',
      'job_title',
      'bio',
      'tags',
      'categories',
      'subcategories',
    ],
    attributesForFaceting: [
      'filterOnly(status)',
      // G1 discovery gate: every talent query carries `gate_open:true` (see
      // AlgoliaClient), so Algolia filters BEFORE it counts hits, paginates and
      // builds facet counts. A record without this attribute can never match
      // and stays hidden until it is backfilled. filterOnly: never a facet the
      // sidebar can read or count.
      'filterOnly(gate_open)',
      // The platform account that owns the profile (identity-verification's
      // user id). Lets a gate change, which is keyed by account, find the
      // record without a CMS lookup. Filter-only for the same reason.
      'filterOnly(account_id)',
      'searchable(skills)',
      'searchable(tags)',
      'job_title',
      'experience_level',
      'availability',
      'location',
      'industries',
      'industry',
      'searchable(categories)',
      'searchable(subcategories)',
      // Backs the sidebar's Languages filter. Without this the attribute is
      // on the record but unfilterable — Algolia doesn't reject a filter on
      // an unfaceted attribute, it just silently matches nothing.
      'searchable(languages)',
      // The talent record carries both a free-text `location`
      // ("San Francisco, CA") and an ISO `country` ("US"). The Location
      // filter ORs across the two so either form matches.
      'country',
      // NOT needed to filter on — Algolia ranges over any numeric attribute
      // whether or not it's faceted, which is why the sidebar's other numeric
      // filters (rating, hourly_rate, projects_completed) work without an
      // entry here. It's faceted so the counts can be READ: the Client Success
      // Rate buckets are derived from the distribution profiles actually have
      // (see SearchService.getNumericBuckets), and a facet is the only way to
      // get that in one call.
      'client_success_rate',
      'rating',
    ],
    customRanking: ['desc(rating)', 'desc(projects_completed)'],
    replicas: [
      'talent_sort_rating_desc',
      'talent_sort_hourly_rate_asc',
      'talent_sort_hourly_rate_desc',
      'talent_sort_created_at_desc',
    ],
  },

  teams: {
    searchableAttributes: [
      'team_name',
      'description',
      'skills',
      'tags',
      'category',
    ],
    attributesForFaceting: [
      'filterOnly(status)',
      'searchable(skills)',
      'searchable(tags)',
      'category',
      'team_size_range',
      'availability',
      'location',
      'industries',
      'industry',
      'languages',
    ],
    customRanking: ['desc(rating)', 'desc(client_success_rate)'],
    replicas: [
      'teams_sort_rating_desc',
      'teams_sort_projects_completed_desc',
      'teams_sort_created_at_desc',
      'teams_sort_hourly_rate_asc',
      'teams_sort_hourly_rate_desc',
    ],
  },

  services: {
    searchableAttributes: [
      'title',
      'description',
      'skills',
      'tags',
      'category',
    ],
    attributesForFaceting: [
      'filterOnly(status)',
      'searchable(skills)',
      'searchable(tags)',
      // Services counterpart of the projects index's `project_category` —
      // see the comment there.
      'category',
      'pricing_model',
      'delivery_time',
      // Team Size is hidden on the Services sidebar — faceting on it here
      // would only build an index facet nothing reads. Restore alongside the
      // sidebar control if the filter comes back.
      // 'team_size_range',
      'location',
      'industries',
      'industry',
    ],
    // See the projects index above — created_at now leads instead of
    // rating so Featured/Best Match doesn't already coincide with the
    // dedicated Top Rated sort. orders_completed would be the more natural
    // "Featured" signal for services, but it's never populated on any
    // record today (always null — an indexing gap upstream of this
    // service), so it was a silent no-op that fell straight through to the
    // same rating-desc order as before.
    customRanking: ['desc(created_at)', 'desc(rating)'],
    replicas: [
      'services_sort_rating_desc',
      'services_sort_price_range_asc',
      'services_sort_price_range_desc',
      'services_sort_created_at_desc',
    ],
  },
} as const;

// Replica index settings overrides — each replica inherits the base index's
// ranking by default, making sort options useless. These overrides replace
// the ranking formula so the replica sorts purely by its target field.
//
// IMPORTANT: the attribute name in `ranking` must match the real field name
// on the indexed record, which is NOT always the same as the `sort.field`
// token used in the replica's own name / the API's sortBy param (e.g. the
// replica "projects_sort_budget_asc" ranks by the record's actual
// `budget_range` attribute, not a nonexistent `budget` attribute).
//
// KNOWN GAP: the talent and teams indices have no `created_at` (or
// equivalent) attribute on their records at all today — that's an indexing
// gap in whichever service populates those two indices, not something
// search-service controls. talent_sort_created_at_desc / teams_sort_created_at_desc
// exist and won't error, but degrade to the base index's default ranking
// until created_at is actually indexed for those two entities.
export const ALGOLIA_REPLICA_SETTINGS: Record<string, Record<string, any>> = {
  projects_sort_created_at_desc: { ranking: ['desc(created_at)'] },
  projects_sort_budget_asc: { ranking: ['asc(budget_range)'] },
  projects_sort_budget_desc: { ranking: ['desc(budget_range)'] },
  projects_sort_rating_desc: { ranking: ['desc(rating)'] },

  talent_sort_created_at_desc: { ranking: ['desc(created_at)'] },
  talent_sort_rating_desc: { ranking: ['desc(rating)'] },
  talent_sort_hourly_rate_asc: { ranking: ['asc(hourly_rate)'] },
  talent_sort_hourly_rate_desc: { ranking: ['desc(hourly_rate)'] },

  teams_sort_created_at_desc: { ranking: ['desc(created_at)'] },
  teams_sort_rating_desc: { ranking: ['desc(rating)'] },
  teams_sort_projects_completed_desc: { ranking: ['desc(projects_completed)'] },
  teams_sort_hourly_rate_asc: { ranking: ['asc(hourly_rate)'] },
  teams_sort_hourly_rate_desc: { ranking: ['desc(hourly_rate)'] },

  services_sort_created_at_desc: { ranking: ['desc(created_at)'] },
  services_sort_rating_desc: { ranking: ['desc(rating)'] },
  services_sort_price_range_asc: { ranking: ['asc(price_range)'] },
  services_sort_price_range_desc: { ranking: ['desc(price_range)'] },
}

// Sortable fields per category — single source of truth used by both
// SearchService (Algolia replica lookup) and DbFallbackService (ORDER BY
// allowlist) to validate a requested sort.field before using it. 'all' is
// intentionally a subset — rate/budget/price aren't comparable across mixed
// entity types on the "all" (multi-index) view.
export const SORTABLE_FIELDS: Record<string, string[]> = {
  talent: ['rating', 'hourly_rate', 'created_at'],
  teams: ['rating', 'hourly_rate', 'created_at'],
  projects: ['rating', 'budget', 'created_at'],
  services: ['rating', 'price_range', 'created_at'],
  all: ['rating', 'created_at'],
};

export function isValidSortField(category: string, field: string): boolean {
  return SORTABLE_FIELDS[category]?.includes(field) ?? false;
}

// Valid enum values for filter fields (used for validation)
export const FILTER_ENUMS = {
  project_duration_range: [
    '1 - 3 months',
    '3 - 6 months',
    '6 - 12 months',
    '12 - 24 months',
    '24+ months',
  ],
  team_size_range: [
    '1 - 5',
    '5 - 10',
    '10 - 25',
    '25 - 50',
    '50+',
  ],
  experience_level: [
    'Entry',
    'Intermediate',
    'Expert',
  ],
  availability: [
    'Full-Time',
    'Part-Time',
    'Hourly',
  ],
  pricing_model: [
    'Fixed',
    'Hourly',
    'Monthly',
  ],
  project_type: [
    'One-time',
    'Ongoing',
  ],
} as const;

// The free-text talent filters — Job Title and Location — are matched loosely
// rather than as exact values: "designer" finds "Product designer", "engineer"
// finds every engineer, "full stack engineer" finds "Full-stack engineer", and
// "united states" finds a profile whose country is stored as "US". The rule is
// to reduce both sides to lowercase alphanumeric words separated by single
// spaces, then ask whether the typed term appears in the value as a substring.
//
// Collapsing every run of punctuation to one space is what makes the hyphen
// cases work; it does NOT re-split joined words, so "fullstack" still won't
// find "Full-stack engineer".
//
// Two implementations of one rule, and they must stay in step or the same
// search would return different people depending on which backend answered
// it: normalizeLooseText is used by SearchService to pick matching values out
// of the Algolia facet (Algolia's filter grammar has no substring operator, so
// the matching cannot be expressed as a filter), while normalizedTextSql is
// the same reduction applied to a column so the DB fallback can compare with
// LIKE directly. Anything that changes one has to change the other.
export function normalizeLooseText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizedTextSql(column: string): string {
  return `btrim(regexp_replace(lower(${column}), '[^a-z0-9]+', ' ', 'g'))`;
}

// Which indexed attributes carry taxonomy category NAMES, per entity — the
// ones both the sidebar's category and subcategory filters match against (see
// SearchService.buildAlgoliaFilters). Used by GET /search/category-values to
// report the category names that actually have records behind them, so the
// sidebar can show a taxonomy pruned to that entity instead of the whole
// global tree.
//
// Projects and services each keep a single name on one attribute, so both of
// their filter keys match that one attribute. Talent splits its names over
// two: `categories` holds the broad disciplines and `subcategories` the
// specializations. Both are listed because a taxonomy name can legitimately
// arrive in either — the CMS chip fields are free text, so nothing forces a
// given depth into a given array — and because the pruned tree is built from
// the union of the two. Every filter matches across the whole list for that
// entity (SearchService.pushArrayFilterAcross), which is what keeps the
// offered tree and the filter in agreement: a name is offered exactly when
// some record carries it in one of these attributes, and the filter looks in
// all of them.
//
// Teams are deliberately absent: they carry a single flat `category` with no
// subcategory levels to drill into, so their sidebar uses CategoryDropdownChips
// against the unpruned tree.
export const CATEGORY_NAME_ATTRIBUTE: Record<string, string[]> = {
  projects: ['project_category'],
  services: ['category'],
  talent: ['categories', 'subcategories'],
};

// The sidebar filters whose options are derived from what publishers actually
// typed into their listings, rather than a hand-maintained list. Backs
// GET /search/filter-values, which reports each value together with how many
// listings use it, so a sidebar can offer the most common values for that
// entity and never present an option with nothing behind it.
//
// Per entity + filter field:
//   attribute — the indexed Algolia attribute the facet counts come from. It
//     must be the same attribute the filter matches against (see
//     SearchService.buildAlgoliaFilters), or the offered list and the filter
//     could disagree. Note `industries` is the filter/DTO key but the record
//     attribute is singular `industry`.
//   column — the column the DB fallback reads. For projects and services
//     that's the `text[]` column on the listings table; for talent it's the
//     column on the Payload child table that holds the value (see
//     DbFallbackService.CHILD_VALUE_TABLES, which declares which table).
//     `industries` is deliberately `industry`: despite the entity declaring
//     `name: 'industries'`, the real column in both tables is `industry`,
//     which is what the fallback's own filter clauses already use.
//
// Projects and services keep their array fields as plain columns on one table,
// so any `text[]` field can be added to them freely. Talent is here only for
// `job_title`, which Payload stores in a child table keyed by `_parent_id` —
// the fallback handles that shape separately. Talent's skills and industries
// live in child tables too and could follow the same route, but talent and
// teams reuse the `tags` key for fixed editorial badges ("All Stars",
// "Verified") that must not be replaced by whatever those records carry, so
// `tags` in particular must stay off talent.
export const FILTER_VALUE_SOURCES: Record<
  string,
  Record<string, { attribute: string; column: string }>
> = {
  projects: {
    tags: { attribute: 'tags', column: 'tags' },
    // The Algolia attribute is singular but the listings.project column is
    // PLURAL — the two names genuinely differ here, which is what having both
    // fields is for. (listings.teams is the singular `industry`, but teams
    // have no derived filter values, so they never reach this map.)
    industries: { attribute: 'industry', column: 'industries' },
    skills: { attribute: 'skills', column: 'skills' },
  },
  services: {
    tags: { attribute: 'tags', column: 'tags' },
    // PLURAL column — see projects above.
    industries: { attribute: 'industry', column: 'industries' },
    skills: { attribute: 'skills', column: 'skills' },
  },
  talent: {
    // The talent index carries the profile's headline as `job_title` (see
    // SyncService.syncTalent), which is the same attribute the sidebar's Job
    // Title filter matches against — so every offered title has a profile
    // behind it. The DB column is the child table's `headline`.
    job_title: { attribute: 'job_title', column: 'headline' },
    skills: { attribute: 'skills', column: 'name' },
    // WATCH THE PLURAL — this is the exact opposite of projects/services
    // above, which carry the singular `industry`. Talent records index the
    // plural `industries` and leave `industry` undefined (see
    // SyncService.syncTalent). Both attributes are faceted on the talent index
    // and pushIndustryFilter ORs across the pair, so the filter matches either
    // way; the values must come from the one that actually holds them.
    industries: { attribute: 'industries', column: 'name' },
    // The child table's column is `language`, singular and NOT `name` like
    // every other talent child table.
    languages: { attribute: 'languages', column: 'language' },
    // Derived from the index only — there is deliberately no CHILD_VALUE_TABLES
    // entry, because talent has no tags table (or any tags field) in the CMS
    // at all. `column` is unused for this field and named for consistency.
    //
    // READ THIS BEFORE RELYING ON IT: the values currently in the `tags` facet
    // are stale duplicates of each profile's `skills`, left over from an older
    // indexing pass. talent-profile-sync now emits `tags: []`, so the moment a
    // profile is re-synced its tags disappear and this list shrinks toward
    // empty. Every option offered does return results today, but the field has
    // no durable source behind it — it needs either a real tags field on the
    // profile or the Tags section dropped from the Talent sidebar.
    tags: { attribute: 'tags', column: 'name' },
    // Backs the Talent sidebar's Location picker, which used to offer a
    // hardcoded country list where all but one option matched nobody.
    //
    // COUNTRIES ONLY — cities are never offered. Unlike every other field here
    // this one is NOT read verbatim off `attribute`: a talent's location lives
    // in two places, the free-text `location` ("San Francisco, CA") and the
    // ISO `country` ("US"), and only the latter is a country. So both the
    // offered values and the filter go through `country` alone
    // (SearchService.countryFilterValues / pushTalentLocationFilter), with the
    // code shown by its display name ("United States") so the option reads the
    // way the result card labels it and the way a user would type it.
    //
    // `attribute` stays `location` because it names the FILTER FIELD the
    // sidebar asks for; the attribute actually read is picked in
    // getFilterValues, which is also where the city/country split lives.
    //
    // There is deliberately no DB fallback: talent has no LISTING_TABLES entry
    // and no location child table, so arrayValueCounts returns {} and the
    // picker simply offers nothing rather than offering dead options.
    // `column` is unused here and named for consistency.
    location: { attribute: 'location', column: 'location' },
  },
  teams: {
    // Countries only, same as talent above — but teams have no `country`
    // attribute at all (see SyncService.syncTeam), just the one free-text
    // `location`. So the offered values are the country-named entries of that
    // facet and nothing else: a team filed as "Germany" is offered, one filed
    // as "Berlin, Germany" is not. The per-value guarantee still holds — every
    // option has a team behind it — and unlike talent the filter matches
    // `location` verbatim (the ordinary pushArrayFilter path), because that is
    // the attribute the value was read from.
    //
    // No DB fallback, for the same reason as talent's entry.
    location: { attribute: 'location', column: 'location' },
  },
};

/**
 * Sidebar filters that read as ranges rather than values — the numeric
 * counterpart of FILTER_VALUE_SOURCES above, backing GET
 * /search/numeric-buckets.
 *
 * The ladder below is the full set the sidebar renders — the section is a
 * fixed part of the design and shows every rung whether or not anyone reaches
 * it. What the endpoint adds is a live `count` per rung, read off the index.
 *
 * That is a weaker promise than the derived value filters make (they only ever
 * offer a value some record carries), and deliberately so: the rungs are a
 * product decision — "95% +" is a meaningful cut, "93.7% +" is not — unlike a
 * tag or a skill, which is only ever whatever someone typed, so they can't be
 * inferred from the data and can't be dropped without changing the layout.
 *
 * `attribute` must be the same one buildAlgoliaFilters ranges over for this
 * field, or the counts would describe a different filter than the one the
 * checkbox applies.
 */
export const NUMERIC_BUCKET_SOURCES: Record<
  string,
  Record<
    string,
    { attribute: string; buckets: { label: string; min?: number; max?: number }[] }
  >
> = {
  talent: {
    // Buckets are open-ended on purpose ("90% +" means at-least, not 90-95),
    // matching the single `client_success_rate_min` bound the filter sends —
    // there is no max key for this field, so a capped bucket would be
    // unrepresentable.
    client_success_rate: {
      attribute: 'client_success_rate',
      buckets: [
        { label: '95% +', min: 95 },
        { label: '90% +', min: 90 },
        { label: '80% +', min: 80 },
        // The opt-out. Bounded by nothing on purpose: it isn't a range, it's
        // "don't filter on this", so getNumericBuckets leaves its count unset
        // rather than reporting a number — see the note there.
        { label: 'Any' },
      ],
    },
    rating: {
      attribute: 'rating',
      buckets: [
        { label: '5.0', min: 5 },
        { label: '4.5 & above', min: 4.5 },
        { label: '4.0 & above', min: 4 },
      ],
    },
  },
};

// How many values each filter shows by default. These are product decisions
// tied to the control's shape: Tags is a fixed checkbox list, so seven fits
// the sidebar without scrolling; Industry is a scrollable dropdown and Skills
// a type-ahead combobox, so both can carry the full realistic set and are
// capped only to stay sane. Ranking is by popularity either way, so a cut
// only ever drops the least-used values.
export const FILTER_VALUE_LIMITS: Record<string, number> = {
  tags: 7,
  industries: 50,
  skills: 100,
  // Job Title is the same type-ahead combobox shape as Skills, so it gets the
  // same allowance.
  job_title: 100,
  // Same combobox shape again, but the realistic ceiling is the number of
  // languages people actually list, which is far below either.
  languages: 50,
  // Same combobox shape again. Location is countries only, so the vocabulary
  // is bounded at ~250 no matter how many records exist; the cap keeps the
  // picker to the countries people are actually in rather than trimming a
  // list that would otherwise grow without limit.
  location: 50,
};

// Fallback default for a field with no entry above, and the ceiling a caller
// may request — the cap only exists to keep an arbitrary ?limit= from turning
// the endpoint into a full dump of every value in the index.
export const DEFAULT_FILTER_VALUE_LIMIT = 20;
export const MAX_FILTER_VALUE_LIMIT = 200;

// Facet fields per category — returned by GET /search/facets
export const FACET_FIELDS: Record<string, string[]> = {
  talent: ['skills', 'job_title', 'experience_level', 'availability', 'location', 'industries', 'categories', 'subcategories'],
  teams: ['skills', 'category', 'team_size_range', 'availability', 'location', 'industries', 'languages'],
  projects: ['skills', 'project_category', 'project_type', 'industry', 'project_duration_range', 'team_size_range', 'technologies'],
  // 'team_size_range' omitted — the Services sidebar hides that filter, so
  // requesting its facet counts on every Services search buys nothing.
  services: ['skills', 'category', 'pricing_model'],
};
