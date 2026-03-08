**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 03 --- Data Models & DTOs**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 03

  Prerequisites      Doc 00, Doc 01, Doc 02

  ORM                TypeORM 0.3.x

  Database           PostgreSQL 15 on Supabase

  Schema             transaction_service

  Tables             transactions, invoices, transaction_detail,
                     payment_methods, contracts

  Validation         class-validator + class-transformer

  Immutability Rule  Records locked after status: paid, succeeded,
                     refunded
  -----------------------------------------------------------------------

# **1. Purpose**

This document defines the complete data layer for transaction-service.
It covers all PostgreSQL enum types, all five table schemas with
constraints and foreign keys, TypeORM entity classes, the full migration
script, DTOs for every API operation, class-validator rules mapped
directly from the error messages specification, and class-transformer
serialization rules.

The schemas defined here are the single source of truth for the database
structure. All API endpoint documentation in Doc 04 and all integration
logic in Doc 05 depend on these definitions. Do not modify table
structures or enum values without creating a new migration file.

+-----------------------------------------------------------------------+
| **Immutability Rule**                                                 |
|                                                                       |
| Transaction records become immutable once their status reaches paid,  |
| succeeded, or refunded. This is enforced at the application layer in  |
| TransactionService. Corrections to paid transactions must be handled  |
| by creating a new ledger_correction transaction entry --- never by    |
| updating the original record.                                         |
+=======================================================================+

# **2. PostgreSQL Enum Types**

All enum types are defined at the database level in the
transaction_service schema. TypeORM maps these to TypeScript enums in
the entity layer. Run the enum creation SQL before running the table
migration.

## **2.1 Transaction Type Enum**

+-----------------------------------------------------------------------+
| **transaction_type_enum**                                             |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.transaction_type_enum AS ENUM (       |
|                                                                       |
| \'daily_installment\',                                                |
|                                                                       |
| \'weekly_installment\',                                               |
|                                                                       |
| \'monthly_installment\',                                              |
|                                                                       |
| \'quarterly_installment\',                                            |
|                                                                       |
| \'annual_installment\',                                               |
|                                                                       |
| \'hourly_payment\',                                                   |
|                                                                       |
| \'final_payment\',                                                    |
|                                                                       |
| \'paid_in_full\',                                                     |
|                                                                       |
| \'refund_issued\',                                                    |
|                                                                       |
| \'credit_applied\',                                                   |
|                                                                       |
| \'deposit\',                                                          |
|                                                                       |
| \'wire_transfer_fee\',                                                |
|                                                                       |
| \'purchase\',                                                         |
|                                                                       |
| \'basic_membership\',                                                 |
|                                                                       |
| \'pro_membership\',                                                   |
|                                                                       |
| \'enterprise_membership\',                                            |
|                                                                       |
| \'ledger_correction\',                                                |
|                                                                       |
| \'case\',                                                             |
|                                                                       |
| \'project_payment\'                                                   |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.2 Transaction Status Enum**

+-----------------------------------------------------------------------+
| **transaction_status_enum**                                           |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.transaction_status_enum AS ENUM (     |
|                                                                       |
| \'paid\',                                                             |
|                                                                       |
| \'processing\',                                                       |
|                                                                       |
| \'scheduled\',                                                        |
|                                                                       |
| \'payment_pending\',                                                  |
|                                                                       |
| \'failed\',                                                           |
|                                                                       |
| \'overdue\',                                                          |
|                                                                       |
| \'succeeded\',                                                        |
|                                                                       |
| \'credited\',                                                         |
|                                                                       |
| \'refunded\',                                                         |
|                                                                       |
| \'pending\',                                                          |
|                                                                       |
| \'partially_refunded\',                                               |
|                                                                       |
| \'cancelled\',                                                        |
|                                                                       |
| \'in_dispute\'                                                        |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.3 Invoice Status Enum**

+-----------------------------------------------------------------------+
| **invoice_status_enum**                                               |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.invoice_status_enum AS ENUM (         |
|                                                                       |
| \'paid\',                                                             |
|                                                                       |
| \'processing\',                                                       |
|                                                                       |
| \'scheduled\',                                                        |
|                                                                       |
| \'payment_pending\',                                                  |
|                                                                       |
| \'failed\',                                                           |
|                                                                       |
| \'overdue\',                                                          |
|                                                                       |
| \'partially_paid\'                                                    |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.4 Payment Method Type Enum**

+-----------------------------------------------------------------------+
| **payment_method_type_enum**                                          |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.payment_method_type_enum AS ENUM (    |
|                                                                       |
| \'bank_ach\',                                                         |
|                                                                       |
| \'credit_card\',                                                      |
|                                                                       |
| \'klarna\',                                                           |
|                                                                       |
| \'google_pay\',                                                       |
|                                                                       |
| \'apple_pay\'                                                         |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.5 Contract Type Enum**

+-----------------------------------------------------------------------+
| **contract_type_enum**                                                |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.contract_type_enum AS ENUM (          |
|                                                                       |
| \'project\',                                                          |
|                                                                       |
| \'service\',                                                          |
|                                                                       |
| \'team\',                                                             |
|                                                                       |
| \'individual\'                                                        |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.6 Billing Frequency Enum**

+-----------------------------------------------------------------------+
| **billing_frequency_enum**                                            |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.billing_frequency_enum AS ENUM (      |
|                                                                       |
| \'daily\',                                                            |
|                                                                       |
| \'weekly\',                                                           |
|                                                                       |
| \'biweekly\',                                                         |
|                                                                       |
| \'monthly\',                                                          |
|                                                                       |
| \'quarterly\',                                                        |
|                                                                       |
| \'annual\'                                                            |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.7 Membership Tier Enum**

+-----------------------------------------------------------------------+
| **membership_tier_enum**                                              |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.membership_tier_enum AS ENUM (        |
|                                                                       |
| \'basic\',                                                            |
|                                                                       |
| \'pro\',                                                              |
|                                                                       |
| \'enterprise\',                                                       |
|                                                                       |
| \'agency\'                                                            |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **2.8 Amount Direction Enum**

+-----------------------------------------------------------------------+
| **amount_direction_enum**                                             |
+-----------------------------------------------------------------------+
| CREATE TYPE transaction_service.amount_direction_enum AS ENUM (       |
|                                                                       |
| \'debit\',                                                            |
|                                                                       |
| \'credit\'                                                            |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **3. Table Schemas & Constraints**

Run all enum creation statements from Section 2 before running the table
schemas below. Tables must be created in the order shown --- contracts
and payment_methods first, then transactions, then invoices, then
transaction_detail.

## **3.1 contracts**

+-----------------------------------------------------------------------+
| **contracts table**                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE transaction_service.contracts (                          |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| type transaction_service.contract_type_enum NOT NULL,                 |
|                                                                       |
| client_name VARCHAR(100) NOT NULL,                                    |
|                                                                       |
| client_username VARCHAR(100) NOT NULL,                                |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| CONSTRAINT contracts_client_username_unique UNIQUE (client_username)  |
|                                                                       |
| );                                                                    |
|                                                                       |
| \-- Index for contract filter dropdown lookups                        |
|                                                                       |
| CREATE INDEX idx_contracts_type ON transaction_service.contracts      |
| (type);                                                               |
|                                                                       |
| CREATE INDEX idx_contracts_client_username ON                         |
| transaction_service.contracts (client_username);                      |
+=======================================================================+

## **3.2 payment_methods**

+-----------------------------------------------------------------------+
| **payment_methods table**                                             |
+-----------------------------------------------------------------------+
| CREATE TABLE transaction_service.payment_methods (                    |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| type transaction_service.payment_method_type_enum NOT NULL,           |
|                                                                       |
| label VARCHAR(50) NOT NULL,                                           |
|                                                                       |
| identifier VARCHAR(100) NOT NULL,                                     |
|                                                                       |
| is_active BOOLEAN NOT NULL DEFAULT true,                              |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| \-- identifier is either last-4 digits (bank/card) or email (digital  |
| wallets)                                                              |
|                                                                       |
| CONSTRAINT pm_identifier_format CHECK (                               |
|                                                                       |
| (type IN (\'bank_ach\', \'credit_card\') AND identifier \~            |
| \'\^\[0-9\]{4}\$\')                                                   |
|                                                                       |
| OR                                                                    |
|                                                                       |
| (type IN (\'klarna\', \'google_pay\', \'apple_pay\') AND identifier   |
| \~ \'\^\[\^@\]+@\[\^@\]+\\.\[\^@\]+\$\')                              |
|                                                                       |
| )                                                                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_payment_methods_user_id ON                           |
| transaction_service.payment_methods (user_id);                        |
|                                                                       |
| CREATE INDEX idx_payment_methods_type ON                              |
| transaction_service.payment_methods (type);                           |
+=======================================================================+

## **3.3 transactions**

+-----------------------------------------------------------------------+
| **transactions table**                                                |
+-----------------------------------------------------------------------+
| CREATE TABLE transaction_service.transactions (                       |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| transaction_id VARCHAR(20) NOT NULL,                                  |
|                                                                       |
| date DATE NOT NULL,                                                   |
|                                                                       |
| description_type transaction_service.transaction_type_enum NOT NULL,  |
|                                                                       |
| description_project_name VARCHAR(255),                                |
|                                                                       |
| description_contractor_handle VARCHAR(100),                           |
|                                                                       |
| description_billing_period VARCHAR(20),                               |
|                                                                       |
| description_hours INTEGER,                                            |
|                                                                       |
| description_months INTEGER,                                           |
|                                                                       |
| invoice_number VARCHAR(20),                                           |
|                                                                       |
| amount NUMERIC(12,2) NOT NULL,                                        |
|                                                                       |
| amount_direction transaction_service.amount_direction_enum NOT NULL,  |
|                                                                       |
| status transaction_service.transaction_status_enum NOT NULL,          |
|                                                                       |
| payment_method_type transaction_service.payment_method_type_enum NOT  |
| NULL,                                                                 |
|                                                                       |
| payment_method_label VARCHAR(50) NOT NULL,                            |
|                                                                       |
| payment_method_identifier VARCHAR(100) NOT NULL,                      |
|                                                                       |
| contract_type transaction_service.contract_type_enum NOT NULL,        |
|                                                                       |
| contract_id UUID NOT NULL,                                            |
|                                                                       |
| billing_frequency transaction_service.billing_frequency_enum,         |
|                                                                       |
| membership_tier transaction_service.membership_tier_enum,             |
|                                                                       |
| paid_at TIMESTAMPTZ,                                                  |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| parent_transaction_id UUID,                                           |
|                                                                       |
| usd_equivalent NUMERIC(12,2) NOT NULL,                                |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| \-- Unique transaction reference identifier                           |
|                                                                       |
| CONSTRAINT transactions_transaction_id_unique UNIQUE                  |
| (transaction_id),                                                     |
|                                                                       |
| \-- Hours and months must be positive when present                    |
|                                                                       |
| CONSTRAINT transactions_hours_positive CHECK (description_hours IS    |
| NULL OR description_hours \> 0),                                      |
|                                                                       |
| CONSTRAINT transactions_months_positive CHECK (description_months IS  |
| NULL OR description_months \> 0),                                     |
|                                                                       |
| \-- Amount must never be zero for non-adjustment types                |
|                                                                       |
| CONSTRAINT transactions_amount_nonzero CHECK (                        |
|                                                                       |
| description_type = \'ledger_correction\' OR amount \<\> 0             |
|                                                                       |
| ),                                                                    |
|                                                                       |
| \-- paid_in_full only valid for project contracts                     |
|                                                                       |
| CONSTRAINT transactions_paid_in_full_project_only CHECK (             |
|                                                                       |
| description_type \<\> \'paid_in_full\' OR contract_type = \'project\' |
|                                                                       |
| ),                                                                    |
|                                                                       |
| \-- paid_at must not be before the transaction date                   |
|                                                                       |
| CONSTRAINT transactions_paid_at_after_date CHECK (                    |
|                                                                       |
| paid_at IS NULL OR paid_at::DATE \>= date                             |
|                                                                       |
| ),                                                                    |
|                                                                       |
| \-- Individual contracts use contractor handle; others use project    |
| name                                                                  |
|                                                                       |
| CONSTRAINT transactions_description_consistency CHECK (               |
|                                                                       |
| (contract_type = \'individual\' AND description_contractor_handle IS  |
| NOT NULL)                                                             |
|                                                                       |
| OR                                                                    |
|                                                                       |
| (contract_type \<\> \'individual\' AND description_project_name IS    |
| NOT NULL)                                                             |
|                                                                       |
| ),                                                                    |
|                                                                       |
| \-- Self-referential FK for refunds and corrections                   |
|                                                                       |
| CONSTRAINT transactions_parent_fk                                     |
|                                                                       |
| FOREIGN KEY (parent_transaction_id)                                   |
|                                                                       |
| REFERENCES transaction_service.transactions (id)                      |
|                                                                       |
| ON DELETE RESTRICT,                                                   |
|                                                                       |
| \-- Contract FK                                                       |
|                                                                       |
| CONSTRAINT transactions_contract_fk                                   |
|                                                                       |
| FOREIGN KEY (contract_id)                                             |
|                                                                       |
| REFERENCES transaction_service.contracts (id)                         |
|                                                                       |
| ON DELETE RESTRICT                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| \-- Performance indexes for filtered list queries                     |
|                                                                       |
| CREATE INDEX idx_transactions_user_id ON                              |
| transaction_service.transactions (user_id);                           |
|                                                                       |
| CREATE INDEX idx_transactions_status ON                               |
| transaction_service.transactions (status);                            |
|                                                                       |
| CREATE INDEX idx_transactions_date ON                                 |
| transaction_service.transactions (date DESC);                         |
|                                                                       |
| CREATE INDEX idx_transactions_contract_id ON                          |
| transaction_service.transactions (contract_id);                       |
|                                                                       |
| CREATE INDEX idx_transactions_type ON                                 |
| transaction_service.transactions (description_type);                  |
|                                                                       |
| CREATE INDEX idx_transactions_payment_type ON                         |
| transaction_service.transactions (payment_method_type);               |
|                                                                       |
| CREATE INDEX idx_transactions_parent ON                               |
| transaction_service.transactions (parent_transaction_id);             |
+=======================================================================+

## **3.4 invoices**

+-----------------------------------------------------------------------+
| **invoices table**                                                    |
+-----------------------------------------------------------------------+
| CREATE TABLE transaction_service.invoices (                           |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| invoice_id VARCHAR(20) NOT NULL,                                      |
|                                                                       |
| stripe_invoice_id VARCHAR(100),                                       |
|                                                                       |
| date_issued DATE NOT NULL,                                            |
|                                                                       |
| description_type VARCHAR(255) NOT NULL,                               |
|                                                                       |
| description_billing_period VARCHAR(20),                               |
|                                                                       |
| due_date DATE NOT NULL,                                               |
|                                                                       |
| status transaction_service.invoice_status_enum NOT NULL,              |
|                                                                       |
| amount NUMERIC(12,2) NOT NULL,                                        |
|                                                                       |
| contract_id UUID NOT NULL,                                            |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| \-- Invoice ID must follow INV-YYYY-NNN format                        |
|                                                                       |
| CONSTRAINT invoices_id_format CHECK (                                 |
|                                                                       |
| invoice_id \~ \'\^INV-\[0-9\]{4}-\[0-9\]{3,}\$\'                      |
|                                                                       |
| ),                                                                    |
|                                                                       |
| \-- Due date cannot be before date issued                             |
|                                                                       |
| CONSTRAINT invoices_due_after_issued CHECK (due_date \>=              |
| date_issued),                                                         |
|                                                                       |
| \-- Amount must be positive                                           |
|                                                                       |
| CONSTRAINT invoices_amount_positive CHECK (amount \> 0),              |
|                                                                       |
| CONSTRAINT invoices_id_unique UNIQUE (invoice_id),                    |
|                                                                       |
| CONSTRAINT invoices_contract_fk                                       |
|                                                                       |
| FOREIGN KEY (contract_id)                                             |
|                                                                       |
| REFERENCES transaction_service.contracts (id)                         |
|                                                                       |
| ON DELETE RESTRICT                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_invoices_user_id ON transaction_service.invoices     |
| (user_id);                                                            |
|                                                                       |
| CREATE INDEX idx_invoices_status ON transaction_service.invoices      |
| (status);                                                             |
|                                                                       |
| CREATE INDEX idx_invoices_date_issued ON transaction_service.invoices |
| (date_issued DESC);                                                   |
|                                                                       |
| CREATE INDEX idx_invoices_contract_id ON transaction_service.invoices |
| (contract_id);                                                        |
|                                                                       |
| CREATE INDEX idx_invoices_due_date ON transaction_service.invoices    |
| (due_date);                                                           |
+=======================================================================+

## **3.5 transaction_detail**

+-----------------------------------------------------------------------+
| **transaction_detail table**                                          |
+-----------------------------------------------------------------------+
| CREATE TABLE transaction_service.transaction_detail (                 |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| transaction_id UUID NOT NULL,                                         |
|                                                                       |
| account_label VARCHAR(50) NOT NULL,                                   |
|                                                                       |
| transaction_type_label VARCHAR(50) NOT NULL,                          |
|                                                                       |
| amount NUMERIC(12,2) NOT NULL,                                        |
|                                                                       |
| paid_at TIMESTAMPTZ,                                                  |
|                                                                       |
| installment_label VARCHAR(50),                                        |
|                                                                       |
| description_full TEXT NOT NULL,                                       |
|                                                                       |
| disclaimer_text TEXT NOT NULL DEFAULT                                 |
|                                                                       |
| \'Transaction details are provided for reference and may be           |
| preliminary or incomplete.                                            |
|                                                                       |
| They may not exactly match the final records shown on your official   |
| bank or account statements.\',                                        |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                        |
|                                                                       |
| \-- One detail record per transaction                                 |
|                                                                       |
| CONSTRAINT transaction_detail_transaction_id_unique UNIQUE            |
| (transaction_id),                                                     |
|                                                                       |
| CONSTRAINT transaction_detail_transaction_fk                          |
|                                                                       |
| FOREIGN KEY (transaction_id)                                          |
|                                                                       |
| REFERENCES transaction_service.transactions (id)                      |
|                                                                       |
| ON DELETE CASCADE                                                     |
|                                                                       |
| );                                                                    |
+=======================================================================+

+-----------------------------------------------------------------------+
| **transaction_detail ON DELETE CASCADE**                              |
|                                                                       |
| transaction_detail uses ON DELETE CASCADE on the transaction FK. If a |
| transaction record is ever deleted (which should not occur in normal  |
| operation due to immutability rules), its detail record is deleted    |
| automatically. All other FK relationships use ON DELETE RESTRICT to   |
| prevent accidental orphaning.                                         |
+=======================================================================+

# **4. TypeScript Enums**

These TypeScript enums mirror the PostgreSQL enum types defined in
Section 2. They are used in TypeORM entity column definitions and in DTO
validation.

**/apps/transaction-service/src/entities/enums.ts**

+-----------------------------------------------------------------------+
| **src/entities/enums.ts**                                             |
+-----------------------------------------------------------------------+
| export enum TransactionType {                                         |
|                                                                       |
| DAILY_INSTALLMENT = \'daily_installment\',                            |
|                                                                       |
| WEEKLY_INSTALLMENT = \'weekly_installment\',                          |
|                                                                       |
| MONTHLY_INSTALLMENT = \'monthly_installment\',                        |
|                                                                       |
| QUARTERLY_INSTALLMENT = \'quarterly_installment\',                    |
|                                                                       |
| ANNUAL_INSTALLMENT = \'annual_installment\',                          |
|                                                                       |
| HOURLY_PAYMENT = \'hourly_payment\',                                  |
|                                                                       |
| FINAL_PAYMENT = \'final_payment\',                                    |
|                                                                       |
| PAID_IN_FULL = \'paid_in_full\',                                      |
|                                                                       |
| REFUND_ISSUED = \'refund_issued\',                                    |
|                                                                       |
| CREDIT_APPLIED = \'credit_applied\',                                  |
|                                                                       |
| DEPOSIT = \'deposit\',                                                |
|                                                                       |
| WIRE_TRANSFER_FEE = \'wire_transfer_fee\',                            |
|                                                                       |
| PURCHASE = \'purchase\',                                              |
|                                                                       |
| BASIC_MEMBERSHIP = \'basic_membership\',                              |
|                                                                       |
| PRO_MEMBERSHIP = \'pro_membership\',                                  |
|                                                                       |
| ENTERPRISE_MEMBERSHIP = \'enterprise_membership\',                    |
|                                                                       |
| LEDGER_CORRECTION = \'ledger_correction\',                            |
|                                                                       |
| CASE = \'case\',                                                      |
|                                                                       |
| PROJECT_PAYMENT = \'project_payment\',                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum TransactionStatus {                                       |
|                                                                       |
| PAID = \'paid\',                                                      |
|                                                                       |
| PROCESSING = \'processing\',                                          |
|                                                                       |
| SCHEDULED = \'scheduled\',                                            |
|                                                                       |
| PAYMENT_PENDING = \'payment_pending\',                                |
|                                                                       |
| FAILED = \'failed\',                                                  |
|                                                                       |
| OVERDUE = \'overdue\',                                                |
|                                                                       |
| SUCCEEDED = \'succeeded\',                                            |
|                                                                       |
| CREDITED = \'credited\',                                              |
|                                                                       |
| REFUNDED = \'refunded\',                                              |
|                                                                       |
| PENDING = \'pending\',                                                |
|                                                                       |
| PARTIALLY_REFUNDED = \'partially_refunded\',                          |
|                                                                       |
| CANCELLED = \'cancelled\',                                            |
|                                                                       |
| IN_DISPUTE = \'in_dispute\',                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum InvoiceStatus {                                           |
|                                                                       |
| PAID = \'paid\',                                                      |
|                                                                       |
| PROCESSING = \'processing\',                                          |
|                                                                       |
| SCHEDULED = \'scheduled\',                                            |
|                                                                       |
| PAYMENT_PENDING = \'payment_pending\',                                |
|                                                                       |
| FAILED = \'failed\',                                                  |
|                                                                       |
| OVERDUE = \'overdue\',                                                |
|                                                                       |
| PARTIALLY_PAID = \'partially_paid\',                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum PaymentMethodType {                                       |
|                                                                       |
| BANK_ACH = \'bank_ach\',                                              |
|                                                                       |
| CREDIT_CARD = \'credit_card\',                                        |
|                                                                       |
| KLARNA = \'klarna\',                                                  |
|                                                                       |
| GOOGLE_PAY = \'google_pay\',                                          |
|                                                                       |
| APPLE_PAY = \'apple_pay\',                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum ContractType {                                            |
|                                                                       |
| PROJECT = \'project\',                                                |
|                                                                       |
| SERVICE = \'service\',                                                |
|                                                                       |
| TEAM = \'team\',                                                      |
|                                                                       |
| INDIVIDUAL = \'individual\',                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum BillingFrequency {                                        |
|                                                                       |
| DAILY = \'daily\',                                                    |
|                                                                       |
| WEEKLY = \'weekly\',                                                  |
|                                                                       |
| BIWEEKLY = \'biweekly\',                                              |
|                                                                       |
| MONTHLY = \'monthly\',                                                |
|                                                                       |
| QUARTERLY = \'quarterly\',                                            |
|                                                                       |
| ANNUAL = \'annual\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum MembershipTier {                                          |
|                                                                       |
| BASIC = \'basic\',                                                    |
|                                                                       |
| PRO = \'pro\',                                                        |
|                                                                       |
| ENTERPRISE = \'enterprise\',                                          |
|                                                                       |
| AGENCY = \'agency\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum AmountDirection {                                         |
|                                                                       |
| DEBIT = \'debit\',                                                    |
|                                                                       |
| CREDIT = \'credit\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Statuses after which a transaction record becomes immutable        |
|                                                                       |
| export const IMMUTABLE_STATUSES: TransactionStatus\[\] = \[           |
|                                                                       |
| TransactionStatus.PAID,                                               |
|                                                                       |
| TransactionStatus.SUCCEEDED,                                          |
|                                                                       |
| TransactionStatus.REFUNDED,                                           |
|                                                                       |
| \];                                                                   |
+=======================================================================+

# **5. TypeORM Entity Definitions**

## **5.1 Transaction Entity**

**/apps/transaction-service/src/entities/transaction.entity.ts**

+-----------------------------------------------------------------------+
| **src/entities/transaction.entity.ts**                                |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,             |
|                                                                       |
| UpdateDateColumn, ManyToOne, OneToOne, JoinColumn, Index,             |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| import { Exclude, Expose, Transform } from \'class-transformer\';     |
|                                                                       |
| import {                                                              |
|                                                                       |
| TransactionType, TransactionStatus, PaymentMethodType,                |
|                                                                       |
| ContractType, BillingFrequency, MembershipTier, AmountDirection,      |
|                                                                       |
| } from \'./enums\';                                                   |
|                                                                       |
| import { Contract } from \'./contract.entity\';                       |
|                                                                       |
| import { TransactionDetail } from \'./transaction-detail.entity\';    |
|                                                                       |
| \@Entity({ schema: \'transaction_service\', name: \'transactions\' }) |
|                                                                       |
| export class Transaction {                                            |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Column({ name: \'transaction_id\', type: \'varchar\', length: 20,   |
| unique: true })                                                       |
|                                                                       |
| transactionId: string;                                                |
|                                                                       |
| \@Column({ type: \'date\' })                                          |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| date: Date;                                                           |
|                                                                       |
| \@Column({ name: \'description_type\', type: \'enum\', enum:          |
| TransactionType })                                                    |
|                                                                       |
| descriptionType: TransactionType;                                     |
|                                                                       |
| \@Column({ name: \'description_project_name\', type: \'varchar\',     |
| length: 255, nullable: true })                                        |
|                                                                       |
| descriptionProjectName: string \| null;                               |
|                                                                       |
| \@Column({ name: \'description_contractor_handle\', type:             |
| \'varchar\', length: 100, nullable: true })                           |
|                                                                       |
| descriptionContractorHandle: string \| null;                          |
|                                                                       |
| \@Column({ name: \'description_billing_period\', type: \'varchar\',   |
| length: 20, nullable: true })                                         |
|                                                                       |
| descriptionBillingPeriod: string \| null;                             |
|                                                                       |
| \@Column({ name: \'description_hours\', type: \'int\', nullable: true |
| })                                                                    |
|                                                                       |
| descriptionHours: number \| null;                                     |
|                                                                       |
| \@Column({ name: \'description_months\', type: \'int\', nullable:     |
| true })                                                               |
|                                                                       |
| descriptionMonths: number \| null;                                    |
|                                                                       |
| \@Column({ name: \'invoice_number\', type: \'varchar\', length: 20,   |
| nullable: true })                                                     |
|                                                                       |
| invoiceNumber: string \| null;                                        |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 12, scale: 2 })              |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| amount: number;                                                       |
|                                                                       |
| \@Column({ name: \'amount_direction\', type: \'enum\', enum:          |
| AmountDirection })                                                    |
|                                                                       |
| amountDirection: AmountDirection;                                     |
|                                                                       |
| \@Column({ type: \'enum\', enum: TransactionStatus })                 |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| status: TransactionStatus;                                            |
|                                                                       |
| \@Column({ name: \'payment_method_type\', type: \'enum\', enum:       |
| PaymentMethodType })                                                  |
|                                                                       |
| paymentMethodType: PaymentMethodType;                                 |
|                                                                       |
| \@Column({ name: \'payment_method_label\', type: \'varchar\', length: |
| 50 })                                                                 |
|                                                                       |
| paymentMethodLabel: string;                                           |
|                                                                       |
| \@Column({ name: \'payment_method_identifier\', type: \'varchar\',    |
| length: 100 })                                                        |
|                                                                       |
| paymentMethodIdentifier: string;                                      |
|                                                                       |
| \@Column({ name: \'contract_type\', type: \'enum\', enum:             |
| ContractType })                                                       |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| \@Column({ name: \'contract_id\', type: \'uuid\' })                   |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| contractId: string;                                                   |
|                                                                       |
| \@ManyToOne(() =\> Contract, { eager: false })                        |
|                                                                       |
| \@JoinColumn({ name: \'contract_id\' })                               |
|                                                                       |
| contract: Contract;                                                   |
|                                                                       |
| \@Column({ name: \'billing_frequency\', type: \'enum\', enum:         |
| BillingFrequency, nullable: true })                                   |
|                                                                       |
| billingFrequency: BillingFrequency \| null;                           |
|                                                                       |
| \@Column({ name: \'membership_tier\', type: \'enum\', enum:           |
| MembershipTier, nullable: true })                                     |
|                                                                       |
| membershipTier: MembershipTier \| null;                               |
|                                                                       |
| \@Column({ name: \'paid_at\', type: \'timestamptz\', nullable: true   |
| })                                                                    |
|                                                                       |
| paidAt: Date \| null;                                                 |
|                                                                       |
| \@Column({ name: \'user_id\', type: \'uuid\' })                       |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| userId: string;                                                       |
|                                                                       |
| \@Column({ name: \'parent_transaction_id\', type: \'uuid\', nullable: |
| true })                                                               |
|                                                                       |
| parentTransactionId: string \| null;                                  |
|                                                                       |
| \@Column({ name: \'usd_equivalent\', type: \'numeric\', precision:    |
| 12, scale: 2 })                                                       |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| usdEquivalent: number;                                                |
|                                                                       |
| \@OneToOne(() =\> TransactionDetail, (detail) =\> detail.transaction, |
| { eager: false })                                                     |
|                                                                       |
| detail: TransactionDetail;                                            |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ name: \'updated_at\', type: \'timestamptz\' })   |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.2 Invoice Entity**

**/apps/transaction-service/src/entities/invoice.entity.ts**

+-----------------------------------------------------------------------+
| **src/entities/invoice.entity.ts**                                    |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,             |
|                                                                       |
| UpdateDateColumn, ManyToOne, JoinColumn, Index,                       |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| import { Transform } from \'class-transformer\';                      |
|                                                                       |
| import { InvoiceStatus } from \'./enums\';                            |
|                                                                       |
| import { Contract } from \'./contract.entity\';                       |
|                                                                       |
| \@Entity({ schema: \'transaction_service\', name: \'invoices\' })     |
|                                                                       |
| export class Invoice {                                                |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Column({ name: \'invoice_id\', type: \'varchar\', length: 20,       |
| unique: true })                                                       |
|                                                                       |
| invoiceId: string;                                                    |
|                                                                       |
| \@Column({ name: \'stripe_invoice_id\', type: \'varchar\', length:    |
| 100, nullable: true })                                                |
|                                                                       |
| stripeInvoiceId: string \| null;                                      |
|                                                                       |
| \@Column({ name: \'date_issued\', type: \'date\' })                   |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| dateIssued: Date;                                                     |
|                                                                       |
| \@Column({ name: \'description_type\', type: \'varchar\', length: 255 |
| })                                                                    |
|                                                                       |
| descriptionType: string;                                              |
|                                                                       |
| \@Column({ name: \'description_billing_period\', type: \'varchar\',   |
| length: 20, nullable: true })                                         |
|                                                                       |
| descriptionBillingPeriod: string \| null;                             |
|                                                                       |
| \@Column({ name: \'due_date\', type: \'date\' })                      |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| dueDate: Date;                                                        |
|                                                                       |
| \@Column({ type: \'enum\', enum: InvoiceStatus })                     |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| status: InvoiceStatus;                                                |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 12, scale: 2 })              |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| amount: number;                                                       |
|                                                                       |
| \@Column({ name: \'contract_id\', type: \'uuid\' })                   |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| contractId: string;                                                   |
|                                                                       |
| \@ManyToOne(() =\> Contract, { eager: false })                        |
|                                                                       |
| \@JoinColumn({ name: \'contract_id\' })                               |
|                                                                       |
| contract: Contract;                                                   |
|                                                                       |
| \@Column({ name: \'user_id\', type: \'uuid\' })                       |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| userId: string;                                                       |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ name: \'updated_at\', type: \'timestamptz\' })   |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.3 TransactionDetail Entity**

**/apps/transaction-service/src/entities/transaction-detail.entity.ts**

+-----------------------------------------------------------------------+
| **src/entities/transaction-detail.entity.ts**                         |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,             |
|                                                                       |
| OneToOne, JoinColumn,                                                 |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| import { Transform } from \'class-transformer\';                      |
|                                                                       |
| import { Transaction } from \'./transaction.entity\';                 |
|                                                                       |
| const DISCLAIMER =                                                    |
|                                                                       |
| \'Transaction details are provided for reference and may be           |
| preliminary or incomplete. \' +                                       |
|                                                                       |
| \'They may not exactly match the final records shown on your official |
| bank or account statements.\';                                        |
|                                                                       |
| \@Entity({ schema: \'transaction_service\', name:                     |
| \'transaction_detail\' })                                             |
|                                                                       |
| export class TransactionDetail {                                      |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Column({ name: \'transaction_id\', type: \'uuid\', unique: true })  |
|                                                                       |
| transactionId: string;                                                |
|                                                                       |
| \@OneToOne(() =\> Transaction, (t) =\> t.detail)                      |
|                                                                       |
| \@JoinColumn({ name: \'transaction_id\' })                            |
|                                                                       |
| transaction: Transaction;                                             |
|                                                                       |
| \@Column({ name: \'account_label\', type: \'varchar\', length: 50 })  |
|                                                                       |
| accountLabel: string;                                                 |
|                                                                       |
| \@Column({ name: \'transaction_type_label\', type: \'varchar\',       |
| length: 50 })                                                         |
|                                                                       |
| transactionTypeLabel: string;                                         |
|                                                                       |
| \@Column({ type: \'numeric\', precision: 12, scale: 2 })              |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| amount: number;                                                       |
|                                                                       |
| \@Column({ name: \'paid_at\', type: \'timestamptz\', nullable: true   |
| })                                                                    |
|                                                                       |
| paidAt: Date \| null;                                                 |
|                                                                       |
| \@Column({ name: \'installment_label\', type: \'varchar\', length:    |
| 50, nullable: true })                                                 |
|                                                                       |
| installmentLabel: string \| null;                                     |
|                                                                       |
| \@Column({ name: \'description_full\', type: \'text\' })              |
|                                                                       |
| descriptionFull: string;                                              |
|                                                                       |
| \@Column({ name: \'disclaimer_text\', type: \'text\', default:        |
| DISCLAIMER })                                                         |
|                                                                       |
| disclaimerText: string;                                               |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.4 PaymentMethod Entity**

**/apps/transaction-service/src/entities/payment-method.entity.ts**

+-----------------------------------------------------------------------+
| **src/entities/payment-method.entity.ts**                             |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Entity, PrimaryGeneratedColumn, Column,                               |
|                                                                       |
| CreateDateColumn, UpdateDateColumn, Index,                            |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| import { PaymentMethodType } from \'./enums\';                        |
|                                                                       |
| \@Entity({ schema: \'transaction_service\', name: \'payment_methods\' |
| })                                                                    |
|                                                                       |
| export class PaymentMethod {                                          |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Column({ name: \'user_id\', type: \'uuid\' })                       |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| userId: string;                                                       |
|                                                                       |
| \@Column({ type: \'enum\', enum: PaymentMethodType })                 |
|                                                                       |
| type: PaymentMethodType;                                              |
|                                                                       |
| \@Column({ type: \'varchar\', length: 50 })                           |
|                                                                       |
| label: string;                                                        |
|                                                                       |
| \@Column({ type: \'varchar\', length: 100 })                          |
|                                                                       |
| identifier: string;                                                   |
|                                                                       |
| \@Column({ name: \'is_active\', type: \'boolean\', default: true })   |
|                                                                       |
| isActive: boolean;                                                    |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ name: \'updated_at\', type: \'timestamptz\' })   |
|                                                                       |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.5 Contract Entity**

**/apps/transaction-service/src/entities/contract.entity.ts**

+-----------------------------------------------------------------------+
| **src/entities/contract.entity.ts**                                   |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Entity, PrimaryGeneratedColumn, Column,                               |
|                                                                       |
| CreateDateColumn, Index,                                              |
|                                                                       |
| } from \'typeorm\';                                                   |
|                                                                       |
| import { ContractType } from \'./enums\';                             |
|                                                                       |
| \@Entity({ schema: \'transaction_service\', name: \'contracts\' })    |
|                                                                       |
| export class Contract {                                               |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\')                                    |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Column({ type: \'enum\', enum: ContractType })                      |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| type: ContractType;                                                   |
|                                                                       |
| \@Column({ name: \'client_name\', type: \'varchar\', length: 100 })   |
|                                                                       |
| clientName: string;                                                   |
|                                                                       |
| \@Column({ name: \'client_username\', type: \'varchar\', length: 100, |
| unique: true })                                                       |
|                                                                       |
| \@Index()                                                             |
|                                                                       |
| clientUsername: string;                                               |
|                                                                       |
| \@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })   |
|                                                                       |
| createdAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Data Transfer Objects (DTOs)**

DTOs define the shape of data at the API boundary. All class-validator
rules are derived directly from the error messages specification.
class-transformer decorators control what gets serialized in responses.

## **6.1 Transaction Filter DTO**

Used for GET /v1/transactions query parameters. All fields are optional
--- omitting a field means no filter is applied for that dimension.

**/apps/transaction-service/src/dto/filter.dto.ts**

+-----------------------------------------------------------------------+
| **src/dto/filter.dto.ts**                                             |
+-----------------------------------------------------------------------+
| import { IsOptional, IsEnum, IsDateString, IsString,                  |
|                                                                       |
| IsInt, Min, Max, IsUUID, MinLength } from \'class-validator\';        |
|                                                                       |
| import { Transform, Type } from \'class-transformer\';                |
|                                                                       |
| import {                                                              |
|                                                                       |
| TransactionType, TransactionStatus, PaymentMethodType,                |
|                                                                       |
| ContractType, InvoiceStatus,                                          |
|                                                                       |
| } from \'../entities/enums\';                                         |
|                                                                       |
| export class TransactionFilterDto {                                   |
|                                                                       |
| // ── Date range                                                      |
| ─────────────────────────────────────────────────────                 |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateFrom?: string;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateTo?: string;                                                      |
|                                                                       |
| // ── Transaction type filter                                         |
| ────────────────────────────────────────                              |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(TransactionType)                                             |
|                                                                       |
| type?: TransactionType;                                               |
|                                                                       |
| // ── Contract filter                                                 |
| ────────────────────────────────────────────────                      |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsUUID()                                                            |
|                                                                       |
| contractId?: string;                                                  |
|                                                                       |
| // ── Payment method filter                                           |
| ──────────────────────────────────────────                            |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(PaymentMethodType)                                           |
|                                                                       |
| paymentMethodType?: PaymentMethodType;                                |
|                                                                       |
| // ── Search ──────────────────────────────────────────────────────── |
|                                                                       |
| // Minimum 2 characters; trimmed of whitespace before query           |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MinLength(2, { message: \'Please enter a valid search term.\' })    |
|                                                                       |
| \@Transform(({ value }) =\> value?.trim())                            |
|                                                                       |
| search?: string;                                                      |
|                                                                       |
| // ── Pagination ──────────────────────────────────────────────────── |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| \@IsInt()                                                             |
|                                                                       |
| \@Min(1)                                                              |
|                                                                       |
| page?: number = 1;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| \@IsInt()                                                             |
|                                                                       |
| \@Min(1)                                                              |
|                                                                       |
| \@Max(100)                                                            |
|                                                                       |
| limit?: number = 10;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class InvoiceFilterDto {                                       |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateFrom?: string;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateTo?: string;                                                      |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(InvoiceStatus)                                               |
|                                                                       |
| status?: InvoiceStatus;                                               |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsUUID()                                                            |
|                                                                       |
| contractId?: string;                                                  |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MinLength(2, { message: \'Please enter a valid search term.\' })    |
|                                                                       |
| \@Transform(({ value }) =\> value?.trim())                            |
|                                                                       |
| search?: string;                                                      |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| \@IsInt()                                                             |
|                                                                       |
| \@Min(1)                                                              |
|                                                                       |
| page?: number = 1;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@Type(() =\> Number)                                                 |
|                                                                       |
| \@IsInt()                                                             |
|                                                                       |
| \@Min(1)                                                              |
|                                                                       |
| \@Max(100)                                                            |
|                                                                       |
| limit?: number = 10;                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.2 Transaction Response DTO**

Defines the shape of individual transaction records returned by the API.
class-transformer \@Expose and \@Exclude decorators ensure sensitive
internal fields are never leaked to the frontend.

**/apps/transaction-service/src/dto/transaction.dto.ts**

+-----------------------------------------------------------------------+
| **src/dto/transaction.dto.ts**                                        |
+-----------------------------------------------------------------------+
| import { Expose, Exclude, Transform } from \'class-transformer\';     |
|                                                                       |
| import { IsString, IsNotEmpty, MaxLength } from \'class-validator\';  |
|                                                                       |
| import { TransactionType, TransactionStatus,                          |
|                                                                       |
| PaymentMethodType, ContractType,                                      |
|                                                                       |
| BillingFrequency, MembershipTier, AmountDirection } from              |
| \'../entities/enums\';                                                |
|                                                                       |
| \@Exclude()                                                           |
|                                                                       |
| export class TransactionResponseDto {                                 |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| transactionId: string;                                                |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> value?.toISOString?.().split(\'T\')\[0\]) |
|                                                                       |
| date: string;                                                         |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionType: TransactionType;                                     |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionProjectName: string \| null;                               |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionContractorHandle: string \| null;                          |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionBillingPeriod: string \| null;                             |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionHours: number \| null;                                     |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionMonths: number \| null;                                    |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| invoiceNumber: string \| null;                                        |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| amount: number;                                                       |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| amountDirection: AmountDirection;                                     |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| status: TransactionStatus;                                            |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| paymentMethodType: PaymentMethodType;                                 |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| paymentMethodLabel: string;                                           |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| paymentMethodIdentifier: string;                                      |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| billingFrequency: BillingFrequency \| null;                           |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| membershipTier: MembershipTier \| null;                               |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> value ? new Date(value).toISOString() :   |
| null)                                                                 |
|                                                                       |
| paidAt: string \| null;                                               |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| parentTransactionId: string \| null;                                  |
|                                                                       |
| // usdEquivalent and userId are excluded from API responses           |
|                                                                       |
| // userId: internal field --- never exposed                           |
|                                                                       |
| // usdEquivalent: reserved for future balance calculations            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // DTO for Report a Problem submission                                |
|                                                                       |
| export class ReportTransactionDto {                                   |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsNotEmpty({ message: \'Please select a problem category.\' })      |
|                                                                       |
| \@MaxLength(50)                                                       |
|                                                                       |
| category: string; // \'incorrect_amount\' \| \'duplicate_charge\' \|  |
|                                                                       |
| // \'payment_not_received\' \| \'unauthorized\' \| \'other\'          |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@IsNotEmpty({ message: \'Please describe the problem.\' })           |
|                                                                       |
| \@MaxLength(500, { message: \'Description must be 500 characters or   |
| less.\' })                                                            |
|                                                                       |
| description: string;                                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.3 Invoice Response DTO**

**/apps/transaction-service/src/dto/invoice.dto.ts**

+-----------------------------------------------------------------------+
| **src/dto/invoice.dto.ts**                                            |
+-----------------------------------------------------------------------+
| import { Expose, Exclude, Transform } from \'class-transformer\';     |
|                                                                       |
| import { InvoiceStatus } from \'../entities/enums\';                  |
|                                                                       |
| \@Exclude()                                                           |
|                                                                       |
| export class InvoiceResponseDto {                                     |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| invoiceId: string;                                                    |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> value?.toISOString?.().split(\'T\')\[0\]) |
|                                                                       |
| dateIssued: string;                                                   |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionType: string;                                              |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| descriptionBillingPeriod: string \| null;                             |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> value?.toISOString?.().split(\'T\')\[0\]) |
|                                                                       |
| dueDate: string;                                                      |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| status: InvoiceStatus;                                                |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| \@Transform(({ value }) =\> parseFloat(value))                        |
|                                                                       |
| amount: number;                                                       |
|                                                                       |
| // stripeInvoiceId is excluded from list responses                    |
|                                                                       |
| // It is only included in the invoice detail response                 |
|                                                                       |
| // to construct the Stripe hosted invoice URL                         |
|                                                                       |
| // stripeHostedUrl is a computed field added by InvoiceService        |
|                                                                       |
| // when returning a single invoice detail --- not stored in DB        |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| stripeHostedUrl?: string;                                             |
|                                                                       |
| \@Expose()                                                            |
|                                                                       |
| stripePdfUrl?: string;                                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.4 Export DTO**

**/apps/transaction-service/src/dto/export.dto.ts**

+-----------------------------------------------------------------------+
| **src/dto/export.dto.ts**                                             |
+-----------------------------------------------------------------------+
| import { IsEnum, IsOptional, IsDateString, IsUUID,                    |
|                                                                       |
| IsString, MinLength } from \'class-validator\';                       |
|                                                                       |
| import { Transform } from \'class-transformer\';                      |
|                                                                       |
| import { PaymentMethodType, TransactionType } from                    |
| \'../entities/enums\';                                                |
|                                                                       |
| export enum ExportFormat {                                            |
|                                                                       |
| CSV = \'csv\',                                                        |
|                                                                       |
| PDF = \'pdf\',                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum ExportScope {                                             |
|                                                                       |
| TRANSACTIONS = \'transactions\',                                      |
|                                                                       |
| INVOICES = \'invoices\',                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class ExportRequestDto {                                       |
|                                                                       |
| \@IsEnum(ExportFormat)                                                |
|                                                                       |
| format: ExportFormat;                                                 |
|                                                                       |
| \@IsEnum(ExportScope)                                                 |
|                                                                       |
| scope: ExportScope;                                                   |
|                                                                       |
| // Optional filters --- same shape as TransactionFilterDto            |
|                                                                       |
| // Export respects all active filters, not just the current page      |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateFrom?: string;                                                    |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsDateString()                                                      |
|                                                                       |
| dateTo?: string;                                                      |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(TransactionType)                                             |
|                                                                       |
| type?: TransactionType;                                               |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsUUID()                                                            |
|                                                                       |
| contractId?: string;                                                  |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsEnum(PaymentMethodType)                                           |
|                                                                       |
| paymentMethodType?: PaymentMethodType;                                |
|                                                                       |
| \@IsOptional()                                                        |
|                                                                       |
| \@IsString()                                                          |
|                                                                       |
| \@MinLength(2)                                                        |
|                                                                       |
| \@Transform(({ value }) =\> value?.trim())                            |
|                                                                       |
| search?: string;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Validation Rules from Error Messages Specification**

The following table maps every validation rule in the DTOs to its
corresponding user-facing error message from the error messages
specification. These messages are returned in the 400 Bad Request
response body when validation fails.

  ---------------------------------------------------------------------------------
  **Field**           **Rule**                    **Error Message Returned to
                                                  User**
  ------------------- --------------------------- ---------------------------------
  search              MinLength(2)                Please enter a valid search term.
  (transactions)                                  

  search              Trim applied ---            Please enter a valid search term.
  (transactions)      whitespace-only rejected    

  search (invoices)   MinLength(2)                Please enter a valid search term.

  dateFrom            IsDateString                Your start date is invalid.
                                                  Please select a valid date.

  dateTo              IsDateString                Your end date is invalid. Please
                                                  select a valid date.

  dateFrom after      Cross-field check in        Your start date cannot be after
  dateTo              service layer               your end date. Please adjust your
                                                  selection.

  dateTo before       Cross-field check in        Your end date cannot be before
  dateFrom            service layer               your start date. Please adjust
                                                  your selection.

  dateFrom in future  Date comparison in service  Start date cannot be in the
                      layer                       future.

  type                IsEnum(TransactionType)     Invalid transaction type filter
                                                  value.

  paymentMethodType   IsEnum(PaymentMethodType)   Invalid payment method filter
                                                  value.

  status (invoices)   IsEnum(InvoiceStatus)       Invalid status filter value.

  contractId          IsUUID()                    Invalid contract identifier.

  page                IsInt, Min(1)               Page number must be a positive
                                                  integer.

  limit               IsInt, Min(1), Max(100)     Results per page must be between
                                                  1 and 100.

  format (export)     IsEnum(ExportFormat)        Invalid export format. Use csv or
                                                  pdf.

  scope (export)      IsEnum(ExportScope)         Invalid export scope. Use
                                                  transactions or invoices.

  category (report)   IsNotEmpty                  Please select a problem category.

  description         IsNotEmpty                  Please describe the problem.
  (report)                                        

  description         MaxLength(500)              Description must be 500
  (report)                                        characters or less.
  ---------------------------------------------------------------------------------

# **8. Serialization Rules**

class-transformer controls how entity data is serialized before being
returned to the frontend. The following rules apply globally across all
response DTOs.

  ---------------------------------------------------------------------------
  **Rule**          **Decorator**   **Applied To**     **Behavior**
  ----------------- --------------- ------------------ ----------------------
  Exclude by        \@Exclude() on  All response DTOs  No field is included
  default           class                              in the response unless
                                                       explicitly decorated
                                                       with \@Expose()

  Expose safe       \@Expose() on   All user-facing    Only fields with
  fields            property        fields             \@Expose() are
                                                       serialized into the
                                                       API response

  Date to ISO       \@Transform on  date, dateIssued,  Dates serialized as
  string            date fields     dueDate, paidAt    ISO 8601 strings.
                                                       Date-only fields
                                                       formatted as
                                                       YYYY-MM-DD

  Numeric precision \@Transform =\> amount,            NUMERIC columns from
                    parseFloat      usdEquivalent      PostgreSQL arrive as
                                                       strings --- cast to
                                                       JavaScript float

  Null passthrough  No transform    All nullable       Null values are
                                    fields             preserved in the
                                                       response --- not
                                                       converted to undefined
                                                       or omitted

  userId excluded   \@Exclude()     userId on all      Internal user ID is
                    (default)       entities           never returned to the
                                                       frontend in any
                                                       response

  usdEquivalent     \@Exclude()     usdEquivalent on   Reserved for future
  excluded          (default)       Transaction        balance service
                                                       calculations --- not
                                                       returned to frontend

  stripeInvoiceId   \@Exclude()     stripeInvoiceId on Stripe ID is only
  excluded          (default)       Invoice list       included in invoice
                                                       detail response after
                                                       URL construction
  ---------------------------------------------------------------------------

Enable class-transformer globally in main.ts to ensure all response DTOs
are automatically transformed:

+-----------------------------------------------------------------------+
| **main.ts --- add ClassSerializerInterceptor**                        |
+-----------------------------------------------------------------------+
| // Add to main.ts after ValidationPipe setup                          |
|                                                                       |
| import { ClassSerializerInterceptor } from \'@nestjs/common\';        |
|                                                                       |
| import { Reflector } from \'@nestjs/core\';                           |
|                                                                       |
| app.useGlobalInterceptors(new                                         |
| ClassSerializerInterceptor(app.get(Reflector)));                      |
+=======================================================================+

# **9. Migration Script**

The following migration file creates all enums and tables in the correct
dependency order. Place this file in the migrations directory and run it
before starting the service for the first time.

**/apps/transaction-service/src/migrations/001_initial_schema.ts**

+--------------------------------------------------------------------------+
| **src/migrations/001_initial_schema.ts**                                 |
+--------------------------------------------------------------------------+
| import { MigrationInterface, QueryRunner } from \'typeorm\';             |
|                                                                          |
| export class InitialSchema001 implements MigrationInterface {            |
|                                                                          |
| name = \'InitialSchema001\';                                             |
|                                                                          |
| public async up(queryRunner: QueryRunner): Promise\<void\> {             |
|                                                                          |
| // Step 1: Ensure schema exists                                          |
|                                                                          |
| await queryRunner.query(                                                 |
|                                                                          |
| \`CREATE SCHEMA IF NOT EXISTS transaction_service\`                      |
|                                                                          |
| );                                                                       |
|                                                                          |
| // Step 2: Create all enum types                                         |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.transaction_type_enum AS ENUM (          |
|                                                                          |
| \'daily_installment\',\'weekly_installment\',\'monthly_installment\',    |
|                                                                          |
| \'quarterly_installment\',\'annual_installment\',\'hourly_payment\',     |
|                                                                          |
| \'final_payment\',\'paid_in_full\',\'refund_issued\',\'credit_applied\', |
|                                                                          |
| \'deposit\',\'wire_transfer_fee\',\'purchase\',\'basic_membership\',     |
|                                                                          |
| \'pro_membership\',\'enterprise_membership\',\'ledger_correction\',      |
|                                                                          |
| \'case\',\'project_payment\'                                             |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.transaction_status_enum AS ENUM (        |
|                                                                          |
| \'paid\',\'processing\',\'scheduled\',\'payment_pending\',\'failed\',    |
|                                                                          |
| \'overdue\',\'succeeded\',\'credited\',\'refunded\',\'pending\',         |
|                                                                          |
| \'partially_refunded\',\'cancelled\',\'in_dispute\'                      |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.invoice_status_enum AS ENUM (            |
|                                                                          |
| \'paid\',\'processing\',\'scheduled\',\'payment_pending\',               |
|                                                                          |
| \'failed\',\'overdue\',\'partially_paid\'                                |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.payment_method_type_enum AS ENUM (       |
|                                                                          |
| \'bank_ach\',\'credit_card\',\'klarna\',\'google_pay\',\'apple_pay\'     |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.contract_type_enum AS ENUM (             |
|                                                                          |
| \'project\',\'service\',\'team\',\'individual\'                          |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.billing_frequency_enum AS ENUM (         |
|                                                                          |
| \'daily\',\'weekly\',\'biweekly\',\'monthly\',\'quarterly\',\'annual\'   |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.membership_tier_enum AS ENUM (           |
|                                                                          |
| \'basic\',\'pro\',\'enterprise\',\'agency\'                              |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TYPE transaction_service.amount_direction_enum AS ENUM (          |
|                                                                          |
| \'debit\',\'credit\'                                                     |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 3: contracts (no dependencies)                                   |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TABLE transaction_service.contracts (                             |
|                                                                          |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                           |
|                                                                          |
| type transaction_service.contract_type_enum NOT NULL,                    |
|                                                                          |
| client_name VARCHAR(100) NOT NULL,                                       |
|                                                                          |
| client_username VARCHAR(100) NOT NULL,                                   |
|                                                                          |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| CONSTRAINT contracts_client_username_unique UNIQUE (client_username)     |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 4: payment_methods (no dependencies)                             |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TABLE transaction_service.payment_methods (                       |
|                                                                          |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                           |
|                                                                          |
| user_id UUID NOT NULL,                                                   |
|                                                                          |
| type transaction_service.payment_method_type_enum NOT NULL,              |
|                                                                          |
| label VARCHAR(50) NOT NULL,                                              |
|                                                                          |
| identifier VARCHAR(100) NOT NULL,                                        |
|                                                                          |
| is_active BOOLEAN NOT NULL DEFAULT true,                                 |
|                                                                          |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now()                            |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 5: transactions (depends on contracts)                           |
|                                                                          |
| // Full DDL matches Section 3.3 --- abbreviated here for migration       |
| runner                                                                   |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TABLE transaction_service.transactions (                          |
|                                                                          |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                           |
|                                                                          |
| transaction_id VARCHAR(20) NOT NULL,                                     |
|                                                                          |
| date DATE NOT NULL,                                                      |
|                                                                          |
| description_type transaction_service.transaction_type_enum NOT NULL,     |
|                                                                          |
| description_project_name VARCHAR(255),                                   |
|                                                                          |
| description_contractor_handle VARCHAR(100),                              |
|                                                                          |
| description_billing_period VARCHAR(20),                                  |
|                                                                          |
| description_hours INTEGER,                                               |
|                                                                          |
| description_months INTEGER,                                              |
|                                                                          |
| invoice_number VARCHAR(20),                                              |
|                                                                          |
| amount NUMERIC(12,2) NOT NULL,                                           |
|                                                                          |
| amount_direction transaction_service.amount_direction_enum NOT NULL,     |
|                                                                          |
| status transaction_service.transaction_status_enum NOT NULL,             |
|                                                                          |
| payment_method_type transaction_service.payment_method_type_enum NOT     |
| NULL,                                                                    |
|                                                                          |
| payment_method_label VARCHAR(50) NOT NULL,                               |
|                                                                          |
| payment_method_identifier VARCHAR(100) NOT NULL,                         |
|                                                                          |
| contract_type transaction_service.contract_type_enum NOT NULL,           |
|                                                                          |
| contract_id UUID NOT NULL,                                               |
|                                                                          |
| billing_frequency transaction_service.billing_frequency_enum,            |
|                                                                          |
| membership_tier transaction_service.membership_tier_enum,                |
|                                                                          |
| paid_at TIMESTAMPTZ,                                                     |
|                                                                          |
| user_id UUID NOT NULL,                                                   |
|                                                                          |
| parent_transaction_id UUID,                                              |
|                                                                          |
| usd_equivalent NUMERIC(12,2) NOT NULL,                                   |
|                                                                          |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| CONSTRAINT transactions_transaction_id_unique UNIQUE (transaction_id),   |
|                                                                          |
| CONSTRAINT transactions_hours_positive CHECK (description_hours IS NULL  |
| OR description_hours \> 0),                                              |
|                                                                          |
| CONSTRAINT transactions_months_positive CHECK (description_months IS     |
| NULL OR description_months \> 0),                                        |
|                                                                          |
| CONSTRAINT transactions_amount_nonzero CHECK (description_type =         |
| \'ledger_correction\' OR amount \<\> 0),                                 |
|                                                                          |
| CONSTRAINT transactions_paid_in_full_project_only CHECK                  |
| (description_type \<\> \'paid_in_full\' OR contract_type = \'project\'), |
|                                                                          |
| CONSTRAINT transactions_paid_at_after_date CHECK (paid_at IS NULL OR     |
| paid_at::DATE \>= date),                                                 |
|                                                                          |
| CONSTRAINT transactions_description_consistency CHECK (                  |
|                                                                          |
| (contract_type = \'individual\' AND description_contractor_handle IS NOT |
| NULL)                                                                    |
|                                                                          |
| OR (contract_type \<\> \'individual\' AND description_project_name IS    |
| NOT NULL)                                                                |
|                                                                          |
| ),                                                                       |
|                                                                          |
| CONSTRAINT transactions_parent_fk FOREIGN KEY (parent_transaction_id)    |
| REFERENCES transaction_service.transactions (id) ON DELETE RESTRICT,     |
|                                                                          |
| CONSTRAINT transactions_contract_fk FOREIGN KEY (contract_id) REFERENCES |
| transaction_service.contracts (id) ON DELETE RESTRICT                    |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 6: invoices (depends on contracts)                               |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TABLE transaction_service.invoices (                              |
|                                                                          |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                           |
|                                                                          |
| invoice_id VARCHAR(20) NOT NULL,                                         |
|                                                                          |
| stripe_invoice_id VARCHAR(100),                                          |
|                                                                          |
| date_issued DATE NOT NULL,                                               |
|                                                                          |
| description_type VARCHAR(255) NOT NULL,                                  |
|                                                                          |
| description_billing_period VARCHAR(20),                                  |
|                                                                          |
| due_date DATE NOT NULL,                                                  |
|                                                                          |
| status transaction_service.invoice_status_enum NOT NULL,                 |
|                                                                          |
| amount NUMERIC(12,2) NOT NULL,                                           |
|                                                                          |
| contract_id UUID NOT NULL,                                               |
|                                                                          |
| user_id UUID NOT NULL,                                                   |
|                                                                          |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| CONSTRAINT invoices_id_format CHECK (invoice_id \~                       |
| \'\^INV-\[0-9\]{4}-\[0-9\]{3,}\$\'),                                     |
|                                                                          |
| CONSTRAINT invoices_due_after_issued CHECK (due_date \>= date_issued),   |
|                                                                          |
| CONSTRAINT invoices_amount_positive CHECK (amount \> 0),                 |
|                                                                          |
| CONSTRAINT invoices_id_unique UNIQUE (invoice_id),                       |
|                                                                          |
| CONSTRAINT invoices_contract_fk FOREIGN KEY (contract_id) REFERENCES     |
| transaction_service.contracts (id) ON DELETE RESTRICT                    |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 7: transaction_detail (depends on transactions)                  |
|                                                                          |
| await queryRunner.query(\`                                               |
|                                                                          |
| CREATE TABLE transaction_service.transaction_detail (                    |
|                                                                          |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                           |
|                                                                          |
| transaction_id UUID NOT NULL,                                            |
|                                                                          |
| account_label VARCHAR(50) NOT NULL,                                      |
|                                                                          |
| transaction_type_label VARCHAR(50) NOT NULL,                             |
|                                                                          |
| amount NUMERIC(12,2) NOT NULL,                                           |
|                                                                          |
| paid_at TIMESTAMPTZ,                                                     |
|                                                                          |
| installment_label VARCHAR(50),                                           |
|                                                                          |
| description_full TEXT NOT NULL,                                          |
|                                                                          |
| disclaimer_text TEXT NOT NULL DEFAULT \'Transaction details are provided |
| for reference and may be preliminary or incomplete. They may not exactly |
| match the final records shown on your official bank or account           |
| statements.\',                                                           |
|                                                                          |
| created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                           |
|                                                                          |
| CONSTRAINT transaction_detail_transaction_id_unique UNIQUE               |
| (transaction_id),                                                        |
|                                                                          |
| CONSTRAINT transaction_detail_transaction_fk FOREIGN KEY                 |
| (transaction_id) REFERENCES transaction_service.transactions (id) ON     |
| DELETE CASCADE                                                           |
|                                                                          |
| )                                                                        |
|                                                                          |
| \`);                                                                     |
|                                                                          |
| // Step 8: Create all indexes                                            |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_contracts_type ON             |
| transaction_service.contracts (type)\`);                                 |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_contracts_client_username ON  |
| transaction_service.contracts (client_username)\`);                      |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_payment_methods_user_id ON    |
| transaction_service.payment_methods (user_id)\`);                        |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_user_id ON       |
| transaction_service.transactions (user_id)\`);                           |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_status ON        |
| transaction_service.transactions (status)\`);                            |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_date ON          |
| transaction_service.transactions (date DESC)\`);                         |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_contract_id ON   |
| transaction_service.transactions (contract_id)\`);                       |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_type ON          |
| transaction_service.transactions (description_type)\`);                  |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_payment_type ON  |
| transaction_service.transactions (payment_method_type)\`);               |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_transactions_parent ON        |
| transaction_service.transactions (parent_transaction_id)\`);             |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_invoices_user_id ON           |
| transaction_service.invoices (user_id)\`);                               |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_invoices_status ON            |
| transaction_service.invoices (status)\`);                                |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_invoices_date_issued ON       |
| transaction_service.invoices (date_issued DESC)\`);                      |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_invoices_contract_id ON       |
| transaction_service.invoices (contract_id)\`);                           |
|                                                                          |
| await queryRunner.query(\`CREATE INDEX idx_invoices_due_date ON          |
| transaction_service.invoices (due_date)\`);                              |
|                                                                          |
| }                                                                        |
|                                                                          |
| public async down(queryRunner: QueryRunner): Promise\<void\> {           |
|                                                                          |
| await queryRunner.query(\`DROP TABLE IF EXISTS                           |
| transaction_service.transaction_detail\`);                               |
|                                                                          |
| await queryRunner.query(\`DROP TABLE IF EXISTS                           |
| transaction_service.invoices\`);                                         |
|                                                                          |
| await queryRunner.query(\`DROP TABLE IF EXISTS                           |
| transaction_service.transactions\`);                                     |
|                                                                          |
| await queryRunner.query(\`DROP TABLE IF EXISTS                           |
| transaction_service.payment_methods\`);                                  |
|                                                                          |
| await queryRunner.query(\`DROP TABLE IF EXISTS                           |
| transaction_service.contracts\`);                                        |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.transaction_type_enum\`);                            |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.transaction_status_enum\`);                          |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.invoice_status_enum\`);                              |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.payment_method_type_enum\`);                         |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.contract_type_enum\`);                               |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.billing_frequency_enum\`);                           |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.membership_tier_enum\`);                             |
|                                                                          |
| await queryRunner.query(\`DROP TYPE IF EXISTS                            |
| transaction_service.amount_direction_enum\`);                            |
|                                                                          |
| await queryRunner.query(\`DROP SCHEMA IF EXISTS transaction_service      |
| CASCADE\`);                                                              |
|                                                                          |
| }                                                                        |
|                                                                          |
| }                                                                        |
+==========================================================================+

# **10. Next Steps**

With the full data layer defined, proceed to Doc 04 to build all API
endpoints on top of these entities and DTOs:

  -----------------------------------------------------------------------------
  **Document**   **Title**          **What It Covers**
  -------------- ------------------ -------------------------------------------
  Doc 04         API Endpoints      All route handlers: GET /v1/transactions,
                                    GET /v1/transactions/:id, GET /v1/invoices,
                                    GET /v1/invoices/:id, POST
                                    /v1/transactions/export, POST
                                    /v1/transactions/:id/report --- with full
                                    request/response schemas and error shapes

  Doc 05         Integrations &     RabbitMQ consumers that write to the
                 Events             entities defined here, Stripe invoice URL
                                    retrieval, Ably status publishing, Redis
                                    cache keys and TTLs

  Doc 06         Observability &    Extended /ready check using TypeORM
                 Health             DataSource, structured logging for all DB
                                    operations

  Doc 07         QA & Test Data     Seed scripts using the enums and entities
                                    defined here, test fixtures for all
                                    transaction types and status combinations
  -----------------------------------------------------------------------------
