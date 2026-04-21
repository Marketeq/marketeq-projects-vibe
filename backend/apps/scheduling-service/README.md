# Scheduling Service

This service vendors [Cal.diy](https://github.com/calcom/cal.diy) into the repo as a self-hosted scheduling service for marketplace booking flows.

## Structure

- `app/`: vendored Cal.diy application and packages
- `package.json`: thin wrapper so this service can be managed like the other backend apps

## Why this lives here

We need a self-hosted scheduler that:

- keeps homepage booking available for the company
- can grow into user-to-user marketplace scheduling without per-seat hosted Cal.com pricing
- stays inside our repository as a service we can adapt

## First-time setup

```bash
cd backend/apps/scheduling-service
npm run install:app
cp app/.env.example app/.env
```

Then fill in the environment variables required by Cal.diy.

The wrapper also applies a small compatibility patch for the vendored `zod-prisma-types`
generator so installs work on newer local Node versions.

## Local development

```bash
cd backend/apps/scheduling-service
npm run start:dev
```

By default the wrapper runs the service on port `3024`.

## Notes

- This is a vendored upstream app, not a Nest service.
- The current integration is intentionally isolated. We have not yet wired Marketeq auth, user sync, or internal routing into this service.
- Upstream project docs are in `app/README.md`.
