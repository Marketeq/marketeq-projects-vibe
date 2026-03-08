# **📄 User Service API -- Talent Profile Endpoint Documentation (v1)**

**Scope:** API endpoints exclusively for managing and retrieving Talent
Profile data.\
**Excludes:** Listings, Reviews, Messaging, or any other service (but
includes instructions to access related data from those microservices).

## **✅ 1. Overview**

This API handles talent profile CRUD operations (Create, Read, Update)
for the **User Service**. All profile data shown on the frontend design
is either stored in this service or referenced via microservice calls
(e.g. listings, reviews).

## **📦 2. Base URL**

Assume you\'re using NestJS with a global prefix:

https://api.marketeq.app/api/v1/users



## **🔐 3. Auth Requirements**

All endpoints require the following:

- **JWT Access Token** in the Authorization header:\
  Authorization: Bearer \<token\>

- Token must be issued by the auth-service after login/registration.

## **🧬 4. Talent Profile Data Model**

All of the following fields are managed **within the user-service**.

  ----------------------------------------------------------------------------------
  **Field Name**        **Type**     **Editable**   **Description**
  --------------------- ------------ -------------- --------------------------------
  id                    UUID         ❌             Auto-generated user ID

  username              String       ✅             Unique slug/handle

  email                 String       ❌             Login credential

  userType              Enum         ❌             CLIENT or TALENT

  fullName              String       ✅             Display name

  title                 String       ✅             e.g. \"Expert React Developer\"

  bio                   Text         ✅             Profile overview

  location              String       ✅             City, Region, Country

  timeZone              String       ✅             Timezone (e.g. Asia/Kolkata)

  languages             \[String\]   ✅             Spoken languages

  certifications        \[String\]   ✅             Cert titles

  industryExpertise     \[String\]   ✅             Industry tags (e.g. \"Fintech\")

  skills                \[String\]   ✅             Auto-complete tag list

  availability          Enum         ✅             FULL_TIME, PART_TIME, FREELANCE,
                                                    etc.

  hourlyRateMin         Number       ✅             e.g. 85

  hourlyRateMax         Number       ✅             e.g. 120

  memberSince           Date         ❌             Auto-calculated on creation

  profileImageUrl       String (URL) ✅             S3 or CDN link

  portfolio             \[Object\]   ✅             See GET /portfolio below

  education             \[Object\]   ✅             e.g. school, degree, year

  workExperience        \[Object\]   ✅             e.g. title, company, start/end

  responseTime          Number       ❌             Fetched from messaging-service

  repeatHireRate        Number       ❌             \% from
                                                    review-service/project-service

  clientSuccessRating   Number       ❌             \% from review-service

  totalProjects         Number       ❌             Aggregated from listing-service

  status                String       ✅             ACTIVE, INACTIVE, BLOCKED
  ----------------------------------------------------------------------------------

## **📮 5. API Endpoints**

### **🔍 GET /:username**

Returns the **full public profile** data.

GET /api/v1/users/dheerajnagdali

Returns:

{

\"id\": \"uuid\",

\"username\": \"dheerajnagdali\",

\"fullName\": \"Dheeraj Nagdali\",

\"title\": \"Expert React Developer\",

\"bio\": \"\...\",

\"location\": \"Nainital, Uttarakhand, India\",

\...

}



### **📝 PUT /:id**

Update editable profile fields.

PUT /api/v1/users/:id

Authorization: Bearer \<JWT\>



{

\"fullName\": \"Updated Name\",

\"bio\": \"\...\",

\"skills\": \[\"React\", \"TypeScript\", \"Next.js\"\],

\...

}



### **📂 GET /:username/portfolio**

Returns all **portfolio case studies** owned by user.

- Stored within user-service

- Can reference S3/CDN links for screenshots

GET /api/v1/users/dheerajnagdali/portfolio



### **➕ POST /:id/portfolio**

Add a new portfolio project.

### **📘 GET /:username/education**

Returns array of education objects.

### **🧑‍💼 GET /:username/work**

Returns array of work experience.

## **🔄 6. Referenced External Services**

The following fields must be fetched from **other microservices**:

  **Data**                **Service**                          **Notes**
  ----------------------- ------------------------------------ -------------------------------
  Reviews                 review-service                       /reviews/:userId
  Listings/Projects       listing-service                      /listings?userId=
  Client Success Rating   review-service                       Compute based on 5-star ratio
  Repeat Hire Rate        review-service or contract-service   TBD
  Response Time           messaging-service                    Calculate average response

> 🔗 Each service must expose its own public API endpoints. Use NestJS
> Gateway or API Gateway pattern if required for performance/security.

## **🔐 7. Permissions**

  ----------------------------------
  **Role**   **Read      **Edit
             Profile**   Profile**
  ---------- ----------- -----------
  Admin      ✅          ✅

  Talent     ✅ (self)   ✅ (self)

  Client     ✅          ❌
  ----------------------------------
