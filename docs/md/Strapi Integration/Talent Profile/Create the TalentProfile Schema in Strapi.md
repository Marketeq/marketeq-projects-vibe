To create the **Strapi schema** for the **Talent Profile**, you use the
**Strapi Admin UI** (no coding required), or you can define it manually
via code in your repo. Here's the best practice, you'll define it in the
Admin UI and version it in code for backup, portability, and consistency
across environments.

## **✅ Step-by-Step: Create the TalentProfile Schema in Strapi**

### **🔧 Assumptions:**

- Strapi is already running (Docker or local)

- Connected to the same PostgreSQL DB used by your backend

- You are using Strapi **for admin-only profile creation/editing**, not
  public API

## **🧩 Part 1: Build Schema via Admin UI**

### **1. Open Strapi Admin**

Visit: http://localhost:1337/admin

Log in to your admin account.

### **2. Go to Content-Types Builder → Create New Collection Type**

- Name: TalentProfile

- Click **Continue\**

### **3. Add Fields (match your DB schema)**

#### **🔑 Core Profile Fields**

  ------------------------------------------------------------
  **Field Name** **Type**        **Options**
  -------------- --------------- -----------------------------
  first_name     Text (short)    Required

  last_name      Text (short)    Required

  username       UID             Target field: first_name +
                                 last_name

  headline       Text (short)    Optional

  overview       Rich Text       Optional

  is_available   Boolean         Default: true

  hourly_rate    Number          Optional
                 (decimal)       

  timezone       Text            Optional

  location       Text            Optional

  country        Text            Optional
  ------------------------------------------------------------

#### **🔗 Relational or Complex Fields**

  **Field Name**             **Type**           **Options**
  -------------------------- ------------------ ----------------------------------------------
  skills                     Component (list)   Create new component: SkillItem → text field
  certifications             Component (list)   Create new component: CertificationItem
  education                  Component (list)   e.g. EducationItem: school, degree, year
  work_experience            Component (list)   e.g. WorkItem: company, role, dates
  industry_expertise         Component (list)   Tag-style text fields
  languages                  Component (list)   Name + fluency
  response_time              Text               e.g. \"1 hour\"
  repeat_hire_rate           Number (decimal)   e.g. 0.25
  total_projects_completed   Number             
  profile_rating             Number (decimal)   Max: 5
  joined_at                  Date               

## **💾 Part 2: Save and Test**

1.  Click **Save\**

2.  Go to **Content Manager → Talent Profiles\**

3.  Try creating a profile manually

4.  Confirm that it saves and reflects in your PostgreSQL DB

## **🧬 Part 3: Version Schema in Git (Recommended)**

After creating fields via UI, Strapi will update files in:

/src/api/talent-profile/content-types/talent-profile/schema.json

You should:

- Commit this schema file to Git

- This lets you reproduce the schema in staging or rebuild later without
  the UI

## **📡 Optional: Expose Public Read-Only API**

If needed, configure:

Settings → Roles → Public

Enable find and findOne for talent-profile

> ⚠️ Only do this if Strapi is handling public APIs (not recommended ---
> better to sync data to your own user-service and expose via NestJS)
