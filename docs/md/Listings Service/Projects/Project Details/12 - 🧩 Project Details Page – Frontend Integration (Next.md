# **🧩 Project Details Page -- Frontend Integration (Next.js)**

This document provides step-by-step instructions for integrating the
Project Details Page frontend with your NestJS backend. This assumes the
project uses TypeScript and TailwindCSS with functional components and
the page path is:

app/(project)/project/\[projectId\]/page.tsx



## **1. 🔌 API Endpoint Integration**

### **GET Project Details by ID**

**Endpoint:**

****GET /api/projects/:id

**Usage:**

****const { data, error, isLoading } = useSWR(

\`/api/projects/\${projectId}\`,

fetcher

);

**Fetcher Example:**

****const fetcher = (url: string) =\>

fetch(url).then(res =\> {

if (!res.ok) throw new Error(\'Failed to fetch\');

return res.json();

});

**Data Shape Example:**

****interface ProjectDetails {

title: string;

description: string;

featuredImageUrl: string;

featuredVideoUrl?: string;

tags: string\[\];

skills: string\[\];

categories: string\[\];

industries: string\[\];

deliverables: string\[\];

team: TeamMember\[\];

timestamps: { label: string; value: string }\[\];

badges: string\[\];

scope: ProjectScope\[\];

priceBreakdown: PriceBreakdown\[\];

recommendedProjects: string\[\]; // IDs

similarProjects: string\[\]; // IDs

}



## **2. 🎨 UI Component Responsibilities**

### **\<ProjectHeader /\>**

- Renders title, featured image, video URL

- Pulls project.title, featuredImageUrl, featuredVideoUrl

### **\<TagsBlock /\>**

- Displays clickable tags, subcategories, and industries

- Uses tags, categories, industries arrays

- Click triggers navigation:

router.push(\`/projects/search?tag=\${selectedTag}\`);

### **\<PriceBreakdown /\>**

- Renders total price + breakdown by duration

- Accepts:

interface PriceBreakdown {

duration: \'week\' \| \'month\' \| \'quarter\' \| \'year\';

cost: number;

}

- \
  Use dropdown visibility logic:

const availableDurations = priceBreakdown

.map(p =\> p.duration)

.filter(d =\> project.duration \>= durationThresholds\[d\]);

### **\<DeliverablesSection /\>**

- Displays deliverables from AI summary

- Inputs: project.deliverables (string\[\])

### **\<LiveChatWidget /\>**

- Green indicator shows when any teamMember.isOnline === true

- Click opens modal if user is logged in

- If not logged in, show login popup

### **\<TeamSection /\>**

- Renders team usernames, skills, locations, and languages

- Data from project.team

interface TeamMember {

firstName: string;

username: string;

location: string;

languages: string\[\];

skills: string\[\];

isLead: boolean;

isOnline: boolean;

}

- \
  Skills logic: up to 5 based on scope-task matches

- \"View More\" appears if more than 5

### **\<SaveButton /\>**

- Bookmark icon toggle

- Persists to /api/favorites with:

POST /api/favorites

{

projectId: string;

}

### **\<ShareButton /\>**

- Opens modal with social sharing + copy link

## **3. 🧠 Recommendation Algorithms**

### **Recommended Projects**

- Comes from recommendedProjects (IDs)

- Render mini cards via /api/projects/:id/preview

### **Similar Projects**

- Comes from similarProjects (IDs)

- Use same preview API

## **4. ⏱️ Timestamps Logic**

****function getTimeLabel(durationDays: number): \'days\' \| \'weeks\'
\| \'months\' {

if (durationDays \< 7) return \'days\';

if (durationDays \< 30) return \'weeks\';

return \'months\';

}

- \
  Display label + createdBy or currentTeam based on team size

## **5. 🛑 Edge Cases**

  ----------------------------------------------------------------
  **Scenario**             **UI Behavior**
  ------------------------ ---------------------------------------
  No team online           Hide green dot and live chat button

  Missing deliverables     Hide section and show \"Deliverables
                           coming soon\"

  Empty                    Hide section completely
  skills/tags/categories   

  Not logged in            Prompt login modal
  (Save/Chat)              

  Invalid projectId        Show 404 or \"Project Not Found\"
                           screen
  ----------------------------------------------------------------

## **6. 🗂️ Folder & File Structure**

****/app/(project)/project/\[projectId\]/

page.tsx

ProjectHeader.tsx

TagsBlock.tsx

PriceBreakdown.tsx

DeliverablesSection.tsx

LiveChatWidget.tsx

TeamSection.tsx

SaveButton.tsx

ShareButton.tsx

useProjectDetails.ts (SWR hook)


