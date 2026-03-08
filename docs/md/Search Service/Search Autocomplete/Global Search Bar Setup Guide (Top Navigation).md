# **Global Search Bar Setup Guide (Top Navigation)**

This document defines the data sources, logic, setup steps, and JSON
structures required to implement the main global search bar for the
Marketeq platform.

## **Purpose**

The global search bar should support autocomplete for a wide range of
user intent across talent, teams, services, skills, and project types.
It must provide helpful suggestions even when there is no direct match
in the database.

## **Autocomplete Data Sources**

### **1. Internal (Dynamic)**

These values come from your live database:

- Talent names (users)

- Team names (agencies/groups)

- Project titles

### **2. Microservice API (New)**

Static datasets (skills, job titles, services, keywords) are now served
by the autocomplete-service microservice, not directly from static JSON
files.

Call:

GET https://autocomplete.api.marketeq.com/autocomplete/:type?q=term

Types include: skills, job_titles, services, keywords, project_titles,
usernames, first_names

This replaces the legacy Fuse.js logic and static file imports.

## **Historical Reference (Legacy JSON Format Only)**

These formats are still valid inside the backend, but no longer live in
the frontend repo.

### **services.json**

****\[

{ \"label\": \"UI/UX Design\", \"category\": \"Design\", \"type\":
\"Service\" },

{ \"label\": \"Web Development\", \"category\": \"Engineering\",
\"type\": \"Service\" },

{ \"label\": \"Mobile App Development\", \"category\": \"Engineering\",
\"type\": \"Service\" },

{ \"label\": \"SEO Optimization\", \"category\": \"Marketing\",
\"type\": \"Service\" },

{ \"label\": \"Content Marketing\", \"category\": \"Marketing\",
\"type\": \"Service\" },

{ \"label\": \"Email Campaign Management\", \"category\": \"Marketing\",
\"type\": \"Service\" },

{ \"label\": \"Financial Modeling\", \"category\": \"Finance\",
\"type\": \"Service\" },

{ \"label\": \"Pitch Deck Design\", \"category\": \"Design\", \"type\":
\"Service\" },

{ \"label\": \"MVP Development\", \"category\": \"Engineering\",
\"type\": \"Service\" },

{ \"label\": \"Social Media Management\", \"category\": \"Marketing\",
\"type\": \"Service\" }

\]

### **search_keywords.json**

****\[

{ \"label\": \"startup funding\", \"type\": \"Keyword\", \"tags\":
\[\"finance\", \"investment\"\] },

{ \"label\": \"brand identity\", \"type\": \"Keyword\", \"tags\":
\[\"design\", \"branding\"\] },

{ \"label\": \"SaaS MVP\", \"type\": \"Keyword\", \"tags\":
\[\"product\", \"startup\"\] },

{ \"label\": \"landing page\", \"type\": \"Keyword\", \"tags\":
\[\"web\", \"design\"\] },

{ \"label\": \"technical cofounder\", \"type\": \"Keyword\", \"tags\":
\[\"founders\", \"team\"\] },

{ \"label\": \"growth hacking\", \"type\": \"Keyword\", \"tags\":
\[\"marketing\", \"growth\"\] },

{ \"label\": \"freelance developer\", \"type\": \"Keyword\", \"tags\":
\[\"talent\", \"remote\"\] },

{ \"label\": \"remote team\", \"type\": \"Keyword\", \"tags\":
\[\"hiring\", \"distributed\"\] },

{ \"label\": \"ecommerce store\", \"type\": \"Keyword\", \"tags\":
\[\"shopify\", \"commerce\"\] },

{ \"label\": \"AI integration\", \"type\": \"Keyword\", \"tags\":
\[\"machine learning\", \"engineering\"\] }

\]

These now live inside:

apps/autocomplete-service/data/

(Managed by backend developers)

## **Autocomplete Logic**

### **When User Types in Global Search:**

1.  Run live DB query for:

    - Talent names

    - Project titles

    - Team names

2.  Call the microservice endpoint:

GET https://autocomplete.api.marketeq.com/autocomplete/:type?q=term

Supported types:

- skills

- job_titles

- services

- keywords

- project_titles

- usernames

- first_names

3.  Combine all results with structured tags:

\[ { \"label\": \"React\", \"type\": \"Skill\" }, { \"label\": \"UI/UX
Design\", \"type\": \"Service\" }, { \"label\": \"SaaS MVP\", \"type\":
\"Keyword\" } \]

4.  Group or rank by type and usage priority

## **UI Display (Recommended)**

- Autocomplete dropdown with sections:

  - Top Matches

  - Talent / Projects / Teams

  - Skills

  - Services

  - Keywords

- Include type badges (e.g., \[Skill\], \[Service\])

## **Supported Search Categories**

The global search bar currently supports five embedded categories,
allowing users to search across multiple structured datasets with
contextual awareness:

- **Projects** -- Titles and tags for marketplace project listings

- **Services** -- Available offerings across design, development,
  marketing, etc.

- **Talent** -- Individual user profiles from the talent network

- **Teams** -- Group/agency-based profiles or client-assembled teams

- **Jobs** -- Posted job openings (when implemented)

Each result is tagged by type and fetched from either the dynamic
database or the autocomplete microservice, enabling unified global
search.

## **Sprint Setup for Development**

### **Tasks:**

1.  Use the existing microservice API for autocomplete. Do **not**
    reimplement logic.

2.  Build a search context provider or hook to fetch from the API.

3.  Add global \<SearchBar /\> component to top navigation

4.  Style autocomplete dropdown with grouping & highlighting

5.  Write unit tests for search ranking logic

6.  Add sandbox route for testing (/sandbox/search)

## **You\'re Done**

Once implemented, this will give users a single search bar to explore
all relevant marketplace content --- even when there\'s no direct match.
All fallback logic is now handled by the autocomplete microservice.
