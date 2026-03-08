### **📄 Document: Frontend Integration -- Project Details Page**

This guide provides **step-by-step frontend integration instructions**
for rendering the full Project Details Page using data from the NestJS
backend (PostgreSQL). This does **not** include Strapi, which is only
used for admin edits on the backend.

#### **🧭 Directory**

- **Frontend repo:** https://github.com/CTorres9800/marketeq-projects

- **Project Details Page file path:\**
  app/(group)/projects/\[projectId\]/page.tsx\
  *(All code examples in this guide should be implemented here.)\*

## **🧩 API Integration**

### **1. API Endpoint**

Use the NestJS backend controller to fetch full project data:

GET /api/projects/:projectId

Replace :projectId with the slug or ID from the URL.

### **2. Frontend Fetch Logic**

Use getServerSideProps or useEffect (if using client-side routing) to
fetch the data:

import axios from \'axios\';

const fetchProject = async (projectId: string) =\> {

const res = await axios.get(\`/api/projects/\${projectId}\`);

return res.data;

};

Use the returned data to populate all fields below.

## **🧩 Field Mappings**

  **Frontend Section**   **Field Key from API**       **Logic / Notes**
  ---------------------- ---------------------------- -------------------------------------
  Title                  title                        Text
  Description            description                  Rich text block
  Tags                   tags\[\]                     Display as clickable filters
  Skills                 skills\[\]                   Display with hover effect
  Categories             categories\[\]               Used for Related Categories section
  Industries             industries\[\]               Shown as industry badges
  Deliverables           deliverables\[\]             Comes from AI-generated scope
  Languages              languages\[\]                Display up to 3 with \"View More\"
  Locations              locations\[\]                Display up to 3 with \"View More\"
  Featured Image         featuredImage                Image URL
  Featured Video         featuredVideoUrl             YouTube or Vimeo URL (embed)
  Date Published         createdAt                    Format: Month DD, YYYY
  Top Rated?             isTopRated                   Hide if false
  Show Reviews?          showReviews                  Hide if false
  Team Info              team\[\]                     Names, usernames, skills, languages
  Project Duration       duration                     Calculated backend value
  Team Member Count      team.length                  Actual number of assigned members
  Similar Projects       similarProjects\[\]          Use project IDs and titles
  Recommended Projects   recommendedProjects\[\]      Use hybrid model metadata
  Pricing                totalPrice, priceBreakdown   Display by week/month/quarter/year
  Payment Plan Tooltip   Static                       On hover, show payment plan options

## **🧪 Conditional UI**

- **Show Reviews:** Only render reviews section if showReviews is true
  and reviews.length \> 0.

- **Top Rated Badge:** Show only if isTopRated is true.

- **Live Chat Status:** Show green indicator if at least one team member
  is online. Names shown if \>1 online.

## **🔐 Auth Requirements**

- **View Only**: Public -- anyone can view the Project Details Page.

- **Interaction (Ask Question, Save, Share)**: Requires login.

- Display login modal if unauthenticated user clicks interactive
  elements.

## **✅ Final Notes**

- All fields come from the NestJS backend via the
  /api/projects/:projectId route.

- Do **not** use Strapi data unless explicitly handling admin edits
  (covered in a separate backend document).

- Component-level props should be explicitly typed using the response
  structure from the backend DTOs.

- Only fetch project data once per page load and hydrate it across child
  components (e.g. Team, Scope, Pricing).
