# Scheduling Service

This service vendors the self-hosted `Cal.diy` application into the Marketeq backend
monorepo so we can run scheduling locally as a standalone microservice.

Location:
- `backend/apps/scheduling-service/app`

Wrapper scripts:
- `npm run install:app`
- `npm run build`
- `npm run start`
- `npm run start:dev`

Default local port:
- `3024`

The wrapper also applies a small compatibility patch for the vendored `zod-prisma-types`
generator so installs work on newer local Node versions.
