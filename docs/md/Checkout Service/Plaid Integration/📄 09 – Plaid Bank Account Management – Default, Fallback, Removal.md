# **📄 09 -- Plaid Bank Account Management -- Default, Fallback, Removal**

### **🧭 Purpose**

This document defines how the platform manages bank accounts added via
Plaid, including:

- Default payout account assignment

- Fallback logic if the default becomes invalid

- Frontend behavior for removing or replacing connected accounts

- Backend logic for safely updating payout configurations

This ensures developers follow strict business and security rules for
Plaid-linked account management.

### **🗂️ Folder Path**

/app/plaid-service/

### **🏦 Bank Account Storage & Flags**

  **Field**           **Type**    **Description**
  ------------------- ----------- --------------------------------------------------------------------------
  user_id             UUID        References the platform user
  plaid_account_id    String      Unique account ID from Plaid
  account_last4       String      Last 4 digits of the account number
  account_type        Enum        checking, savings, or business_checking
  is_default_payout   Boolean     Whether this is the primary payout account
  is_archived         Boolean     True if the user manually removed the account or Plaid marked it invalid
  created_at          Timestamp   When the account was linked

### **✅ Adding a New Bank Account**

When a new account is linked via Plaid:

1.  Backend verifies the account via /token/exchange and /accounts/get.

2.  If the user has **no payout account**, this becomes the **default**.

3.  If the user has a default, this is added as a
    **secondary/fallback**.

4.  All data is stored in the user_bank_accounts table.

### **🔄 Changing the Default Account**

When the user sets a new default:

1.  API: POST /bank-account/:id/set-default

2.  Platform sets is_default_payout = false on all other accounts.

3.  Selected account's is_default_payout = true.

> ⚠️ This route must include auth middleware to ensure users cannot set
> default for someone else's accounts.

### **🗑️ Removing a Bank Account**

1.  API: DELETE /bank-account/:id

2.  Platform soft-deletes the record (sets is_archived = true).

3.  If the deleted account was the **default**, fallback logic is
    triggered.

### **🔁 Fallback Logic**

If a payout is triggered but:

- The default account is archived

- Or Plaid flags it as invalid

Then:

- The system checks for **non-archived fallback accounts**.

- Sets the **first available fallback** as new default.

- Logs this update in audit_logs.

If **no fallback exists**, the payout fails and notifies the user.

### **🔐 Security & Ownership Enforcement**

- Every payout call checks that user_id === session.user.id

- Accounts are never hard-deleted

- Admins cannot change payout targets manually (handled via
  audit-tracked UI)

- Stripe external account updates are tied to plaid_account_id
