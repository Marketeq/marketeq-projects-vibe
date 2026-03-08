# **📄 06 -- Stripe Checkout -- Payment Verification Logic**

### **🧭 Purpose**

This document defines how payment verification is determined on the
Marketeq platform. It outlines the logic for setting, maintaining, or
revoking the **Payment Verified** badge for a user or project after
Stripe checkout. This logic applies to both one-time and recurring
payments and includes fallback behavior for failures or edge cases.

## **✅ When a User is Marked as Payment Verified**

A user receives the **Payment Verified** badge immediately after their
**first successful payment** via Stripe, regardless of amount. This
badge is shown on their public client profile and used to establish
trust.

**Applies to:**

- Project-based one-time payments

- Subscription-based installment plans

- Gift card + wallet combinations

**Trigger Point:**

- Stripe webhook: checkout.session.completed

## **🛑 When a User\'s Payment Verified Badge is Revoked**

If any **active** payment method fails or a **subscription renewal
fails**, the system will revoke the badge.

**Trigger Points:**

- invoice.payment_failed

- payment_intent.payment_failed

**Revocation Actions:**

- Remove badge from profile

- Trigger notification to user

- Pause subscription project (if applicable)

> ⚠️ No grace period is currently implemented. Payment failure =
> immediate badge revocation.

## **🔄 Badge Behavior for Subscriptions**

- The badge is granted after the first installment clears.

- It is revoked immediately if any subsequent scheduled payment fails.

- If the payment is successfully retried (automatically or manually),
  the badge is re-issued.

**Re-verification Trigger:**

- Stripe webhook: invoice.payment_succeeded or payment_intent.succeeded

## **🧠 Wire Transfers**

Wire transfers do not grant the badge automatically.

**Pending Confirmation State:**

- After selecting wire transfer and submitting checkout, the project
  status is set to Pending Wire Confirmation.

- A member of the accounts receivable team manually confirms payment.

- Once confirmed, the badge is granted, and status is updated to Payment
  Verified.

> 📝 Future sprints will automate wire verification logic.

## **🧰 Metadata Fields Affected**

These metadata flags are updated via webhook listeners and stored in the
database:

  -----------------------------------------------------------------
  **Field**              **Description**
  ---------------------- ------------------------------------------
  payment_verified       Boolean, true/false for badge visibility

  payment_verified_at    Timestamp of badge grant

  payment_method_type    Used for analytics and badge context

  badge_revoked_reason   If revoked, shows failure cause (e.g.,
                         payment_failed)
  -----------------------------------------------------------------

## **🔁 Integration with Other Systems**

- Triggers in notification-service for badge granted or revoked

- Visibility updates on profile view in frontend

- Optional audit log for financial admins

## **🏁 Summary**

This logic ensures payment verification is handled automatically based
on Stripe webhook events. It builds trust in the platform while
protecting against fraudulent or lapsed payments. Badge logic is
isolated from project or contract type, and instead focuses solely on
payment status.
