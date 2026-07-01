  **ID**   **Document**                               **What It Contains**
  -------- ------------------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  OS-00    User Stories                               56 user stories across 13 groups in Given/When/Then format covering every actor, action, and outcome in the offer lifecycle
  OS-01    Acceptance Criteria                        39 sections of testable criteria with tag categories and colour coding --- defines exactly what \"done\" means for every feature
  OS-02    Frontend Feature Definition                11 sections covering all 27 screens, every flow, validation rule, permission, and API endpoint the frontend needs to implement
  OS-03    Frontend State Management                  45 screens mapped with every trigger, button, link, navigation destination, and state condition
  OS-04    Edge Cases & Solutions                     125 edge cases across 15 groups with severity ratings and exact solutions --- race conditions, state conflicts, network failures, security
  OS-05    Error States & Messages                    100 friendly error messages across 14 groups covering input validation, API errors, state conflicts, network failures, and empty states
  OS-06    Data Limitations                           Every field, type, min, max, format, and constraint across all offer flows --- rates, dates, messages, files, TTL rules, business rule limits
  OS-07    Service Boundary Correction                Clarifies what belongs to offer-service vs contracts-service --- contract title, rate, schedule, duration ownership
  OS-08    Service Overview & Architecture            What offer-service does, its place in the monorepo, all service dependencies, system diagram, tech stack, folder structure
  OS-09    Environment & Configuration                Every environment variable, default values, required vs optional, which service each variable connects to, local dev setup
  OS-10    API Endpoint Reference                     Every endpoint --- method, path, auth requirement, request body, response shape, status codes, full OpenAPI-compatible spec
  OS-11    Request & Response Schemas (DTOs)          Complete TypeScript interfaces and class-validator rules for every DTO --- create offer, edit offer, counter offer, withdraw, decline, resend
  OS-12    Authentication & Authorization             JWT validation flow, role extraction, offer-party guard logic, which roles can perform which actions at the endpoint level
  OS-13    Error Response Format & Codes              Standard error envelope shape, every error code the service emits, HTTP status mapping, what triggers each code
  OS-14    Idempotency Implementation                 X-Idempotency-Key header spec, Redis storage pattern, 24h deduplication window, how it works per endpoint, retry handling
  OS-15    Database Schema & Entities                 Every table, every column, data types, constraints, defaults, foreign keys, TypeORM entity definitions for offers, counter_offers, offer_history, outbox
  OS-16    Database Indexes & Query Optimization      Every index, which queries it serves, why it exists --- status + expiry queries, clientId + talentId pair lookups, history pagination
  OS-17    Database Migrations Guide                  How to create, run, and roll back migrations within the NestJS monorepo, naming conventions, zero-downtime migration patterns
  OS-18    Seed Data & Test Fixtures                  Reference data for local dev and testing --- sample offers in every status, counter offer chains, expired offers, accepted offers with contracts
  OS-19    RabbitMQ Exchange, Queue & Configuration   Exchange name and type, all queues, bindings, routing keys, durability settings, prefetch config, consumer setup
  OS-20    RabbitMQ Event Payload Schemas             Complete payload shape for all 14 events --- offer.created, offer.accepted, offer.declined, offer.withdrawn, offer.expired, offer.expiring_soon, offer.edited, offer.countered, offer.counter_accepted, offer.counter_declined, offer.counter_withdrawn, offer.counter_edited, offer.counter_expired, offer.resent
  OS-21    Outbox Pattern Implementation              How the outbox table works, the poller service, how events are written atomically with state changes, retry logic, exactly-once delivery guarantee
  OS-22    Dead Letter Queue & Retry Policy           DLQ setup, retry count (max 10), exponential backoff configuration, what happens when retries are exhausted, engineering alert setup
  OS-23    Real-time Events (Ably)                    Channel naming convention (offer:{offerId}), every event pushed via Ably, which client receives each event, auth token generation
  OS-24    Ably Frontend Integration Guide            How the frontend connects to Ably, subscribes to offer channels, handles incoming events, updates UI state in real time, reconnection logic
  OS-25    State Machine Implementation               Code-level implementation of all offer and counter offer state transitions, allowed transition maps, atomic DB operations, guard conditions
  OS-26    TTL & Expiry Logic                         Cron job setup, how expiresAt is calculated and reset, warningSentAt logic, expiry processor, warning processor, 30-day extension threshold
  OS-27    Rate Warning Logic                         Where the 1.25× threshold check runs, how it\'s evaluated server-side and client-side, direction flip for client counter offers, advisory response format
  OS-28    Active Offer Enforcement                   How the one-active-offer-per-client-talent-pair rule is enforced at the DB constraint level and service layer, restoration logic after CO terminal events
  OS-29    Internal Service Integration Map           How offer-service calls listings-service (start date), pricing-service (FX), legal-service (NDA status) --- endpoints, request/response, timeout handling, fallback behaviour
  OS-30    Frontend API Integration Guide             How the frontend consumes every offer-service endpoint --- auth headers, request format, error handling patterns, loading states, optimistic updates
  OS-31    Unit & Integration Test Plan               What must be unit tested, coverage requirements, mocking strategy for RabbitMQ and Ably, integration test setup with test DB
  OS-32    E2E Test Scenarios                         Full flow tests mapped to user stories --- offer creation to acceptance, counter offer rounds, expiry flows, withdrawal, resend, NDA gate
  OS-33    Load & Performance Test Plan               Concurrency targets for simultaneous accepts, race condition stress tests, scheduler performance under load, acceptance thresholds
  OS-34    Test Data & Fixtures                       Factory functions for every offer state, reusable offer chains for testing multi-round negotiation, expired and terminal state fixtures
  OS-35    Monitoring, Logging & Alerts               Structured log schema, sensitive field masking, every metric tracked, alert thresholds, health check endpoints, on-call escalation
  OS-36    Security & RBAC                            Every role, every permitted action, offer-party guard implementation, PII field identification, data masking in logs, account deletion handling
  OS-37    Deployment Guide                           Step-by-step deployment within the monorepo, environment promotion dev → staging → prod, migration steps, smoke test checklist
  OS-38    Service Runbook                            Incident response playbook --- service down, scheduler not running, events not publishing, bad state transitions, how to investigate and recover
