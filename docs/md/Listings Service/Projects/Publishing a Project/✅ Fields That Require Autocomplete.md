## **✅ Fields That Require Autocomplete**

  --------------------------------------------------------------------------
  **Field Name**        **Data Source**                    **Autocomplete
                                                           Type**
  --------------------- ---------------------------------- -----------------
  **Role**              job_titles.json                    job_titles

  **Sub-Category(s)**   categories.json (3rd-level)        categories

  **Industry**          categories.json (top-level or      categories
                        2nd-level)                         

  **Tags**              search_keywords.json (curated +    search_keywords
                        user-gen)                          

  **Skills**            skills.json                        skills
  --------------------------------------------------------------------------

## **🧭 Folder References**

****marketeq-projects/

├── components/Autocomplete/ ← UI components

├── libs/autocomplete/

│ ├── useAutocomplete.ts ← Hook

│ ├── autocompleteConfig.ts ← Type-to-source map

│ └── data/

│ ├── job_titles.json

│ ├── skills.json

│ ├── categories.json

│ ├── search_keywords.json



## **🧰 Integration Instructions Per Field**

### **1. 🔹 Role**

****\<AutocompleteComboBox

type=\"job_titles\"

label=\"Role\"

placeholder=\"Start typing a job title\...\"

onSelect={handleSelect}

/\>

### **2. 🔹 Sub-Category(s)**

****\<AutocompleteComboBox

type=\"categories\"

label=\"Add Sub-Category(s)\"

placeholder=\"Search subcategories\...\"

filterLevel=\"3\" // custom flag if needed

onSelect={handleSelect}

/\>

### **3. 🔹 Industry**

****\<AutocompleteComboBox

type=\"categories\"

label=\"Industry\"

placeholder=\"Select up to 5 industries\"

filterLevel=\"1\" // or \"2\", depending on your UX logic

maxSelections={5}

onSelect={handleSelect}

/\>

### **4. 🔹 Tags**

****\<AutocompleteComboBox

type=\"search_keywords\"

label=\"Tags\"

placeholder=\"Add tags\"

maxSelections={10}

allowNewEntries={true} // user-generated tags

onSelect={handleSelect}

/\>

### **5. 🔹 Skills**

****\<AutocompleteComboBox

type=\"skills\"

label=\"Skills\"

placeholder=\"Add required skills\"

maxSelections={10}

onSelect={handleSelect}

/\>



## **✅ Developer Checklist**

- Ensure type is correctly mapped in autocompleteConfig.ts

- All source data exists in libs/autocomplete/data/

- Do **not** hardcode options or custom-fetch --- always use
  AutocompleteComboBox

- If the field allows new user entries (e.g. tags), ensure moderation
  logic is in place
