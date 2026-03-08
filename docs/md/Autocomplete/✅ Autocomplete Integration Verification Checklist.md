# **✅ Autocomplete Integration Verification Checklist**

**Location:** Root of marketeq-projects repo

## **🔹 1. Component Folder (UI)**

> components/Autocomplete/

### **Confirm the following files exist:**

- AutocompleteComboBox.tsx

- AutocompleteInput.tsx

- index.ts

✅ *Purpose: Renders reusable combo box for all autocomplete field
types*

## **🔹 2. Hook & Config Folder**

> libs/autocomplete/

### **Confirm the following files exist:**

- useAutocomplete.ts --- central hook that handles logic

- autocompleteConfig.ts --- maps type to data source

✅ *Purpose: Pulls data from either static files or API-based fetch
functions*

## **🔹 3. Data Directory**

> libs/autocomplete/data/

### **Confirm the following files or fetch handlers:**

- job_titles.json

- skills.json

- certifications.json

- companies.json

- universities.json

- categories.json

- search_keywords.json

- locations.ts *(API proxy for LocationIQ)\*

✅ *Purpose: Each file or handler must match a valid type in
autocompleteConfig.ts*

## **🔹 4. AutocompleteConfig Map**

> libs/autocomplete/autocompleteConfig.ts

### **Confirm all sources are defined:**

- job_titles

- skills

- certifications

- locations

- companies

- universities

- categories

- search_keywords

✅ *All keys must directly match the filenames or fetch functions
defined above.*

## **🔹 5. Backend Proxy (for live API use only)**

> pages/api/location-autocomplete.ts (or similar)

- File exists

- It calls LocationIQ and returns properly formatted location data

✅ *Purpose: Keeps API keys off the frontend*

## **✅ Completion**

- Submit confirmation in Slack with any missing or outdated files listed

- Do **not** move, rename, or modify any of these shared folders or
  files
