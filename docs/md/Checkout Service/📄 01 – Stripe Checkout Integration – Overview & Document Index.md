# **📄 01 -- Stripe Checkout Integration -- Overview & Document Index**

### **🧭 Purpose**

This document introduces the Stripe Checkout integration for the
Marketeq platform and outlines the key technical documentation involved
in building the backend microservice responsible for handling payments,
client checkout, and automated status updates.

This microservice manages all Stripe interactions for collecting funds
on the platform, including:

- One-time payments

- Installment plans

- Split payment logic

- Gift cards and wallet usage

- Payment verification and metadata processing

All payment activity is routed through Stripe and deposited into the
Marketeq Stripe account. Contractors are not paid directly during
checkout. Instead, funds are held and later disbursed through a separate
earnings and payout microservice.

### **⚙️ Microservice Name**

**checkout-service**

This microservice is strictly focused on handling client-side payment
processing and all logic related to payment initiation, verification,
status updates, and metadata management.

A separate **billing-service** (or **transactions-service**) may be
introduced later for invoice management, taxes, PDF generation, and
financial reporting.

### **🔐 Stripe Responsibilities vs Platform Logic**

Stripe handles:

- Payment authentication and tokenization

- Recurring subscription setup

- Security and fraud protection

- Invoicing and webhooks (raw data)

Marketeq handles:

- Payment-triggered status updates (project and contract)

- Custom credit balance logic

- Internal tracking of gift cards and wallet top-ups

- Metadata management and developer-facing JSON schema

- Notification dispatch via the notification-service

A successful Stripe payment grants the user a **Payment Verified**
badge. This badge applies to both project and contract verification,
depending on what the payment is associated with. Not all payments are
tied to a project; some relate to team hires or individual contract
agreements.

### **📘 Document Index**

  **\#**   **Title**                                                           **Purpose**
  -------- ------------------------------------------------------------------- ----------------------------------------------------------------------------------------------
  01       **Stripe Checkout Integration -- Overview & Document Index**        This document. High-level guide and index of all documentation
  02       **Stripe Checkout -- Data Dictionary**                              Master list of all frontend + backend fields organized by screen
  03       **Stripe Checkout -- API Specification & Endpoints**                Backend DTOs, endpoint structure, and Stripe API integration logic
  04       **Stripe Checkout -- Metadata Mapping & Storage Strategy**          How metadata is structured, stored, and used across Stripe and Postgres
  05       **Stripe Checkout -- Webhook Events & Payment Status Updates**      Handles status changes like payment success, failure, retries, and Stripe subscription flow
  06       **Stripe Checkout -- Payment Verification Logic**                   How the platform verifies project and contract status, and assigns payment badges
  07       **Stripe Checkout -- Gift Cards & Wallet Balance Rules**            Application of gift cards, wallet top-ups, and platform credit logic
  08       **Stripe Checkout -- Payment Method Support (Credit, ACH, Wire)**   Supported methods and platform logic for processing different payment options
  09       **Stripe Checkout -- Split Payments**                               Logic for combining multiple payment methods during a single checkout (e.g., card + wallet)
  10       **Stripe Checkout -- Installment Plans**                            Logic for scheduling recurring payments using Stripe Subscriptions (e.g., weekly or monthly)
  11       **Stripe Checkout -- Failure Handling, Retry & Grace Periods**      Retry logic for failed subscriptions, badge revocation, and Stripe settings
  12       **Stripe Checkout -- Wire Transfer Handling & Manual Approval**     Manual confirmation and UI flagging for wire-based checkout flows
  13       **Stripe Checkout -- Stripe Metadata Reference**                    Final list of metadata keys sent to Stripe per payment or subscription
