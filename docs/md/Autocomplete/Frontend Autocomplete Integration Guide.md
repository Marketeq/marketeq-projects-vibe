# **Frontend Autocomplete Integration Guide**

**Location:** docs/frontend/autocomplete/setup.md

This guide shows frontend developers how to add autocomplete
functionality for different field types within a new sprint. It includes
folder structure, required resources, and step-by-step instructions to
ensure consistency across the remote talent network platform. This setup
ensures developers can consistently plug in new autocomplete fields
without rebuilding the wheel.

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

│ ├── job_titles.json

│ ├── skills.json

│ ├── certifications.json

│ ├── locations.ts (calls LocationIQ)

│ ├── companies.json

│ ├── universities.json

│ ├── categories.json

│ └── search_keywords.json



## **📚 Available Autocomplete** **Libraries**

  --------------------------------------------------------------
  **Field Type**   **Resource Location**
  ---------------- ---------------------------------------------
  Job Titles       libs/autocomplete/data/job_titles.json

  Skills           libs/autocomplete/data/skills.json

  Certifications   libs/autocomplete/data/certifications.json

  Locations        libs/autocomplete/data/locations.ts (API)

  Companies        libs/autocomplete/data/companies.json

  Universities     libs/autocomplete/data/universities.json

  Categories       libs/autocomplete/data/categories.json

  Global Search    libs/autocomplete/data/search_keywords.json
  --------------------------------------------------------------

## **🧰 Step-by-Step Instructions**

### **1. Import the Autocomplete Component**

****import { AutocompleteComboBox } from \'@/components/Autocomplete\';

### **2. Choose a Field Type**

Each field must specify its type, which maps to the corresponding data
source:

\<AutocompleteComboBox

type=\"job_titles\"

label=\"Job Title\"

placeholder=\"Start typing\...\"

onSelect={handleSelection}

/\>

Valid type values:

job_titles, skills, certifications, locations, companies, universities,
categories, search_keywords

### **3. Connect useAutocomplete Hook**

Behind the scenes, AutocompleteComboBox uses:

const { suggestions } = useAutocomplete({ type, query });

Which pulls from:

- A static JSON (for local data)

- Or a fetch function (e.g., locations.ts) for live APIs

## **🌐 Live Data Autocomplete (Locations)**

The locations autocomplete uses the **LocationIQ API**.

**File:** libs/autocomplete/data/locations.ts

export const fetchLocationSuggestions = async (query: string) =\> {

const res = await fetch(\`/api/location-autocomplete?q=\${query}\`);

return await res.json();

};

Backend endpoint: /api/location-autocomplete proxies requests to
LocationIQ.

## **⚙️ Configuration File**

All types are registered in:

libs/autocomplete/autocompleteConfig.ts

Example:

export const autocompleteSources = {

job_titles: () =\> import(\'./data/job_titles.json\'),

skills: () =\> import(\'./data/skills.json\'),

certifications: () =\> import(\'./data/certifications.json\'),

locations: fetchLocationSuggestions,

companies: () =\> import(\'./data/companies.json\'),

universities: () =\> import(\'./data/universities.json\'),

categories: () =\> import(\'./data/categories.json\'),

search_keywords: () =\> import(\'./data/search_keywords.json\'),

};



## **🔒 Rules: Do Not Modify The Core Autocomplete Code**

## All developers must follow these rules when implementing autocomplete:

## ❌ Do **not** modify any code inside components/Autocomplete/

## ❌ Do **not** hardcode values or write custom fetch logic for static data

## ❌ Do **not** modify useAutocomplete.ts directly

## ✅ You must use AutocompleteComboBox as-is

## ✅ All data sources must be declared in autocompleteConfig.ts

## ✅ Dynamic sources (like locations) must use the approved API proxy handlers

## Violation of these rules may lead to broken features, duplicated logic, or inconsistencies across the platform.

## **✅ Adding Autocomplete to a New Form Field**

1.  Confirm the field type is supported

2.  Reference the corresponding key from autocompleteSources

3.  Render AutocompleteComboBox with that type

4.  Handle selection callback

For new field types, update:

- autocompleteConfig.ts

- Add the new JSON file or API handler

- Create any needed filtering or sanitization logic in
  useAutocomplete.ts
