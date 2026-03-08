# **API Documentation --- User Service**

**Base URL:** \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1\
**Auth:** Authorization: Bearer \<token\> for protected calls\
**Content-Type:** application/json\
**Errors:** Non-2xx returns include JSON like { \"message\": string,
\"code\": string? }\
**Notes:** The frontend should talk to the **API Gateway only**. Do not
call internal microservice URLs directly.

## **🧭 1. System Overview**

The **User Service** is the core profile service for Marketeq Projects.
It manages user-owned profile data such as core identity fields,
username, location, availability, timezone, skills, education, work
experience, certifications, languages, and favorites.

Its role is to provide a single backend source of truth for **editable
user profile data** used across onboarding, "Complete My Profile," and
the visible portions of the Talent Profile page. It does **not** own
cross-service data like reviews, listings/offers, messaging metrics, or
project history.

## **🧱 2. High-Level Architecture**

### **1. Frontend (Next.js + TypeScript)**

The frontend renders profile, onboarding, and talent profile pages, then
calls the API Gateway for all user-service-backed reads and writes. It
should use these endpoints for profile CRUD, modular profile sections,
username checks, and favorites.

### **2. Backend (NestJS + TypeScript)**

The user-service is a modular NestJS service organized by feature (user,
skills, education, experience, favorites, etc.). It exposes REST
endpoints for profile creation, profile updates, and section-level CRUD.

### **3. Data Layer (Postgres)**

Profile data is stored in Postgres. In a microservice-safe design,
related external entities must be referenced by plain IDs (strings), not
by cross-service foreign keys.

### **4. External / Adjacent Services**

The user-service does **not** own:

- Reviews / ratings

- Listings / offers / services

- Messaging response time

- Project history\
  These must be fetched from their responsible services and composed at
  the gateway/BFF or frontend layer.

## **⚙️ 3. Workflow Overview**

1.  **Account is created in auth-service\**
    The auth-service handles login/registration/security. Once
    authenticated, the frontend uses the user-service to manage profile
    data.

2.  **User completes onboarding / profile setup\**
    The frontend progressively writes user profile sections (basic info,
    skills, education, work experience, etc.) to the user-service using
    modular endpoints.

3.  **Frontend renders public talent profile\**
    The frontend fetches a talent's public profile by username, then
    combines user-service data with data from other services (reviews,
    offers, etc.) if needed.

4.  **User manages favorites\**
    The user can save supported listing types (project/service/job/team)
    through the favorites endpoints and view them under "My Favorites."

## **🧩 4. Key Dependencies & Modules**

### **Frameworks & Libraries**

- **NestJS** --- route/controller/service structure

- **TypeORM or Prisma** --- persistence layer (the uploaded docs show
  both patterns across different docs)

- **class-validator** --- DTO validation

- **JWT auth guard** --- for protected endpoints

### **Core Modules**

- user

- skills

- education

- experience

- industries

- certifications

- languages

- favorites

### **Supporting Features**

- Username validation / availability

- Time zone and location update flows

- Optional IP-to-timezone enrichment via geo lookup (documented
  separately)

## **🧱 5. Current State & Responsibilities**

### **✅ Implemented / Documented in Current Backend Guides**

- Core user CRUD

- Public talent profile fetch

- Username check / update

- Skills CRUD

- Industry expertise CRUD

- Education CRUD

- Work experience CRUD

- Certifications CRUD

- Languages CRUD

- Availability / timezone / location updates

- Favorites add / remove / list

### **🚫 Explicitly Out of Scope for This Service**

- Reviews / ratings

- Listings / offers / services

- Messaging

- Project history

- Similar profile matching API (logic docs exist, but not a stable
  endpoint contract here)

### **⚠️ Standardization Note**

Some uploaded docs use slightly different route styles (for example GET
/users/:username vs a frontend-facing BFF route like
/api/talent-profiles/:username). In this documentation, I am
standardizing on the **gateway-facing /v1/\... routes**.

## **🔐 6. Access & Tools**

  ----------------------------------------------------------------------
  **Tool**         **Purpose**       **Notes**
  ---------------- ----------------- -----------------------------------
  GitHub Repo      user-service      Modular NestJS service
                   codebase          

  Postman /        Endpoint testing  Recommended for section CRUD
  Insomnia                           

  API Gateway      Frontend access   Frontend should not call service
                   point             hosts directly

  Postgres         Profile data      Use plain string IDs across service
                   storage           boundaries
  ----------------------------------------------------------------------

## **Sections in this service**

1.  Core User Profile

2.  Public Talent Profile

3.  Username Management

4.  Skills

5.  Industry Expertise

6.  Education

7.  Work Experience

8.  Certifications

9.  Languages

10. Availability, Time Zone & Location

11. Favorites

# **1) Core User Profile**

## **Create User Profile**

- **Purpose:** Creates the base user profile record used by the
  user-service. This is the foundational profile object that later
  sections build on, including onboarding and editable profile screens.

- **Used in UI:** Initial profile creation after registration or when
  provisioning a user record for the first time.

- **Method & URL:** POST /v1/users

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  {\
  \"username\": \"jane_dev\",\
  \"email\": \"jane@example.com\",\
  \"bio\": \"Frontend engineer\",\
  \"location\": \"Boise, ID\",\
  \"timezone\": \"America/Boise\",\
  \"availability\": \"FULL_TIME\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (201):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"usr_123\",\
  \"username\": \"jane_dev\",\
  \"email\": \"jane@example.com\",\
  \"bio\": \"Frontend engineer\",\
  \"location\": \"Boise, ID\",\
  \"timezone\": \"America/Boise\",\
  \"availability\": \"FULL_TIME\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 400 Validation failed

  - 409 Username or email already exists

- **Copy-Paste Example:**

  -----------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users\`, {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  username: \'jane_dev\',\
  email: \'jane@example.com\',\
  bio: \'Frontend engineer\',\
  location: \'Boise, ID\',\
  timezone: \'America/Boise\',\
  availability: \'FULL_TIME\',\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const user = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Get User Profile by ID**

- **Purpose:** Returns the core editable user profile by internal user
  ID. This is typically used for account settings, "Complete My
  Profile," or any authenticated profile management screen.

- **Used in UI:** Account settings, authenticated profile edit views.

- **Method & URL:** GET /v1/users/{userId}

- **Auth:** Bearer token (required)

- **Response (200):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"usr_123\",\
  \"username\": \"jane_dev\",\
  \"email\": \"jane@example.com\",\
  \"bio\": \"Frontend engineer\",\
  \"location\": \"Boise, ID\",\
  \"timezone\": \"America/Boise\",\
  \"availability\": \"FULL_TIME\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 401 Not authenticated

  - 404 User not found

- **Copy-Paste Example:**

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/\${userId}\`,
  {\
  headers: { Authorization: \`Bearer \${token}\` },\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const user = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

## **Update User Profile**

- **Purpose:** Updates the core editable fields on a user profile. This
  is the main endpoint for general profile changes that don't need to be
  split into a more specialized module.

- **Used in UI:** "Complete My Profile," general account settings, core
  talent profile editing.

- **Method & URL:** PUT /v1/users/{userId}

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  {\
  \"bio\": \"Senior React engineer\",\
  \"location\": \"Philadelphia, PA\",\
  \"availability\": \"PART_TIME\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (200):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"usr_123\",\
  \"username\": \"jane_dev\",\
  \"bio\": \"Senior React engineer\",\
  \"location\": \"Philadelphia, PA\",\
  \"availability\": \"PART_TIME\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 400 Validation failed

  - 404 User not found

- **Copy-Paste Example:**

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/\${userId}\`,
  {\
  method: \'PUT\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  bio: \'Senior React engineer\',\
  location: \'Philadelphia, PA\',\
  availability: \'PART_TIME\',\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const user = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

## **Delete User Profile**

- **Purpose:** Deletes the user profile record in the user-service. This
  should be treated as an administrative or destructive action and
  usually coordinated with auth/account deletion flows.

- **Used in UI:** Not typically exposed in normal user UI; mainly admin
  tooling or internal cleanup.

- **Method & URL:** DELETE /v1/users/{userId}

- **Auth:** Bearer token (required)

- **Response (200):**

  -----------------------------------------------------------------------
  { \"deleted\": true }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 401 Not authenticated

  - 404 User not found

- **Copy-Paste Example:**

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/\${userId}\`,
  {\
  method: \'DELETE\',\
  headers: { Authorization: \`Bearer \${token}\` },\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const result = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

# **2) Public Talent Profile**

## **Get Public Talent Profile by Username**

- **Purpose:** Fetches the public-facing talent profile using the
  username/handle shown in the URL. This is the main read endpoint for
  rendering the visible Talent Profile page sections owned by the
  user-service.

- **Used in UI:** Public talent profile page, talent preview cards
  linking to a profile.

- **Method & URL:** GET /v1/users/{username}

- **Auth:** Optional (public read; may include token if available)

- **Response (200):**

  -----------------------------------------------------------------------
  {\
  \"username\": \"jane_dev\",\
  \"display_name\": \"Jane Doe\",\
  \"headline\": \"Expert React Developer\",\
  \"experience_years\": 8,\
  \"location\": \"Philadelphia, PA\",\
  \"timezone\": \"America/New_York\",\
  \"availability\": \"FULL_TIME\",\
  \"rate_min\": 75,\
  \"rate_max\": 120,\
  \"overview\": \"Frontend engineer focused on scalable web apps.\",\
  \"skills\": \[\"React\", \"TypeScript\", \"Next.js\"\],\
  \"industry_expertise\": \[\"Fintech\", \"SaaS\"\],\
  \"certifications\": \[\],\
  \"languages\": \[\],\
  \"education\": \[\],\
  \"work_experience\": \[\]\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 404 Profile not found

  - 410 Profile hidden or unavailable (if supported later)

- **Copy-Paste Example:**

  -----------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/\${username}\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const profile = await res.json();
  -----------------------------------------------------------------------------

  -----------------------------------------------------------------------------

> Note: Some relevant docs also describe this as a frontend BFF route
> like /api/talent-profiles/:username. If you use a BFF, it should proxy
> to this gateway route.

# **3) Username Management**

## **Check Username Availability**

- **Purpose:** Validates whether a username is available before the user
  saves it. This supports onboarding and profile editing flows where
  live username validation is shown.

- **Used in UI:** Talent onboarding step "Create your username,"
  account/profile edit forms.

- **Method & URL:** POST /v1/users/check-username

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"username\": \"jane_dev\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (200):**

  -----------------------------------------------------------------------
  { \"username\": \"jane_dev\", \"available\": true }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 400 Invalid username format

  - 409 Username already taken

- **Copy-Paste Example:**

  -----------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/check-username\`,
  {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({ username: \'jane_dev\' }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const result = await res.json();
  -----------------------------------------------------------------------------

  -----------------------------------------------------------------------------

## **Update Username**

- **Purpose:** Persists a new username/handle for the user after
  validation passes. This changes the public profile URL slug and should
  be treated as a user-visible identity update.

- **Used in UI:** Username onboarding step and profile/account settings.

- **Method & URL:** PUT /v1/users/{userId}/username

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"username\": \"jane_dev\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (200):**

  -----------------------------------------------------------------------
  { \"id\": \"usr_123\", \"username\": \"jane_dev\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors:**

  - 400 Invalid username

  - 409 Username already taken

- **Copy-Paste Example:**

  ----------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/users/\${userId}/username\`,
  {\
  method: \'PUT\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({ username: \'jane_dev\' }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const updated = await res.json();
  ----------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------

# **4) Skills**

## **List Skills**

- **Purpose:** Returns the user's skill tags. This powers the Skills
  section on profile pages and any editing UI that displays the current
  skill set.

- **Used in UI:** Talent profile "Skills" tab, profile edit modals,
  onboarding/profile completion.

- **Method & URL:** GET /v1/users/{userId}/skills

- **Auth:** Bearer token (required)

- **Response (200):**

  -----------------------------------------------------------------------
  \[\
  { \"id\": \"sk_1\", \"name\": \"React\" },\
  { \"id\": \"sk_2\", \"name\": \"TypeScript\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Add Skill**

- **Purpose:** Adds a new skill to the user's profile. This is typically
  called when the user adds a chip/tag in profile editing.

- **Used in UI:** Profile editor, onboarding, "Complete My Profile."

- **Method & URL:** POST /v1/users/{userId}/skills

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"name\": \"Next.js\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (201):**

  -----------------------------------------------------------------------
  { \"id\": \"sk_3\", \"name\": \"Next.js\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Update Skill**

- **Purpose:** Renames or adjusts an existing skill entry. This is
  useful when a user edits an existing tag instead of deleting/re-adding
  it.

- **Used in UI:** Profile edit flows with inline editing.

- **Method & URL:** PUT /v1/users/{userId}/skills/{skillId}

- **Auth:** Bearer token (required)

## **Delete Skill**

- **Purpose:** Removes a skill from the profile. This keeps the skills
  list current and avoids stale tags on the public profile.

- **Used in UI:** Skill chip remove actions.

- **Method & URL:** DELETE /v1/users/{userId}/skills/{skillId}

- **Auth:** Bearer token (required)

- **Common Errors (all skill endpoints):**

  - 400 Validation failed

  - 404 Skill not found

# **5) Industry Expertise**

## **List Industry Expertise**

- **Purpose:** Returns the user's industry expertise tags. This supports
  profile relevance and structured filtering by industry experience.

- **Used in UI:** Talent profile overview, profile editing, onboarding
  enhancement flows.

- **Method & URL:** GET /v1/users/{userId}/industries

- **Auth:** Bearer token (required)

## **Add Industry Expertise**

- **Purpose:** Adds an industry domain to the user's profile. This helps
  shape profile matching and the expertise summary shown to clients.

- **Used in UI:** Profile editor and "Complete My Profile."

- **Method & URL:** POST /v1/users/{userId}/industries

- **Auth:** Bearer token (required)

## **Update Industry Expertise**

- **Purpose:** Updates an existing industry entry for the user. This
  supports correcting labels without deleting/recreating records.

- **Used in UI:** Inline edit flows.

- **Method & URL:** PUT /v1/users/{userId}/industries/{industryId}

- **Auth:** Bearer token (required)

## **Delete Industry Expertise**

- **Purpose:** Removes an industry tag from the profile. This keeps the
  expertise section accurate and avoids showing irrelevant experience
  areas.

- **Used in UI:** Tag delete actions.

- **Method & URL:** DELETE /v1/users/{userId}/industries/{industryId}

- **Auth:** Bearer token (required)

# **6) Education**

## **List Education**

- **Purpose:** Returns all education entries associated with a user.
  This powers the Education section on the public profile and edit
  screens.

- **Used in UI:** Talent profile "Education" tab and profile edit forms.

- **Method & URL:** GET /v1/users/{userId}/education

- **Auth:** Bearer token (required)

## **Add Education**

- **Purpose:** Creates a new education record such as degree,
  institution, and graduation year. This is used when a user adds a
  school entry to their profile.

- **Used in UI:** Education add modal/form.

- **Method & URL:** POST /v1/users/{userId}/education

- **Auth:** Bearer token (required)

## **Update Education**

- **Purpose:** Updates an existing education record. This supports edits
  without recreating the entire education history.

- **Used in UI:** Education edit modal/form.

- **Method & URL:** PUT /v1/users/{userId}/education/{eduId}

- **Auth:** Bearer token (required)

## **Delete Education**

- **Purpose:** Removes a saved education entry. This keeps profile
  history accurate when a user wants to remove old or incorrect academic
  data.

- **Used in UI:** Education delete action.

- **Method & URL:** DELETE /v1/users/{userId}/education/{eduId}

- **Auth:** Bearer token (required)

# **7) Work Experience**

## **List Work Experience**

- **Purpose:** Returns all work experience rows for the user. This
  powers the Work Experience section on the talent profile and edit
  workflows.

- **Used in UI:** Talent profile "Work Experience" tab and
  account/profile editing.

- **Method & URL:** GET /v1/users/{userId}/work

- **Auth:** Bearer token (required)

## **Add Work Experience**

- **Purpose:** Adds a new job/company entry for the user. This stores
  role, company, dates, and summary used in the public profile.

- **Used in UI:** Work history add modal/form.

- **Method & URL:** POST /v1/users/{userId}/work

- **Auth:** Bearer token (required)

## **Update Work Experience**

- **Purpose:** Updates an existing work entry. This supports correcting
  titles, dates, or summaries without deleting the record.

- **Used in UI:** Work history edit modal/form.

- **Method & URL:** PUT /v1/users/{userId}/work/{workId}

- **Auth:** Bearer token (required)

## **Delete Work Experience**

- **Purpose:** Removes a work history entry from the user profile. This
  is useful for cleaning up stale or incorrect items.

- **Used in UI:** Work history delete action.

- **Method & URL:** DELETE /v1/users/{userId}/work/{workId}

- **Auth:** Bearer token (required)

# **8) Certifications**

## **List Certifications**

- **Purpose:** Returns professional certifications for the user. This
  supports profile trust-building and credential display on the talent
  profile page.

- **Used in UI:** Certifications section of the talent profile and
  profile edit page.

- **Method & URL:** GET /v1/users/{userId}/certifications

- **Auth:** Bearer token (required)

## **Add Certification**

- **Purpose:** Adds a certification entry (name, issuer, year, etc.).
  This is typically used when a user wants to highlight credentials.

- **Used in UI:** Certification add modal.

- **Method & URL:** POST /v1/users/{userId}/certifications

- **Auth:** Bearer token (required)

## **Update Certification**

- **Purpose:** Updates a saved certification entry. This keeps issuers,
  dates, and titles accurate over time.

- **Used in UI:** Certification edit modal.

- **Method & URL:** PUT /v1/users/{userId}/certifications/{certId}

- **Auth:** Bearer token (required)

## **Delete Certification**

- **Purpose:** Removes a certification from the profile. This allows
  users to clean up expired or irrelevant credentials.

- **Used in UI:** Certification delete action.

- **Method & URL:** DELETE /v1/users/{userId}/certifications/{certId}

- **Auth:** Bearer token (required)

# **9) Languages**

## **List Languages**

- **Purpose:** Returns languages the user speaks, usually with fluency
  level metadata. This supports public profile display and better
  collaboration matching.

- **Used in UI:** Languages section in talent profile and profile
  editing.

- **Method & URL:** GET /v1/users/{userId}/languages

- **Auth:** Bearer token (required)

## **Add Language**

- **Purpose:** Adds a language entry to the profile. This is used when a
  user wants to show multilingual capability.

- **Used in UI:** Languages add control.

- **Method & URL:** POST /v1/users/{userId}/languages

- **Auth:** Bearer token (required)

## **Update Language**

- **Purpose:** Updates an existing language record, usually to change
  fluency or display value. This keeps profile language information
  accurate.

- **Used in UI:** Languages edit control.

- **Method & URL:** PUT /v1/users/{userId}/languages/{langId}

- **Auth:** Bearer token (required)

## **Delete Language**

- **Purpose:** Removes a language from the user profile. This supports
  cleanup and accurate public profile display.

- **Used in UI:** Languages remove control.

- **Method & URL:** DELETE /v1/users/{userId}/languages/{langId}

- **Auth:** Bearer token (required)

# **10) Availability, Time Zone & Location**

## **Update Availability**

- **Purpose:** Updates the user's availability block, such as weekly
  capacity or working status. This is part of the talent profile's
  visible availability metadata.

- **Used in UI:** Profile settings, "Complete My Profile," talent
  profile edit flow.

- **Method & URL:** PUT /v1/users/{userId}/availability

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"availability\": \"40 hrs/week\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Update Time Zone**

- **Purpose:** Updates the IANA time zone stored on the profile. This
  supports profile display and future time-aware scheduling features.

- **Used in UI:** Profile settings, read-only time zone display, profile
  completion.

- **Method & URL:** PUT /v1/users/{userId}/timezone

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"timezone\": \"America/New_York\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Update Location**

- **Purpose:** Updates the user's human-readable location
  (city/region/country). This supports public profile display and
  geographic relevance.

- **Used in UI:** Profile settings, onboarding completion, talent
  profile header.

- **Method & URL:** PUT /v1/users/{userId}/location

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"location\": \"Philadelphia, PA\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors (all three):**

  - 400 Validation failed

  - 404 User not found

# **11) Favorites**

## **Add Favorite**

- **Purpose:** Adds a listing to the current user's favorites. The
  stored record includes both listingId and listingType, so the frontend
  can route correctly later.

- **Used in UI:** "Save" actions for supported listing types and the "My
  Favorites" dashboard view.

- **Method & URL:** POST /v1/favorites

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  {\
  \"listingId\": \"lst_123\",\
  \"listingType\": \"project\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Response (201):**

  -----------------------------------------------------------------------
  {\
  \"id\": \"fav_1\",\
  \"userId\": \"usr_123\",\
  \"listingId\": \"lst_123\",\
  \"listingType\": \"project\",\
  \"createdAt\": \"2026-03-05T12:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Remove Favorite**

- **Purpose:** Removes a listing from the current user's favorites. This
  is the inverse of the save/bookmark action and keeps the favorites
  list accurate.

- **Used in UI:** "Unsave" actions and favorites management pages.

- **Method & URL:** DELETE /v1/favorites

- **Auth:** Bearer token (required)

- **Request Body:**

  -----------------------------------------------------------------------
  { \"listingId\": \"lst_123\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Get Current User Favorites**

- **Purpose:** Returns the logged-in user's saved listings, sorted by
  most recent. This powers the "My Favorites" screen and any saved-items
  dropdowns.

- **Used in UI:** My Favorites dashboard section and saved items pages.

- **Method & URL:** GET /v1/favorites

- **Auth:** Bearer token (required)

- **Response (200):**

  -----------------------------------------------------------------------
  \[\
  {\
  \"id\": \"fav_1\",\
  \"userId\": \"usr_123\",\
  \"listingId\": \"lst_123\",\
  \"listingType\": \"project\",\
  \"createdAt\": \"2026-03-05T12:00:00.000Z\"\
  }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Common Errors (favorites):**

  - 401 Not authenticated

  - 400 Invalid listing type

  - 404 Favorite not found (if your implementation throws on delete
    miss)

- **Copy-Paste Example:**

  -----------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/favorites\`, {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  listingId: \'lst_123\',\
  listingType: \'project\',\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const favorite = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**12) Talent Profile CTAs (Not implemented yet)**

## **Save Talent Profile (Favorite extension)**

Purpose: Saves a talent profile from the Talent Profile page, so it
appears in "My Favorites". This extends the current favorites system to
support listingType = talent.\
Used in UI: Talent Profile page "Save" button.

Method & URL: POST /v1/favorites\
Auth: Bearer token (required)\
Request Body:

  -----------------------------------------------------------------------
  {\
  \"listingId\": \"usr_talent_123\",\
  \"listingType\": \"talent\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response (201):

  -----------------------------------------------------------------------
  {\
  \"id\": \"fav_101\",\
  \"userId\": \"usr_client_456\",\
  \"listingId\": \"usr_talent_123\",\
  \"listingType\": \"talent\",\
  \"createdAt\": \"2026-03-05T12:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 400 Invalid listing type (until talent is added)

- 401 Not authenticated

- 404 Talent not found (if validated)

Copy-Paste Example:

  -----------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/favorites\`, {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  listingId: \'usr_talent_123\',\
  listingType: \'talent\',\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const favorite = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Hire Me (Create Hire Request)**

Purpose: Creates a hire request record when a client clicks "Hire Me".
This starts a workflow with status tracking
(pending/accepted/declined/etc.).\
Used in UI: Talent Profile page "Hire Me" button.

Method & URL: POST /v1/hire-requests\
Auth: Bearer token (required)\
Request Body:

  -----------------------------------------------------------------------
  {\
  \"clientUserId\": \"usr_client_456\",\
  \"talentUserId\": \"usr_talent_123\",\
  \"message\": \"Optional project context\",\
  \"budgetUsd\": 40000,\
  \"projectType\": \"optional\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response (201):

  -----------------------------------------------------------------------
  {\
  \"id\": \"hire_001\",\
  \"status\": \"PENDING\",\
  \"clientUserId\": \"usr_client_456\",\
  \"talentUserId\": \"usr_talent_123\",\
  \"createdAt\": \"2026-03-05T12:00:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 400 Validation failed

- 401 Not authenticated

- 404 Client or Talent not found

Copy-Paste Example:

  -----------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/hire-requests\`, {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  clientUserId,\
  talentUserId: \'usr_talent_123\',\
  message: \'Optional project context\',\
  budgetUsd: 40000,\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const hireRequest = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **Hire Requests --- List**

Purpose: Returns hire requests for the logged-in user, filtered by role
and status. Used to render "My Requests" or "Incoming Requests"
screens.\
Used in UI: Client dashboard (outgoing requests), Talent dashboard
(incoming requests).

Method & URL: GET
/v1/hire-requests?role=client\|talent&status=PENDING\|ACCEPTED\|DECLINED\
Auth: Bearer token (required)

Response (200):

  -----------------------------------------------------------------------
  \[\
  { \"id\": \"hire_001\", \"status\": \"PENDING\", \"clientUserId\":
  \"usr_client_456\", \"talentUserId\": \"usr_talent_123\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 401 Not authenticated

- 400 Invalid filters

Copy-Paste Example:

  -------------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/hire-requests?role=client&status=PENDING\`,
  {\
  headers: { Authorization: \`Bearer \${token}\` },\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const rows = await res.json();
  -------------------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------------------

## **Hire Requests --- Get by ID**

Purpose: Fetches a single hire request detail view. Used to show status,
participants, and the original message context.\
Used in UI: Hire request details page.

Method & URL: GET /v1/hire-requests/{hireRequestId}\
Auth: Bearer token (required)

Response (200):

  -----------------------------------------------------------------------
  {\
  \"id\": \"hire_001\",\
  \"status\": \"PENDING\",\
  \"clientUserId\": \"usr_client_456\",\
  \"talentUserId\": \"usr_talent_123\",\
  \"message\": \"Optional project context\",\
  \"budgetUsd\": 40000\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 401 Not authenticated

- 404 Hire request not found

Copy-Paste Example:

  ----------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/hire-requests/\${hireRequestId}\`,
  {\
  headers: { Authorization: \`Bearer \${token}\` },\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const hire = await res.json();
  ----------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------

## **Hire Requests --- Update Status**

Purpose: Updates the hire request status (accept/decline/close). This
enables the workflow after the initial "Hire Me" action.\
Used in UI: Talent accepts/declines, client closes, etc.

Method & URL: PUT /v1/hire-requests/{hireRequestId}/status\
Auth: Bearer token (required)\
Request Body:

  -----------------------------------------------------------------------
  { \"status\": \"ACCEPTED\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response (200):

  -----------------------------------------------------------------------
  { \"id\": \"hire_001\", \"status\": \"ACCEPTED\" }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 400 Invalid status transition

- 401 Not authenticated

- 403 Not allowed (wrong actor)

- 404 Hire request not found

Copy-Paste Example:

  -----------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/hire-requests/\${hireRequestId}/status\`,
  {\
  method: \'PUT\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({ status: \'ACCEPTED\' }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const updated = await res.json();
  -----------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------------

## **Message Me (Create Conversation Thread)**

Purpose: Creates a conversation thread between the client and the
talent. If one already exists, returns the existing thread
(idempotent).\
Used in UI: Talent Profile page "Message Me" button → navigate to chat.

Method & URL: POST /v1/messages/threads\
Auth: Bearer token (required)\
Request Body:

  -----------------------------------------------------------------------
  {\
  \"clientUserId\": \"usr_client_456\",\
  \"talentUserId\": \"usr_talent_123\",\
  \"initialMessage\": \"Hello! I\'d like to discuss a project.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response (200/201):

  -----------------------------------------------------------------------
  {\
  \"threadId\": \"thread_abc123\",\
  \"created\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 400 Validation failed

- 401 Not authenticated

- 404 Talent not found

Copy-Paste Example:

  -------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/messages/threads\`,
  {\
  method: \'POST\',\
  headers: {\
  \'Content-Type\': \'application/json\',\
  Authorization: \`Bearer \${token}\`,\
  },\
  body: JSON.stringify({\
  clientUserId,\
  talentUserId: \'usr_talent_123\',\
  initialMessage: \"Hello! I\'d like to discuss a project.\",\
  }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const thread = await res.json();
  -------------------------------------------------------------------------

  -------------------------------------------------------------------------

# **13) Offers (Talent service packages/listings) ( Not implemented yet)**

## **List Offers for a Talent**

Purpose: Returns the offers/service packages shown in the Talent Profile
"Offers" tab. Used to render offer cards with pricing and delivery.\
Used in UI: Talent Profile → Offers tab.

Method & URL: GET /v1/talent/{talentUserId}/offers\
Auth: Optional (public read allowed)

Response (200):

  -----------------------------------------------------------------------
  \[\
  { \"offerId\": \"offer_001\", \"title\": \"UX Audit\", \"description\":
  \"Full audit + recommendations\", \"priceUsd\": 1500, \"deliveryDays\":
  7 }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 404 Talent not found

Copy-Paste Example:

  -----------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent/\${talentUserId}/offers\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const offers = await res.json();
  -----------------------------------------------------------------------------------------

  -----------------------------------------------------------------------------------------

## **Create Offer**

Purpose: Allows a talent to create a new offer that will appear in their
public profile. Used when a talent sets up packages/services.\
Used in UI: Talent profile management (offers editor).

Method & URL: POST /v1/talent/{talentUserId}/offers\
Auth: Bearer token (required)\
Request Body:

  -----------------------------------------------------------------------
  { \"title\": \"UX Audit\", \"description\": \"Full audit\",
  \"priceUsd\": 1500, \"deliveryDays\": 7 }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response (201):

  -----------------------------------------------------------------------
  { \"offerId\": \"offer_001\", \"title\": \"UX Audit\", \"priceUsd\":
  1500 }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 400 Validation failed

- 401 Not authenticated

- 403 Not allowed (not owner)

Copy-Paste Example:

  ---------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent/\${talentUserId}/offers\`,
  {\
  method: \'POST\',\
  headers: { \'Content-Type\': \'application/json\', Authorization: \`Bearer \${token}\`
  },\
  body: JSON.stringify({ title: \'UX Audit\', description: \'Full audit\', priceUsd:
  1500, deliveryDays: 7 }),\
  });\
  if (!res.ok) throw new Error((await res.json()).message);\
  const offer = await res.json();
  ---------------------------------------------------------------------------------------

  ---------------------------------------------------------------------------------------

## **Update Offer**

Purpose: Updates an existing offer so the talent can correct pricing or
description without recreating it.\
Used in UI: Offer edit modal.

Method & URL: PUT /v1/talent/{talentUserId}/offers/{offerId}\
Auth: Bearer token (required)

## **Delete Offer**

Purpose: Removes an offer from the talent profile. Used to remove
outdated packages.\
Used in UI: Offer delete action.

Method & URL: DELETE /v1/talent/{talentUserId}/offers/{offerId}\
Auth: Bearer token (required)

# **14) Project History (Platform projects) (Not implemented yet)**

## **List Project History for a Talent**

Purpose: Returns platform project history for display in the "Project
History" tab. This is platform-driven history, not manual portfolio.\
Used in UI: Talent Profile → Project History tab.

Method & URL: GET /v1/talent/{talentUserId}/project-history\
Auth: Optional (public read allowed)

Response (200):

  -----------------------------------------------------------------------
  \[\
  { \"projectId\": \"proj_001\", \"title\": \"Mobile App Redesign\",
  \"category\": \"Design\", \"completedAt\":
  \"2025-12-10T00:00:00.000Z\", \"rating\": 4.8 }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 404 Talent not found

Copy-Paste Example:

  --------------------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent/\${talentUserId}/project-history\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const history = await res.json();
  --------------------------------------------------------------------------------------------------

  --------------------------------------------------------------------------------------------------

# **15) Affiliated Teams (Talent membership) (Not implemented yet)**

## **List Affiliated Teams for a Talent**

Purpose: Returns teams where the talent is a member for display in
"Affiliated Teams" on the Talent Profile page.\
Used in UI: Talent Profile → Affiliated Teams section.

Method & URL: GET /v1/talent/{talentUserId}/teams\
Auth: Optional (public read allowed)

Response (200):

  -----------------------------------------------------------------------
  \[\
  { \"teamId\": \"team_01\", \"teamName\": \"Marketeq Studio\", \"role\":
  \"Member\" }\
  \]
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Common Errors:

- 404 Talent not found

Copy-Paste Example:

  ----------------------------------------------------------------------------------------
  const res = await
  fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent/\${talentUserId}/teams\`);\
  if (!res.ok) throw new Error((await res.json()).message);\
  const teams = await res.json();
  ----------------------------------------------------------------------------------------

  ----------------------------------------------------------------------------------------
