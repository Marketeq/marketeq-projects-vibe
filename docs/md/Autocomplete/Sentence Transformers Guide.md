**Sentence Transformers Guide**\
\
To reject terms that don't semantically fit into your existing
categories (e.g., "Goblin Marketing" not fitting marketing, tech, etc.),
the best Hugging Face model is:

## **✅ Model Recommendation**

### **🔹 sentence-transformers/all-MiniLM-L6-v2**

  --------------------------------------------------------------------------------------------------
  **Property**   **Value**
  -------------- -----------------------------------------------------------------------------------
  Model Name     all-MiniLM-L6-v2

  Provider       [[SentenceTransformers on Hugging
                 Face]{.underline}](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

  Embedding Size 384 dimensions

  Speed          Very fast, even on CPU

  Accuracy       High enough for job/skill/cert comparisons

  License        Apache 2.0 (commercial use allowed)
  --------------------------------------------------------------------------------------------------

## **✅ How to Use It for Category Validation**

### **Step 1: Embed the user input**

****from sentence_transformers import SentenceTransformer

model = SentenceTransformer(\'all-MiniLM-L6-v2\')

vector = model.encode(\"Goblin Marketing\")

### **Step 2: Compare to existing labeled embeddings**

Use cosine similarity to compare against pre-embedded baseline entries
like:

\[

{ \"label\": \"Growth Marketing\", \"category\": \"marketing\",
\"embedding\": \[\...\] },

{ \"label\": \"Full Stack Developer\", \"category\": \"tech\",
\"embedding\": \[\...\] },

\...

\]

### **Step 3: Apply Rejection Threshold**

Reject if:

- Cosine similarity to all entries in any one category is **\< 0.75\**

- OR cosine similarity to **all known entries across all categories** is
  **\< 0.70\**
