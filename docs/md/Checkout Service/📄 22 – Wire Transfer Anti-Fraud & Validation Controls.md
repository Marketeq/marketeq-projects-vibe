# **📄 22 -- Wire Transfer Anti-Fraud & Validation Controls**

### **🔐 Purpose**

This document defines the internal safeguards and anti-fraud measures
used when processing wire transfers on the Marketeq platform. It ensures
that no internal actor --- whether on the accounts receivable (AR) team
or development team --- can fraudulently mark a wire payment as received
without proper validation from QuickBooks.

### **🧾 Core Validation Process**

1.  **Wire transfer status is NEVER confirmed manually through the
    platform\**

    - No admin dashboard will contain a toggle, checkbox, or input field
      to mark a wire as paid.

    - All confirmation must originate from QuickBooks using an API
      integration.

2.  **Invoice status is pulled from QuickBooks\**

    - The AR team records incoming wire transfers within QuickBooks.

    - Our platform queries QuickBooks via API to confirm if a specific
      invoice has been marked as paid.

    - Only then is the platform invoice marked as \"Paid\" and the
      project marked as verified.

### **✅ Step-by-Step Process**

  -------------------------------------------------------------------------
  **Step**   **Description**
  ---------- --------------------------------------------------------------
  1          User selects **Wire Transfer** as payment method during
             checkout

  2          Platform generates an invoice with reference metadata (invoice
             ID, email, order ID)

  3          Invoice is pushed to **QuickBooks** with all reference details

  4          AR team receives wire, confirms payment in **QuickBooks only**

  5          Platform runs scheduled or event-triggered **QuickBooks
             invoice sync**

  6          If invoice status is \"Paid\" in QuickBooks → Platform updates
             status to "Paid"

  7          Payment Verified badge is issued, project/contract begins or
             continues
  -------------------------------------------------------------------------

### **🔍 Internal Safety Features**

  **Feature**                  **Description**
  ---------------------------- ------------------------------------------------------------------------------------------------------------
  🔒 **No manual override**    Platform invoice status cannot be edited manually via UI or backend scripts
  🧑‍⚖️ **Role-based access**     Only finance team has QuickBooks access, no access to codebase or dev tools
  📜 **Audit logging**         All updates to invoice status are logged with timestamp, user ID, IP, and source
  🧪 **Double confirmation**   Platform checks both invoice number and account email when syncing QuickBooks
  🚨 **Mismatch flags**        If invoice marked paid in QuickBooks but metadata does not match → flagged and held for review
  🔁 **Read-only sync**        QuickBooks is the source of truth. Marketeq platform **never** writes to QuickBooks --- only reads from it

### **🔄 Sync Strategy**

- **Webhook polling (preferred)**: Platform listens to QuickBooks
  payment updates via webhook.

- **Fallback: Cron job**: If webhook fails, fallback polling every 15
  mins for new paid invoices.

### **🧩 Integration Points**

  **API**                         **Purpose**
  ------------------------------- ----------------------------------------------------------------------
  QuickBooks GET /invoices        Pull invoice status by ID
  Stripe POST /checkout-session   When payment type is wire, invoice is flagged as pending
  Platform DB                     Store wire metadata (invoice ID, order ID, user ID, expected amount)
  Notification Service            Alert client when wire is marked received
