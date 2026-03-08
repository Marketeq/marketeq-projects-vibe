# **📘 Front-End Integration -- Stripe Checkout & Payment Flow**

**Final Developer-Ready Guide**

This document outlines the **complete frontend integration** for the
Stripe-powered payment system, supporting:

- Installment plans

- Gift card and account balance

- Credit card and ACH via Stripe Link

- Split payments

- Real-time status updates

- Post-payment confirmations

- Manual wire transfer fallback

It is designed for **Next.js** + **Stripe.js** using **API routes** and
**REST endpoints**.

## **🧭 Overview of Checkout UX Flow**

1.  **Project Details Page\**

2.  **Payment Method Selection\**

3.  **Installment Plan Selection (if applicable)\**

4.  **Balance + Gift Card Application\**

5.  **Add or Select Payment Methods (Card / ACH / Wallets)\**

6.  **Split Payment Option\**

7.  **Confirmation Screen\**

8.  **Thank You Page\**

9.  **Next Steps\**

## **🧩 Data Sources and API Dependencies**

  **Element**                **Consumed From**              **Endpoint**
  -------------------------- ------------------------------ --------------------------------------------------
  Project Summary            Backend Checkout Service       /api/checkout/init
  Installment Plan Details   Backend                        /api/checkout/installments
  Saved Payment Methods      Backend → Stripe               /api/checkout/methods
  Available Balance          Wallet Service                 /api/balance
  Gift Card Balance          Gift Card Service              /api/gift-cards
  Submit Payment             Checkout Service               /api/checkout/submit
  Sync Status                Webhooks (Stripe/QuickBooks)   /api/webhooks/stripe
  Mandate Authorization      Stripe Link/ACH                Handled via Stripe Element + Confirmation Dialog

## **🖥️ 1. Project Details & Checkout Init**

****// Example API Call

const project = await fetch(\'/api/checkout/init?contractId=abc123\')

const data = await project.json()

// Expected Fields

data = {

projectName: \"Website Revamp\",

totalCost: 5600,

contractId: \"abc123\",

clientName: \"ACME Corp\",

startDate: \"2025-08-01\",

duration: \"3 months\",

isInstallmentEligible: true,

}



## **🗓️ 2. Installment Plan Selection**

Display UI for selecting **weekly / biweekly / monthly**.

// Backend calculated logic

const res = await
fetch(\`/api/checkout/installments?contractId=abc123&frequency=biweekly\`)

const data = await res.json()

// Response Example

data = {

totalAmount: 5600,

depositAmount: 1120, // (2 weeks upfront)

installmentAmount: 1120,

frequency: \"biweekly\",

numberOfInstallments: 5,

schedule: \[\"2025-08-01\", \"2025-08-15\", \"2025-08-29\",
\"2025-09-12\", \"2025-09-26\"\]

}



## **💰 3. Account Balance + Gift Card Application**

****const res = await fetch(\`/api/balance\`)

const { balance } = await res.json()

const res2 = await fetch(\`/api/gift-cards\`)

const { giftCardBalance } = await res2.json()

- \
  Toggle checkbox for **"Apply Account Balance"\**

- Toggle for **"Apply Gift Card"\**

- Button: Convert Gift Card to TEQ Coin (Triggers POST
  /api/gift-cards/convert)

## **💳 4. Payment Method Selection (Card, ACH, Apple Pay, Google Pay)**

### **Stripe Card Element (Basic Setup)**

****\<CardElement options={styleOptions} /\>

### **Stripe ACH (Manual Entry + Link)**

- Show **Stripe Link** Element.

- Checkbox for **ACH Mandate Authorization**.

- If manual, display secondary screen to confirm mandate.

\<PaymentElement /\>

// Stripe Link auto-detects saved or new bank



## **🔀 5. Split Payment UI**

- Toggle: **Use Multiple Payment Methods\**

- Split slider or two-card toggle to divide amount.

- Display calculated amount per method.

**Handled in backend upon /checkout/submit**:

{

method1: {

type: \"card\",

amount: 4000,

paymentMethodId: \"pm_123\"

},

method2: {

type: \"bank\",

amount: 1600,

paymentMethodId: \"pm_456\"

}

}



## **✅ 6. Confirmation Screen**

Display:

- Project name

- Payment method(s)

- Installment plan

- Subtotal, fees, applied balance, final charge

- Mandate checkbox (for ACH)

On \"Confirm & Pay\", POST to:

POST /api/checkout/submit

Body includes:

- selected methods

- contract ID

- amount

- any balances or gift card use

## **🎉 7. Thank You Page**

Shows:

- Payment success

- Status: Paid / Pending (for ACH)

- Amount charged

- CTA: Go to Dashboard / Project View

## **🔁 8. Post-Payment Status Handling**

Frontend polls or listens to /api/payment-status?contractId=abc123:

{

status: \"paid\", // or \"pending\" or \"failed\"

confirmedAt: \"2025-07-17T14:20:00Z\",

method: \"card\",

amount: 5600

}

Failed status should show an error screen or payment retry button.

## **⚠️ 9. Payment Failures**

Display error screen with:

- "Your payment failed."

- "Please try again or contact support."

- Optionally reloads the checkout session with saved data.

No auto-retry shown on UI.

## **🛡️ 10. Wire Transfer Flow (Manual)**

Wire transfer tab shows:

- Bank name

- Account number

- Routing number

- Memo field with Project ID

- Status: Awaiting Confirmation

- Reminder: "May take 1--2 business days"

No client-side confirmation possible. Status is updated via QuickBooks
sync.

## **🧪 Developer Notes**

- Stripe Elements handles Google Pay, Apple Pay if enabled via
  dashboard.

- Stripe Link must be configured for ACH manually.

- Mandate screen is a separate modal or inline confirmation UI.

- All amounts are calculated by backend only. No frontend logic should
  calculate totals or taxes.
