Marketeq Home Page

Frontend API Integration Guide

Data fetching patterns, SSR integration, A/B testing mechanics, and API
contract for frontend consumers

April 5, 2026

Backend API Contract for Frontend Consumption

1\. API Contract Summary

-   Endpoint: GET /api/homepage

-   The backend serves a single JSON payload containing ALL homepage
    data

-   The frontend makes ONE API call and renders the entire homepage from
    the response

-   No secondary API calls needed for homepage content (wallet, profile,
    auth come from their own services via the global nav)

2\. Data Fetching Pattern

2.1 Server-Side Rendering (SSR)

-   The frontend should fetch GET /api/homepage during SSR (server-side)

-   The request MUST forward the mktq_hp_variant cookie from the browser
    to the API

SSR fetch example (generic, no framework-specific code):

const response = await fetch(\`\${API_BASE_URL}/api/homepage\`, {
headers: { Cookie: \`mktq_hp_variant=\${variantFromBrowserCookie}\`, },
}); const homepage: HomepagePayload = await response.json();

2.2 Cookie Forwarding for A/B Testing

-   The mktq_hp_variant cookie is set by the experimentation platform
    (not by the backend)

-   During SSR, the server must read this cookie from the incoming
    browser request and forward it to the API gateway

-   If the cookie is missing, the default homepage is served

2.3 Error Handling

HTTP Status & Frontend Behavior:

  ----------------------------------- -----------------------------------
  HTTP Status                         Frontend Behavior

  200 OK                              Render homepage normally

  404 Not Found                       Show \"page not available\" error
                                      page with link to category browse

  403 Forbidden                       Only occurs in preview mode ---
                                      show \"access denied\"

  503 Service Unavailable             Show cached version if available,
                                      otherwise generic error page with
                                      retry
  ----------------------------------- -----------------------------------

3\. Response Payload Reference

Full field-by-field documentation of HomepagePayload type:

3.1 Top-Level Fields

-   title: string --- internal, not displayed

-   slug: string --- URL identifier

-   status: \"active\" \| \"testing\"

-   hero: object or null

-   banner: object or null

-   sections: array

-   popularTabs: array

-   moreCategoriesList: array

-   talentNetworkCta: object or null

-   footerNav: object or null

-   seo: object or null

3.2 Hero Object

-   headline, subheadline, backgroundImage (R2 URL or null), ctaLabel,
    ctaUrl

-   If hero is null: no hero section

3.3 Banner Object

-   enabled, message, ctaLabel, ctaUrl, expiresAt (ISO date), bannerType

-   If banner is null or enabled=false: no banner

-   Frontend should check expiresAt client-side (banner may have expired
    between cache write and render)

3.4 Sections Array

-   Each section: key, title, subtitle?, ctaLabel?, ctaUrl?, blocks\[\]

-   Sections are ordered by the CMS --- render in array order

-   Empty sections are already filtered out by the backend

3.5 Blocks Array

-   Each block: key, type (\"grid\" \| \"carousel\"), entity, items\[\],
    pagination?

-   type determines rendering: grid = static grid, carousel = scrollable
    with pagination info

-   pagination is only present when type=carousel

-   items is an array of listing card objects (see Section 4)

3.6 Popular Tabs

-   Array of CategoryRef: uuid, name, slug

-   Used for filter tabs in the \"Most Popular\" section

3.7 More Categories List

-   Array of CategoryRef: uuid, name, slug, iconUrl?

-   Rendered as a tile grid of category links

3.8 SEO Object

-   metaTitle, metaDescription, canonical, ogImage, noindex

-   Frontend should use these to set document head meta tags

4\. Listing Card Data Shapes

The backend returns entity-specific fields for each card type:

4.1 Project Card

  ----------------------------------- -----------------------------------
  Field                               Type

  uuid                                string

  title                               string

  slug                                string

  description                         string \| null

  thumbnailUrl                        string \| null

  budget                              number \| null

  skillTags                           string\[\]

  status                              \"open\" \| \"in_progress\" \|
                                      \"closed\"

  createdAt                           ISO date string
  ----------------------------------- -----------------------------------

4.2 Service Card

  ----------------------------------- -----------------------------------
  Field                               Type

  uuid                                string

  title                               string

  slug                                string

  description                         string \| null

  thumbnailUrl                        string \| null

  pricing                             object { base: number, currency:
                                      string }

  category                            string

  rating                              number \| null

  reviewCount                         number
  ----------------------------------- -----------------------------------

4.3 Team Card

  ----------------------------------- -----------------------------------
  Field                               Type

  uuid                                string

  name                                string

  slug                                string

  description                         string \| null

  logoUrl                             string \| null

  memberCount                         number

  expertise                           string\[\]

  verified                            boolean
  ----------------------------------- -----------------------------------

4.4 Talent Card

  ----------------------------------- -----------------------------------
  Field                               Type

  uuid                                string

  name                                string

  slug                                string

  title                               string

  avatarUrl                           string \| null

  hourlyRate                          number \| null

  expertise                           string\[\]

  availability                        \"available\" \| \"unavailable\" \|
                                      \"limited\"

  rating                              number \| null
  ----------------------------------- -----------------------------------

5\. A/B Testing Mechanics

5.1 How Variants Work

-   The experimentation platform assigns users to test groups

-   It sets the mktq_hp_variant cookie (e.g., \"experiment-a\",
    \"control\")

-   The backend reads this cookie and resolves the matching homepage
    document

-   If a homepage entry exists with status=testing and testGroup
    matching the cookie value, that entry is served

-   If no match found, the default (isDefault=true, status=active)
    homepage is served

5.2 Backend Resolution Logic

Read mktq_hp_variant cookie

Fetch all homepage documents from CMS

If variant cookie exists: find document where status=testing AND
testGroup=variant

If found: return that document

If not found: return document where isDefault=true AND status=active

5.3 Cache Isolation

-   Each variant gets its own Redis cache key (hp:home:experiment-a vs
    hp:home:control)

-   Invalidation clears ALL variants for a slug (hp:home:\*)

-   This means editing the CMS homepage invalidates all A/B variants

6\. Preview Mode

6.1 How to Use

-   Add ?preview=1 to the URL

-   Include x-preview-token header with the shared secret

-   Preview bypasses cache entirely --- always returns fresh data

-   Preview can show draft homepage entries (not just active/testing)

6.2 Security

-   Preview token must match PREVIEW_SECRET env var

-   If token is missing or wrong: 403 Forbidden

-   Preview mode should only be available to CMS admins (frontend should
    gate the UI)

7\. Null Handling Guide

Frontend null/undefined checks and fallback behavior:

  ------------------------------- ----------------------- -----------------------
  Field                           Can Be Null?            Frontend Action

  hero                            Yes                     Don\'t render hero
                                                          section

  banner                          Yes                     Don\'t render banner

  sections                        No (always array, may   Render nothing if empty
                                  be empty)               

  sections\[\].blocks\[\].items   No (always array)       If empty, block is
                                                          already filtered out

  popularTabs                     No (always array)       If empty, don\'t render
                                                          tabs

  moreCategoriesList              No (always array)       If empty, don\'t render
                                                          section

  talentNetworkCta                Yes                     Don\'t render CTA
                                                          section

  footerNav                       Yes                     Use fallback static
                                                          footer

  seo                             Yes                     Use default meta tags
  ------------------------------- ----------------------- -----------------------

8\. Performance Expectations

-   Cache hit response time: \<50ms

-   Cache miss response time: 200-400ms

-   Payload size: 50-200KB depending on sections and items

-   Recommended: Use stale-while-revalidate in frontend for optimal
    perceived performance

-   The backend handles caching --- frontend does not need its own cache
    layer for this endpoint

---

End of Document
