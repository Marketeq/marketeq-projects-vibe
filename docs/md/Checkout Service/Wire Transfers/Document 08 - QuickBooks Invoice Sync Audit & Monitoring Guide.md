**Document 08 - QuickBooks Invoice Sync Audit & Monitoring Guide**

This document provides a complete implementation guide for monitoring
and alerting around QuickBooks invoice syncs. It includes email
alerting, centralized logging design, success/failure handling, and
optional Airtable sync for Accounts Receivable (AR) team visibility.

### **✅ 1. Notifications -- Email (Slack Optional Later)**

**When to Trigger:**

- Invoice sync fails (QuickBooks API error, timeout, bad payload)

- Unexpected mismatch (e.g. invoice not found in QuickBooks)

**Email Template**

- **To:** ar-team@marketeq.com

- **Subject:** ⚠️ QuickBooks Sync Failure -- \[Invoice ID or Project
  ID\]

- **Body:\**

****Invoice sync failed for the following contract:

\- Project ID: PROJ-3820

\- Invoice ID: INV-3820

\- Error: QuickBooks returned 403 -- Invalid token

\- Timestamp: 2025-06-24T19:10:23Z

Please investigate and manually sync if needed.

Regards,

Finance Automation Bot

**Optional Slack (Later)\**
Use Slack webhook once infra is ready:

await axios.post(process.env.SLACK_WEBHOOK_URL, {

text: \`⚠️ QuickBooks sync failed for Project ID: PROJ-3820 (INV-3820).
Manual review needed.\`

});



### **✅ 2. Centralized Logging -- Best Practice Structure**

Industry best practice for financial/transaction logs is to **log both
success and failure events** in a secure, queryable store.

**Recommendation:** Use a centralized system like **Logtail**,
**Datadog**, or **OpenSearch**.

**Log Schema:**

****{

source: \'quickbooks-sync-service\',

eventType: \'invoice-sync\',

invoiceId: \'INV-3820\',

projectId: \'PROJ-3820\',

quickbooksInvoiceId: \'QBO-8093\',

status: \'FAILED\' \| \'SUCCESS\',

error: \'Token expired\' \|\| null,

timestamp: \'2025-06-24T19:10:23Z\',

retries: 2,

matched: true

}

**Why log success?**

> Logging success is standard for audit trails in payment systems. You
> need a complete trace for reconciliation and audit readiness (PCI,
> SOC2, etc.).

### **✅ 3. Sync to Airtable for AR Visibility (Optional UI Layer)**

If no AR dashboard is built yet, send **event data to Airtable** so the
AR team has live visibility of all sync attempts.

**Table Name:** QuickBooks Sync Logs

**Schema:**

  ---------------------------------------------------
  **Column**          **Description**
  ------------------- -------------------------------
  Invoice ID          Our internal INV-3820

  Project ID          PROJ-3820

  Sync Status         Pending, Success, Failed

  Error               If any (e.g., \"Invalid
                      QuickBooks token\")

  Timestamp           Attempted sync time

  Retried?            Yes/No

  QuickBooks Invoice  If synced successfully
  ID                  

  Synced by           System or Manual

  Manual Override     Optional notes from AR team
  Notes               
  ---------------------------------------------------

**Example Row (Successful Sync)**

- Invoice ID: INV-3820

- Project ID: PROJ-3820

- Sync Status: Success

- Error: ---

- Timestamp: 2025-06-24T19:10:23Z

- Retried?: No

- QuickBooks Invoice ID: QBO-8093

- Synced By: System

### **✅ 4. Retry Logic (If Sync Fails)**

- Max retries: 3 attempts with exponential backoff.

- Wait 15s → 60s → 180s.

- On third failure:

  - Log to centralized logger

  - Notify AR via email

  - Sync failure state to Airtable (if enabled)

async function syncInvoice(invoiceData) {

for (let attempt = 1; attempt \<= 3; attempt++) {

try {

await quickbooks.createInvoice(invoiceData);

logSuccess();

notifyAirtableSuccess();

return;

} catch (err) {

logFailure(err, attempt);

if (attempt === 3) {

notifyAR(invoiceData, err);

notifyAirtableFailure();

}

}

await delay(getBackoffTime(attempt));

}

}



### **✅ 5. Summary**

  -------------------------------------------
  **Feature**      **Status**
  ---------------- --------------------------
  Email Alerts     ✅ Implement immediately

  Slack Alerts     🔜 Optional -- future
                   add-on

  Log Success      ✅ Yes (PCI/SOC2
  Events           recommended)

  Log Failures     ✅ Required

  Airtable Sync    ✅ Enabled (optional
                   fallback UI)

  Retry Logic      ✅ 3 attempts, exponential
                   backoff

  Admin Dashboard  ❌ Not in this sprint
  -------------------------------------------
