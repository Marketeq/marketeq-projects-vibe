✅ **Finalized Filter Fields** table for **project search**, reflecting
the frontend filter labels, field names, and production-ready mappings:

### **✅ 1. Finalized Filter Fields for Project Search**

  ---------------------------------------------------------------------------------------------------------------------------
  **Frontend   **Backend Field Name**   **Type**      **Filterable**   **Algolia Faceting**                 **Notes**
  Filter                                                                                                    
  Label**                                                                                                   
  ------------ ------------------------ ------------- ---------------- ------------------------------------ -----------------
  Category     project_category         string        ✅               filterOnly(project_category)         High-level
                                                                                                            service or
                                                                                                            category

  Tags         tags                     array         ✅               filterOnly(tags)                     General tech,
                                                                                                            market, or
                                                                                                            use-case tags

  Project Type project_type             string        ✅               filterOnly(project_type)             e.g., Mobile App,
                                                                                                            Desktop App

  Industry     industry                 string        ✅               filterOnly(industry)                 Target industry
                                                                                                            (Fintech, Real
                                                                                                            Estate)

  Budget       budget_range             numberRange   ✅               filterOnly(budget_range)             Min--Max budget
                                                                                                            selection

  Skills       skills                   array         ✅               filterOnly(skills)                   User-added or
                                                                                                            predefined skill
                                                                                                            tags

  Additional   additional_tags          array         ✅               filterOnly(additional_tags)          AI, IoT, ML, etc.
  Tags                                                                                                      

  Project      project_duration_range   enum          ✅               filterOnly(project_duration_range)   Uses exact
  Length                                                                                                    frontend label
                                                                                                            values

  Team Size    team_size_range          enum          ✅               filterOnly(team_size_range)          Uses exact
                                                                                                            frontend label
                                                                                                            values
  ---------------------------------------------------------------------------------------------------------------------------
