/**
 * search-config.ts — Single source of truth for all search-related field
 * mappings across Marketeq entities (Talent, Teams, Projects, Services).
 *
 * Derived from docs:
 *   - /docs/md/Search Service/Sample search-config.ts.md
 *   - /docs/md/Search Service/Finalized Filter Fields table for project search.md
 *   - /docs/md/Search Service/Structured Project Data Dictionary_.md
 *   - /docs/md/Search Service/Global Search Category Logic Guide.md
 *
 * Responsibilities:
 *  1. Map backend (Algolia) fields → frontend display labels
 *  2. Declare which fields are searchable / filterable
 *  3. Serve as the reference used by both the sidebar filter UI and the
 *     API client when building requests to the search service.
 */

export type SearchEntity = "talent" | "teams" | "projects" | "services"

export type FieldType =
  | "string"
  | "array"
  | "number"
  | "numberRange"
  | "boolean"
  | "enum"

export interface FieldMapping {
  /** Human-facing label shown in the sidebar/filter UI */
  frontendLabel: string
  /** Exact field name on the Algolia index / backend contract */
  algoliaField: string
  type: FieldType
  /** Contributes to the full-text match */
  searchable?: boolean
  /** Exposed as a filter facet */
  filterable?: boolean
  /** Preset enum values (for enum types) */
  enumValues?: readonly string[]
  notes?: string
}

export const TEAM_SIZE_VALUES = [
  "1-2 members",
  "2-5 members",
  "5-10 members",
  "10-15 members",
  "15-20 members",
  "20+ members",
] as const

export const PROJECT_DURATION_VALUES = [
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12-18 months",
  "18-24 months",
  "24+ months",
] as const

export const EXPERIENCE_LEVEL_VALUES = [
  "Junior (1-3 years)",
  "Middle (3-5 years)",
  "Senior (5-7 years)",
  "Lead (7-10 years)",
  "Super Senior (10+ years)",
] as const

export const searchConfig: Record<SearchEntity, FieldMapping[]> = {
  talent: [
    { frontendLabel: "Name",                algoliaField: "name",               type: "string",      searchable: true },
    { frontendLabel: "Job Title",           algoliaField: "job_title",          type: "string",      searchable: true, filterable: true },
    { frontendLabel: "Headline",            algoliaField: "headline",           type: "string",      searchable: true },
    { frontendLabel: "Skills",              algoliaField: "skills",             type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Location",            algoliaField: "location",           type: "string",      searchable: true, filterable: true },
    { frontendLabel: "Tags",                algoliaField: "tags",               type: "array",       filterable: true },
    { frontendLabel: "About Me",            algoliaField: "about_me",           type: "string",      searchable: true },
    { frontendLabel: "Overview",            algoliaField: "overview",           type: "string",      searchable: true },
    { frontendLabel: "Certifications",      algoliaField: "certifications",     type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Languages",           algoliaField: "languages",          type: "array",       filterable: true },
    { frontendLabel: "Industry Knowledge",  algoliaField: "industries",         type: "array",       filterable: true },
    { frontendLabel: "Hourly Rate",         algoliaField: "hourly_rate",        type: "numberRange", filterable: true },
    {
      frontendLabel: "Availability",
      algoliaField: "availability",
      type: "enum",
      filterable: true,
      enumValues: ["Online", "Offline"],
    },
    {
      frontendLabel: "Experience Level",
      algoliaField: "experience_level",
      type: "enum",
      filterable: true,
      enumValues: [...EXPERIENCE_LEVEL_VALUES],
    },
    { frontendLabel: "Rating",              algoliaField: "rating",             type: "numberRange", filterable: true },
    { frontendLabel: "Projects Highlighted",algoliaField: "project_highlights", type: "string",      searchable: true },
  ],

  teams: [
    { frontendLabel: "Team Name",           algoliaField: "team_name",          type: "string",      searchable: true },
    { frontendLabel: "Category",            algoliaField: "category",           type: "string",      filterable: true, notes: "Team specialization e.g. Development, Design" },
    { frontendLabel: "Services",            algoliaField: "services",           type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Skills",              algoliaField: "skills",             type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Location",            algoliaField: "location",           type: "string",      searchable: true, filterable: true },
    { frontendLabel: "Tags",                algoliaField: "tags",               type: "array",       filterable: true },
    { frontendLabel: "Industry Knowledge",  algoliaField: "industries",         type: "array",       filterable: true },
    { frontendLabel: "Hourly Rate",         algoliaField: "hourly_rate",        type: "numberRange", filterable: true },
    {
      frontendLabel: "Team Size",
      algoliaField: "team_size_range",
      type: "enum",
      filterable: true,
      enumValues: [...TEAM_SIZE_VALUES],
    },
    { frontendLabel: "Average Rating",       algoliaField: "rating",             type: "numberRange", filterable: true },
    { frontendLabel: "Projects Completed",   algoliaField: "projects_completed", type: "numberRange", filterable: true },
    { frontendLabel: "Client Success Rate",  algoliaField: "client_success_rate",type: "numberRange", filterable: true },
    {
      frontendLabel: "Availability",
      algoliaField: "availability",
      type: "enum",
      filterable: true,
      enumValues: ["Online Now", "Available Within 24 Hours"],
    },
    { frontendLabel: "Languages",            algoliaField: "languages",          type: "array",       filterable: true },
    { frontendLabel: "Description",          algoliaField: "description",        type: "string",      searchable: true },
    { frontendLabel: "Specialties",          algoliaField: "specialties",        type: "array",       searchable: true },
    { frontendLabel: "Stack",                algoliaField: "stack",              type: "array",       searchable: true },
    { frontendLabel: "Featured Projects",    algoliaField: "featured_projects",  type: "string",      searchable: true },
  ],

  projects: [
    { frontendLabel: "Title",           algoliaField: "project_title",        type: "string",      searchable: true },
    { frontendLabel: "Subtitle",        algoliaField: "subtitle",             type: "string",      searchable: true },
    { frontendLabel: "Overview",        algoliaField: "overview",             type: "string",      searchable: true },
    { frontendLabel: "Description",     algoliaField: "description",          type: "string",      searchable: true },
    { frontendLabel: "Technologies",    algoliaField: "technologies",         type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Skills",          algoliaField: "skills",               type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Subcategories",   algoliaField: "subcategories",        type: "array",       searchable: true },
    { frontendLabel: "Project Lead",    algoliaField: "project_lead",         type: "string",      searchable: true },
    { frontendLabel: "Deliverables",    algoliaField: "deliverables",         type: "string",      searchable: true },
    { frontendLabel: "Category",        algoliaField: "project_category",     type: "string",      filterable: true, notes: "High-level service or category" },
    { frontendLabel: "Project Type",    algoliaField: "project_type",         type: "string",      filterable: true, notes: "e.g. Mobile App, Desktop App" },
    { frontendLabel: "Industry",        algoliaField: "industry",             type: "string",      filterable: true },
    { frontendLabel: "Budget",          algoliaField: "budget_range",         type: "numberRange", filterable: true },
    {
      frontendLabel: "Project Length",
      algoliaField: "project_duration_range",
      type: "enum",
      filterable: true,
      enumValues: [...PROJECT_DURATION_VALUES],
    },
    {
      frontendLabel: "Team Size",
      algoliaField: "team_size_range",
      type: "enum",
      filterable: true,
      enumValues: [...TEAM_SIZE_VALUES],
    },
    { frontendLabel: "Tags",            algoliaField: "tags",                 type: "array",       filterable: true },
    { frontendLabel: "Additional Tags", algoliaField: "additional_tags",      type: "array",       filterable: true },
    { frontendLabel: "Timeline",        algoliaField: "timeline",             type: "string",      filterable: true },
  ],

  services: [
    { frontendLabel: "Title",          algoliaField: "service_title",  type: "string",      searchable: true },
    { frontendLabel: "Category",       algoliaField: "category",       type: "string",      searchable: true, filterable: true },
    { frontendLabel: "Skills",         algoliaField: "skills",         type: "array",       searchable: true, filterable: true },
    { frontendLabel: "Tags",           algoliaField: "tags",           type: "array",       filterable: true },
    { frontendLabel: "Industry",       algoliaField: "industry",       type: "string",      filterable: true },
    { frontendLabel: "Pricing Model",  algoliaField: "pricing_model",  type: "enum",        filterable: true },
    { frontendLabel: "Delivery Time",  algoliaField: "delivery_time",  type: "enum",        filterable: true },
    { frontendLabel: "Price",          algoliaField: "price_range",    type: "numberRange", filterable: true },
    { frontendLabel: "Rating",         algoliaField: "rating",         type: "numberRange", filterable: true },
    { frontendLabel: "Description",    algoliaField: "description",    type: "string",      searchable: true },
  ],
}

/** All searchable fields for an entity (contribute to full-text match). */
export function getSearchableFields(entity: SearchEntity): FieldMapping[] {
  return searchConfig[entity].filter((f) => f.searchable)
}

/** All filterable fields for an entity (exposed as facets/filters). */
export function getFilterableFields(entity: SearchEntity): FieldMapping[] {
  return searchConfig[entity].filter((f) => f.filterable)
}

/** Look up a field by its frontend display label. */
export function getFieldByLabel(
  entity: SearchEntity,
  label: string
): FieldMapping | undefined {
  return searchConfig[entity].find((f) => f.frontendLabel === label)
}

/** Look up a field by its Algolia (backend) field name. */
export function getFieldByAlgoliaName(
  entity: SearchEntity,
  algoliaField: string
): FieldMapping | undefined {
  return searchConfig[entity].find((f) => f.algoliaField === algoliaField)
}
