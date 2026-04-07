## **🧭 Marketeq Developer Onboarding -- Search Functionality**

### **👋 Welcome**

This doc is for developers responsible for building or extending the
search experience across Talent, Projects, Services, and (eventually)
Jobs. It includes what you need to know, and where to look next.

### **🔧 Your Responsibilities**

1.  **Implement backend route**: POST /search

    - Accept entity, query, filters, sort, pagination

    - Validate input using data dictionaries

    - Route to Algolia using correct index

    - Fallback to DB if Algolia fails

2.  **Connect to Algolia**:

    - Use appropriate index: projects, services, talent

    - Apply filters using filters and facetFilters config

    - Respect searchable attributes + custom ranking

3.  **Enforce autocomplete moderation**:

    - Run all new user-generated text (skills, tags, titles) through
      moderation before saving

    - Refer to the "Autocomplete Rejection Examples" doc

4.  **Prepare for personalization layer** (optional)

    - Make the /search controller ML-ready: if user_id is passed, send
      data to re-ranker microservice

### **🧰 Key Resources**

  ------------------------------------------------------------------
  **🔗 Resource**        **📄 Document Name**
  ---------------------- -------------------------------------------
  Search field schema    Project / Talent / Service Data Dictionary
                         (Simple Tables)

  Algolia configs        algolia-settings-\[entity\].json

  API contract           Search API Contract

  Testing guide          Search Testing & QA Plan

  Postman collection     Marketeq_Search_API_Postman_Collection

  Moderation rules       Autocomplete Rejection Examples

  Entity relationships   Entity Relationships Schema (visual + doc)
  diagram                

  Optional ML layer plan Personalization Layer Plan
  ------------------------------------------------------------------

### **🧠 Pro Tips**

- Don't use internal field names on the frontend --- always match
  **frontend labels** in filter configs

- All entities support pagination and sorting --- even empty states are
  handled

- Moderation must **block toxic, spammy, or banned terms** before
  they\'re saved or indexed
