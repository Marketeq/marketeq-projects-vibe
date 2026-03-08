**Strapi ↔ NestJS API Integration Guide -- Project Sync Architecture**

This guide provides a step-by-step technical integration plan for
syncing project data between **Strapi (Admin CMS)** and **NestJS
(Backend API with PostgreSQL)**. It ensures that changes made by either
**frontend users** or **Strapi admins** are reflected in both systems
while preserving content moderation workflows, audit logs, and data
integrity.

## **🔁 Overview of Sync Workflow**

### **Primary Rule:**

**NestJS PostgreSQL is the source of truth.** Strapi is an editorial
overlay.

### **What Gets Synced:**

- All editable project data from publishing/editing workflows

- Activity logs (who edited what, when, and from where)

- Moderation statuses (pending, approved, needs_update)

## **🟦 PART 1: Strapi → NestJS Sync**

### **🔹 Trigger**

- Happens **after Strapi admin saves the project** AND it passes
  moderation rules.

### **🔹 Method**

- Strapi fires a POST request to the NestJS backend API.

- Auth is handled via internal API key or JWT.

### **🔹 Endpoint Design (NestJS)**

****POST /internal-sync/projects/:projectId

### **🔹 Payload**

****{

\"title\": \"New Project Title\",

\"short_description\": \"Updated short description\...\",

\"description\": \"\<p\>Rich text\...\</p\>\",

\"skills\": \[\"Figma\", \"Next.js\"\],

\"tags\": \[\"UI\", \"UX\"\],

\"industries\": \[\"Fintech\"\],

\"phases\": \[\...\],

\"status\": \"published\",

\"moderation_status\": \"approved\",

\"source\": \"strapi\",

\"updated_by\": {

\"name\": \"Jane Admin\",

\"email\": \"admin@example.com\",

\"role\": \"admin\"

}

}

> ✅ projectId is matched to the NestJS project database using slug or
> UID.\
> ✅ This triggers a full update on NestJS side.

## **🟨 PART 2: Frontend (Next.js) → NestJS → Strapi**

### **🔹 Trigger**

- Happens after a **user publishes or edits** a project and it passes
  moderation.

### **🔹 Method**

- NestJS pushes to Strapi using the Admin API or a dedicated webhook
  route.

- Auth via API token.

### **🔹 Endpoint (Strapi)**

****POST /api/internal-sync/projects

### **🔹 Payload**

****{

\"slug\": \"ui-redesign-saas\",

\"title\": \"UI Redesign for B2B SaaS\",

\"status\": \"in_review\",

\"description\": \"Updated text\",

\"tags\": \[\...\],

\"skills\": \[\...\],

\"updated_by\": {

\"name\": \"Tim Founder\",

\"email\": \"tim@startup.com\",

\"role\": \"project_owner\"

},

\"source\": \"frontend\"

}

> 🔐 NestJS uses a secure internal token to authorize this write to
> Strapi.\
> 📦 Only send data fields that are relevant to admin display (no need
> to sync pricing, orders, or user auth data).

## **🛡️ Moderation Flow**

### **Auto Trigger:**

- If moderation fails in Strapi (e.g., moderation_status: rejected), the
  project gets marked needs_update in NestJS and vice versa.

### **Version Control:**

- Each push from Strapi or NestJS creates a new version using the
  versioning plugin or custom history table.

## **🧾 Activity Log Structure (in NestJS)**

  ------------------------------------------------------------------
  **Field**       **Type**     **Description**
  --------------- ------------ -------------------------------------
  action_type     string       e.g. updated, flagged, created

  source          string       strapi or frontend

  user            object       { name, email, role }

  timestamp       datetime     ISO format

  changes         object       { field: \[oldValue, newValue\] }
  ------------------------------------------------------------------

## **⚠️ Error Handling**

- If a sync fails, log the failure in both systems.

- Show admin/moderator a UI alert in Strapi.

- Retry logic: Optional retry job with rate-limited queue (Redis or DB
  task queue).

## **✅ Summary Checklist**

- Admin edits push from Strapi → NestJS

- Frontend edits push from NestJS → Strapi

- Moderation status respected in both systems

- Version history + audit trail enabled

- Conflicts resolved by last write with source + user ID

- Activity logs include full change trail

- Strapi is kept in sync so admin edits are always reflected
