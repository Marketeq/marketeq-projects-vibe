Structured **Project Data Dictionary**:

### **📘 Project Data Dictionary (Core Fields for Algolia & Backend Schema)**

  -------------------------------------------------------------------------------------------------
  **Field Name**       **Frontend      **Type**   **Searchable**   **Filterable**   **Notes**
                       Label**                                                      
  -------------------- --------------- ---------- ---------------- ---------------- ---------------
  title                Section H1      string     ✅               ❌               Project title
                       Title                                                        or headline

  subtitle             H2 / H3 Title   string     ✅               ❌               Optional
                                                                                    subheading

  overview             Description     text       ✅               ❌               Long-form
                                                                                    content

  budget_starting_at   Starting At     number     ❌               ✅               Minimum weekly
                                                                                    rate

  initial_payment      Initial Payment number     ❌               ✅               Deposit to
                                                                                    begin

  project_duration     Duration        string     ❌               ✅               \"6 months\"
                                                                                    etc.

  team_size_minimum    Minimum Team    number     ❌               ✅               Required team
                       Members                                                      size

  skills               Skills &        array      ✅               ✅               Core skill tags
                       Expertise                                                    

  technologies         Development     array      ✅               ✅               Frameworks or
                       Tech                                                         stacks

  subcategories        Subcategories   array      ✅               ✅               Tags or nested
                                                                                    category

  tags                 Tags            array      ✅               ✅               Industry or
                                                                                    audience tags

  ratings              Rating          number     ❌               ✅               Avg. review
                                                                                    rating

  sales                Sales           number     ❌               ✅               Completed
                                                                                    projects

  date_published       Date Published  date       ❌               ✅               For
                                                                                    sort/ranking

  location             Locations       array      ❌               ✅               Supported
                                                                                    regions

  languages            Languages       array      ❌               ✅               Spoken
                                                                                    languages

  project_lead         Project Lead    string     ✅               ❌               Optional name

  deliverables         Deliverables    array      ✅               ❌               Main output
                                                                                    promises

  phases               Phase Names     array      ❌               ❌               e.g. Research,
                                                                                    Design

  project_category     Top-Level       string     ✅               ✅               Main service
                       Category                                                     area
  -------------------------------------------------------------------------------------------------
