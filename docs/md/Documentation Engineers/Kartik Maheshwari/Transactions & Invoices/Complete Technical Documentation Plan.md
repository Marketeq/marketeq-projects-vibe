# **Complete Technical Documentation Plan**

## **Transactions & Invoices Feature --- Microservices Build**

## **PART 1: transaction-service**

### **Doc 00 --- Service Overview & Repo Placement**

- Purpose and responsibilities

- Where it fits in the platform architecture

- Dependencies on billing-service, payout-service, time-tracking-service

- Folder placement: /apps/transaction-service/src

- Links to all subsequent docs in series

### **Doc 01 --- Docker & Runtime Setup**

- Dockerfile for transaction-service

- Environment variables (DATABASE_URL, PORT, JWT_SECRET, RABBITMQ_URL,
  REDIS_URL, ABLY_API_KEY)

- Health check endpoint /health

- Render/Supabase deployment notes

- Local dev startup instructions

### **Doc 02 --- Folder Structure & Bootstrapping**

- app.module.ts and main.ts setup

- Module wiring (TransactionModule, InvoiceModule, ExportModule)

- Configuration loading

- Database connection setup

### **Doc 03 --- Data Models & DTOs**

- Full PostgreSQL schema for all five tables from the data dictionary:
  transactions, invoices, transaction_detail, payment_methods, contracts

- All enums: transaction type, transaction status, invoice status,
  payment method type, contract type, billing frequency, membership tier

- All constraints, CHECK constraints, foreign keys

- TypeScript entity definitions

- DTOs for create, update, query operations

- class-validator rules mapped directly from error messages document

- Serialization rules (class-transformer)

### **Doc 04 --- API Endpoints**

- GET /v1/transactions --- paginated, filterable, searchable list

- GET /v1/transactions/:id --- single transaction detail

- GET /v1/transactions/:id/receipt --- download receipt PDF

- GET /v1/invoices --- paginated, filterable invoice list

- GET /v1/invoices/:id --- single invoice detail

- POST /v1/transactions/export --- trigger CSV or PDF export

- POST /v1/transactions/:id/report --- submit report a problem

- Full request/response schemas for each endpoint

- Auth guards (bearer token)

- Query parameter specs for all filters: date range, type, contract,
  payment method, status, search term, page, per-page

- All error response shapes mapped from error messages document

- Pagination response envelope

### **Doc 05 --- Integrations & Events**

- RabbitMQ events consumed from billing-service (payment completed,
  refund issued, invoice generated, subscription charged)

- RabbitMQ events consumed from time-tracking-service (hours logged →
  earning credited)

- RabbitMQ events consumed from payout-service (payout initiated, payout
  completed)

- Events published by transaction-service (transaction created,
  transaction status updated)

- Ably integration for real-time transaction status updates to frontend

- Redis caching strategy (cache keys, TTL for transaction list queries)

- QuickBooks reconciliation event handling

- Event sequence diagrams for each money flow

### **Doc 06 --- Observability & Health**

- /health and /ready endpoint specs

- Logging strategy (what gets logged per transaction event)

- Key metrics to monitor (transaction failure rate, processing time,
  export queue depth)

- Alert thresholds

- SLO definitions for transaction processing

### **Doc 07 --- QA & Test Data**

- Full test case list mapped from acceptance criteria and edge cases
  document

- Test cases for all 37 error states from error messages document

- Seed scripts for all transaction types

- Seed scripts for all status states

- Fixtures for filter combinations

- Postman / REST Client collection for all endpoints

- Load test spec for export endpoint

## **PART 2: billing-service**

### **Doc 00 --- Service Overview & Repo Placement**

- Purpose and responsibilities

- Relationship to transaction-service, payout-service, Stripe,
  QuickBooks

- Folder placement: /apps/billing-service/src

### **Doc 01 --- Docker & Runtime Setup**

- Dockerfile

- Environment variables (STRIPE_SECRET_KEY, QUICKBOOKS_CLIENT_ID,
  QUICKBOOKS_SECRET, DATABASE_URL, PORT, RABBITMQ_URL, REDIS_URL)

- Health check, deployment notes

### **Doc 02 --- Folder Structure & Bootstrapping**

- Module wiring (BillingModule, SubscriptionModule, InvoiceModule,
  WebhookModule)

- Configuration loading

### **Doc 03 --- Data Models & DTOs**

- Subscription entity (client and talent, all tiers: basic, pro,
  enterprise, agency)

- Billing frequency entity (daily, weekly, monthly, quarterly, annual)

- Payment schedule entity (installment tracking)

- Invoice generation entity

- Wire transfer fee entity

- DTOs and validators for each

### **Doc 04 --- API Endpoints**

- POST /v1/billing/invoices --- generate invoice

- GET /v1/billing/invoices/:id --- retrieve invoice

- POST /v1/billing/subscriptions --- create subscription

- PUT /v1/billing/subscriptions/:id --- update subscription

- DELETE /v1/billing/subscriptions/:id --- cancel subscription

- GET /v1/billing/subscriptions/:id --- get subscription details

- POST /v1/billing/payment-methods --- add payment method

- DELETE /v1/billing/payment-methods/:id --- remove payment method

- GET /v1/billing/payment-methods --- list payment methods

- Full request/response schemas, auth guards, error shapes

### **Doc 05 --- Integrations & Events**

- Stripe integration (charges, ACH, installments, subscriptions,
  refunds, webhooks)

- QuickBooks integration (invoice reconciliation, wire verification)

- Events published to transaction-service (payment completed, refund
  issued, fee charged, subscription billed)

- Stripe webhook handler specs (payment_intent.succeeded,
  payment_intent.failed, invoice.paid, customer.subscription.updated,
  etc.)

- Sequence diagrams for client payment flow, subscription billing flow,
  refund flow

### **Doc 06 --- Observability & Health**

- Health and readiness checks including Stripe and QuickBooks
  connectivity

- Payment failure rate monitoring

- Webhook processing success rate

- Retry logic for failed webhook processing

### **Doc 07 --- QA & Test Data**

- Stripe test card numbers and ACH test accounts

- Subscription lifecycle test cases

- Invoice generation test cases

- Webhook simulation test cases

- Refund flow test cases

## **PART 3: payout-service**

### **Doc 00 --- Service Overview & Repo Placement**

- Purpose and responsibilities

- Relationship to transaction-service, billing-service,
  time-tracking-service

- Folder placement: /apps/payout-service/src

### **Doc 01 --- Docker & Runtime Setup**

- Dockerfile

- Environment variables (STRIPE_SECRET_KEY for Stripe Connect,
  DATABASE_URL, PORT, RABBITMQ_URL)

- Health check, deployment notes

### **Doc 02 --- Folder Structure & Bootstrapping**

- Module wiring (PayoutModule, DirectDepositModule, BalanceModule)

### **Doc 03 --- Data Models & DTOs**

- Payout entity

- Direct deposit schedule entity (frequency, next payout date, bank
  account reference)

- Payout method entity (bank account: routing/account numbers; future:
  crypto wallet)

- Available balance calculation model

- DTOs and validators

### **Doc 04 --- API Endpoints**

- GET /v1/payouts --- talent payout history

- POST /v1/payouts --- initiate manual payout

- GET /v1/payouts/balance --- available balance for talent

- POST /v1/payouts/schedule --- set direct deposit schedule

- GET /v1/payouts/schedule --- get current schedule

- PUT /v1/payouts/schedule --- update schedule

- POST /v1/payouts/methods --- add payout method (bank account)

- DELETE /v1/payouts/methods/:id --- remove payout method

- Full request/response schemas, auth guards, error shapes

### **Doc 05 --- Integrations & Events**

- Stripe Connect integration for ACH payouts to talent bank accounts

- Events consumed from transaction-service (earning credited, balance
  updated)

- Events published to transaction-service (payout initiated, payout
  completed, payout failed)

- Direct deposit scheduler (cron job specs, frequency handling)

- Sequence diagram for full talent payout flow

### **Doc 06 --- Observability & Health**

- Payout failure rate monitoring

- Direct deposit schedule execution success rate

- Balance discrepancy alerts

### **Doc 07 --- QA & Test Data**

- Direct deposit schedule test cases (all frequency types)

- Payout initiation test cases

- Balance calculation test cases

- Stripe Connect test account setup instructions

## **PART 4: Frontend Integration**

### **Doc FE-01 --- API Integration Guide**

- Base URL and auth header setup

- All transaction-service endpoints consumed by the UI

- Request/response type definitions (TypeScript interfaces matching
  backend DTOs)

- Filter query parameter construction for all five filter types

- Pagination implementation (page, per-page, total count handling)

- Search debounce implementation spec (minimum characters, debounce
  delay)

### **Doc FE-02 --- State Management**

- Transaction list state shape

- Invoice list state shape

- Active filter state shape

- Transaction detail modal state

- Export state (idle, loading, success, error)

- Filter persistence rules (session only, resets on logout)

### **Doc FE-03 --- Real-Time Updates**

- Ably channel subscription for live transaction status updates

- How Processing → Paid status transitions update the UI without page
  refresh

- Reconnection handling if Ably connection drops

### **Doc FE-04 --- Error State Implementation**

- All 37 error states from the error messages document mapped to UI
  components

- Toast notification implementation (success, warning, error)

- Empty state component specs

- Skeleton loading state specs

- Disabled state specs (export button, download receipt button)

### **Doc FE-05 --- Export Implementation**

- CSV export trigger and download handling

- PDF export trigger and download handling

- Async export flow (large datasets) --- polling or Ably notification
  when ready

- File naming convention implementation

## **PART 5: Database**

### **Doc DB-01 --- Schema Setup**

- Full PostgreSQL DDL for all five tables

- All ENUM type definitions

- All CHECK constraints

- All foreign key relationships

- All indexes (recommended: status, date, contract_id, user_id)

- Migration scripts

### **Doc DB-02 --- Query Patterns**

- Filtered transaction list query (all filter combinations)

- Search query implementation (full-text search across relevant fields)

- Pagination query pattern

- Balance calculation query for transaction-service

- Invoice status auto-escalation to overdue query (for scheduled job)

### **Doc DB-03 --- Immutability & Audit Rules**

- Immutability enforcement rules (no updates after
  paid/succeeded/refunded)

- Ledger correction pattern (new record only, never edit)

- Audit log table spec for views, exports, and problem reports

- Data retention policy implementation

## **PART 6: Monitoring & Observability**

### **Doc OPS-01 --- Monitoring Setup**

- Key metrics for all three services

- Transaction failure rate thresholds and alerts

- Export queue depth monitoring

- Stripe webhook processing success rate

- Payout failure rate alerts

- Database query performance monitoring

### **Doc OPS-02 --- Logging Standards**

- What gets logged per event across all three services

- Log format standards (structured JSON logging)

- Sensitive field masking rules (no full account numbers, no PII in
  logs)

- Log retention policy

## **PART 7: QA & Testing Master Plan**

### **Doc QA-01 --- Test Case Master List**

- All acceptance criteria test cases from the original requirements

- All 29 edge case scenarios from the backlog extensions document

- All 37 error state test cases

- All 39 open product questions that were resolved --- verify each
  answer is implemented correctly

### **Doc QA-02 --- Integration Test Plan**

- End-to-end flow: client payment → transaction record created → appears
  in UI

- End-to-end flow: refund issued → new transaction record → original
  unchanged

- End-to-end flow: invoice generated → invoice appears in invoices tab

- End-to-end flow: export triggered → file downloaded with correct data

- Filter combination matrix testing

### **Doc QA-03 --- Performance Test Plan**

- Load test: transaction list with 10,000+ records

- Load test: export with 10,000+ records (async flow)

- Search performance under load

- Pagination performance at deep page numbers

## **PART 8: User-Facing Documentation**

### **Doc UX-01 --- How to Use Transactions & Invoices**

- How to filter transactions by date, type, contract, and payment method

- How to search for a specific transaction

- How to view transaction details

- How to download a receipt

- How to export transactions

- How to report a problem on a transaction

- Understanding transaction statuses (user-friendly definitions)

- Understanding invoice statuses

## **Full Document Count Summary**

  ------------------------------------------------
  **Section**                      **Documents**
  -------------------------------- ---------------
  transaction-service              8

  billing-service                  8

  payout-service                   8

  Frontend Integration             5

  Database                         3

  Monitoring & Observability       2

  QA & Testing                     3

  User-Facing Documentation        1

  **Total**                        **38
                                   documents**
  ------------------------------------------------
