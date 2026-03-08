**📄 Installment Plan -- Edge Case Handling**

This document outlines how the platform should handle rare or
problematic edge cases related to installment plan subscriptions. All
behavior defined here must be implemented to ensure payment reliability,
fraud resistance, and a smooth client experience.

### **🚫 1. User Abandons Checkout After Selecting Installments**

**Scenario:\**
User selects \"Pay in Installments,\" chooses frequency, then abandons
checkout before paying deposit.

**Expected Behavior:**

- No Stripe subscription should be created.

- No database record for installment plan is saved.

- If partial data exists (e.g. temp selection in Redis), auto-clean up
  after 30 min.

### **❌ 2. User Attempts to Checkout Without Paying Deposit**

**Scenario:\**
User tries to skip deposit and proceed to subscription creation.

**Expected Behavior:**

- System should **prevent submission** without deposit.

- Frontend should disable \"Continue\" unless deposit is confirmed.

- Backend should validate that first payment has depositPaid: true.

### **🔄 3. Stripe Subscription Created But Webhook Fails**

**Scenario:\**
User successfully pays deposit, but checkout.session.completed or
invoice.paid webhook fails to trigger.

**Expected Behavior:**

- Implement webhook retry logic (Stripe retries automatically for 3
  days).

- Fallback logic: Cron job checks for Stripe subscriptions with missing
  verifiedAt timestamp and reprocesses them.

### **🧾 4. Project Start Date Doesn\'t Match Payment Timestamp**

**Scenario:\**
Payment succeeded but project startDate was miscalculated (e.g. off by 1
day).

**Expected Behavior:**

- Always set startDate = deposit.timestamp in backend after
  confirmation.

- Disregard frontend-selected dates if mismatched.

### **🔁 5. Duplicate Subscription Attempts**

**Scenario:\**
User refreshes browser or double-clicks "Start Installments," triggering
multiple subscription attempts.

**Expected Behavior:**

- Use idempotency keys when creating subscription.

- Backend should check for existing active Stripe subscription for
  projectId or contractId before creating a new one.

### **⚠️ 6. Switch from Installments to Pay-in-Full Mid-Checkout**

**Scenario:\**
User starts installment plan then switches to pay-in-full option.

**Expected Behavior:**

- Frontend clears Stripe session and destroys in-memory state.

- Backend must validate that only one payment type is submitted.

- If conflicting intent is detected, block checkout and alert user.

### **🏷️ 7. Metadata Inconsistencies**

**Scenario:\**
Stripe payment metadata is incomplete or missing (e.g. no userId,
installmentFrequency).

**Expected Behavior:**

- System should not mark payment as valid.

- Send internal alert to admin with Stripe ID and user email.

- Developer console must log a warning.

### **🧮 8. Total Payments Do Not Match Project Budget**

**Scenario:\**
Due to rounding or misconfig, total sum of all payments != project
total.

**Expected Behavior:**

- First payment (deposit) is rounded down

- Final payment is automatically adjusted to match total project budget

- Display logic shows correct installment breakdown up front
