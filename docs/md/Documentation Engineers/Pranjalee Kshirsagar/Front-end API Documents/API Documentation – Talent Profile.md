# **📄 API Documentation -- Talent Profile**

**Base URL\**
\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1

**Auth\**
Authorization: Bearer \<token\> for all protected calls.

**Content Types**

- application/json for normal requests.

- multipart/form-data when uploading an avatar image.

**Error Shape**

{

\"message\": \"Human-readable error message\",

\"code\": \"OPTIONAL_ERROR_CODE\"

}

All non-2xx responses follow this pattern.

## **1. Screen & Scope -- "Talent Profile"**

This document covers the **single talent profile view** you see in the
Figma file (not the list view). It includes the header (name, avatar,
recent job title), bio, skills, industries, previous clients, affiliated
teams, experience, education, certifications, languages, availability,
and external links.

**Out of scope for this doc:**

- Talent search/list results

- Project detail pages

- Team detail pages

Those will be covered in separate documents.

## **2. Data Model -- Talent Profile**

This is the **canonical "Talent Profile" object** returned by GET
/v1/talent/{talentId} and created/updated via POST and PUT. Some
sections are backed directly by talent DTOs; others are aggregates over
related resources (skills, experience, etc.) that have their own
endpoints.

### **2.1 Core Identity & Ownership**

  -----------------------------------------------------------------------------
  **Field**   **Type**   **Direction**   **Notes**
  ----------- ---------- --------------- --------------------------------------
  id          string /   response only   Unique talent profile identifier
              number                     (talentId in URLs).

  userId      string     response only   Underlying user's ID.
              (UUID)                     

  firstName   string     create & update From CreateTalentDto /
                                         UpdateTalentDto.

  lastName    string     create & update From CreateTalentDto /
                                         UpdateTalentDto.

  username    string     create only     Used when creating a talent profile.
                                         (CreateTalentDto)

  userName    string     update only     Username field for updates (note
                                         capital N). (UpdateTalentDto)
  -----------------------------------------------------------------------------

### **2.2 Header / Summary**

  -------------------------------------------------------------------------------
  **Field**        **Type**   **Direction**   **Notes**
  ---------------- ---------- --------------- -----------------------------------
  recentJobTitle   string     create & update Primary role shown under the name.
                                              (CreateTalentDto, UpdateTalentDto)

  role             string     response &      Normalized primary role tag (e.g.
                              update          \"frontend-engineer\").

  experience       number     response &      Years of experience (used for
                              update          badges).

  hourlyRate       number     response &      Preferred hourly rate or
                              update          equivalent.

  rating           number     response only   Aggregate rating shown as stars.
  -------------------------------------------------------------------------------

### **2.3 Location, Languages & Timezone**

  --------------------------------------------------------------------------------
  **Field**   **Type**   **Direction**   **Notes**
  ----------- ---------- --------------- -----------------------------------------
  location    string     create & update City/region. (CreateTalentDto,
                                         UpdateTalentDto)

  language    string     create only     Free-form language string (e.g.
                                         \"English, Spanish\"). (CreateTalentDto)

  languages   string     update only     Same concept, used in UpdateTalentDto
                                         (plural).

  timezone    string     response &      IANA name like \"America/Los_Angeles\".
                         update          
  --------------------------------------------------------------------------------

### **2.4 About / Bio & Industries**

  **Field**            **Type**    **Direction**       **Notes**
  -------------------- ----------- ------------------- ------------------------------------------------------------------------------------------------------
  bio                  string      create & update     Long-form "About" text (supervisor + Figma requirement -- DTO update may be needed).
  industriesWorkedIn   string      create & update     Comma-separated or free-form industries (e.g. \"Fintech, SaaS\"). (CreateTalentDto, UpdateTalentDto)
  skills               Skill\[\]   separate resource   See Skills section below; rendered as chips on the profile.

### **2.5 Preferences & Availability**

  **Field**            **Type**                 **Direction**       **Notes**
  -------------------- ------------------------ ------------------- -------------------------------------------------------------------------
  lookingToWorkWith    string\[\]               create & update     Ideal collaborators/clients. (CreateTalentDto, UpdateTalentDto)
  projectTypes         string\[\]               create & update     Types of projects of interest. (CreateTalentDto, UpdateTalentDto)
  isStudent            boolean                  create & update     Whether currently a student. (CreateTalentDto, UpdateTalentDto)
  availability         string (enum)            create & update     FULL_TIME / PART_TIME / CUSTOM, etc. (CreateTalentDto, UpdateTalentDto)
  customAvailability   CustomAvailability\[\]   create & update\*   Detailed schedule when availability = CUSTOM. (CreateTalentDto)

CustomAvailability shape:

type TimeRange = {

startTime: string; // \"09:00\"

startTimeDayPeriod: string; // \"AM\" \| \"PM\"

endTime: string; // \"05:00\"

endTimeDayPeriod: string; // \"PM\"

};

type CustomAvailability = {

day: string; // \"SUNDAY\"\...\"SATURDAY\"

times: TimeRange\[\];

};

> Note: Currently only the create DTO has customAvailability. The doc
> treats it as part of the target update contract as well (requires DTO
> extension for PUT).

### **2.6 Visuals & Links**

  ----------------------------------------------------------------------------------
  **Field**      **Type**   **Direction**         **Notes**
  -------------- ---------- --------------------- ----------------------------------
  avatar         file       create & update       Raw file in multipart/form-data
                                                  requests.

  avatarUrl      string     response only         URL to processed avatar image.

  profileURL     string     update & response     Canonical public profile URL slug.
                                                  (UpdateTalentDto)

  portfolioUrl   string     create/update/resp.   External portfolio site.

  websiteUrl     string     create/update/resp.   Personal website if separate.

  githubUrl      string     create/update/resp.   GitHub profile.

  linkedinUrl    string     create/update/resp.   LinkedIn profile.

  dribbbleUrl    string     create/update/resp.   Design portfolio link.

  behanceUrl     string     create/update/resp.   Design portfolio link.
  ----------------------------------------------------------------------------------

(Link fields come from Figma + supervisor; you may need DTO changes.)

### **2.7 System & Status**

  -----------------------------------------------------------------------
  **Field**   **Type**   **Direction**   **Notes**
  ----------- ---------- --------------- --------------------------------
  isActive    boolean    response only   Indicates if the profile is
                                         active/visible.

  deletedAt   string     response only   ISO timestamp for soft deletion.

  createdAt   string     response only   ISO timestamp when record was
                                         created.

  updatedAt   string     response only   ISO timestamp when record was
                                         last updated.
  -----------------------------------------------------------------------

## **3. Child Collections on Talent Profile**

These all appear on the Talent Profile screen but are modeled as
**separate resources** with their own DTOs and endpoints.

### **3.1 Skills**

**Shape (from CreateSkillDto)**

  -----------------------------------------------------------------------
  type Skill = {\
  id: string; // response only\
  name: string; // required\
  userId: string; // response only or set server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Rendered as skill chips ("React", "Node.js", etc.).

### **3.2 Languages (detailed list)**

**Shape (from CreateLanguageDto)**

  -----------------------------------------------------------------------
  type TalentLanguage = {\
  id: string; // response only\
  name: string; // \"English\"\
  fluency: string; // \"Native\", \"Professional\", etc.\
  userId: string; // response only or server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

This is more structured than the single language(s) string.

### **3.3 Work Experience**

**Shape (from CreateWorkExperienceDto / UpdateWorkExperienceDto)**

  -----------------------------------------------------------------------
  type WorkExperience = {\
  id: string; // response only\
  role: string; // \"Senior Engineer\"\
  company: string; // \"Acme Corp\"\
  startDate: string; // ISO date\
  endDate?: string; // ISO date or null\
  summary?: string; // responsibilities / achievements\
  userId: string; // response only or server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Shown in the "Experience" timeline.

### **3.4 Education**

**Shape (from CreateEducationDto)**

  -----------------------------------------------------------------------
  type Education = {\
  id: string; // response only\
  degree: string; // \"BSc Computer Science\"\
  institution: string; // \"XYZ University\"\
  year?: number; // optional graduation year\
  fieldOfStudy: string;\
  startDate?: string; // ISO\
  endDate?: string; // ISO\
  userId: string; // response only or server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.5 Certifications**

**Shape (from CreateCertificationDto)**

  -----------------------------------------------------------------------
  type Certification = {\
  id: string; // response only\
  name: string; // \"AWS Certified Solutions Architect\"\
  issuer: string; // \"Amazon\"\
  year: number; // 2023\
  userId: string; // response only or server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.6 Affiliated Teams**

**Shape (from CreateAffiliatedTeamDto)**

  -----------------------------------------------------------------------
  type AffiliatedTeam = {\
  id: string; // response only\
  name: string; // \"Growth Squad\"\
  location: string;\
  time: string; // \"2022-Present\"\
  userId: string; // response only or server-side\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **3.7 Previous Clients** 

Not yet in the DTOs, but required by Figma Suggested shape:

  -----------------------------------------------------------------------
  type PreviousClient = {\
  id: string; // response only\
  name: string; // \"Acme Corp\"\
  logoUrl?: string; // URL to client logo\
  summary?: string; // \"Led redesign of checkout funnel\"\
  };
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4. Endpoint Reference**

### **4.1 Create Talent Profile**

**Method & URL**

POST /v1/talent

**Purpose\**
Create a full talent profile for the currently authenticated user. This
endpoint powers the "Set up your talent profile" flow and establishes
the single source of truth for header fields, bio, industries,
preferences, availability, and top-level links. It can also accept
nested collections (skills, experience, etc.) or those can be created
later through dedicated endpoints.

**Used in UI / Systems**

- Talent onboarding wizard -- final "Submit profile" step.

- Admin/back-office tooling to create or import talent profiles.

**Auth**

- Authorization: Bearer \<token\> -- required; the profile is tied to
  the authenticated user.

**Headers**

- Content-Type: multipart/form-data when sending avatar.

- Otherwise application/json.

#### **Request Body**

**Core fields from CreateTalentDto**

- firstName *(string, required)\*

- lastName *(string, required)\*

- username *(string, required)\*

- location *(string, required)\*

- language *(string, required)\*

- recentJobTitle *(string, required)\*

- industriesWorkedIn *(string, required)\*

- lookingToWorkWith *(string\[\] , required)\*

- isStudent *(boolean, required)\*

- projectTypes *(string\[\], required)\*

- availability *(string enum, required)* -- e.g. \"FULL_TIME\",
  \"PART_TIME\", \"CUSTOM\".

- customAvailability *(CustomAvailability\[\], optional)* -- only when
  availability = \"CUSTOM\".

**Extended profile fields (design)**

- bio *(string, optional)* -- long "About" section.

- role *(string, optional)* -- normalized primary role tag.

- experience *(number, optional)* -- years of experience.

- hourlyRate *(number, optional)* -- rate in platform's currency units.

- timezone *(string, optional)* -- IANA timezone.

- skills *(Skill\[\], optional)* -- see Skills shape above. Can be array
  of { name }.

- previousClients *(PreviousClient\[\], optional)* -- see shape above.

- affiliatedTeams *(AffiliatedTeam\[\], optional)* -- see shape above.

**Link fields**

- portfolioUrl *(string, optional)\*

- websiteUrl *(string, optional)\*

- githubUrl *(string, optional)\*

- linkedinUrl *(string, optional)\*

- dribbbleUrl *(string, optional)\*

- behanceUrl *(string, optional)\*

**Media**

- avatar *(file, optional)* -- profile image (multipart/form-data).

#### **Sample Request (multipart, JavaScript)**

  -----------------------------------------------------------------------
  const form = new FormData();\
  \
  form.append(\"firstName\", \"Ava\");\
  form.append(\"lastName\", \"Nguyen\");\
  form.append(\"username\", \"ava-nguyen\");\
  form.append(\"location\", \"Seattle, USA\");\
  form.append(\"language\", \"English, Spanish\");\
  form.append(\"recentJobTitle\", \"Senior Full-Stack Engineer\");\
  form.append(\"industriesWorkedIn\", \"Fintech, SaaS\");\
  \
  // arrays as JSON strings (backend parses)\
  form.append(\"lookingToWorkWith\", JSON.stringify(\[\
  \"product-led teams\",\
  \"design-driven startups\"\
  \]));\
  form.append(\"projectTypes\", JSON.stringify(\[\
  \"MVP build\",\
  \"Long-term product\"\
  \]));\
  form.append(\"availability\", \"FULL_TIME\");\
  form.append(\"customAvailability\", JSON.stringify(\[\
  {\
  day: \"MONDAY\",\
  times: \[\
  {\
  startTime: \"09:00\",\
  startTimeDayPeriod: \"AM\",\
  endTime: \"05:00\",\
  endTimeDayPeriod: \"PM\"\
  }\
  \]\
  }\
  \]));\
  \
  form.append(\"isStudent\", \"false\");\
  \
  // extended profile fields\
  form.append(\"bio\", \"I\'m a full-stack engineer with 7+ years of
  experience building B2B SaaS products\...\");\
  form.append(\"role\", \"fullstack-engineer\");\
  form.append(\"experience\", \"7\");\
  form.append(\"hourlyRate\", \"120\");\
  form.append(\"timezone\", \"America/Los_Angeles\");\
  \
  // skills, previous clients, affiliated teams\
  form.append(\"skills\", JSON.stringify(\[\
  { name: \"React\" },\
  { name: \"Node.js\" },\
  { name: \"TypeScript\" }\
  \]));\
  \
  form.append(\"previousClients\", JSON.stringify(\[\
  {\
  name: \"Acme Corp\",\
  logoUrl: \"https://cdn.example.com/logos/acme.png\",\
  summary: \"Led checkout funnel redesign, improving conversion by
  18%.\"\
  }\
  \]));\
  \
  form.append(\"affiliatedTeams\", JSON.stringify(\[\
  {\
  name: \"Growth Squad\",\
  location: \"Remote\",\
  time: \"2023-Present\"\
  }\
  \]));\
  \
  // links\
  form.append(\"portfolioUrl\", \"https://ava.dev\");\
  form.append(\"githubUrl\", \"https://github.com/ava\");\
  form.append(\"linkedinUrl\",
  \"https://www.linkedin.com/in/ava-nguyen\");\
  \
  // avatar file from file input\
  form.append(\"avatar\", fileInput.files\[0\]);\
  \
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent\`,\
  {\
  method: \"POST\",\
  headers: {\
  Authorization: \`Bearer \${token}\`\
  // DO NOT set Content-Type manually for multipart\
  },\
  body: form\
  }\
  );\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const talent = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

#### **Sample Response (201 Created)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"tal_12345\",\
  \"userId\": \"usr_789\",\
  \"firstName\": \"Ava\",\
  \"lastName\": \"Nguyen\",\
  \"username\": \"ava-nguyen\",\
  \"profileURL\": \"/talent/ava-nguyen\",\
  \"recentJobTitle\": \"Senior Full-Stack Engineer\",\
  \"role\": \"fullstack-engineer\",\
  \"experience\": 7,\
  \"hourlyRate\": 120,\
  \"location\": \"Seattle, USA\",\
  \"language\": \"English, Spanish\",\
  \"timezone\": \"America/Los_Angeles\",\
  \"bio\": \"I\'m a full-stack engineer with 7+ years of experience
  building B2B SaaS products\...\",\
  \"industriesWorkedIn\": \"Fintech, SaaS\",\
  \"lookingToWorkWith\": \[\
  \"product-led teams\",\
  \"design-driven startups\"\
  \],\
  \"projectTypes\": \[\
  \"MVP build\",\
  \"Long-term product\"\
  \],\
  \"isStudent\": false,\
  \"availability\": \"FULL_TIME\",\
  \"customAvailability\": \[\
  {\
  \"day\": \"MONDAY\",\
  \"times\": \[\
  {\
  \"startTime\": \"09:00\",\
  \"startTimeDayPeriod\": \"AM\",\
  \"endTime\": \"05:00\",\
  \"endTimeDayPeriod\": \"PM\"\
  }\
  \]\
  }\
  \],\
  \"skills\": \[\
  { \"id\": \"sk_1\", \"name\": \"React\" },\
  { \"id\": \"sk_2\", \"name\": \"Node.js\" },\
  { \"id\": \"sk_3\", \"name\": \"TypeScript\" }\
  \],\
  \"previousClients\": \[\
  {\
  \"id\": \"cl_1\",\
  \"name\": \"Acme Corp\",\
  \"logoUrl\": \"https://cdn.example.com/logos/acme.png\",\
  \"summary\": \"Led checkout funnel redesign, improving conversion by
  18%.\"\
  }\
  \],\
  \"affiliatedTeams\": \[\
  {\
  \"id\": \"team_1\",\
  \"name\": \"Growth Squad\",\
  \"location\": \"Remote\",\
  \"time\": \"2023-Present\"\
  }\
  \],\
  \"portfolioUrl\": \"https://ava.dev\",\
  \"githubUrl\": \"https://github.com/ava\",\
  \"linkedinUrl\": \"https://www.linkedin.com/in/ava-nguyen\",\
  \"avatarUrl\": \"https://cdn.example.com/avatars/tal_12345.png\",\
  \"rating\": 4.9,\
  \"isActive\": true,\
  \"createdAt\": \"2025-10-10T12:30:00.000Z\",\
  \"updatedAt\": \"2025-10-10T12:30:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

#### **Common Errors**

- 400 Bad Request -- validation error on DTO fields.

- 401 Unauthorized -- missing or invalid Bearer token.

- 415 Unsupported Media Type -- invalid multipart upload.

### **4.2 Get Talent Profile by ID**

**Method & URL**

GET /v1/talent/{talentId}

**Purpose\**
Fetch the full talent profile for a given talentId, including header
details, bio, industries, skills, preferences, availability, previous
clients, affiliated teams, experience, education, certifications, and
external links. This endpoint powers the main Talent Profile screen and
provides a consistent contract for both web UI and backend services that
need full profile context.

**Used in UI / Systems**

- Talent profile page /talent/{slug or id}.

- Admin tools, moderation dashboards, matching engines.

**Auth**

- Authorization: Bearer \<token\> -- required for now (later can support
  public profiles).

**Path Params**

- talentId *(string, required)* -- e.g. \"tal_12345\".

**Sample Request**

  -----------------------------------------------------------------------
  GET /v1/talent/tal_12345 HTTP/1.1\
  Host: api.example.com\
  Authorization: Bearer \<token\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Sample Response (200 OK)**

#### 

  -----------------------------------------------------------------------
  {\
  \"id\": \"tal_12345\",\
  \"userId\": \"usr_789\",\
  \"firstName\": \"Ava\",\
  \"lastName\": \"Nguyen\",\
  \"username\": \"ava-nguyen\",\
  \"profileURL\": \"/talent/ava-nguyen\",\
  \"recentJobTitle\": \"Senior Full-Stack Engineer\",\
  \"role\": \"fullstack-engineer\",\
  \"experience\": 7,\
  \"hourlyRate\": 120,\
  \"location\": \"Seattle, USA\",\
  \"language\": \"English, Spanish\",\
  \"timezone\": \"America/Los_Angeles\",\
  \"bio\": \"I\'m a full-stack engineer with 7+ years of experience
  building B2B SaaS products\...\",\
  \"industriesWorkedIn\": \"Fintech, SaaS\",\
  \"lookingToWorkWith\": \[\
  \"product-led teams\",\
  \"design-driven startups\"\
  \],\
  \"projectTypes\": \[\
  \"MVP build\",\
  \"Long-term product\"\
  \],\
  \"isStudent\": false,\
  \"availability\": \"FULL_TIME\",\
  \"customAvailability\": \[\
  {\
  \"day\": \"MONDAY\",\
  \"times\": \[\
  {\
  \"startTime\": \"09:00\",\
  \"startTimeDayPeriod\": \"AM\",\
  \"endTime\": \"05:00\",\
  \"endTimeDayPeriod\": \"PM\"\
  }\
  \]\
  }\
  \],\
  \"skills\": \[\
  { \"id\": \"sk_1\", \"name\": \"React\" },\
  { \"id\": \"sk_2\", \"name\": \"Node.js\" },\
  { \"id\": \"sk_3\", \"name\": \"TypeScript\" }\
  \],\
  \"previousClients\": \[\
  {\
  \"id\": \"cl_1\",\
  \"name\": \"Acme Corp\",\
  \"logoUrl\": \"https://cdn.example.com/logos/acme.png\",\
  \"summary\": \"Led checkout funnel redesign, improving conversion by
  18%.\"\
  }\
  \],\
  \"affiliatedTeams\": \[\
  {\
  \"id\": \"team_1\",\
  \"name\": \"Growth Squad\",\
  \"location\": \"Remote\",\
  \"time\": \"2023-Present\"\
  }\
  \],\
  \"portfolioUrl\": \"https://ava.dev\",\
  \"githubUrl\": \"https://github.com/ava\",\
  \"linkedinUrl\": \"https://www.linkedin.com/in/ava-nguyen\",\
  \"avatarUrl\": \"https://cdn.example.com/avatars/tal_12345.png\",\
  \"rating\": 4.9,\
  \"isActive\": true,\
  \"createdAt\": \"2025-10-10T12:30:00.000Z\",\
  \"updatedAt\": \"2025-10-10T12:30:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

#### 

**Common Errors**

- 401 Unauthorized -- missing or invalid token.

- 404 Not Found -- profile does not exist or is soft-deleted/hidden.

### **4.3 Update Talent Profile**

**Method & URL**

PUT /v1/talent/{talentId}

**Purpose\**
Update an existing talent profile when the user edits their information
or operations needs to correct data. It supports both simple scalar
changes (location, availability) and more complex updates (bio,
industries, preferences, links). Clients can send partial updates;
fields not included remain unchanged.

**Used in UI / Systems**

- Talent "Edit profile" screens.

- Back-office tools where admins adjust profile information.

**Auth**

- Authorization: Bearer \<token\> -- required; caller must own the
  profile or have admin rights.

**Path Params**

- talentId *(string, required)* -- ID of profile to update.

**Headers**

- Content-Type: application/json for JSON-only updates.

- multipart/form-data when updating avatar.

#### **Request Body**

> All fields are optional; send only the ones you want to change.

**From UpdateTalentDto**

- profileURL *(string)\*

- firstName *(string)\*

- lastName *(string)\*

- userName *(string)* -- note spelling.

- location *(string)\*

- languages *(string)* -- replaces language string.

- recentJobTitle *(string)\*

- industriesWorkedIn *(string)\*

- isStudent *(boolean)\*

- availability *(string enum)\*

- lookingToWorkWith *(string\[\])\*

- projectTypes *(string\[\])\*

**Extended fields (design )**

- bio *(string)\*

- role *(string)\*

- experience *(number)\*

- hourlyRate *(number)\*

- timezone *(string)\*

- portfolioUrl, websiteUrl, githubUrl, linkedinUrl, dribbbleUrl,
  behanceUrl *(string)\*

- customAvailability *(CustomAvailability\[\])* -- if you extend the DTO
  to support it.

**Media**

- avatar *(file)* -- if sent via multipart.

#### **Sample Request (JSON)**

  -----------------------------------------------------------------------
  const res = await fetch(\
  \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/talent/tal_12345\`,\
  {\
  method: \"PUT\",\
  headers: {\
  \"Content-Type\": \"application/json\",\
  Authorization: \`Bearer \${token}\`\
  },\
  body: JSON.stringify({\
  profileURL: \"/talent/ava-nguyen\",\
  firstName: \"Ava\",\
  lastName: \"Nguyen\",\
  userName: \"ava-nguyen\",\
  location: \"San Francisco, USA\",\
  languages: \"English, Spanish\",\
  recentJobTitle: \"Staff Full-Stack Engineer\",\
  industriesWorkedIn: \"Fintech, SaaS, DevTools\",\
  bio: \"Staff engineer focused on platform and developer
  experience\...\",\
  availability: \"PART_TIME\",\
  projectTypes: \[\"Architecture review\", \"Platform modernization\"\],\
  lookingToWorkWith: \[\"product-led teams\"\],\
  timezone: \"America/Los_Angeles\",\
  hourlyRate: 150,\
  portfolioUrl: \"https://ava.dev\"\
  })\
  }\
  );\
  \
  if (!res.ok) throw new Error((await res.json()).message);\
  const updated = await res.json();
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Sample Response (200 OK)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"tal_12345\",\
  \"userId\": \"usr_789\",\
  \"firstName\": \"Ava\",\
  \"lastName\": \"Nguyen\",\
  \"username\": \"ava-nguyen\",\
  \"profileURL\": \"/talent/ava-nguyen\",\
  \"recentJobTitle\": \"Staff Full-Stack Engineer\",\
  \"role\": \"fullstack-engineer\",\
  \"experience\": 7,\
  \"hourlyRate\": 150,\
  \"location\": \"San Francisco, USA\",\
  \"languages\": \"English, Spanish\",\
  \"timezone\": \"America/Los_Angeles\",\
  \"bio\": \"Staff engineer focused on platform and developer
  experience\...\",\
  \"industriesWorkedIn\": \"Fintech, SaaS, DevTools\",\
  \"lookingToWorkWith\": \[\
  \"product-led teams\"\
  \],\
  \"projectTypes\": \[\
  \"Architecture review\",\
  \"Platform modernization\"\
  \],\
  \"isStudent\": false,\
  \"availability\": \"PART_TIME\",\
  \"customAvailability\": \[\
  {\
  \"day\": \"MONDAY\",\
  \"times\": \[\
  {\
  \"startTime\": \"09:00\",\
  \"startTimeDayPeriod\": \"AM\",\
  \"endTime\": \"01:00\",\
  \"endTimeDayPeriod\": \"PM\"\
  }\
  \]\
  }\
  \],\
  \"skills\": \[\
  { \"id\": \"sk_1\", \"name\": \"React\" },\
  { \"id\": \"sk_2\", \"name\": \"Node.js\" },\
  { \"id\": \"sk_3\", \"name\": \"TypeScript\" }\
  \],\
  \"previousClients\": \[\
  {\
  \"id\": \"cl_1\",\
  \"name\": \"Acme Corp\",\
  \"logoUrl\": \"https://cdn.example.com/logos/acme.png\",\
  \"summary\": \"Redesigned checkout funnel; +18% conversion.\"\
  }\
  \],\
  \"affiliatedTeams\": \[\
  {\
  \"id\": \"team_1\",\
  \"name\": \"Growth Squad\",\
  \"location\": \"Remote\",\
  \"time\": \"2023-Present\"\
  }\
  \],\
  \"portfolioUrl\": \"https://ava.dev\",\
  \"websiteUrl\": null,\
  \"githubUrl\": \"https://github.com/ava\",\
  \"linkedinUrl\": \"https://www.linkedin.com/in/ava-nguyen\",\
  \"dribbbleUrl\": null,\
  \"behanceUrl\": null,\
  \"avatarUrl\": \"https://cdn.example.com/avatars/tal_12345.png\",\
  \"rating\": 4.9,\
  \"isActive\": true,\
  \"createdAt\": \"2025-10-10T12:30:00.000Z\",\
  \"updatedAt\": \"2025-10-12T09:15:00.000Z\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- 400 Bad Request -- invalid field values.

- 401 Unauthorized -- missing or invalid token.

- 403 Forbidden -- user not allowed to update this profile.

- 404 Not Found -- profile not found.

### **4.4 Soft Delete Talent Profile**

**Method & URL**

DELETE /v1/talent/{talentId}

**Purpose\**
Soft-deactivate a talent profile so it no longer appears in search,
matching, or public views while preserving all data (bio, industries,
experience, previous clients, affiliated teams, etc.). This is used when
a talent wants to pause or close their profile, or when operations
removes a profile from circulation without destroying historical
records.

**Used in UI / Systems**

- "Deactivate my profile" in account settings.

- Admin moderation tooling.

**Auth**

- Authorization: Bearer \<token\> -- owner or admin only.

**Path Params**

- talentId *(string, required)\*

**Request Body**

- None.

#### **Sample Request**

  -----------------------------------------------------------------------
  DELETE /v1/talent/tal_12345 HTTP/1.1\
  Host: api.example.com\
  Authorization: Bearer \<token\>
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

#### **Sample Response (200 OK)**

  -----------------------------------------------------------------------
  {\
  \"id\": \"tal_12345\",\
  \"isActive\": false,\
  \"deletedAt\": \"2025-10-15T18:20:00.000Z\",\
  \"message\": \"Talent profile soft-deleted successfully.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Errors**

- 401 Unauthorized

- 403 Forbidden

- 404 Not Found

## **5. Child Resource Endpoints (Overview)**

These endpoints can be used to **incrementally build** the sections
shown on the Talent Profile (skills, experience, etc.). Exact URLs may
differ in your codebase; adjust the paths if needed, but keep the DTO
fields and shapes as documented.

### **5.1 Skills**

**Create Skill\**
POST /v1/talent/skills

Body:

  -----------------------------------------------------------------------
  {\
  \"name\": \"React\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Response:

  -----------------------------------------------------------------------
  {\
  \"id\": \"sk_1\",\
  \"name\": \"React\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Delete Skill\**
DELETE /v1/talent/skills/{skillId} -- removes a skill from the profile.

### **5.2 Languages**

**Create Language\**
POST /v1/talent/languages

  -----------------------------------------------------------------------
  {\
  \"name\": \"English\",\
  \"fluency\": \"Native\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Update Language\**
PUT /v1/talent/languages/{languageId} -- same fields, all optional.

### **5.3 Work Experience**

**Create Experience\**
POST /v1/talent/work-experiences

  -----------------------------------------------------------------------
  {\
  \"role\": \"Senior Engineer\",\
  \"company\": \"Acme Corp\",\
  \"startDate\": \"2022-01-01\",\
  \"endDate\": null,\
  \"summary\": \"Led checkout refactor and platform migration.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Update Experience\**
PUT /v1/talent/work-experiences/{experienceId} -- same fields, optional.

### **5.4 Education**

**Create Education\**
POST /v1/talent/education

  -----------------------------------------------------------------------
  {\
  \"degree\": \"BSc Computer Science\",\
  \"institution\": \"XYZ University\",\
  \"year\": 2021,\
  \"fieldOfStudy\": \"Computer Science\",\
  \"startDate\": \"2017-09-01\",\
  \"endDate\": \"2021-06-01\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **5.5 Certifications**

**Create Certification\**
POST /v1/talent/certifications

  -----------------------------------------------------------------------
  {\
  \"name\": \"AWS Certified Solutions Architect\",\
  \"issuer\": \"Amazon\",\
  \"year\": 2023\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **5.6 Affiliated Teams**

**Create Affiliated Team\**
POST /v1/talent/affiliated-teams

  -----------------------------------------------------------------------
  {\
  \"name\": \"Growth Squad\",\
  \"location\": \"Remote\",\
  \"time\": \"2023-Present\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **5.7 Previous Clients** 

**Create Previous Client\**
POST /v1/talent/previous-clients

  -----------------------------------------------------------------------
  {\
  \"name\": \"Acme Corp\",\
  \"logoUrl\": \"https://cdn.example.com/logos/acme.png\",\
  \"summary\": \"Redesigned checkout funnel; +18% conversion.\"\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
