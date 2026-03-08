**The Category Pages Services and the Strapi Categories
[[nest.js]{.underline}](http://nest.js) logic will be in the same
microservice folder.**

Put the Category Pages assembler **inside the existing Categories
microservice**, as a separate Nest module + route prefix
(/api/category-pages). Reasons:

- **Consistency:** Shares the same category tree, publish state, and
  webhooks. No cross-service calls just to resolve L1→L2→L3 or check
  "published."

- **Simplicity & speed:** One hop from the FE to the assembler. Easier
  cache keys and selective revalidation when categories/tax groups
  change.

- **No duplication:** Editorial (FAQs/guides/courses/hero) stays in
  Strapi; the assembler reads it---no extra DBs.

### **How to lay it out (quick)**

- **Modules in the Categories service:\**

  - CategoriesCoreModule (your existing CRUD + resolve/children)

  - CategoryPagesModule (assembler/controller at
    /api/category-pages/\...)

  - SuggestionsLocalModule (HF embeddings helper; no separate service)

  - EditorialProxy (reads Strapi for FAQ/guides/courses/hero)

- **Routes:\**

  - /categories/\... (existing internal reads)

  - /api/category-pages/{l1}\[/{l2}\[/{l3}\]\]?kind=\... (frontend)

- **Cache/invalidations:** Same process can purge edge cache on
  Strapi/Nest webhooks (category/tax-group changes).
