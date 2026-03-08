Here's a **minimal postman_collection.json** that you can import
directly into Postman.\
It's lightweight and maps exactly to your NestJS endpoints.

## **🗂 postman_collection.json**

****{

\"info\": {

\"name\": \"Marketeq Checkout Service\",

\"\_postman_id\": \"c09f8c15-9f7e-4a2b-9d9e-f3202a8a73d8\",

\"description\": \"Test ACH, invoices & webhooks for the Marketeq
Checkout Service.\",

\"schema\":
\"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\"

},

\"item\": \[

{

\"name\": \"Create Bank Link Session\",

\"request\": {

\"method\": \"POST\",

\"header\": \[{ \"key\": \"Content-Type\", \"value\":
\"application/json\" }\],

\"body\": {

\"mode\": \"raw\",

\"raw\": \"{ \\\"customerId\\\": \\\"cus_12345\\\" }\"

},

\"url\": { \"raw\":
\"http://localhost:3000/checkout/create-bank-link-session\",
\"protocol\": \"http\", \"host\": \[\"localhost\"\], \"port\": \"3000\",
\"path\": \[\"checkout\", \"create-bank-link-session\"\] }

}

},

{

\"name\": \"Create Payment Intent ACH\",

\"request\": {

\"method\": \"POST\",

\"header\": \[{ \"key\": \"Content-Type\", \"value\":
\"application/json\" }\],

\"body\": {

\"mode\": \"raw\",

\"raw\": \"{ \\\"customerId\\\": \\\"cus_12345\\\",
\\\"paymentMethodId\\\": \\\"pm_abc123\\\", \\\"amount\\\": 50000 }\"

},

\"url\": { \"raw\": \"http://localhost:3000/checkout/pay-ach\",
\"protocol\": \"http\", \"host\": \[\"localhost\"\], \"port\": \"3000\",
\"path\": \[\"checkout\", \"pay-ach\"\] }

}

},

{

\"name\": \"Test Stripe Webhook\",

\"request\": {

\"method\": \"POST\",

\"header\": \[{ \"key\": \"Content-Type\", \"value\":
\"application/json\" }\],

\"body\": {

\"mode\": \"raw\",

\"raw\": \"{\\n \\\"id\\\": \\\"evt_test_webhook\\\",\\n \\\"type\\\":
\\\"payment_intent.succeeded\\\",\\n \\\"data\\\": {\\n \\\"object\\\":
{\\n \\\"id\\\": \\\"pi_test123\\\",\\n \\\"amount\\\": 50000,\\n
\\\"metadata\\\": {\\n \\\"project_id\\\": \\\"proj_456\\\",\\n
\\\"contract_id\\\": \\\"ctr_789\\\"\\n }\\n }\\n }\\n}\"

},

\"url\": { \"raw\": \"http://localhost:3000/webhook/stripe\",
\"protocol\": \"http\", \"host\": \[\"localhost\"\], \"port\": \"3000\",
\"path\": \[\"webhook\", \"stripe\"\] }

}

}

\]

}



✅ **Done.**

To use:

1.  Save that as postman_collection.json

2.  In Postman → Import → Upload File → select the JSON

3.  Run each request.
