# **Document 05: Offer Editing, Publishing Validation, and Team Assignment Governance -- Final UX Requirements**

**Description:\**
This document defines the complete and authoritative UX requirements
governing Offer creation, editing, publishing validation, team
assignment behavior, availability enforcement, unpublishing, archiving,
and marketplace readiness conditions. It establishes strict behavioral
rules for how Offers are managed by Talent and how team availability
affects marketplace purchase eligibility. This document excludes UI
styling and technical implementation details.

# **1. Purpose**

To formally define:

- Offer creation and editing behavior

- Publishing eligibility requirements

- Validation enforcement rules

- Team assignment governance

- Team availability logic

- Unpublish behavior

- Archive behavior

- Marketplace readiness conditions

- Restrictions and prohibited behaviors

This document governs all Offer management behavior within the Talent
role.

# **2. Offer Creation Governance**

## **2.1 Creation Eligibility**

Only Talent users may create Offers.

Clients must not:

- Access Offer creation screens

- Access Offer editing screens

- Access Offer publishing controls

Unauthorized access must be blocked and redirected with explanatory
notification.

## **2.2 Initial Offer State**

Upon creation, an Offer must:

- Be assigned status: Pending (Draft)

- Not be visible in marketplace

- Not be purchasable

No automatic publishing is permitted.

# **3. Offer Editing Governance**

## **3.1 Editable Fields**

Talent must be able to edit the following Offer components in any state
(Pending, Active, Archived):

- Title

- Description

- Pricing

- Scope / Deliverables

- Assigned Team Members

Editing an Offer must not:

- Modify any associated Contracts

- Alter Contract team assignments

- Change Contract lifecycle state

## **3.2 Editing Active Offers**

If an Offer is Active:

- Edits must be allowed.

- Edits must not cancel or modify existing Contracts.

- Edits must not reset Contract counts.

- Edits must not change Offer status automatically.

# **4. Publishing Governance**

## **4.1 Publishing Eligibility Requirements**

An Offer may transition from Pending to Active only if all of the
following conditions are met:

1.  Pricing is defined.

2.  Scope / Deliverables are defined.

3.  At least one assigned team member is available.

All conditions are mandatory.

## **4.2 Publishing Validation Behavior**

If publishing requirements are not met:

- Publishing action must be blocked.

- Validation must clearly identify missing requirements.

- Publishing must not partially succeed.

- Offer must remain in Pending state.

No silent validation failure is permitted.

# **5. Team Assignment Governance**

## **5.1 Team Assignment Rules**

An Offer must support assignment of team members.

Team assignment must:

- Be editable at any time by Talent.

- Reflect current team membership in marketplace display.

- Not retroactively alter any existing Contracts.

## **5.2 Availability Enforcement Rules**

Only available team members may be displayed in marketplace listing.

If a team member becomes unavailable:

- They must automatically stop appearing in marketplace display.

- Offer must remain in Active state.

- Talent must be informed of availability change.

## **5.3 Zero Available Team Members**

If all assigned team members become unavailable:

- Offer must remain Active.

- Offer must enter "Temporarily Unavailable" behavior state.

- Purchase capability must be disabled.

- Offer must not auto-unpublish.

- Offer must not auto-archive.

# **6. Marketplace Readiness Governance**

## **6.1 Conditions for Purchasability**

An Offer is purchasable only if:

- Status = Active

- At least one available team member exists

- Offer is not marked Temporarily Unavailable

If any condition fails:

- Purchase must be blocked.

- Clear explanation must be provided.

- Contract must not be created.

# **7. Unpublish Governance**

## **7.1 Unpublish Rules**

Talent may manually unpublish an Active Offer.

Unpublishing must:

- Change status from Active → Pending

- Remove Offer from marketplace

- Prevent new purchases

- Not affect existing Contracts

- Not modify Contract state

- Not modify Contract team assignments

# **8. Archive Governance**

## **8.1 Archive Rules**

Talent may archive an Offer from Active or Pending state.

Archiving must:

- Change status to Archived

- Remove Offer from marketplace

- Prevent new purchases

- Not affect existing Contracts

- Not cancel or pause Contracts

- Not modify Contract data

## **8.2 Archived Offer Editing**

Archived Offers must remain editable by Talent.

Archived Offers may be restored to Active only through explicit
republishing action.

Archived Offers must not auto-transition to Pending.

# **9. Offer--Contract Separation Governance**

## **9.1 Non-Retroactivity Rule**

Changes made to an Offer must never:

- Modify existing Contracts

- Replace Contract team members

- Change Contract pricing

- Change Contract scope

- Change Contract milestones

- Change Contract status

## **9.2 Snapshot Rule**

Contracts must retain:

- Team snapshot at time of purchase

- Scope snapshot at time of purchase

- Pricing snapshot at time of purchase

Offer edits after purchase must not affect Contract snapshot.

# **10. Multi-Contract Support**

An Offer must support:

- Unlimited Contract generation

- Multiple simultaneous Contracts

- Independent lifecycle per Contract

Offer must display total Contract count without decrementing due to
completion or cancellation.

# **11. Role-Based Action Visibility**

## **11.1 Talent Actions**

Visible to Talent:

- Edit Offer

- Publish Offer

- Unpublish Offer

- Archive Offer

## **11.2 Client Restrictions**

Client must never:

- See Offer edit controls

- See Offer publishing controls

- See Offer archive controls

- Access Offer management screens

Unauthorized access attempts must:

- Be blocked

- Redirect to dashboard

- Provide explanation

# **12. Error Handling Governance**

## **12.1 Validation Errors**

If publishing requirements are unmet:

- Inline validation must display.

- Publishing must not proceed.

- Offer must remain unchanged.

## **12.2 Purchase Blocking**

If Offer is:

- Pending

- Archived

- Temporarily Unavailable

- Lacking available team members

Purchase must:

- Be blocked.

- Provide explanatory messaging.

- Not create Contract.

# **13. Prohibited Behaviors**

The system must never:

- Auto-publish an Offer.

- Auto-unpublish due to Contract completion.

- Auto-archive due to inactivity.

- Auto-remove Offer after purchase.

- Auto-change Offer status due to team availability.

- Modify Contracts due to Offer edits.

- Cancel Contracts due to Offer archiving.

- Merge Offer and Contract into a single entity.

# **14. Governance Finality**

All behaviors defined in this document are mandatory.

Offer editing, publishing, team assignment, availability enforcement,
unpublishing, and archiving must strictly adhere to these rules without
exception.

No undocumented transitions, cross-entity modifications, or automatic
lifecycle coupling is permitted.

This document is final and authoritative for Offer management UX
behavior.
