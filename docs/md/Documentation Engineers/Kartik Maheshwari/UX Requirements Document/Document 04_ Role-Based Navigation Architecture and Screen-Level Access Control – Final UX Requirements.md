# **Document 04: Role-Based Navigation Architecture and Screen-Level Access Control -- Final UX Requirements**

**Description:\**
This document defines the complete and authoritative UX requirements
governing role-based navigation architecture, screen-level access
control, entity visibility boundaries, cross-role isolation, and
navigation state behavior for the separation of Offers and Contracts.
This document ensures strict structural separation between Talent and
Client experiences and prohibits any unauthorized cross-entity exposure.
This document excludes UI styling and technical implementation details.

# **1. Purpose**

To formally define:

- Sidebar structure for each role

- Screen-level visibility rules

- Navigation isolation between roles

- Direct URL access restrictions

- Cross-entity access prevention

- Listing segregation between Offers and Contracts

- Session-based navigation persistence rules

This document governs structural UX architecture only.

# **2. Role-Based Navigation Structure**

## **2.1 Talent Navigation (Authoritative Structure)**

The Talent sidebar must include:

- Home

- Find Jobs

- My Offers

- My Contracts

- My Jobs

- Reports

- Profile

- Inbox

- Notifications

- Settings

### **Mandatory Rules:**

- "My Offers" must exist only in Talent role.

- "My Contracts" must exist in Talent role.

- Talent must never see Client-only navigation items:

  - My Team

  - Stats & Trends

## **2.2 Client Navigation (Authoritative Structure)**

The Client sidebar must include:

- Home

- My Contracts

- My Jobs

- My Team

- Stats & Trends

- Profile

- Inbox

- Notifications

- Settings

### **Mandatory Rules:**

- Client must not see "My Offers."

- Client must not see Offer management entry points.

- Client must not see Offer publishing controls.

# **3. Role Isolation Requirements**

## **3.1 Single Active Role Rule**

- A user may only operate in one role at a time.

- Navigation must render according to active role.

- Role switching must re-render full navigation state.

- No mixed-role sidebar items permitted.

## **3.2 Cross-Role Visibility Prohibition**

The system must never:

- Display Offer listings to Client role.

- Display Offer editing controls to Client role.

- Display Offer publishing controls to Client role.

- Display Client-only analytics to Talent role.

- Display My Team or Stats & Trends to Talent role.

# **4. Screen-Level Access Governance**

## **4.1 Offer Screens**

Offer screens include:

- My Offers listing

- Offer detail view

- Offer edit view

- Publish / Unpublish controls

- Archive controls

### **Access Rules:**

- Accessible only to Talent.

- Client attempting access must be redirected.

- Redirection must include explanatory notification.

- No silent failure permitted.

## **4.2 Contract Screens**

Contract screens include:

- My Contracts listing

- Contract detail view

- Phase and milestone views

### **Access Rules:**

- Accessible to:

  - Client (contract owner)

  - Assigned Talent

- Must not be accessible to unrelated users.

- Contract editing must not expose Offer marketing content.

# **5. Direct URL Access Enforcement**

## **5.1 Unauthorized Offer URL Access**

If Client attempts direct access to:

- Offer listing

- Offer detail

- Offer edit

- Offer publishing

System must:

- Block access.

- Redirect to dashboard.

- Display explanatory notification.

## **5.2 Unauthorized Contract URL Access**

If user attempts to access a Contract they are not assigned to or do not
own:

- Access must be blocked.

- Redirect to appropriate dashboard.

- Display explanatory notification.

# **6. Navigation State Persistence**

## **6.1 Sidebar Persistence**

- Sidebar must remain visible across screens within role.

- Active menu item must reflect current screen.

- Role switch must reset active state to role-specific Home.

## **6.2 Filter and Sort Persistence**

Within each entity (Offers or Contracts):

- Filter state must persist during session.

- Sort selection must persist during session.

- State must reset upon logout.

- Offer filter state must not influence Contract filter state.

- Contract filter state must not influence Offer filter state.

# **7. Entity Boundary Enforcement**

## **7.1 Offer--Contract Separation**

Navigation must enforce:

- Offers and Contracts exist as separate top-level sections.

- Offers must never appear inside Contract listing.

- Contracts must never appear inside Offer listing.

- No combined Offer--Contract screen permitted.

## **7.2 Lifecycle Isolation in Navigation Context**

Navigation must not:

- Automatically navigate away from Offer screen after purchase.

- Remove Offer from listing after Contract creation.

- Redirect user due to Contract lifecycle change.

- Modify Offer navigation visibility due to Contract status.

# **8. Multi-Entity Listing Segregation**

## **8.1 Offers**

- Displayed only under "My Offers."

- Must include Created by Me and Shared With Me segmentation.

## **8.2 Contracts**

- Displayed only under "My Contracts."

- Must include only contracts user has legitimate access to.

No cross-list embedding permitted.

# **9. Action Visibility Rules**

## **9.1 Offer Actions**

Visible only to Talent:

- Edit

- Publish

- Unpublish

- Archive

These actions must not be visible to Client.

## **9.2 Purchase Action**

Visible only to Client in marketplace context.

Must not be visible to:

- Talent role

- Offer owner

If Talent views own Offer:

- Purchase must be disabled.

- Explanation required.

# **10. Prohibited Navigation Behaviors**

The system must never:

- Combine Offer and Contract into single navigation item.

- Display Offer editing controls inside Contract.

- Display Contract execution controls inside Offer.

- Auto-redirect user due to Offer status change.

- Auto-redirect user due to Contract lifecycle change.

- Display both Talent and Client sidebar items simultaneously.

- Allow Client to navigate to Offer management through indirect links.

# **11. Edge Case Governance in Navigation Context**

## **11.1 Offer Archived with Active Contracts**

- Offer removed from marketplace.

- Remains visible in My Offers (Talent).

- Contracts remain visible in My Contracts.

- No navigation restructuring permitted.

## **11.2 Offer Unpublished**

- Removed from marketplace.

- Remains visible in My Offers.

- Contracts remain visible.

- No navigation impact to Contracts.

## **11.3 Multiple Contracts from Single Offer**

- Each Contract appears independently in My Contracts.

- No grouping by Offer in navigation.

- No cross-navigation collapse.

# **12. Governance Finality**

All role-based navigation, screen access, and entity visibility
behaviors defined in this document are mandatory and non-negotiable.

No implicit access pathways, mixed-role navigation states, or
cross-entity blending is permitted.

This document establishes strict structural separation between:

- Offer management (Talent-only marketing system)

- Contract execution (Client--Talent operational system)

This specification is final and authoritative.
