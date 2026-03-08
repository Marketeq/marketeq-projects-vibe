# **📄 02 -- Installment Plan: Upfront Deposit Rules & Billing Behavior**

### **🧭 Purpose**

This document defines the rules for handling upfront deposits and
installment billing behavior during Stripe Checkout. It is intended for
use in projects or services where clients opt to pay in installments
instead of paying in full.

This logic is applied universally across all marketplace listings
(projects, services, teams, or individual hires), and is enforced as
part of the checkout process.

### **✅ Deposit Requirement Rules**

  **Frequency Selected**   **Required Upfront Deposit**   **Notes**
  ------------------------ ------------------------------ -----------------------------------------------------
  Weekly                   1 week upfront                 First week\'s payment must be submitted at checkout
  Biweekly                 2 weeks upfront                First two weeks must be paid in advance
  Monthly                  1 month upfront                First month's payment must be paid at checkout

- There is **no option to skip the deposit**.

- This upfront deposit is treated as the **first payment of the Stripe
  subscription**, not a separate one-time charge.

### **📆 How Billing Behavior Works**

- After the upfront deposit, recurring installment payments follow based
  on selected frequency:

  - Weekly: every 7 days

  - Biweekly: every 14 days

  - Monthly: every 30 days

- Stripe Subscriptions are used to handle all recurring installment
  billing.

- The platform passes **custom pricing and billing schedules** into
  Stripe at the time of subscription creation.

### **📐 Pricing Logic Overview**

- All pricing is dynamically calculated on the backend:

  - Projects: total duration and cost are determined by all associated
    phases and assigned talent

  - Services: have a fixed monthly price but can be split into
    weekly/biweekly/monthly installments

  - Team or individual hires: cost is pulled from the
    **listings-service** or **user-service**, depending on the contract
    type

- The frontend only allows users to select the **installment
  frequency**, not the number of payments.

- The **number of payments is dynamically calculated** based on
  project/service duration and total budget.

### **⚙️ Subscription Example**

A client selects a 4-month project with a \$20,000 budget and chooses to
pay monthly:

- First payment (deposit): \$5,000 charged during checkout (Month 1)

- Stripe subscription begins after deposit

- Next three payments (Months 2--4) charged automatically on 30-day
  intervals

### **🧮 How Stripe Receives Pricing**

- Stripe receives:

  - Custom unit_amount for each billing cycle

  - Number of cycles = total project/service duration divided by the
    frequency selected

  - Prorated logic is **not used\**

- Platform logic sends a **custom price_data object** for each recurring
  schedule

### **🛑 Failed Payment Handling**

- If a recurring payment fails:

  - The platform **automatically pauses** the project/contract after a
    retry period (defined in separate retry logic doc)

  - The paused state takes effect only **after all retries are
    exhausted\**

  - Clients continue to have access for the duration they've already
    paid for
