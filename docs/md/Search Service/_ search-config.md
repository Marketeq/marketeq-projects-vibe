// search-config.ts (Projects)

export const searchConfig = {

projects: \[

{

frontendLabel: \'Project Title\',

algoliaField: \'title\',

type: \'string\',

searchable: true,

filterable: false

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

frontendLabel: \'Additional Tags\',

algoliaField: \'additional_tags\',

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

frontendLabel: \'Published Date\',

algoliaField: \'date_published\',

type: \'date\',

searchable: false,

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

}

\]

};
