**Marketeq Home Page**

Backend Feature Specification

*Comprehensive feature list for user stories, acceptance criteria, and
frontend technical documentation*

Document Version: 1.0

Date: April 4, 2026

Scope: Home Page Service Only

**Table of Contents**

**1. Document Purpose**

This document provides a detailed inventory of every feature visible on
the Marketeq home page as captured in the Home Page design PDF. Each
feature is described in terms of its core capabilities, user-facing
behavior, component states, data requirements, and the backend workflows
needed to support it.

The intended audience is product managers, frontend developers, and
backend engineers who need to derive user stories, acceptance criteria,
and technical specs from this feature list. Other microservices are
referenced only when their behavior creates a direct requirement for the
home page.

**2. Global Navigation Bar**

The persistent top navigation bar appears across the full width of the
page and provides primary wayfinding, search access, wallet display, and
user identity controls.

**2.1 Logo and Brand Mark**

-   **Display:** Marketeq logo positioned at the far left of the
    navigation bar

-   **Behavior:** Clicking the logo navigates to the home page (current
    page) or refreshes it if already on the home page

-   **Requirement:** Logo asset must be served from CDN or embedded as
    an SVG for instant rendering

**2.2 Primary Category Navigation Tabs**

A horizontal row of category tabs immediately below or beside the logo,
providing one-click access to the major service verticals.

**Visible Categories**

-   Research

-   Design

-   Development

-   Testing

-   Security

-   Maintenance

-   Digital Marketing

**Behavior and States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Tab label displayed in standard weight and neutral
                     color

  **Hover**          Tab label receives visual emphasis (underline, color
                     shift, or background highlight)

  **Active**         Currently selected category is visually distinct
                     (bold weight, accent underline, or filled
                     background)
  ------------------ ----------------------------------------------------

**Capabilities**

-   **Navigation:** Each tab click filters the home page content or
    navigates to a dedicated category landing page

-   **Data Dependency:** The list of categories must be fetched from the
    backend so that adding, removing, or reordering categories does not
    require a frontend deploy

-   **Active State Persistence:** The active tab should reflect the
    current page context if the user arrived via deep link

**2.3 Search Bar**

A prominent search input centered in the navigation bar, enabling users
to find projects, services, and talent by keyword.

**Visible UI**

-   **Placeholder Text:** \"Search by skills or project type\"

-   **Category Filter Dropdown:** A dropdown selector labeled
    \"Category\" to the left of or inside the search field, allowing the
    user to scope the search to a specific vertical

**Behavior and States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Search field shows placeholder text; category
                     dropdown shows default label

  **Focused**        Input border highlights; cursor appears; placeholder
                     may fade or shift

  **Typing**         Autocomplete suggestions appear below the input in
                     real time as the user types

  **Disabled**       Shown in the design PDF; input is non-interactive
                     (grayed out, no cursor on click)
  ------------------ ----------------------------------------------------

**Capabilities**

-   **Autocomplete / Typeahead:** As the user types, the system returns
    ranked suggestion results with low latency; results should include
    project names, skill tags, and category hints

-   **Category Scoping:** The selected category value is sent alongside
    the search query to narrow results to a single vertical

-   **Submit Behavior:** Pressing Enter or clicking a search icon
    triggers a full search and navigates to a results page

-   **Backend Dependency:** Requires the autocomplete-service for
    typeahead and the algolia-service for full search execution

**2.4 Wallet / Balance Display**

A persistent display of the authenticated user's current account
balance, shown in the top-right area of the navigation bar.

**Visible UI**

-   **Format:** Currency symbol followed by formatted amount and
    currency code (e.g., \"\$1,540 USD\")

**Capabilities**

-   **Real-Time Balance:** The displayed amount must reflect the user's
    current wallet balance, fetched on page load and optionally updated
    via real-time subscription

-   **Currency Formatting:** The value must be formatted according to
    the user's locale and currency preference

-   **Authentication Gate:** This element is only visible to
    authenticated users; unauthenticated visitors see a login/signup
    prompt instead

-   **Backend Dependency:** Requires user-service or a dedicated
    wallet/billing endpoint to return the current balance

**2.5 User Identity and Profile Menu**

Displays the authenticated user's name and email, along with team
membership context.

**Visible UI**

-   **User Name:** Full name of the logged-in user (e.g., \"Christopher
    Torres\")

-   **Email:** The user's registered email address displayed below the
    name

-   **Team Context:** A label indicating team size (e.g., \"You
    currently have 10 team members\")

**Capabilities**

-   **Profile Data Fetch:** On page load, retrieve the user's profile
    including name, email, and team member count

-   **Dropdown / Flyout:** Clicking the profile area should open a
    dropdown with links to account settings, team management, and logout

-   **Backend Dependency:** Requires user-service for profile data; team
    count may come from invitations-service or a team membership
    endpoint

**2.6 Quick-Access Sidebar Links**

Two sidebar-style navigation shortcuts visible in the top navigation
area.

-   My Favorites -- Navigates to the user's saved/favorited items

-   My Dashboard -- Navigates to the user's personal dashboard

**Capabilities**

-   **Authentication Required:** Both links are visible only to
    authenticated users

-   **Badge / Count:** Optionally display an unread count or total saved
    items badge on My Favorites

**3. Hero Section -- UX/UI Experts on Demand**

A full-width promotional banner positioned immediately below the
navigation bar, designed to drive engagement with the talent
marketplace.

**3.1 Visible UI**

-   **Headline:** \"UX / UI Experts on Demand\"

-   **Subheadline:** \"Get your UX/UI done right with one of our product
    design experts, fully customizable done for you services.\"

-   **CTA Button:** \"Browse UX / UI Experts\"

-   **Background:** Full-width hero image showing a workspace/laptop
    scene

**3.2 Button States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Button displayed with standard fill color and label
                     text

  **Hover**          Button receives visual feedback (color shift,
                     shadow, or slight scale)
  ------------------ ----------------------------------------------------

**3.3 Capabilities**

-   **CTA Navigation:** Clicking the button navigates to a filtered
    talent browse page scoped to UX/UI experts

-   **Dynamic Content Potential:** The hero headline, subheadline, CTA
    label, CTA destination, and background image should be configurable
    from the backend or CMS so marketing can rotate hero content without
    code changes

-   **Responsive Layout:** The hero section must scale gracefully across
    desktop, tablet, and mobile viewports

-   **Backend Dependency:** If dynamic, requires a CMS endpoint (Payload)
    or a home-page-config endpoint that returns the current hero content
    payload

**4. Our Favorite Projects Section**

A curated horizontal carousel showcasing editorially selected projects.
This section highlights premium or featured listings to drive user
engagement.

**4.1 Section Header**

-   **Title:** \"Our Favorite Projects\"

-   **Navigation Arrow:** A right-facing chevron/arrow to the right of
    the section, enabling horizontal scroll or carousel advancement

**4.2 Project Card -- Data Fields**

Each card displays the following data points, all of which must be
supplied by the backend:

-   **Project Thumbnail:** A visual image representing the project

-   **Project Title:** The name of the project (e.g., \"The Ultimate
    Mobile App Experience\")

-   **Rating:** Numeric rating with review count (e.g., \"4.9 (5)\")

-   **Description:** A brief text summary of the project scope

-   **Timeline:** Estimated duration (e.g., \"Starting from 12 weeks\")

-   **Budget:** Estimated or starting budget (e.g., \"\$50,000 budget\")

-   **Team Avatars:** Stacked avatar images showing assigned team
    members with an overflow indicator (e.g., \"+5\")

**4.3 Carousel Behavior and States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        First set of cards visible; right arrow enabled;
                     left arrow hidden or disabled

  **Scrolled**       Cards slide horizontally; both arrows active if more
                     cards exist in either direction

  **End of List**    Right arrow disabled or hidden when the last card is
                     visible
  ------------------ ----------------------------------------------------

**4.4 Capabilities**

-   **Curated List:** The backend must support a concept of "favorite"
    or "featured" projects, editorially selected by admins and returned
    as an ordered list

-   **Horizontal Scroll / Carousel:** The frontend renders cards in a
    scrollable horizontal container with arrow navigation

-   **Card Click Navigation:** Clicking any card navigates to that
    project's detail page

-   **Lazy Loading:** Cards beyond the visible viewport should be
    lazy-loaded for performance

-   **Backend Endpoint:** A dedicated endpoint that returns the ordered
    list of featured project IDs with all card-level data pre-joined
    (title, rating, description, timeline, budget, team members)

-   **Backend Dependency:** Primarily listings-service for project data;
    favorites-service or an admin curation flag to mark projects as
    featured

**5. Newest Additions Section**

A grid-based section displaying the most recently added projects on the
platform. This section surfaces fresh inventory to returning users.

**5.1 Section Header**

-   **Title:** \"Newest Additions\"

-   **View More CTA:** A \"View More\" link/button at the top-right of
    the section header

**5.2 Project Card -- Data Fields**

Each card in this section displays:

-   **Project Thumbnail:** Visual representation of the project

-   **Project Title:** Full project name

-   **Description:** Multi-line text summary of the project

-   **Timeline:** Starting duration estimate (e.g., \"Starting at 2
    weeks\", \"Starting at 12 weeks\", \"Starting at 4 months\")

-   **Price:** Explicit dollar amount displayed prominently (e.g.,
    \"\$25,996\", \"\$51,457\", \"\$44,024\")

**5.3 Layout**

The design shows a multi-row grid layout with 3 cards per row, totaling
9 visible project cards. A \"View More\" button at the bottom loads
additional results.

**5.4 View More Button States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Button displayed with outline or secondary styling

  **Hover**          Button receives hover feedback (fill, border color
                     change)
  ------------------ ----------------------------------------------------

**5.5 Capabilities**

-   **Sort by Creation Date:** The backend must return projects sorted
    by newest first (descending creation timestamp)

-   **Pagination / Load More:** Clicking \"View More\" loads the next
    page of results, appending to the existing grid or navigating to a
    full listing page

-   **Price Display:** Unlike the Favorites section which shows
    \"budget,\" this section shows actual price, suggesting a different
    data field or pricing model

-   **Grid Layout:** 3-column responsive grid that adapts to viewport
    width

-   **Backend Endpoint:** An endpoint that returns recently created
    listings with pagination support, including title, description,
    timeline, price, and thumbnail

-   **Backend Dependency:** listings-service sorted by created_at DESC
    with limit/offset pagination

**6. Most Popular Projects Section**

A tabbed, filterable section that showcases the most popular projects
across different verticals. Users can switch between category tabs to
view popular projects within each domain.

**6.1 Section Header**

-   **Title:** \"Most Popular Projects\"

-   **View More CTA:** A \"View More\" link at the top-right

**6.2 Category Filter Tabs**

Horizontal tabs that filter the displayed projects by vertical:

-   View all

-   Top Web projects

-   Top mobile projects

-   Top Cloud projects

-   Top digital marketing projects

**6.3 Tab States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Tab label in neutral text color, no background

  **Hover**          Tab receives subtle hover highlight

  **Active**         Selected tab has a filled background or underline
                     accent, bold text
  ------------------ ----------------------------------------------------

**6.4 Project Card -- Data Fields**

Same card format as the Newest Additions section: thumbnail, title,
description, timeline, and price.

**6.5 Layout**

Same 3-column grid as Newest Additions, with 9 visible cards. The grid
content changes when the user selects a different tab.

**6.6 Capabilities**

-   **Category Filtering:** Each tab sends a category filter parameter
    to the backend, which returns only projects matching that vertical

-   **\"View all\" Default:** The default tab shows popular projects
    across all categories

-   **Popularity Ranking:** The backend must support a popularity sort
    (based on views, purchases, ratings, or a composite score)

-   **Tab State Management:** The frontend must track which tab is
    active, re-fetch or filter data accordingly, and reflect the active
    state visually

-   **Pagination:** \"View More\" loads additional popular projects
    within the selected category

-   **Backend Endpoint:** An endpoint that accepts a category filter and
    sort-by-popularity parameter, returning paginated project listings

-   **Backend Dependency:** listings-service with a popularity score
    field and category taxonomy

**7. Themed Project Carousel Sections**

The home page features multiple horizontal carousel sections, each
themed around a specific solution category. All carousels share
identical card structure and interaction patterns but display different
content based on their theme.

**7.1 Carousel Sections Identified**

**7.1.1 Online Sales Funnels**

-   **Subtitle:** \"Connect Referrizer with your favorite ecommerce
    shopping carts\"

-   **CTA:** \"View more projects\"

-   **Card Type:** Standard project card (thumbnail, title, rating,
    description, timeline, budget, team avatars)

**7.1.2 Customer Service Solutions**

-   **Subtitle:** \"Improve support issues and customer satisfaction
    with these customer service projects\"

-   **CTA:** \"View More Projects\"

-   **Card Type:** Standard project card

**7.1.3 Marketing Automation Campaigns**

-   **Subtitle:** \"Improve support issues and customer satisfaction
    with these customer service projects\"

-   **CTA:** \"Close More Services\" (likely \"View More Services\")

-   **Card Type:** Service card -- differs from project cards

Key difference: Marketing Automation Campaigns displays service-type
cards with monthly pricing (\"\$5,000/month\") instead of project budget
and timeline. Each card also shows a service category tag row (\"Service
\| Service \| Service \| Service\").

**7.1.4 Cloud Software Applications**

-   **Subtitle:** \"Improve support issues and customer satisfaction
    with these customer service projects\"

-   **CTA:** \"View More Projects\"

-   **Card Type:** Standard project card

**7.1.5 Mobile Applications**

-   **Subtitle:** \"Get your mobile app built by experts and ready to
    meet and exceed your market objectives\"

-   **CTA:** \"View More Projects\"

-   **Card Type:** Standard project card

**7.2 Shared Card Structure -- Project Cards**

All project-type carousels display 4 cards in a single horizontal row
with the following fields:

-   **Thumbnail:** Project image

-   **Title:** Project name

-   **Rating:** Star rating with review count

-   **Description:** Brief text summary

-   **Timeline:** Duration estimate (e.g., \"Starting from 12 weeks\")

-   **Budget:** Budget range (e.g., \"\$50,000 budget\")

-   **Team Avatars:** Stacked avatars with overflow count

**7.3 Service Card Structure (Marketing Automation Only)**

The Marketing Automation section uses a different card format:

-   **Thumbnail:** Service image

-   **Category Tags:** Row of category/service labels

-   **Title:** Service name

-   **Rating:** Star rating with review count

-   **Description:** Brief text summary

-   **Monthly Price:** Recurring price displayed as \"\$X,XXX/month\"

-   **Team Avatars:** Stacked avatars with overflow count

**7.4 Capabilities Shared Across All Carousels**

-   **Category-Scoped Data:** Each carousel fetches projects/services
    filtered by its theme category

-   **Horizontal Scroll:** 4 cards visible at a time; additional cards
    accessible via scroll or arrow controls

-   **CTA Navigation:** \"View More\" button navigates to the full
    category listing page

-   **Card Click Navigation:** Clicking a card opens the project or
    service detail page

-   **Two Card Types:** The backend must distinguish between project
    listings (budget + timeline) and service listings (monthly recurring
    price)

-   **Backend Endpoint:** An endpoint that returns listings filtered by
    category and listing type (project vs. service)

-   **Backend Dependency:** listings-service with category filtering and
    listing_type differentiation

**8. More Categories Section**

A visual grid of category tiles at the bottom of the main content area,
providing an alternative browsing path for users who want to explore by
technology or discipline.

**8.1 Section Header**

-   **Title:** \"More Categories\"

-   **Subtitle:** \"Find more ways to maximize your results with
    Marketeq's curated project teams\"

-   **CTA:** \"View All Categories\" link at the top-right

**8.2 Category Tiles**

Each tile displays:

-   **Category Name:** The category title (e.g., \"Cloud Security\")

-   **Illustration:** A thematic icon or illustration representing the
    category

-   **CTA Button:** \"Browse Projects\" button on each tile

**8.3 Categories Shown**

-   Cloud Security

-   Interaction Design

-   Artificial Intelligence

-   Big Data Analytics

-   Blockchain Development

-   Ecommerce Platforms

**8.4 Browse Projects Button States**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Button shown with outline/secondary style

  **Hover**          Button receives hover feedback (fill, shadow, or
                     border color change)
  ------------------ ----------------------------------------------------

**8.5 Capabilities**

-   **Category Browsing:** Each tile's \"Browse Projects\" button
    navigates to a filtered listing page showing all projects within
    that category

-   **Dynamic Category List:** The visible categories and their order
    should be configurable from the backend so the merchandising team
    can feature different categories without frontend changes

-   **Illustration Assets:** Each category needs an associated
    illustration/icon asset stored and served from the backend or CDN

-   **Backend Endpoint:** An endpoint that returns the list of featured
    home page categories with name, slug, illustration URL, and sort
    order

-   **Backend Dependency:** listings-service category taxonomy or a
    dedicated CMS endpoint for home page category curation

**9. Global UI Component States**

The home page design PDF includes explicit state definitions for
reusable button components. These states apply across the entire page
wherever these button types appear.

**9.1 Primary CTA Buttons (e.g., \"Browse UX / UI Experts\", \"Browse
Projects\")**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Button displayed with filled background in brand
                     accent color, white text

  **Hover**          Background darkens or shifts shade; optional shadow
                     or scale increase
  ------------------ ----------------------------------------------------

**9.2 Secondary / Outline Buttons (e.g., \"View More\", \"View More
Services\")**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Button displayed with transparent/white background,
                     border in accent color, accent-colored text

  **Hover**          Background fills with accent color; text shifts to
                     white
  ------------------ ----------------------------------------------------

**9.3 Tab / Filter Buttons (e.g., category tabs in Most Popular)**

  ------------------ ----------------------------------------------------
  **State**          **Description**

  **Default**        Label in neutral text color, no background fill

  **Hover**          Subtle background highlight or text color shift

  **Active**         Filled background or underline; visually distinct
                     from unselected tabs
  ------------------ ----------------------------------------------------

**9.4 Disabled State**

Shown in the search bar design: when the search input or a related
control is disabled, it appears grayed out with reduced opacity and does
not respond to user interaction.

**10. Footer Section**

A full-width footer at the bottom of the page providing site-wide
navigation, company information, and a talent recruitment CTA.

**10.1 Navigation Columns**

**About**

-   Why Marketeq?

-   Careers

-   Partnerships

-   Support

-   Core Values

-   Events

**Solutions**

-   User Experience (UX)

-   Interactive Prototyping

-   Mobile Development

-   Software Engineering

-   Digital Marketing

-   Growth Strategy

-   Q/A Testing

**Industries**

-   Logistics

-   Retail

-   Government

-   Enterprise

-   Fintech

-   Medical

-   Marketing

**Resources**

-   Help Center

-   Video Library

-   Articles

-   Inspiration

-   Project Templates

-   PartnerUp Offers

**10.2 Marketeq Talent Network CTA**

-   **Headline:** \"Marketeq Talent Network\"

-   **Description:** \"Want the freedom of working from home without
    competing with overseas rates? Join our national talent network and
    get a chance to work on exciting projects from top corporations and
    disruptive startups.\"

-   **CTA Button:** \"Join the talent network\"

**Capabilities**

-   **CTA Navigation:** Clicking the button navigates to a talent
    application/signup page

-   **Backend Dependency:** May require invitations-service or
    user-service to handle talent signups

**10.3 Footer Bottom Bar**

-   **Copyright:** Copyright notice with year range

-   **Legal Links:** Terms & Conditions, Privacy Policy

-   **Back to Top:** A \"Back to Top\" link that smooth-scrolls to the
    page top

**11. Cross-Cutting Concerns**

These are capabilities and requirements that apply across multiple home
page features rather than belonging to any single section.

**11.1 Authentication-Dependent Rendering**

Several home page elements change based on whether the user is
authenticated:

-   **Authenticated:** Wallet balance visible, user profile/name shown,
    My Favorites and My Dashboard links present, team member count
    displayed

-   **Unauthenticated:** Login/signup prompts replace wallet and profile
    areas; My Favorites and My Dashboard links are hidden or redirect to
    login

**11.2 Real-Time Data Freshness**

-   **Wallet Balance:** Should update in real time or near-real time
    (Ably subscription or polling)

-   **New Listings:** The Newest Additions section should reflect newly
    published projects without requiring a full page refresh

-   **Ratings:** Project ratings and review counts should be current as
    of page load

**11.3 Performance and Loading**

-   **Above-the-fold Priority:** The navigation bar, hero section, and
    Our Favorite Projects should load first; lower sections should
    lazy-load

-   **Image Optimization:** All project thumbnails and hero images must
    be served in optimized formats with responsive sizing

-   **API Aggregation:** Given that the home page touches multiple data
    domains, the api-gateway should provide a single aggregated endpoint
    or use parallel fetching to minimize round trips

**11.4 SEO and Metadata**

-   **Page Title:** Configurable meta title for the home page

-   **Meta Description:** Configurable meta description

-   **Structured Data:** Schema.org markup for the project listings
    (Product or Service schema)

-   **Open Graph Tags:** For social media sharing

**11.5 Responsive Behavior**

The home page must adapt to desktop, tablet, and mobile viewports. Key
considerations:

-   **Navigation:** Collapses to a hamburger menu on mobile

-   **Carousels:** Reduce visible cards (4 on desktop, 2 on tablet, 1 on
    mobile)

-   **Grid Sections:** 3 columns on desktop, 2 on tablet, 1 on mobile

-   **Hero:** Image scales; text reflows; CTA remains prominent

**12. Backend Service Dependency Summary**

The following table summarizes which backend services are referenced by
home page features. These are not features of the home page itself but
external dependencies that must be available for the home page to
function correctly.

  -------------------------- ------------------------ -------------------------
  **Service**                **Home Page Feature**    **Dependency Type**

  **listings-service**       All project/service      Primary data source
                             cards, categories,       
                             pricing, timelines       

  **favorites-service**      Our Favorite Projects    Curation flags or list
                             curation                 

  **algolia-service**        Full-text search         Search on submit
                             execution                

  **autocomplete-service**   Search typeahead         Real-time suggestions
                             suggestions              

  **user-service**           Profile, wallet balance, Authenticated user data
                             team count               

  **api-gateway**            Request routing,         API entry point
                             aggregation              

  **invitations-service**    Talent Network signup    Signup/invite flow

  **Payload CMS**             Hero content, category   Editorial content
                             curation                 
  -------------------------- ------------------------ -------------------------

**13. Feature Summary Checklist**

A quick-reference checklist of all discrete features identified on the
home page, suitable for backlog grooming and sprint planning.

**Navigation and Global**

-   Logo click-to-home navigation

-   Primary category navigation tabs with active state

-   Search bar with placeholder, category filter dropdown, and
    autocomplete

-   Wallet/balance display for authenticated users

-   User profile display (name, email, team count)

-   My Favorites shortcut link

-   My Dashboard shortcut link

**Hero Section**

-   Full-width hero banner with headline, subheadline, and CTA

-   CTA navigates to filtered talent browse page

-   Dynamic/configurable hero content from CMS

**Our Favorite Projects**

-   Horizontal carousel of editorially curated project cards

-   Card data: thumbnail, title, rating, description, timeline, budget,
    team avatars

-   Arrow-based carousel navigation

**Newest Additions**

-   3-column grid of newest projects sorted by creation date

-   Card data: thumbnail, title, description, timeline, price

-   \"View More\" pagination

**Most Popular Projects**

-   Tabbed filtering by category (View All, Web, Mobile, Cloud, Digital
    Marketing)

-   3-column grid with popularity-ranked projects

-   Tab state management (Default, Hover, Active)

-   \"View More\" pagination within active tab

**Themed Carousels (5 sections)**

-   Online Sales Funnels -- project cards

-   Customer Service Solutions -- project cards

-   Marketing Automation Campaigns -- service cards with monthly pricing

-   Cloud Software Applications -- project cards

-   Mobile Applications -- project cards

**More Categories**

-   6 category tiles with illustrations and \"Browse Projects\" CTA

-   Dynamic category list from backend

**Footer**

-   4-column navigation (About, Solutions, Industries, Resources)

-   Talent Network recruitment CTA with signup button

-   Legal links (Terms, Privacy)

-   Back to Top functionality
