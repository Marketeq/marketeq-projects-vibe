# **🚀 Your summarized current flow**

✅ You have three solid endpoints already:

1.  **POST /create-bank-link-session\**

    - Creates a Financial Connections session

    - Returns clientSecret for Stripe.js to link a bank.

2.  **POST /attach-bank-account\**

    - Takes financialConnectionsAccountId from Stripe.js

    - Creates a PaymentMethod (type us_bank_account)

    - Attaches it to the customer

3.  **POST /pay-ach\**

    - Initiates a PaymentIntent with the attached paymentMethodId

# **🚧 The *mandate* error in your flow**

> \"This PaymentIntent requires a mandate, but no existing mandate was
> found.\"

✅ Correct. That's **not a bug in your code.\**
It happens because:

- Stripe requires **mandate acceptance from the customer for ACH**.

- When you test via **Postman**, there\'s **no Stripe.js flow to collect
  the mandate** (the checkbox + IP capture).

- Stripe does not auto-create mandates via pure API. It expects them to
  come from Stripe.js or a pre-built Payment Link.

# **✅ How to solve it**

For ACH with us_bank_account, Stripe automatically creates the mandate
*when the user completes linking + acceptance via Stripe.js.\*
That means:

- Your /create-bank-link-session → **front-end must call**
  stripe.collectBankAccountForPayment.

- You then get a paymentMethod.id with a mandate.

## **🔥 Example Frontend flow (React, Next.js)**

****const stripe = await getStripeJs();

const { error, setupIntent } = await
stripe.collectBankAccountForPayment({

clientSecret,

paymentMethodType: \'us_bank_account\',

});

if (error) {

console.error(error);

return;

}

// Now you have paymentMethodId with mandate

console.log(\'Payment method attached:\', setupIntent.payment_method);



# **✅ Answers to your product + architecture questions**

## **➡ Should users be allowed to link multiple bank accounts?**

- ✅ Yes, ideally. Many businesses use multiple bank accounts.

- Stripe lets you attach multiple PaymentMethod objects to a Customer.

- We can build an endpoint to list them (using
  stripe.paymentMethods.list).

## **➡ Do we need to store bank metadata (name, last4, fingerprint)?**

- ✅ Yes. You need to store:

  - last4

  - bank_name

  - fingerprint

- To show in billing UI: "\*\*\*\*1234 (Wells Fargo)".

- 🔒 Store encrypted or at minimum mask it. Never store full account
  number.

## **➡ When should Stripe customers be created?**

- ✅ You already decided:

  - Create Stripe customers on **signup or first checkout**.

  - Avoid delaying creation to bank-link step.

## **➡ Should users be able to unlink banks?**

- ✅ Yes, but typically not MVP.

- Stripe: paymentMethods.detach(paymentMethodId)

- You'd create /unlink-bank endpoint.

- Also useful for security if an employee leaves a company.

## **➡ Retry logic or error handling for failed ACH?**

- ✅ Absolutely:

  - Stripe automatically retries by default for us_bank_account with
    your subscription retry_settings.

  - But we also recommend:

    - Logging failures

    - Notifying user + AR team on failed attempts

    - Manual fallback like a dashboard mark or email

# **✅ Additional improvements for your implementation**

✅ Instead of **three disjoint endpoints**, you could streamline:

- /create-bank-link-session -- stays the same.

- /complete-bank-link -- once front-end finishes
  collectBankAccountForPayment, you pass setupIntent.payment_method to
  backend.

- /pay-ach -- stays, but simpler because PaymentMethod is always ready.
