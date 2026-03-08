# **📄 18 -- Stripe Elements Integration & Field Mapping**

### **🧭 Purpose**

This document provides complete frontend integration instructions for
Stripe Elements on the Marketeq platform. It includes detailed setup,
secure handling of credit card and ACH fields, field mappings, metadata
handling, and usage of Stripe.js with full TypeScript and JSX
implementation. Developers must follow these instructions precisely. No
steps are optional, and no assumptions should be made.

### **⚙️ Stripe Elements Setup Instructions**

1.  **Install Stripe Dependencies\**
    From your frontend project root (Next.js):

npm install \@stripe/stripe-js \@stripe/react-stripe-js

2.  \
    **Load Stripe.js\**
    Initialize Stripe in stripe.ts under lib/:

// app/lib/stripe.ts

import { loadStripe } from \'@stripe/stripe-js\';

export const stripePromise =
loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string);

3.  \
    **Stripe Context Provider\**
    Wrap your page in the Elements provider:

// app/(checkout)/checkout/page.tsx

import { Elements } from \'@stripe/react-stripe-js\';

import { stripePromise } from \'@/lib/stripe\';

export default function CheckoutPage() {

return (

\<Elements stripe={stripePromise}\>

\<CheckoutForm /\>

\</Elements\>

);

}

4.  \
    **Create the Checkout Form\**
    This should live in:\
    app/components/stripe/CheckoutForm.tsx

import { CardElement, useStripe, useElements } from
\'@stripe/react-stripe-js\';

export default function CheckoutForm() {

const stripe = useStripe();

const elements = useElements();

const handleSubmit = async (e: React.FormEvent) =\> {

e.preventDefault();

if (!stripe \|\| !elements) return;

const card = elements.getElement(CardElement);

if (!card) return;

const { error, paymentMethod } = await stripe.createPaymentMethod({

type: \'card\',

card,

});

if (error) {

console.error(\'\[Stripe Error\]\', error.message);

return;

}

// Submit paymentMethod.id to backend

};

return (

\<form onSubmit={handleSubmit}\>

\<CardElement /\>

\<button type=\"submit\" disabled={!stripe}\>Pay\</button\>

\</form\>

);

}



### **💳 Stripe Element Field Mapping**

  **Field Label**            **Stripe Element**      **Required**   **Notes**
  -------------------------- ----------------------- -------------- --------------------------------------------------
  Card Number                CardElement             ✅             Built-in via Stripe
  Expiry Date                CardElement             ✅             Built-in
  CVV / CVC                  CardElement             ✅             Built-in
  Cardholder Name            Custom Input            ✅             Must be sent as billing_details.name
  Billing Email              Custom Input            ✅             Must be sent as billing_details.email
  Billing Address (Line 1)   Custom Input            ✅             Required for fraud & risk reduction
  City                       Custom Input            ✅             
  State / Province           Custom Input            ✅             
  ZIP / Postal Code          Custom Input            ✅             
  Country                    Custom Dropdown         ✅             Recommended using react-select-country-list
  Bank Routing Number        ACH (via Stripe Link)   ✅             Use PaymentElement or ACH UI for account linking
  Bank Account Number        ACH (via Stripe Link)   ✅             
  Account Holder Name        ACH (via Stripe Link)   ✅             

### **🧩 Metadata Sent with PaymentMethod or Checkout Session**

  -----------------------------------------------------------------------
  **Key**               **Value Source**          **Applies To**
  --------------------- ------------------------- -----------------------
  project_id            Project being paid for    One-time/Installments

  contract_id           Contract if outside       One-time
                        project scope             

  client_user_id        Authenticated user ID     All

  payment_type          card, ach, wire, wallet,  All
                        etc.                      

  gift_card_applied     Boolean true/false        If applicable

  wallet_balance_used   Number in cents           If applicable
  -----------------------------------------------------------------------

### **🌐 Stripe.js Hosted Elements (URLs)**

Use Stripe-hosted JS libraries:

\<script src=\"https://js.stripe.com/v3/\"\>\</script\>

Vercel build must expose:

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx\...



### **🛡️ Security Considerations**

- No card data should ever touch your server.

- Do **not** log PaymentMethod objects --- only save the id.

- Always use Elements to tokenize the payment info before sending to the
  backend.

- ACH and other alternative payments must use secure Stripe-hosted
  modals where possible.
