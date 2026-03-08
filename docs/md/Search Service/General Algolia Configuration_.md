**General Algolia Search Configuration:\
\**
This configuration is not specific, and should be updated according to
the design files and detailed documentation. The purpose is just to give
you a general idea of what type of customization may be required for
each type of search performed.

### **🔧 Algolia Customization Per Entity Type**

#### **1. Talent**

- **Index Name:** talent_profiles

- **Searchable Attributes:** name, skills, job_title, location, bio

- **Custom Ranking:\**

  - availability (e.g., available now \> 2 weeks notice)

  - match_score (based on past hires or preferences)

  - response_rate

- **Facets:\**

  - location, languages, hourly_rate, years_of_experience

#### **2. Teams**

- **Index Name:** teams

- **Searchable Attributes:** team_name, specialties, stack,
  featured_projects

- **Custom Ranking:\**

  - team_rating, successful_deliveries, team_size

- **Facets:\**

  - team_size, project_categories, region, avg_response_time

#### **3. Projects**

- **Index Name:** projects

- **Searchable Attributes:** project_title, description, technologies,
  industry

- **Custom Ranking:\**

  - popularity_score (clicks, saves)

  - recency

- **Facets:\**

  - budget_range, timeline, industry, location

#### **4. Services**

- **Index Name:** services

- **Searchable Attributes:** service_title, description, category, tags

- **Custom Ranking:\**

  - conversion_rate

  - completion_time

- **Facets:\**

  - category, pricing_model, duration, required_skills

#### **5. Jobs**

- **Index Name:** jobs

- **Searchable Attributes:** job_title, company_name, description,
  skills_required

- **Custom Ranking:\**

  - urgency, date_posted, match_score

- **Facets:\**

  - employment_type, location, industry, salary_range

### **🧠 Optional Features (All Entities)**

- **Typo Tolerance:** On name, off for skills (to avoid false matches)

- **Synonyms:** e.g., "dev" = "developer", "frontend" = "front-end"

- **Geo Search:** Filter or rank by distance

- **Personalization:** User history or preferences can boost ranking
  (via userToken)

- **Multi-index Search:** Use federated search to show all results from
  one query (/search?q=designer shows talent + jobs + services)

You **don't need to include all the search filters now**, but you do
need to **plan for filter scalability** from day one.

### **✅ What You *Should* Do Now**

1.  **Define core filters per entity\**
    Only include the **critical filters** your UI will expose in v1
    (e.g., location, rate, skills, availability for talent).

2.  **Structure filters in a scalable way\**
    Use flat but expandable key-value pairs in Algolia and your DB
    schema, like:

{

\"skills\": \[\"React\", \"TypeScript\"\],

\"availability\": \"full-time\",

\"hourly_rate\": 60,

\"location\": \"Miami, FL\"

}

3.  \
    **Use Algolia's attributesForFaceting\**
    Even if you're not showing the filter yet, it's safe to define more
    attributes in attributesForFaceting for future use --- they won't
    slow down search unless you query them.

### **❗ What to Avoid**

- **Don't hardcode filters into your frontend logic** --- drive them
  from config or backend schema

- **Don't wait to normalize filter data** --- bad filters (e.g. freeform
  locations, inconsistent skills) will break search later

### **🔄 Suggested Approach**

  **Stage**                   **Filters Included**                       **Filters Structured for Expansion?**
  --------------------------- ------------------------------------------ ---------------------------------------
  v1 UI                       Only the visible filters (4--6 max)        ✅ Yes
  Backend & Algolia           Full attributesForFaceting list prepared   ✅ Yes
  Admin CMS or Sync Scripts   Include all possible future fields         ✅ Yes

### **✅ To Recap**

#### **1. Include only core searchable attributes in v1**

- These are fields users expect to search now (e.g., name, title,
  skills, location).

- Keep it tight to reduce noise and improve performance.

#### **2. Prepare your Algolia config to expand later**

- Algolia's searchableAttributes array is **ordered by priority**, so
  you can:

  - Start with a few

  - Add others (like bio, project_summary, certifications) later without
    breaking anything

#### **3. Normalize and index hidden attributes now**

- Even if they're not searchable yet, make sure data like industries,
  tools_used, timezone, or spoken_languages are indexed --- so you\'re
  ready when you want to make them searchable.

### **⚠️ What to Avoid**

- Don't let users free-type fields that should be structured (e.g.,
  job_title, skills, tools)

- Don't overload Algolia with low-quality or duplicate fields too early
  (hurts relevance and speed)

### **🔍 Example: Searchable Attributes (Talent v1)**

****\[

\"name\",

\"job_title\",

\"skills\",

\"location\",

\"overview\"

\]

And you can add later:

\[

\"certifications\",

\"industries\",

\"spoken_languages\",

\"tools_used\"

\]



###  You **should include all relevant description fields as searchable attributes in v1**, but set their priority **lower** than structured fields like skills or job_title.

### 

### **🔍 Recommended searchableAttributes Order (Talent Example)**

### ****\[

###  \"unordered(job_title)\",

###  \"unordered(skills)\",

###  \"unordered(location)\",

###  \"unordered(certifications)\",

###  \"unordered(name)\",

###  \"unordered(overview)\",

###  \"unordered(about_me)\",

###  \"unordered(bio)\",

###  \"unordered(project_highlights)\"

### \]

### 

### **📌 Best Practices for Description Fields**

### **Use unordered(\...)**: Prevent Algolia from requiring the exact phrase order in free text. 

### **Normalize length**: Truncate to 500--1000 characters max in the index to avoid bloating relevance calculations. 

### **Moderate for spam/AI filler**: These fields can easily get bloated or misused if user-generated. 

### 

### **Optional: Field Merging**

### If you want to simplify things:

### Combine overview, about_me, and bio into a single field like description_text when syncing to Algolia. 

### Then index only description_text. 

### Example:

### {

###  \"description_text\": \"I\'m a full-stack developer with 7+ years experience\...\"

### }

### 

### **🧠 Bottom Line**

Start lean --- **index broadly but search narrowly**. Keep your
searchableAttributes focused, but design your schema with the assumption
that you'll **turn on more later**.
