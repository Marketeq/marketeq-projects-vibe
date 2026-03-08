**Algolia settings JSON** for the projects index --- designed to match
your data and support both search and filtering.

### Here's your **algolia-settings-projects.json** with all filters now fully aligned to your actual UI.

### 

### **📦 algolia-settings-projects.json**

### ****{

###  \"searchableAttributes\": \[

###  \"unordered(title)\",

###  \"unordered(subtitle)\",

###  \"unordered(overview)\",

###  \"unordered(skills)\",

###  \"unordered(technologies)\",

###  \"unordered(subcategories)\",

###  \"unordered(tags)\",

###  \"unordered(project_lead)\",

###  \"unordered(deliverables)\"

###  \],

###  \"attributesForFaceting\": \[

###  \"filterOnly(project_category)\",

###  \"filterOnly(tags)\",

###  \"filterOnly(project_type)\",

###  \"filterOnly(industry)\",

###  \"filterOnly(budget_range)\",

###  \"filterOnly(skills)\",

###  \"filterOnly(additional_tags)\",

###  \"filterOnly(project_duration_range)\",

###  \"filterOnly(team_size_range)\"

###  \],

###  \"customRanking\": \[

###  \"desc(ratings)\",

###  \"desc(sales)\",

###  \"desc(date_published)\"

###  \],

###  \"ranking\": \[

###  \"typo\",

###  \"geo\",

###  \"words\",

###  \"filters\",

###  \"proximity\",

###  \"attribute\",

###  \"exact\",

###  \"custom\"

###  \],

###  \"attributesToSnippet\": \[

###  \"overview:50\",

###  \"deliverables:30\"

###  \],

###  \"typoTolerance\": \"min\",

###  \"ignorePlurals\": true,

###  \"removeStopWords\": true,

###  \"queryLanguages\": \[\"en\"\],

###  \"highlightPreTag\": \"\<mark\>\",

###  \"highlightPostTag\": \"\</mark\>\"

### }

### 

### ✅ This version:

### Mirrors your **live project filters** 

### Keeps all searchable content lean and prioritized 

### Ensures **filter-only** behavior for performance and precision

### **🧠 Notes:**

- unordered(\...) improves match flexibility for longer fields like
  overview or deliverables

- filterOnly(\...) prevents non-active facets from bloating relevance
  calculations

- customRanking boosts visibility for well-rated, frequently purchased,
  and recent projects

- attributesToSnippet provides compact summaries in search previews

- English-specific stopword removal and typo tolerance are kept lean for
  UX quality
