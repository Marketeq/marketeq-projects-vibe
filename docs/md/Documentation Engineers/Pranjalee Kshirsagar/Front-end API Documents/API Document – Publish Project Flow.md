# **📄 API Document -- Publish Project Flow**

**Service:** Publish Module (NestJS)\
**Used by:** Frontend & Backend

## **🔑 Base Details**

  --------------------------------------------------------------------------
  **Field**          **Value**
  ------------------ -------------------------------------------------------
  **Base URL**       \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1

  **Auth**           Authorization: Bearer \<token\> (Required for all
                     endpoints)

  **Content-Type**   application/json OR multipart/form-data (for media
                     upload)

  **Error Format**   { \"message\": string, \"code\"?: string }

  **Note**           Frontend should always hit **API Gateway** --- never
                     microservices directly
  --------------------------------------------------------------------------

## **🧭 1. System Overview**

The **Publish API** enables structured creation of full project flows
--- including phases, tasks, and media uploads.\
It follows a **stepwise approach**, giving frontend full flexibility to
implement forms, wizards, or multi-step UI flows.\
This API is also **backend-ready** for internal workflow automation or
future integration with templates and AI agents.

✔ Create Project\
✔ Upload Media\
✔ Create / Duplicate / Update Phases\
✔ Create / Update / Delete Tasks

## **🧱 2. Architecture Flow (High-Level)**

  -----------------------------------------------------------------------
  Frontend (React / Next.js)\
  │\
  ▼\
  API Gateway ← JWT Auth\
  │\
  ▼\
  Publish Module (NestJS)\
  ├─ Project Creation\
  ├─ Media Upload\
  ├─ Phases (CRUD)\
  └─ Tasks (CRUD)\
  \
  Database → PostgreSQL (TypeORM)\
  Media → /uploads folder (local) OR S3-ready
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **⚙️ 3. Workflow Steps (Overall Process)**

  -----------------------------------------------------------------
  **Step**   **API**                          **Description**
  ---------- -------------------------------- ---------------------
  1          **POST /publish/project**        Create a new project

  2          **POST /publish/media**          Upload images

  3          **POST /publish/phase**          Create project phase

  4          **POST                           Duplicate phase + all
             /publish/phase/:id/duplicate**   tasks

  5          **POST /publish/task**           Create tasks

  6          **PUT                            Update phase
             /publish/phase/update/:id**      

  7          **PUT /publish/task/update/:id** Update task

  8          **DELETE                         Delete a phase
             /publish/phase/delete/:id**      
  -----------------------------------------------------------------

# **📌 4. API ENDPOINTS** 

## **🟦 A) Create New Project**

### **📌 Purpose**

This endpoint creates the base structure of the project. It stores core
metadata such as title, description, category, tags, etc.\
A project **must be created first** before media, phases, or tasks can
be attached.\
It also helps backend maintain unique project identifiers for tracking
and linking data.

### **📍 Used In UI**

➡ Project Setup → **Step 1: Basic Information**

### **🔗 Method & URL**

POST /publish/project

### **📥 Request Body (CreateProjectDto)**

  -----------------------------------------------------------------------
  {\
  \"title\": \"AI Automation Project\",\
  \"category\": \"Software\",\
  \"tags\": \[\"AI\", \"ML\"\],\
  \"description\": \"This is sample project created by user.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Sample Response**

  -----------------------------------------------------------------------
  { \"message\": \"Project created successfully\", \"projectId\":
  \"abc-123\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **❌ Common Errors**

  --------------------------------
  **Code**   **Meaning**
  ---------- ---------------------
  400        Validation error

  401        Missing/invalid JWT
             token
  --------------------------------

## **🟦 B) Upload Media**

### **📌 Purpose**

This endpoint uploads all project media --- featured image + optional
additional images.\
Backend validates file type & size using ImageValidator, ensuring only
safe media is accepted.\
Multer is used for handling multipart-form data integration with Next.js
\<input type=\"file\" /\>.

### **🔗 Method**

POST /publish/media → multipart/form-data

### **📥 Form Fields**

  ---------------------------------------------
  **Field**          **Type**    **Required**
  ------------------ ----------- --------------
  featuredImage      single file Yes

  additionalImages   array (max  Optional
                     8)          

  projectId          string      Yes
  ---------------------------------------------

## **🟦 C) Create Phase**

### **📌 Purpose**

A phase acts as a major milestone or section inside a project.\
Each phase can later contain many tasks, allowing the frontend to build
workflows step-by-step.\
Backend can also use these phases for project tracking, analytics, and
reporting.

### **🔗 Method**

POST /publish/phase

### **📥 Request Body**

  -----------------------------------------------------------------------
  {\
  \"projectId\": \"abc-123\",\
  \"title\": \"Market Research\",\
  \"order\": 1\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 D) Duplicate Phase** 

### **📌 Purpose**

This endpoint helps quickly **clone an existing phase** along with **all
its tasks**.\
Useful when UI wants to reuse structure without manually creating tasks
again.\
Improves UX and reduces frontend logic for repetitive form submissions.

### **🔗 Method & URL**

POST /publish/phase/:phaseId/duplicate

### **📤 Sample Response**

  -----------------------------------------------------------------------
  { \"message\": \"Phase duplicated\", \"newPhaseId\": \"xyz-456\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📌 Key Use Cases**

- Duplicate similar phases in template-based workflows

- Faster onboarding during project creation

- Useful for automation / AI-based suggestions

## **🟦 E) Update Phase** 

### **📌 Purpose**

Allows updating title, order, or timelines for any phase.\
Enables dynamic project restructuring based on user changes or backend
workflow rules.\
This is frequently used when the frontend implements drag-and-drop
sorting.

### **🔗 Method & URL**

PUT /publish/phase/update/:phaseId

### **📥 Request Body**

  -----------------------------------------------------------------------
  {\
  \"title\": \"Updated Phase Name\",\
  \"order\": 2\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Sample Response**

  -----------------------------------------------------------------------
  { \"message\": \"Phase updated\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 F) Delete Phase** 

### **📌 Purpose**

Removes a phase entirely from the project.\
Backend ensures database cleanup and cascades (tasks remain optional
based on rules).\
Useful when user removes a step in UI wizards.

### **🔗 Method & URL**

DELETE /publish/phase/delete/:phaseId

### **📤 Sample Response**

  -----------------------------------------------------------------------
  { \"message\": \"Phase deleted successfully\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 G) Create Task**

POST /publish/task

Purpose: Tasks define actual actions under each phase. They support
description, status, timeline & importance.\
This is required to complete workflow and drive UI interactions.

## **🟦 H) Update Task**

PUT /publish/task/update/:taskId

## **🧪 5. Sample Full Flow** 

1.  Login & get JWT

2.  POST /publish/project

3.  POST /publish/media

4.  POST /publish/phase

5.  Duplicate / Update / Delete Phase

6.  POST /publish/task

7.  View records in **pgAdmin\**

## **📌 6. DTO Reference**

All DTO files exist at:\
✔ src/publish/dto/\*\
✔ Used directly in Swagger\
✔ No manual schema conversion needed
