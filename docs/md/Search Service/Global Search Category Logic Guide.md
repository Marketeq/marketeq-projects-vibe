# **Global Search Category Logic Guide**

This guide defines how to segment and customize autocomplete behavior in
the global search bar using a category dropdown. Instead of showing all
results in one view, users will first select a category: **Talent**,
**Teams**, **Projects**, or **Services**. This guide builds on the
universal logic and introduces a filtered approach for improved UX.

## **Purpose**

To help users:

- Narrow search scope before typing

- Get more accurate suggestions

- Reduce noise in autocomplete dropdowns

## **Category Dropdown (Required in UI)**

Add a select dropdown to the global search bar with the following
options:

\[Talent\] \[Teams\] \[Projects\] \[Services\]

Default selection: All

## **Search Logic By Category**

### **1. Talent**

**Data Sources:**

- Live DB query: users

- Optional filters: name, headline, skills

**Autocomplete Sources:**

- skills.json

- job_titles.json

- search_keywords.json (talent-specific only --- optional filtering)

**Fuse Keys:**

****\[\'label\', \'skills\', \'headline\'\]



### **2. Teams**

**Data Sources:**

- Live DB query: teams

- Optional filters: team name, services, location

**Autocomplete Sources:**

- services.json

- search_keywords.json (team-related tags)

**Fuse Keys:**

****\[\'label\', \'services\'\]



### **3. Projects**

**Data Sources:**

- Live DB query: projects

- Optional filters: title, skills, description

**Autocomplete Sources:**

- skills.json

- job_titles.json

- search_keywords.json (project-related only)

**Fuse Keys:**

****\[\'label\', \'skills\', \'tags\'\]



### **4. Services**

**Data Sources:**

- Static only for now (manually curated)

**Autocomplete Sources:**

- services.json

- search_keywords.json (services-specific fallback)

**Fuse Keys:**

****\[\'label\', \'category\'\]



## **Combined Autocomplete Logic**

### **When category = All**

Use original logic:

\[\...liveDB.talent, \...liveDB.projects, \...liveDB.teams,
\...staticData\]

### **When a category is selected:**

Only run autocomplete using the datasets relevant to that category. All
other results should be excluded.

## **UI Behavior (Dropdown + Search Input)**

****\<select value={category} onChange={setCategory}\>

\<option value=\"all\"\>All\</option\>

\<option value=\"talent\"\>Talent\</option\>

\<option value=\"teams\"\>Teams\</option\>

\<option value=\"projects\"\>Projects\</option\>

\<option value=\"services\"\>Services\</option\>

\</select\>

\<input

type=\"text\"

placeholder={\`Search \${category}\`}

value={query}

onChange={handleSearch}

/\>



## **Future Enhancement**

- Dynamically fetch category-specific filters (e.g. price range for
  services)

- Preload top suggestions per category as hints

## **You\'re Done**

This logic ensures the global search bar behaves differently based on
what users are actually looking for, making search results faster,
smarter, and more relevant.
