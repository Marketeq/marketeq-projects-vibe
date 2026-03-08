# **Rejecting Nonsense Autocomplete Entries**

**Location:** docs/autocomplete/validation/rejecting-nonsense.md

This guide outlines how to detect and reject autocomplete entries that
are grammatically valid but irrelevant, absurd, or unrelated to the
talent marketplace. It applies to all user-generated content types: job
titles, skills, certifications, tags, and categories. Industry entries
are not user-generated and must be sourced from the approved external
api or static list managed by the platform. This document supports your
moderation pipeline across all autocomplete content types and enforces
strict content integrity aligned with platform standards.

## **🎯 Objective**

Prevent autocomplete entries that pass spellcheck and profanity filters
but are not suitable for public or professional use on the platform.

## **💡 Examples of Rejected Terms**

  -------------------------------------------------------------------------
  **Entry Type**  **Label**              **Reason for Rejection**
  --------------- ---------------------- ----------------------------------
  Job Title       Dungeon Master         Fictional role with no career
                                         relevance

  Skill           Jedi Mind Tricks       Pop culture reference + no valid
                                         match

  Industry        Rainbow Industrial     Fabricated industry
                  Complex                

  Tag             Goblin Marketing       Meme reference + category mismatch

  Certification   Nude Stunt             Inappropriate term + not
                  Coordination           category-matchable
  -------------------------------------------------------------------------

Prevent autocomplete entries that pass spellcheck and profanity filters
but are not suitable for public or professional use on the platform.

## **✅ Step 1: Heuristic Filters (Nonsense Keyword Blocklist)**

Use the shared nonsense keyword blocklist stored in:

/data/autocomplete/blocklists/nonsense_keywords.json

### **Rejection Rules:**

- Reject any entry if **1 or more** words match the blocklist.

- Reject any entry if **more than 1** word in the label matches any
  nonsense word subset (e.g., fictional, slang, absurd terms).

## **✅ Step 2: Category Match Validation**

Every entry must match a valid, active category from the categories
table in PostgreSQL, as synced with Strapi CMS.

### **Rejection Rules:**

- Reject if category is null.

- Reject if is_active is false for the matched category.

- Reject if the assigned category is mismatched based on predefined
  rules in:

/data/autocomplete/mappings/category_rules.json



## **✅ Step 3: Semantic Similarity Filtering**

Use the all-MiniLM-L6-v2 model from SentenceTransformers to embed
entries.

### **Rejection Rules:**

- Reject if cosine similarity to **all approved entries of the same
  type** is below 0.75.

- Embeddings must be calculated and compared using pre-approved baseline
  vectors stored in:

/data/autocomplete/semantic_baselines/{type}.json



## **✅ Step 4: Marketplace Relevance Classifier**

Train and deploy a binary classifier that predicts relevance to the
marketplace.\
This classifier must:

- Return a confidence score from 0 to 1

- Be applied after heuristic and semantic filters

### **Example Input Format:**

****{

\"label\": \"Underwater Firefighter\",

\"type\": \"job_title\"

}

### **Example Output Format:**

****{

\"label\": \"Underwater Firefighter\",

\"type\": \"job_title\",

\"classifier_score\": 0.42

}

### **Rejection Rules:**

- Reject any entry where model score \< 0.65.

- Classifier must be trained using approved vs. rejected entries from
  your moderation logs.

## **❌ Universal Rejection Rules**

Reject any entry under the following conditions:

- Contains at least one word from the nonsense blocklist

- Cannot be matched to an active category

- Cosine similarity to all approved entries is \< 0.75

- Marketplace classifier score is \< 0.65

- Length is \< 3 characters or \> 100 characters

- Entry includes more than 4 words

## **🗃️ Storage of Rejected Entries**

Rejected entries must be logged by type:

/data/user_suggestions/rejected/skills_rejected.json

/data/user_suggestions/rejected/job_titles_rejected.json

/data/user_suggestions/rejected/certifications_rejected.json

/data/user_suggestions/rejected/tags_rejected.json

/data/user_suggestions/rejected/categories_rejected.json

Log Format:

{

\"label\": \"Goblin Marketing\",

\"type\": \"tag\",

\"status\": \"rejected\",

\"reason\": \"nonsense keyword + category mismatch\",

\"timestamp\": \"2025-05-13T17:00:00Z\"

}



## **🔧 Maintenance Protocols**

- Update the blocklist in /blocklists/nonsense_keywords.json every 90
  days

- Refresh semantic baseline vectors weekly

- Retrain the classifier monthly using the latest moderation logs

- Log all rejected entries automatically with timestamp and reason

- Flag edge cases to /data/user_suggestions/needs_manual_review.json
