Alright --- this is actually a common **breaking issue** many developers
hit in 2024-2025 with Plaid's evolving integrations.

## **🚨 Explanation: Why it fails**

- **Plaid officially no longer supports Stripe as a processor.\**

  - They removed stripe from the
    ProcessorTokenCreateRequestProcessorEnum.

  - Stripe deprecated their original processor token flow with Plaid
    around 2023-2024 (after they pushed users to use [[Stripe Financial
    Connections]{.underline}](https://stripe.com/docs/financial-connections)
    instead).

- The current recommended approach from Stripe is:

  - Use **Stripe Financial Connections**, which directly connects bank
    accounts (via Stripe) for ACH debits.

  - This means Plaid is **no longer the integration point** for Stripe
    ACH. Stripe manages bank linking and microdeposits directly.

So you cannot use:

processor: \'stripe\'

or:

processor: ProcessorTokenCreateRequestProcessorEnum.Stripe

because **it's deprecated and removed** from Plaid.

## **✅ How to properly implement Plaid + ACH today (2025)**

### **If your ACH is through Stripe**

You **do not use Plaid at all.\**
Instead, use:

- **Stripe Financial Connections**:

  - [[https://stripe.com/docs/financial-connections/ach-debit\]{.underline}
    ](https://stripe.com/docs/financial-connections/ach-debit)

- Stripe will collect account + routing numbers, do microdeposits or
  instant verification, and return a bank_account object you can attach
  to a customer for ACH payments.

### **If your ACH is through another processor (like Modern Treasury, Dwolla, or directly Mercury)**

- Then you continue to use Plaid to generate processor_token for that
  processor (example modern_treasury or dwolla).

- For example:

processor: \'modern_treasury\' // valid processor



## **✅ Your options based on this project**

Given you said your **bank payouts are through Mercury**:

1.  **If using Plaid for account validation**:\
    Use processor token for a supported processor such as
    modern_treasury or dwolla (which integrates well with Mercury).

2.  **If doing direct Mercury wires and ACH**:\
    You likely **don't need Plaid processor token at all**.\
    You can use Plaid just to **verify accounts (retrieve account &
    routing)**, and store it --- then Mercury\'s API (or wire
    instructions) handle the actual transactions.

## **💡 Example for Mercury direct (no processor token)**

****const account = await plaidClient.getAuth({

access_token: decryptedPlaidToken,

});

const accountNumber = account.accounts\[0\].account_id; // or real
number if using auth

const routingNumber = account.accounts\[0\].routing_numbers.ach;

await mercuryService.initiateAchTransfer({

accountNumber,

routingNumber,

amount: 5000,

currency: \'USD\',

});



## **🔥 Action items for your repo**

### **1. Remove processor token attempt**

In your NestJS banking.service.ts remove:

processor: \'stripe\' as ProcessorTokenCreateRequestProcessorEnum,

and instead:

- If using Mercury, just retrieve account & routing from Plaid.

- If using another processor, replace stripe with the valid processor
  name (like dwolla).

### **2. Update your .env / config to store ACH provider**

So you can switch easily.

ACH_PROCESSOR=mercury



## **✅ Here's your updated NestJS code snippet**

****const account = await this.plaidClient.getAuth({

access_token: decryptedToken,

});

const bankData = account.accounts.find(a =\> a.subtype === \'checking\'
\|\| a.subtype === \'savings\');

await this.mercuryClient.initiateACHTransfer({

accountNumber: bankData.account_id, // adjust for real vs Plaid sandbox

routingNumber: bankData.routing_numbers.ach,

amount: paymentAmount,

currency: \'USD\',

memo: \`Project \${projectId}\`

});



## **🚀 In short**

✅ **Stripe ACH via Plaid is dead** --- you must use Stripe Financial
Connections (not Plaid).\
✅ **Plaid processor token only for Dwolla, Modern Treasury, etc.\**
✅ **For Mercury wires/ACH** --- use Plaid purely for **auth data**
(account & routing), then run Mercury API for actual payments.
