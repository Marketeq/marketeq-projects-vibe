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
      'project_category',
      'project_type',
      'industry',
      'project_duration_range',
      'team_size_range',
      'location',
      'industries',
    ],
    customRanking: ['desc(rating)', 'desc(created_at_timestamp)'],
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
    ],
    attributesForFaceting: [
      'filterOnly(status)',
      'searchable(skills)',
      'searchable(tags)',
      'job_title',
      'experience_level',
      'availability',
      'location',
      'industries',
    ],
    customRanking: ['desc(rating)', 'desc(projects_completed)'],
    replicas: [
      'talent_sort_rating_desc',
      'talent_sort_hourly_rate_asc',
      'talent_sort_hourly_rate_desc',
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
      'languages',
    ],
    customRanking: ['desc(rating)', 'desc(client_success_rate)'],
    replicas: [
      'teams_sort_rating_desc',
      'teams_sort_projects_completed_desc',
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
      'category',
      'pricing_model',
      'delivery_time',
      'location',
      'industries',
    ],
    customRanking: ['desc(rating)', 'desc(orders_completed)'],
    replicas: [
      'services_sort_rating_desc',
      'services_sort_price_range_asc',
      'services_sort_price_range_desc',
    ],
  },
} as const;

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

// Facet fields per category — returned by GET /search/facets
export const FACET_FIELDS: Record<string, string[]> = {
  talent: ['skills', 'job_title', 'experience_level', 'availability', 'location', 'industries'],
  teams: ['skills', 'category', 'team_size_range', 'availability', 'location', 'industries', 'languages'],
  projects: ['skills', 'project_category', 'project_type', 'industry', 'project_duration_range', 'team_size_range', 'technologies'],
  services: ['skills', 'category', 'pricing_model', 'delivery_time'],
};
