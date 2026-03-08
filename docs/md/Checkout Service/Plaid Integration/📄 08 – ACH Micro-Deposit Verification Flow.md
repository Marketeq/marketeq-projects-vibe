# **📄 08 -- ACH Micro-Deposit Verification Flow**

### **📌 Purpose**

This document explains the Stripe-powered flow for verifying a
customer's bank account using micro-deposits. This is required to
support ACH payments for U.S.-based clients on the Marketeq platform.

### **🧾 What is Micro-Deposit Verification?**

Stripe verifies bank accounts (added via Plaid or manual entry) by
depositing two small random amounts. The user then enters those amounts
to confirm ownership. Only after this step is complete can the bank
account be used for ACH debit transactions.

### **🛠️ Step-by-Step Flow**

#### **1. Bank Account Added (via Plaid or Manual Entry)**

- The frontend calls Stripe to attach the bank account using a
  bank_account_token or Plaid token.

- Stripe responds with a customer_bank_account.id.

#### **2. Stripe Triggers Micro-Deposits**

- Stripe automatically sends two deposits within 1--2 business days.

- Event: No webhook is fired yet.

#### **3. User Notification**

- Notify the user via UI and email:\
  \"Two small deposits will appear in your bank account in 1--2 business
  days. Please return to verify.\"

#### **4. User Enters Deposit Amounts (Frontend UI)**

- After 2 days, user returns to /verify-bank screen.

- Form fields:

  - Deposit 1 Amount (cents)

  - Deposit 2 Amount (cents)

#### **5. Verify via Stripe API**

****await stripe.customers.verifySource(

customerId,

bankAccountId,

{ amounts: \[32, 45\] } // amounts in cents

);

- \
  If successful, Stripe marks the account as verified.

- If failed 3 times, the account is locked.

#### **6. Stripe Fires Webhook**

- customer.bank_account.verified is triggered.

- Your webhook handler should:

  - Mark verified: true in Postgres

  - Enable ACH checkout for this user

#### **7. Enable ACH Checkout**

- Once verified, the account is marked valid.

- In frontend checkout, ACH becomes a selectable option.

### **📦 Required Backend Fields (Postgres)**

  ------------------------------------------------------------------
  **Field**         **Type**    **Description**
  ----------------- ----------- ------------------------------------
  bank_account_id   string      Stripe bank account ID

  verified          boolean     True after
                                customer.bank_account.verified

  user_id           uuid        Associated user

  verified_at       timestamp   When account was verified

  failed_attempts   int         Optional: to track failed
                                verifications
  ------------------------------------------------------------------

### **🔐 Security Considerations**

- Never verify amounts client-side

- Use signed Stripe secrets for all backend interactions

- Use server-to-Stripe requests to validate deposits

### **✅ Frontend Instructions**

- Show a "Verify Bank Account" banner until status is verified

- Lock out the verification form after 3 attempts

- If verification fails:

  - Show \"Verification failed. Please re-add your bank account.\"
