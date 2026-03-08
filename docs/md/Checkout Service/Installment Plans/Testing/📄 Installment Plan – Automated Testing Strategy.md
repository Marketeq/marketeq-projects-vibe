# **📄 Installment Plan -- Automated Testing Strategy**

### **🧭 Purpose**

This document outlines the automated testing strategy for validating the
full Stripe Checkout flow with Installment Plans on the Marketeq
platform. It includes test categories, test cases, expected outcomes,
folder structure, and exact code snippets. This guide assumes no prior
familiarity with Stripe or the platform\'s internal logic.

All tests must run in CI after every backend or frontend deployment to
ensure billing integrity, proper installment handling, and accurate
payment verification.

### **🗂 Folder Structure**

****apps/

checkout-service/

tests/

stripe/

\_\_init\_\_.ts

subscription-setup.spec.ts

failed-payments.spec.ts

installment-deposit.spec.ts

webhook-events.spec.ts

subscription-pricing.spec.ts



### **✅ Pre-requisites**

- Stripe API keys set in .env.test

- Test project listing with pricing from listings-service

- Mock user session

- Credit card test tokens from Stripe (e.g. pm_card_visa)

- Backend fully deployed locally or via test environment

### **📌 Categories of Tests**

1.  **Subscription Setup Tests\**

2.  **Deposit Rules Tests\**

3.  **Installment Pricing Tests\**

4.  **Payment Failure & Retry Logic\**

5.  **Webhook Event Flow\**

6.  **Project Pausing & Resuming\**

7.  **Badge Status Logic\**

## **✅ 1. Subscription Setup Tests**

**Test:** Should create a Stripe subscription based on calculated
installment frequency (weekly, biweekly, monthly).

test(\'creates subscription with correct frequency\', async () =\> {

const response = await request(app.getHttpServer())

.post(\'/checkout/subscribe\')

.send({

listingId: \'abc123\',

frequency: \'monthly\',

userId: \'user_test_1\',

paymentMethodId: \'pm_card_visa\',

});

expect(response.status).toBe(201);

expect(response.body.subscription.frequency).toBe(\'monthly\');

});



## **✅ 2. Deposit Rules Tests**

**Test:** Should charge the first payment as a mandatory deposit based
on selected frequency.

test(\'charges deposit as first payment\', async () =\> {

const result = await stripe.subscriptions.retrieve(subscriptionId);

const firstInvoice = await
stripe.invoices.retrieve(result.latest_invoice);

expect(firstInvoice.amount_paid).toBeGreaterThan(0);

expect(firstInvoice.status).toBe(\'paid\');

});



## **✅ 3. Installment Pricing Tests**

**Test:** Ensure the backend calculates installment amounts correctly
and reflects in Stripe subscription.

test(\'calculates correct installment amount\', async () =\> {

const { projectTotal, durationWeeks } = await getProjectDetails();

const expectedAmount = projectTotal / durationWeeks;

const sub = await stripe.subscriptions.retrieve(subscriptionId);

const price = await
stripe.prices.retrieve(sub.items.data\[0\].price.id);

expect(price.unit_amount).toBe(expectedAmount);

});



## **✅ 4. Payment Failure & Retry Logic**

**Test:** Simulate a failed payment and verify retry scheduling and
project pausing.

test(\'handles failed payments and retries\', async () =\> {

await simulatePaymentFailure(subscriptionId);

const projectStatus = await getProjectStatus(projectId);

expect(projectStatus).toBe(\'paused\');

const retryScheduled = await checkRetryScheduled(subscriptionId);

expect(retryScheduled).toBe(true);

});



## **✅ 5. Webhook Event Flow**

**Test:** Stripe webhook should update project status on success/failure
events.

test(\'webhook updates status on payment success\', async () =\> {

await sendStripeWebhook(\'invoice.payment_succeeded\', invoicePayload);

const project = await getProject(projectId);

expect(project.status).toBe(\'active\');

});



## **✅ 6. Project Pausing & Resuming**

**Test:** Project is paused on failure and resumed on successful retry
payment.

test(\'resumes project on retry success\', async () =\> {

await simulateRetryPayment(subscriptionId, \'pm_card_visa\');

const project = await getProject(projectId);

expect(project.status).toBe(\'active\');

});



## **✅ 7. Badge Status Logic**

**Test:** Users receive a \"Payment Verified\" badge only after deposit
payment is successful.

test(\'awards verified badge on deposit success\', async () =\> {

const user = await getUserProfile(userId);

expect(user.badges).toContain(\'payment_verified\');

});



### **🚀 CI/CD Integration**

All tests above should run automatically during CI/CD builds. Add this
test job to .github/workflows/ci.yml:

jobs:

test:

runs-on: ubuntu-latest

steps:

\- uses: actions/checkout@v3

\- run: npm install

\- run: npm run test:installments


