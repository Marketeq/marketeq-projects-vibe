## **✅ 1. Check the permissions / scopes on your Mercury API key**

Mercury uses two primary scopes for their API keys:

  ------------------------------------------------------------
  **Scope**   **Description**
  ----------- ------------------------------------------------
  read        Allows fetching accounts, transactions,
              balances, etc.

  write       Allows initiating wires, creating virtual cards,
              etc.
  ------------------------------------------------------------

They do **not** expose scopes via API. To verify, you have to:

- Go to your [[Mercury
  dashboard]{.underline}](https://dashboard.mercury.com/).

- Navigate to **Settings → API Access → API Keys**.

- Check the permissions you granted when generating the key.

If your key was created with only read scope, you **cannot perform write
operations** (like wires).

## **✅ 2. Are there active Mercury accounts linked to this API key?**

Your API key is tied to your company's Mercury account --- there's **no
separate per-account linking** like multi-tenant wallets.\
But to see if it can pull your bank account data:

- Try fetching your accounts:

curl -X GET \"https://api.mercury.com/v1/accounts\" \\

-H \"Authorization: Bearer \<YOUR_API_KEY\>\"

A successful response looks like:

{

\"data\": \[

{

\"id\": \"acc_xxx\",

\"account_number\": \"987654321\",

\"routing_number\": \"026073150\",

\"balance\": 20450.00,

\"type\": \"checking\"

}

\]

}

If it returns notFound, it may be:

- Wrong API key (or wrong permissions)

- Your Mercury business has **no active bank accounts yet** (must be
  opened first)

- You might be using a **sandbox key**, which returns empty if no
  sandbox test data is seeded

## **✅ 3. Correct Base URL for Production?**

Yes, this is correct for Mercury's **live production environment**:

https://api.mercury.com/v1

If you're using a **sandbox** key, you must instead call:

https://sandbox.api.mercury.com/v1

Trying to use a sandbox key on api.mercury.com will return notFound or
unauthorized errors.

## **✅ 4. How to get the Mercury account ID (not account number)**

Use:

curl -X GET \"https://api.mercury.com/v1/accounts\" \\

-H \"Authorization: Bearer \<YOUR_API_KEY\>\"

You'll get something like:

{

\"data\": \[

{

\"id\": \"acc_230dsjlk2js3\", // \<\-- This is the Mercury Account ID

\"account_number\": \"123456789\",

\"routing_number\": \"026073150\",

\"balance\": 10000,

\"type\": \"checking\"

}

\]

}

- **id** is the **Mercury account ID** (like acc_230dsjlk2js3) which
  you use for API calls.

- Do **not** use account_number for linking transactions in your code
  --- always use id.

## **⚠️ Common Fixes for Your notFound Error:**

✅ Double check you're using the **production API key** (not sandbox).\
✅ Make sure your Mercury dashboard has **actual business bank accounts
open**.\
✅ Ensure your key is created with at least read access.\
✅ Verify you're hitting the correct base URL (sandbox vs prod).
