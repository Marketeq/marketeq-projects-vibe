# **📄 13 -- Stripe Checkout -- Stripe Metadata Reference**

### **🧭 Purpose**

This document provides a complete reference for all metadata fields
passed to Stripe during the Marketeq Checkout process. It outlines how
metadata is structured, where it is stored, and how it is used for
billing, project tracking, payment verification, reporting, and Stripe
dashboard clarity.

## **🧩 Overview**

- Metadata is passed with all Stripe objects: **Payment Intents**,
  **Checkout Sessions**, **Invoices**, **Subscriptions**, and
  **Transfers**.

- Metadata ensures traceability between Stripe and Marketeq's internal
  microservices.

- All metadata values must be serializable as string key-value pairs.

## **📥 Metadata Fields Sent to Stripe**

  **Field Key**          **Applies To**                         **Description**
  ---------------------- -------------------------------------- ------------------------------------------------------------------
  project_id             PaymentIntent, Invoice, Subscription   Internal project ID tied to this payment
  contract_id            PaymentIntent, Invoice                 Optional -- contract ID if not linked to a specific project
  client_id              All                                    ID of the client account
  team_id                PaymentIntent                          If payment is for a team contract
  payment_type           All                                    deposit, installment, full, split, gift_card, wallet, etc.
  payment_frequency      Subscription                           weekly, monthly, quarterly, etc. (used for installment plans)
  checkout_method        All                                    Method used: card, apple_pay, google_pay, klarna, ach, wire
  gift_card_amount       PaymentIntent                          Amount applied via gift card (if applicable)
  wallet_balance_used    PaymentIntent                          Amount deducted from wallet balance
  installment_number     Invoice                                If part of subscription, the sequence number of this installment
  is_final_payment       PaymentIntent, Invoice                 Boolean to flag final installment (if applicable)
  campaign_id            PaymentIntent                          Optional -- used if checkout triggered from promo campaign
  checkout_id            All                                    Internal reference to checkout session
  invoice_id             Invoice                                Internal ID for correlating with invoice microservice
  created_by_user_id     All                                    Admin ID or user ID who initiated the checkout
  platform_fee_percent   Transfer                               Stored to calculate fees taken by Marketeq

## **🗄️ Storage & Access**

- Metadata is automatically copied from the original Checkout Session to
  subsequent Invoices and Payment Intents via Stripe.

- Marketeq backend stores a copy of metadata in:

  - checkout-session DB table

  - invoice-records DB table

  - project-payments DB table

## **🧠 Developer Notes**

- All metadata keys must follow Stripe's limitations: alphanumeric,
  lowercase, and under 40 characters.

- Avoid sensitive data in metadata. Never include PII or card data.

- Use metadata to simplify Stripe dashboard filtering and internal
  reconciliation.

- For custom logic (e.g. verification badges, project flags), rely on
  metadata keys instead of parsing full objects.

## **🔗 Related Docs**

- 01 -- Overview & Architecture

- 07 -- Webhook Events

- 09 -- Payment Verification Logic

- 10 -- Installment Plans

- 11 -- Failure Handling & Grace Periods

- 14 -- Wallet & Credit Balance Rules
