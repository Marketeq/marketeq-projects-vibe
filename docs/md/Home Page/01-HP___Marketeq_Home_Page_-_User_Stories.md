**Marketeq Home Page**

User Stories

*Implementation-ready user stories derived from the Home Page design
PDF, CMS Service, Category Service, and Category Pages documentation*

Document Version: 1.0 \| Date: April 4, 2026

Scope: Home Page Service Only

**Table of Contents**

**1. Homepage Collection and Configuration**

User stories for the Payload CMS Homepages collection, A/B testing, and
the homepage API endpoint. The home page is a collection of landing
pages in Payload CMS. One entry is set as the default; others can be
used for A/B testing. Each homepage entry defines an ordered array of
section configurations, each backed by a Tax Group.

**HP-001 Homepage Collection in Payload CMS**

*As a platform admin, I want to create, edit, and manage multiple
homepage entries in Payload CMS, so that I can build and test new
homepage layouts without affecting the live experience.*

**Acceptance Criteria:**

-   A Homepages collection exists in Payload CMS with the following
    fields: title (text, required), slug (text, unique, indexed), status
    (select: draft / active / testing / archived, default: draft),
    isDefault (boolean, default: false), testGroup (text, optional ---
    A/B test variant identifier), sections (ordered JSON array of
    section configurations referencing Tax Group rules), hero (group:
    headline, subheadline, backgroundImage, ctaLabel, ctaUrl), seo
    (group: metaTitle, metaDescription, ogImage), createdAt (date),
    updatedAt (date).

-   Only one homepage can have isDefault: true at any time. Setting a
    new homepage as default automatically unsets the previous default.

-   Homepages with status 'draft' or 'archived' are not served to any
    user.

-   Homepages with status 'active' and isDefault: true are served as the
    live homepage.

-   Homepages with status 'testing' are served only to users assigned to
    the matching testGroup via cookie or header.

-   Access: Admin and Developer roles can create, read, update, and
    delete. Content Editor can read and update. Author has no access.

**Notes:**

-   This collection replaces the existing HomepageBanner global for hero
    content. The HomepageBanner global can remain for optional
    notification-bar overlays (info/promo/warning banners) that sit
    above the hero.

**HP-002 Set Default Homepage**

*As a platform admin, I want to designate one homepage entry as the
default, so that all users who are not part of an A/B test see a
consistent live homepage.*

**Acceptance Criteria:**

-   A 'Set as Default' action is available on each homepage entry in the
    Payload admin panel.

-   Activating this action sets isDefault: true on the selected entry,
    sets its status to 'active', and sets isDefault: false on any
    previously default entry.

-   The API immediately begins serving the new default homepage after
    the change is saved.

-   A Payload afterChange hook enforces the single-default constraint at
    the database level.

**HP-003 A/B Test Homepage Variants**

*As a platform admin, I want to run multiple homepage variants
simultaneously for user testing, so that I can compare performance and
determine which layout drives better engagement.*

**Acceptance Criteria:**

-   Each homepage entry has an optional testGroup field (e.g.,
    'variant-a', 'variant-b').

-   Homepages with status 'testing' are eligible for A/B distribution.

-   The API checks for a variant assignment cookie (mktq_hp_variant) on
    incoming requests. If the cookie value matches a testGroup, that
    homepage variant is served.

-   If no cookie is present and A/B tests are active, the API assigns
    the user to a variant randomly (equal distribution), sets the
    cookie, and serves the assigned variant.

-   If no A/B tests are active, the default homepage is always served.

-   Test variant assignment is sticky per browser session via the
    cookie.

**Notes:**

-   Analytics and conversion tracking for A/B tests are out of scope for
    the home page service. The service only handles variant assignment
    and serving.

**HP-004 Homepage API Endpoint**

*As a frontend application, I want to fetch the complete homepage
payload in a single API call, so that the home page can be rendered
server-side with minimal round trips.*

**Acceptance Criteria:**

-   GET /api/homepage returns the full homepage payload for the
    active/default homepage.

-   GET /api/homepage?preview=1 with a valid x-preview-token header
    returns a draft or testing homepage for admin preview. Preview
    responses include noindex: true in the SEO object.

-   The response payload includes: homepage metadata (title, slug,
    status), hero (headline, subheadline, backgroundImage URL, ctaLabel,
    ctaUrl), sections (ordered array of assembled blocks, each with key,
    type, entity, items, pagination), seo (metaTitle, metaDescription,
    canonical, ogImage), footerNav (grouped navigation links from the
    CMS).

-   Each section in the payload is assembled using the existing Tax
    Group evaluator/assembler infrastructure from the category-pages
    module.

-   The endpoint resolves A/B test variants via the mktq_hp_variant
    cookie when applicable.

-   Returns 404 if no active/default homepage exists.

-   Response is cache-friendly with deterministic cache keys based on
    homepage slug and section hashes. Cache is invalidated via RabbitMQ
    event when the homepage entry is updated in Payload.

**Notes:**

-   This endpoint reuses the Assembler and EvaluatorFactory from the
    category-pages module. It does not duplicate evaluator logic.

**2. Hero Section**

User stories for the full-width promotional hero banner. Hero content is
static (not auto-selected) and managed by admins in Payload CMS as part
of each homepage entry.

**HP-005 Display Hero Banner**

*As a visitor, I want to see a prominent hero banner when I land on the
home page, so that I immediately understand the platform's value
proposition and can take action.*

**Acceptance Criteria:**

-   The hero section renders full-width below the navigation bar.

-   It displays the headline, subheadline, background image, and CTA
    button as defined in the active homepage entry's hero group.

-   All hero fields (headline, subheadline, backgroundImage, ctaLabel,
    ctaUrl) are served from the homepage API payload.

-   If any required hero field is missing (headline or ctaLabel), the
    hero section is not rendered.

**HP-006 Configure Hero Content in Payload CMS**

*As a platform admin, I want to edit the hero headline, subheadline,
background image, CTA label, and CTA destination for each homepage
entry, so that marketing can update the hero without a frontend deploy.*

**Acceptance Criteria:**

-   The hero group on the Homepages collection includes: headline (text,
    required), subheadline (textarea), backgroundImage (upload,
    relationTo: media), ctaLabel (text, required), ctaUrl (text,
    required).

-   Changes to hero content trigger a RabbitMQ event (homepage.saved)
    that invalidates the cached homepage payload.

-   Background images are served from Cloudflare R2 via the Media
    collection.

-   The admin can preview the hero before publishing by using the
    preview endpoint (HP-004).

**HP-007 Hero CTA Navigation**

*As a visitor, I want to click the hero CTA button and be taken to the
destination page, so that I can immediately engage with the promoted
content.*

**Acceptance Criteria:**

-   Clicking the CTA button navigates to the URL specified in the
    homepage entry's hero.ctaUrl field.

-   The ctaUrl supports both internal paths (e.g.,
    /c/ux-ui-design?kind=talent) and external URLs.

**3. Our Favorite Projects Section**

User stories for the editorially curated carousel. This section is
powered by a Tax Group with manual_enabled: true. Manually pinned items
appear first; rule-based items (fallback kind: top-rated) fill remaining
slots if insufficient manual selections exist.

**HP-008 Display Curated Favorite Projects Carousel**

*As a visitor, I want to see a horizontal carousel of editorially
selected projects labeled "Our Favorite Projects", so that I can
discover high-quality, hand-picked projects that the platform
recommends.*

**Acceptance Criteria:**

-   The section renders as a horizontal carousel with arrow navigation
    controls.

-   Each card displays: project thumbnail, project title, rating
    (numeric with review count), description (brief text), timeline
    (e.g., "Starting from 12 weeks"), budget (e.g., "\$50,000 budget"),
    and team member avatars with overflow count.

-   The carousel displays items in the order defined by the Tax Group:
    manually pinned items first (sorted by admin-defined order), then
    rule-based items to fill remaining slots.

-   The carousel guard applies: minimum content of 3x the visible grid
    size. If insufficient content, the section is suppressed entirely.

-   Maximum scroll depth is 10 pages (no endless scroll). After the cap,
    a terminal card links to the relevant category page.

-   Clicking any card navigates to that project's detail page.

**HP-009 Curate Favorite Projects in Payload CMS**

*As a platform admin, I want to manually select and order projects for
the "Our Favorite Projects" section, so that the home page showcases
projects chosen by the editorial team.*

**Acceptance Criteria:**

-   The "Our Favorite Projects" section is backed by a Tax Group with
    manual_enabled: true and entity: 'projects'.

-   When manual_enabled is true, the admin can select specific listing
    records and define their display order. These pinned items appear at
    the front of the carousel.

-   If the number of manually pinned items is less than the Tax Group's
    limit, the evaluator fills remaining slots using the fallback kind
    (top-rated) scoped to all categories (no category filter).

-   When manual_enabled is false (or toggled off), the section is 100%
    rule-driven using the configured kind.

-   Changes to the Tax Group trigger cache invalidation via the existing
    webhook/RabbitMQ pipeline.

**Notes:**

-   The 'featured' checkbox and featuredOrder field on the CMS Listings
    collection can be used as the mechanism for pinning items to this
    Tax Group. The admin marks listings as featured and sets
    featuredOrder; the evaluator queries for featured listings ordered
    by featuredOrder, then backfills with rule-based results.

**4. Newest Additions Section**

User stories for the grid section displaying the most recently published
listings. Powered by a Tax Group with kind: 'newest' and no category
filter.

**HP-010 Display Newest Additions Grid**

*As a visitor, I want to see the most recently added projects on the
platform, so that I can discover fresh inventory and new offerings.*

**Acceptance Criteria:**

-   The section renders as a multi-row grid (grid size defined by the
    Tax Group's gridSize field, default 3 columns).

-   Each card displays: project thumbnail, project title, description,
    timeline (e.g., "Starting at 2 weeks"), and price.

-   Price format depends on listing type: services display monthly price
    (e.g., "\$5,000/month"); projects display starting price (e.g.,
    "\$25,996"). Price data comes from listings-service.

-   Items are sorted by created_at descending (newest first).

-   The section is backed by a Tax Group with kind: 'newest', no
    category filter (platform-wide), and manual_enabled available for
    admin override.

-   If manual_enabled is true, pinned items appear first, then newest
    items fill remaining slots.

-   Clicking any card navigates to that listing's detail page.

**HP-011 View More --- Newest Additions**

*As a visitor, I want to click "View More" on the Newest Additions
section, so that I can see a full listing of new projects beyond what
fits in the home page grid.*

**Acceptance Criteria:**

-   A "View More" button appears below the grid.

-   Clicking "View More" navigates to the relevant category page showing
    all newest listings (e.g., /c/{category}?kind=show-all sorted by
    newest, or a dedicated newest landing page).

-   The "View More" button is visible only when the total number of
    results exceeds the Tax Group's display limit.

**Notes:**

-   The design shows a "View More" button, not an infinite-scroll
    pattern. This is a navigation action, not in-page pagination.

**5. Most Popular Projects Section**

User stories for the tabbed section displaying the most popular projects
across configurable category filters. This section introduces a new
evaluator kind ('most-popular') distinct from 'top-rated' and
'trending'.

**HP-012 Display Most Popular Projects with Category Tabs**

*As a visitor, I want to see the most popular projects on the platform,
filterable by category tabs, so that I can discover high-demand projects
across different verticals.*

**Acceptance Criteria:**

-   The section displays a grid of projects ranked by popularity (not
    rating, not recency).

-   Horizontal filter tabs appear above the grid. The first tab is
    always "View All" (no category filter). Additional tabs are specific
    L1 categories configured on the homepage entry in Payload CMS.

-   Selecting a tab re-fetches or filters the grid to show only popular
    projects within that category.

-   The active tab is visually distinct (filled background or underline
    accent).

-   Each card displays the same fields as Newest Additions: thumbnail,
    title, description, timeline, and price.

-   The grid layout and item count follow the Tax Group's gridSize and
    limit.

-   A "View More" button navigates to the corresponding category page
    for the selected tab.

**HP-013 Most Popular Evaluator Kind**

*As a home page service, I want to rank listings by popularity using an
engagement-driven formula distinct from top-rated and trending, so that
the "Most Popular Projects" section reflects actual user demand, not
just quality ratings.*

**Acceptance Criteria:**

-   A new evaluator kind 'most-popular' is added to the Rule Evaluator
    system alongside the existing 'top-rated', 'trending', and 'newest'
    kinds.

-   The most-popular blend weights: completion/order count (40%),
    views/impressions (35%), recency decay (15%), admin boost (10%).

-   The evaluator does not include rating in the blend --- that is the
    purpose of 'top-rated'.

-   The evaluator supports subtree scoping (category filter) and
    no-category mode (platform-wide).

-   Deduplication, fallback logic (drop tag filters → expand to parent
    level), and manual override behavior are identical to existing
    evaluators.

-   The kind is registered in the EvaluatorFactory and available for use
    in Tax Group rules.

**Notes:**

-   Blend weights are a CTO decision based on industry standard
    popularity ranking on marketplace platforms (Upwork, Fiverr,
    Toptal). Weights can be tuned post-launch based on data.

**HP-014 Configure Most Popular Tab Categories**

*As a platform admin, I want to select which L1 categories appear as
filter tabs in the Most Popular section, so that I can control which
verticals are highlighted on the home page without a frontend deploy.*

**Acceptance Criteria:**

-   Each homepage entry in Payload CMS includes a popularTabs field: an
    ordered relationship to the Categories collection (hasMany: true).

-   The selected categories appear as filter tabs in the order defined
    by the admin.

-   "View All" is always the first tab and is not part of the CMS
    configuration --- it is hardcoded as the default.

-   If no categories are selected in popularTabs, only the "View All"
    tab is shown.

-   Changing the popularTabs selection triggers cache invalidation for
    the homepage payload.

**HP-015 Manual Override for Most Popular**

*As a platform admin, I want to manually pin specific listings to the
front of the Most Popular section, so that I can promote strategic
listings regardless of their organic popularity score.*

**Acceptance Criteria:**

-   The Tax Group backing the Most Popular section supports
    manual_enabled: true.

-   When enabled, manually pinned items appear at the front of the list.
    Rule-based (most-popular evaluator) items fill remaining slots.

-   When disabled, the section is 100% driven by the most-popular
    evaluator.

-   This follows the same hybrid mode pattern defined in the Category
    Pages Product Overview: "Payload switch enables Manual Overrides;
    manual items pin to the front, AI/rule-based content fills remaining
    slots."

**6. Themed Carousel Sections**

User stories for the category-scoped horizontal carousels: Online Sales
Funnels, Customer Service Solutions, Marketing Automation Campaigns,
Cloud Software Applications, and Mobile Applications. Each carousel is
backed by a Tax Group tied to a specific category. The carousel vs. grid
rendering is design-driven per the Category Pages Product Overview.

**HP-016 Display Themed Carousel from Category Tax Group**

*As a visitor, I want to see horizontal carousels of projects and
services organized by solution theme, so that I can browse offerings
within specific domains without navigating away from the home page.*

**Acceptance Criteria:**

-   Each themed section renders as a horizontal carousel with a section
    title, subtitle, and a "View More" CTA.

-   The section pulls listings from the Tax Group associated with the
    corresponding category (e.g., the "Online Sales Funnels" section
    pulls from the Online Sales Funnels category's Tax Group).

-   The carousel displays 4 cards per visible row (design-driven).

-   Arrow navigation controls (left/right chevrons) enable horizontal
    scrolling.

-   If the design shows chevrons, the section renders as a carousel. If
    no chevrons are shown, it renders as a grid. (Per Product Overview:
    "if a section shows chevrons in the mock, we render a carousel;
    otherwise a grid.")

-   Carousel guard: minimum content of 3x the visible grid size. If
    insufficient content, the section is suppressed.

-   Maximum scroll depth: 10 pages. After the cap, a terminal card links
    to the category page.

-   Clicking any card navigates to that listing's detail page.

-   The "View More" CTA navigates to the corresponding category page
    (e.g., /c/online-sales-funnels).

**HP-017 Project Card Format (Default)**

*As a visitor, I want to see project-type listings displayed with budget
and timeline information, so that I can evaluate project scope and cost
at a glance.*

**Acceptance Criteria:**

-   Project cards display: thumbnail, title, rating (star rating with
    review count), description, timeline (e.g., "Starting from 12
    weeks"), budget (e.g., "\$50,000 budget"), and team member avatars
    with overflow count (e.g., "+5").

-   This card format renders when the listing's listingType is
    'project'.

-   Used by: Our Favorite Projects, Online Sales Funnels, Customer
    Service Solutions, Cloud Software Applications, and Mobile
    Applications carousels.

**HP-018 Service Card Format (Monthly Pricing)**

*As a visitor, I want to see service-type listings displayed with
monthly recurring pricing, so that I can evaluate ongoing service costs
at a glance.*

**Acceptance Criteria:**

-   Service cards display: thumbnail, category tag row (e.g., "Service
    \| Service \| Service"), title, rating (star rating with review
    count), description, monthly price (e.g., "\$5,000/month"), and team
    member avatars with overflow count.

-   This card format renders when the listing's listingType is
    'service'.

-   Used by: Marketing Automation Campaigns carousel.

-   The card format is determined by the listingType field on each
    listing, not by the section. If a carousel's Tax Group rule entity
    is 'services', service cards render. If entity is 'projects',
    project cards render.

**HP-019 Manual Override for Themed Carousels**

*As a platform admin, I want to manually pin specific listings to the
front of any themed carousel, so that I can promote strategic content in
each category section.*

**Acceptance Criteria:**

-   Each themed carousel's Tax Group supports manual_enabled: true.

-   Manually pinned items appear first in the carousel; rule-based items
    fill remaining slots.

-   This is the same hybrid mode used across all Tax Group-powered
    sections.

**HP-020 Configure Homepage Sections in Payload CMS**

*As a platform admin, I want to control which themed sections appear on
the home page, their order, and which categories they pull from, so that
I can customize the home page layout without a frontend deploy.*

**Acceptance Criteria:**

-   Each homepage entry's sections field is an ordered JSON array of
    section configurations.

-   Each section configuration references a Tax Group (by ID or category
    UUID + rule kind) and display metadata (section title, subtitle, CTA
    label, CTA URL).

-   Reordering sections in the array changes the display order on the
    home page.

-   Adding or removing a section configuration adds or removes that
    section from the home page.

-   Changes trigger cache invalidation via the homepage.saved RabbitMQ
    event.

**7. More Categories Section**

User stories for the category tile grid at the bottom of the main
content area.

**HP-021 Display More Categories Tiles**

*As a visitor, I want to see a grid of category tiles with illustrations
and browse buttons, so that I can explore the platform by technology or
discipline.*

**Acceptance Criteria:**

-   The section displays category tiles in a grid layout.

-   Each tile shows: category name, thematic illustration/icon (from the
    Categories collection's icon field in Payload), and a "Browse
    Projects" CTA button.

-   Clicking the "Browse Projects" button navigates to that category's
    L1 page (e.g., /c/cloud-security).

-   The visible categories and their display order are configured on the
    homepage entry in Payload CMS (a "moreCategoriesList" ordered
    relationship to the Categories collection).

-   Only published categories (published_in_marketplace: true) are
    rendered.

-   Illustration/icon assets are served from Cloudflare R2 via the Media
    collection.

**HP-022 Configure More Categories in Payload CMS**

*As a platform admin, I want to select which categories appear in the
More Categories section and in what order, so that I can feature
different categories on the home page based on business priorities.*

**Acceptance Criteria:**

-   Each homepage entry includes a moreCategoriesList field: an ordered
    relationship to the Categories collection (hasMany: true).

-   The admin selects and orders the categories to display.

-   If no categories are selected, the section is not rendered.

-   Changes trigger cache invalidation.

**8. Navigation Bar (Home Page References)**

The top navigation bar is a shared global component, not owned by the
home page service. The following user stories document only the home
page service's data responsibilities for elements that appear in the nav
bar. Full nav bar implementation is documented separately.

**HP-023 Primary Category Navigation Tabs**

*As a visitor, I want to see category navigation tabs in the top bar, so
that I can quickly navigate to major service verticals.*

**Acceptance Criteria:**

-   The category tabs are populated from the category taxonomy managed
    in Payload CMS.

-   The list of visible nav categories, their labels, and their order
    are CMS-managed (dynamic, not hardcoded).

-   Adding, removing, or reordering categories in the CMS updates the
    nav tabs without a frontend deploy.

-   Only published categories are shown.

-   Home page service responsibility: include the nav category list in
    the homepage API payload (or reference the existing categories API
    endpoint).

**HP-024 Search Bar Autocomplete Reference**

*As a visitor, I want to type in the search bar and see real-time
suggestions, so that I can quickly find projects, services, and talent
by keyword.*

**Acceptance Criteria:**

-   The search bar displays placeholder text: "Search by skills or
    project type."

-   A category filter dropdown scopes the search to a specific vertical.

-   As the user types, autocomplete suggestions appear (powered by
    autocomplete-service).

-   Pressing Enter or clicking the search icon navigates to the search
    results page (powered by algolia-service).

-   Home page service responsibility: none beyond rendering the search
    bar component. Autocomplete and search are handled by their
    respective services.

**Notes:**

-   Search submit navigates to a separate search results page. The home
    page does not render search results.

**HP-025 Wallet Balance Display Reference**

*As a authenticated user, I want to see my current account balance in
the navigation bar, so that I have visibility into my available funds
without navigating away.*

**Acceptance Criteria:**

-   The wallet balance is displayed in the nav bar as a formatted
    currency value (e.g., "\$1,540 USD").

-   The balance is fetched from wallet-service.

-   Format: currency symbol + formatted amount + currency code, based on
    the user's account currency.

-   Visible only to authenticated users. Unauthenticated visitors see
    login/signup prompts instead.

-   Home page service responsibility: reference wallet-service in the
    homepage payload or leave to the global nav component to fetch
    independently.

**Notes:**

-   The home page does not own wallet business logic. This is a
    reference dependency only.

**HP-026 User Profile Display Reference**

*As a authenticated user, I want to see my name, email, and team member
count in the navigation area, so that I have quick access to my identity
and team context.*

**Acceptance Criteria:**

-   Displays: user's full name, registered email address, and team
    member count (e.g., "You currently have 10 team members").

-   Team member count = total active contracts + outside team members
    invited to the account.

-   Data source: user-service for profile data; team count from the My
    Team module.

-   Visible only to authenticated users.

-   Home page service responsibility: reference only. Profile and team
    data are fetched by the global nav component from their respective
    services.

**HP-027 My Favorites and My Dashboard Links Reference**

*As a authenticated user, I want to see quick-access links to My
Favorites and My Dashboard, so that I can navigate to my saved items and
personal dashboard with one click.*

**Acceptance Criteria:**

-   Both links are visible only to authenticated users.

-   My Favorites navigates to the user's saved/favorited items page.

-   My Dashboard navigates to the user's personal dashboard.

-   Home page service responsibility: none. These are static navigation
    links rendered by the global nav component.

**9. Footer Section**

User stories for the footer. Footer navigation links are static but
CMS-managed and editable from Payload.

**HP-028 Display Footer Navigation**

*As a visitor, I want to see organized navigation links in the footer,
so that I can access important pages and resources from any point on the
home page.*

**Acceptance Criteria:**

-   The footer displays navigation links organized into four columns:
    About, Solutions, Industries, and Resources.

-   Each column contains a list of labeled links.

-   The link labels, URLs, and column groupings are managed in Payload
    CMS (a FooterNavigation global or a Homepages collection field).

-   Links are static (not dynamically generated from listings or
    categories) but editable by Content Editor and above roles in the
    CMS.

-   Changes to footer links trigger cache invalidation.

**HP-029 Talent Network CTA in Footer**

*As a visitor, I want to see a call-to-action to join the Marketeq
Talent Network in the footer, so that qualified professionals can
discover the opportunity to join the platform.*

**Acceptance Criteria:**

-   The footer includes a Talent Network section with: headline
    ("Marketeq Talent Network"), descriptive paragraph, and a "Join the
    talent network" CTA button.

-   Clicking the CTA navigates to the talent application/signup page.

-   The headline, description, and CTA are CMS-managed (editable in
    Payload).

**HP-030 Footer Bottom Bar**

*As a visitor, I want to see copyright information, legal links, and a
back-to-top control, so that I have access to legal documents and can
quickly return to the top of the page.*

**Acceptance Criteria:**

-   The bottom bar displays: copyright notice with current year, Terms &
    Conditions link, Privacy Policy link, and a "Back to Top" link.

-   The legal links are CMS-managed (termsUrl and privacyUrl fields from
    the SiteSettings global in Payload).

-   "Back to Top" smooth-scrolls to the top of the page.

**10. Cross-Cutting Concerns**

User stories for behaviors and requirements that apply across multiple
home page sections.

**HP-031 Authentication-Dependent Rendering**

*As a home page service, I want to serve different content based on the
user's authentication state, so that authenticated users see
personalized elements and unauthenticated users see appropriate
prompts.*

**Acceptance Criteria:**

-   Authenticated users see: wallet balance, user profile (name, email,
    team count), My Favorites link, My Dashboard link.

-   Unauthenticated users see: login/signup prompts in place of wallet
    and profile areas; My Favorites and My Dashboard links are hidden.

-   All content sections (hero, favorites, newest, popular, carousels,
    categories, footer) render identically for both authenticated and
    unauthenticated users.

-   Authentication state does not affect which homepage variant is
    served (A/B testing is cookie-based, not auth-based).

**HP-032 Homepage Cache Invalidation**

*As a home page service, I want to invalidate the cached homepage
payload when content changes in Payload CMS, so that users always see
up-to-date content without manual cache purging.*

**Acceptance Criteria:**

-   When a Homepages collection entry is created, updated, or deleted in
    Payload, a homepage.saved or homepage.deleted event is published to
    the cms.events RabbitMQ exchange.

-   The home page service consumes these events and invalidates the
    cached payload for the affected homepage slug.

-   When a Tax Group referenced by a homepage section is updated, the
    homepage cache is also invalidated.

-   When a listing referenced by a manual override is updated (e.g.,
    title change, status change to archived), the homepage cache is
    invalidated.

-   Cache keys are deterministic, based on homepage slug and a hash of
    section configurations.

**Notes:**

-   This follows the same cache invalidation pattern used by category
    pages: webhook/RabbitMQ event triggers selective revalidation.

**HP-033 SEO Metadata for the Home Page**

*As a home page service, I want to serve SEO metadata with the homepage
payload, so that the home page is properly indexed by search engines and
displays correctly when shared on social media.*

**Acceptance Criteria:**

-   The homepage API payload includes: metaTitle, metaDescription,
    canonical URL, and ogImage.

-   SEO fields are defined on each Homepages collection entry in Payload
    CMS (using the \@payloadcms/plugin-seo integration).

-   If SEO fields are left blank, defaults are generated from the
    SiteSettings global (defaultSeoTitle, defaultSeoDescription).

-   Preview responses include noindex: true to prevent test pages from
    being indexed.

**HP-034 Homepage Promotional Banner Overlay**

*As a platform admin, I want to display an optional notification banner
above the hero section, so that I can communicate time-sensitive
promotions or platform announcements to all visitors.*

**Acceptance Criteria:**

-   The existing HomepageBanner global in Payload CMS (enabled, message,
    ctaLabel, ctaUrl, expiresAt, bannerType) continues to function as a
    notification-bar overlay, separate from the hero section.

-   When enabled is true and the current date is before expiresAt, the
    banner renders above the hero.

-   bannerType (info/promo/warning) determines the banner's visual
    styling.

-   The banner is included in the homepage API payload and cached with
    the same invalidation rules.

-   This banner is independent of the homepage entry --- it applies to
    all active/testing homepages.

**HP-035 Section Suppression When Content Is Insufficient**

*As a home page service, I want to suppress any section that does not
meet minimum content thresholds, so that the home page never shows
broken, empty, or sparse sections to users.*

**Acceptance Criteria:**

-   Carousel sections require a minimum of 3x the visible grid size (per
    the Category Pages Product Overview). If fewer items are available
    after evaluator execution and fallback logic, the section is not
    rendered.

-   Grid sections require at least one full row of items. If fewer items
    are available, the section is not rendered.

-   The Our Favorite Projects carousel, Newest Additions grid, Most
    Popular grid, all themed carousels, and the More Categories tile
    grid all follow this rule.

-   Suppression is evaluated server-side during payload assembly.
    Suppressed sections are excluded from the API response entirely.

**HP-036 Performance: SSR and Edge Caching**

*As a home page service, I want to serve the homepage payload with
optimal performance, so that the home page loads quickly for all users
regardless of geographic location.*

**Acceptance Criteria:**

-   The homepage API response is SSR-compatible (single payload, single
    request).

-   The response is cached at the edge with deterministic cache keys
    (homepage slug + section hash).

-   Incremental revalidation is triggered by CMS change events (not
    time-based TTL alone).

-   Above-the-fold content (hero, first section) is prioritized in the
    payload structure to enable progressive rendering.

-   Image URLs in the payload (hero background, listing thumbnails,
    category icons) point to Cloudflare R2 with CDN caching.

**Notes:**

-   Follows the same SSR + edge cache + incremental revalidation pattern
    defined in the Category Pages Product Overview.

**11. External Service Dependencies**

Summary of external services referenced by home page user stories. These
are not home page features --- they are services whose behavior creates
a direct requirement for the home page.

  -------------------------- --------------------------------- ------------------
  **Service**                **Home Page Dependency**          **Related
                                                               Stories**

  **cms-service (Payload     Homepages collection, Tax Groups, HP-001 through
  CMS)**                     Categories, Listings (featured),  HP-034
                             Media, SiteSettings,              
                             HomepageBanner, FooterNavigation. 
                             Source of truth for all           
                             CMS-managed content.              

  **category-service**       Category taxonomy (L1/L2/L3), Tax HP-012, HP-014,
                             Group evaluator/assembler         HP-016, HP-021,
                             infrastructure, category page     HP-023
                             routing for "View More"           
                             navigation.                       

  **listings-service**       Listing data (title, description, HP-008, HP-010,
                             price, timeline, rating,          HP-012, HP-016,
                             thumbnail, listingType, team      HP-017, HP-018
                             members). Read from shared DB,    
                             synced from CMS via RabbitMQ.     

  **autocomplete-service**   Search typeahead suggestions for  HP-024
                             the nav bar search input.         

  **algolia-service**        Full-text search execution on     HP-024
                             search submit.                    

  **wallet-service**         User's current account balance in HP-025
                             the user's currency.              

  **user-service**           User profile data (name, email).  HP-026
                             Team member count from My Team    
                             module.                           

  **RabbitMQ (cms.events)**  Event bus for cache invalidation. HP-004, HP-032
                             Homepage content changes          
                             published as homepage.saved /     
                             homepage.deleted events.          

  **Cloudflare R2**          Object storage for all media      HP-005, HP-006,
                             assets (hero images, listing      HP-021
                             thumbnails, category icons).      
  -------------------------- --------------------------------- ------------------
