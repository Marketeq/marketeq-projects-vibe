**Complete list of required backend features**\
Based on the verified UI design files and user stories --- including how
each feature connects with ActivityWatch:

### **✅ Backend Features & Integration Summary**

1.  **User Settings: Timezone, Date Format, Start of Week, Time
    Format\**
    → Store user preferences in the database and apply them to all
    frontend time displays.\
    🧠 *This is a standalone backend feature --- not related to
    ActivityWatch.\*

2.  **Manual Time Submission (Start Time, End Time, Notes)\**
    → Support a POST endpoint that stores manual time entries without
    screenshots.\
    🧠 *ActivityWatch does not handle this. Must be implemented entirely
    in your backend.\*

3.  **Screenshot Upload, Download, Delete\**
    → ActivityWatch desktop agent captures screenshots and uploads them
    to Cloudflare via your backend API.\
    🧠 *Download is a signed URL; delete is a soft-delete stored in
    DB.\*

4.  **Screenshot Blurring\**
    → Replace the image with a blurred version (e.g. Cloudflare Image
    variant) on user action.\
    🧠 *ActivityWatch does not natively blur. This must be added on top
    of its screenshot sync.\*

5.  **Assign/Update Task & Project on Screenshot\**
    → Add editable fields (taskId, projectId) to the screenshot record.\
    🧠 *ActivityWatch must be extended to include this metadata or
    managed post-upload.\*

6.  **Group and Display Simultaneous Screenshots\**
    → Group screenshots by timestamp and userId to support multi-screen
    view.\
    🧠 *This logic must be added to the backend on top of
    ActivityWatch\'s per-monitor data.\*

7.  **Keyboard & Mouse Activity per Screenshot\**
    → Pull activity stats from ActivityWatch's event data and attach to
    screenshots.\
    🧠 *ActivityWatch supports this out of the box --- just store &
    expose it.\*

8.  **Filter Screenshots by Date, Activity, Project, Task\**
    → Add backend filtering support for screenshot list API using query
    params.\
    🧠 *Applies to enriched ActivityWatch screenshot data.\*

9.  **Sort Screenshots by Time, Activity, Project\**
    → Backend supports ordering results via query params on screenshot
    endpoints.\
    🧠 *Standard sorting on timestamp, activity, etc.\*

10. **Admin Settings: Allow/Disallow Blurring, Deletion, Editing\**
    → Add per-role or per-contract permissions to control what actions
    users can take.\
    🧠 *Requires a config table in the backend. Not part of
    ActivityWatch.\*

11. **Expose Tooltip Metadata (e.g., How Time is Calculated, Deletion
    Reason)\**
    → Return static metadata or enums to frontend for tooltips.\
    🧠 *Add to settings or metadata API responses.*

**REMAINING DOCS**

Based on the **design PDFs and user stories** you uploaded earlier for
the time-tracking frontend, here's what we still need backend
documentation for --- beyond the docs we've already created (user
settings, manual time, screenshot upload/blur/delete, task/project
assignment, timeline retrieval).

### **⏳ Remaining (Docs Not Yet Built)**

1.  **Group and Display Simultaneous Screenshots\**
    → Need to design backend logic to group screenshots by timestamp +
    userId across multiple monitors, so the frontend can switch between
    them.

2.  **Keyboard & Mouse Activity per Screenshot\**
    → Need a doc that describes how to pull activity stats from
    ActivityWatch events and link them to each screenshot record (attach
    percentages and store them in DB).

3.  **Admin Settings: Allow/Disallow Blurring, Deletion, Editing\**
    → Need to add per-role/per-contract permission checks into
    screenshot service APIs (with config table or settings entity).

4.  **Expose Tooltip Metadata (How Time is Calculated, Deletion Reason,
    etc.)\**
    → Need a doc that defines a metadata API (static or DB-driven) that
    returns the exact strings shown in UI tooltips.

## **Remaining Backend Docs Needed**

### **1. Screenshot Detail View API**

- Supports the "Screenshot Details" modal from the designs.

- Must return metadata: timestamp, project, task, keyboard %, mouse %,
  app icons, app URLs.

- Provides signed URL for zoom/download.

- Allows editing of task/project directly from this view.

### **2. Screenshot Cards API**

- Endpoint for paginated screenshot cards in grid view.

- Returns list of screenshot summaries (id, timestamp, blurred/deleted
  status, activity percentages, preview image URL).

- Needs filters + pagination controls to support scrolling UI.

### **3. Filters API**

- Centralized endpoints or query options to filter screenshots by:

  - Project

  - Task

  - Date range

  - Keyboard activity

  - Mouse activity

- Must match the filtering UI exactly.

### **4. Sorting API**

- Query parameters to sort by:

  - Time

  - Project

  - Activity level

  - Date ASC/DESC

- Works in combination with filters.

### **5. Settings API (Admin Controls)**

- Stores and enforces rules from Settings.pdf:

  - Allow screenshot deletion (boolean)

  - Allow screenshot blurring (boolean)

  - Auto-approve blurring (boolean)

  - Let freelancers assign/change project/task (boolean)

  - Deleted time = non-billable (boolean)

  - Blurred screenshots = billable/non-billable toggle

- Must integrate with the screenshot upload/retrieval endpoints to
  enforce rules.

### **6. Tooltip Metadata API**

- Provides explanatory text for tooltips ("How time is calculated,"
  "Reason for deleting screenshot," etc.).

- Can be static config returned from an endpoint.

### **7. Add Manual Time (Extended)**

- Already documented base submission, but UI shows review/approval
  steps.

- Need doc for admin review/approval API:

  - Approve/reject manual time

  - Notes/reason attached

- Integration into timeline view (manual entries appear with
  icon/label).

### **8. Editing Task and Project (Main Screen)**

- Similar to "Assign/Update Task & Project," but for bulk updates on the
  main screen.

- Needs batch update API for multiple screenshots at once.

## **Suggested Doc Order (to finish time-tracking service)**

1.  Screenshot Detail View API

2.  Screenshot Cards API (grid view)

3.  Filters API

4.  Sorting API

5.  Settings API (Admin Controls)

6.  Tooltip Metadata API

7.  Manual Time Review/Approval API

8.  Editing Task/Project (bulk update)

⚡ Would you like me to start with **Screenshot Detail View API** (since
it powers the modal and requires tight integration with screenshots +
signed URLs), or should I move on to **Settings API** first, since it
governs permissions across the service?

Got it ✅ --- here's a clean list of the **9 remaining backend docs**
for the time-tracking service, with details on what each must include.
I've skipped all the ones we've already built.

## **📌 Remaining Docs to Build (9)**

### **1. Screenshot Detail View API**

**Purpose:** Powers the screenshot modal.\
**Details to include:**

- Endpoint definition (GET /api/screenshots/:id/detail).

- Response fields: screenshot metadata (id, timestamp, userId,
  projectId, taskId, keyboard %, mouse %, blurred/deleted flags).

- Signed URL for zoom/download.

- Embedded app usage metadata (icons, URLs).

- Support for inline project/task editing.

- Security: only owner or admin can access.

### **2. Screenshot Cards API**

**Purpose:** Feeds the grid of screenshot cards.\
**Details to include:**

- Paginated endpoint (GET /api/screenshots/cards).

- Request query params: page, pageSize, filters, sort.

- Response fields: id, timestamp, preview image URL, blurred/deleted
  status, activity %.

- Must integrate with signed URL endpoint for thumbnails.

- Security: enforce owner/admin rules.

### **3. Group & Display Simultaneous Screenshots**

**Purpose:** Support multi-monitor timeline views.\
**Details to include:**

- Database schema for monitorId or grouping key.

- Logic to group screenshots by userId + timestamp.

- API changes to return grouped screenshots in timeline queries.

- Frontend guidance: how to request multi-screen sets.

### **4. Keyboard & Mouse Activity per Screenshot**

**Purpose:** Show productivity/activity indicators.\
**Details to include:**

- Extend screenshot entity with keyboard/mouse stats.

- Parse from ActivityWatch events and attach to screenshots.

- Calculation method (e.g., \# of events per minute).

- API fields to expose percentages in timeline & detail views.

### **5. Filters API (Extended)**

**Purpose:** Support advanced filtering in the UI.\
**Details to include:**

- Filters: projectId, taskId, date range, activity thresholds.

- Integration with GET /api/screenshots.

- Query param validation with DTOs.

- Example requests/responses.

### **6. Sorting API (Extended)**

**Purpose:** Full support for sort options in UI.\
**Details to include:**

- Supported sorts: time, project, activity level, ASC/DESC.

- Integration with GET /api/screenshots.

- Query param validation.

- Example usage with filters (combined query).

### **7. Admin Settings API (Controls)**

**Purpose:** Govern user permissions & billing logic.\
**Details to include:**

- Database schema: settings table or config entity (per org or per
  contract).

- Fields: allowDelete, allowBlur, autoApproveBlur, allowReassign,
  deletedNonBillable, blurredBillable.

- Middleware/guards to enforce rules in screenshot endpoints.

- Admin-only endpoints to update settings.

### **8. Tooltip Metadata API**

**Purpose:** Provide explanatory text for tooltips.\
**Details to include:**

- Endpoint (GET /api/tooltips).

- Returns dictionary of tooltip keys → text.

- Option: load from DB table vs static JSON.

- Security: public/read-only.

### **9. Manual Time Review/Approval API**

**Purpose:** Extend manual time with admin workflow.\
**Details to include:**

- New fields on manual_time entity: status (pending, approved,
  rejected), reviewedBy, reviewComment.

- Endpoints:

  - GET /api/manual-time/pending (admin)

  - PUT /api/manual-time/:id/review (approve/reject with reason)

- Security: only admins can review.

- Integration: approved entries show in timeline, rejected flagged in
  UI.

✅ This gives you a **clear map of the 9 remaining docs** to fully cover
backend features required by the designs/user stories.

Do you want me to **start writing these in the same style as the
finished docs** (step-by-step with entity, DTO, controller, service,
security, integration notes), beginning with **Screenshot Detail View
API**?
