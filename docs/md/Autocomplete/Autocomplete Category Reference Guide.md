# **Autocomplete Category Reference Guide**

**Location:** docs/autocomplete/validation/categories.md

This guide defines the full category system used to validate, assign,
and organize user-generated autocomplete entries across job titles,
skills, certifications, industries, and more. Use this guide to keep
category assignments aligned with your Strapi CMS and database, and to
maintain a clean, moderated autocomplete experience.

## **🎯 Purpose of Categories**

Categories ensure that all user-submitted data:

- Aligns with the structure of your marketplace

- Can be indexed, searched, and filtered accurately

- Filters out irrelevant or nonsensical entries (e.g. \"Clown Circus
  Trainer\")

All category records are stored in **PostgreSQL** and managed through
the **Strapi CMS**. Strapi acts as the administrative interface for
adding, editing, or deactivating categories.

## **🧱 Primary Category Types**

All autocomplete entries should belong to one of the following **root
categories**, which are stored in the categories table in Postgres and
mirrored in Strapi:

  --------------------------------------------------
  **Category**   **Common Use Cases**
  -------------- -----------------------------------
  tech           Engineering, DevOps, Web3, AI, Data
                 Science

  design         UX, UI, Product Design, Branding

  marketing      Growth, Paid Media, SEO, Content

  sales          SDRs, BDRs, Account Executives,
                 RevOps

  finance        Accounting, Auditing, Strategy,
                 FP&A

  legal          Contract Law, IP, Compliance,
                 Jurisprudence

  operations     Project Mgmt, Recruiting, Admin, HR

  education      eLearning, Curriculum, Research
                 Assistants

  data           Analysts, Visualization, Research

  product        PMs, TPMs, Product Ops

  other          For valid edge cases that don\'t
                 fit anywhere
  --------------------------------------------------

These records are managed in the categories table and may include:

CREATE TABLE categories (

id SERIAL PRIMARY KEY,

name TEXT UNIQUE NOT NULL,

type TEXT NOT NULL, \-- e.g. \'skill\', \'job_title\', \'certification\'

is_active BOOLEAN DEFAULT true

);



## **🧠 How Categories Are Assigned**

1.  **Exact Match Lookup:\**

    - Map user input (label) to existing category rules in
      category_rules.json or PostgreSQL

2.  **Heuristic Matching:\**

    - Use common term matching rules (e.g. Engineer, Developer → tech)

3.  **Fuzzy Lookup (Optional):\**

    - Apply semantic matching against known category-tagged entries

4.  **New Categories:\**

    - Entries that don't match are stored in:

/data/user_suggestions/new_categories_pending.json

- \
  Or optionally inserted into the categories table with is_active =
  false

## **🔍 Rejection Criteria Based on Category**

Reject a user submission if:

- ❌ It can't be matched to an existing active category from the
  database

- ❌ Its assigned category contradicts known semantic clusters

- ❌ It is nonsensical or irrelevant to any category Strapi has enabled

Example:

{

\"label\": \"Clown Circus Trainer\",

\"type\": \"job_title\",

\"category\": null,

\"status\": \"rejected\",

\"reason\": \"no category match\"

}



## **🛠️ Managing Categories in Strapi**

- Use the **Strapi Admin UI** to:

  - Add new root categories

  - Update category names or types (e.g. skill, certification)

  - Deactivate obsolete categories (is_active = false)

- Strapi writes changes to the categories table in PostgreSQL

- Validation logic uses **only active categories** when assigning or
  checking entries

## **📂 Related File & DB References**

- Approved entries: /data/autocomplete/user_generated/\*.json

- Category rules (legacy fallback):
  /data/autocomplete/mappings/category_rules.json

- Database source of truth: public.categories (Postgres)

- CMS interface: Strapi \> Collections \> Categories

- Unknown: /data/user_suggestions/new_categories_pending.json
