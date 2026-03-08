# **📚 Contracts Service -- Documentation Set (Master Index)**

## **1. Overview & Architecture**

- Purpose: Individual-only contracts, grouped under
  projects/services/teams.

- Microservice setup (NestJS, TypeORM, Docker).

- Event-driven lifecycle: pending → active → ended.

- Cross-service references (Checkout, Billing, Time Tracking, Reviews,
  Notifications, Analytics).

## **2. Data Model & Entities**

- **Contract** entity (always individual).

- **ContractGroup** entity (logical grouping for deposits/billing).

- Association rules (projects, services, teams, jobs).

- Status transitions & audit trail.

- TypeORM entities + migrations (copy-paste ready).

## **3. API Endpoints**

- Create group of contracts (POST /contract-groups).

- Accept/Reject flow for talent (PUT /contracts/:id/respond).

- End contract (individual only) (PUT /contracts/:id/end).

- Query endpoints (get by ID, by client, by talent, by group).

- Webhook endpoints (deposit cleared, billing finalized).

- Full NestJS controllers, services, and DTOs.

## **4. Contract Start Flow**

- Lifecycle: Pending → Active.

- Integration with Checkout Service for bundled deposits.

- Activation saga (all contracts in group activate atomically).

- Error handling if deposit fails.

- Event examples: contract.group.created, checkout.deposit.cleared.

## **5. Contract End Flow**

- Manual end process (individual-only).

- Integration with Billing Service for final invoice/credits.

- Allowed reasons for ending.

- Emit contract.ended → triggers Review Service.

- Notifications to client + talent.

- Example payloads for Billing + Reviews.

## **6. Events & Integrations**

- **Emitted**: contract.group.created, contract.activated,
  contract.group.activated, contract.ended, contract.canceled.

- **Consumed**: checkout.deposit.cleared, checkout.deposit.failed,
  billing.finalized, timetracking.hours.approved.

- Interaction with:

  - Checkout (deposits)

  - Billing (group billing cycles)

  - Time Tracking (per-contract hours)

  - Review (90-day review cycle)

  - Notifications (UI + email alerts)

  - Analytics (KPIs, spend, rehire rate)

## **7. Security & Permissions**

- JWT validation with API Gateway.

- Role-based rules:

  - **Client** → start/end contracts.

  - **Talent** → accept/reject offers.

- Audit logging for compliance.

- TypeORM audit entity + logger service.

## **8. Edge Case Handling**

- **Failed deposits** → remain pending, auto-cancel after expiry.

- **Contract expiration** → manual extension (or configurable auto-end).

- **Disputed contracts** → status = DISPUTED, billing paused, admin
  resolution.

- **Partial terminations** → one at a time, group ends only when all
  contracts ended.

## **9. API Documentation for Frontend Integration**

- Authentication headers (JWT).

- Endpoints + request/response examples.

- Axios wrapper (contracts.api.ts).

- Mapping UI → API:

  - **Hire Me screen** → create group

  - **End Contract screen** → end individual contract

  - **Dashboard** → query client/talent contracts

  - **Reviews** → triggered after end

- Status transitions explained for frontend.

# **✅ Developer Workflow**

1.  **Read Overview (Doc 01)** to understand architecture.

2.  **Implement Entities (Doc 02)** and run migrations.

3.  **Wire Controllers + Services (Doc 03)**.

4.  **Test Start Flow (Doc 04)** with Checkout integration.

5.  **Test End Flow (Doc 05)** with Billing + Review triggers.

6.  **Verify Events (Doc 06)** for all integrations.

7.  **Enable Security (Doc 07)** for role-based actions.

8.  **Handle Edge Cases (Doc 08)**.

9.  **Expose API Docs (Doc 09)** for frontend engineers.
