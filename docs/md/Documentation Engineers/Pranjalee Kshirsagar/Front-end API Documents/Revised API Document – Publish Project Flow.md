## **Revised API Document -- Publish Project Flow**

**Service:** Publish Module (NestJS)\
**Used by:** Frontend & Backend

## **🔑 Base Details**

  --------------------------------------------------------------
  **Field**      **Value**
  -------------- -----------------------------------------------
  Base URL       \${process.env.NEXT_PUBLIC_API_BASE_URL}

  Auth           Authorization: Bearer \<token\> (Required for
                 all endpoints)

  Content-Type   application/json OR multipart/form-data (for
                 media upload)
  --------------------------------------------------------------

✅ **Note on Base Path:** All routes in this document are under
/publish/\....

## **🧭 1. System Overview**

The Publish API enables structured creation of full project flows ---
including project creation, media upload, phases, and tasks.

✔ Create Project\
✔ Upload Media\
✔ Create / Duplicate / Update / Delete Phases\
✔ Create / Update Tasks\
❌ Delete Task endpoint is **NOT present** in backend currently

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
  ├─ Phase Management\
  └─ Task Management
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Database → PostgreSQL (TypeORM)\
Media → ./uploads folder (local) OR S3-ready

## **⚙️ 3. Workflow Steps (Overall Process)**

  -----------------------------------------------------------------------
  **Step**   **API**                              **Description**
  ---------- ------------------------------------ -----------------------
  1          POST /publish/project                Create a new project

  2          POST /publish/media                  Upload media for
                                                  project

  3          POST /publish/phase                  Create a phase (with
                                                  tasks)

  4          POST                                 Duplicate phase (copies
             /publish/phase/{phaseId}/duplicate   tasks)

  5          PUT /publish/phase/update/{phaseId}  Update phase name

  6          DELETE                               Delete phase
             /publish/phase/delete/{phaseId}      

  7          POST /publish/task                   Create task under a
                                                  phase

  8          PUT /publish/task/update/{id}        Update task
  -----------------------------------------------------------------------

# **📌 4. API ENDPOINTS**

## **🟦 A) Create New Project**

### **📌 Purpose**

Creates the base project record. Must be created first before
media/phases/tasks are attached.

### **📍 Used in UI**

Project Setup → Step 1: Basic Information

### **🔗 Method & URL**

**POST** /publish/project

### **📥 Request Body (CreateProjectDto)**

**Required**

- title (string)

- shortDescription (string)

- fullDescription (string)

- userId (string)

**Optional**

- subtitle (string)

- budget (number)

- initialTeamBudget (number)

- durationMonths (int)

- location (string)

- timezone (string)

- categories (string\[\])

- subCategories (string\[\])

- industries (string\[\])

- tags (string\[\])

- skills (string\[\])

- scope (CreateProjectPhaseDto\[\]) *(optional; if included, phases must
  include tasks)*

✅ Sample Request

  -----------------------------------------------------------------------
  {\
  \"title\": \"AI Automation Project\",\
  \"subtitle\": \"Internal tool to automate workflows\",\
  \"shortDescription\": \"Short summary\...\",\
  \"fullDescription\": \"Detailed description\...\",\
  \"userId\": \"user_456\",\
  \"budget\": 25000,\
  \"durationMonths\": 3,\
  \"location\": \"Remote\",\
  \"timezone\": \"America/Boise\",\
  \"categories\": \[\"Software\"\],\
  \"subCategories\": \[\"Automation\"\],\
  \"industries\": \[\"Manufacturing\"\],\
  \"tags\": \[\"AI\", \"ML\"\],\
  \"skills\": \[\"Python\", \"React\"\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (controller
does not return created project)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"proj_123\",\
  \"shortDescription\": \"Short summary\...\",\
  \"fullDescription\": \"Detailed description\...\",\
  \"categories\": \[\"Software\"\],\
  \"subCategories\": \[\"Automation\"\],\
  \"industries\": \[\"Manufacturing\"\],\
  \"tags\": \[\"AI\", \"ML\"\],\
  \"skills\": \[\"Python\", \"React\"\],\
  \"userId\": \"user_456\",\
  \"createdAt\": \"2026-02-23T18:35:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:35:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

⚠️ **Backend note:** title may not appear in response because backend
entity excludes it from serialization.

### **❌ Errors**

  --------------------------------
  **Code**   **Meaning**
  ---------- ---------------------
  400        Validation error

  401        Missing/invalid JWT
             token
  --------------------------------

## **🟦 B) Upload Media**

### **📌 Purpose**

Uploads media for an existing project.

### **📍 Used in UI**

Project Setup → Media Upload Step

### **🔗 Method & URL**

**POST** /publish/media

### **📥 Request (multipart/form-data)**

**File fields**

  ---------------------------------------------
  **Field**          **Type**    **Required**
  ------------------ ----------- --------------
  featuredImage      single file Yes

  additionalImages   array (max  Optional
                     8)          
  ---------------------------------------------

**Text fields**

- projectId (string, required)

- videoUrl (string, optional)

✅ Sample (conceptual)

- featuredImage: \<file\>

- additionalImages: \<file1\> \<file2\>

- projectId: proj_123

- videoUrl: https://www.youtube.com/watch?v=abc123

### **📤 Response**

✅ **Current backend behavior:** Returns service result (but error
handling may swallow exceptions)

✅ **Sample response:**

  -----------------------------------------------------------------------
  {\
  \"id\": \"media_123\",\
  \"featuredImage\": \"featured_1708713300.png\",\
  \"additionalImages\": \[\
  \"img1_1708713301.png\",\
  \"img2_1708713302.png\"\
  \],\
  \"featuredVideo\": \"https://www.youtube.com/watch?v=abc123\",\
  \"projectId\": \"proj_123\",\
  \"createdAt\": \"2026-02-23T18:36:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:36:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **❌ Errors**

  ------------------------------------------
  **Code**   **Meaning**
  ---------- -------------------------------
  400        Invalid file type / image
             validation failed

  401        Missing/invalid JWT token
  ------------------------------------------

## **🟦 C) Create Project Phase (with Tasks)**

### **📌 Purpose**

Creates a phase and its tasks in one API call.

### **📍 Used in UI**

Project Setup → Phases & Tasks Step

### **🔗 Method & URL**

**POST** /publish/phase

### **📥 Request Body (CreateProjectPhaseDto)**

**Required**

- name (string)

- stageName (string)

- startDay (int)

- endDay (int)

- order (int)

- projectId (string)

- tasks (CreateProjectTaskDto\[\]) **required**

✅ Sample Request

  -----------------------------------------------------------------------
  {\
  \"name\": \"Phase One\",\
  \"stageName\": \"Stage 1\",\
  \"startDay\": 1,\
  \"endDay\": 8,\
  \"order\": 1,\
  \"projectId\": \"proj_123\",\
  \"tasks\": \[\
  {\
  \"taskName\": \"Market Research\",\
  \"role\": \"Analyst\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \[\"Research\", \"Excel\"\],\
  \"experienceLevel\": \"Mid\",\
  \"duration\": \"2 weeks\",\
  \"estimatedHours\": 40,\
  \"phaseId\": \"phase_123\"\
  }\
  \]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

⚠️ **Backend note:** DTO includes phaseId inside each task. If phaseId
is server-generated, backend should ideally not require it. For now,
document it as required because DTO expects it.

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (controller
does not return created phase)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"phase_123\",\
  \"name\": \"Phase One\",\
  \"stageName\": \"Stage 1\",\
  \"startDay\": 1,\
  \"endDay\": 8,\
  \"order\": 1,\
  \"projectId\": \"proj_123\",\
  \"task\": \[\
  {\
  \"id\": \"task_001\",\
  \"taskName\": \"Market Research\",\
  \"role\": \"Analyst\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \[\"Research\", \"Excel\"\],\
  \"experienceLevel\": \"Mid\",\
  \"duration\": \"2 weeks\",\
  \"estimatedHours\": 40,\
  \"phaseId\": \"phase_123\",\
  \"createdAt\": \"2026-02-23T18:37:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:37:00.000Z\",\
  \"deletedAt\": null\
  }\
  \],\
  \"createdAt\": \"2026-02-23T18:37:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:37:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 D) Duplicate Phase (Copies Tasks)**

### **📌 Purpose**

Duplicates a phase and copies its tasks.

### **🔗 Method & URL**

**POST** /publish/phase/{phaseId}/duplicate

### **📥 Path Param**

- phaseId (string)

### **📤 Response**

✅ **Current backend behavior:** Returns full new phase object

✅ **Sample response:**

  -----------------------------------------------------------------------
  {\
  \"id\": \"phase_999\",\
  \"name\": \"Phase One (Copy)\",\
  \"stageName\": \"Stage 1\",\
  \"startDay\": 1,\
  \"endDay\": 8,\
  \"order\": 2,\
  \"projectId\": \"proj_123\",\
  \"task\": \[\
  {\
  \"id\": \"task_901\",\
  \"taskName\": \"Market Research\",\
  \"role\": \"Analyst\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \[\"Research\", \"Excel\"\],\
  \"experienceLevel\": \"Mid\",\
  \"duration\": \"2 weeks\",\
  \"estimatedHours\": 40,\
  \"phaseId\": \"phase_999\",\
  \"createdAt\": \"2026-02-23T18:38:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:38:00.000Z\",\
  \"deletedAt\": null\
  }\
  \],\
  \"createdAt\": \"2026-02-23T18:38:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:38:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 E) Update Phase (Name Only)**

### **📌 Purpose**

Updates phase name only.

### **🔗 Method & URL**

**PUT** /publish/phase/update/{phaseId}

### **📥 Request Body (UpdatePhaseDto)**

Required:

- name (string)

✅ Sample Request

  -----------------------------------------------------------------------
  {\
  \"name\": \"Updated Phase Name\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (controller
does not return updated phase)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"phase_123\",\
  \"name\": \"Updated Phase Name\",\
  \"stageName\": \"Stage 1\",\
  \"startDay\": 1,\
  \"endDay\": 8,\
  \"order\": 1,\
  \"projectId\": \"proj_123\",\
  \"task\": \[\],\
  \"createdAt\": \"2026-02-23T18:37:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:40:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 F) Delete Phase**

### **📌 Purpose**

Deletes a phase.

### **🔗 Method & URL**

**DELETE** /publish/phase/delete/{phaseId}

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (void)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"message\": \"Phase deleted successfully\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

✅ **Recommended status code:** 204 No Content (if keeping body empty)

## **🟦 G) Create Task**

### **📌 Purpose**

Creates a task under a phase.

### **🔗 Method & URL**

**POST** /publish/task

### **📥 Request Body (CreateProjectTaskDto)**

**Required**

- taskName (string)

- role (string)

- location (string\[\])

- experience (string\[\])

- experienceLevel (string)

- duration (string)

- phaseId (string)

**Optional**

- estimatedHours (int)

✅ Sample Request

  -----------------------------------------------------------------------
  {\
  \"taskName\": \"Backend API Setup\",\
  \"role\": \"Developer\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \[\"NestJS\", \"PostgreSQL\"\],\
  \"experienceLevel\": \"Senior\",\
  \"duration\": \"1 week\",\
  \"estimatedHours\": 20,\
  \"phaseId\": \"phase_123\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (controller
does not return created task)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"task_123\",\
  \"taskName\": \"Backend API Setup\",\
  \"role\": \"Developer\",\
  \"location\": \[\"Remote\"\],\
  \"experience\": \[\"NestJS\", \"PostgreSQL\"\],\
  \"experienceLevel\": \"Senior\",\
  \"duration\": \"1 week\",\
  \"estimatedHours\": 20,\
  \"phaseId\": \"phase_123\",\
  \"createdAt\": \"2026-02-23T18:41:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:41:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **🟦 H) Update Task**

### **📌 Purpose**

Updates a task.

### **🔗 Method & URL**

**PUT** /publish/task/update/{id}

### **⚠️ Backend Bug Note (Important)**

Backend route uses :id but controller reads \@Param(\'taskId\').\
**Fix needed in backend** (either change param decorator to
\@Param(\'id\') OR change route to :taskId).

### **📥 Request Body (UpdateTaskDto)**

**Required**

- taskName (string)

- role (string)

- location (string\[\])

- experience (string\[\])

- duration (string)

✅ Sample Request

  -----------------------------------------------------------------------
  {\
  \"taskName\": \"Updated Task Name\",\
  \"role\": \"Developer\",\
  \"location\": \[\"Onsite\"\],\
  \"experience\": \[\"NestJS\", \"Swagger\"\],\
  \"duration\": \"2 weeks\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **📤 Response**

✅ **Current backend behavior:** **Empty response body** (controller
does not return updated task)

✅ **Recommended contract (sample response):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"task_123\",\
  \"taskName\": \"Updated Task Name\",\
  \"role\": \"Developer\",\
  \"location\": \[\"Onsite\"\],\
  \"experience\": \[\"NestJS\", \"Swagger\"\],\
  \"experienceLevel\": \"Senior\",\
  \"duration\": \"2 weeks\",\
  \"estimatedHours\": 25,\
  \"phaseId\": \"phase_123\",\
  \"createdAt\": \"2026-02-23T18:41:00.000Z\",\
  \"updatedAt\": \"2026-02-23T18:45:00.000Z\",\
  \"deletedAt\": null\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
