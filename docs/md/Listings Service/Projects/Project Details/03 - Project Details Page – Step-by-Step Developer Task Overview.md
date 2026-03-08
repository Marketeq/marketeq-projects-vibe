**Project Details Page -- Step-by-Step Developer Task Overview**

This document outlines the complete development process for implementing
the Project Details page, broken down by logical phases and system
components. It is intended to act as a sprint backlog overview for
full-stack and backend engineers.\
\
This doc acts as a roadmap. All feature-specific docs (e.g. Pricing
Calc, Moderation Flow, Scope Viewer) will be separate and numbered
accordingly.

### **🚧 PHASE 1: DATABASE + BACKEND LOGIC (NestJS / PostgreSQL)**

1.  **Design DB Schema (Listings-Service)\**

    - Create projects table and all required fields (title, desc,
      pricing, duration, tags, etc.)

    - Normalize tasks into project_tasks with role, duration,
      experience, and assignee

    - Store AI-generated skills (reference task → skill map)

    - Add foreign keys to categories, subcategories, and industries

2.  **Expose REST API Endpoints\**

    - GET /projects/:id

    - GET /projects/:id/tasks

    - GET /projects/:id/team

    - GET /projects/:id/related

3.  **Create Pricing Calculation Utility\**

    - Compute base cost from task hours × rate

    - Calculate dynamic price views: weekly / biweekly / monthly /
      quarterly / yearly

    - Ensure logic supports pricing frequency toggle and initial payment
      view

4.  **Duration Calculation Utility\**

    - Compute total project duration based on tasks grouped by phase

5.  **AI Skill Mapping Utility\**

    - Use Hugging Face sentence-transformers model to semantically map
      project tasks to skills

    - Model: sentence-transformers/all-MiniLM-L6-v2

    - Tokenize task descriptions → compute embeddings → match against
      skills dataset

### **💬 PHASE 2: CONTENT MODERATION (content-moderation-service)**

6.  **Question Moderation Logic\**

    - Run filters only on recent questions before public display

    - Approved questions are suggested to project owner or team lead for
      publishing

    - Rejected questions remain private in the user-to-team chat thread

7.  **Filter Integration\**

    - Apply profanity, spam, and policy violation filters to submitted
      questions only

    - Use multilingual text moderation model
      (jigsaw-toxic-comment-classification) for detection

### **🧩 PHASE 3: MICROSERVICE INTEGRATION**

8.  **Review Service Integration\**

    - GET /reviews?projectId=xyz to fetch list of project reviews

    - Return aggregate rating + total review count

9.  **User Service Integration\**

    - Fetch team member profiles for avatars, role, name

    - Use GET /user/:id for assigned team member lookup

10. **Messaging Service Integration (Live Chat)\**

- Power chat window for new questions or live conversations

- Respect online/offline state of assigned chat team or team lead

- Hide widget if no chat members are online

11. **Strapi Integration Phase\**

- Sync field definitions for admin-side viewing only (read-only)

- Exclude editing/publishing functionality from this sprint

- Organize CMS fields to mirror listings-service schema

### **💻 PHASE 4: FRONTEND LOGIC (Next.js + Tailwind)**

12. **Project Details Page Layout\**

- Import design layout from Figma

- Implement tab navigation: Overview, Deliverables, Project History,
  Q&A, etc.

13. **Rich Text Rendering\**

- Display formatted project description

- Enforce formatting rules: allow line breaks, bullet lists, block
  quotes; disallow inline links or custom fonts

14. **Pricing Frequency Toggle\**

- Display prices dynamically for weekly / biweekly / monthly / quarterly
  / yearly

- Adjust first payment summary based on selected frequency

15. **Scope Viewer UI\**

- Group tasks by phase

- Show assigned members (one per task)

- Use avatar stack with \"+X\" indicator

16. **Live Chat Widget\**

- Accessible for new question submission or direct messages

- Widget visibility tied to chat team availability

17. **Q&A Section (Recently Asked Questions)\**

- Display only questions that passed moderation and were approved

- Approval happens via suggestion system to project owner or team lead

- Separate from live chat window

18. **More Ways to Explore\**

- Pull related categories based on project metadata

- Pull related skills from AI-generated scope tags

19. **Save to List\**

- Allow users to bookmark or save projects to a personal list for future
  reference

20. **Share Project\**

- Enable users to copy a shareable link to the project page

21. **Report Project\**

- Trigger report modal allowing users to flag inappropriate or
  misleading projects

22. **Recently Viewed + Recommended Projects\**

- Cache recent views for each user

- Recommend based on skill/category similarity

### **📦 PHASE 5: TESTING, STAGING, & DEPLOYMENT**

23. **Unit Tests (Backend)\**

- Price calculation logic

- Duration calculation

- Moderation filter coverage

- AI skill-to-task assignment model

24. **Component Tests (Frontend)\**

- Tab navigation

- Scope viewer

- Q&A rendering and toggling

25. **Integration Tests\**

- REST APIs for pricing, tasks, reviews, skills

- Content moderation flow and fallback behavior

26. **Staging Review\**

- Deploy to staging

- QA checklist sign-off

27. **Production Push\**

- Final approval and Vercel + Render deployment
