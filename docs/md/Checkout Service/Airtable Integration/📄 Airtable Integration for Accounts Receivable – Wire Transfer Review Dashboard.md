📄 **Airtable Integration for Accounts Receivable -- Wire Transfer
Review Dashboard**

This document provides the **exact Airtable schema and integration
flow** used to support manual review of wire transfer transactions by
the Accounts Receivable (AR) team. It acts as a **temporary dashboard
solution** in place of a full admin UI.

### **✅ Overview**

- This Airtable base will receive **incoming transaction data** from
  Mercury and/or QuickBooks.

- Used by the AR team to **review, verify, or reject wire payments**
  manually.

- Syncs back to the platform once reviewed.

### **📊 Airtable Schema**

  ---------------------------------------------------------------------
  **Column**           **Description**
  -------------------- ------------------------------------------------
  Transaction ID       Unique Mercury or QuickBooks transaction
                       identifier

  Project/Contract ID  Pulled from metadata or matched manually

  Client Name          From the transaction or associated contract

  Email on Transaction Email found on payment (may not match platform
                       user)

  Platform User Email  If a match is found; blank otherwise

  Amount Received      Total payment amount

  Expected Amount      Pulled from platform (contract budget, invoice,
                       etc.)

  Match Score (%)      Confidence score from backend matching logic

  Status (Dropdown)    Options: Pending, Verified, Rejected, Needs
                       Review

  Reviewed By          Optional --- manual input by AR team

  QuickBooks Invoice   ID from synced invoice for reference
  ID                   

  Synced to Platform?  Boolean or timestamp when status was synced back
                       to platform
  ---------------------------------------------------------------------

Here's the **finalized safer version of the data flow** for wire
transfers with **real-time QuickBooks sync** and **Mercury transaction
verification**, using manual confirmation in QuickBooks as the single
source of truth for marking payments "Paid":

### **✅ Wire Transfer Verification Flow**

#### **1. Client Initiates Checkout & Selects Wire Transfer**

- A platform invoice is created (unpaid) for the project or contract.

- The invoice includes: project/contract ID, total amount, and client
  details.

- Stripe is **not** involved --- wire payments are off-platform (via
  Mercury).

#### **2. Client Sends Wire Transfer to Mercury Account**

- Clients are instructed to include the **Project/Contract ID** in the
  wire memo.

- Mercury receives the wire transaction (outside the platform).

#### **3. Platform Polls Mercury API (or Webhook) for Incoming Transactions**

- A backend service checks for new incoming wire transfers.

- Transaction data is captured: transaction ID, amount, memo, sender
  name/email.

- The system attempts to **match** the transaction to a project/contract
  using:

  - Project/Contract ID in memo (primary)

  - Email match or amount match (secondary)

- A **Match Score (%)** is calculated based on confidence rules.

- The transaction + match data is pushed to **Airtable (or
  admin-accessible DB)** for visibility.

#### **4. Accounts Receivable (AR) Team Reviews Match**

- AR staff sees new transactions in Airtable with Match Score and
  details.

- Using the platform **QuickBooks integration**, they manually open the
  relevant invoice.

- If payment is confirmed in QuickBooks (admin action), invoice is
  marked paid.

#### **5. QuickBooks Webhook Fires (Invoice Paid)**

- Platform listens for invoice.updated or payment.created webhook from
  QuickBooks.

- Webhook payload includes the QuickBooks Invoice ID and new status
  (PAID).

- Backend:

  - Validates webhook signature

  - Retrieves related platform invoice (via metadata or mapping)

  - Verifies project/contract ID

  - Updates the platform's internal records:

    - Marks project/contract as **Paid\**

    - Syncs invoice status across client dashboard and internal systems

  - Sends confirmation notification to client and AR team

### **✅ Status Logic**

- Pending: Awaiting AR team review

- Verified: Payment is confirmed and invoice should be marked paid

- Rejected: AR team rejected payment (e.g. mismatch or suspicious)

- Needs Review: Edge cases or low confidence match; escalate if needed

### **📬 Notifications**

- Use Airtable automation or backend alerts to notify:

  - AR team (Slack/email) when new transactions arrive

  - Platform admins when Needs Review or Rejected are marked

  - Clients when a wire transfer is matched to their contract
