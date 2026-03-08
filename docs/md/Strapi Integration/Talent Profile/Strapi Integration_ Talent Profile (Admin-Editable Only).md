# **Strapi Integration: Talent Profile (Admin-Editable Only)**

### **📌 Purpose**

This document defines the **admin-editable schema** for the
TalentProfile collection in Strapi. It reflects only the fields that
should be manually editable by administrators, based on the official UI
wireframe and data architecture requirements.

### **📊 Collection Type: TalentProfile**

**Path:\**
/src/api/talent-profile/content-types/talent-profile/schema.json

{

\"kind\": \"collectionType\",

\"collectionName\": \"talent_profiles\",

\"info\": {

\"singularName\": \"talent-profile\",

\"pluralName\": \"talent-profiles\",

\"displayName\": \"Talent Profile\",

\"description\": \"Editable profile fields managed by admin users\"

},

\"options\": {

\"draftAndPublish\": false

}

}



### **✅ Admin-Editable Fields (Included in Schema)**

  **Field Name**       **Type**                  **Notes**
  -------------------- ------------------------- ----------------------------------------------------
  username             UID                       Must follow slug, lowercase, and uniqueness rules
  availability         Dropdown                  Predefined list: e.g. 10, 20, 30, 40 hrs/week
  location             String                    City or country
  timezone             String                    Dropdown with autocomplete, e.g., America/New_York
  skills               Relation (many-to-many)   References central skills table
  industry_expertise   Relation (many-to-many)   References central industries table
  overview             Rich Text                 Full bio description
  certifications       Component (repeatable)    Title, organization, date_awarded
  languages            Component (repeatable)    Language and fluency
  education            Component (repeatable)    Degree, institution, graduation_year
  work_experience      Component (repeatable)    Role, company, start/end dates, summary

### **🔐 Username Validation Rules**

- Lowercase only

- 3--30 characters

- Slug-safe (used in profile URL)

- Unique

- Users can change every 90 days (API-enforced)

- Admin can override anytime

### **📉 Excluded System-Generated Fields**

  --------------------------------------------------
  **Field**               **Source**
  ----------------------- --------------------------
  response_time           Calculated by messaging
                          system

  client success rating   From review-service

  total projects          From project-service
  completed               

  repeat hire rate        Derived metric

  member since            System-created timestamp

  project reviews         Review service, optionally
                          linked

  project history         From project-service

  status (Offline)        Based on real-time
                          availability
  --------------------------------------------------

### **🛠 Deployment Instructions**

1.  Create TalentProfile in Content-Type Builder.

2.  Use relations for skills, industries, etc.

3.  Use components for education, work_experience, etc.

4.  Ensure UID validation on username.

5.  Restart Strapi and test in Admin UI.
