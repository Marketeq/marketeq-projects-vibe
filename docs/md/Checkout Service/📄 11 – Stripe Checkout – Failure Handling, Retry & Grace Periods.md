# **📄 11 -- Stripe Checkout -- Failure Handling, Retry & Grace Periods**

### **🧭 Purpose**

This document defines the behavior of the Stripe Checkout system when
payment failures occur. It includes retry logic, grace periods (if any),
and consequences for failed installment or one-time payments. This
ensures that project and contract status are kept in sync with Stripe's
payment state.

## **⚠️ Failure Triggers**

Failures may occur in the following cases:

- Insufficient funds on credit card or ACH

- Card expired or declined

- ACH rejection (e.g., account closed)

- Manual cancellation of payment method

## **🔁 Retry Logic (Stripe Default)**

Stripe automatically retries failed subscription charges using Smart
Retries:

- **Up to 4 attempts** over a **7-day period\**

- Retried attempts are spaced based on Stripe's internal algorithm for
  likelihood of success

- If a payment succeeds during retry, project or contract resumes
  automatically

## **⏸️ Immediate Consequences of First Failure**

- On the **first failed attempt**, the project or contract is
  immediately **paused**.

- Clients are notified via the notification-service (email + in-app)

- A warning is displayed in the UI prompting the user to update payment
  method

> 🔒 Pausing only restricts new milestones or tasks. Work already paid
> for may continue until the prepaid period ends.

## **⏳ Grace Periods**

Industry standards vary, but for Marketeq:

- **No grace period is applied** after first failure.

- The system will pause access right away.

- This approach discourages abuse of auto-retries and keeps compliance
  with prepay model.

## **🔄 Recovery After Retry Success**

If the payment succeeds during retry attempts:

- Project or contract is **automatically resumed\**

- Stripe webhook invoice.payment_succeeded updates project status

- Notification-service sends a \"Resumed\" status update to client

## **🔁 Manual Intervention (Not Preferred)**

Manual reactivation is discouraged, but possible for exceptions:

- Admins may override pause status via the internal admin tool (future
  sprint)

- All manual updates must log user ID, reason, and timestamp for audit

## **🔐 Badge Revocation Logic**

If a payment fails:

- The **\"Payment Verified\" badge is revoked immediately\**

- Badge is reinstated only when a successful payment occurs

## **🧠 CTO Notes**

- Grace periods were rejected based on prepay model logic

- Stripe's Smart Retry is sufficient for our needs

- All failure handling logic is centralized in webhook
  invoice.payment_failed

- ACH does **not** have automatic retries by default --- we will
  implement smart retry logic manually if needed

✅ Confirmed for sprint inclusion.

## **🔗 Related Docs**

- 07 -- Webhook Events → Webhook implementation

- 08 -- Payment Method Support → Supported methods and fallback logic

- 10 -- Installment Plans → Pausing rules for failed subscriptions

- 11 -- Payment Verification Logic → Badge rules and status updates
