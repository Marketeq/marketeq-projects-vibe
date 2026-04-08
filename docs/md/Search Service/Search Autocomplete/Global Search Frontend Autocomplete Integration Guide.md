# **Global Search -- Frontend Autocomplete Integration Guide**

**Location:** docs/frontend/autocomplete/setup.md

This guide shows frontend developers how to integrate **global search
autocomplete** using the existing microservice architecture. It includes
folder structure, required endpoints, and step-by-step instructions to
ensure consistency across the remote talent network platform.

## **📁 Folder Structure**

### **Main Frontend Repo**

****marketeq-projects/

├── components/

│ └── Autocomplete/

│ ├── AutocompleteComboBox.tsx

│ ├── AutocompleteInput.tsx

│ └── index.ts

├── libs/

│ └── autocomplete/

│ ├── useAutocomplete.ts

│ ├── autocompleteConfig.ts

│ └── data/

│ └── (used only for local fallback/testing)



## **🌍 Microservice Setup for Global Search**

The global search bar uses **live suggestions** from the **Autocomplete
Microservice**, deployed at:

https://autocomplete.api.marketeq.com/autocomplete/:type?q=term

Example:

https://autocomplete.api.marketeq.com/autocomplete/skills?q=product

### **🔍 Example Supported Types:**

****skills, job_titles, services, keywords, users, project_titles,
service_titles, first_names, usernames

These are **example supported types**, not a complete list. Refer to
the full data dictionaries for projects, talent, services, and users for
comprehensive coverage.

Global search must support the following search categories:

- Projects

- Services

- Teams

- Talent

- Jobs

Each category may require parallel autocomplete queries for types such
as: project_titles, service_titles, team_names, usernames, skills,
industries, etc.

## **🧰 Integration Instructions for Global Search Bar**

### **1. Import the Autocomplete Component**

****import { AutocompleteComboBox } from \'@/components/Autocomplete\';

### **2. Build the Multi-Type Autocomplete Component**

The existing AutocompleteComboBox only supports single-type suggestions.
Global search requires a **new component** that:

- Calls multiple autocomplete endpoints in parallel

- Combines and tags results by category (e.g. Skills, Projects, Users)

- Displays all results in a **single dropdown** with scrollable support

- Triggers search immediately when a result is selected

- Supports full **keyboard navigation** (arrow keys and Enter key)

Optional: debounce API calls for performance optimization.

The component will power the global search bar available **across all
pages** where the main navigation is shown --- not just the homepage.

### **3. Fetch Suggestions Using Microservice**

Use the following API pattern:

https://autocomplete.api.marketeq.com/autocomplete/{type}?q={term}

Example:

fetch(\'https://autocomplete.api.marketeq.com/autocomplete/skills?q=react\')

### **4. Update autocompleteConfig.ts**

****export const autocompleteSources = {

skills: (query) =\> fetchAutocomplete(\"skills\", query),

job_titles: (query) =\> fetchAutocomplete(\"job_titles\", query),

services: (query) =\> fetchAutocomplete(\"services\", query),

keywords: (query) =\> fetchAutocomplete(\"keywords\", query),

users: (query) =\> fetchAutocomplete(\"users\", query),

project_titles: (query) =\> fetchAutocomplete(\"project_titles\",
query),

service_titles: (query) =\> fetchAutocomplete(\"service_titles\",
query),

first_names: (query) =\> fetchAutocomplete(\"first_names\", query),

usernames: (query) =\> fetchAutocomplete(\"usernames\", query),

};

function fetchAutocomplete(type: string, query: string) {

return
fetch(\`https://autocomplete.api.marketeq.com/autocomplete/\${type}?q=\${query}\`)

.then((res) =\> res.json());

}



## **🔒 Rules for Global Search Integration**

- ❌ Do **not** use static .json files for global search

- ✅ Always use the autocomplete.api.marketeq.com endpoint

- ❌ Do **not** rewrite microservice logic

- ✅ Build a **new** multi-source autocomplete dropdown component

- ✅ Support keyboard navigation (arrow keys + enter key)

- ✅ Trigger search result view immediately when a result is selected

- ✅ Allow scrolling through large result sets

- ✅ Track selected suggestions for analytics (e.g., popular searches)

## **✅ Summary**

- Global search supports: **Projects, Services, Teams, Talent, Jobs\**

- Uses centralized autocomplete microservice

- Requires new multi-type dropdown component (not reusable from
  onboarding)

- Suggestions retrieved via real-time API from
  autocomplete.api.marketeq.com

- Must support performance scrolling, keyboard control, and analytics
  tracking

- Examples of supported types: skills, job_titles, services, keywords,
  users, project_titles, service_titles, first_names, usernames
