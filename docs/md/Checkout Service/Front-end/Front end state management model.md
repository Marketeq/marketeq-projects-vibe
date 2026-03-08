**Front End State Management Model**

We assume the same rules we already established in the backend checkout
docs + Figma:

- **Backend owns all pricing math** (no recalculations in the frontend)

- **Installment plans = Stripe subscription + mandatory deposit\**

- **Pay in full = one-time Stripe charge (or wire), no subscription
  created\**

- **Wire = QuickBooks invoice + Mercury bank instructions (no Stripe
  invoice)\**

Below is the **state model** your frontend should use, with a clear
split between:

- Shared checkout state

- Extra fields for **Pay in Full\**

- Extra fields for **Installment Plan\**

## **1️⃣ Shared Checkout State (used by *all* flows)**

This is what your CheckoutProvider (or equivalent) should hold,
regardless of pay in full vs installment:

type PaymentMode = \"PAY_IN_FULL\" \| \"INSTALLMENT\";

type PaymentMethodType =

\| \"CARD\"

\| \"ACH\"

\| \"APPLE_PAY\"

\| \"GOOGLE_PAY\"

\| \"WIRE\"

\| \"KLARNA\"

\| \"BALANCE_ONLY\"

\| \"GIFT_CARD_ONLY\"

\| \"BALANCE_PLUS_CARD\"

\| \"GIFT_CARD_PLUS_CARD\";

interface Money {

amount: number; // in minor units (e.g., cents) or major --- match
backend

currency: string; // \"USD\"

}

interface CheckoutSharedState {

// Core identifiers (coming from your backend checkout session)

checkoutSessionId: string \| null; // from /checkout/session

projectId: string \| null; // or contractId depending on doc

clientId: string \| null; // usually implicit from auth, but ok to keep

environment: \"SANDBOX\" \| \"PRODUCTION\"; // optional but useful

// Project / pricing snapshot (backend-generated)

projectSummary: {

title: string;

description?: string;

durationInWeeks?: number;

// whatever we show on \"Project Details\" page

} \| null;

priceQuote: {

quoteId: string;

subtotal: Money;

tax: Money;

fees: Money; // Stripe / platform fees if surfaced

total: Money;

currency: string;

} \| null;

// Credits & balance (backend gives authoritative numbers)

credits: {

platformBalanceApplied: Money;

giftCardApplied: Money;

promoCode?: string \| null;

promoDiscount?: Money \| null;

};

// Global payment selection

paymentMode: PaymentMode \| null; // PAY_IN_FULL or INSTALLMENT

paymentMethodType: PaymentMethodType \| null;

// Stripe + ACH Link selection (used by both modes)

stripeCustomerId: string \| null;

stripePaymentMethodId: string \| null; // card, bank account, etc.

stripeSetupIntentId: string \| null; // esp. for ACH or saving card

stripeClientSecret: string \| null; // generic field for PI/SI
client_secret

// Wire / QuickBooks

wireSelected: boolean; // true if user chose bank transfer

quickBooksInvoiceId: string \| null; // generated when wire option
chosen

wireInstructionsUrl: string \| null; // link to bank details / PDF

// UX flags

termsAccepted: boolean;

marketingOptIn: boolean;

isSubmitting: boolean;

lastError: string \| null;

}

**Route usage:**

- /checkout/project-details\
  → loads checkoutSessionId, projectSummary, priceQuote.

- /checkout/payment\
  → sets paymentMode, paymentMethodType, Stripe method IDs, wire
  selection, credits.

From here, we fork into **Pay in Full** vs **Installment**.

## **2️⃣ Extra State for Pay in Full**

For pay-in-full, we're doing a **single one-time charge** (Stripe
PaymentIntent) or a **wire invoice**. No subscription.

interface PayInFullState {

// Purely backend-derived numbers -- never recompute in the frontend

amountDueNow: Money; // total - credits, for this single charge

amountCoveredByBalance: Money;

amountCoveredByGiftCard: Money;

amountChargedToPaymentMethod: Money; // what goes to card/ACH/Klarna

// Stripe one-time payment

paymentIntentId: string \| null; // from backend
/create-pay-in-full-intent

paymentIntentClientSecret: string \| null;

paymentStatus:

\| \"NOT_STARTED\"

\| \"REQUIRES_ACTION\"

\| \"PROCESSING\"

\| \"SUCCEEDED\"

\| \"FAILED\";

// Wire path (if paymentMethodType === \"WIRE\")

isWireFlow: boolean;

quickBooksInvoiceId: string \| null; // mirrors backend invoice
DocNumber

wireStatus: \"PENDING\" \| \"PAID\" \| \"FAILED\" \| \"CANCELLED\" \|
null;

}

### **How it plays out in the routes (Pay in Full)**

**On /checkout/payment:**

- User selects **"Pay in Full"\**
  → paymentMode = \"PAY_IN_FULL\"

- User chooses payment method:

  - Card/ACH/Apple Pay/Google Pay → paymentMethodType = \"CARD\" \|
    \"ACH\" \| \...

  - Wire → paymentMethodType = \"WIRE\" and wireSelected = true.

- Frontend calls backend something like:

  - **Card/ACH**: POST /checkout/pay-in-full/intent\
    → backend returns paymentIntentId, clientSecret, and the **final
    amountDueNow + breakdown**.

  - **Wire**: POST /checkout/pay-in-full/wire\
    → backend returns quickBooksInvoiceId, wireInstructionsUrl,
    amountDueNow.

- Store all that into PayInFullState.

**Then navigate:**

/checkout/payment

→ /checkout/review // uses PayInFullState + shared state

→ /checkout/confirmation

→ /checkout/success

On /checkout/review, you should show:

- Project name, scope snapshot

- Total price, credits, **pay in full amount\**

- Payment method (Visa ••••1234 / ACH / Wire)

- Terms checkbox → enabling "Confirm & Pay"

On **"Confirm & Pay"** for card/ACH:

- Call backend confirm endpoint (if you're using a 2-phase PI flow), or

- Let Stripe handle confirmCardPayment(clientSecret) if using
  client-side confirmation (but backend should still validate success
  and update the order).

For wire:

- "Confirm & Generate Invoice" just calls the backend if not already
  created, and then you show "Pending Wire Payment" on /confirmation.

## **3️⃣ Extra State for Installment Plans**

Installments are **subscription-based** with a **mandatory deposit**
equal to one period (week, 2 weeks, or month) according to your earlier
rules.

type InstallmentFrequency = \"WEEKLY\" \| \"BIWEEKLY\" \| \"MONTHLY\";

interface InstallmentScheduleItem {

installmentNumber: number; // 1..N

dueDate: string; // ISO date from backend

amount: Money;

isDeposit: boolean;

}

interface InstallmentPlanState {

// User choice

frequency: InstallmentFrequency \| null; // WEEKLY / BIWEEKLY / MONTHLY

// Calculated by backend based on project duration, pricing, and
frequency

planId: string \| null; // internal plan reference from backend

numInstallments: number; // N

depositAmount: Money; // first installment; mandatory

subsequentInstallmentAmount: Money; // normalized or average installment
amount

schedule: InstallmentScheduleItem\[\]; // full timeline we show in the
UI

// Stripe subscription info

subscriptionPreviewId: string \| null; // from preview endpoint

subscriptionId: string \| null; // after final confirm

subscriptionStatus:

\| \"NOT_CREATED\"

\| \"INCOMPLETE\"

\| \"ACTIVE\"

\| \"PAST_DUE\"

\| \"CANCELLED\";

// Deposit handling (Stripe PI for deposit)

depositPaymentIntentId: string \| null;

depositClientSecret: string \| null;

depositStatus:

\| \"NOT_STARTED\"

\| \"REQUIRES_ACTION\"

\| \"PROCESSING\"

\| \"SUCCEEDED\"

\| \"FAILED\";

}

### **Route flow for Installments**

**On /checkout/payment:**

- User selects **"Pay over time" / "Weekly/Biweekly/Monthly"\**
  → paymentMode = \"INSTALLMENT\"

- They still pick a payment method (card/ACH) because Stripe needs a
  default source for the subscription\
  → paymentMethodType = \"CARD\" \| \"ACH\"\
  → stripePaymentMethodId set.

**Navigate to:**

/checkout/payment

→ /checkout/installment-plan

**On /checkout/installment-plan:**

- User chooses frequency: **weekly / biweekly / monthly\**

- Frontend calls backend, something like:

POST /checkout/installments/preview

Body:

{

checkoutSessionId,

paymentMethodType,

frequency

}

Backend returns:

- planId

- numInstallments

- depositAmount

- subsequentInstallmentAmount

- schedule\[\]

- subscriptionPreviewId

- optionally a depositPaymentIntentId + client_secret if deposit is
  created at preview time.

**Store all into InstallmentPlanState**, then move to:

/checkout/installment-plan

→ /checkout/review

→ /checkout/confirmation

→ /checkout/success

On /checkout/review (installment path), you show:

- Project summary

- Total price

- Deposit amount due now

- Installment schedule (dates + amounts)

- Payment method (card/ACH)

- Terms & disclosures for recurring billing

On "Confirm & Start Plan":

- Call backend final endpoint:

  - Create Stripe subscription

  - Confirm deposit PaymentIntent (if not already confirmed)

  - Mark internal contract as "Active / Pending Deposit" per your
    backend doc.

## **4️⃣ Putting It Together -- One Combined Checkout Context**

In code, you can unify all of the above:

interface CheckoutState {

shared: CheckoutSharedState;

payInFull: PayInFullState;

installments: InstallmentPlanState;

}

Or, if you prefer a flatter structure, keep a single CheckoutState with
some fields only used when paymentMode === \"PAY_IN_FULL\" vs
\"INSTALLMENT\".

The key is:

- **Shared**: session, project, base quote, credits, payment method

- **Pay in full**: amountDueNow, paymentIntentId, wire invoice, payment
  status

- **Installment**: frequency, deposit, schedule, subscriptionId, deposit
  PI

## **5️⃣ Sanity Check Against Earlier Docs & Screens**

This is consistent with what we already defined earlier:

- Backend **always**:

  - Calculates price, deposit, \# of installments, schedule

  - Creates Stripe PaymentIntent / Subscription / QuickBooks invoices

  - Owns all payment statuses and contract state changes

- Frontend **only**:

  - Selects **mode** and **frequency\**

  - Collects payment method via Stripe Link/Elements

  - Calls the appropriate checkout endpoints

  - Stores IDs and renders the UX based on backend responses

If you want, next step I can draft a **CheckoutContext TypeScript file**
with initial state, reducer/actions, and usage examples for:

- /checkout/payment (pay in full vs installments)

- /checkout/installment-plan

- /checkout/review

So your dev can literally drop it into
app/providers/CheckoutProvider.tsx.
