**Payload Collection Type: Project Listings (Based on Final Project
Details Design)**

This document outlines how to build the **"Projects"** collection type
in Payload v5, fully aligned with the editable fields from the **Project
Details design** in Figma. It ensures compatibility with frontend flows
for listing, preview, media upload, and checkout.

### **🔹 Collection Name**

- **Display name**: Projects

- **API ID**: project

- **UID**: api::project.project

Enable **Draft & Publish** mode.

### **🔹 Core Fields (Editable in Admin Panel)**

| **Field Label** | **Field Type** | **Required** | **Notes** |
|----|----|----|----|
| Title | Text | Yes | Used as main heading |
| Slug | UID (based on Title) | Yes | Used for URL & preview links |
| Category | Enumeration | Yes | Values: Web, Mobile, AI/ML, Data, etc. (customizable) |
| Short Description | Textarea | Yes | Summary for cards & meta tags |
| Full Description | Rich Text | Yes | Shown on detail page |
| Deliverables | Rich Text or JSON | Yes | Bullet list or table from frontend |
| Timeline Estimate | Number + Enumeration | Yes | Example: 4 (Weeks), 2 (Months) |
| Total Estimated Hours | Number | Yes | Used for pricing logic |
| Skills & Tools | Component (repeatable) | Yes | Title + Icon/Image field per item |
| Pricing Model | Enumeration | Yes | Values: Weekly, Biweekly, Monthly |
| Price Range (Min - Max) | Component | Yes | e.g. \$6,000 - \$12,000 total or weekly breakdown |
| Project Type | Enumeration | Yes | Values: Single, Team, Custom |
| Use Case Tags | Relation (many-to-many) | No | Linked to global Tags collection |

### **🔹 Media Fields**

| **Field Label**   | **Field Type**   | **Notes**                               |
|-------------------|------------------|-----------------------------------------|
| Thumbnail Image   | Media (Single)   | Sent to Cloudflare R2                   |
| Gallery Images    | Media (Multiple) | Optional, Cloudflare R2                 |
| Video Walkthrough | Media (Single)   | Optional, Cloudflare R2 or external URL |

Media fields should be sent to Cloudflare via pre-signed upload URLs
using the listings service.

### **🔹 System Fields**

| **Field Label** | **Field Type** | **Notes** |
|----|----|----|
| Status | Enumeration | Values: Draft, Published, Archived |
| Featured | Boolean | Used to highlight project on homepage or categories |
| Created By (Admin) | Relation | Link to admin user who created the project |
| Preview URL | Computed (via config/admin.ts) | Uses slug & preview secret |

### **🔹 Optional SEO Fields**

| **Field Label**  | **Field Type** | **Notes**                    |
|------------------|----------------|------------------------------|
| Meta Title       | Text           | Defaults to Title if not set |
| Meta Description | Textarea       | Optional for SEO             |
| OG Image         | Media          | Optional social thumbnail    |

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

  - Preview via: /api/preview?type=project&slug=\<slug\>&secret=...

### **⚡ Related Frontend Flows**

- **Checkout**: Project selection, frequency, pricing

- **Preview**: Uses Payload's native preview button from config/admin.ts

- **Thumbnail**: First image from Cloudflare upload

- **Media Display**: All files optimized by CDN
