# Migration Guide: Old Repos to New Monorepo

**Old Frontend**: `/Users/saikrishnasamudrala/Desktop/Test/marketeq-projects-frontend`
**Old Backend**: `/Users/saikrishnasamudrala/Desktop/marketeq-projects-nestjs-main`
**New Monorepo**: `/Users/saikrishnasamudrala/marketeq-projects-vibe`

---

## 1. FRONTEND DIFFERENCES

### Pages/Routes

**In Old, NOT in New:**
- `/accept-invitation/page.tsx`
- `/invite/accept/page.tsx`
- `/my-favorites/page.tsx`
- `/teams/page.tsx`

**In New, NOT in Old (added from dev branch):**
- `/checkout/[slug]/` (full checkout flow: payment, confirmation, next-steps)
- `/(group)/billing/` (billing management)
- `/(group)/favorites/` and `/(group)/favorites/[groupId]/` (replaces old /my-favorites)
- `/(group)/my-contracts/`
- `/(group)/my-listings/`
- `/(group)/notifications/`
- `/(group)/settings/`
- Category-based pages: `/c/[l1]/projects/[slug]/` and `/c/[l1]/services/[slug]/`

### API Services (service/http/)

**User Service - MAJOR REFACTOR:**
- Old: Fragmented endpoints (`updateRate`, `updateOverview`, `updateBio`, `updateAvailability`, etc.)
- New: Unified `updateProfile(userId, data)` with comprehensive `UserProfilePayload`
- New: Certification and industry management endpoints
- New: Job titles with rate/earning/fee tracking
- New: All endpoints now include `authHeaders()` with Bearer token

**New API Services in New Repo:**
- `service/http/favorites.ts` - Full favorites API with groups
- `AuthAPI.DevLogin(email)` - Dev login endpoint
- `AuthAPI.Refresh(refreshToken)` - Token refresh

### Auth Context (contexts/auth.tsx) - SIGNIFICANT CHANGES
- New: SSR handling (checks `typeof window`)
- New: `accountType` derived from `userType` (doesn't overwrite `role`)
- New: Enhanced logout (removes both `access_token` and `refresh_token`)
- New: Better error handling (clears cookies on 401/403)

### New Components in New Repo
- `case-study-builder.tsx`
- `edit-profile-modals.tsx`
- `rich-text-editor.tsx` (TipTap-based)
- `components/favorites/` directory (FavoriteButton, FavoriteGroupList)

### Config Changes
- Next.js: 14.1.4 -> 16.1.6, React: 18 -> 19
- Old had rewrites for local dev (`/__auth/*`, `/__user/*`), New uses env vars directly
- New adds TipTap packages for rich text editing

---

## 2. BACKEND DIFFERENCES

### Architecture Changes

| Aspect | Old Repo | New Repo |
|--------|----------|----------|
| NestJS version | ^11.1.14 | ^10.0.0 |
| API Gateway | Monolithic orchestrator (28+ domain modules) | Thin HTTP proxy forwarding to services |
| Shared auth | Centralized `libs/auth/` | Decentralized: each service has own JWT guards |
| Database | Shared Docker postgres (19 DBs via init script) | Database-per-service (isolated) |
| Dev environment | npm scripts per service | PM2 ecosystem management |
| RabbitMQ | `@golevelup/nestjs-rabbitmq` | Manual `amqplib` |

### Services Comparison

**New Services (not in old):**
- `billing-service` - Stripe subscriptions, invoices, webhooks
- `messaging-service` - Real-time messaging via Ably, threads, attachments
- `payout-service` (94 files!) - Multi-provider payouts (Stripe, PayPal, Wise, Payoneer, Crypto)
- `search-service` - Dedicated Algolia search
- `suggestions-service` - Job title suggestions

**Renamed/Refactored:**
- `notifications-service` (old) -> `notification-service` (new) - Completely rewritten with Ably real-time, SendGrid, DB-backed notifications

**Major Rewrites:**
- `api-gateway` - From monolithic orchestrator to thin proxy
- `listings-service` - 72 files -> 155 files (2x), added job-listing, jobs, services, teams modules
- `auth-service` - Added dev-login, self-contained JWT guards

**Removed Dependencies (old had, new doesn't):**
- `@nestjs/bull`, `@nestjs/cache-manager`, `@nestjs/event-emitter`, `@nestjs/schedule`
- AWS S3 SDK (global), Twilio, Supabase
- Centralized auth library

---

## 3. WHAT YOU NEED TO DO

### Priority 1: Verify Your Custom Logic Was Ported

Check if any custom changes you made in the old repos are present in the new repo. Key files to compare:

**Frontend:**
1. `contexts/auth.tsx` - Your auth flow changes
2. `service/http/auth.ts` - Login/register API calls
3. `service/http/user.ts` - User profile API (major refactor - your old endpoints may not exist)
4. `app/sign-in/page.tsx` - Sign-in page (we already fixed Google/LinkedIn guard)
5. `app/sign-up/page.tsx` - Sign-up page
6. `components/auth/` - Auth components
7. Any profile-related pages under `(group)/`

**Backend:**
1. `apps/auth-service/src/auth/auth.service.ts` - Auth logic
2. `apps/user-service/src/user/user.service.ts` - User operations
3. `apps/api-gateway/src/` - Gateway routing (completely different architecture)
4. Any custom entity changes you made

### Priority 2: Port Missing Pages

If you need these old pages, port them manually:
- `/accept-invitation/` -> may need new invitation flow
- `/teams/` -> check if functionality moved to new `/(group)/` routes

### Priority 3: Fix Service Communication

The new repo uses different ports and URL patterns:
- Old user-service: port 3003
- New user-service: port 3002
- Old gateway: monolithic (all logic embedded)
- New gateway: proxy (forwards to services)

Ensure `.env` files point to correct service URLs.

### Priority 4: Database Migration

Old repo used shared postgres with all DBs created via init script. New repo expects per-service databases. You need:
- All databases created in your Docker postgres
- Correct schemas created per service (e.g., `user_service`, `checkout`, etc.)
- Migrations run for services that use them

---

## 4. RECOMMENDED WORKFLOW GOING FORWARD

1. **Work only in the new monorepo** (`marketeq-projects-vibe`)
2. **Keep old repos as reference** - Don't make changes there
3. **Before implementing a feature**, check if the new repo already has it (many features were added from dev branch)
4. **For any bug you fixed in old repos**, search for the same file in the new repo and apply the fix
5. **Test locally** with PM2 (`npx pm2 kill && npm run dev` in backend)
6. **Always kill PM2 before restarting** - Never run `npm run dev` twice without `npx pm2 kill` first

---

## 5. SERVICES PORT MAPPING (New Repo)

| Service | Port |
|---------|------|
| api-gateway | 4000 |
| auth-service | 3001 |
| user-service | 3002 |
| listings-service | 3003 |
| messaging-service | 3005 |
| notification-service | 3006 |
| checkout-service | 3009 |
| contracts-service | 3010 |
| favorites-service | 3012 |
| time-tracking-service | 3017 |


---

## 6. KNOWN ISSUES (Current State)

| Issue | Status | Fix |
|-------|--------|-----|
| Google login "Missing client_id" | Fixed | Guard added in layout.tsx + GoogleLoginButton.tsx |
| Dev login buttons showing | Fixed | Removed from sign-in page |
| PM2 TypeError on restart | Workaround | Always `npx pm2 kill` before `npm run dev` |
| messaging/notification-service crashing | Needs ABLY_API_KEY | Set in .env files |
| listings-service crashing | Module build issue | Needs investigation |
| fill-opacity warning on sign-up | Fixed | Changed to fillOpacity |
