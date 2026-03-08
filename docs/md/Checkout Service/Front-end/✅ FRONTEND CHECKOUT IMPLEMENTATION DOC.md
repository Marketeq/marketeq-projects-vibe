# **✅ FRONTEND CHECKOUT IMPLEMENTATION DOC**

# **1. The Required Folder Structure (Next.js App Router)**

*(This has not been explicitly defined yet)*

/app

/checkout

/layout.tsx ← optional shared layout

/project-details

page.tsx

/payment

page.tsx

/installment-plan

page.tsx

/review

page.tsx

/confirmation

page.tsx

/success

page.tsx

### **Important Non-Obvious Rule**

Every route **must** be its own page to prevent Stripe Elements from
unmounting and breaking.\
This rule was **not** defined in prior docs.

# **2. The Complete Checkout Lifecycle (Frontend-Side Only)**

*(This is NEW --- a strict, step-by-step flow with triggers, in order)*

This gives you the *actual real flow*, not just the conceptual model.

## **STEP 1 --- /checkout/project-details**

### **What you must do here:**

- Fetch the checkout session: /checkout/session/:id

- Store session + quote in global state

- Do NOT allow the user to choose payment mode here

- On continue → navigate to /checkout/payment

**Data loaded here becomes "read-only" for the rest of the checkout.**

## **STEP 2 --- /checkout/payment**

### **What you must handle here:**

#### **A) Selecting payment mode**

- If the user taps **Pay in Full →** set paymentMode = PAY_IN_FULL

- If the user taps **Weekly / Biweekly / Monthly** → set paymentMode =
  INSTALLMENT

#### **B) Selecting payment method**

For card/ACH/ApplePay/GooglePay:

- Render Stripe Elements / Stripe Link

- Collect the Payment Method ID

- Save it in context

For wire:

- Set paymentMethodType = \"WIRE\"

#### **C) Trigger backend call**

This call has not been defined anywhere yet.\
Now it is:

### **Pay in full → /checkout/pay-in-full/prepare**

Returns:

- final amount

- credits deducted

- PaymentIntent client secret OR QuickBooks invoice ID

### **Installments → DO NOT CALL ANYTHING**

Backend preview should not happen here --- only on the **Installment
Plan** route.

#### **D) Route Decisions**

- If PAY_IN_FULL → navigate to /checkout/review

- If INSTALLMENT → navigate to /checkout/installment-plan

## **STEP 3 --- /checkout/installment-plan**

*(This procedural instruction is NEW --- separate from state model)*

### **What happens here:**

1.  The user chooses *frequency* (weekly, biweekly, monthly).

2.  You call the backend:

POST /checkout/installments/preview

{

checkoutSessionId,

paymentMethodType,

frequency

}

3.  Backend returns:

- deposit PI client_secret

- the full schedule

- normalized installment amounts

4.  You store those values.

5.  On continue → navigate to /checkout/review.

## **STEP 4 --- /checkout/review**

*(These actions were not previously spelled out for you)*

### **On this page you must:**

- Render project summary

- Render payment summary (after credits, payment method, etc.)

- Render deposit amount (if installments)

- Render full installment schedule (if installments)

- Render special wire-transfer message if wire

- Render terms + required legal disclosures

- Show confirmation button

### **CTA Handling:**

#### **Pay in Full**

Trigger:

await axios.post(\"/checkout/pay-in-full/confirm\", { checkoutSessionId
});

Then follow the Stripe confirmation flow if needed.

#### **Installment Plan**

Trigger:

await axios.post(\"/checkout/installments/confirm\", { checkoutSessionId
});

This creates:

- Stripe subscription

- Confirms deposit PI

- Activates the contract

- Returns subscription ID

Then navigate → /checkout/confirmation.

## **STEP 5 --- /checkout/confirmation**

*(This has not been defined yet)*

### **You must display:**

- Loading status while polling backend for final payment result

- Card success → show "Processing Payment..."

- Installment deposit → show "Activating Subscription..."

- Wire → show "Invoice Generated / Pending Payment"

### **Logic:**

poll every 2--3 seconds:

GET /checkout/status/:sessionId

Statuses to handle:

- PAYMENT_SUCCEEDED

- SUBSCRIPTION_ACTIVE

- WIRE_PENDING

- FAILED

- REQUIRES_ACTION

Once resolved → navigate → /checkout/success.

## **STEP 6 --- /checkout/success**

You must display:

- Project/contract start details

- Payment summary

- Wire instructions if needed

- \"Next steps\" from Figma

No API calls are required here.

# **3. The Required API Calls (Frontend Responsibilities Only)**

*(These were never listed in one place --- this is NEW)*

### **🔹 /checkout/session/:id**

Load project summary + pricing.

### **🔹 /checkout/pay-in-full/prepare**

Prepare PI or QuickBooks invoice.

### **🔹 /checkout/pay-in-full/confirm**

Finalize PI or set wire invoice active.

### **🔹 /checkout/installments/preview**

Return deposit PI + full schedule.

### **🔹 /checkout/installments/confirm**

Create subscription + confirm deposit.

### **🔹 /checkout/status/:sessionId**

Used only on the confirmation page.

# **4. Exact Navigation Map (NEW)**

*(Combines routes + state + backend dependencies into one diagram)*

/project-details

↓

/payment

• Select Mode

• Select Method

• Create PI or Wire Invoice (Pay in Full)

↓

(paymentMode === INSTALLMENT)

↓

/installment-plan

• Preview subscription

• Get schedule + deposit PI

↓

/review

• Confirm PI or subscription

↓

/confirmation

• Poll for final status

↓

/success

# **5. New Developer Notes --- Not Previously Provided**

### **🟦 Do NOT reuse Stripe Elements across the two modes**

Elements must be created fresh per route load.

### **🟦 Do NOT recalculate price on the frontend**

Only use backend values returned from session, preview, and prepare
endpoints.

### **🟦 Never store clientSecret in the URL**

Store it in memory only; if the user reloads, re-fetch via backend.

### **🟦 You are not allowed to touch installment math in the frontend**

All dates, amounts, and counts must come directly from the backend.

### **🟦 Polling must stop on success or failure**

On failure you must redirect the user back to /checkout/payment with an
error message.

# **6. Components You Must Build (NEW LIST --- never provided)**

### **Global:**

- \<CheckoutProvider\>

- useCheckout() hook

### **Shared components:**

- \<PaymentMethodPicker\>

- \<InstallmentFrequencySelector\>

- \<InstallmentScheduleDisplay\>

- \<SummaryCard /\>

- \<TermsBlock /\>

- \<StripeCardElement /\>

- \<StripeACHLinkElement /\>

- \<WireTransferDisclosure /\>

### **Page shell components:**

- \<CheckoutHeader /\>

- \<CheckoutFooter /\>

None of this list existed previously.

# **7. Final Delivery Checklist for You (NEW)**

### **📌 You Must Implement:**

- All 6 routes

- All API calls with the correct payload

- Global provider + context

- Stripe Elements integration

- Wire transfer flow

- Installment preview + schedule rendering

- Polling on confirmation page

- Error handling and fallback behaviors

- Preserving checkout state during navigation

- Redirect guards for invalid states (e.g., no payment method chosen)

### **📌 You Must NOT:**

- Do any price math in the frontend

- Re-create backend logic

- Shortcut required routes

- Mix pay-in-full and installment logic

- Render Stripe before the payment page

# **8. Optional---but Highly Recommended (NEW)**

### **Analytics Events (for ARC, revenue, funnel reporting)**

- checkout_started

- payment_method_selected

- installment_frequency_selected

- review_page_viewed

- checkout_confirm_attempt

- checkout_success

### **Session Recovery**

If the user reloads or leaves:

- Call /checkout/session/:id

- Restore context

- Redirect to the appropriate route\
  (e.g., if they already selected an installment plan → send them back
  to /checkout/review)
