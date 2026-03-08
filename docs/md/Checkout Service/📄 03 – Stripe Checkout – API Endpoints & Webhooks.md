# **📄 03 -- Stripe Checkout -- API Endpoints & Webhooks**

### **🧭 Purpose**

This document outlines all backend REST API endpoints and Stripe webhook
listeners required for the **Stripe Checkout microservice**. These
endpoints power the core checkout experience for the Marketeq platform,
including single and recurring payments, split payments, metadata
storage, and post-checkout status updates. All endpoints are triggered
by the frontend checkout flow and map directly to Stripe logic.

The API endpoints below cover:

- Checkout session creation and redirects

- Gift card application

- Wallet deductions

- Split payments and subscriptions

- Metadata storage

- Confirmation and cancellation

- Webhook-based automation and fallback flows

## **🔐 Authentication & Authorization**

All endpoints below require authentication via Bearer token. Roles
permitted: client, admin.

## **🚀 API Endpoints**

### **1. Create Checkout Session**

****POST /api/checkout/session

Create a new Stripe Checkout session and return the redirect URL.

**Request Body:**

****{

\"projectId\": \"uuid\",

\"contractId\": \"uuid\",

\"paymentMethod\": \"card\|ach\|wire\",

\"installmentPlanOption\": \"monthly\|biweekly\|full\",

\"splitPaymentEnabled\": true,

\"initialPaymentAmount\": 1000,

\"giftCardCode\": \"ABC123\",

\"walletBalanceUsed\": 200,

\"clientId\": \"uuid\"

}

**Response:**

****{

\"checkoutUrl\": \"https://checkout.stripe.com/\...\"

}



### **2. Apply Gift Card Code**

****POST /api/checkout/apply-giftcard

Validate and apply a gift card to the current checkout.

**Request Body:**

****{

\"giftCardCode\": \"ABC123\"

}

**Response:**

****{

\"valid\": true,

\"amount\": 100

}



### **3. Calculate Wallet Deduction**

****POST /api/checkout/use-wallet

Use the wallet balance to reduce checkout amount.

**Request Body:**

****{

\"walletBalanceUsed\": 200

}

**Response:**

****{

\"applied\": true,

\"remainingAmount\": 800

}



### **4. Confirm Payment Success**

****POST /api/checkout/confirm

Called after Stripe confirms the payment success (via webhook or
client-side redirect).

**Request Body:**

****{

\"sessionId\": \"stripe-session-id\",

\"clientId\": \"uuid\",

\"projectId\": \"uuid\",

\"contractId\": \"uuid\"

}

**Response:**

****{

\"status\": \"success\"

}



### **5. Cancel Checkout**

****POST /api/checkout/cancel

Cancel a pending checkout session.

**Request Body:**

****{

\"sessionId\": \"stripe-session-id\"

}



### **6. Create Subscription (Installments)**

****POST /api/checkout/subscribe

Create a new Stripe Subscription (if using installments).

**Request Body:**

****{

\"clientId\": \"uuid\",

\"projectId\": \"uuid\",

\"contractId\": \"uuid\",

\"installmentPlanOption\": \"monthly\",

\"numberOfPayments\": 4,

\"startDate\": \"2025-06-10\"

}



### **7. Submit Split Payment**

****POST /api/checkout/split-payment

Process initial split payment and schedule the remainder.

**Request Body:**

****{

\"initialPaymentAmount\": 2000,

\"remainingTerms\": \"Due in 2 weeks\",

\"projectId\": \"uuid\"

}



### **8. Store Stripe Metadata**

****POST /api/checkout/store-metadata

Store metadata associated with a Stripe checkout session.

**Request Body:**

****{

\"sessionId\": \"stripe-session-id\",

\"metadata\": {

\"clientId\": \"uuid\",

\"projectId\": \"uuid\",

\"giftCardId\": \"uuid\",

\"installmentPlanId\": \"uuid\"

}

}



### **9. Retrieve Checkout Status**

****GET /api/checkout/status/:sessionId

Returns the payment status, confirmation state, and metadata.

## **📡 Webhook Listeners**

### **1. Stripe Payment Success**

****POST /api/checkout/webhook/payment-success

Triggered by checkout.session.completed

- Verifies project status

- Sets paymentVerified badge

- Triggers notification

### **2. Stripe Payment Failed**

****POST /api/checkout/webhook/payment-failed

Triggered by invoice.payment_failed or payment_intent.payment_failed

- Revokes verified badge

- Pauses project (if subscription)

- Logs failure to retry queue

### **3. Stripe Subscription Canceled**

****POST /api/checkout/webhook/subscription-canceled

- \
  Cancels recurring billing

- Updates project status to \"Paused until renewal\"
