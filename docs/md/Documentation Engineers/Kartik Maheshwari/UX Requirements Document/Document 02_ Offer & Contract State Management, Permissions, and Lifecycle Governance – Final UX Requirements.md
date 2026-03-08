# **Document 02: Offer & Contract State Management, Permissions, and Lifecycle Governance -- Final UX Requirements**

**Description:\**
This document defines the complete state management rules, lifecycle
governance, permission enforcement, availability logic, and behavioral
guardrails for Offers and Contracts. It establishes authoritative rules
governing entity states, transitions, access control, and system
reactions to edge cases. This document contains zero ambiguity and
excludes UI styling or technical implementation details.

# **1. Purpose**

To formally define:

- All Offer and Contract states

- Valid and invalid state transitions

- Lifecycle independence rules

- Role-based permission enforcement

- Availability-driven behavior

- Contract creation governance

- Error and restriction enforcement rules

- Non-negotiable UX guardrails

This document governs behavioral consistency across all screens and
workflows.

# **2. Offer State Model**

## **2.1 Valid Offer States**

An Offer may only exist in one of the following states:

1.  Pending (Draft)

2.  Active (Published)

3.  Archived

No additional Offer states are permitted.

## **2.2 Offer State Definitions**

### **Pending (Draft)**

- Not visible in marketplace.

- Editable by Talent.

- Not purchasable.

- May be published if validation passes.

### **Active (Published)**

- Visible in marketplace.

- Purchasable if availability conditions are satisfied.

- Editable by Talent.

- May be unpublished or archived.

### **Archived**

- Not visible in marketplace.

- Not purchasable.

- Editable by Talent.

- May contain active Contracts.

- May be restored to Active only through explicit Talent action.

# **3. Offer State Transition Rules**

## **3.1 Allowed Transitions**

- Pending → Active (if validation passes)

- Active → Pending (Unpublish)

- Active → Archived

- Archived → Active (explicit republish)

## **3.2 Disallowed Transitions**

- Archived → Pending (not permitted)

- Automatic transition due to Contract lifecycle (not permitted)

- Automatic transition due to team member changes (not permitted)

# **4. Contract State Model**

## **4.1 Valid Contract States**

A Contract may only exist in one of the following states:

1.  Active

2.  Paused

3.  Completed

4.  Canceled

5.  Pending Team Assignment (conditional creation state)

No additional Contract states are permitted.

## **4.2 Contract State Definitions**

### **Active**

- Work is in progress.

- Team assigned.

- Phases and milestones available.

### **Paused**

- Work temporarily halted.

- May return to Active.

### **Completed**

- Work concluded successfully.

- Immutable except for read-only viewing.

### **Canceled**

- Work terminated before completion.

- Immutable except for read-only viewing.

### **Pending Team Assignment**

- Created due to unavailable team at purchase.

- Work cannot begin.

- Must transition to Active once team assigned.

# **5. Contract State Transition Rules**

## **5.1 Allowed Transitions**

- Pending Team Assignment → Active

- Active → Paused

- Paused → Active

- Active → Completed

- Active → Canceled

- Paused → Canceled

## **5.2 Disallowed Transitions**

- Completed → Any other state

- Canceled → Any other state

- Automatic state changes triggered by Offer status

# **6. Offer and Contract Lifecycle Independence**

The system must enforce complete lifecycle independence between Offers
and Contracts.

## **6.1 Mandatory Independence Rules**

- Contract completion must not modify Offer state.

- Contract cancellation must not modify Offer state.

- Offer unpublishing must not alter existing Contracts.

- Offer archiving must not cancel or pause Contracts.

- Offer publishing must not modify existing Contracts.

- Contract state changes must never propagate to Offer.

# **7. Offer Purchase Governance**

## **7.1 Purchase Preconditions**

An Offer may only be purchased if:

- Offer state is Active.

- At least one team member is available.

- Offer is not marked Temporarily Unavailable.

- Purchasing user is Client role.

- Purchasing user is not the Offer owner.

## **7.2 Purchase Blocking Conditions**

Purchase must be blocked if:

- Offer is Pending.

- Offer is Archived.

- Zero available team members.

- User is Talent attempting to purchase own Offer.

- User lacks Client role.

Blocking must:

- Prevent Contract creation.

- Provide clear explanatory messaging.

- Not silently fail.

# **8. Offer Availability Governance**

## **8.1 Team Availability Behavior**

When team member availability changes:

- Unavailable members must immediately stop displaying in marketplace
  listing.

- Offer must not auto-unpublish.

- Offer must not auto-archive.

## **8.2 Zero Availability Rule**

If all assigned team members become unavailable:

- Offer remains Active.

- Purchase must be disabled.

- Offer must enter "Temporarily Unavailable" behavior state.

- No automatic state transition occurs.

# **9. Contract Creation Logic**

## **9.1 Creation Rules**

When a Client purchases an Offer:

- A new Contract must be created.

- Contract must reference originating Offer.

- Contract must store team snapshot at purchase time.

- Offer must increment Contract count.

- Offer state must remain unchanged.

## **9.2 Team Assignment Logic at Creation**

If assigned team members are available:

- Contract state = Active.

If assigned team members are unavailable:

- Contract state = Pending Team Assignment.

Contract must never fail to generate solely due to unavailable team.

# **10. Permission Enforcement**

## **10.1 Talent Permissions**

Talent may:

- Create Offer.

- Edit Offer in any state.

- Publish Offer.

- Unpublish Offer.

- Archive Offer.

- View Contracts assigned to them.

Talent may not:

- Purchase own Offer.

- Edit Contract marketing content.

- Modify Contract structure after activation (if restricted by
  workflow).

## **10.2 Client Permissions**

Client may:

- View Contracts.

- Purchase Active Offers.

Client may not:

- Access Offer management.

- Edit Offers.

- Publish Offers.

- Archive Offers.

# **11. Access Violation Handling**

## **11.1 Unauthorized Offer Access**

If Client attempts direct Offer management access:

- Redirect to dashboard.

- Display explanatory notification.

## **11.2 Unauthorized Action Attempt**

If user attempts restricted action:

- Action must be disabled.

- System must provide explanation.

- No silent failure permitted.

# **12. Multi-Contract Governance**

## **12.1 One-to-Many Enforcement**

- One Offer must support unlimited Contracts.

- No limit may be imposed by purchase frequency.

- Each Contract must be independent of other Contracts derived from same
  Offer.

# **12.2 Cross-Contract Isolation**

- Status change in one Contract must not affect any other Contract.

- Team changes in one Contract must not affect other Contracts.

- Contract cancellation must not decrement historical count.

# **13. Edge Case Governance**

## **13.1 Offer Archived with Active Contracts**

Allowed.

- Contracts remain fully functional.

- Offer removed from marketplace.

- No retroactive change to Contracts.

## **13.2 Offer Unpublished with Active Contracts**

Allowed.

- Prevent new purchases.

- Existing Contracts remain unaffected.

## **13.3 Team Member Removed After Contract Creation**

- Contract remains unchanged.

- No automatic Contract modification permitted.

## **13.4 Multiple Simultaneous Purchases**

- Fully supported.

- Each purchase generates independent Contract.

# **14. Prohibited Behaviors**

The system must never:

- Automatically archive Offer due to Contract completion.

- Automatically unpublish Offer due to Contract creation.

- Merge Offer and Contract into single entity.

- Permit Client to edit Offer.

- Permit Contract editing to modify Offer marketing content.

- Permit Offer lifecycle to alter Contract state.

- Cancel Contracts when Offer is archived.

# **15. Governance Finality**

All rules defined in this document are mandatory.

No implicit transitions, automatic cross-entity updates, or undocumented
state changes are permitted.

All Offer and Contract behavior must strictly conform to this governance
model.

This document represents the final and complete governance requirements
for Offer and Contract state management, lifecycle enforcement, and
permission handling.
