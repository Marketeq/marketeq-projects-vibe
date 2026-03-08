# **📄 10 -- Stripe Checkout -- Installment Plans**

### **🗺️ Purpose**

This document explains how installment plans are implemented in the
Marketeq Checkout flow. It outlines the subscription logic, metadata
handling, webhook behaviors, and failure/retry mechanisms that govern
installment-based payments.

## **📆 Overview**

Installment plans allow clients to pay for a project in recurring
segments rather than a lump sum. The user selects a frequency (e.g.,
weekly, bi-weekly, monthly, quarterly, or yearly) from the dropdown UI
in the checkout flow. Installment plans are powered via **Stripe
Subscriptions**.

## **✅ Supported Intervals**

- **Weekly**: 7-day billing cycle

- **Bi-Weekly**: 14-day billing cycle

- **Monthly**: 1-month billing cycle

- **Quarterly**: 3-month billing cycle

- **Yearly**: 12-month billing cycle

These intervals are stored in Stripe subscription metadata and synced to
the project record in the Listings DB.

## **📅 Subscription Setup**

- **Tool:** Stripe Subscriptions API

- **Billing Logic:** First installment is charged immediately.

- **Metadata:** Includes installment_frequency, installment_amount,
  project_id, and client_id

- **Invoice Tracking:** Stripe generates separate invoices per
  installment. Each invoice links back to the project ID and installment
  ID.

## **🧳️ Payment Failure Behavior**

- On **first payment failure**:

  - Project is **paused immediately\**

  - Payment Verified badge is **revoked\**

  - Notification sent via notification-service (email + in-app)

  - Stripe\'s retry logic attempts retries based on their dunning
    configuration

- Retry attempts are managed using **Stripe\'s automatic retry logic**
  (recommended setup: 4 retries over 7 days)

- After final failure:

  - Project remains paused

  - Status marked as payment_failed

## **📝 UI Status Handling**

- During active installment:

  - Project displays \"Payment Active\"

  - Next billing date shown in UI

- On failure:

  - Project displays \"Payment Paused -- Retry in Progress\"

  - Retry countdown is visible if available from Stripe API

- On manual re-initiation:

  - Clients can manually pay failed invoice via dashboard

## **🧲️ Metadata Fields**

Stripe metadata associated with installment plans includes:

  -------------------------------------------------
  **Key**              **Description**
  -------------------- ----------------------------
  installment_plan     Boolean (true if enabled)

  installment_type     Frequency string (e.g.,
                       monthly)

  installment_amount   Amount per billing cycle

  total_amount         Full project total

  project_id           Internal project ID

  client_id            Internal client ID

  start_date           Timestamp of first
                       successful charge
  -------------------------------------------------

## **✨ Best Practices**

- Users should be required to agree to installment terms before
  initiating checkout.

- Only one active subscription per project should exist at a time.

- Include reminders 24 hours before each installment via
  notification-service.

- All installment invoices should appear in the user\'s billing
  dashboard.

## **🔗 Related Docs**

- 08 -- Payment Method Support

- 07 -- Webhook Events

- 11 -- Payment Verification Logic

# **📄 10 -- Stripe Checkout -- Installment Plans**

### **🧭 Purpose**

This document outlines how installment plans are implemented in the
Marketeq Checkout system using Stripe Subscriptions. It includes UI
behavior, backend logic, webhook handling, and database metadata
structure. It also provides code examples and step-by-step guidance for
both frontend and backend teams.

## **🧩 Overview**

- Clients can split a project payment into **weekly**, **biweekly**,
  **monthly**, **quarterly**, **annually**, or **pay-in-full**
  installments.

- Installments are scheduled in advance and powered by Stripe
  Subscriptions.

- All sensitive billing logic is handled by Stripe for PCI compliance.

## **🖥️ Frontend Integration**

### **UI Logic:**

- During checkout, clients select a payment frequency from a dropdown.

- Each option triggers metadata passed to the backend and Stripe.

// Example payload sent from frontend to backend

const payload = {

projectId: \'abc123\',

paymentFrequency: \'monthly\', // or \'weekly\', \'quarterly\', etc.

paymentMethod: \'card\',

amount: 12000,

};



## **🛠️ Backend Implementation**

### **Creating a Stripe Subscription**

****const stripe = require(\'stripe\')(process.env.STRIPE_SECRET_KEY);

const subscription = await stripe.subscriptions.create({

customer: customerId,

items: \[

{

price_data: {

currency: \'usd\',

product: \'prod_PROJECT_ID\',

unit_amount: 1200000 / 12, // Split into 12 monthly installments

recurring: { interval: \'month\' },

},

},

\],

metadata: {

project_id: \'abc123\',

payment_frequency: \'monthly\',

client_id: \'xyz789\',

},

payment_behavior: \'default_incomplete\',

expand: \[\'latest_invoice.payment_intent\'\],

});

### **Webhook: Handle Installment Payment Success**

****if (event.type === \'invoice.payment_succeeded\') {

const subscription = event.data.object.subscription;

const metadata = event.data.object.lines.data\[0\].metadata;

// Update DB to log payment success and issue receipt

await db.installmentPayments.create({

projectId: metadata.project_id,

clientId: metadata.client_id,

amountPaid: event.data.object.amount_paid,

paymentDate: new Date(),

});

}

### **Webhook: Handle Installment Payment Failure**

****if (event.type === \'invoice.payment_failed\') {

const subscription = event.data.object.subscription;

// Pause the project and notify the client

await db.projects.update({

id: metadata.project_id,

status: \'paused\',

});

// Trigger notification-service

notifyClientOfFailedPayment(clientId);

}



## **🧾 Database Schema Notes**

  -----------------------------------------------------------------
  **Field Name**           **Type**   **Description**
  ------------------------ ---------- -----------------------------
  project_id               UUID       Links the payment to a
                                      project

  client_id                UUID       Links the payment to a client

  frequency                String     \'monthly\', \'weekly\', etc.

  stripe_subscription_id   String     Stripe\'s subscription ID

  status                   String     \'active\', \'canceled\',
                                      \'paused\'

  next_payment_due         DateTime   Stripe-calculated next charge
                                      date

  metadata                 JSON       Copy of all related payment
                                      metadata
  -----------------------------------------------------------------

## **🔄 Retry Behavior**

- Stripe automatically retries failed subscription charges.

- Retries follow Stripe's smart retry logic (up to 3--4 times over \~1
  week).

- On the **first failed attempt**, the project is paused.

- If payment succeeds after retry, the project resumes automatically.

## **🧠 Notes for Future Sprints**

- Overages and late fees are not included in this sprint.

- Paused projects still allow work until the prepaid period ends.

- Future iterations may include user-facing dashboards to manage
  subscriptions.

## **🔗 Related Docs**

- 07 -- Webhook Events → for webhook setup

- 08 -- Payment Method Support → overview of Stripe capabilities

- 11 -- Payment Verification Logic → logic for badge and project status
