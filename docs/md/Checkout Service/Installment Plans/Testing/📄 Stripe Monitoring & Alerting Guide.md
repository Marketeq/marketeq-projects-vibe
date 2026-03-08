**📄 Stripe Monitoring & Alerting Guide**

This document defines how to monitor, log, and respond to Stripe-related
activity for the checkout-service. It ensures all mission-critical
payment events are traceable, alertable, and resilient to silent
failures or webhook outages.

### **🔍 1. Core Stripe Events to Monitor**

The following webhook events must be monitored in real-time via alerts,
logs, and retry logic:

  **Event Name**                  **Purpose**
  ------------------------------- ---------------------------------------------------------------
  checkout.session.completed      Used to confirm one-time or installment plan deposit payments
  invoice.paid                    Confirms recurring installment plan payment success
  invoice.payment_failed          Used to trigger retries and grace periods
  customer.subscription.deleted   Subscription manually or automatically cancelled
  payment_intent.succeeded        Used for wallet/gift card top-ups or standalone payments
  charge.refunded                 Tracks partial or full refunds

### **🧠 2. Internal Monitoring Events (Platform-specific)**

Your backend should emit the following platform-specific events to your
internal monitoring/logging system (e.g. Sentry, Datadog, ELK):

  **Event Name**                           **Trigger Source**             **Purpose**
  ---------------------------------------- ------------------------------ ------------------------------------------------------
  payment.verified                         From webhook processing        Confirms verified deposit or successful Stripe event
  subscription.installment.failed          From webhook or retry worker   Tracks failures and sends user notifications
  subscription.installment.grace_expired   Retry logic exhausted          Triggers project pause
  metadata.missing_or_invalid              Stripe webhook processor       Alerts developer that metadata on payment is invalid
  checkout.anomaly_detected                Any service                    Flags suspicious behavior (e.g. double payments)

### **📦 3. Retry Mechanisms**

  ---------------------------------------------------------------------
  **Area**            **Retry Behavior**
  ------------------- -------------------------------------------------
  Stripe Webhooks     Automatically retried by Stripe (up to 3 days)

  Metadata            Retry locally within 3 attempts, then alert
  Verification        

  Invoice Paid        Fallback cron job every 1 hour to validate
  Verification        

  Project Pausing     Triggers after all retries fail (manual override
                      allowed via admin)
  ---------------------------------------------------------------------

### **📫 4. Alerts & Notifications**

  **Event Type**                        **Alert Type**             **Recipients**
  ------------------------------------- -------------------------- ----------------------------------
  Payment failure (final attempt)       Email + Slack alert        DevOps, Accounts Receivable team
  Metadata issue                        Internal dev alert         Engineering
  Unverified payment after 6 hours      PagerDuty or SMS alert     DevOps / Support
  Subscription cancelled unexpectedly   Internal + optional user   Account Manager + Platform Admin

### **🔒 5. Logging & Persistence**

All Stripe events (successful or failed) must be stored in the
payment_events Postgres table:

  ------------------------------------------------------
  **Column Name** **Type**    **Description**
  --------------- ----------- --------------------------
  event_id        UUID        Stripe event ID

  type            string      Stripe event type

  payload         JSONB       Full body of the event

  status          string      processed, error, or
                              pending

  error_details   text        Optional error message

  received_at     timestamp   When it was received from
                              Stripe
  ------------------------------------------------------

> 🧼 Use a job to purge events older than 6 months, or archive them to
> long-term storage.

### **📉 6. Developer Console & Metrics**

Include basic metrics and monitoring views in the internal developer
console:

- Total active Stripe subscriptions

- Retry queue backlog

- Failed events over 24h

- Avg processing latency

- Latest 50 webhook events (success + failure)
