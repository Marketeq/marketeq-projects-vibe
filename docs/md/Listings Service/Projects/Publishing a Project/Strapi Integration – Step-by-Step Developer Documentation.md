**Strapi Integration -- Step-by-Step Developer Documentation (for
Project Publishing Fields)**

**This document provides exact instructions for implementing Strapi
admin support for editing and viewing all relevant project publishing
fields.\
\**

## **📁 Project Setup**

1.  **Install Strapi (v4)\**

**npx create-strapi-app@latest my-project-cms \--quickstart**

**cd my-project-cms**

2.  **Install Required Packages\**

**npm install \@strapi/plugin-i18n**

**Enable multilingual support:**

**// config/plugins.js**

**module.exports = () =\> ({**

**i18n: {**

**enabled: true,**

**},**

**});**

****

## **📦 Content Type: project**

**In Strapi Admin Panel:**

- **Go to Content-Types Builder → Create new Collection Type → Name:
  Project\**

**Add the following fields exactly as written:**

### **🧾 Step 1: Project Info**

- **title: Text, required, maxLength 120\**

- **slug: UID (based on title, unique, required)\**

- **short_description: Textarea, required, maxLength 300\**

- **description: Rich Text, required, maxLength 2000\**

- **categories: Relation → Many to Many → Category\**

- **subcategories: Relation → Many to Many → Subcategory\**

- **industries: Relation → Many to Many → Industry\**

- **tags: Component → Tag (repeatable)\**

- **skills: Component → Skill (repeatable)\**

- **deliverables: Rich Text (editable, moderation-enforced on save)\**

- **status: Enumeration --- Required, with values:\**

  - **draft\**

  - **in_review\**

  - **needs_update\**

  - **published\**

  - **archived\**

- **visibility: Enumeration (optional) --- Values:\**

  - **public\**

  - **private\**

  - **unlisted\**

- **owner_id: Text (UUID or user reference)\**

- **admin_notes: Rich Text (internal only)\**

- **admin_tags: Component → AdminTag (repeatable)\**

- **is_flagged: Boolean (internal moderation flag)\**

- **moderation_status: Enumeration --- pending, approved, rejected,
  escalated\**

- **force_review_on_edit: Boolean (default: true)\**

> **📌 status tracks project publication state:**

- **\'draft\' = not visible in marketplace (but still accessible in
  admin panel)\**

- **\'needs_update\' = rejected by moderation and requires updates
  (content violations, needs revisions)\**

### **🖼️ Step 2: Media**

- **featured_image: Media (single image upload)\**

- **additional_images: Media (multiple images)\**

- **video_url: Text field (URL only -- NOT file upload)\**

> **⚠️ Do NOT allow video file uploads. Only plain text URLs are allowed
> (e.g., YouTube, Vimeo).**
>
> **✅ Thumbnails and previews are automatically generated for media. If
> supporting preview of URLs (like YouTube), use frontend logic to
> render video embeds based on video_url.**

### **📐 Step 3: Scope Builder**

**Create a component called Task with these fields:**

- **title: Text\**

- **role_name: Text (from autocomplete)\**

- **location: Text (country)\**

- **experience_level: Enumeration (Student, Junior, Medior, Senior,
  Guru)\**

- **estimated_hours: Integer\**

**Create a component called Phase with these fields:**

- **phase_name: Text\**

- **order: Integer (required)\**

- **tasks: Component Task (repeatable)\**

**Then in Project:**

- **Add field: scope: Component → Phase (repeatable)\**

> **⛔ Do NOT add editable fields for duration, weeks, start day, or end
> day. These are calculated automatically based on task hours and work
> schedules.**

### **👥 Team Assignment (New Tab)**

**Add a component TeamMemberAssignment:**

- **user_email: Text\**

- **work_schedule: Enumeration --- Allowed options:\**

  - **Full-time (40 hours/week)\**

  - **Part-time (20 hours/week)\**

  - **Custom (Biweekly)\**

  - **Custom (Monthly)\**

  - **Custom (Quarterly)\**

  - **Custom (Yearly)\**

- **custom_hours: Integer (only shown/required if any Custom option is
  selected)\**

**Then in Project, add:**

- **assigned_team: Component TeamMemberAssignment (repeatable)\**

> **🗂️ Assigned team members must be assigned to specific tasks. Also
> provide an admin view tab with each team member, their assigned tasks
> count, associated phases, and selected work schedule. Add validation
> logic to show error if a team member exceeds availability limits.**
>
> **🎨 Add color-coded badges for project statuses: draft (gray),
> in_review (yellow), published (green), needs_update (red)**

### **❓ Frequently Asked Questions (Optional Section)**

**Create a component FAQItem:**

- **question: Text\**

- **answer: Rich Text\**

**Then in Project, add:**

- **faqs: Component → FAQItem (repeatable)\**

### **🔍 Additional Fields (Recommended)**

- **seo_title: Text, maxLength 70\**

- **seo_description: Text, maxLength 160\**

- **related_projects: Relation → Many to Many → Project\**

- **activity_log: Component (non-editable) --- includes:\**

  - **action_type: Enumeration (created, updated, submitted, flagged,
    etc.)\**

  - **performed_by: Text (email or ID)\**

  - **timestamp: DateTime\**

  - **field_changed: Text (optional)\**

  - **old_value: Text (optional)\**

  - **new_value: Text (optional)\**

- **preview_token: UID (used for external preview link generation)\**

> **🎯 Add sorting, filtering, and admin view controls for status,
> createdAt, owner_id**
>
> **⚙️ Include a moderation summary panel in admin UI showing last
> action, flagged fields, and update status**
>
> **🔐 Role-based field access: only Super Admins can archive listings
> or reassign team; moderators can only update status or admin_notes**
>
> **📌 Add quick action buttons for: Flag for Review, Approve & Publish,
> Send Back for Edits**
>
> **🧾 Add a \"Send to Review\" button for manual resubmission even if
> auto-review isn't triggered**
>
> **📎 Allow bulk actions (e.g. tagging, publishing, archiving multiple
> projects)**
>
> **💬 Include inline field tooltips for hints and max limits**
>
> **🔁 Auto-generate slugs only on project creation (not on edit)**
>
> **📊 Enable admin-side preview link with token:
> https://yourdomain.com/project-preview/{slug}?token={preview_token}**
>
> **🧠 Add version history support via versioning plugin or custom audit
> log**
>
> **🗂️ Allow tagging projects with internal priority tags (e.g., VIP
> Client, Needs QA)**
>
> **📥 Support future CSV import with validation preview for admins
> (optional)**

## **🔄 Autocomplete Library Sync**

**All autocomplete values (categories, subcategories, industries, tags,
skills) must be synced into Strapi collections.**

**Use the following seed script in /scripts/seed-autocomplete.ts:**

**import fs from \'fs\';**

**import path from \'path\';**

**import { factories } from \'@strapi/strapi\';**

**const categories = require(\'./data/categories.json\');**

**const skills = require(\'./data/skills.json\');**

**const industries = require(\'./data/industries.json\');**

**async function seed() {**

**const strapi = await factories.createStrapi();**

**await strapi.start();**

**for (const name of categories) {**

**await strapi.db.query(\'api::category.category\').create({ data: {
name } });**

**}**

**for (const name of skills) {**

**await strapi.db.query(\'api::skill.skill\').create({ data: { name }
});**

**}**

**for (const name of industries) {**

**await strapi.db.query(\'api::industry.industry\').create({ data: {
name } });**

**}**

**await strapi.destroy();**

**}**

**seed();**

**Run the seed:**

**node scripts/seed-autocomplete.ts**

> **✅ Store your autocomplete values in scripts/data/\*.json**

## **📸 Media Upload Handling**

**Strapi's native media upload UI is required for:**

- **Featured image\**

- **Additional images\**

**No video uploads. Instead:**

- **Use video_url (text input)\**

- **Render video preview using embed URL on frontend\**

> **✅ If using custom code to preview media + show plain text URLs in
> the same interface, document the implementation logic.**

## **🌐 Localization**

**Enable localization on:**

- **Project\**

- **Category, Subcategory, Industry, Tag, Skill\**

**In the content-type settings, enable i18n for each of these models.**

## **🔁 Schema Sync Strategy Between Strapi and Listings Service (No DB Sync)**

**Strapi does not connect directly to the Listings Microservice
database. Instead, we use manual schema mirroring to keep the content
types in Strapi aligned with the data structure of the Listings
Microservice.**

> **This means you manually define each field in Strapi to match the
> same name, type, and structure as the NestJS Listings Microservice
> schema. This ensures that Strapi and the backend stay in sync without
> automatic connections.**

### **✅ How to implement:**

1.  **Match Every Field Name and Type\
    When creating fields in Strapi (e.g., title, description,
    categories), make sure the name and structure exactly match the
    NestJS DTOs and database schema for /listings/projects.\**

2.  **Save Strapi Schemas to GitHub\**

    - **Create a folder: strapi-cms/models/\**

    - **Export your Strapi content type schemas and components\**

    - **Save JSON schema files for every model and component (e.g.,
      project.json, phase.json, task.json)\**

    - **Example path: strapi-cms/models/project.json\**

3.  **Update Procedure for Schema Changes\
    Any time the Listings Microservice schema is updated:\**

    - **Make a matching update in Strapi\**

    - **Export and commit the updated schema JSON to GitHub\**

    - **Add a commit message: Update project schema to match Listings
      v2.1\**

4.  **Why Not Sync DBs Directly?\
    Strapi uses its own internal database structure and admin interface.
    Connecting it directly to the Listings DB can cause:\**

    - **Incompatibility with Strapi's field types\**

    - **Risk of corrupting the backend DB\**

    - **Poor admin experience and no control over validation logic\**

> **✅ Manual sync is safer, version-controlled, and works perfectly for
> admin use cases.**

## **✅ Final Checklist**

- **All editable fields from project publishing flow are covered\**

- **Status values defined and color coded\**

- **Custom hours logic for work schedule validated\**

- **Autocomplete libraries seeded from JSON files\**

- **Media upload and video URL handling documented\**

- **Manual schema mirroring instructions included\**

- **Localization enabled\**

- **Admin-only tools and field access defined\**

- **UX recommendations added for moderation, summaries, quick actions,
  and inline help\**

- **Preview token and client-safe project link logic documented\**

- **Internal tagging and CSV import guidance included\**

- **Slug auto-generation, versioning, and audit trail support defined\**

- **Editing and moderation resubmission logic included\**

- **Activity log enhancements for tracking edits and resubmissions\**

- **AI-generated deliverables section editable with moderation
  trigger\**
