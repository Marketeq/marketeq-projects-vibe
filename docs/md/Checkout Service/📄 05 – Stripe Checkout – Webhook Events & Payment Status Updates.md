# **📄 05 -- Stripe Checkout -- Webhook Events & Payment Status Updates**

### **🧭 Purpose**

This document details all Stripe webhook events relevant to the Marketeq
Checkout microservice. These webhooks are essential for automating
post-payment workflows, including project status updates, notifications,
retries, and badge management.

All Stripe webhooks are received at the endpoint:

POST /api/checkout/webhook

They are routed internally based on event.type.

## **📡 Webhook Event Handlers**

### **1. checkout.session.completed**

**Triggered When:** A payment is successfully completed via Stripe
Checkout.

**Handler Logic:**

- Mark payment as complete in the database

- Set project or contract status to paid

- Trigger success notification to user

- Apply \"Payment Verified\" badge to client profile

- Link Stripe session ID to internal project or contract record

### **2. invoice.payment_failed**

**Triggered When:** A recurring payment (subscription) fails.

**Handler Logic:**

- Revoke \"Payment Verified\" badge (if applicable)

- Update status of any active project to paused

- Push failed attempt to retry queue (using RabbitMQ)

- Send notification and email to client

### **3. payment_intent.payment_failed**

**Triggered When:** A one-time payment attempt fails.

**Handler Logic:**

- Log failure and flag checkout session

- Revoke \"Payment Verified\" badge

- Update UI to reflect failure state

- Send alert to notification microservice

### **4. customer.subscription.deleted**

**Triggered When:** A client cancels a subscription or it is canceled
due to Stripe retries failing.

**Handler Logic:**

- Cancel installment plan

- Update project status to paused

- Prevent further installment deductions

- Send confirmation notification

### **5. payment_intent.succeeded**

**Triggered When:** A payment intent is marked as successful (e.g.,
manual confirmation after a delay).

**Handler Logic:**

- Apply final confirmation on delayed payments (e.g., wire transfer
  approved manually)

- Update session and project to paid

### **6. checkout.session.async_payment_succeeded**

**Triggered When:** Async payments like bank redirects are completed
successfully.

**Handler Logic:**

- Update database with confirmation

- Notify accounts receivable (if flagged as manual approval case)

- Update project state

### **7. checkout.session.async_payment_failed**

**Triggered When:** Async payments like Klarna or Bank redirects fail.

**Handler Logic:**

- Flag checkout session

- Cancel Stripe session

- Notify user of failure

## **🔄 Payment Retry Behavior (Subscriptions)**

- Stripe attempts retry automatically up to 3 times

- Retry queue logs each attempt

- On final failure, the subscription is canceled and project paused

## **🏷 Badge & Status Logic**

### **Payment Verified Badge**

- Applied on checkout.session.completed or payment_intent.succeeded

- Revoked on invoice.payment_failed or payment_intent.payment_failed

### **Project/Contract Status**

- paid → when any payment succeeds

- paused → when a subscription is canceled or payment fails

- pending → when wire transfer initiated (awaiting AR team)

## **🔐 Security**

- All webhook events are validated using Stripe's signature secret
  (STRIPE_WEBHOOK_SECRET)

- Replay attacks are prevented via event ID deduplication

## **🗂 Related Docs**

- 03 -- Stripe Checkout -- API Endpoints & Webhooks

- 04 -- Stripe Checkout -- Metadata Mapping & Storage Strategy

- 06 -- Stripe Checkout -- Frontend Integration Guide
