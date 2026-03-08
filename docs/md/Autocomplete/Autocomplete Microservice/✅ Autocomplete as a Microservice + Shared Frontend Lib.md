### **✅ Autocomplete as a Microservice + Shared Frontend Lib**

Here's how we'll structure the autocomplete service in order to meet the
long-term scaling and architecture needs:

## **1. Backend: autocomplete-service (microservice)**

**Purpose**: Handles all backend logic including filtering,
normalization, deduplication, database writes, and syncing for all
user-generated autocomplete data.

**Folder Structure**:

services/

└── autocomplete-service/

├── src/

│ ├── filters/ \# Rejecting vulgar, nonsense, or disallowed input

│ ├── matching/ \# Heuristics, category matching, AI embeddings

│ ├── processors/ \# Normalization, deduplication, scoring

│ ├── sync/ \# Sync with Strapi, Airtable, external APIs

│ ├── controllers/ \# API for registering/receiving suggestions

│ ├── models/ \# Postgres entities (autocomplete_entry, rejected_entry,
category_tag_map, etc.)

│ └── index.ts

└── main.ts

**APIs Provided**:

- POST /autocomplete/submit -- receive new input and process it

- GET /autocomplete/:type -- return approved suggestions for frontend

- GET /autocomplete/category-map -- category mapping data

- PATCH /autocomplete/review -- admin review queue for flagged inputs

## **2. Frontend: libs/autocomplete/ (shared library)**

**Purpose**: UI/UX components for \<AutoCompleteInput /\>, pre-wired to
the backend and configured for each field type (skills, titles, tools,
etc.)

**Folder Structure**:

frontend/

└── libs/

└── autocomplete/

├── inputs/

│ ├── SkillsInput.tsx

│ ├── TitlesInput.tsx

│ └── \...

├── hooks/

│ └── useAutocomplete.ts

├── config/

│ └── fieldTypes.ts \# e.g. max tags, endpoint, label fields

└── utils/

└── debounceFetch.ts

Each input is prebuilt. New sprints just call the \<SkillsInput /\> or
\<TagsInput /\> component --- no rebuilding logic.

## **3. Shared PostgreSQL Tables**

These are created and managed by autocomplete-service:

- autocomplete_entries

- rejected_entries

- autocomplete_categories

- autocomplete_sources

- autocomplete_type_map (link types like skill → category)

- autocomplete_review_queue

## **4. Strapi Sync (Optional)**

If Strapi CMS is used for tagging or moderation, it is synced **by the
microservice**, not directly by frontend devs. The frontend pulls only
clean, validated data.

## **5. How to Use in a New Sprint**

Frontend devs just:

1.  Import prebuilt input:

import { SkillsInput } from \"@/libs/autocomplete/inputs\"

2.  \
    Drop into any form:

\<SkillsInput name=\"skills\" maxTags={10} /\>

3.  \
    ✅ Done --- no logic rewritten.

## **✅ Summary**

  **Area**               **Location**                    **Purpose**
  ---------------------- ------------------------------- ------------------------------------------
  Backend logic          services/autocomplete-service   Filtering, categorization, database sync
  Frontend components    frontend/libs/autocomplete/     Reusable form inputs
  Static JSON (legacy)   frontend/data/autocomplete/     Internal seed lists only
  Shared DB Tables       Postgres (managed by service)   Canonical source of truth
  CMS (optional)         Strapi, synced from backend     Admin editing and moderation interface
