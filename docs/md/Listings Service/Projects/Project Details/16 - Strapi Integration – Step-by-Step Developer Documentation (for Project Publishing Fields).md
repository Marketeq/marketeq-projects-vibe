**STRAPI INTEGRATION -- DEVELOPER GUIDE FOR PROJECT PUBLISHING & EDITING
(LISTINGS CMS)**

**This guide provides a step by step implementation guide for building
the Project content type in Strapi, syncing it with the Listings
microservice, and enabling admin editing, status moderation, and media
handling.**

### **🧱 1. Project Setup**

**npx create-strapi-app@latest my-project-cms \--quickstart**

**cd my-project-cms**

**npm install \@strapi/plugin-i18n**

**Enable i18n:**

**// config/plugins.js**

**module.exports = () =\> ({**

**i18n: {**

**enabled: true,**

**},**

**});**

****

### **🧩 2. Project Content Type -- Field Structure**

#### **Basic Project Info**

  **Field**                  **Type**        **Notes**
  -------------------------- --------------- -------------------------------------------------------------
  **title**                  **Text**        **Required**
  **slug**                   **UID**         **Based on title, auto-generated**
  **short_description**      **Textarea**    **Required, max 300 chars**
  **description**            **Rich Text**   **Required, max 2000 chars**
  **deliverables**           **Rich Text**   **Editable by humans, triggers moderation on edit or save**
  **status**                 **Enum**        **draft, in_review, needs_update, published, archived**
  **visibility**             **Enum**        **public, private, unlisted**
  **owner_id**               **Text**        **Stores UUID from user-service**
  **admin_notes**            **Rich Text**   **Internal only**
  **admin_tags**             **Component**   **AdminTag, repeatable**
  **is_flagged**             **Boolean**     **For internal flagging**
  **moderation_status**      **Enum**        **pending, approved, rejected, escalated**
  **force_review_on_edit**   **Boolean**     **Defaults to true**

#### **Media Handling**

  **Field**               **Type**                  **Notes**
  ----------------------- ------------------------- -----------------------------------------------------------------
  **featured_image**      **Media (image)**         **Uses native Strapi uploader**
  **additional_images**   **Media (multi-image)**   **Same as above**
  **video_url**           **Text**                  **Only embed links (YouTube, Vimeo); no video uploads allowed**

***Front-end logic must generate previews from video URLs. Backend
stores raw text URL only.***

#### **Project Scope & Tasks**

**Create components:**

**Component: Task**

- **title (text)\**

- **role_name (text from autocomplete)\**

- **location (text)\**

- **experience_level (enum: Student, Junior, Medior, Senior, Guru)\**

- **estimated_hours (integer)\**

**Component: Phase**

- **phase_name (text)\**

- **order (integer)\**

- **tasks (repeatable Task)\**

**Add field to Project:**

- **scope (repeatable Phase)\**

#### **Team Assignment**

**Component: TeamMemberAssignment**

- **user_email (text)\**

- **work_schedule (enum):\**

  - **Full-time\**

  - **Part-time\**

  - **Custom (Biweekly)\**

  - **Custom (Monthly)\**

  - **Custom (Quarterly)\**

  - **Custom (Yearly)\**

- **custom_hours (integer; required if work_schedule is custom)\**

**Add to Project:**

- **assigned_team (repeatable TeamMemberAssignment)\**

> **Admin panel must display validation logic to ensure no user exceeds
> weekly/monthly hour limits.**

#### **FAQs**

**Component: FAQItem**

- **question (text)\**

- **answer (rich text)\**

**Add to Project:**

- **faqs (repeatable FAQItem)\**

#### **SEO & Admin Features**

  -----------------------------------------------------------------------------
  **Field**              **Type**        **Notes**
  ---------------------- --------------- --------------------------------------
  **seo_title**          **Text**        **Max 70 chars**

  **seo_description**    **Text**        **Max 160 chars**

  **related_projects**   **Relation**    **Many-to-many with Project**

  **preview_token**      **UID**         **Used for external previews**

  **activity_log**       **Component**   **Logs moderation or admin actions**
  -----------------------------------------------------------------------------

**Component: ActivityLogEntry**

- **action_type (enum)\**

- **performed_by (text)\**

- **timestamp (datetime)\**

- **field_changed, old_value, new_value (optional text fields)\**

### **🔄 3. Autocomplete Sync Script**

**Store values in /scripts/data/:**

- **categories.json\**

- **skills.json\**

- **industries.json\**

**Seed script: /scripts/seed-autocomplete.ts**

**import { factories } from \'@strapi/strapi\';**

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

**Run:**

**node scripts/seed-autocomplete.ts**

****

### **🧠 4. Admin Panel Enhancements**

- **Color-coded badges:\
  draft (gray), in_review (yellow), published (green), needs_update
  (red)\**

- **Role-based editing:\**

  - **Super Admins: full access\**

  - **Moderators: can only update moderation_status, admin_notes\**

  - **View-only roles: read-only\**

- **Add buttons:\**

  - **Approve & Publish\**

  - **Send Back for Edits\**

  - **Flag for Review\**

- **Add toggle for preview mode:\
  Preview URL:\
  https://domain.com/project-preview/{slug}?token={preview_token}\**

### **🔐 5. Schema Sync (Manual -- No DB Sync)**

**Strapi and Listings microservice must use manual schema mirroring.**

- **Create strapi-cms/models/\**

- **Export .json schemas of all Strapi content types\**

- **Sync with NestJS ProjectDto in Listings\**

- **Commit with message:\
  Update project schema to match Listings v2.1\**

### **🚀 6. Publishing & Editing Logic**

- **When saving or publishing a project:\**

  - **If any edited fields are marked requires_moderation, trigger
    moderation review\**

  - **status changes from draft → in_review\**

  - **If approved: published\**

  - **If rejected: needs_update and auto-comment appears in
    admin_notes\**

- **Admins can edit, flag, resubmit, or archive a project.\**

### **✅ 7. Final QA Checklist**

- **All project publishing fields defined\**

- **All statuses and moderation flow enabled\**

- **Editable AI-generated fields are reviewable\**

- **Autocomplete sync script included\**

- **Strapi-native image upload & video URL logic handled\**

- **Manual schema mirroring across backend\**

- **Admin UX enhancements fully defined\**

- **Project editing support included\**

- **No logic left to developer interpretation\**
