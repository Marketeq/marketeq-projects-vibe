**Document 09 -- QuickBooks Invoice ID Sync Rules**

This document defines the invoice ID syncing rules between the Marketeq
platform and QuickBooks. It explains how the DocNumber field is set
during invoice creation, how to ensure consistency between systems, and
what to do if mismatches occur during sync or audit events.

## **✅ 1. Purpose**

Marketeq generates invoices during the checkout process. These invoices
use a platform-generated ID (e.g., INV-3821). This ID must be used as
the source of truth and synced to QuickBooks as the invoice\'s
DocNumber.

This ensures:

- The invoice in QuickBooks matches the invoice in Marketeq's billing
  system.

- The AR team can easily reconcile payments across systems.

- Match score logic can leverage shared identifiers during verification.

## **✅ 2. How Marketeq Sets the Invoice ID**

When a user completes checkout:

- The Marketeq backend generates an invoice ID in the format: INV-XXXX.

- This ID is **unique** to the project/contract and used internally for
  reference.

- It is included in:

  - Stripe metadata (if using card/ACH/SEPA payments)

  - QuickBooks API payload (as DocNumber)

  - Airtable and audit logs

  - Internal project billing records

## **✅ 3. QuickBooks Invoice Creation Rules**

When creating an invoice via QuickBooks API:

const quickbooksInvoicePayload = {

CustomerRef: { value: quickbooksCustomerId },

Line: \[\...\],

TxnDate: new Date().toISOString().split(\'T\')\[0\],

DueDate: getDueDate(), // e.g., immediate for wire transfers

DocNumber: invoiceIdFromCheckout, // This must match Marketeq\'s
INV-XXXX

PrivateNote: \`Project: \${projectId} \| Contract: \${contractId}\`,

CustomField: \[

{

DefinitionId: \"1\",

Name: \"MarketeqProjectID\",

Type: \"StringType\",

StringValue: projectId

}

\]

}

### **🔐 Important Notes:**

- DocNumber **must** be unique in QuickBooks. If the same ID is reused,
  QuickBooks will reject the invoice.

- Always perform a check before invoice creation to avoid conflicts:

const existing = await
quickbooksAPI.searchInvoiceByDocNumber(invoiceId);

if (existing) {

throw new Error(\"Invoice ID already exists in QuickBooks\");

}



## **✅ 4. Sync Conflict Scenarios**

  **Scenario**                                **Handling Strategy**
  ------------------------------------------- ---------------------------------------------------------------
  DocNumber already exists in QBO             Reject invoice creation and log an error
  Invoice created in QBO with wrong ID        Send to audit log and email AR team
  Invoice ID mismatch during reconciliation   Add to Airtable under "Needs Review" status, mark as desynced

## **✅ 5. Match Score Impact**

The presence of a synced DocNumber in QuickBooks contributes to the
match score used for payment verification. Specifically:

- ✅ **+5% match weight** is added if QuickBooks contains the correct
  invoice ID synced from Marketeq

- Used in combination with:

  - Amount match

  - Project ID match

  - Email or client name match

## **✅ 6. Logging & Auditing**

All successful and failed syncs should be logged in two places:

1.  **Centralized logging system** (e.g., CloudWatch, Logtail, etc.)

2.  **Airtable Audit Tracker** (optional)

Airtable schema (extended from previous docs):

  ---------------------------------------------------
  **Field**            **Description**
  -------------------- ------------------------------
  Invoice ID (INV-XXX) From Marketeq system

  QuickBooks DocNumber Actual DocNumber in QBO

  Match Status         Matched, Mismatched, Pending

  Reason (if failed)   Invoice ID conflict, network
                       error, etc.

  Synced At            Timestamp of successful sync
                       (or retry)
  ---------------------------------------------------

## **✅ 7. Retry Logic**

If QuickBooks invoice creation fails due to a duplicate DocNumber:

- Automatically retry by generating a suffix variant (e.g., INV-3821-A)

- Log the override and notify the AR team

- Sync the new ID back to Marketeq records to prevent mismatches

> ⚠️ This fallback should only be used if absolutely necessary. The
> preferred method is to ensure a clean sync with the original INV-XXXX
> ID.

## **✅ 8. Final Recommendations**

- Marketeq invoice ID (INV-XXXX) should always be the master source of
  truth.

- Never allow QuickBooks to auto-generate the invoice number.

- During reconciliation, always prioritize the DocNumber match before
  amount or email.
