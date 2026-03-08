Here's the **search-config.ts** filter section for the projects listings
--- with **explicit enum values** for project_duration_range and
team_size_range, aligned 1:1 with the UI filters:

### **📄 search-config.ts --- Filters Only (projects)**

****// src/config/search-config.ts

export const searchConfig = {

projects: \[

// Existing searchable fields (title, overview, etc.) go here\...

{

frontendLabel: \'Category\',

algoliaField: \'project_category\',

type: \'string\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Tags\',

algoliaField: \'tags\',

type: \'array\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Project Type\',

algoliaField: \'project_type\',

type: \'string\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Industry\',

algoliaField: \'industry\',

type: \'string\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Budget Range\',

algoliaField: \'budget_range\',

type: \'numberRange\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Skills\',

algoliaField: \'skills\',

type: \'array\',

searchable: true,

filterable: true

},

{

frontendLabel: \'Additional Tags\',

algoliaField: \'additional_tags\',

type: \'array\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Project Duration\',

algoliaField: \'project_duration_range\',

type: \'enum\',

allowedValues: \[

\'1 - 3 months\',

\'3 - 6 months\',

\'6 - 12 months\',

\'12 - 18 months\',

\'18 - 24 months\',

\'24+ months\'

\],

searchable: false,

filterable: true

},

{

frontendLabel: \'Team Size\',

algoliaField: \'team_size_range\',

type: \'enum\',

allowedValues: \[

\'1 - 2 members\',

\'2 - 5 members\',

\'5 - 10 members\',

\'10 - 15 members\',

\'15 - 20 members\',

\'20+ members\'

\],

searchable: false,

filterable: true

}

\]

};


