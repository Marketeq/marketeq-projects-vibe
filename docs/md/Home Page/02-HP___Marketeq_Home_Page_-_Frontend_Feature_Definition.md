**Marketeq Home Page**

Frontend Feature Definition

*UI components, user actions, flows, validations, states, empty states,
error states, and edge cases for frontend implementation*

Document Version: 1.0 \| Date: April 5, 2026

Scope: Home Page Frontend Only \| Source: 01-HP User Stories +
Architecture Overview

**Table of Contents**

**1. Data Source and API Contract**

The home page is powered by a single API endpoint. All frontend
rendering decisions are driven by the payload returned from this
endpoint. The frontend never calls Payload CMS directly.

*User Stories: HP-004*

**1.1 Primary Endpoint**

  --------------------- -------------------------------------------------
  **Property**          **Value**

  **Method + Path**     GET /api/homepage

  **Auth**              Optional. Unauthenticated users receive the same
                        payload; auth-dependent elements (wallet,
                        profile) are fetched by the global nav component
                        from their own services.

  **Query Params**      preview=1 (admin preview mode, requires
                        x-preview-token header)

  **Cookie Read**       mktq_hp_variant (A/B test variant assignment)

  **Cache**             Edge-cached. Invalidated server-side via RabbitMQ
                        events on CMS content change.
  --------------------- -------------------------------------------------

**1.2 Response Payload Structure**

The frontend must handle every field in this payload. Missing optional
fields mean the component is not rendered.

  --------------------------------------- -------------------------------------------------
  **Field**                               **Type and Purpose**

  **title**                               string --- Homepage entry title (internal, not
                                          displayed)

  **slug**                                string --- Unique homepage identifier

  **status**                              \"active\" \| \"testing\" \| \"draft\" --- Only
                                          active/testing are served to users

  **hero**                                object \| null --- { headline, subheadline,
                                          backgroundImage, ctaLabel, ctaUrl }

  **banner**                              object \| null --- { enabled, message, ctaLabel,
                                          ctaUrl, expiresAt, bannerType }

  **sections**                            array --- Ordered list of section objects, each
                                          with { key, title, subtitle, ctaLabel, ctaUrl,
                                          blocks\[\] }

  **sections\[\].blocks\[\]**             array --- Each block: { key, type
                                          (\"grid\"\|\"carousel\"), entity, items\[\],
                                          pagination? }

  **sections\[\].blocks\[\].items\[\]**   array --- Listing objects with all card fields
                                          (see Section 5)

  **popularTabs**                         array --- \[{ uuid, name, slug }\] --- L1
                                          categories for Most Popular filter tabs

  **moreCategoriesList**                  array --- \[{ uuid, name, slug, iconUrl }\] ---
                                          Categories for the More Categories tile grid

  **footerNav**                           object --- { columns: \[{ heading, links: \[{
                                          label, url }\] }\] }

  **talentNetworkCta**                    object --- { headline, description, ctaLabel,
                                          ctaUrl }

  **seo**                                 object --- { metaTitle, metaDescription,
                                          canonical, ogImage, noindex? }
  --------------------------------------- -------------------------------------------------

**1.3 Section Ordering**

The sections array determines the order in which content sections render
on the page. The frontend iterates this array and renders each section
in sequence. The frontend does not hardcode section order --- it is
entirely CMS-driven. If the sections array is empty, only the hero,
banner, navigation bar, More Categories, and footer render.

**1.4 Error Handling for API Response**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  200 OK           Render the homepage normally from the Successful fetch
                   payload                               

  404 Not Found    Render a full-page error state: "Page No
                   not available" message with a link to active/default
                   the platform root or category browse  homepage exists
                                                         in the CMS

  500 Server Error Render a full-page error state:       API or database
                   "Something went wrong" message with a failure
                   retry action                          

  Network Timeout  Render the cached version if          Network failure
                   available (stale-while-revalidate);   or edge cache
                   otherwise show full-page error with   miss
                   retry                                 
  ---------------- ------------------------------------- ----------------

**2. Page Layout and Render Order**

The home page renders in a fixed structural order. Within the sections
zone, the CMS-defined section order controls the sequence.

*User Stories: HP-004, HP-031, HP-036*

**2.1 Structural Zones (Top to Bottom)**

1.  Promotional Banner (optional overlay --- above everything)

2.  Global Navigation Bar (shared component, not owned by home page)

3.  Hero Section

4.  Sections Zone (CMS-ordered: Favorites, Newest, Popular, Themed
    Carousels)

5.  More Categories Tile Grid

6.  Footer (Navigation columns, Talent Network CTA, Bottom bar)

**2.2 Above-the-Fold Priority**

The promotional banner, navigation bar, and hero section must render
first. The first section in the sections array should also be
prioritized. Lower sections should lazy-load as the user scrolls. All
images in the hero and first section should use eager loading. Images in
subsequent sections should use lazy loading.

**2.3 Authentication-Dependent Zones**

  --------------------- -------------------------------------------------
  **Zone**              **Auth Behavior**

  **Navigation Bar**    Authenticated: shows wallet balance, user
                        profile, My Favorites, My Dashboard.
                        Unauthenticated: shows login/signup prompts.

  **Hero Section**      No auth dependency. Renders identically for all
                        users.

  **Sections Zone**     No auth dependency. All sections render
                        identically.

  **More Categories**   No auth dependency.

  **Footer**            No auth dependency.
  --------------------- -------------------------------------------------

**3. Promotional Banner**

An optional notification bar that overlays above the hero. Independent
of the homepage entry --- applies globally to all homepage variants.

*User Stories: HP-034*

**3.1 UI Components**

-   **Banner Container:** Full-width bar fixed above the hero section

-   **Message Text:** Plain text message from CMS (banner.message)

-   **CTA Link:** Optional --- renders only if banner.ctaLabel and
    banner.ctaUrl are both present

-   **Dismiss Control:** User can dismiss the banner for the session
    (store dismissal in sessionStorage)

**3.2 Visual Variants by bannerType**

  ---------------- ------------------------------------- -------------------
  **State**        **Behavior**                          **Trigger**

  info             Neutral background (e.g., blue/gray). banner.bannerType
                   Informational tone.                   === \"info\"

  promo            Accent/highlight background (e.g.,    banner.bannerType
                   brand color). Promotional tone.       === \"promo\"

  warning          Warning background (e.g.,             banner.bannerType
                   amber/orange). Urgent tone.           === \"warning\"
  ---------------- ------------------------------------- -------------------

**3.3 Visibility Rules**

-   Render only when banner.enabled === true AND current date \<
    banner.expiresAt.

-   If banner is null or enabled is false, do not render. No empty state
    --- the space collapses.

-   If the user has dismissed the banner this session (sessionStorage
    flag), do not render.

-   Banner does not shift other content --- hero section position is
    always the same whether the banner is present or not (banner should
    be a sticky overlay or the layout must account for it).

**3.4 Edge Cases**

-   expiresAt is in the past: do not render, even if enabled is true.

-   ctaLabel present but ctaUrl missing (or vice versa): do not render
    the CTA link --- show message-only banner.

-   message is empty string: do not render the banner.

**4. Hero Section**

Full-width promotional banner with headline, subheadline, background
image, and CTA. Content is static (CMS-managed), not auto-generated.

*User Stories: HP-005, HP-006, HP-007*

**4.1 UI Components**

-   **Background Image:** Full-width, served from Cloudflare R2 via
    hero.backgroundImage URL. Must support responsive sizing.

-   **Headline:** hero.headline --- Primary display text, large type,
    high contrast against background.

-   **Subheadline:** hero.subheadline --- Secondary text below headline.
    Optional field.

-   **CTA Button:** hero.ctaLabel as button text; navigates to
    hero.ctaUrl on click.

**4.2 Component States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          All hero fields rendered. Background  Page load with
                   image loaded. CTA button in default   valid hero data
                   state.                                

  CTA Hover        CTA button receives hover feedback    Mouse enters CTA
                   (color shift, shadow, or scale).      button

  Image Loading    Placeholder background color or       Image URL is
                   gradient while image loads. Headline  valid but still
                   and CTA render immediately (do not    loading
                   block on image).                      

  Image Error      Fallback solid background color       Image URL
                   (brand color). Headline and CTA still returns 4xx/5xx
                   render.                               or times out
  ---------------- ------------------------------------- ----------------

**4.3 Empty State**

If hero is null in the API response (no hero configured for this
homepage entry), the hero section is not rendered. The first section in
the sections array moves up to fill the space. No placeholder or
skeleton is shown.

**4.4 Validation Rules**

-   hero.headline is required for the hero to render. If headline is
    missing/empty, suppress the entire hero section.

-   hero.ctaLabel is required for the CTA button to render. If ctaLabel
    is missing, the hero renders without a CTA button (headline +
    subheadline + background only).

-   hero.ctaUrl must be a valid URL (internal path or external). If
    ctaUrl is missing but ctaLabel is present, do not render the CTA
    button.

-   hero.subheadline is optional. If missing, render headline + CTA
    without subheadline.

-   hero.backgroundImage is optional. If missing, use fallback solid
    background color.

**4.5 Edge Cases**

-   ctaUrl is an external URL (starts with http): open in a new tab.

-   ctaUrl is an internal path (starts with /): navigate within the SPA.

-   headline contains very long text (100+ characters): text must wrap.
    Do not truncate.

-   backgroundImage aspect ratio mismatch: use cover sizing. Never
    distort.

**5. Listing Card Components**

Two card formats are used across all content sections. The card format
is determined by the listingType field on each listing item in the API
response. These cards are shared components used by Sections 6 through
9.

*User Stories: HP-017, HP-018*

**5.1 Project Card**

Renders when item.listingType === \"project\"

  --------------------- -------------------------------------------------
  **Field**             **Source and Display Rules**

  **Thumbnail**         item.coverImage URL. If null, show placeholder
                        image. Lazy load below fold.

  **Title**             item.title. Truncate at 2 lines with ellipsis if
                        overflow.

  **Rating**            item.rating (decimal) + item.reviewCount. Format:
                        "4.9 (5)". If rating is null or 0, hide the
                        rating component.

  **Description**       item.excerpt. Truncate at 3 lines with ellipsis.

  **Timeline**          item.timeline. Display as-is (e.g., "Starting
                        from 12 weeks"). If null, hide.

  **Budget**            item.budget. Format with currency (e.g.,
                        "\$50,000 budget"). If null, hide.

  **Team Avatars**      item.teamMembers\[\]. Render up to 4 avatar
                        images stacked. If more, show "+N" overflow
                        badge. If empty array, hide avatars.
  --------------------- -------------------------------------------------

**5.2 Service Card**

Renders when item.listingType === \"service\"

  --------------------- -------------------------------------------------
  **Field**             **Source and Display Rules**

  **Thumbnail**         item.coverImage URL. Same fallback rules as
                        Project Card.

  **Category Tags**     item.tags\[\]. Render as horizontal tag row.
                        Truncate at 4 tags. If empty, hide.

  **Title**             item.title. Same truncation as Project Card.

  **Rating**            Same as Project Card.

  **Description**       Same as Project Card.

  **Monthly Price**     item.monthlyPrice. Format: "\$X,XXX/month". If
                        null, hide.

  **Team Avatars**      Same as Project Card.
  --------------------- -------------------------------------------------

**5.3 Card Interaction States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Card displayed with standard          Resting state
                   elevation/shadow                      

  Hover            Card receives hover feedback: subtle  Mouse enters
                   shadow increase or border highlight   card

  Pressed          Brief pressed state: card depresses   Mouse down on
                   slightly or shadow decreases          card

  Click /          Navigate to listing detail page:      User clicks
  Navigation       /projects/{slug} or /services/{slug}  anywhere on the
                                                         card
  ---------------- ------------------------------------- ----------------

**5.4 Card Loading State (Skeleton)**

While the homepage payload is being fetched, card positions in grids and
carousels should render as skeleton placeholders: gray animated
rectangles matching the card layout (image area, text lines, avatar
circles). Skeletons must match the expected card dimensions to prevent
layout shift when data loads.

**5.5 Card Error State**

If an individual listing item has corrupted or incomplete data (e.g.,
title is null), skip rendering that card entirely. Do not show an error
card. If a block's items array is empty after skipping corrupted items,
apply the section-level empty state rules (see Section 12).

**6. Our Favorite Projects Section**

Horizontal carousel of editorially curated projects. Backed by a Tax
Group with manual override. Manually pinned items appear first;
rule-based items (top-rated fallback) fill remaining slots.

*User Stories: HP-008, HP-009*

**6.1 UI Components**

-   **Section Title:** "Our Favorite Projects" --- from section title
    field in the API payload

-   **Carousel Container:** Horizontal scrollable area displaying
    Project Cards (Section 5.1)

-   **Left Arrow:** Scrolls carousel backward by one visible set of
    cards

-   **Right Arrow:** Scrolls carousel forward by one visible set of
    cards

**6.2 Carousel Behavior**

-   Visible cards per row: 4 on desktop (design-driven). Cards scroll as
    a group when arrows are clicked.

-   Arrows appear only if there are more items than the visible set. If
    all items fit in one view, no arrows render.

-   At the start of the carousel: left arrow is hidden or disabled. At
    the end: right arrow is hidden or disabled.

-   Maximum scroll depth: 10 pages (40 cards at 4 per page). After the
    10th page, a terminal card renders with a link to the category page.

-   Scroll animation: smooth horizontal transition.

-   No auto-play / auto-advance. User-initiated only.

**6.3 Component States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          First set of cards visible. Right     Page load
                   arrow enabled. Left arrow hidden.     

  Scrolling        Cards animate horizontally. Both      User clicks an
                   arrows active if more cards exist in  arrow
                   either direction.                     

  End of List      Right arrow hidden/disabled. Terminal User reaches
                   card may be visible.                  last set of
                                                         items

  Start of List    Left arrow hidden/disabled.           User scrolls
                                                         back to
                                                         beginning
  ---------------- ------------------------------------- ----------------

**6.4 Empty State**

If the section's blocks\[0\].items array is empty (no favorites
configured and fallback returns no results), the entire section is
suppressed. No heading, no carousel container, no placeholder. The next
section moves up.

**6.5 Edge Cases**

-   Fewer than 4 items: render all items without arrows. Do not stretch
    cards to fill the row.

-   Carousel guard (server-side): section is not included in the payload
    if items \< 3x grid size. Frontend should still handle the case
    where items array has 1--2 items gracefully by rendering them
    without arrows.

-   Terminal card: if present in the items array (identifiable by a
    type: "terminal" field or equivalent), render as a special card with
    a "View all" link pointing to section.ctaUrl.

**7. Newest Additions Section**

Multi-row grid of the most recently published listings across all
categories. Tax Group kind: newest, no category filter. Supports manual
override (pinned items first).

*User Stories: HP-010, HP-011*

**7.1 UI Components**

-   **Section Title:** "Newest Additions"

-   **View More Button:** Top-right of section header. Navigates to
    section.ctaUrl.

-   **Grid Container:** Multi-row grid. 3 columns on desktop, 2 on
    tablet, 1 on mobile.

-   **Listing Cards:** Project Cards or Service Cards based on each
    item's listingType (Section 5).

**7.2 Grid Layout Rules**

-   Grid size is defined by the Tax Group's gridSize (default: 3
    columns).

-   Number of visible items is defined by the Tax Group's limit (e.g., 9
    items = 3 rows of 3).

-   Cards render left-to-right, top-to-bottom.

-   If the last row has fewer items than gridSize, render the partial
    row. Do not add empty placeholder cells.

**7.3 View More Button**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Outline/secondary style button with   Page load
                   label from section.ctaLabel (default: 
                   "View More")                          

  Hover            Button fills with accent color; text  Mouse enters
                   shifts to white                       button

  Hidden           Button is not rendered                Total item count
                                                         equals items
                                                         displayed (no
                                                         more results)
  ---------------- ------------------------------------- ----------------

**7.4 Price Display Logic**

The card's price field varies by listing type. The frontend does not
calculate prices --- it displays the values from the API:

-   **listingType === \"project\":** Display item.price formatted as
    "\$XX,XXX" (starting price)

-   **listingType === \"service\":** Display item.monthlyPrice formatted
    as "\$X,XXX/month" (recurring price)

-   **Price is null:** Hide the price line entirely. Do not show "\$0"
    or "Free."

**7.5 Empty State**

If items array is empty, suppress the entire section. No heading, no
grid, no View More.

**7.6 Edge Cases**

-   Mixed listing types in grid: some cards show project format, some
    show service format. Grid layout is the same; only card content
    differs.

-   All items have null prices: cards still render with title,
    description, timeline, thumbnail. Price line is simply absent.

-   View More navigates to a category page or dedicated listing page via
    section.ctaUrl. Do not hardcode the destination.

**8. Most Popular Projects Section**

Tabbed, filterable grid showing the most popular listings. Tabs are
dynamic L1 categories configured in the CMS. Powered by a Tax Group with
kind: most-popular. Supports manual override.

*User Stories: HP-012, HP-013, HP-014, HP-015*

**8.1 UI Components**

-   **Section Title:** "Most Popular Projects"

-   **View More Button:** Top-right of header. Navigates to the category
    page for the active tab.

-   **Filter Tab Bar:** Horizontal row of category tabs. First tab
    always "View All." Additional tabs from popularTabs array.

-   **Grid Container:** Same grid layout as Newest Additions (Section
    7).

-   **Listing Cards:** Project or Service Cards based on listingType.

**8.2 Tab Bar Behavior**

The tab bar enables users to filter the grid by L1 category. The "View
All" tab shows platform-wide popular listings (no category filter). Each
additional tab scopes the most-popular evaluator to that L1 category's
subtree.

**Tab States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Tab label in neutral color, no        Tab is not
  (Inactive)       background fill                       selected

  Hover            Subtle background highlight or text   Mouse enters an
                   color shift                           inactive tab

  Active           Filled background or underline        User clicks a
                   accent, bold text. Only one tab is    tab or page
                   active at a time.                     loads (View All
                                                         is default)
  ---------------- ------------------------------------- ----------------

**Tab Interaction Flow**

7.  Page loads. "View All" tab is active by default. Grid shows the
    default block from the sections payload.

8.  User clicks a category tab (e.g., "Top Web").

9.  Frontend sends a request to fetch the block for that category: GET
    /api/homepage/section/{sectionKey}/block?category={categorySlug}.

10. While loading, the grid shows skeleton cards (same layout as current
    grid, replacing content).

11. On response, grid content updates with the new items. Tab active
    state moves to the selected tab.

12. If the fetch fails, show an inline error state within the grid area
    (not full-page). Previous content is replaced by error message with
    a retry button.

**8.3 View More Destination**

The View More button's destination changes based on the active tab:

-   **View All active:** Navigate to a general popular listings page or
    platform browse root

-   **Category tab active:** Navigate to /c/{categorySlug}?kind=show-all
    for the selected category

**8.4 Empty States**

-   popularTabs array is empty: only the "View All" tab renders. No
    additional tabs. Grid shows platform-wide popular listings.

-   A category tab returns zero items: show an inline empty state within
    the grid area: "No popular listings in this category yet." Do not
    suppress the tab itself.

-   The entire section has zero items (even "View All" is empty):
    suppress the section entirely.

**8.5 Edge Cases**

-   Tab label text overflow: truncate with ellipsis. Do not wrap tab
    labels to multiple lines.

-   More than 6 tabs: show the first 5 tabs and a "More" dropdown for
    remaining tabs. (Responsive behavior --- on mobile, tabs become a
    horizontal scrollable row.)

-   User clicks a tab rapidly (double-click or tab-switching during
    load): debounce tab clicks. Only the latest selection's fetch should
    resolve. Cancel in-flight requests for previous tabs.

-   Same items appear in multiple tabs: this is expected (a listing can
    be popular in its category AND platform-wide). No deduplication is
    needed across tabs.

**9. Themed Carousel Sections**

Category-scoped horizontal carousels rendered from the CMS-ordered
sections array. Five sections identified in the current design: Online
Sales Funnels, Customer Service Solutions, Marketing Automation
Campaigns, Cloud Software Applications, and Mobile Applications. The
frontend does not hardcode these --- it iterates the sections array and
renders each one.

*User Stories: HP-016, HP-017, HP-018, HP-019, HP-020*

**9.1 UI Components (Per Section)**

-   **Section Title:** From section.title (e.g., "Online Sales Funnels")

-   **Section Subtitle:** From section.subtitle. Optional. If null,
    render title without subtitle.

-   **View More CTA:** Link/button with text from section.ctaLabel.
    Navigates to section.ctaUrl (the corresponding category page).

-   **Carousel:** Same carousel component as Our Favorite Projects
    (Section 6). 4 cards per visible row, arrow navigation, max 10
    pages, terminal card.

-   **Listing Cards:** Project Cards or Service Cards based on each
    item's listingType.

**9.2 Section Rendering Logic**

The frontend iterates the sections array from the API response and
renders each section using the same generic section renderer. It does
not distinguish between "Favorites," "Newest," "Popular," or "Themed" at
the component level --- the difference is in the data (items, card
types, layout type).

-   If section.blocks\[0\].type === \"carousel\": render the carousel
    component with arrows.

-   If section.blocks\[0\].type === \"grid\": render the grid component.

-   The design determines carousel vs. grid. If the design shows
    chevrons, the API returns type: \"carousel\". The frontend does not
    make this decision.

**9.3 Marketing Automation --- Service Card Rendering**

The Marketing Automation Campaigns section is the only current section
that renders Service Cards (Section 5.2) instead of Project Cards. This
is not a special case in the frontend --- the items in this section have
listingType: \"service\", so the card component automatically renders
the service format with monthly pricing and category tags.

**9.4 Empty State**

Same as Section 6: if items array is empty, suppress the entire section.
No heading, no carousel.

**9.5 Edge Cases**

-   A section contains a mix of project and service items: render each
    card in the appropriate format based on its listingType. The
    carousel layout is unchanged.

-   Section title or subtitle is very long: title wraps to a second
    line. Subtitle truncates at 2 lines with ellipsis.

-   ctaLabel is null but ctaUrl is present: do not render the CTA link.

-   A section appears in the sections array but its blocks array is
    empty: suppress. Do not render a heading with an empty carousel.

**10. More Categories Tile Grid**

A visual grid of category tiles at the bottom of the main content area.
Categories and their order are CMS-configured on the homepage entry.

*User Stories: HP-021, HP-022*

**10.1 UI Components**

-   **Section Title:** "More Categories"

-   **Section Subtitle:** "Find more ways to maximize your results with
    Marketeq's curated project teams"

-   **View All Categories Link:** Top-right of header. Navigates to the
    full categories browse page.

-   **Category Tile:** Rectangular tile with category name,
    illustration/icon, and "Browse Projects" button.

**10.2 Tile Data**

  --------------------- -------------------------------------------------
  **Field**             **Source and Display**

  **Category Name**     item.name from moreCategoriesList array

  **Illustration /      item.iconUrl --- served from R2. If null, render
  Icon**                a default placeholder icon.

  **Browse Button**     "Browse Projects" --- navigates to /c/{item.slug}
  --------------------- -------------------------------------------------

**10.3 Tile States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Tile displayed with standard styling. Resting state
                   Browse button in outline/secondary    
                   style.                                

  Hover (Tile)     Tile receives subtle elevation or     Mouse enters
                   border highlight                      tile

  Hover (Button)   Browse button fills with accent color Mouse enters the
                                                         button
  ---------------- ------------------------------------- ----------------

**10.4 Layout**

-   Grid: 3 columns on desktop, 2 on tablet, 1 on mobile.

-   Tiles are equal width. Tile height adjusts to content
    (illustration + name + button).

-   Display order matches the moreCategoriesList array order
    (CMS-defined).

**10.5 Empty State**

If moreCategoriesList is empty or null, suppress the entire section
including the heading and subtitle.

**10.6 Edge Cases**

-   Only 1--2 categories configured: render partial row. Do not stretch
    tiles to fill.

-   Category name is very long: wrap within the tile. Do not truncate.

-   iconUrl returns 404: show default placeholder icon. Do not show a
    broken image.

**11. Navigation Bar (Home Page Data References)**

The global navigation bar is a shared component. These definitions cover
only the data the home page is responsible for providing or the behavior
of nav elements on the home page context. Full nav bar specs are
documented separately.

*User Stories: HP-023, HP-024, HP-025, HP-026, HP-027*

**11.1 Category Tabs**

-   **Data Source:** Category taxonomy from the categories API
    (CMS-managed). Not from the homepage payload.

-   **Display:** Horizontal row of L1 category labels. Order matches CMS
    sort order.

-   **Active State:** The tab matching the current context is visually
    distinct. On the home page, no tab is active (home is not a
    category).

-   **Dynamic:** Adding/removing/reordering categories in the CMS
    updates tabs without a deploy.

-   **Published Only:** Only categories with published_in_marketplace:
    true are shown.

**11.2 Search Bar**

-   **Placeholder:** "Search by skills or project type"

-   **Category Dropdown:** Scoped filter to the left of the input.
    Options populated from category taxonomy.

-   **Autocomplete:** Real-time suggestions from autocomplete-service as
    user types. Debounce: 200--300ms.

-   **Submit:** Enter key or search icon click navigates to
    /search?q={query}&category={slug}. Separate page --- home page does
    not render search results.

**Search Bar States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Placeholder text visible. Input not   Page load
                   focused.                              

  Focused          Border highlights. Placeholder fades  User clicks or
                   or shifts. Cursor appears.            tabs into input

  Typing           Autocomplete dropdown appears below   User enters 2+
                   input after debounce delay.           characters

  No Results       Autocomplete dropdown shows "No       Autocomplete API
                   suggestions found" message.           returns empty

  Autocomplete     Dropdown does not appear. No error    Autocomplete API
  Error            message shown to user. Search submit  fails
                   still works.                          
  ---------------- ------------------------------------- ----------------

**11.3 Wallet Balance**

-   **Data Source:** wallet-service. Fetched independently by the nav
    component, not from the homepage payload.

-   **Format:** Currency symbol + amount + code (e.g., "\$1,540 USD")

-   **Auth Gate:** Visible only to authenticated users.

-   **Loading:** Show skeleton placeholder while fetching.

-   **Error:** Show "\--" or hide balance. Do not show "\$0" on error.

**11.4 User Profile**

-   **Data Source:** user-service for name/email. My Team module for
    team count.

-   **Display:** Name, email, team count (e.g., "You currently have 10
    team members"). Team count = active contracts + invited outside
    members.

-   **Auth Gate:** Visible only to authenticated users.

-   **Unauthenticated:** Login/signup prompts replace wallet and profile
    areas.

**11.5 My Favorites / My Dashboard**

-   **Auth Gate:** Visible only to authenticated users.

-   **Behavior:** Static navigation links. My Favorites → saved items
    page. My Dashboard → personal dashboard.

**12. Footer Section**

Full-width footer with CMS-managed navigation columns, Talent Network
CTA, and legal bottom bar.

*User Stories: HP-028, HP-029, HP-030*

**12.1 Navigation Columns**

-   **Data Source:** footerNav object from the homepage API payload.

-   **Structure:** footerNav.columns\[\] --- each column has a heading
    (string) and links\[\] (array of { label, url }).

-   **Display:** 4 columns side-by-side on desktop. Stack vertically on
    mobile (collapsible accordion optional).

-   **Links:** Each link navigates to its url. Internal links navigate
    within the SPA. External links open in new tab.

**12.2 Talent Network CTA**

-   **Data Source:** talentNetworkCta object from the homepage API
    payload.

-   **Components:** Headline, descriptive paragraph, and CTA button.

-   **CTA Click:** Navigates to talentNetworkCta.ctaUrl (talent
    application page).

**CTA Button States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  Default          Filled primary button with label from Resting state
                   talentNetworkCta.ctaLabel             

  Hover            Button receives hover feedback        Mouse enters
                   (darken, shadow)                      button
  ---------------- ------------------------------------- ----------------

**12.3 Bottom Bar**

-   **Copyright:** Dynamic year: © {currentYear} Marketeq. Year must be
    computed client-side.

-   **Terms & Conditions:** Link from SiteSettings.termsUrl

-   **Privacy Policy:** Link from SiteSettings.privacyUrl

-   **Back to Top:** "Back to Top" text link. Click smooth-scrolls to
    page top (window.scrollTo with behavior: smooth).

**12.4 Empty States**

-   footerNav is null or columns array is empty: render footer without
    navigation columns. Talent CTA and bottom bar still render.

-   talentNetworkCta is null: hide the Talent Network section entirely.

-   A column has zero links: hide that column. Do not render a heading
    with no links.

**13. Global States, Error Handling, and Edge Cases**

Cross-cutting UI states and error handling that apply to the entire home
page.

*User Stories: HP-031, HP-032, HP-033, HP-034, HP-035, HP-036*

**13.1 Full-Page Loading State**

-   On initial page load (SSR or client hydration), render skeleton
    placeholders for the hero, first section, and navigation bar.

-   Skeletons should match the expected layout dimensions to prevent
    cumulative layout shift (CLS).

-   Below-the-fold sections lazy-load and show skeletons as they enter
    the viewport.

**13.2 Full-Page Error States**

  ---------------- ------------------------------------- ----------------
  **State**        **Behavior**                          **Trigger**

  API 404          Full-page message: "This page isn't   GET
                   available right now." Link: "Browse   /api/homepage
                   categories" pointing to /c. No retry  returns 404
                   button.                               

  API 500          Full-page message: "Something went    GET
                   wrong. Please try again." Button:     /api/homepage
                   "Retry" triggers a re-fetch.          returns 5xx

  Network Error    If stale cached page available: show  Fetch fails due
                   cached page with a subtle "You're     to network
                   viewing a cached version" banner. If  
                   no cache: show same error as 500.     
  ---------------- ------------------------------------- ----------------

**13.3 Section-Level Suppression Rules**

These rules are applied server-side (sections with insufficient content
are excluded from the payload), but the frontend must also handle edge
cases where items arrive empty:

-   Carousel sections: if items.length === 0, suppress the section (no
    heading, no carousel).

-   Grid sections: if items.length === 0, suppress the section.

-   More Categories: if moreCategoriesList.length === 0, suppress the
    section.

-   Hero: if hero is null, suppress. First section moves up.

-   Banner: if banner is null or banner.enabled is false, suppress. No
    space reserved.

-   Footer nav: if footerNav.columns is empty, render footer without nav
    columns. Footer always renders (bottom bar with copyright/legal is
    always present).

**13.4 SEO and Metadata**

-   Set \<title\> to seo.metaTitle.

-   Set \<meta name=\"description\"\> to seo.metaDescription.

-   Set \<link rel=\"canonical\"\> to seo.canonical.

-   Set Open Graph tags: og:title, og:description, og:image from seo
    fields.

-   If seo.noindex is true (preview mode), add \<meta name=\"robots\"
    content=\"noindex\"\>.

-   If seo fields are missing, fall back to SiteSettings defaults
    (defaultSeoTitle, defaultSeoDescription).

**13.5 Responsive Breakpoints**

  --------------------- -------------------------------------------------
  **Breakpoint**        **Layout Behavior**

  **Desktop (1200px+)** Nav: full horizontal. Hero: full-width. Grids: 3
                        columns. Carousels: 4 cards. Categories: 3
                        columns. Footer: 4 columns.

  **Tablet              Nav: may collapse to hamburger. Grids: 2 columns.
  (768--1199px)**       Carousels: 2 cards visible. Categories: 2
                        columns. Footer: 2 columns.

  **Mobile (\<768px)**  Nav: hamburger menu. Grids: 1 column. Carousels:
                        1 card visible (swipe enabled). Categories: 1
                        column. Footer: stacked/accordion.
  --------------------- -------------------------------------------------

**13.6 A/B Testing Behavior**

The frontend does not implement A/B test assignment logic --- it is
handled server-side. However, the frontend must:

-   Accept and store the mktq_hp_variant cookie set by the API response.

-   Send the mktq_hp_variant cookie on all subsequent homepage API
    requests.

-   Render whatever homepage payload the API returns. The frontend does
    not differentiate between default and test variants --- it renders
    the payload identically regardless of which variant it represents.

-   If the API response includes a Set-Cookie header for variant
    assignment, the frontend must not override or clear it.

**13.7 Image Loading and Fallback**

  --------------------- -------------------------------------------------
  **Scenario**          **Behavior**

  **Image loads         Render normally
  successfully**        

  **Image is loading**  Show placeholder (gray rectangle matching
                        dimensions)

  **Image URL returns   Show fallback placeholder image. Do not show
  4xx/5xx**             broken image icon.

  **Image URL is        Show fallback placeholder image.
  null/undefined**      

  **Hero background     Render hero with solid brand-color background.
  image fails**         Text and CTA still display.

  **Category tile icon  Render default category placeholder icon.
  fails**               

  **Listing thumbnail   Render default listing placeholder image.
  fails**               

  **Avatar image        Render default avatar circle with user initial.
  fails**               
  --------------------- -------------------------------------------------

**13.8 Performance Expectations**

-   First Contentful Paint (FCP): hero and nav render within the SSR
    response.

-   Largest Contentful Paint (LCP): hero background image. Must be
    eagerly loaded with high priority.

-   Cumulative Layout Shift (CLS): zero shifts. Skeleton dimensions must
    match final content dimensions.

-   Below-the-fold images: lazy loaded with native loading=\"lazy\"
    attribute.

-   Carousel images beyond the visible set: lazy loaded. Only the first
    visible set should eagerly load.

**14. Component Inventory**

Summary of all frontend components required for the home page, with
their reuse context.

  ----------------------- --------------------- ------------------- --------------
  **Component**           **Purpose**           **Reuse Context**   **Stories**

  **PromotionalBanner**   Notification bar      Home page only      HP-034
                          overlay above hero    (global overlay)    

  **HeroSection**         Full-width hero with  Home page (per      HP-005--007
                          background, headline, homepage entry)     
                          CTA                                       

  **SectionRenderer**     Generic section       All content         HP-008--020
                          wrapper: title,       sections            
                          subtitle, CTA, child                      
                          content                                   

  **CarouselContainer**   Horizontal scroll     Favorites, Themed   HP-008, HP-016
                          with arrow            Carousels           
                          navigation, terminal                      
                          card                                      

  **GridContainer**       Multi-row responsive  Newest, Most        HP-010, HP-012
                          grid                  Popular             

  **ProjectCard**         Listing card for      All sections with   HP-017
                          project-type items    projects            

  **ServiceCard**         Listing card for      Marketing           HP-018
                          service-type items    Automation, mixed   
                                                sections            

  **CardSkeleton**        Loading placeholder   All sections during HP-036
                          matching card         load                
                          dimensions                                

  **FilterTabBar**        Horizontal tabs with  Most Popular        HP-012, HP-014
                          active state          section             

  **CategoryTile**        Tile with icon, name, More Categories     HP-021
                          browse button         section             

  **TerminalCard**        End-of-carousel link  Carousels at max    HP-008, HP-016
                          card                  scroll depth        

  **FooterNavColumn**     Column of labeled     Footer              HP-028
                          links                                     

  **TalentNetworkCta**    CTA block with        Footer              HP-029
                          headline,                                 
                          description, button                       

  **FooterBottomBar**     Copyright, legal      Footer              HP-030
                          links, back-to-top                        

  **ErrorPage**           Full-page error with  API failure states  HP-004
                          message and action                        
  ----------------------- --------------------- ------------------- --------------
