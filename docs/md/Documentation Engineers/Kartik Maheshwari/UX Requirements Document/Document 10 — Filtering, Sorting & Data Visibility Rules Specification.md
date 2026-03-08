# **Document 10 --- Filtering, Sorting & Data Visibility Rules Specification**

## **1. Purpose**

This document defines the behavioral rules governing:

- Filtering logic

- Sorting logic

- Data visibility constraints

- Role-based data exposure

- Object state visibility

- Cross-role data separation

- Edge cases related to filtering and sorting

This document ensures:

- Consistent data presentation across Offer and Contract screens

- Strict role-based data isolation

- No leakage of restricted information

- Predictable and deterministic filtering behavior

This document defines behavioral requirements only.

## **2. Scope**

This document covers:

- Filtering rules for Offers (Talent view)

- Filtering rules for Contracts (Talent and Client views)

- Sorting behavior for Offers and Contracts

- Search behavior rules

- Data visibility by role

- Data visibility by ownership

- Visibility impact of object states

- Edge cases related to empty states and restricted states

This document does NOT define:

- Search ranking algorithms

- UI layout of filters

- Pagination implementation

- Analytics dashboards

- Reporting metrics logic

# **3. Role-Based Data Visibility**

## **3.1 Talent Role**

Talent users may view:

- Offers they own

- Offers shared with them (based on permission rules)

- Contracts where they are assigned (based on permission rules)

Talent users may NOT view:

- Other Talent users' Offers

- Contracts where they are not assigned (unless Agency-level permissions
  allow, defined elsewhere)

- Client-specific financial data unless authorized

## **3.2 Client Role**

Client users may view:

- Published marketplace Offers (public view)

- Their own Contracts

Client users may NOT view:

- Offer management interface

- Draft Offers

- Unpublished Offers

- Archived Offers

- Other Clients' Contracts

- Internal Talent financial data

# **4. Offer Visibility Rules**

## **4.1 Draft Offers**

Visible to:

- Offer Owner

- Authorized shared collaborators

Not visible to:

- Clients

- Marketplace search

## **4.2 Published + Active Offers**

Visible to:

- All Clients in marketplace

- Offer Owner

- Authorized collaborators

Purchasable only if:

- At least one team member is available

## **4.3 Published but Temporarily Unavailable Offers**

Condition:

- Zero available team members

Visible to:

- Clients in marketplace

Not purchasable.

## **4.4 Unpublished Offers**

Visible only to:

- Offer Owner

- Authorized collaborators

Not visible to Clients or marketplace.

## **4.5 Archived Offers**

Visible only to:

- Offer Owner

- Authorized collaborators

Not visible in marketplace search.\
Still referenced in associated Contracts.

# **5. Contract Visibility Rules**

## **5.1 Client Contracts**

Client may view:

- Contracts they own

Client may NOT view:

- Other Clients' Contracts

- Internal Offer edit history

## **5.2 Talent Contracts**

Talent may view:

- Contracts where they are assigned

Talent may NOT view:

- Contracts where they are not assigned (unless agency-level permissions
  exist, defined elsewhere)

## **5.3 Archived or Completed Contracts**

Remain visible to authorized users.\
Filtering may include or exclude based on status selection.

# **6. Offer Filtering Rules (Talent View)**

## **6.1 Filter Categories**

Offers may be filtered by:

- Publishing State (Draft, Published, Unpublished)

- Lifecycle State (Active, Archived)

- Offer Type (Project, Service)

- Ownership (Created by Me, Shared with Me)

- Status type (Active, Pending, Archived if defined in UI context)

Filters must operate independently and in combination.

## **6.2 Filter Combination Behavior**

If multiple filters are selected:

- Results must match ALL selected criteria (logical AND).

## **6.3 Empty Filter Results**

If no results match:

- Display empty state.

- Offer data remains unchanged.

# **7. Contract Filtering Rules**

## **7.1 Contract Status Filter**

Contracts may be filtered by lifecycle status:

- Active

- Paused

- Completed

- Canceled

- Pending (if defined in contract lifecycle)

## **7.2 Filtering Behavior**

Filters must:

- Apply only to Contracts visible to user.

- Not expose hidden contracts.

- Combine using logical AND.

# **8. Sorting Rules**

## **8.1 Offer Sorting (Talent)**

Offers may be sorted by:

- Recently Created

- Oldest First

- A--Z

- Z--A

- Last Modified

- Last Published

Sorting must:

- Apply after filtering.

- Not change Offer state.

- Not override role-based visibility.

## **8.2 Contract Sorting**

Contracts may be sorted by:

- Recently Updated

- Next Milestone

- A--Z

Sorting must:

- Apply only within authorized visible Contracts.

- Not alter Contract state.

# **9. Search Behavior**

## **9.1 Offer Search (Talent)**

Search may include:

- Offer title

- Keywords within deliverables

- Tags or category

Search must:

- Operate only on visible Offers.

- Respect role restrictions.

## **9.2 Marketplace Offer Search (Client)**

Clients may search:

- Published + Active Offers only.

Search must not return:

- Draft Offers

- Unpublished Offers

- Archived Offers

## **9.3 Contract Search**

Users may search within:

- Contracts they are authorized to view only.

# **10. Edge Cases**

## **10.1 Offer With Mixed Contract Statuses**

Filtering Contracts by status must not affect Offer listing.

Offer remains independent of Contract states.

## **10.2 Offer With Zero Contracts**

Offer remains visible according to publishing state.

## **10.3 Offer With Many Contracts**

Filtering must not collapse Offer data into Contract results.

## **10.4 Role Switch Mid-Session**

Upon role switch:

- Filters reset to appropriate role scope.

- Previously visible data outside role scope must not remain visible.

## **10.5 Shared With Me Offers**

Filtering by "Created by Me" must exclude Shared Offers.

Filtering by "Shared With Me" must exclude Owned Offers unless
explicitly combined.

## **10.6 Archived Offer Referenced by Contract**

When navigating from Contract to Offer:

- Archived Offer visible in read-only context to authorized users only.

# **11. Data Masking Rules**

## **11.1 Financial Data**

Visible only to:

- Contract owner (Client)

- Authorized Talent based on permission matrix

Never visible to:

- Unassigned Talent

- Other Clients

## **11.2 Team Member Data**

Clients see only team members assigned to their Contract snapshot.

Clients must not see:

- Internal Talent availability history

- Other Offers' team configurations

## **11.3 Offer Metrics (if present)**

Visible only to Offer Owner and authorized collaborators.

Never visible to Clients.

# **12. Concurrency Impact on Filtering**

Filtering and sorting must not:

- Reveal data from concurrent edits not yet validated.

- Reflect uncommitted Offer edits.

Data shown must reflect confirmed system state.

# **13. System Invariants**

The following must always be true:

1.  Filters must not override permission boundaries.

2.  Sorting must not reveal hidden objects.

3.  Search must respect role-based visibility.

4.  Archived Offers must not appear in marketplace search.

5.  Draft Offers must never appear to Clients.

6.  Contract visibility must never depend on Offer publishing state.

# **14. Non-Goals**

This document does not define:

- Search ranking logic

- Advanced analytics filtering

- Performance optimization

- Pagination mechanics

- Reporting dashboards

# **Final Confirmation**

This document:

- Defines all Offer visibility states

- Defines all Contract visibility states

- Defines filtering logic

- Defines sorting logic

- Defines search boundaries

- Defines role-based data exposure

- Defines edge cases

- Defines data masking rules

- Avoids UI styling

- Avoids technical implementation

- Introduces no unconfirmed behavior

- Leaves no ambiguity within confirmed scope

This is the final UX requirements specification for Filtering, Sorting &
Data Visibility Rules.
