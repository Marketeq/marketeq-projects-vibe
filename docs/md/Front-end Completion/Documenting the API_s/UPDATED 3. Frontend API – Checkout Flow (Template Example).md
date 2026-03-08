# **API Documentation -- Checkout Flow (Template Example)**

**Base URL:** \${process.env.NEXT_PUBLIC_API_BASE_URL}/v1\
**Auth:** Authorization: Bearer \<token\> for protected calls\
**Content-Type:** application/json\
**Errors:** Non-2xx returns include JSON { \"message\": string,
\"code\": string? }\
**Notes:** The frontend talks only to the API **Gateway**. Do not call
microservice URLs directly.

## 

## **🧭 1. System Overview**

## The **Checkout Service** is a core component of the Marketeq platform responsible for managing all client-side payment flows and transaction lifecycles. It enables seamless and secure checkout for projects, services, and subscriptions, supporting multiple payment methods and installment schedules.

## Its role is to ensure a unified billing experience across the entire ecosystem --- handling **Stripe payments**, **ACH/Link**, **wire transfers**, **gift cards**, and **account balance** deductions --- while integrating with internal services for project, user, and contract validation.

## The Checkout Service bridges the financial logic between clients, talent, and backend systems such as Stripe and QuickBooks. It powers every frontend screen where payments occur, from upfront deposits to recurring installment processing.

## 

## **🧱 2. High-Level Architecture**

## The checkout platform follows a **modular client--backend--payment gateway** model designed for reliability, flexibility, and security.

### **1. Frontend (Next.js + TypeScript)**

## Handles all user-facing payment interactions, including entering card/bank details, reviewing totals, and confirming payments. 

## Fetches project and pricing data via REST API calls to the Checkout Service. 

## Displays installment schedules and dynamically updates totals. 

## Communicates directly with **Stripe.js / Stripe Elements** for tokenized payment entry. 

## Submits final requests to the backend for payment intent creation and confirmation. 

### **2. Backend (NestJS + TypeScript)**

## Core server that manages all payment logic and integrations. 

## Provides REST APIs for: 

## Creating and confirming payment intents 

## Managing installment plan subscriptions 

## Processing gift cards and balance credits 

## Generating QuickBooks invoices for wire transfers 

## Handling refunds and webhook events 

## Maintains complete payment lifecycle records in PostgreSQL. 

## Synchronizes data with external and internal systems to ensure financial consistency. 

### **3. External Payment & Accounting Layers**

## **Stripe** -- Handles all card, ACH, Link, Apple Pay, and Google Pay transactions. 

## **QuickBooks** -- Manages invoice creation and reconciliation for wire transfer transactions. 

## **Mercury Bank Webhooks** -- Confirms incoming wires and updates payment statuses automatically. 

### **4. Storage & Data Layers**

## **PostgreSQL** -- Main database for transaction records, installment schedules, and user payment history. 

## **Cloudflare R2** -- Optional storage for receipts, invoice PDFs, and payment confirmation documents. 

## 

## **⚙️ 3. Workflow Overview**

### **1. User Initiates Checkout**

## A user reviews a scoped project or service. 

## The frontend retrieves the checkout summary (project details, deposit, and total). 

### **2. Create Payment Intent**

## Frontend requests the backend to create a Stripe payment intent. 

## Checkout Service verifies project totals and user eligibility. 

## Stripe returns a client_secret used by the frontend to confirm payment securely. 

### **3. Upfront Deposit Handling**

## For installment plans, the first payment (deposit) is charged immediately. 

## The backend calculates this automatically based on frequency: 

## Weekly → 1 week upfront 

## Biweekly → 2 weeks upfront 

## Monthly → 1 month upfront 

### **4. Confirm Payment**

## Frontend confirms the payment with Stripe using the client_secret. 

## Backend updates the payment status and notifies other services: 

## **Project Service** → marks project as funded 

## **Notification Service** → triggers payment confirmation message 

### **5. Installment Plan Creation**

## If the user selects recurring payments, a Stripe subscription is created. 

## Backend schedules charges, maps them to the total project budget, and syncs them with project duration. 

### **6. Wire Transfer & Manual Payment Flow**

## For wire transfer checkouts, QuickBooks invoices are generated automatically. 

## The system waits for confirmation from **Mercury Bank Webhooks** before marking invoices as paid. 

## All wire transactions are logged in Airtable for Accounts Receivable review. 

### **7. Gift Card & Account Balance Deduction**

## If the user applies a gift card or internal credit balance, the backend automatically deducts the amount from the total due before creating the Stripe payment intent. 

### **8. Order Completion**

## After payment succeeds, the Checkout Service generates a record in the orders table. 

## The frontend redirects the user to the "Payment Successful / Order Confirmation" page. 

## Confirmation emails or notifications are dispatched automatically. 

## 

## **🧩 4. Key Dependencies & Modules**

### **Frameworks & Libraries**

## **NestJS** -- Main backend framework handling routes, modules, and business logic. 

## **TypeORM** -- ORM layer for managing the PostgreSQL schema. 

## **Stripe Node SDK** -- Payment intent and subscription management. 

## **QuickBooks SDK (node-quickbooks)** -- Invoice creation and synchronization. 

## **\@nestjs/schedule** -- Handles recurring charge scheduling for installment plans. 

## **Axios / HTTP Module** -- For internal service communication (User, Project, Notification). 

### **Databases**

## **PostgreSQL** -- Stores projects, payments, subscription schedules, refunds, and gift card usage. 

### **3rd-Party Services / APIs**

## **Stripe** -- Card, ACH, Apple Pay, Google Pay, and subscription handling. 

## **QuickBooks** -- Wire transfers and accounting. 

## **Mercury Bank API** -- Wire confirmation webhook integration. 

## **Airtable** -- AR tracking and reconciliation dashboard. 

### **Internal Services**

## **User Service** -- Fetches client and talent data for billing. 

## **Project Service** -- Retrieves project total, duration, and status. 

## **Notification Service** -- Sends payment confirmation and invoice emails. 

## 

## **🧱 5. Current State & Responsibilities**

### **✅ Features Completed**

## Stripe payment intent creation 

## Payment confirmation and webhook handling 

## Installment plan subscription setup 

## Dynamic schedule and deposit logic 

## Gift card and account balance deduction 

## Wire transfer QuickBooks integration 

## Mercury webhook-based status updates 

### **🧩 In Progress**

## Refund flow and credit memo generation 

## Partial balance reconciliation between Stripe and QuickBooks 

## Payment summary analytics 

### **🚧 Planned**

## Multi-currency support 

## Automated dispute management 

## Payment reporting dashboards 

### **⚠️ Known Issues / Blockers**

## QuickBooks sandbox intermittently delays invoice confirmations. 

## Stripe test mode webhooks occasionally mismatch with live data. 

## Some project duration edge cases require recalculation of total installments. 

## 

## **🔐 6. Access & Tools**

+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **Tool**                    | ## **Purpose**                           | ## **Notes**                                                     |
+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **GitHub Repo**             | ## Checkout Service codebase             | ## marketeq-projects-nestjs/apps/checkout-service                |
+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **Vercel Frontend Project** | ## Testing & Live builds                 | ## marketeq-projects-frontend-testing and marketeq-projects-live |
+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **Postman Collection**      | ## Testing endpoints                     | ## Includes all Checkout API routes with sample payloads         |
+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **Environment Setup**       | ## Local .env variables                  | ## Stripe test keys, QuickBooks credentials, Mercury webhooks    |
+--------------------------------+------------------------------------------+------------------------------------------------------------------+
| ## **QA Testing Flow**         | ## Verify via Vercel Testing → QA → Live | ## Must pass manual & automated test suite                       |
+================================+==========================================+==================================================================+

## 

## **Sections in this epic**

1.  Cart & Pricing

2.  Payment Methods

3.  Payment Intents & Confirmation

4.  Orders & Confirmation Page

## **1) Cart & Pricing**

### **Get Active Cart**

- **Purpose:** Fetch the user's current cart with items, totals, taxes,
  and discounts for the checkout page.

- **Used in UI:** Checkout -- Step 1 (Order Review)

- **Method & URL:** GET /v1/checkout/cart

- **Auth:** Bearer token (required)

- **Query Params:\**

  - currency *(string, optional)* --- Example: USD

- **Response (200):\**

****{

\"id\": \"cart_8f3a\",

\"items\": \[

{ \"id\": \"ci_101\", \"sku\": \"PRJ-BASIC\", \"name\": \"Project
Setup\", \"qty\": 1, \"unitPrice\": 49900 }

\],

\"subtotal\": 49900,

\"discounts\": 0,

\"tax\": 0,

\"total\": 49900,

\"currency\": \"USD\"

}

- **Common Errors:\**

  - 401 Not authenticated

  - 404 Cart not found

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/checkout/cart?currency=USD\`,
{

headers: { Authorization: \`Bearer \${token}\` }

});

if (!res.ok) throw new Error((await res.json()).message);

const cart = await res.json();

### **Update Cart Item Quantity**

- **Purpose:** Change quantity for a line item before payment.

- **Used in UI:** Checkout -- Step 1 (Quantity controls)

- **Method & URL:** PATCH /v1/checkout/cart/items/{cartItemId}

- **Auth:** Bearer token (required)

- **Path Params:\**

  - cartItemId *(string, required)* --- Example: ci_101

- **Request Body:\**

****{ \"qty\": 2 }

- **Response (200):\**

****{

\"id\": \"cart_8f3a\",

\"items\": \[

{ \"id\": \"ci_101\", \"sku\": \"PRJ-BASIC\", \"name\": \"Project
Setup\", \"qty\": 2, \"unitPrice\": 49900 }

\],

\"subtotal\": 99800,

\"discounts\": 0,

\"tax\": 0,

\"total\": 99800,

\"currency\": \"USD\"

}

- **Common Errors:\**

  - 400 Invalid quantity

  - 404 Item not found

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/checkout/cart/items/\${cartItemId}\`,
{

method: \'PATCH\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${token}\`

},

body: JSON.stringify({ qty: 2 })

});

if (!res.ok) throw new Error((await res.json()).message);

const cart = await res.json();



## **2) Payment Methods**

### **List Saved Payment Methods**

- **Purpose:** Show the user's saved cards/banks to select for payment.

- **Used in UI:** Checkout -- Step 2 (Payment Method selection)

- **Method & URL:** GET /v1/payment-methods

- **Auth:** Bearer token (required)

- **Response (200):\**

****{

\"data\": \[

{ \"id\": \"pm_abc123\", \"brand\": \"visa\", \"last4\": \"4242\",
\"expMonth\": 12, \"expYear\": 2030, \"type\": \"card\" }

\]

}

- **Common Errors:\**

  - 401 Not authenticated

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/payment-methods\`, {

headers: { Authorization: \`Bearer \${token}\` }

});

if (!res.ok) throw new Error((await res.json()).message);

const { data: methods } = await res.json();

### **Attach New Payment Method (tokenized)**

- **Purpose:** Attach a newly tokenized method (from Stripe.js/Link) to
  the user.

- **Used in UI:** Checkout -- Step 2 (Add new card/bank)

- **Method & URL:** POST /v1/payment-methods

- **Auth:** Bearer token (required)

- **Request Body:\**

****{ \"paymentMethodToken\": \"tok_1Nv\...\" }

- **Response (201):\**

****{ \"id\": \"pm_new789\", \"brand\": \"visa\", \"last4\": \"4242\",
\"type\": \"card\" }

- **Common Errors:\**

  - 400 Invalid token

  - 402 Tokenization failed

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/payment-methods\`, {

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${token}\`

},

body: JSON.stringify({ paymentMethodToken })

});

if (!res.ok) throw new Error((await res.json()).message);

const method = await res.json();



## **3) Payment Intents & Confirmation**

### **Create Payment Intent**

- **Purpose:** Create a payment intent for the current cart total and
  selected method.

- **Used in UI:** Checkout -- Step 3 (Pay button: pre-confirm step)

- **Method & URL:** POST /v1/payments/intents

- **Auth:** Bearer token (required)

- **Request Body:\**

****{

\"amount\": 99800,

\"currency\": \"USD\",

\"paymentMethodId\": \"pm_abc123\",

\"captureMethod\": \"automatic\"

}

- **Response (201):\**

****{

\"id\": \"pi_67890\",

\"status\": \"requires_confirmation\",

\"clientSecret\": \"pi_client_secret_abc\",

\"amount\": 99800,

\"currency\": \"USD\"

}

- **Common Errors:\**

  - 400 Validation failed

  - 402 Payment method declined

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/payments/intents\`,
{

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${token}\`

},

body: JSON.stringify({

amount: cart.total,

currency: \'USD\',

paymentMethodId: selectedPmId,

captureMethod: \'automatic\'

})

});

if (!res.ok) throw new Error((await res.json()).message);

const intent = await res.json(); // use intent.clientSecret on the
client if required

### **Confirm Payment**

- **Purpose:** Confirm the payment (server-side API confirmation; client
  may also confirm with clientSecret if required).

- **Used in UI:** Checkout -- Step 3 (Final confirm)

- **Method & URL:** POST /v1/payments/confirm

- **Auth:** Bearer token (required)

- **Request Body:\**

****{ \"paymentIntentId\": \"pi_67890\" }

- **Response (200):\**

****{ \"id\": \"pi_67890\", \"status\": \"succeeded\", \"amount\":
99800, \"currency\": \"USD\" }

- **Common Errors:\**

  - 402 Payment failed

  - 409 Already confirmed

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/payments/confirm\`,
{

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${token}\`

},

body: JSON.stringify({ paymentIntentId: intent.id })

});

if (!res.ok) throw new Error((await res.json()).message);

const paid = await res.json();



## **4) Orders & Confirmation Page**

### **Create Order from Successful Payment**

- **Purpose:** Generate a finalized order record after a successful
  payment.

- **Used in UI:** Checkout -- Post-payment transition to Confirmation
  page

- **Method & URL:** POST /v1/orders

- **Auth:** Bearer token (required)

- **Request Body:\**

****{

\"paymentIntentId\": \"pi_67890\",

\"cartId\": \"cart_8f3a\"

}

- **Response (201):\**

****{

\"id\": \"ord_22aa\",

\"number\": \"MK-2025-000123\",

\"status\": \"paid\",

\"total\": 99800,

\"currency\": \"USD\",

\"createdAt\": \"2025-10-08T16:01:00.000Z\"

}

- **Common Errors:\**

  - 400 Missing or invalid refs

  - 409 Order already created

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/orders\`, {

method: \'POST\',

headers: {

\'Content-Type\': \'application/json\',

Authorization: \`Bearer \${token}\`

},

body: JSON.stringify({ paymentIntentId: intent.id, cartId: cart.id })

});

if (!res.ok) throw new Error((await res.json()).message);

const order = await res.json();

### **Get Order by ID**

- **Purpose:** Fetch the order to render the confirmation page and
  receipt.

- **Used in UI:** Order Confirmation page (and "View Order" links)

- **Method & URL:** GET /v1/orders/{orderId}

- **Auth:** Bearer token (required)

- **Path Params:\**

  - orderId *(string, required)* --- Example: ord_22aa

- **Response (200):\**

****{

\"id\": \"ord_22aa\",

\"number\": \"MK-2025-000123\",

\"status\": \"paid\",

\"total\": 99800,

\"currency\": \"USD\",

\"items\": \[

{ \"sku\": \"PRJ-BASIC\", \"name\": \"Project Setup\", \"qty\": 2,
\"unitPrice\": 49900 }

\]

}

- **Common Errors:\**

  - 401 Not authenticated

  - 404 Order not found

- **Copy-Paste Example:\**

****const res = await
fetch(\`\${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/orders/\${orderId}\`,
{

headers: { Authorization: \`Bearer \${token}\` }

});

if (!res.ok) throw new Error((await res.json()).message);

const order = await res.json();



## **Appendix (optional -- only if you want it in this doc)**

- **Public Reference Data:** e.g., GET /v1/public/currencies (no auth)

- **Non-UI Admin/Internal:** Omit from FE docs; keep in OpenAPI for
  engineering use.

### **Quick Wiring Notes (for devs skimming)**

- Use NEXT_PUBLIC_API_BASE_URL from env; do **not** hard-code API hosts.

- Always send Authorization: Bearer \<token\> for protected calls.

- Treat amounts as **cents** (integers).

- Handle non-2xx by reading message from JSON and showing a friendly
  error.
