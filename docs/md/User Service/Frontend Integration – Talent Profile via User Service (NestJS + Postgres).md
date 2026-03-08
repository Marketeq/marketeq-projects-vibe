# **Frontend Integration -- Talent Profile via User Service (NestJS + Postgres)**

### **📌 Purpose**

This document explains how the frontend (Next.js) integrates with the
backend (NestJS) through the user-service to retrieve read-only **Talent
Profile** data from the Postgres database.

### **🧠 Ownership Scope**

This doc only covers the **user-service**, which owns and exposes the
following data:

  -----------------------------------------------------------------
  **Field Name**       **Description**                 **Type**
  -------------------- ------------------------------- ------------
  username             Public username (used in URL)   string

  display_name         Full name or alias for public   string
                       display                         

  headline             e.g. "Expert React Developer"   string

  experience_years     Total experience (e.g. 10       number
                       years)                          

  location             City or country                 string

  timezone             IANA string (e.g. Asia/Kolkata) string

  availability         Availability block (e.g. 40     string
                       hrs/week)                       

  rate_min, rate_max   Hourly rate range               number

  overview             Rich text summary               string

  skills               Tag list                        string\[\]

  industry_expertise   Tag list                        string\[\]

  certifications       List of certs (name, issuer,    object\[\]
                       year)                           

  languages            Name + fluency level            object\[\]

  education            Degree, institution, graduation object\[\]
                       year                            

  work_experience      Role, company, start/end dates, object\[\]
                       summary                         
  -----------------------------------------------------------------

❗️**Not included**: Reviews, projects, offers, services, metrics ---
those are fetched from other microservices.

### **🔗 API Endpoint (user-service)**

GET /api/talent-profiles/:username

This endpoint should:

- Lookup username

- Join all relations (skills, languages, certifications, etc.)

- Return full profile DTO

### **✅ DTO Format (TalentProfileResponseDto)**

export class TalentProfileResponseDto {

username: string;

display_name: string;

headline: string;

experience_years: number;

location: string;

timezone: string;

availability: string;

rate_min: number;

rate_max: number;

overview: string;

skills: string\[\];

industry_expertise: string\[\];

certifications: CertificationDto\[\];

languages: LanguageDto\[\];

education: EducationDto\[\];

work_experience: WorkExperienceDto\[\];

}

### **🚀 Frontend Integration Example (Next.js)**

// utils/api.ts

export async function fetchTalentProfile(username: string, token?:
string) {

const res = await fetch(\`/api/talent-profiles/\${username}\`, {

headers: {

\...(token && { Authorization: \`Bearer \${token}\` })

}

});

if (!res.ok) throw new Error(\'Profile not found\');

return await res.json();

}

### **🧭 External Fields and Their Responsible Services**

The following fields are **not stored in the user-service** and must be
queried from their respective microservices:

  ------------------------------------------------------------------------------
  **Field**               **Responsible     **Notes**
                          Service**         
  ----------------------- ----------------- ------------------------------------
  reviews                 review-service    Linked to talent; each review
                                            includes rating + feedback

  portfolio_projects      user-service      Considered curated case studies
                                            authored by the talent

  offers, services        listing-service   Not owned by user-service; synced to
                                            the talent profile display

  client_success_rating   review-service    Derived from all reviews tied to the
                                            talent's completed engagements

  repeat_hire_rate        review-service    Based on client behavior, tracked
                                            through historical reviews

  response_time           messaging service Calculated using timestamp deltas
                                            from the chat API
  ------------------------------------------------------------------------------
