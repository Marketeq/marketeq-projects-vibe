# **📄 08 -- Stripe Checkout -- Payment Method Support**

### **🧭 Purpose**

This document outlines all supported payment methods available in the
Marketeq Checkout system and the handling logic behind each. It
distinguishes between standard card payments, wallet balance use,
financing options, and manual payment flows like wire transfers.

## **💳 Supported Payment Methods**

### **1. Credit & Debit Cards (Visa, Mastercard, Amex, etc.)**

- **Handled by:** Stripe

- **Billing Type:** One-time or subscription

- **Security:** PCI-compliant, tokenized via Stripe Elements

### **2. ACH Bank Transfers (US only)**

- **Handled by:** Stripe + Plaid integration

- **Status Logic:** Payment marked as pending for up to 5 business days

- **Manual Retry:** User must reinitiate if payment fails

### **3. Wire Transfers (Manual Verification Required)**

- **Handled by:** External bank and internal accounts receivable team

- **Payment Status:** \"Pending Wire Confirmation\" until approved
  manually

- **Verification Delay:** Flagged in UI until back-office approval

### **4. Apple Pay**

- **Handled by:** Stripe

- **Device Restriction:** Safari + Apple devices only

- **Flow:** Appears automatically for eligible users

### **5. Google Pay**

- **Handled by:** Stripe

- **Flow:** Tap-to-pay experience on eligible devices and browsers

### **6. Klarna (Pay Later)**

- **Handled by:** Stripe

- **Eligibility:** Based on user's Stripe region and currency

- **Flow:** Credit-checked by Klarna during checkout

### **7. Affirm (Installments)**

- **Handled by:** Stripe

- **Flow:** User can split total into equal monthly payments

- **Metadata:** Installment breakdown is stored in Stripe & platform DB

### **8. Available Balance (Wallet)**

- **Source:** Credits from previous overages, refunds, or prepayment

- **Logic:** Deducted before charging external payment method

- **Storage:** Stored in platform DB, synced with Stripe if supported

### **9. Gift Cards**

- **Handled by:** Platform (custom logic)

- **Input Field:** Users must enter gift card code manually

- **Validation:** Checks remaining balance + expiration

## **⚙️ Platform Logic**

- Multiple methods can be combined (e.g., Wallet + Credit Card)

- Apple Pay and Google Pay are conditionally shown by device/browser

- Klarna, Affirm availability depends on user's region

- Wire transfers never auto-confirmed; must be approved by A/R team

### **🔁 Failed Payment Handling & Retry Logic**

- **Credit/Debit Cards & Wallet:** Stripe automatically retries failed
  payments.

- **Installments (Stripe Subscriptions):\**

  - If the **first** installment fails, the project is **paused
    immediately**.

  - Stripe will attempt retries based on its default retry schedule.

  - Upon final failure, the **Payment Verified** badge is **revoked**.

- **ACH Bank Transfers:\**

  - Stripe **does not automatically retry** failed ACH payments.

  - Platform will support **manual retry via UI**.

  - Best practice: reinitiate the checkout session.

- **Wire Transfers:\**

  - Confirmation must be **manually processed** by the A/R team.

  - Until confirmed, project status = **Pending Wire Confirmation**.

- **UI Behavior:\**

  - If a payment method fails, project is paused after the **prepaid
    period** ends.

  - Visual flags, retry buttons, and notifications are triggered in-app
    and via email.

## **🔗 Related Docs**

- 07 -- Webhook Events → explains auto-status updates

- 09 -- Gift Cards & Wallet Balance Rules → in-depth logic

- 10 -- Metadata Mapping → shows payment method metadata
