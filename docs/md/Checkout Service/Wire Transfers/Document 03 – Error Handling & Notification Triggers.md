# **📄 Document 03 -- Error Handling & Notification Triggers**

This document outlines how the platform should respond to errors during
the wire transfer verification process, including sync failures with
Mercury or QuickBooks, data mismatches, and automation failures. It also
defines who should be notified and how those alerts should be delivered.

## **📦 Error Scenarios Overview**

  **Scenario**                  **Description**
  ----------------------------- --------------------------------------------------------------------
  Mercury API failure           Cannot retrieve wire transaction data.
  QuickBooks API failure        Cannot fetch or update invoice status.
  Airtable sync failure         Cannot write to Airtable review log.
  Low match score               Incoming transaction cannot be confidently linked to any contract.
  Mismatched email              Email on transaction doesn\'t match the account owner.
  Manual verification skipped   Invoice marked paid in QuickBooks without a match in our platform.

## **🔁 Retry Strategy**

Each sync service implements exponential backoff with capped retries.

// Example: retry utility (used in Mercury or QuickBooks sync)

async function retryWithBackoff(task: () =\> Promise\<any\>, maxRetries
= 5) {

for (let attempt = 0; attempt \< maxRetries; attempt++) {

try {

return await task();

} catch (err) {

const delay = Math.pow(2, attempt) \* 1000;

await new Promise((resolve) =\> setTimeout(resolve, delay));

}

}

throw new Error(\"Max retries exceeded\");

}



## **📣 Notifications & Escalation**

### **✅ Delivery Channels**

- **Email**: All major failures notify the AR team.

- **Slack (Optional)**: If Slack integration is configured.

- **Internal logs**: Always recorded, even if notifications are off.

### **📨 Notification Logic**

****function notifyFailure(type: string, payload: any) {

const subject = \`\[Wire Transfer Sync Failure\] \${type}\`;

const message = \`

A sync error occurred:

• Type: \${type}

• Details: \${JSON.stringify(payload, null, 2)}

Please review immediately.

\`;

sendEmail(\"ar-team@marketeq.com\", subject, message);

logError(type, payload);

}

### **Example Triggers**

  ------------------------------------------------------------------
  **Error Type**       **Notification   **Notes**
                       Sent?**          
  -------------------- ---------------- ----------------------------
  Mercury fetch failed ✅ Email & log   Retry 5x before escalation

  QuickBooks sync      ✅ Email & log   Retry 5x, then flag invoice
  failed                                

  Low match score \<   ✅ AR team + Log Added to Airtable for manual
  50%                                   review

  Airtable write       ✅ Email & log   Queue retry
  failed                                

  No match for paid    ✅ Email & log   Flag for manual
  invoice                               investigation
  ------------------------------------------------------------------

## **🧠 Developer Tip: Central Error Handler**

You may want to create a central handler that wraps your service
methods.

async function handleSyncTask(taskName: string, taskFn: () =\>
Promise\<void\>) {

try {

await retryWithBackoff(taskFn);

} catch (err) {

notifyFailure(taskName, { error: err.message });

}

}



## **🔐 Security Considerations**

- Do not rely on Airtable status changes for verification.

- All sync failures should be logged with a secure audit trail (e.g.
  Sentry or internal DB).

- Emails must not contain sensitive financial data---use internal IDs
  and sanitized descriptions.

## **✅ Summary**

- All sync errors trigger retries + alerting.

- Final source of truth is QuickBooks "Paid" status.

- AR team must confirm all edge cases (e.g. mismatched emails).

- Airtable status ≠ platform sync -- platform waits for invoice to be
  marked as paid in QuickBooks.
