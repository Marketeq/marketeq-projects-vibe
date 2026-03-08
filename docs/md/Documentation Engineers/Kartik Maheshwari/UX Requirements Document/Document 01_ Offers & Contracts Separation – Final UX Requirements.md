# **Document 01: Offers & Contracts Separation -- Final UX Requirements**

**Description:\**
This document defines the complete and unambiguous UX behavior
requirements for separating Offers and Contracts into two independent
systems with distinct screens, role-based visibility, lifecycle
independence, and marketplace-to-contract conversion behavior. This
document excludes UI styling and technical implementation details.

# **1. Purpose**

To formally define:

- The behavioral separation between Offers and Contracts

- Role-based access and visibility rules

- Lifecycle independence

- Marketplace publishing behavior

- Offer-to-Contract conversion flow

- Team availability logic

- Filtering, sorting, and listing consistency

- Validation and error handling behavior

This document is authoritative and contains no optional or undefined
behaviors.

# **2. Entity Definitions**

## **2.1 Offer (Marketplace Listing)**

An Offer is a marketing listing published to the marketplace by a Talent
account.

An Offer:

- Is editable by Talent

- Can be published or unpublished

- Can be archived

- Displays only available team members

- Can generate unlimited Contracts

- Remains in the marketplace after purchase

- Is not modified by Contract lifecycle changes

## **2.2 Contract (Execution Agreement)**

A Contract is a work agreement created when a Client purchases an Offer.

A Contract:

- Is generated from an Offer

- Has its own lifecycle

- Has assigned team members

- Contains project phases

- Contains milestones

- Is visible to Client and assigned Talent

- Is independent from Offer publishing state

# **3. Role-Based Navigation Requirements**

## **3.1 Talent Role Sidebar**

Must include:

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

Offers must only exist in Talent role.

## **3.2 Client Role Sidebar**

Must include:

- Home

- My Contracts

- My Jobs

- My Team

- Stats & Trends

- Profile

- Inbox

- Notifications

- Settings

Clients must not see Offers.

## **3.3 Role Isolation**

- A user may operate in only one role at a time.

- Switching roles re-renders navigation.

- No shared Offer visibility between roles.

- Client cannot access Offer URLs directly.

- Unauthorized access must redirect to dashboard with explanatory
  notification.

# **4. My Offers Screen (Talent Only)**

## **4.1 Listing Requirements**

Each Offer must display:

- Title (maximum two lines, truncated)

- Offer Type (Project or Service)

- Status badge

- Last Updated timestamp (relative format)

- Team avatar stack with overflow count (+X)

- Number of associated active Contracts

## **4.2 Offer Statuses**

Offer statuses are limited to:

- Draft

- Pending (not published)

- Active (Published)

- Archived

Offer status must not change automatically due to Contract lifecycle
changes.

## **4.3 Filtering Requirements**

Filters must support:

- All Offers

- Offer Type (Project / Service)

- Status (Active / Pending / Archived)

- Created by Me

- Shared With Me

Filters must:

- Allow multi-select where applicable

- Persist during session

- Include "Clear All" functionality

## **4.4 Sorting Requirements**

Sorting must include:

- Recently Created

- Oldest First

- A--Z

- Z--A

- Last Modified

- Last Published

## **4.5 Search Behavior**

Search must:

- Be instant (debounced)

- Support partial matching

- Be case-insensitive

- Search title, category, and skills

## **4.6 Empty State**

If no Offers exist:

- Display message prompting creation

- Provide "New Offer" call to action

# **5. Offer Management Requirements**

## **5.1 Editable Fields**

Talent must be able to:

- Edit title

- Edit description

- Edit pricing

- Edit deliverables

- Manage team members

- Publish

- Unpublish

- Archive

Clients must not have access to any Offer editing functionality.

## **5.2 Publishing Validation Rules**

Offer cannot be published unless:

- Pricing is defined

- Scope/deliverables are defined

- At least one available team member is assigned

Validation must:

- Be inline

- Prevent publishing until resolved

- Clearly indicate missing requirements

# **6. Team Availability Rules**

## **6.1 Marketplace Display Logic**

When Offer is Active:

- Only available team members are displayed publicly.

- If a team member becomes unavailable:

  - They must be removed from public display automatically.

  - Talent must see a warning notification.

If zero team members are available:

- Offer remains Active.

- Purchase action must be disabled.

- Offer must display "Temporarily Unavailable" state.

## **6.2 Team Replacement**

Replacing team members is allowed in Offer management.

Team replacement workflow itself is out of scope.

# **7. Offer to Contract Conversion**

## **7.1 Purchase Behavior**

When a Client purchases an Offer:

- A new Contract must be created.

- The Offer must remain Active in the marketplace.

- Offer status must not change.

- Offer must increment Contract count.

## **7.2 Relationship Model**

- One Offer may generate unlimited Contracts.

- Each Contract must reference the originating Offer.

- Each Contract must store a snapshot of assigned team members at time
  of purchase.

## **7.3 Team Assignment at Purchase**

If assigned team members are available:

- They must be auto-assigned to the Contract.

If assigned team members are unavailable:

- Contract must still be created.

- Contract must enter "Pending Team Assignment" state.

- Client must replace team members (separate process).

# **8. My Contracts Screen (Client & Talent)**

## **8.1 Listing Requirements**

Each Contract must display:

- Project Name

- Team avatar stack

- Status badge

- Current phase

- Last updated timestamp

- Next milestone (sortable field)

## **8.2 Contract Statuses**

Allowed statuses:

- Active

- Paused

- Completed

- Canceled

## **8.3 Filtering Requirements**

Must support filtering by:

- Status

- Team

- Phase

- Date Updated

## **8.4 Sorting Requirements**

Must include:

- Recently Updated

- Next Milestone

- A--Z

## **8.5 Empty States**

For Talent:

- "No contracts generated yet. Publish offers to start receiving
  contracts."

For Client:

- "Browse Marketplace Offers to start a project."

# **9. Lifecycle Independence Rules**

- Contract completion must not archive or unpublish Offer.

- Offer archiving must not cancel Contracts.

- Offer unpublishing must not affect existing Contracts.

- Contract cancellation must not change Offer status.

- Contract lifecycle must be independent from marketplace visibility.

# **10. Permission Matrix**

## **10.1 Talent**

Allowed:

- Create Offer

- Edit Offer

- Publish/Unpublish Offer

- Archive Offer

- View Contracts they are assigned to

Not Allowed:

- Purchase own Offer

## **10.2 Client**

Allowed:

- View Contracts

- Purchase Offers

Not Allowed:

- Edit Offers

- Publish Offers

- Archive Offers

- Access Offer management screens

# **11. Error Handling Requirements**

## **11.1 Publishing Errors**

- Inline validation

- Blocking behavior

- Clear field-level messaging

## **11.2 Purchase Errors**

If team unavailable during purchase:

- Show blocking notification

- Provide resolution path

- Prevent silent failure

## **11.3 Unauthorized Access**

If Client accesses Offer URL:

- Redirect to dashboard

- Display explanatory notification

If Talent attempts restricted action:

- Disable action

- Provide explanation

# **12. Display Consistency Requirements**

Must maintain:

- Status badges

- Relative timestamps

- Avatar stacking with overflow indicator

- Two-line title truncation

- Filter state persistence during session

- Clear separation of Created by Me / Shared With Me

# **13. Edge Case Requirements**

1.  Offer archived with active Contracts:

    - Allowed.

    - Contracts remain active.

    - Offer removed from marketplace.

2.  Offer unpublished with active Contracts:

    - No new purchases.

    - Contracts unaffected.

3.  Team member removed after Contract creation:

    - Contract remains unchanged.

4.  Multiple simultaneous Contracts from one Offer:

    - Fully supported.

# **14. Prohibited Behaviors**

The system must never:

- Auto-remove Offer after purchase.

- Auto-modify Offer due to Contract lifecycle.

- Allow Client to edit Offer.

- Display marketplace editing controls inside Contract.

- Merge Offer and Contract into one entity.

- Share Offer visibility with Client role.

# **Final Statement**

This document defines the complete and final UX behavior requirements
for the separation of Offers and Contracts. All behaviors described
herein are mandatory and unambiguous. No additional implicit behaviors
are permitted outside of this specification
