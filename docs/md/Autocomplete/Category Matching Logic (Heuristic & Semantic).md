# **Category Matching Logic (Heuristic & Semantic)**

**Location:** docs/autocomplete/validation/category-matching.md

This guide explains how user-submitted autocomplete entries are matched
to categories using both deterministic keyword rules (heuristics) and
fuzzy logic (semantic similarity). It supports category assignment
across skills, job titles, certifications, and more. This guide ensures
consistency in how your system assigns categories --- balancing
rule-based speed with semantic flexibility powered by open-source
embeddings.

## **🎯 Objective**

To assign every autocomplete entry a valid, active category from the
Strapi-managed PostgreSQL categories table. If no match is found, the
entry is flagged or rejected.

## **🧠 1. Heuristic Matching (Rule-Based)**

This method uses direct keyword matching or patterns based on known role
structures.

### **✅ Logic**

- Match known keywords to category values

- Load from /data/autocomplete/mappings/category_rules.json

### **📁 Example Rule File**

****{

\"tech\": \[\"engineer\", \"developer\", \"backend\", \"blockchain\"\],

\"marketing\": \[\"seo\", \"growth\", \"media\", \"content\"\],

\"legal\": \[\"attorney\", \"paralegal\", \"compliance\", \"legal\"\]

}

### **🔍 Matching Process**

****function assignHeuristicCategory(label: string): string \| null {

const terms = label.toLowerCase().split(/\\s\|\\-/);

for (const \[category, keywords\] of Object.entries(ruleMap)) {

if (keywords.some(k =\> terms.includes(k))) {

return category;

}

}

return null;

}

### **✅ Strengths**

- Fast and explainable

- Easy to update manually

### **❌ Limitations**

- Doesn't catch ambiguous or compound terms

- Doesn't generalize to new expressions

## **🤖 2. Semantic Matching (Vector-Based)**

Used when no heuristic match is found.\
Embeds the input label and compares it to known examples from approved
entries.

### **✅ Recommended Engine**

Use the open-source **SentenceTransformers** model from Hugging Face:

sentence-transformers/all-MiniLM-L6-v2

- \
  ✅ 100% free to run locally

- ✅ Fast (MiniLM, 384 dimensions)

- ✅ Accurate for job/skill/cert name matching

### **✅ Setup (Python Example)**

****from sentence_transformers import SentenceTransformer

model = SentenceTransformer(\'all-MiniLM-L6-v2\')

embedding = model.encode(\"Prompt Engineer\")

- \
  Run in a FastAPI/Flask wrapper

- Call from NestJS via internal HTTP request

### **🔍 Matching Logic (Conceptual)**

****function assignSemanticCategory(inputLabel: string): string \| null
{

const inputVector = getEmbedding(inputLabel); // via API call to Python
service

const candidates = allCategoryTaggedVectors;

const ranked = candidates.map(c =\> ({

category: c.category,

score: cosineSimilarity(c.embedding, inputVector)

})).sort((a, b) =\> b.score - a.score);

return ranked\[0\].score \> 0.85 ? ranked\[0\].category : null;

}

### **✅ Strengths**

- Handles misspellings, variations, unseen terms

- Generalizes better than rules

### **❌ Limitations**

- Requires separate microservice

- Not human-explainable

## **🧪 3. Combined Flow**

****function matchCategory(label: string): string \| null {

return (

assignHeuristicCategory(label) \|\|

assignSemanticCategory(label) \|\|

null

);

}

If null is returned, label is stored in:

/data/user_suggestions/new_categories_pending.json

or written to the database with category = null and status =
\'rejected\'

## **🛠️ Notes**

- Heuristic rules should be reviewed quarterly

- Semantic model cache should be updated weekly with new approved
  entries

- Add new keywords to category_rules.json after consistent suggestions
