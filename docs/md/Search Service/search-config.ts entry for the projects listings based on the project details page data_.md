search-config.ts entry for the projects listings based on the project
details page data:

### **📄 search-config.ts (Projects Section)**

****// src/config/search-config.ts

export const searchConfig = {

projects: \[

{

frontendLabel: \'Project Title\',

algoliaField: \'title\',

type: \'string\',

searchable: true,

filterable: false,

notes: \'Main headline shown on card/listing\'

},

{

frontendLabel: \'Subtitle / Tagline\',

algoliaField: \'subtitle\',

type: \'string\',

searchable: true,

filterable: false

},

{

frontendLabel: \'Description\',

algoliaField: \'overview\',

type: \'text\',

searchable: true,

filterable: false

},

{

frontendLabel: \'Starting Price\',

algoliaField: \'budget_starting_at\',

type: \'number\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Initial Payment\',

algoliaField: \'initial_payment\',

type: \'number\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Project Duration\',

algoliaField: \'project_duration\',

type: \'string\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Min Team Members\',

algoliaField: \'team_size_minimum\',

type: \'number\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Skills & Expertise\',

algoliaField: \'skills\',

type: \'array\',

searchable: true,

filterable: true

},

{

frontendLabel: \'Development Tech\',

algoliaField: \'technologies\',

type: \'array\',

searchable: true,

filterable: true

},

{

frontendLabel: \'Subcategories\',

algoliaField: \'subcategories\',

type: \'array\',

searchable: true,

filterable: true

},

{

frontendLabel: \'Tags\',

algoliaField: \'tags\',

type: \'array\',

searchable: true,

filterable: true

},

{

frontendLabel: \'Average Rating\',

algoliaField: \'ratings\',

type: \'number\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Sales Completed\',

algoliaField: \'sales\',

type: \'number\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Published Date\',

algoliaField: \'date_published\',

type: \'date\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Locations\',

algoliaField: \'location\',

type: \'array\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Languages\',

algoliaField: \'languages\',

type: \'array\',

searchable: false,

filterable: true

},

{

frontendLabel: \'Project Lead\',

algoliaField: \'project_lead\',

type: \'string\',

searchable: true,

filterable: false

},

{

frontendLabel: \'Deliverables\',

algoliaField: \'deliverables\',

type: \'array\',

searchable: true,

filterable: false

},

{

frontendLabel: \'Phases\',

algoliaField: \'phases\',

type: \'array\',

searchable: false,

filterable: false

},

{

frontendLabel: \'Main Category\',

algoliaField: \'project_category\',

type: \'string\',

searchable: true,

filterable: true

}

\]

};



This config can be imported and reused by both:

- Your **NestJS backend** for indexing and API validation

- Your **Algolia sync scripts** for normalizing field mappings
