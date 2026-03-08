**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 00 --- Service Overview & Repo Placement**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 00

  Series             transaction-service Doc 00 -- Doc 07

  Status             Active

  Owner              Backend Engineering

  Repo               marketeq-projects-nestjs

  Folder Path        /apps/transaction-service/src

  Last Updated       2025
  -----------------------------------------------------------------------

# **1. Purpose**

transaction-service is the immutable financial ledger for the Marketeq
platform. It is the single source of truth for every financial event
that occurs on the platform, regardless of direction, user type,
contract type, or payment method.

This service does not initiate payments. It does not process charges. It
does not manage subscriptions. Its sole responsibility is to receive
financial events from other services, record them as permanent ledger
entries, and serve that data back to the UI and to other services that
need to read financial history.

> *Note: transaction-service is a read-optimized ledger. All writes
> originate from events published by billing-service, payout-service,
> and time-tracking-service. No user or admin directly writes to this
> service.*

# **2. Responsibilities**

## **2.1 Core Responsibilities**

- Record all inbound financial events as immutable ledger entries

- Serve paginated, filterable, searchable transaction lists to the
  client-facing Transactions screen

- Serve paginated, filterable invoice lists to the client-facing
  Invoices tab

- Serve individual transaction detail records to the Transaction Detail
  modal

- Serve invoice detail references via Stripe hosted invoice integration

- Support CSV and PDF export of transaction and invoice data

- Accept and record problem reports submitted against individual
  transactions

- Publish a context payload to the invitations-service share/invite
  modal when a transaction or invoice is shared

- Maintain a backend audit log of all views, exports, and problem
  reports

## **2.2 Out of Scope**

- Initiating or processing payments --- owned by billing-service

- Managing payment methods --- owned by billing-service

- Subscription and plan management --- owned by billing-service

- Talent earnings calculation --- triggered by time-tracking-service,
  recorded here

- Talent payout scheduling and execution --- owned by payout-service

- Account balance display --- owned by a future balance-service

- Scheduled transaction cancellation --- owned by billing-service

- Ticketing system integration for problem reports --- separate epic

- Admin multi-account panel --- future sprint

- Crypto transactions --- future sprint

# **3. Where transaction-service Fits in the Platform**

The Marketeq platform is a NestJS microservices monorepo.
transaction-service sits at the center of the financial data layer. It
does not sit in the request path for payments --- it only observes and
records completed financial events via RabbitMQ message queues.

## **3.1 Architecture Position**

  ----------------------------------------------------------------------------
  **Layer**       **Service**             **Role**
  --------------- ----------------------- ------------------------------------
  Frontend        Next.js (Vercel)        Calls transaction-service API for
                                          transactions and invoices screens

  API Gateway     api-gateway             Routes authenticated requests from
                                          frontend to transaction-service

  Financial       transaction-service     THIS SERVICE --- immutable record of
  Ledger                                  all financial events

  Payment         billing-service         Processes charges, generates
  Orchestration                           invoices, manages subscriptions ---
                                          publishes events to
                                          transaction-service

  Talent Payouts  payout-service          Manages talent direct deposit
                                          schedules --- publishes events to
                                          transaction-service

  Time Tracking   time-tracking-service   Ingests tracked hours --- publishes
                                          earning events to
                                          transaction-service

  Realtime        Ably                    Pushes live transaction status
                                          updates to frontend

  Payments        Stripe                  Processes card/ACH payments;
  Processor                               generates hosted invoices

  Accounting      QuickBooks              Invoice reconciliation and wire
                                          transfer verification

  Share/Invite    invitations-service     Handles share modal when user shares
                                          a transaction or invoice
  ----------------------------------------------------------------------------

## **3.2 Money Flow Overview**

Understanding the money flow is essential before working on this
service. The flow is as follows:

- Client accepts a contract on the platform

- billing-service generates an invoice and schedules the first payment
  via Stripe

- Client pays via Stripe (card, ACH, or wire) --- funds go to the
  platform, not directly to the contractor

- billing-service publishes a payment_completed event to RabbitMQ

- transaction-service consumes the event and writes an immutable
  transaction record to the ledger

- The transaction appears on the client-facing Transactions screen
  immediately

- time-tracking-service tracks contractor hours against the pre-funded
  contract balance

- As hours are tracked, time-tracking-service publishes earning_credited
  events

- transaction-service records the earning as a ledger credit for the
  contractor

- Contractor initiates a payout via payout-service on their own schedule

- payout-service publishes a payout_completed event

- transaction-service records the payout as a ledger debit against the
  contractor balance

> *Note: The client never pays the contractor directly. All payments go
> to the platform. Contractor earnings accrue based on tracked hours
> against a pre-funded balance. Payouts to the contractor bank account
> are entirely separate from client payment events.*

# **4. Who Uses This Service**

  -------------------------------------------------------------------------
  **User Type** **Screen**         **Access Level** **Notes**
  ------------- ------------------ ---------------- -----------------------
  Client        Transactions &     Account owner    Sees outgoing payments,
                Invoices           only (current    invoices, refunds, fees
                                   sprint)          

  Talent /      Earnings & Payouts Account owner    Sees incoming earnings
  Contractor    (future sprint)    only             and payout history ---
                                                    separate screen, same
                                                    service

  Admin         Client account     Login as user    No separate admin UI in
                view               (current)        this sprint --- admins
                                                    log into user accounts
                                                    to view data

  Accountant    Transactions       Billing          Will be granted
  (future)      export             sub-permission   export-only access when
                                   (future sprint)  permissions system is
                                                    built
  -------------------------------------------------------------------------

> *Note: The Transactions & Invoices screen is client-facing only.
> Talent has a completely separate Earnings & Payouts screen which will
> be documented in a future sprint. Both screens read from
> transaction-service but are filtered by user type and transaction
> direction.*

# **5. Service Dependencies**

## **5.1 Upstream Dependencies (Services that publish events transaction-service consumes)**

  -------------------------------------------------------------------------------------
  **Service**             **Event Consumed**        **Description**
  ----------------------- ------------------------- -----------------------------------
  billing-service         payment_completed         Client payment processed
                                                    successfully --- creates
                                                    transaction record

  billing-service         payment_failed            Client payment failed --- updates
                                                    transaction status

  billing-service         refund_issued             Refund processed --- creates refund
                                                    transaction record with
                                                    parent_transaction_id reference

  billing-service         invoice_generated         New invoice created --- creates
                                                    invoice record

  billing-service         invoice_status_updated    Invoice status changed --- updates
                                                    invoice record

  billing-service         subscription_charged      Recurring subscription billed ---
                                                    creates membership transaction
                                                    record

  billing-service         wire_transfer_confirmed   Wire transfer confirmed via
                                                    Airtable integration in checkout
                                                    service --- creates wire
                                                    transaction record

  time-tracking-service   earning_credited          Contractor tracked hours against
                                                    funded balance --- creates earning
                                                    ledger entry

  payout-service          payout_initiated          Contractor initiated payout ---
                                                    creates payout pending record

  payout-service          payout_completed          Payout sent to contractor bank ---
                                                    updates payout record to completed

  payout-service          payout_failed             Payout to contractor bank failed
                                                    --- updates payout record to failed
  -------------------------------------------------------------------------------------

## **5.2 Downstream Dependencies (Services transaction-service calls or publishes to)**

  -------------------------------------------------------------------------------------------
  **Service**           **Interaction**                   **Description**
  --------------------- --------------------------------- -----------------------------------
  Stripe                GET                               Retrieves Stripe-hosted invoice URL
                        /v1/invoices/:stripe_invoice_id   and PDF URL for invoice detail
                                                          modal

  Ably                  Publish to channel                Publishes real-time transaction
                                                          status updates to frontend when
                                                          status changes

  invitations-service   Event / context payload           Passes shareable item context
                                                          (transaction or invoice summary) to
                                                          the share/invite modal

  api-gateway           Inbound routing                   All frontend requests arrive via
                                                          api-gateway with bearer token auth
  -------------------------------------------------------------------------------------------

## **5.3 Infrastructure Dependencies**

  -----------------------------------------------------------------------
  **Dependency**     **Purpose**                          **Required**
  ------------------ ------------------------------------ ---------------
  PostgreSQL         Primary database --- all transaction YES
  (Supabase)         and invoice records                  

  RabbitMQ           Message queue --- consumes events    YES
                     from upstream services               

  Redis              Query result caching for transaction YES
                     list endpoints                       

  Ably               Real-time status push to frontend    YES

  Stripe API         Hosted invoice retrieval             YES
  -----------------------------------------------------------------------

# **6. Data & Retention Policy**

- Transaction history is retained indefinitely. There is no maximum
  lookback limit.

- All transaction records are immutable once status reaches paid,
  succeeded, or refunded.

- Corrections are handled via new ledger_correction transaction entries
  only. Original records are never edited.

- A parent_transaction_id foreign key links refund and correction
  records back to their originating transaction.

- A backend audit log records all views, exports, and problem report
  submissions.

# **7. Folder Placement & Repo Structure**

Per the Marketeq monorepo Folder Structure Policy, all code for this
service must live under:

> /apps/transaction-service/src

The canonical folder layout for this service is:

> apps/transaction-service/
>
> ├── Dockerfile
>
> ├── Supabase.yaml
>
> ├── package.json
>
> └── src/
>
> ├── app.module.ts
>
> ├── main.ts
>
> ├── controllers/
>
> │ ├── transaction.controller.ts
>
> │ ├── invoice.controller.ts
>
> │ └── export.controller.ts
>
> ├── services/
>
> │ ├── transaction.service.ts
>
> │ ├── invoice.service.ts
>
> │ ├── export.service.ts
>
> │ ├── audit.service.ts
>
> │ └── share.service.ts
>
> ├── consumers/
>
> │ ├── billing.consumer.ts
>
> │ ├── timetracking.consumer.ts
>
> │ └── payout.consumer.ts
>
> ├── dto/
>
> │ ├── transaction.dto.ts
>
> │ ├── invoice.dto.ts
>
> │ ├── filter.dto.ts
>
> │ └── export.dto.ts
>
> ├── entities/
>
> │ ├── transaction.entity.ts
>
> │ ├── invoice.entity.ts
>
> │ ├── transaction-detail.entity.ts
>
> │ ├── payment-method.entity.ts
>
> │ └── contract.entity.ts
>
> └── config/
>
> └── transaction.config.ts
>
> *Note: Never create or use a /src directory at the repo root. Never
> import from one service\'s src/ into another service. Shared types and
> utilities belong in /shared.*

# **8. Document Series --- transaction-service**

This document is Doc 00 in the transaction-service documentation series.
The complete series is listed below. Each document covers exactly one
topic. Do not duplicate content between documents --- link to earlier
docs instead.

  ---------------------------------------------------------------------------
  **Doc     **Title**             **Status**   **Covers**
  \#**                                         
  --------- --------------------- ------------ ------------------------------
  Doc 00    Service Overview &    This         Purpose, architecture
            Repo Placement        document     position, dependencies, folder
                                               structure

  Doc 01    Docker & Runtime      Next         Dockerfile, environment
            Setup                              variables, health check,
                                               Supabase deployment

  Doc 02    Folder Structure &    Upcoming     app.module.ts, main.ts, module
            Bootstrapping                      wiring, configuration loading

  Doc 03    Data Models & DTOs    Upcoming     All entities, enums,
                                               constraints, DTOs,
                                               class-validator rules

  Doc 04    API Endpoints         Upcoming     All routes, guards,
                                               request/response schemas,
                                               pagination, error shapes

  Doc 05    Integrations & Events Upcoming     RabbitMQ consumers, Stripe
                                               invoice retrieval, Ably
                                               realtime, Redis cache,
                                               invitations-service share
                                               context

  Doc 06    Observability &       Upcoming     /health, /ready, logging,
            Health                             metrics, alerts, SLOs

  Doc 07    QA & Test Data        Upcoming     Test cases, seed scripts,
                                               fixtures, Postman collection
  ---------------------------------------------------------------------------

> *Note: When new functionality is added to this service, create the
> next numbered doc (e.g., Doc 08) rather than expanding existing
> documents.*

# **9. Quick Reference**

  -----------------------------------------------------------------------
  **Item**               **Value**
  ---------------------- ------------------------------------------------
  Service Name           transaction-service

  Repo                   marketeq-projects-nestjs

  Folder                 /apps/transaction-service/src

  Primary DB             PostgreSQL on Supabase

  Message Queue          RabbitMQ

  Cache                  Redis

  Realtime               Ably

  External API           Stripe (invoice retrieval only)

  Auth                   Bearer token via api-gateway

  Health Endpoint        GET /health

  API Prefix             /v1/transactions, /v1/invoices

  User Scope             Client-facing (this sprint); Talent-facing
                         (future Earnings & Payouts sprint)

  Data Retention         Unlimited --- no retention boundary

  Immutability Rule      Records locked after status: paid, succeeded,
                         refunded

  Next Document          Doc 01 --- Docker & Runtime Setup
  -----------------------------------------------------------------------
