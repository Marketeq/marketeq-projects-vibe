# **📄 Document 02 -- Matching Score Logic & Manual Review Criteria**

This document defines the full backend logic for matching wire transfer
transactions with platform projects or contracts. It ensures **manual
verification only**, with no auto-verification allowed. Match scores are
computed to help the Accounts Receivable (AR) team prioritize which
transactions are easiest to confirm, but **confirmation must always be
done manually inside QuickBooks**.

## **📦 Folder Structure (ar-verification-service)**

****ar-verification-service/

├── src/

│ ├── airtable/

│ │ └── airtable.service.ts

│ ├── mercury/

│ │ └── mercury.service.ts

│ ├── matching/

│ │ └── score.service.ts

│ ├── scheduler/

│ │ └── sync-job.service.ts

│ ├── quickbooks/

│ │ └── quickbooks.service.ts

│ ├── transactions/

│ │ └── transaction.entity.ts

│ └── main.ts

├── .env

├── package.json

└── tsconfig.json



## **🔍 Matching Score Logic**

We calculate a confidence score using weighted matching across multiple
data points. This helps AR staff quickly understand the likelihood of a
correct match.

### **✅ Matching Criteria**

  ----------------------------------------------------------------------
  **Field**             **Description**                 **Match Weight
                                                        (%)**
  --------------------- ------------------------------- ----------------
  Project ID (from      Embedded in memo or wire notes  **50%**
  metadata)                                             

  Amount Received       Matches expected contract       **25%**
                        amount                          

  Client Name           Partial match with platform     **10%**
                        client record                   

  Email on Transaction  Matches known platform user     **10%**

  QuickBooks Invoice ID Exists and is linked to project **5%**
  ----------------------------------------------------------------------

> ⚠️ Scores are capped at 100%. Some fields may be missing; in such
> cases, the score will adjust proportionally.

## **🧠 Sample Score Calculation**

****function calculateMatchScore(transaction: WireTransaction, project:
Project): number {

let score = 0;

if (transaction.projectId === project.id) score += 50;

if (transaction.amount === project.expectedAmount) score += 25;

if (transaction.clientName?.includes(project.clientName)) score += 10;

if (transaction.email && transaction.email === project.userEmail) score
+= 10;

if (transaction.invoiceId && project.quickbooksInvoiceId ===
transaction.invoiceId) score += 5;

return score;

}



## **✋ Manual Review Criteria**

  --------------------------------------------------------
  **Match     **Action Required**
  Score**     
  ----------- --------------------------------------------
  90--100%    Likely match. AR can review and approve
              quickly.

  70--89%     Review recommended. Check client details and
              confirm.

  50--69%     Requires deeper investigation. Verify all
              fields manually.

  \< 50%      Do not verify. Needs client outreach or
              manual escalation.
  --------------------------------------------------------

## **🔁 Airtable Sync -- Transaction Record Format**

All incoming transactions from Mercury and QuickBooks are logged into
Airtable for manual review. This acts as a temporary AR dashboard.

  --------------------------------------------------------------
  **Column**          **Description**
  ------------------- ------------------------------------------
  Transaction ID      Unique Mercury or QuickBooks transaction
                      identifier

  Project/Contract ID Pulled from metadata or matched manually

  Client Name         From transaction or associated contract

  Email on            Email found on payment (may not match
  Transaction         platform user)

  Platform User Email If a match is found; blank otherwise

  Amount Received     Actual amount received via wire transfer

  Expected Amount     Based on contract or invoice

  Match Score (%)     Computed using weighted match logic above

  Status (Dropdown)   Pending, Verified, Rejected, Needs Review

  Reviewed By         AR team member who manually reviewed it

  QuickBooks Invoice  ID of synced QuickBooks invoice (if
  ID                  available)

  Synced to Platform? Boolean or timestamp showing sync
                      completion
  --------------------------------------------------------------

## **⚠️ Important Notes**

- No status changes in Airtable are trusted to confirm payment.
  QuickBooks is the source of truth.

- This Airtable record simply helps **guide AR workflows**. Final
  confirmation **must happen inside QuickBooks**.

- After a QuickBooks invoice is manually marked as \"Paid\", our
  platform detects it via polling/webhook and **syncs the Verified
  status** back to the platform.
