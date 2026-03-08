# **📄 01 -- Plaid Integration Overview & Document Index**

### **🧭 Purpose**

This document introduces the Plaid integration for the Marketeq platform
and outlines the technical documentation necessary to implement and
support bank account linking, account verification, and transaction
monitoring through the Plaid API. This is designed to support ACH
payments, wallet top-ups, and eventual financial account verification
workflows.

Plaid allows clients to securely link their bank accounts without
storing sensitive credentials on the Marketeq platform.

### **⚙️ Microservice Name**

**banking-service\**
This microservice handles all communication with the Plaid API, and all
internal logic related to account linking, account metadata storage, and
transaction tracking. This service is independent of the wallet-service
and checkout-service, but works in coordination with both for ACH-based
flows.

### **🧩 How It Works**

1.  **Client Links Bank Account via Plaid Link\**
    The frontend triggers the Plaid Link widget. On success, Plaid
    returns a public_token.

2.  **Exchange Token for Access Token\**
    The banking-service exchanges the public_token for a permanent
    access_token and retrieves account_id.

3.  **Store Access Token + Account Metadata\**
    These credentials are stored securely and associated with the
    client's profile for future ACH transactions.

4.  **Verify Account Type and Capabilities\**
    The service verifies that the account is ACH-enabled and determines
    its name, type, and bank.

5.  **ACH Payments, Wallet Top-Ups, Future Use\**
    The verified bank account can now be used as a payment method in the
    checkout-service, or as a funding source for the wallet-service.

### **🔐 Security Notes**

- No account credentials are ever stored or visible to Marketeq.

- All access tokens are encrypted at rest.

- No frontend stores sensitive identifiers; all interactions are
  brokered through the banking-service.

### **📘 Document Index**

  **\#**   **Document Title**                                          **Description**
  -------- ----------------------------------------------------------- ------------------------------------------------------------------------------------
  01       **Plaid Integration Overview & Document Index**             This document. High-level guide and index of all documentation
  02       **Plaid Setup & Environment Configuration**                 Step-by-step for setting up Plaid sandbox, keys, environments
  03       **Plaid Link Frontend Integration**                         Instructions and code for embedding Plaid Link and triggering token exchange
  04       **Plaid Token Exchange & Account Metadata Storage**         Backend service to exchange public_token and store access_token + account info
  05       **Plaid ACH Account Eligibility & Filtering Logic**         Filtering non-ACH accounts, verifying account capabilities, and eligibility errors
  06       **Plaid Integration with Checkout & Wallet Services**       Connecting Plaid-linked accounts to ACH payments and wallet top-ups
  07       **Plaid Webhooks -- Event Handling & Monitoring**           Handling events such as transactions, balance updates, and account errors
  08       **Plaid Account Removal, Re-authentication & Revocation**   Handling account unlinks, token expiration, and client-side disconnection logic

**Perfect --- here are the additions, clean and ready to paste directly
into the bottom of Document 01 -- Plaid Integration Overview & Document
Index, without altering anything else:**

### **➕ Additional Technical Notes**

#### **🔐 Environment Variables for Plaid**

**Ensure the following environment variables are added to the .env file
of the plaid-service:**

**PLAID_CLIENT_ID=your_client_id**

**PLAID_SECRET=your_secret_key**

**PLAID_ENV=sandbox \# or development / production**

**These values control which Plaid environment is used for integration
(e.g. sandbox for testing, production for live use).**

#### **📦 Plaid Product Scope (Enabled Features)**

**We are using the following Plaid products in this integration:**

- **auth -- Required to retrieve account and routing numbers for ACH
  payments\**

- **identity *(optional)* -- Can be used to verify account holder
  names\**

- **transactions *(future optional)* -- Can be enabled for spending
  history or risk checks\**

**Only auth is required for the initial implementation.**

#### **🔄 Plaid Link Token Flow (Simplified Preview)**

**The frontend will request a Plaid Link token from the backend (via
plaid-service). Once the user links their bank, Plaid returns a
public_token which is exchanged server-side for an access_token.**

**This access_token allows us to generate a processor_token that can be
passed to Stripe to securely attach the user's bank account for ACH
payments.**

#### **🔁 Connection to Stripe**

**To finalize the ACH setup:**

- **The plaid-service will call:\**

**/plaid/stripe/token**

- **to retrieve a Stripe-compatible processor_token\**

- **This token is then used to attach the bank account via:\**

**stripe.customers.createSource(customerId, {**

**source: processor_token,**

**});**

**This ensures bank accounts are securely connected to Stripe via Plaid
without manual data entry.**
