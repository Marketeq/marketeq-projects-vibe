**Stripe Invoices Overview:**

### **✅ 1. Stripe Invoice Creation Schema**

When creating an invoice via the Stripe API, the schema requires:

- **Customer ID** (mandatory)

- **Line items** (added via invoiceitems)

- **Subscription ID** (optional, but cannot pay with only this --- more
  below)

- **Metadata** (used for internal linking)

- **Payment method settings** (optional)

- **Due date**, **auto-advance**, etc.

**Stripe Invoice Creation Flow (Basic)**:

const invoice = await stripe.invoices.create({

customer: \'cus_123456789\',

auto_advance: true, // automatically finalize

metadata: {

projectId: \'abc123\',

contractType: \'project\',

createdBy: \'client\',

},

});

You must **attach line items** via invoiceitems before finalizing the
invoice:

await stripe.invoiceItems.create({

customer: \'cus_123456789\',

amount: 500000, // in cents

currency: \'usd\',

description: \'UI Design Phase 1\',

invoice: invoice.id,

});



✅ **2. Front-End Integration**

Stripe invoices will be fully managed within your platform UI --- no
Stripe-hosted UI is used. The frontend must handle displaying total
cost, capturing user payment method, and optionally showing recurring
payment frequency. The implementation depends on whether the payment is
a one-time amount or a recurring subscription.

### **🧾 One-Time Payment Flow (Full Amount)**

For users selecting **Pay in Full** (non-subscription):

1.  **Display Total Amount\**

    - Pull the total cost from your backend (/listings or /user-service,
      depending on whether it\'s a project, service, team, or individual
      talent).

    - Example:

const { data } = await
axios.get(\'/api/checkout/summary?id=PROJECT_ID\')

setTotal(data.totalAmount)

2.  **Collect Payment Method Using Stripe Elements\**

    - Render a CardElement or PaymentElement from Stripe Elements.

    - Attach it to a Confirm Payment button.

3.  **Trigger Checkout API\**

    - On submit, call your backend to create a one-time payment intent
      with the total amount.

    - Sample call:

const { data: clientSecret } = await
axios.post(\'/api/checkout/pay-now\', {

projectId: PROJECT_ID,

paymentType: \'one-time\',

})

await stripe.confirmCardPayment(clientSecret, {

payment_method: { card: elements.getElement(CardElement) },

})



### **🔁 Recurring Payment Flow (Installments)**

For users selecting **Pay in Installments**, your frontend must:

1.  **Show Frequency Selector\**

    - Options: Weekly, Biweekly, Monthly (coming from your backend or
      config)

    - User picks frequency; total number of installments is calculated
      by backend logic based on the full project duration and budget.

2.  **Show First Installment (Deposit) Amount\**

    - The backend calculates the upfront installment required based on
      frequency:

      - Weekly = 1 week upfront

      - Biweekly = 2 weeks upfront

      - Monthly = 1 month upfront

    - Backend response will include:

{

\"totalCost\": 6000,

\"frequency\": \"weekly\",

\"installmentAmount\": 500,

\"depositAmount\": 500,

\"installments\": 12

}

3.  **Collect Payment Method\**

    - Use PaymentElement to support card, ACH, Google Pay, etc.

    - Submit via stripe.confirmSetup for subscription

4.  **Trigger Subscription API\**

    - Call your backend to create a new Stripe subscription with custom
      billing logic:

const { data: clientSecret } = await
axios.post(\'/api/checkout/subscribe\', {

projectId: PROJECT_ID,

frequency: selectedFrequency,

})

await stripe.confirmCardSetup(clientSecret, {

payment_method: elements.getElement(PaymentElement),

})



### **✅ Success Handling**

After successful payment:

- Show confirmation screen

- Trigger /api/checkout/status to verify badge and contract activation

- Redirect user to project dashboard

### **❓ 3. Can You Pay with a Subscription ID?**

**No**, you do **not** use a Subscription ID to pay an invoice directly.

Here\'s how it works:

- When you create a **Subscription**, Stripe automatically creates
  recurring **Invoices\**

- Those invoices are **charged automatically** if a default payment
  method is attached

- If you don't want auto-payment, set collection_method:
  \'send_invoice\' during subscription creation

**Manual payment for subscription invoice** looks like this:

const subscription = await stripe.subscriptions.create({

customer: \'cus_123456789\',

items: \[{ price: \'price_123\' }\],

collection_method: \'send_invoice\',

days_until_due: 7,

});

const invoice = await
stripe.invoices.retrieve(subscription.latest_invoice);

// send invoice.hosted_invoice_url to the frontend

> 🔒 So: **You don't pay using subscription ID.** You pay using the
> invoice **generated** by the subscription.
