**Strapi Collection Type: Project Listings (Based on Final Project
Details Design)**

This document outlines how to build the **\"Projects\"** collection type
in Strapi v5, fully aligned with the editable fields from the **Project
Details design** in Figma. It ensures compatibility with frontend flows
for listing, preview, media upload, and checkout.

### **🔹 Collection Name**

- **Display name**: Projects

- **API ID**: project

- **UID**: api::project.project

Enable **Draft & Publish** mode.

### **🔹 Core Fields (Editable in Admin Panel)**

  ----------------------------------------------------------------------------
  **Field Label**  **Field Type**   **Required**   **Notes**
  ---------------- ---------------- -------------- ---------------------------
  Title            Text             Yes            Used as main heading

  Slug             UID (based on    Yes            Used for URL & preview
                   Title)                          links

  Category         Enumeration      Yes            Values: Web, Mobile, AI/ML,
                                                   Data, etc. (customizable)

  Short            Textarea         Yes            Summary for cards & meta
  Description                                      tags

  Full Description Rich Text        Yes            Shown on detail page

  Deliverables     Rich Text or     Yes            Bullet list or table from
                   JSON                            frontend

  Timeline         Number +         Yes            Example: 4 (Weeks), 2
  Estimate         Enumeration                     (Months)

  Total Estimated  Number           Yes            Used for pricing logic
  Hours                                            

  Skills & Tools   Component        Yes            Title + Icon/Image field
                   (repeatable)                    per item

  Pricing Model    Enumeration      Yes            Values: Weekly, Biweekly,
                                                   Monthly

  Price Range      Component        Yes            e.g. \$6,000 - \$12,000
  (Min - Max)                                      total or weekly breakdown

  Project Type     Enumeration      Yes            Values: Single, Team,
                                                   Custom

  Use Case Tags    Relation         No             Linked to global Tags
                   (many-to-many)                  collection
  ----------------------------------------------------------------------------

### **🔹 Media Fields**

  ---------------------------------------------------------------
  **Field Label**  **Field Type** **Notes**
  ---------------- -------------- -------------------------------
  Thumbnail Image  Media (Single) Sent to Cloudflare R2

  Gallery Images   Media          Optional, Cloudflare R2
                   (Multiple)     

  Video            Media (Single) Optional, Cloudflare R2 or
  Walkthrough                     external URL
  ---------------------------------------------------------------

Media fields should be sent to Cloudflare via pre-signed upload URLs
using the listings service.

### **🔹 System Fields**

  **Field Label**      **Field Type**                   **Notes**
  -------------------- -------------------------------- -----------------------------------------------------
  Status               Enumeration                      Values: Draft, Published, Archived
  Featured             Boolean                          Used to highlight project on homepage or categories
  Created By (Admin)   Relation                         Link to admin user who created the project
  Preview URL          Computed (via config/admin.ts)   Uses slug & preview secret

### **🔹 Optional SEO Fields**

  ----------------------------------------------
  **Field        **Field    **Notes**
  Label**        Type**     
  -------------- ---------- --------------------
  Meta Title     Text       Defaults to Title if
                            not set

  Meta           Textarea   Optional for SEO
  Description               

  OG Image       Media      Optional social
                            thumbnail
  ----------------------------------------------

### **🌐 Permissions**

**Public Role**:

- find and findOne (for published projects)

**Authenticated (Frontend)**:

- No write access

**Admin Panel (Authenticated Admin)**:

- Full CRUD

### **🔹 Slug & URL Format**

- Slug is auto-generated from the Title field

- Preview and live URLs follow:

  - https://www.marketeq-projects.com/project/\<slug\>

  - Preview via: /api/preview?type=project&slug=\<slug\>&secret=\...

### **⚡ Related Frontend Flows**

- **Checkout**: Project selection, frequency, pricing

- **Preview**: Uses Strapi\'s native preview button from config/admin.ts

- **Thumbnail**: First image from Cloudflare upload

- **Media Display**: All files optimized by CDN
