**Billing Sprint Backlog** with everything we\'ve covered so far and
what's still pending or deferred:

### **✅ Completed or In-Progress Documents**

These have been built, revised, or approved:

1.  **Installment Plans -- Overview & Stripe Integration Flow\**

2.  **Installment Plan -- Upfront Deposit Rules & Billing Behavior\**

3.  **Installment Plan -- Subscription Setup Logic (Weekly, Biweekly,
    Monthly)\**

4.  **Installment Plan -- Project Duration, Pricing & Dynamic Schedule
    Calculation\**

5.  **Installment Plan -- Failed Payment Retry Behavior & Pausing
    Projects\**

6.  **Installment Plan -- Stripe Subscription Creation with Dynamic
    Pricing Support\**

7.  **Installment Plan -- Automated Testing Strategy\**

8.  **Installment Plan -- Manual QA Checklist\**

9.  **Installment Plan -- Edge Case Handling\**

10. **Stripe Monitoring & Alerting Guide\**

### **✅ QuickBooks Wire Transfer Integration Documents**

All docs fully built in chat, one at a time, per your instructions:

1.  **Wire Transfer Verification -- Full Backend Flow (Mercury +
    QuickBooks Sync + Status Update)\**

2.  **Matching Score Logic & Manual Review Criteria\**

3.  **Error Handling & Notification Triggers\**

4.  **Review Status Logic, AR Workflow & Airtable Integration\**

5.  **Stripe + QuickBooks Wire Transfer Integration: Cross-System Sync
    Status & Fallback Logic\**

6.  **QuickBooks Invoice ID Sync Rules\**

7.  **QuickBooks Invoice Sync Audit & Monitoring Guide\**

### **🟡 Billing Platform -- Not in Sprint Yet**

These are **not part of this sprint** but are still necessary for the
full billing system later:

- **Billing screen UI\**

  - Stripe invoice rendering (no Stripe-hosted UI)

  - Historical invoices

  - Pay Now button

- **Client receipt email generation\**

- **Subscription change mid-cycle (upgrade/downgrade/cancel)\**

- **Dashboard for admin to track invoice/payment status (beyond
  Airtable)\**

- **Slack integration for AR alerts\**

- **Webhook listener fallback logging\**

### **🟡 Deferred / Open Tasks to Plan**

These haven't been started or were discussed and deferred:

- Stripe plan change logic mid-cycle (for future billing sprint)

- UI logic for showing the upcoming payment amount and date

- Support for partial wire transfers (not in current wire flow)

- Stripe + QuickBooks invoice reconciliation for non-wire payments (may
  be needed depending on final workflow)
