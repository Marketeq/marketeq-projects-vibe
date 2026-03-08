# **Document 11 --- Permission & Ownership Matrix Specification**

## **1. Purpose**

This document defines the complete behavioral permission framework
governing:

- Role-level permissions (Client vs Talent)

- Offer ownership permissions

- Shared Offer permissions

- Contract visibility permissions

- Contract action permissions

- Cross-role boundaries

- Restricted state behavior

This document ensures:

- Strict separation between Talent and Client contexts

- No unauthorized Offer management

- No unauthorized Contract actions

- No cross-role data leakage

- No ambiguity in action eligibility

This document defines behavioral requirements only.

## **2. Scope**

This document covers:

- Offer management permissions

- Contract access permissions

- Contract action permissions

- Role-switch implications

- Ownership hierarchy for Offers

- Shared Offer collaboration rules

- Restricted access handling

This document does NOT define:

- UI representation of permission states

- Administrative backend tooling

- Agency financial routing logic

- Dispute resolution permissions

- Refund permissions

# **3. Role Definitions**

There are two primary system roles:

1.  Talent

2.  Client

A user may switch roles, but may not operate in both roles
simultaneously within the same session.

Role determines primary navigation context and accessible object types.

# **4. Offer Permissions**

## **4.1 Talent Role --- Offer Permissions**

Talent users may:

- Create Offers

- Edit Offers they own

- Publish Offers

- Unpublish Offers

- Archive Offers

- Restore Archived Offers

- Delete Offers if zero Contracts exist

- View Contracts generated from their Offers

Talent users may NOT:

- Purchase their own Offers

- Delete Offers that have any Contracts

## **4.2 Client Role --- Offer Permissions**

Client users may:

- View Published + Active Offers in marketplace

- Initiate purchase of eligible Offers

Client users may NOT:

- Access Offer management interface

- View Draft Offers

- View Unpublished Offers

- View Archived Offers (outside contract context)

- Edit Offers

- Publish Offers

- Archive Offers

# **5. Offer Ownership Levels (Talent Context)**

There are two defined ownership states within confirmed scope:

1.  Offer Owner

2.  Shared Collaborator

## **5.1 Offer Owner**

Offer Owner has full control:

- Edit

- Publish

- Unpublish

- Archive

- Restore

- Delete (if no Contracts)

- View related Contracts

## **5.2 Shared Collaborator**

Shared Collaborator permissions are restricted by ownership
configuration.

At minimum:

Shared Collaborator may:

- View Offer

Shared Collaborator may edit/publish/archive only if explicitly granted
permission (defined elsewhere).

If permission not granted:

- Edit attempts must be blocked.

Shared Collaborator may NOT:

- Delete Offer unless explicitly granted and no Contracts exist.

# **6. Contract Permissions**

## **6.1 Client --- Contract Permissions**

Client who owns Contract may:

- View Contract

- View snapshot of Offer at purchase

- Perform valid Contract status transitions (within lifecycle rules)

- View financial data associated with their Contract

Client may NOT:

- Edit originating Offer

- View internal Offer edit history

- View other Clients' Contracts

- Modify snapshot fields

## **6.2 Talent --- Contract Permissions**

Talent assigned to Contract may:

- View Contract

- View snapshot details

- Perform valid Contract lifecycle transitions (if allowed by contract
  rules)

Talent may NOT:

- Modify snapshot data

- View Contracts they are not assigned to (unless separate agency rule
  applies)

- View other Clients' financial data

## **6.3 Unassigned Talent**

Talent not assigned to a Contract may NOT:

- View that Contract

- Access its financial data

- Modify its state

# **7. Cross-Role Restrictions**

## **7.1 Talent Accessing Client Context**

If Talent switches to Client role:

- Offer management becomes inaccessible.

- Client dashboard replaces Talent dashboard.

- Offers remain intact but hidden from Client context.

## **7.2 Client Accessing Talent Context**

If Client attempts direct Offer management URL:

- Access denied.

- Redirect to Client dashboard.

# **8. Action-Level Permission Matrix**

Below defines behaviorally allowed actions.

## **8.1 Offer Actions**

  **Action**                **Talent Owner**   **Shared Collaborator (No Edit Rights)**   **Client**
  ------------------------- ------------------ ------------------------------------------ ------------------------
  View Draft                Yes                Yes                                        No
  View Published            Yes                Yes                                        Yes (marketplace only)
  Edit                      Yes                No                                         No
  Publish                   Yes                No                                         No
  Unpublish                 Yes                No                                         No
  Archive                   Yes                No                                         No
  Restore                   Yes                No                                         No
  Delete (no Contracts)     Yes                No                                         No
  Delete (with Contracts)   No                 No                                         No
  Purchase                  No                 No                                         Yes

## **8.2 Contract Actions**

  --------------------------------------------------------------------
  **Action**            **Client     **Assigned       **Unassigned
                        Owner**      Talent**         Talent**
  --------------------- ------------ ---------------- ----------------
  View                  Yes          Yes              No

  Modify Snapshot       No           No               No

  Valid Status          Yes          Yes (if allowed) No
  Transition                                          

  View Financials       Yes          Based on         No
                                     permission       

  Cancel (if lifecycle  Yes          Based on         No
  allows)                            permission       
  --------------------------------------------------------------------

# **9. Permission Violation Handling**

When unauthorized action is attempted:

- Action must be blocked.

- Object state must remain unchanged.

- Acting user must be informed.

No unauthorized access should reveal restricted data.

# **10. Administrative Override Permissions**

If admin disables Offer:

- Offer Owner loses publish capability.

- Offer removed from marketplace.

If admin freezes Contract:

- All lifecycle transitions blocked.

If account suspended:

- Offer management blocked.

- Contract actions blocked.

These overrides supersede normal permissions.

# **11. Snapshot Protection Rules**

Regardless of role:

- No user may modify snapshot fields after Contract creation.

- No user may retroactively change contract price or deliverables via
  Offer edits.

This rule overrides all ownership states.

# **12. Edge Cases**

## **12.1 Offer With Active Contracts**

Even Owner may NOT:

- Delete Offer.

Owner may:

- Edit Offer for future purchases.

## **12.2 Simultaneous Permission Changes**

If ownership revoked during session:

- Pending edits must be blocked at save.

## **12.3 Role Switch Mid-Action**

If role changes during checkout:

- Checkout invalidated.

If role changes during Offer edit:

- Save must revalidate permissions.

# **13. Data Exposure Boundaries**

Permissions must ensure:

- Clients never see internal Talent notes.

- Talent never see other Clients' contracts.

- Shared Collaborators do not see restricted financial data unless
  granted.

- Archived Offers remain hidden from Clients.

# **14. System Invariants**

The following must always remain true:

1.  Clients cannot manage Offers.

2.  Talent cannot purchase their own Offers.

3.  Snapshot fields are immutable.

4.  No Contract accessible outside assigned permissions.

5.  Hard delete blocked when Contracts exist.

6.  Permission evaluation occurs at action time, not session start only.

# **15. Non-Goals**

This document does not define:

- Agency financial routing

- Refund permissions

- Dispute authority

- Support admin tooling

- Legal escalation permissions

# **Final Confirmation**

This document:

- Defines role-level permissions

- Defines ownership-level permissions

- Defines contract visibility rules

- Defines action eligibility

- Defines permission violations

- Defines admin override precedence

- Defines data exposure boundaries

- Defines edge cases

- Introduces no unconfirmed logic

- Avoids UI styling

- Avoids implementation details

- Leaves no ambiguity within confirmed scope

This is the final UX requirements specification for the Permission &
Ownership Matrix.
