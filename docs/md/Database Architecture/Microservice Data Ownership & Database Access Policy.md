# **Microservice Data Ownership & Database Access Policy**

## **Purpose**

This document defines the **official rules and constraints** for
database usage in our microservices architecture.\
The goal is to preserve **service ownership, data integrity,
performance, and scalability** while allowing **pragmatic, efficient
read access** where required.

This policy applies to **all services, schemas, queries, and database
roles**.

## **Core Principle: Data Ownership**

Each microservice is the **sole owner** of its database schema.

Ownership means:

- The service defines the schema structure

- The service enforces business rules and invariants

- The service controls all **write operations**

**No other service may write to a schema it does not own.**

This rule is **non-negotiable**.

## **Database Topology**

- Services may share the **same database instance**

- Each service must have:

  - Its **own schema**

  - Its **own database role**

- Physical database separation is optional

- Logical schema isolation is required

This architecture prioritizes **ownership and write isolation** over
physical separation.

## **Access Rules**

### **Write Access**

- A service has **read/write access only to its own schema**

- Cross-service writes are **strictly prohibited**

- No shared tables

- No cross-schema foreign keys

### **Read Access**

- Services may be granted **read-only access** to other service schemas
  **when justified**

- Read access must be:

  - Explicit

  - Approved

  - Auditable

Read access does **not** imply ownership.

## **Read Contracts (Required)**

Direct table access across schemas is **not allowed**.

All cross-service reads must use **explicit read contracts**,
implemented as:

- Views (preferred)

- Versioned views (for breaking changes)

- Materialized views (for performance-critical paths)

### **Example**

****CREATE VIEW billing.invoice_read_v1 AS

SELECT id, customer_id, total, status, created_at

FROM billing.invoices;

Consumers:

- Query only the view

- Never query base tables

- Must not assume underlying table structure

Schema owners may modify internal tables as long as the contract remains
intact.

## **Schema Change Rules**

Schema owners must assume **active downstream readers**.

### **Allowed Changes**

- Adding columns

- Adding indexes

- Non-breaking performance optimizations

### **Breaking Changes**

Breaking changes require:

1.  A new versioned view (e.g. \_v2)

2.  A migration window

3.  Consumer sign-off

Dropping or changing a contract **without versioning is prohibited**.

## **Query & Performance Constraints**

Cross-schema reads must be **safe, efficient, and predictable**.

### **Hard Rules**

- No cross-schema joins in hot paths

- No unbounded scans

- No SELECT \*

- No ad-hoc reporting queries from services

### **Performance Ownership**

- The **schema owner** approves indexes needed for external consumers

- Consumers may request indexes, but may not create them

- Query performance budgets must be respected

If a read pattern becomes expensive or unstable, the schema owner may:

- Require query changes

- Introduce optimized views

- Revoke direct read access and require API usage

## **Security & Permissions**

Each service must use a **dedicated database role**.

### **Example**

- orders_rw → read/write on orders schema

- billing_ro → read-only on billing.invoice_read_v1

Permissions must be:

- Least-privilege

- Explicit

- Reviewed regularly

## **What Is Explicitly Forbidden**

- ❌ Multiple services writing to the same schema

- ❌ Cross-schema foreign keys

- ❌ Using the database as an integration mechanism

- ❌ Bypassing views to query base tables

- ❌ "Temporary" shared write access

- ❌ Assuming schemas are private if they are consumed

Violations will be treated as **architecture defects**, not stylistic
issues.

## **Architectural Rationale**

This approach balances:

- Strong data ownership

- High read performance

- Operational simplicity

- Reduced infrastructure overhead

It intentionally trades **full service autonomy** for **controlled
coupling**, while preserving the most critical microservice invariant:
**exclusive write ownership**.

This is a **deliberate architectural decision**, not an accident or
transitional state.

## **Review & Governance**

- All new cross-schema access must be reviewed

- All schema contracts must be documented

- Repeated or complex read dependencies may trigger a design review

This policy will evolve, but **write isolation and ownership will not**.
