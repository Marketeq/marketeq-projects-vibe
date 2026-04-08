**CS-04 — REST API Reference**

Service: cms-service \| Powered by Payload CMS \| Base URL:
http://cms-service:3020

*Purpose: All REST endpoints exposed by cms-service. Covers
authentication methods, query parameters, response shapes, pagination,
and error formats. Prerequisites: CS-02 (bootstrapping), CS-03
(collections & globals).*

**1. Authentication**

cms-service uses two authentication methods depending on the caller:

**API Key (internal service-to-service)**

Used by other microservices to call CMS index endpoints. Pass the
CMS_API_KEY as a header:

> Authorization: API-Key \<CMS_API_KEY\>

**Payload JWT (admin panel users)**

Human admin panel sessions. Obtained by posting credentials to the login
endpoint:

> POST /api/users/login
>
> { "email": "admin@marketeq.com", "password": "..." }
>
> \# Returns: { "token": "\<jwt\>", "user": { ... } }
>
> \# Use in subsequent requests:
>
> Authorization: Bearer \<jwt\>

**2. Standard Response Shape**

**Collection list response:**

> {
>
> "docs": \[...\],
>
> "totalDocs": 42,
>
> "limit": 10,
>
> "page": 1,
>
> "totalPages": 5,
>
> "hasNextPage": true,
>
> "hasPrevPage": false
>
> }

**Single document response:**

> { "id": "uuid", "slug": "...", ... }

**Error response:**

> {
>
> "errors": \[
>
> { "message": "Human-readable error description" }
>
> \]
>
> }

**3. Query Parameters**

|  |  |  |
|----|----|----|
| **Parameter** | **Example** | **Description** |
| **depth** | depth=2 | Depth of relationship population. depth=0 returns IDs only. depth=1 populates one level of relationships. depth=2 populates two levels. Use depth=2 for categories cold-start hydration. |
| **limit** | limit=50 | Number of documents per page. Default: 10. Maximum: 1000. |
| **page** | page=2 | Page number for pagination. Combine with limit for full collection traversal. |
| **where** | where\[status\]\[equals\]=published | Filter documents. Supports equals, not_equals, in, not_in, exists, like, contains. Chain multiple conditions for complex filters. |
| **sort** | sort=createdAt | Sort field. Prefix with - for descending: sort=-createdAt. |
| **select** | select\[title\]=true | Field projection. Return only specified fields. |

**4. Endpoints — Collections**

**4.1 Categories**

> **GET /api/categories**

- Auth: API-Key (internal services) or public (read)

- Primary consumer: listings-service (dropdowns, Algolia facet seeding),
  category-service (cold-start hydration)

> \# Cold-start hydration — page through all categories
>
> GET /api/categories?depth=2&limit=1000&page=1
>
> Authorization: API-Key \<CMS_API_KEY\>
>
> \# Filter active categories only
>
> GET /api/categories?where\[status\]\[equals\]=active&depth=1

**4.2 Listings**

> **GET /api/listings**

- Auth: public (published only)

- Primary consumer: listings-service (featured sync)

> \# Featured listings
>
> GET
> /api/listings?where\[featured\]\[equals\]=true&where\[status\]\[equals\]=published

**4.3 Feature Flags**

> **GET /api/feature-flags**

- Auth: API-Key required

- Primary consumer: all services — cached in Redis (TTL 60s) per service

- Webhook-driven cache invalidation fires on every flag change

> GET /api/feature-flags
>
> Authorization: API-Key \<CMS_API_KEY\>
>
> \# Response: { "docs": \[{ "key": "new_checkout", "enabled": true,
> "rolloutPercentage": 100 }, ...\] }

**4.4 Announcements**

> **GET /api/announcements**

- Auth: API-Key

- Primary consumer: notification-service — published announcements
  pushed via Ably

> GET
> /api/announcements?where\[status\]\[equals\]=published&sort=-priority

**4.5 Blog Posts**

> **GET /api/blog-posts**
>
> GET
> /api/blog-posts?where\[status\]\[equals\]=published&sort=-publishedAt&depth=1

**4.6 Help Articles**

> **GET /api/help-articles**
>
> GET /api/help-articles?where\[status\]\[equals\]=published&depth=1

**5. Endpoints — Globals**

**5.1 Site Settings**

> GET /api/globals/site-settings
>
> Authorization: API-Key \<CMS_API_KEY\>
>
> \# Response: { "platformName": "Marketeq", "supportEmail": "...",
> "socialLinks": {...}, ... }

**5.2 Homepage Banner**

> GET /api/globals/homepage-banner
>
> \# Response: { "enabled": true, "message": "...", "ctaLabel": "...",
> "expiresAt": "2025-12-31T23:59:59Z", ... }

**6. Endpoints — Users (Admin Login)**

> **POST /api/users/login**
>
> POST /api/users/login
>
> Content-Type: application/json
>
> { "email": "admin@marketeq.com", "password": "..." }
>
> \# Success 200: { "token": "\<jwt\>", "user": { "id": "...", "role":
> "admin", ... } }
>
> \# Failure 401: { "errors": \[{ "message": "The email or password
> provided is incorrect." }\] }

**7. HTTP Status Codes**

|  |  |
|----|----|
| **Code** | **Meaning** |
| **200** | Success. Document(s) returned. |
| **201** | Created. New document created successfully. |
| **400** | Bad Request. Validation error — missing required field, invalid value, or constraint violation. |
| **401** | Unauthorized. No auth header provided or JWT expired. |
| **403** | Forbidden. Authenticated but insufficient role for this operation. |
| **404** | Not Found. Document ID does not exist. |
| **409** | Conflict. Unique constraint violation (duplicate slug, sourceId, key, etc.). |
| **500** | Internal Server Error. Unexpected failure — check cms-service logs. |
