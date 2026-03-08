**Create a search-config.ts file to serve as the single source of truth
for all search-related mappings.** This file will:

- Define each searchable entity (Talent, Project, Job, etc.)

- Map backend (Algolia) fields to frontend display names

- Reference searchableAttributes, attributesForFaceting, and optionally
  field types

- Keep all search logic centralized for easy updates later

### **✅ Sample search-config.ts**

****// src/config/search-config.ts

export type SearchEntity = \'talent\' \| \'projects\' \| \'jobs\' \|
\'services\' \| \'teams\';

interface FieldMapping {

frontendLabel: string;

algoliaField: string;

type: \'string\' \| \'array\' \| \'number\' \| \'boolean\';

searchable?: boolean;

filterable?: boolean;

notes?: string;

}

export const searchConfig: Record\<SearchEntity, FieldMapping\[\]\> = {

talent: \[

{ frontendLabel: \'Job Title\', algoliaField: \'job_title\', type:
\'string\', searchable: true },

{ frontendLabel: \'Skills\', algoliaField: \'skills\', type: \'array\',
searchable: true, filterable: true },

{ frontendLabel: \'Location\', algoliaField: \'location\', type:
\'string\', searchable: true, filterable: true },

{ frontendLabel: \'About Me\', algoliaField: \'about_me\', type:
\'string\', searchable: true },

{ frontendLabel: \'Overview\', algoliaField: \'overview\', type:
\'string\', searchable: true },

{ frontendLabel: \'Certifications\', algoliaField: \'certifications\',
type: \'array\', searchable: true, filterable: true },

{ frontendLabel: \'Name\', algoliaField: \'name\', type: \'string\',
searchable: true },

{ frontendLabel: \'Projects Highlighted\', algoliaField:
\'project_highlights\', type: \'string\', searchable: true }

\],

projects: \[

{ frontendLabel: \'Title\', algoliaField: \'project_title\', type:
\'string\', searchable: true },

{ frontendLabel: \'Technologies\', algoliaField: \'technologies\', type:
\'array\', searchable: true },

{ frontendLabel: \'Industry\', algoliaField: \'industry\', type:
\'string\', filterable: true },

{ frontendLabel: \'Budget\', algoliaField: \'budget_range\', type:
\'string\', filterable: true },

{ frontendLabel: \'Timeline\', algoliaField: \'timeline\', type:
\'string\', filterable: true }

\],

// Add similar entries for \'jobs\', \'services\', \'teams\'

};



### **🧠 Benefits**

- Keeps **backend and frontend aligned** on what's searchable and
  filterable

- Prevents breaking changes when UI or schema changes

- Allows your Algolia index sync logic to reference one config file for
  consistency
