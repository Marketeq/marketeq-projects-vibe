## **✅ Developer Task List: Strapi ↔ NestJS Project Sync**

### **1. Strapi Setup**

- Confirm all editable fields and components from the project schema are
  implemented in Strapi.

- Ensure the force_review_on_edit flag is correctly triggered on all
  relevant updates.

- Install and configure strapi-plugin-versioning (or custom versioning
  if needed).

- Add logic to generate and attach the preview_token on project
  creation.

### **2. Webhook & Job Queue**

- Create a webhook in Strapi to trigger on project update or publish
  events.

- Ensure webhook calls a NestJS endpoint or pushes a job to a Redis
  queue (recommended).

- Implement rate-limiting and retries for the webhook to handle delivery
  failures.

### **3. NestJS -- Project Update API**

- Create a new route in NestJS: PATCH /api/internal/projects/strapi-sync

- Secure the route (IP allowlist, internal API key, or JWT auth).

- Parse the incoming project update payload and validate schema
  compatibility.

- Map strapi_id to internal project ID for lookup.

### **4. Database Sync Logic**

- Build service to apply the Strapi payload to the corresponding
  Postgres record.

- Ensure content moderation status is respected:

  - Only approved changes are written to DB.

- Preserve auto-calculated fields (duration, hours) unless explicitly
  updated.

### **5. Audit Logs & Change Tracking**

- Extend the Listings service audit log to support:

  - source: \"strapi\"

  - modified_by: full name, email, user ID of Strapi admin

- Include all field-level changes and timestamps.

### **6. Front-End Consistency**

- Confirm project updates from Strapi reflect in frontend UI via the
  existing API.

- Invalidate relevant frontend cache (if using any).

- Confirm marketplace reflects updated data within seconds of Strapi
  update.

### **7. Backfill & Resync (One-Time)**

- Write a CLI script to backfill existing projects from Strapi to NestJS
  for initial sync.

- Allow forced resync per project ID (via internal admin endpoint or CLI
  param).

### **8. Testing & QA**

- Write unit tests for NestJS sync endpoint.

- Perform end-to-end test for full cycle:

  - Admin edits project in Strapi

  - Project passes moderation

  - Changes appear live in frontend
