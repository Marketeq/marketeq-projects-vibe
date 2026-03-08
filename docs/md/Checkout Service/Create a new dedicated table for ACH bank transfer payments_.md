**Create a new dedicated table for ACH bank transfer payments.**

Given your architecture, here's the best-practice recommendation:

## **✅ Final Recommendation**

**Create a new dedicated table for ACH bank transfer payments.**

**Do NOT reuse stripe_metadata** for these records.

## **🧠 Reasoning**

### **Why NOT use stripe_metadata for ACH transfers?**

- That table is likely designed for storing **Stripe session metadata**
  (e.g., invoice ID, subscription ID, customer ID) --- which is
  **already normalized and structured around Stripe's internal
  objects**.

- ACH transfers in Stripe have **delayed settlement**, **risk of
  reversals**, and **require mandate tracking**, unlike credit card or
  instant payments.

- Conflating the two could lead to **messy query logic**, unnecessary
  null fields, and difficulty in reporting/alerting.

## **✅ What the new table should track**

Create something like this:

**ach_payment_records**

  **Column**                 **Type**                       **Description**
  -------------------------- ------------------------------ -----------------------------------------------
  id                         UUID / PK                      Primary key
  stripe_payment_intent_id   string                         ID of the payment intent
  bank_account_id            FK → linked_bank_accounts.id   Which bank account was used
  customer_id                string                         Stripe customer ID
  status                     enum                           processing, succeeded, failed, returned, etc.
  amount                     integer                        In cents
  currency                   string                         e.g. \"usd\"
  created_at                 timestamp                      When the payment intent was created
  updated_at                 timestamp                      Updated by webhooks
  mandate_id                 string                         Optional: Stripe mandate ID
  metadata                   JSONB                          Store any relevant custom data here

## **⚙️ Architecture Notes**

- This makes **auditing, retry logic, and reconciliation** for ACH
  payments far more robust.

- If Stripe adds ACH-specific fields or statuses in the future, you
  won't need to refactor.

- Your webhook handler can simply route incoming payment_intent.\* or
  charge.\* events to this table if the payment method type is
  ach_debit.

## **✅ Summary**

  **Option**                   **Recommended?**   **Why**
  ---------------------------- ------------------ -----------------------------------------------------------------
  Reuse stripe_metadata        ❌ No              Poor separation of concerns, harder to track ACH-specific state
  Create ach_payment_records   ✅ Yes             Cleaner, extensible, secure, reliable for long-term use
