# Frontend Memory

## Status
Partially implemented

## Stack
Next.js (App Router), TypeScript, Tailwind CSS

## What's Built
- UI component library: /frontend/components/ui/ (tabs, sidebar, dialog, input, button, etc.)
- Type definitions: /frontend/types/ (user, talent, client, project, conversation, message, auth, core, day, react)
- Inbox hooks: /frontend/app/(group)/inbox/hooks/
  - use-messages.ts
  - use-send-message.ts
  - use-file-upload.ts
  - use-conversation-key.ts
  - use-group-encryption.ts
  - use-pinned-messages.ts
- Utilities: /frontend/utils/ (api, auth, conversation, helpers, date, hooks, etc.)
- Constants: username-suggestions, blacklist, job title validation
- Mock data: /frontend/public/mock/ (users, projects, skills, languages, etc.)
- E2E tests: Playwright + Cucumber
  - Auth tests: signin (pwd, OAuth), signup (hire, work)
  - Google + LinkedIn OAuth tests

## Key Conventions
- API calls go through /frontend/utils/api.ts
- Ably integration via /frontend/utils/useAblyChannel.ts
- Location search via /frontend/utils/useLocationSearch.ts

## Agent Log
