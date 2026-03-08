# **Document 07 --- Checkout, Purchase Validation & Concurrency Behavior Specification**

## **1. Purpose**

This document defines the complete behavioral logic for:

- Offer purchase initiation

- Checkout behavior

- Team availability validation

- Price validation

- Concurrency control

- Soft-lock behavior

- Hard validation at payment

- Error and recovery states

- Cross-role and cross-session conflicts

This document ensures purchase integrity, prevents overbooking,
preserves contract snapshot rules, and defines recovery behavior for all
checkout-related edge cases.

This document contains behavioral requirements only.

## **2. Scope**

This document covers:

- Client purchase flow for Offers

- Checkout initiation

- Soft locking of team members

- Hard validation at payment submission

- Offer changes during checkout

- Team availability conflicts

- Simultaneous purchases

- Session expiration

- Multi-device and multi-tab scenarios

- Payment success + contract creation failure

This document does NOT define:

- Payment gateway implementation

- UI layout or styling

- Contract lifecycle behavior post-creation

- Team replacement workflow

# **3. Purchase Preconditions**

A Client may initiate purchase only if:

1.  Offer is in Published + Active state.

2.  Offer is not Archived.

3.  Offer has at least one available team member.

4.  Client is logged in as Client role.

5.  Client is not the Offer publisher.

If any condition fails:

- Purchase initiation is blocked.

- No checkout session is created.

# **4. Checkout Initiation Behavior**

When Client selects Purchase:

- A checkout session begins.

- Current Offer data is read.

- Current available team members are identified.

- A temporary soft lock may be placed on selected team members.

Offer state does not change at checkout initiation.

# **5. Soft Lock Behavior**

## **5.1 Purpose**

Soft lock prevents immediate double-booking during checkout.

## **5.2 Soft Lock Rules**

- Soft lock begins at checkout initiation.

- Soft lock is temporary.

- Soft lock expires if checkout session times out.

- Soft lock does not create a Contract.

- Soft lock does not alter Offer state.

## **5.3 Soft Lock Expiration**

If checkout session becomes inactive beyond system-defined duration:

- Soft lock expires.

- Team members return to available pool.

- Client must revalidate availability before payment.

# **6. Hard Validation at Payment Submission**

Hard validation occurs when Client submits payment.

The following must be revalidated:

1.  Offer is still Published + Active.

2.  Offer is not Archived.

3.  Price has not changed.

4.  Assigned team members are still available.

5.  Client session is valid.

If any validation fails:

- Payment must not be processed.

- Contract must not be created.

- Client must be informed and required to resolve.

# **7. Price Change During Checkout**

## **7.1 If Offer Price Changes Before Payment**

At payment submission:

- System compares checkout price with current Offer price.

If price differs:

- Client must review updated price.

- Payment cannot proceed without confirmation of updated amount.

- Contract must snapshot current Offer price at confirmed payment.

## **7.2 Offer Edits That Do Not Affect Price**

If deliverables or description change but price remains unchanged:

- Hard validation still occurs.

- Client must confirm updated Offer details before payment.

# **8. Team Availability Conflict**

## **8.1 Team Becomes Unavailable During Checkout**

At payment submission:

If any selected team member is no longer available:

- Payment blocked.

- Contract not created.

- Client must resolve by:

  - Selecting replacement (if workflow allows), or

  - Canceling checkout.

Offer state remains unchanged.

## **8.2 Zero Available Team Members at Payment**

If all team members are unavailable:

- Payment blocked.

- Offer remains Published but non-purchasable until availability
  restored.

# **9. Simultaneous Purchase Attempts**

## **9.1 Concurrent Clients**

If multiple Clients attempt purchase simultaneously:

- Soft locks may overlap.

- At payment submission:

  - First successfully validated payment creates Contract.

  - Subsequent conflicting payment attempts fail validation.

Second Client must:

- Revalidate availability.

- Resolve conflict.

- Or cancel checkout.

## **9.2 Contract Creation Integrity**

Only one Contract may be created per validated purchase.

No duplicate Contracts may be created from one payment event.

# **10. Offer Archived or Unpublished During Checkout**

## **10.1 Offer Archived Before Payment**

At payment submission:

- Payment blocked.

- Contract not created.

- Client informed Offer is no longer available.

## **10.2 Offer Unpublished Before Payment**

Behavior identical to archived:

- Payment blocked.

- Checkout terminated.

# **11. Role-Based Restrictions During Checkout**

## **11.1 Talent Attempting Purchase**

If Talent attempts to purchase their own Offer:

- Purchase initiation blocked.

If Talent switches role mid-checkout:

- Checkout invalidated.

- Must reinitiate under Client role.

## **11.2 Client Access Restrictions**

If Client loses access rights mid-checkout:

- Payment blocked.

- Checkout invalidated.

# **12. Session & Multi-Device Behavior**

## **12.1 Session Expiration**

If Client session expires before payment:

- Payment blocked.

- Client must re-authenticate.

- Soft lock may expire.

## **12.2 Multi-Tab Checkout**

If Client opens multiple checkout sessions:

- Each session independently subject to validation.

- Hard validation determines final success.

## **12.3 Multi-Device Checkout**

If checkout initiated on one device and completed on another:

- Hard validation applies.

- Soft lock behavior consistent.

# **13. Payment Success + Contract Creation Failure**

## **13.1 Critical Integrity Rule**

If payment is successfully processed but Contract creation fails:

- Client must be informed immediately.

- Duplicate charge must not occur.

- System must prevent second charge attempt.

- Issue must be escalated for resolution.

Contract must not exist in partial state.

# **14. Contract Creation Rules**

Upon successful payment and validation:

- Contract is created.

- Offer snapshot captured.

- Team snapshot captured.

- Contract is linked to originating Offer.

- Offer remains Published.

Offer does not change state upon purchase.

# **15. Error & Recovery Behavior**

## **15.1 Validation Failure**

If validation fails at payment:

- No payment processed.

- Client must correct issue.

- Checkout may continue after correction.

## **15.2 Network Failure During Payment**

If payment request fails due to network:

- No Contract created.

- Client may retry.

## **15.3 Payment Declined**

If payment declined:

- No Contract created.

- Client must update payment method.

## **15.4 Offer Modified During Checkout**

If Offer modified:

- Client must confirm latest details before payment.

# **16. Offer State After Purchase**

After successful purchase:

- Offer remains Published + Active.

- Offer may generate additional Contracts.

- Offer team availability may update if workload logic applies (business
  dependent).

- Offer snapshot does not alter.

# **17. System Invariants**

The following must always remain true:

1.  No Contract created without successful hard validation.

2.  No payment processed if Offer invalid.

3.  Contract snapshot must reflect Offer state at payment confirmation.

4.  Offer lifecycle independent from Contract lifecycle.

5.  Simultaneous purchases must not result in double-assignment.

6.  Checkout must revalidate Offer and team before payment.

# **18. Non-Goals**

This document does not define:

- Team replacement workflow.

- Refund workflow.

- Dispute resolution workflow.

- Contract lifecycle post-creation.

- Payment processor technical behavior.

# **Final Confirmation**

This document:

- Defines checkout initiation.

- Defines soft lock and hard validation.

- Defines price conflict behavior.

- Defines availability conflict behavior.

- Defines simultaneous purchase handling.

- Defines role-switch and session behavior.

- Defines payment failure recovery.

- Defines snapshot trigger rules.

- Defines all relevant edge cases.

- Introduces no unconfirmed behavior.

- Avoids UI styling and implementation.

- Leaves no ambiguity within confirmed decisions.

This is the final UX requirements specification for Checkout, Purchase
Validation, and Concurrency Behavior.
