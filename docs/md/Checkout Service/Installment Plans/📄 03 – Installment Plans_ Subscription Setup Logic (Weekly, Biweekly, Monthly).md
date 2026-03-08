**📄 03 -- Installment Plan: Subscription Setup Logic (Weekly, Biweekly,
Monthly)**

### **🧭 Purpose**

This document provides exact developer instructions for configuring
installment plan subscriptions in Stripe based on the selected
frequency: weekly, biweekly, or monthly. This logic supports dynamically
calculated billing schedules passed from the backend (not Stripe-created
products).

### **✅ Subscription Frequency Support**

Clients may choose from:

- **Weekly**: 1 payment every 7 days

- **Biweekly**: 1 payment every 14 days

- **Monthly**: 1 payment every 30 days

Each subscription begins **after a required upfront deposit**, which is
charged as the **first payment of the subscription**.

### **🧠 Backend Logic: Billing Schedule Generator**

Stripe does not support native biweekly plans or variable frequencies
out of the box. Instead, the platform must generate custom intervals
using anchored billing cycles and quantity overrides.

The backend handles:

- Total duration of the project/service (start to end date)

- Cost of each installment = total cost / number of installments

- Number of installments based on frequency (e.g. 4 months + monthly = 4
  installments)

### **🧰 Stripe Setup Requirements**

Stripe requires a combination of:

1.  **Custom price_data** object\
    This is used instead of pre-created Stripe products.

2.  **Subscription with billing_cycle_anchor\**
    To schedule the exact start date of billing after the upfront
    deposit.

3.  **Metadata tags\**
    Used to store project/service IDs, frequency, and total payments for
    platform lookup.

### **📦 Subscription Payload Example (Node.js)**

****const subscription = await stripe.subscriptions.create({

customer: stripeCustomerId,

items: \[{

price_data: {

currency: \'usd\',

product_data: {

name: \'Installment Plan -- Project XYZ\',

},

unit_amount: 5000, // installment amount in cents

recurring: {

interval: \'week\', // or \'month\'

interval_count: 1 // weekly = 1, biweekly = 2, monthly = 1

},

},

quantity: 1,

}\],

billing_cycle_anchor: \'now\',

metadata: {

project_id: \'proj_123\',

frequency: \'weekly\',

total_installments: 8,

installment_plan: \'true\'

},

payment_behavior: \'default_incomplete\',

expand: \[\'latest_invoice.payment_intent\'\]

});



### **🧾 Notes on Field Configuration**

  **Field**              **Value**            **Notes**
  ---------------------- -------------------- -----------------------------------------------------------------
  interval               week, month          Stripe does not support biweekly, use week + interval_count = 2
  interval_count         1, 2                 1 = weekly/monthly, 2 = biweekly
  billing_cycle_anchor   now                  Subscription begins immediately after deposit
  payment_behavior       default_incomplete   Ensures first payment is handled before subscription activates

### 

### **✅ Installment Plan Start Date**

### The **installment plan start date** is set to the **date of the initial deposit payment** (i.e., the day the user completes checkout and the first installment is successfully processed). 

### This applies across **weekly**, **biweekly**, and **monthly** installment frequencies. 

### All future installment billing dates are calculated **relative to this start date**.

### 

### 

### **⛔ No Prorated Billing**

- Stripe proration is **disabled\**

- All installment values are fixed amounts
