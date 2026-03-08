# **Global Search Combobox -- Build Guide**

This document explains how to build the **custom combo box** for the
global search bar using the existing Autocomplete Microservice. It walks
through folder setup, component wiring, category filtering, and full
keyboard and API interaction logic.

## **🔧 Folder Structure (Frontend)**

- ****marketeq-projects/

- ├── components/

- │ └── GlobalSearch/

- │ ├── GlobalSearchComboBox.tsx \<\-- Build this new component

- │ ├── SearchDropdown.tsx \<\-- Optional, UI rendering

- │ └── index.ts

- ├── libs/

- │ └── autocomplete/

- │ ├── useAutocomplete.ts \<\-- Shared logic for debounced API calls

- │ ├── autocompleteConfig.ts \<\-- Centralized API config per category

> 

## **✅ Supported Categories**

Global search supports 5 categories:

- Projects

- Services

- Teams

- Talent

- Jobs

Each of these categories uses a different set of filters, tied to
autocomplete types:

### **🔍 Mapping: Search Categories → Autocomplete Types** (Here are a few examples, you will need to add more filters according to the Figma design file)

**Projects:**

- project_titles

- industries

- tags

- skills

**Services:**

- service_titles

- tags

- skills

**Teams:**

- team_names

- industries

- skills

**Talent:**

- job_titles

- skills

- first_names

- usernames

- technologies

**Jobs:**

- project_titles

- service_titles

- team_names

- job_titles

- skills

- technologies

- locations

All of these values are served by the Autocomplete Microservice at:

- https://autocomplete.api.marketeq.com/autocomplete/:type?q=term

> 

## **🧱 Step-by-Step: Building the GlobalSearchComboBox**

### **1. Create Component**

Create a new file at components/GlobalSearch/GlobalSearchComboBox.tsx.
This component receives the selected search category and fetches results
using the autocomplete microservice.

Set up internal state for query and results, use useAutocomplete hook to
debounce, and wire everything to an input box with full keyboard
interaction.

- import { useState } from \'react\';

- import { useAutocomplete } from
  \'@/libs/autocomplete/useAutocomplete\';

- import { autocompleteSources } from
  \'@/libs/autocomplete/autocompleteConfig\';

- 

- export const GlobalSearchComboBox = ({ selectedCategory }) =\> {

- const \[query, setQuery\] = useState(\'\');

- const \[results, setResults\] = useState(\[\]);

- 

- const fetchSuggestions = async (term) =\> {

- const types = getTypesForCategory(selectedCategory);

- const allResults = await Promise.all(

- types.map((type) =\> autocompleteSources\[type\](term))

- );

- 

- const combined = allResults.flat().map((item, index) =\> ({

- \...item,

- sourceType: types\[index\],

- }));

- 

- setResults(combined);

- };

- 

- const handleSelect = (item) =\> {

- logSelection(item); // Analytics tracking

- redirectToSearch(item); // Immediate redirect

- };

- 

- return (

- \<input

- type=\"text\"

- value={query}

- onChange={(e) =\> {

- setQuery(e.target.value);

- fetchSuggestions(e.target.value);

- }}

- onKeyDown={handleKeyNavigation}

- placeholder=\"Search for anything\...\"

- /\>

- );

- };

### **2. Map Category to Types**

In getTypesForCategory(category), map the selected category to all
relevant autocomplete types.

- export function getTypesForCategory(category) {

- switch (category) {

- case \'projects\':

- return \[\'project_titles\', \'industries\', \'tags\', \'skills\'\];

- case \'services\':

- return \[\'service_titles\', \'tags\', \'skills\'\];

- case \'teams\':

- return \[\'team_names\', \'industries\', \'skills\'\];

- case \'talent\':

- return \[\'job_titles\', \'skills\', \'first_names\', \'usernames\',
  \'technologies\'\];

- case \'jobs\':

- return \[\'job_titles\', \'skills\', \'technologies\',
  \'locations\'\];

- default:

- return \[\];

- }

- }

### **3. Fetching Suggestions (Autocomplete Microservice)**

Define this in libs/autocomplete/autocompleteConfig.ts:

- export const autocompleteSources = {

- skills: (query) =\> fetchAutocomplete(\"skills\", query),

- job_titles: (query) =\> fetchAutocomplete(\"job_titles\", query),

- services: (query) =\> fetchAutocomplete(\"services\", query),

- keywords: (query) =\> fetchAutocomplete(\"keywords\", query),

- users: (query) =\> fetchAutocomplete(\"users\", query),

- project_titles: (query) =\> fetchAutocomplete(\"project_titles\",
  query),

- service_titles: (query) =\> fetchAutocomplete(\"service_titles\",
  query),

- first_names: (query) =\> fetchAutocomplete(\"first_names\", query),

- usernames: (query) =\> fetchAutocomplete(\"usernames\", query),

- industries: (query) =\> fetchAutocomplete(\"industries\", query),

- tags: (query) =\> fetchAutocomplete(\"tags\", query),

- technologies: (query) =\> fetchAutocomplete(\"technologies\", query),

- locations: (query) =\> fetchAutocomplete(\"locations\", query),

- };

- 

- function fetchAutocomplete(type: string, query: string) {

- return
  fetch(\`https://autocomplete.api.marketeq.com/autocomplete/\${type}?q=\${query}\`)

- .then((res) =\> res.json());

- }

### **4. Keyboard Support**

Add logic for keyboard interaction (up/down/enter) in
handleKeyNavigation function:

- function handleKeyNavigation(e) {

- if (e.key === \'ArrowDown\') {

- // move selection

- } else if (e.key === \'ArrowUp\') {

- // move up

- } else if (e.key === \'Enter\') {

- handleSelect(currentSelection);

- }

- }

### **5. Search Redirect**

Immediately redirect user when selection is made:

- function redirectToSearch(item) {

- const query = encodeURIComponent(item.value);

- window.location.href =
  \`/search?query=\${query}&type=\${item.sourceType}\`;

- }

### **6. Logging for Analytics (Search Selections Only)**

Track what was selected:

- function logSelection(item) {

- fetch(\'/api/log-autocomplete\', {

- method: \'POST\',

- headers: { \'Content-Type\': \'application/json\' },

- body: JSON.stringify({ type: item.sourceType, value: item.value })

- });

- }

> 

## **🧪 Testing Checklist**

- ✅ Scrollbar renders properly

- ✅ Selecting result triggers redirect

- ✅ Keyboard arrow keys work

- ✅ Enter key selects item

- ✅ Suggestions grouped by type or labeled clearly

- ✅ Uses microservice for all fetches

- ✅ Analytics logs on each selection

- ✅ No .json fallbacks used
