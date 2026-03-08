# **📄 01 - Installment Plans -- Overview & Stripe Integration Flow**

### **🧭 Purpose**

This document provides a high-level overview of how installment plans
work on the Marketeq platform and outlines the end-to-end integration
flow with Stripe. It sets the foundation for the five following
technical documents that break down each implementation detail.\
\
This logic supports installment plan creation and full-scope payments by
passing the total cost and timeline into the Stripe API, allowing
dynamic billing schedules based on user-selected frequency (weekly,
biweekly, monthly).

### **📌 Overview**

Marketeq allows clients to pay for scoped projects or ongoing services
using flexible installment plans. Supported installment frequencies:

- Weekly

- Biweekly

- Monthly

All projects and services are billed **in advance**, meaning the first
installment must be paid upfront as a deposit. This deposit is
**mandatory** and reflects the first payment in the subscription cycle.

### **💡 Key Concepts**

  **Concept**                     **Description**
  ------------------------------- --------------------------------------------------------------------------------------------
  **Deposit**                     First payment of the installment cycle (mandatory), paid at checkout
  **Subscription**                Stripe subscription created at checkout, tied to project or contract
  **Custom Frequency**            User selects frequency (weekly/biweekly/monthly); number of installments is backend-driven
  **Fixed vs. Ongoing Billing**   Projects have fixed durations. Services are ongoing with a start date and no end date
  **Dynamic Pricing**             Prices are calculated by the backend (not Stripe) based on scope, tasks, and user rates

### **🔁 Stripe Integration Flow**

****sequenceDiagram

actor Client

participant Frontend

participant Backend

participant Stripe

Client-\>\>Frontend: Selects Installment Plan (e.g. Weekly)

Frontend-\>\>Backend: Sends checkout request with selected frequency

Backend-\>\>Backend: Calculates total cost, duration, and deposit

Backend-\>\>Stripe: Creates Stripe Subscription with calculated price &
schedule

Stripe\--\>\>Backend: Returns subscription ID and client secret

Backend\--\>\>Frontend: Sends subscription data

Frontend-\>\>Stripe: Initiates payment using client secret

Stripe\--\>\>Frontend: Confirms first payment success

Frontend-\>\>Backend: Confirms payment completed

Backend-\>\>Backend: Marks project/contract as \"Payment Verified\"



### **🧩 Dependencies**

- **Backend Logic**: Handles calculation of duration and pricing based
  on scoped tasks and hourly rates

- **Stripe Subscription API**: Used to manage recurring billing and
  proration

- **Webhook Events**: Used to listen for successful payments, failed
  retries, or cancellations

- **Project Verification Logic**: Tied to successful subscription setup

**💸 Pricing Logic Source**

All pricing used during checkout is dynamically calculated by the
platform and is **not managed by Stripe**. The source of pricing depends
on what type of listing is being purchased:

- **Projects, Services, or Teams:** Pricing is pulled from the
  **Listings Service**, which contains scoped timelines, deliverables,
  and rate-based budgets for each listing type.

- **Individual Talent Hire:** Pricing is pulled directly from the **User
  Service**, where the individual\'s rate and engagement terms are
  stored.
