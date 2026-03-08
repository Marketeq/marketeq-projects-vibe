# **📄 Developer Guide -- Handling Mercury Bank Transactions & Account Numbers**

## **🧭 Purpose**

This document explains exactly how developers on the Marketeq platform
should **handle Mercury bank account numbers and incoming transaction
data**, covering:

✅ What is safe to expose\
✅ Where to log or store it\
✅ Where to absolutely avoid printing it\
✅ Why this matters for security & compliance

## **🚀 Context**

Our platform uses a Mercury business account to:

- Receive wire transfers & ACH payments from clients

- Reconcile these payments with projects, contracts, and QuickBooks
  invoices

It's completely normal for clients to see our **Mercury receiving
account number** (since that's how they send money).\
But we still need to minimize exposure of this data outside of the
places where it is explicitly needed.

## **🔐 1. Showing our Mercury account number to clients**

✅ It is **required and safe** to display our Mercury account number in:

- Wire instructions on the client checkout screen.

- Transaction receipts or confirmation emails that say:

> "Send payment to:

- Bank: Mercury

- Routing: 123456789

- Account: 987654321"

✅ This is normal.

- No one can debit our account using this info --- it's purely a
  *destination* for inbound wires.

## **🚫 2. Where NOT to expose Mercury account numbers or transaction data**

  **Scenario**               **Rule**
  -------------------------- ---------------------------------------------------------------------------------------------------------------------------
  Browser JSON payloads      🚫 Never send account_number or internal Mercury transaction JSON to the frontend, except for explicit wire instructions.
  Console logs               🚫 Never console.log full transaction JSON that includes account_number, routing, trace_id, or customer payment details.
  Third-party integrations   🚫 Only send masked data (like last4) if absolutely needed.

## **✅ 3. What IS safe to show internally**

✅ Internal AR dashboards (Airtable, Looker, or a future custom admin
panel) **can show:**

- Full transaction details

- Metadata with project / contract links

- Account numbers (since it's your own account)

- Match scores and reconciliation data

✅ These are internal, behind strong auth, only visible to staff.

## **🔍 4. Logging rules for Mercury transactions**

  -----------------------------------------------------------------------
  **Data**             **Log      **How to log**
                       it?**      
  -------------------- ---------- ---------------------------------------
  transaction_id,      ✅ Yes     console.log(\"Wire ID txn_123 Amount
  amount                          \$500\")

  account_number       🚫 No,     console.log(\"Account \*\*\*\*1234\")
  (full)               mask       

  Full transaction     🚫 No      Never dump whole JSON payload in logs
  JSON                            
  -----------------------------------------------------------------------

## **⚙️ 5. Example safe code patterns**

✅ **Good logging:**

****console.log(\`Received wire: ID \${txn.id}, Amount
\$\${txn.amount}, Account \*\*\*\*\${txn.account_number.slice(-4)}\`);

🚫 **Bad logging:**

****console.log(JSON.stringify(txn)); // might include full
account/routing numbers, sensitive internal refs



## **🔥 6. Why we enforce this**

- Even though these are **our own Mercury accounts**, broad exposure of
  your transaction flows can reveal:

  - Client names & payment schedules (useful for social engineering
    attacks).

  - Exact routing & banking patterns (useful for fraudsters to craft
    targeted scams).

- PCI and general banking data compliance demand **minimum necessary
  data exposure**.

## **✅ 7. Summary of safe usage**

  **Where**                    **Allowed?**     **Notes**
  ---------------------------- ---------------- ----------------------------------------------------------------
  Checkout wire instructions   ✅ Yes           This is the primary place to show the full account.
  AR dashboards / Airtable     ✅ Yes           Restricted to internal, auth-locked dashboards.
  API JSON to client apps      🚫 No            Never send bank details unless for explicit wire instructions.
  Logs / console statements    🚫 Masked only   Use \*\*\*\*1234.

## **🛡 Security cheat sheet for developers**

✅ **Always mask account_number in logs:**

****\`\*\*\*\*\${account_number.slice(-4)}\`

✅ **Keep raw transaction data internal.\**
Only process it server-side to match project IDs, generate match scores,
and update AR dashboards.

✅ **Never store or cache full bank account data in the browser.**

## **🔥 Example backend handler for transactions**

****import { Injectable } from \'@nestjs/common\';

\@Injectable()

export class MercuryTransactionService {

processIncoming(txn) {

console.log(\`Wire: ID \${txn.id} Amount \$\${txn.amount} Account
\*\*\*\*\${txn.account_number.slice(-4)}\`);

return {

transactionId: txn.id,

amount: txn.amount,

accountLast4: txn.account_number.slice(-4),

status: txn.status,

};

}

}



# **✅ 🚀 Bottom line**

✅ **It's perfectly safe** to show our Mercury receiving account numbers
*when asking clients to send payments.\*
✅ It's equally critical to **keep this data out of casual logs or
client API JSON** to reduce attack surface.
