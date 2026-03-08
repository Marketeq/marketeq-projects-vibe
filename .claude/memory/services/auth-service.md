# auth-service Memory

## Status
Implemented

## Docs Location
/docs/Technical Documentation/User Service/User Onboarding/

## What This Service Does
Handles user authentication: sign up, sign in, JWT issuance, OAuth (Google, LinkedIn), password management.

## Src Structure
/backend/apps/auth-service/src/
├── auth/         # Auth logic, strategies
├── config/       # Config module
├── main.ts
├── auth-service.controller.ts
├── auth-service.module.ts
└── auth-service.service.ts

## Key Decisions
- JWT-based auth
- OAuth via Passport strategies (Google, LinkedIn)

## Gotchas / Notes
- Guards live in /backend/shared/ and are reused by all services
