# **Document 03: Offer & Contract Listing Experience, Filtering, Search, and Empty State Governance -- Final UX Requirements**

**Description:\**
This document defines the complete and unambiguous UX requirements
governing listing behavior, search functionality, filtering systems,
sorting behavior, metadata display, status indicators, avatar stacking,
contract counts, and empty state handling for both Offers and Contracts.
This document excludes UI styling and technical implementation details
and governs all list-level interaction patterns.

# **1. Purpose**

To formally define:

- Listing structure for Offers and Contracts

- Search behavior requirements

- Filtering rules and persistence

- Sorting logic

- Metadata display requirements

- Status badge behavior

- Avatar stacking behavior

- Contract count display rules

- Empty state messaging and behavior

- Disabled state presentation logic

This document governs all list-based experiences across Talent and
Client roles.

# **2. Offer Listing Requirements (Talent Only)**

## **2.1 Visibility Rules**

- Offers are visible only to Talent role.

- Clients must never see Offer listing screens.

- Offer listing must include both:

  - Created by Me

  - Shared With Me

## **2.2 Offer Listing Metadata (Mandatory Display Fields)**

Each Offer entry must display:

1.  Title

    - Maximum two lines

    - Truncated if exceeded

2.  Offer Type

    - Project

    - Service

3.  Status Badge

    - Pending

    - Active

    - Archived

4.  Last Updated Timestamp

    - Relative time format

5.  Team Avatar Stack

    - Display assigned available team members

    - Overflow indicator (+X) if exceeding display limit

6.  Active Contract Count

    - Number of Contracts generated from this Offer

    - Must not decrement due to completion or cancellation

## **2.3 Offer Listing Sorting Requirements**

Sorting options must include:

- Recently Created

- Oldest First

- A--Z

- Z--A

- Last Modified

- Last Published

Only one sort option may be active at a time.

## **2.4 Offer Listing Filtering Requirements**

Filtering must support:

- All Offers

- Offer Type (Project / Service)

- Status (Active / Pending / Archived)

- Created by Me

- Shared With Me

### **Filtering Behavior Rules:**

- Filters must allow multi-selection where applicable.

- Filters must update listing immediately upon selection.

- "Clear All" must reset all filters.

- Filter state must persist during session.

- Filter state resets upon logout.

## **2.5 Offer Search Behavior**

Search must:

- Be real-time (debounced input).

- Support partial string matching.

- Be case-insensitive.

- Search across:

  - Title

  - Category

  - Skills

Search results must respect active filters and sorting.

## **2.6 Offer Availability Display Rules**

If Offer is Active but has zero available team members:

- Listing must reflect Temporarily Unavailable state.

- Purchase capability must be disabled (in marketplace).

- Offer status remains Active.

Offer state must not change automatically due to availability.

## **2.7 Offer Empty State Rules**

If no Offers exist:

- Display clear message encouraging creation.

- Provide actionable "New Offer" entry point.

If filters result in zero results:

- Display "No results match current filters."

- Provide "Clear Filters" option.

# **3. Contract Listing Requirements (Talent & Client)**

## **3.1 Visibility Rules**

- Contracts visible to:

  - Client (who owns contract)

  - Assigned Talent

- Contracts must not be visible to unrelated users.

- Contract listing must not include marketplace editing functionality.

## **3.2 Contract Listing Metadata (Mandatory Display Fields)**

Each Contract entry must display:

1.  Project Name

2.  Team Avatar Stack

3.  Status Badge

    - Active

    - Paused

    - Completed

    - Canceled

    - Pending Team Assignment (if applicable)

4.  Current Phase

5.  Last Updated Timestamp

6.  Next Milestone (sortable field)

## **3.3 Contract Listing Sorting Requirements**

Sorting must include:

- Recently Updated

- Next Milestone

- A--Z

Only one sort option may be active at a time.

## **3.4 Contract Listing Filtering Requirements**

Filtering must support:

- Status

- Team

- Phase

- Date Updated

### **Filtering Behavior Rules:**

- Multi-select allowed where applicable.

- Filters must immediately update listing.

- "Clear All" must reset filters.

- Filter state must persist during session.

- Filter state resets upon logout.

## **3.5 Contract Search Behavior**

If search is present within Contracts:

- Must be real-time (debounced).

- Must support partial matching.

- Must be case-insensitive.

- Must search Project Name.

- Must respect active filters and sorting.

# **4. Avatar Stack Governance**

## **4.1 Avatar Display Rules**

- Display assigned team members in stacked format.

- If number exceeds display limit:

  - Show overflow indicator (+X).

- Avatar stack must reflect current assigned team.

## **4.2 Offer vs Contract Avatar Logic**

Offer:

- Display only available team members.

Contract:

- Display full assigned team snapshot.

- Must not auto-remove team if availability changes later.

# **5. Status Badge Governance**

## **5.1 Offer Status Badges**

Allowed values:

- Pending

- Active

- Archived

Must reflect actual Offer state.

Must not reflect Contract state.

## **5.2 Contract Status Badges**

Allowed values:

- Active

- Paused

- Completed

- Canceled

- Pending Team Assignment

Must reflect actual Contract state.

Must not reflect Offer state.

# **6. Timestamp Governance**

## **6.1 Relative Time Format**

Timestamps must display in relative format (e.g., "5 minutes ago",
"Yesterday", "2 weeks ago").

Applicable to:

- Offer Last Updated

- Contract Last Updated

# **7. Contract Count Governance (Offer Listing)**

Each Offer must display:

- Total number of Contracts generated.

Rules:

- Count must include all Contracts (Active, Paused, Completed,
  Canceled).

- Count must not decrement when Contracts complete or cancel.

- Count must increment upon each new Contract creation.

- Count must not change due to Offer state changes.

# **8. Disabled and Restricted State Governance**

## **8.1 Disabled Purchase State (Marketplace Context)**

If Offer has zero available team members:

- Offer remains Active.

- Purchase capability disabled.

- Clear explanation required.

- No silent failure permitted.

## **8.2 Disabled Actions for Role Violations**

If user lacks permission:

- Action must be disabled.

- Explanation must be provided.

- No hidden silent removal of entity.

# **9. Cross-Entity Isolation Rules (Listing Context)**

The listing system must enforce:

- Offer filters must not affect Contract listing.

- Contract filters must not affect Offer listing.

- Offer sorting must not influence Contract sorting.

- Contract sorting must not influence Offer sorting.

Each entity must maintain independent listing state.

# **10. Multi-Contract Display Governance**

When multiple Contracts originate from same Offer:

- Each Contract must display independently in listing.

- No grouping by Offer.

- No merging of Contracts.

- No shared lifecycle display.

# **11. Zero Results Governance**

## **11.1 Offer Zero Results**

If search/filter returns zero:

- Display no-results state.

- Provide option to clear filters.

## **11.2 Contract Zero Results**

If search/filter returns zero:

- Display no-results state.

- Provide option to clear filters.

# **12. Prohibited Listing Behaviors**

The system must never:

- Merge Offer and Contract listings.

- Display Contract state in Offer listing.

- Display Offer marketing fields in Contract listing.

- Auto-remove Offers from listing after purchase.

- Auto-remove Contracts from listing due to Offer state change.

- Collapse multiple Contracts into single entry.

- Change Offer visibility due to Contract lifecycle.

- Change Contract visibility due to Offer lifecycle.

# **13. Final Governance Statement**

This document defines the complete and final UX behavior requirements
for:

- Offer listing

- Contract listing

- Filtering

- Sorting

- Search

- Status display

- Metadata display

- Avatar stacking

- Contract counts

- Empty state handling

- Disabled states

All behaviors described are mandatory. No implicit behaviors, inferred
rules, or cross-entity side effects are permitted outside this
specification.

This document is final and authoritative.
