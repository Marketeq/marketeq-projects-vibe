# **Autocomplete System Architecture & Developer Guide**

This document provides a full technical blueprint for how to structure
and implement the autocomplete system across both frontend and backend
environments using a microservice model.

## **📄 Overview**

The autocomplete system is responsible for powering intelligent
suggestions across multiple input fields (e.g. roles, skills, tools,
certifications, tags, etc.). It must:

- Accept and sanitize user-generated input

- Normalize and categorize values

- Save to a shared Postgres database

- Return clean suggestions via API

- Support fuzzy, semantic, and heuristic matching

## **🚀 1. Microservice: autocomplete-service**

### **Location**

****/services/autocomplete-service/

### **Folder Structure**

****src/

├── filters/ \# Reject profanity, garbage, spam

├── matching/ \# Heuristic + semantic category mapping

├── processors/ \# Normalize, deduplicate, lowercase, etc.

├── sync/ \# Sync with Strapi, Airtable, etc.

├── controllers/ \# Express/NestJS routes

├── models/ \# Postgres entity models

└── index.ts

### **Endpoints**

****POST /autocomplete/submit \# Submit user-generated value

GET /autocomplete/:type \# Fetch approved suggestions (e.g. skills,
titles)

GET /autocomplete/category-map \# Get category-to-type mappings

PATCH /autocomplete/review \# Manually approve/reject flagged terms

### **Postgres Tables**

- autocomplete_entries

- autocomplete_categories

- autocomplete_review_queue

- autocomplete_type_map

- autocomplete_sources

- rejected_entries

## **📈 2. Frontend: Shared UI Library**

### **Location**

****/frontend/libs/autocomplete/

### **Structure**

****inputs/

├── SkillsInput.tsx

├── TitlesInput.tsx

└── \...

hooks/

└── useAutocomplete.ts

config/

└── fieldTypes.ts

utils/

└── debounceFetch.ts

### **Usage in Any Sprint**

****import { SkillsInput } from \"@/libs/autocomplete/inputs\";

\<SkillsInput name=\"skills\" maxTags={10} /\>

No custom logic needed. All autocomplete inputs are pre-wired.

## **📅 3. Data Seeding for Bootstrap**

### **Location**

****/frontend/data/autocomplete/

Used to seed initial autocomplete lists only. Not dynamically updated.

Examples:

- skills.json

- job_titles.json

- languages.json

- universities.json

## **🌐 4. Strapi CMS Sync (Optional)**

- Editable categories are synced **from** autocomplete-service

- Strapi is **not** the source of truth

- Edits made in Strapi are pushed back via /sync logic

## **🧪 5. Semantic Categorization (Optional)**

- Category matching uses huggingface/bert-base-uncased via
  sentence-transformers

- All terms are embedded and compared using cosine similarity

- Helps auto-classify terms like:

  - \"React\" → \"Development \> Frontend Frameworks\"

  - \"GA4\" → \"Marketing \> Analytics\"

## **✅ 6. Developer Onboarding Summary**

  ------------------------------------------------------
  **Task**     **Action**
  ------------ -----------------------------------------
  Add new      Import from libs/autocomplete/inputs
  field        

  Seed data    Save to /data/autocomplete/ and commit to
               GitHub

  Submit value Use POST /autocomplete/submit API

  Fetch values Use GET /autocomplete/:type

  Add category Use admin dashboard or update Strapi if
               synced
  ------------------------------------------------------

## **🔧 Next Steps**

1.  Create autocomplete-service microservice

2.  Implement all listed endpoints

3.  Integrate shared components into frontend

4.  Finalize PostgreSQL schema

5.  Deploy and verify full data flow from submission to suggestion
