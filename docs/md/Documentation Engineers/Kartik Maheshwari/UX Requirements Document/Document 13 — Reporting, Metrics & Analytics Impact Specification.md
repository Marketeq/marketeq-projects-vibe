# **Document 13 --- Reporting, Metrics & Analytics Impact Specification**

## **1. Purpose**

This document defines the behavioral requirements governing:

- Reporting implications of separating Offers and Contracts

- Offer performance metrics

- Contract-based metrics

- Role-based metric visibility

- Data consistency rules between Offers and Contracts

- Snapshot alignment rules in reporting

- Edge cases affecting metric integrity

This document ensures:

- Metrics reflect the correct object model (Offer vs Contract
  separation)

- No metric contradicts snapshot immutability

- No cross-role data exposure occurs

- Archived or unpublished Offers do not distort historical reporting

This document defines behavioral requirements only.

## **2. Scope**

This document covers:

- Offer-level metrics (Talent only)

- Contract-level metrics (Client and Talent based on role)

- Offer-to-Contract aggregation rules

- Visibility boundaries for reporting

- Handling of archived/unpublished Offers in reports

- Edge cases related to concurrency and state changes

This document does NOT define:

- Visual dashboard layouts

- Chart types or styling

- Performance optimization

- Advanced financial reconciliation

- Refund or dispute reporting

# **3. Core Reporting Principles**

All reporting must follow these principles:

1.  Offers are marketing artifacts.

2.  Contracts are execution artifacts.

3.  Reporting must not blur Offer and Contract lifecycles.

4.  Contract data must always reflect snapshot at purchase.

5.  Offer edits must not retroactively alter historical metrics.

6.  Archived Offers must retain historical performance data.

7.  Role-based visibility must be strictly enforced.

# **4. Offer-Level Metrics (Talent Only)**

Offer metrics may include:

- Total Contracts generated

- Active Contracts count

- Completed Contracts count

- Canceled Contracts count

- Conversion count (Offer → Contract)

- Total revenue generated from Contracts (aggregated from snapshot
  price)

## **4.1 Revenue Aggregation Rule**

Revenue attributed to an Offer must be calculated from:

- Contract snapshot price at time of purchase

Offer price edits must not:

- Alter historical revenue values

- Recalculate past Contract totals

## **4.2 Offer Status & Metrics Interaction**

### **Draft Offers**

- No marketplace visibility metrics

- No contract metrics unless contracts exist (unlikely but structurally
  possible)

### **Published + Active Offers**

- Metrics accumulate as Contracts are created

### **Unpublished Offers**

- Metrics remain intact

- No future Contracts unless republished

### **Archived Offers**

- Metrics remain intact

- Historical performance preserved

- Must still report total Contracts generated

Archiving must not delete metric history.

# **5. Contract-Level Metrics**

## **5.1 Client Reporting Scope**

Client may see:

- Contract status

- Contract milestone progress

- Financial totals for their Contracts

Client may NOT see:

- Aggregate Offer performance

- Other Clients' Contracts

- Offer conversion rates

## **5.2 Talent Reporting Scope**

Talent may see:

- Contracts they are assigned to

- Revenue generated from their Offers

- Aggregated Contract counts per Offer

Talent may NOT see:

- Other Talent's Offer performance

- Other Clients' Contracts unrelated to their Offers

# **6. Offer ↔ Contract Aggregation Rules**

## **6.1 One-to-Many Aggregation**

An Offer may generate multiple Contracts.

Offer-level reporting must:

- Aggregate metrics across all Contracts linked to that Offer

- Not aggregate Contracts from other Offers

## **6.2 Contract Status Impact on Metrics**

Metrics must reflect:

- Active Contracts count

- Completed Contracts count

- Canceled Contracts count

Changing Contract status must:

- Update aggregated Offer metrics accordingly

- Not affect historical snapshot values

## **6.3 Contract Cancellation Impact**

If Contract is canceled:

- Contract remains part of total Contracts count

- Revenue reporting must reflect cancellation rules (outside current
  scope unless defined)

- Offer metric must reflect accurate lifecycle state

# **7. Concurrency & Reporting Integrity**

## **7.1 Simultaneous Purchases**

If simultaneous purchases occur:

- Only successfully validated Contracts must appear in reporting

- Failed or blocked purchases must not appear

## **7.2 Payment Success + Contract Failure**

If payment succeeds but Contract not created:

- No revenue must be reported

- No Contract count increment

Reporting must reflect confirmed Contract creation only.

# **8. Snapshot Alignment Rules**

Reporting must always reference:

- Contract snapshot data

- Not current Offer data

Example:

If Offer price changed after 5 Contracts:

- Revenue must reflect 5 snapshot prices, not current price

# **9. Filtering & Reporting Interaction**

Reporting filters must respect:

- Role-based visibility

- Offer publishing state

- Contract lifecycle state

Filtering must not:

- Reveal hidden Offers

- Reveal hidden Contracts

# **10. Role Switch & Reporting Context**

If user switches roles:

- Reporting context must reset to role scope

- Talent reporting must not appear in Client context

- Client reporting must not include Offer-level metrics

# **11. Data Visibility Boundaries in Reporting**

## **11.1 Financial Data**

Financial data visible only to:

- Contract owner (Client)

- Authorized Talent per permission matrix

Financial data must never:

- Appear in public Offer listing

- Appear in marketplace context

## **11.2 Team-Level Metrics**

Team performance metrics (if present) must:

- Reflect only Contracts assigned to that team member

- Not reveal other team member data without permission

# **12. Archived & Deleted Offer Handling in Reporting**

## **12.1 Archived Offers**

Archived Offers must:

- Remain in historical reporting

- Retain Contract metrics

- Be clearly distinguishable in reporting context

## **12.2 Hard Deleted Offers (Zero Contracts)**

If Offer deleted:

- No historical metrics exist

- Must not appear in reports

# **13. Edge Cases**

## **13.1 Offer Edited After Contracts Exist**

Editing Offer must:

- Not modify historical metrics

- Not change past revenue totals

## **13.2 Team Removed from Offer After Contract Creation**

Reporting must:

- Continue attributing Contract to original Offer

- Not reassign Contract attribution

## **13.3 Role Permissions Revoked**

If Talent loses access:

- Reporting access must immediately reflect updated permissions

## **13.4 Contract Frozen by Admin**

Frozen Contracts must:

- Still count toward Offer totals

- Reflect current lifecycle state

# **14. System Invariants**

The following must always remain true:

1.  Reporting must reflect confirmed Contracts only.

2.  Offer edits must never alter historical Contract metrics.

3.  Revenue aggregation must use snapshot values.

4.  Archived Offers must retain historical metrics.

5.  Reporting must respect role-based visibility.

6.  No metric may expose restricted data.

# **15. Non-Goals**

This document does not define:

- Refund accounting logic

- Dispute reporting logic

- Financial reconciliation

- Payment processor reporting

- Tax reporting

# **Final Confirmation**

This document:

- Defines Offer-level metrics

- Defines Contract-level metrics

- Defines revenue aggregation rules

- Defines snapshot alignment requirements

- Defines role-based reporting visibility

- Defines archived Offer reporting behavior

- Defines concurrency impact on reporting

- Defines edge cases

- Introduces no unconfirmed logic

- Avoids UI styling

- Avoids implementation details

- Leaves no ambiguity within confirmed scope

This is the final UX requirements specification for Reporting, Metrics &
Analytics Impact.
