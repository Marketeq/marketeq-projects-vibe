**✅ Do we need separate frontend routes for each checkout step?**

**Yes --- the frontend should have separate routes for each major step
of the checkout flow.**

Because:

1.  **Your checkout is multi-step.\**
    Project Details → Payment Method → Installment Plan → Review →
    Confirmation → Thank You

2.  **Each screen has different state requirements\**

    - Project details pulls scoped data + pricing breakdown

    - Payment details handles Stripe elements, ACH Link, wire transfer
      selection

    - Review screen aggregates all backend responses and user inputs

    - Thank you screen consumes the final
      subscription/invoice/wire-transfer ID from backend

3.  **Back button behavior must work predictably\**
    Browser back/forward must return to the correct step.

4.  **Deep linking is required\**
    You want marketers and support staff to be able to jump users to a
    specific step like:

    - /checkout/payment

    - /checkout/installment-plan

    - /checkout/review

5.  **Stripe Elements cannot be remounted unnecessarily\**
    Stripe credit card Elements break if the user hops between states
    inside one single giant component.

# **⭐ Recommended Route Structure (Final)**

Use five official routes:

/checkout/project-details

/checkout/payment

/checkout/installment-plan

/checkout/review

/checkout/confirmation

/checkout/success

### **Why these?**

- They map 1:1 to your Figma designs

- They respect Stripe's best practices for multi-step forms

- They support session storage + URL parameters + marketing tracking

- They avoid the "router flash" issue that happens when payment Elements
  are inside the same route

# **🧩 Final Routes and Their Responsibilities**

### **1. /checkout/project-details**

- Load project/contract scope

- Load dynamic pricing

- Load deposit requirements

### **2. /checkout/payment**

- Stripe Link (ACH manual + Link login)

- Credit card

- Apple Pay / Google Pay

- Wire transfer selection

- Gift card + account balance

### **3. /checkout/installment-plan**

- Weekly / Biweekly / Monthly

- Deposit scheduling logic

- Subscription preview

### **4. /checkout/review**

- Final price

- Deposit amount

- Installment plan

- Payment method

- Terms & Disclosures

Triggers:

- createSubscription

- createPaymentIntent (if split payment)

- createWireTransferQuickBooksInvoice (wire flow)

### **5. /checkout/confirmation**

Backend callback response view.\
Success, pending, or fail state.

### **6. /checkout/success**

Your Figma "Thank you / next steps" page.

# **🟦 Do NOT put all steps in a single route**

(e.g., /checkout?step=1)\
This breaks ARC, Stripe, and browser navigation.

# **🔥 What your dev team should do right now**

### **Developer Action Steps**

1.  Create a folder:

/app/checkout/

2.  Inside it, create sub-folders:

project-details/

payment/

installment-plan/

review/

confirmation/

success/

3.  Each folder should have:

page.tsx

index.tsx (optional if using nested layouts)

layout.tsx (optional)

4.  Use a shared global state provider:

CheckoutProvider.tsx

Stores:

- projectId

- scope data

- selected payment method

- stripePaymentMethodId

- selected installment plan

- deposit amount

- gift card

- account balance

- final order summary

5.  Persist state using:

- Context

- LocalStorage (fallback)

- Or URL params if needed

# **🧠 Summary**

Yes, **you absolutely need separate routes**, and the correct breakdown
is:

- /checkout/project-details

- /checkout/payment

- /checkout/installment-plan

- /checkout/review

- /checkout/confirmation

- /checkout/success

This fully supports:

- Stripe

- Installment plans

- Deposits

- Split payments

- Apple/Google Pay

- ACH Link

- Wire transfer QuickBooks invoice flow

- Your Figma UX

- ARC consistency

- Dev maintainability
