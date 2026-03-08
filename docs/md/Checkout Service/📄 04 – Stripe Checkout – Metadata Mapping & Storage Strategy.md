# **📄 04 -- Stripe Checkout -- Metadata Mapping & Storage Strategy**

### **🔍 Overview**

This document defines how metadata from the Stripe Checkout process is
mapped, stored, and linked to internal project and contract records.
Metadata is essential for tracking payment sessions, associating them
with the correct user and project, and ensuring downstream services
(like invoicing, payouts, and analytics) have access to structured
payment information.

All metadata is stored in the platform\'s internal PostgreSQL database,
under a dedicated table (e.g., stripe_metadata). Data captured here is
referenced by other services using internal project ID, contract ID, and
client ID.

## **🔹 Metadata Fields & Descriptions**

  **Field**               **Type**    **Description**                                                             **Linked Microservice**
  ----------------------- ----------- --------------------------------------------------------------------------- -------------------------
  stripeSessionId         string      The unique session ID for the Stripe Checkout session                       checkout-service
  paymentIntentId         string      Stripe-generated identifier for the payment intent                          checkout-service
  customerId              string      Stripe customer ID linked to the client account                             user-service
  clientId                UUID        Internal Marketeq user ID of the client                                     user-service
  projectId               UUID        Internal ID of the associated project                                       listings-service
  contractId              UUID        Optional ID of contract (used for hiring teams or individual contractors)   contracts-service
  amount                  integer     Total payment amount in cents                                               checkout-service
  currency                string      Currency code (e.g., \"USD\")                                               checkout-service
  paymentMethod           string      Type of payment method (e.g., card, ach_credit_transfer, klarna)            checkout-service
  billingType             string      Type of billing (one-time, subscription, split, wire)                       checkout-service
  subscriptionId          string      Stripe subscription ID (if applicable)                                      checkout-service
  paidAt                  timestamp   Time of payment confirmation                                                checkout-service
  expiresAt               timestamp   Expiration time for the Stripe session                                      checkout-service
  paymentStatus           string      Current status (e.g., paid, failed, pending_wire_transfer)                  checkout-service
  verificationStatus      string      Flag: verified, unverified (used for badge logic)                           checkout-service
  wireTransferConfirmed   boolean     Manual flag set to true when account receivable confirms wire receipt       admin/manual review

## **🔹 Metadata Capture Logic**

- All metadata is captured immediately after the Stripe session is
  created.

- Updates to metadata (e.g., payment confirmed, failed, subscription
  canceled) are triggered by Stripe webhooks.

- Wire transfers require manual confirmation and update the
  wireTransferConfirmed field.

## **🔹 Storage Table Recommendation**

**Table Name**: stripe_metadata

Primary Keys:

- stripeSessionId (string, unique)

Indexes:

- clientId

- projectId

- contractId

- paymentStatus

- paidAt

## **📑 Notes**

- This metadata does **not** include sensitive card information. All
  such data is securely handled by Stripe.

- Internal services should query this table to verify project billing
  status and assign the \"Payment Verified\" badge.

- This table is only writable by the checkout microservice and Stripe
  webhooks.
