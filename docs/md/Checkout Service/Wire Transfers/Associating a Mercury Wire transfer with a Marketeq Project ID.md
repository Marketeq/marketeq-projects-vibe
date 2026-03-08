**Associating a Mercury Wire transfer with a Marketeq Project ID**\
\
To associate a Mercury wire transaction with the correct project or
contract, you need to require the client to include a unique
reference/memo during the wire submission --- then match that reference
against your internal records using Mercury's transaction data.

### **✅ Best Practice: Use Unique Memo Format Per Project**

When the user selects **\"Pay by Wire Transfer\"**, generate and display
a **unique reference code** in this format:

MARKETEQ-PROJ-\<short_project_id_or_contract_id\>

**Example:**

****MARKETEQ-PROJ-c1349

This is shown in the bank instructions like:

> Please include this reference in your wire transfer memo:\
> **MARKETEQ-PROJ-c1349**

### **🔍 How the System Matches the Transaction**

When calling the Mercury API:

GET /v1/accounts/:account_id/transactions

You'll receive transactions with fields like:

- amount

- description (includes memo/reference field)

- created_at

- counterparty_name

- type (should be \"inbound_wire\" or similar)

Your backend should **search description** for the expected reference.

### **🔐 Match Criteria**

A transaction is valid if all of these match:

  -------------------------------------------------
  **Field**     **Match Against**
  ------------- -----------------------------------
  description   Contains the expected
                MARKETEQ-PROJ-c1349

  amount        Matches expected invoice amount

  created_at    Within X days of invoice issued
  -------------------------------------------------

If multiple matches are found (very rare), pick the most recent or log
for manual review.

### **🧱 Example Matching Logic**

****const txns = await mercuryApi.getTransactions(accountId);

const match = txns.find(txn =\>

txn.description?.includes(referenceCode) &&

txn.amount === expectedAmount &&

txn.type === \'inbound_wire\'

);

if (match) {

markInvoiceAsPaid(projectId, match.id);

logAudit(match);

} else {

raiseFlagForManualReview();

}


