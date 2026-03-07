## Marketeq Projects Frontend

A Next.js 14 (App Router) frontend for Marketeq with Tailwind CSS, a custom UI kit, Storybook, and authentication/HTTP client utilities.

### Quick Start

1) Install deps
```bash
npm install
```

2) Set environment (see Environment below), then run dev server
```bash
npm run dev
```
Open http://localhost:3000

3) Optional: Storybook
```bash
npm run storybook
```
Open http://localhost:6006

### Scripts
- `dev`: start Next.js dev server
- `build`: production build
- `start`: start production server
- `lint`: run Next.js ESLint
- `lint:fix`: fix with ESLint
- `format`: Prettier write
- `format:check`: Prettier check
- `types:check`: TypeScript check
- `tooling`: run format:check + lint + types:check concurrently
- `storybook`: run Storybook dev
- `build-storybook`: build Storybook static

### Environment
Create `.env.local` with relevant variables:

```bash
# Base API URL used by Axios and asset URLs (service/http/client.ts)
NEXT_PUBLIC_API_URL="https://api.example.com"

# Used by fetch-based helper (utils/api.ts)
NEXT_PUBLIC_BACKEND_URL="https://api.example.com"

# Google OAuth (app/layout.tsx)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-oauth-client-id"

# Optional: analytics (configured in app/layout.tsx). These are hardcoded ids; override only if you refactor to envs
# NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
# NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"
```

Notes:
- Cookies: `accessToken` is read in `service/http/client.ts` and attached as `Authorization: Bearer`.
- CORS/credentials: logout uses `withCredentials` on `/auth/logout`.

### Tech Stack
- Next.js 14 (App Router)
- React 18
- Tailwind CSS + headless UI libs (`@headlessui/tailwindcss`, `tailwindcss-animate`, `tailwind-scrollbar`, RAC)
- Custom UI library in `components/ui`
- Axios for HTTP with interceptors
- React Hook Form + Zod for forms/validation
- Storybook 7 for components
- Misc: Zustand, Framer Motion, TanStack Query/Table, Embla, Swiper

### Project Structure

```
.
├─ app/                      # Next.js App Router routes and layouts
│  ├─ layout.tsx             # Root layout, providers, GA/GTM, global CSS
│  ├─ top-most-header.tsx    # Global top header component
│  ├─ sign-in/page.tsx       # Sign-in page
│  ├─ sign-up/page.tsx       # Sign-up page
│  ├─ publish-project/page.tsx
│  ├─ (group)/...            # Grouped route segments
│  ├─ onboarding/            # Onboarding pages
│  ├─ inbox/                 # Inbox pages (TS/TSX)
│  ├─ client-dashboard/      # Client dashboard entry
│  └─ talent-dashboard/      # Talent dashboard entry
│
├─ components/               # Reusable UI and feature components
│  ├─ ui/                    # Design system components (buttons, inputs, overlays, etc.)
│  ├─ icons/                 # SVG/TSX icon components
│  ├─ auth/                  # OAuth buttons
│  ├─ n-progress-bar.tsx     # Route progress bar
│  ├─ invite-window.tsx      # Invite modal + trigger
│  ├─ next-image.tsx         # Next Image wrapper
│  ├─ next-link.tsx          # Next Link wrapper
│  ├─ search-card*.tsx       # Search result cards
│  ├─ ... (various feature widgets: chat, forms, etc.)
│
├─ contexts/
│  └─ auth.tsx               # Auth context: user state, `UserAPI.me`, logout
│
├─ service/                  # API client layer
│  ├─ index.ts               # Axios instance: base URL, auth header via cookie
│  └─ http/
│     ├─ auth.ts             # Auth endpoints (signup/login/google/linkedin/logout)
│     ├─ user.ts             # `UserAPI.me`, onboarding dismiss
│     ├─ project.ts          # Create project (FormData or JSON)
│     ├─ client.ts           # Create client
│     └─ talent.ts           # Create talent
│
├─ src/
│  ├─ api/user.ts            # Messaging API helper: fetch public key via `apiFetch`
│  ├─ crypto/                # Crypto helpers (not expanded here)
│  ├─ hooks/                 # Generic hooks
│  └─ lib/                   # Low-level utilities (e.g., `api` used by messaging)
│
├─ utils/
│  ├─ api.ts                 # `fetchUserSkills` using `NEXT_PUBLIC_BACKEND_URL`
│  ├─ auth.ts                # `getCurrentUser` from localStorage token
│  ├─ functions.ts           # Utility helpers: classnames, dates, validation, files
│  ├─ useAblyChannel.ts      # Realtime Ably subscription per thread (authCallback)
│  └─ ...                    # Other helper modules
│
├─ types/                    # Shared TypeScript types (auth, user, project, etc.)
│
├─ stories/                  # Storybook CSF stories for UI/flows (see list below)
│
├─ styles/
│  ├─ globals.css            # Tailwind base + app styles
│  └─ nprogress.css          # Progress bar styles
│
├─ public/                   # Static assets (images, icons, favicons)
│
├─ tailwind.config.ts        # Tailwind theme (colors, screens, plugins)
├─ next.config.js            # Next images domains + remote patterns
├─ tsconfig.json             # TS config with path alias `@/*`
├─ prettier.config.mjs       # Prettier + sort imports
├─ lint-staged.config.js     # Lint-staged rules
├─ commitlint.config.js      # Conventional commits
└─ package.json              # Scripts and dependencies
```

### Key Flows
- Auth bootstrap: `app/layout.tsx` wraps with `GoogleOAuthProvider` and `AuthProvider`. On mount, `contexts/auth.tsx` calls `UserAPI.me()` to populate user; `logoutHandler` clears cookie and redirects to `/sign-in`.
- API calls: `service/index.ts` configures Axios with `NEXT_PUBLIC_API_URL` and bearer token from cookie `accessToken`.
- Realtime (optional): `utils/useAblyChannel.ts` uses Ably Realtime with server-signed tokens via `apiFetch` to `/api/messaging/ably` and subscribes to `thread-${threadId}` events.
- Skills fetch: `utils/api.ts` uses native fetch to `NEXT_PUBLIC_BACKEND_URL`.

### Development Notes
- Path alias: import from `@/` root (`baseUrl: "."`).
- Image domains: configured in `next.config.js` (GitHub, Google, LinkedIn, Sanity CDN).
- UI/Design: Tailwind theme extends brand palettes (`primary`, `gray`, `light-gray`, `dark-blue`, `light-blue`) and animations.

### Build & Deploy
```bash
npm run build
npm start
```

### Conventions
- Commit messages: Conventional Commits enforced by commitlint/husky.
- Formatting: Prettier with Tailwind plugin and import sorting.
- Linting: `eslint-config-next` + Storybook plugin.

### Troubleshooting
- 401/Unauthenticated: ensure `accessToken` cookie is set for the app domain and `NEXT_PUBLIC_API_URL` matches API CORS settings.
- Images failing to load: check `next.config.js` `images.domains`/`remotePatterns`.
- OAuth popup issues: verify `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and authorized origins.

---
Maintainers can update this README as features evolve (routes, services, envs).

### Stories directory (file purposes)

Each file renders interactive examples in Storybook to document UX flows and components.

- ask-question.stories.tsx: Ask-a-question UI flow variants
- auth.stories.tsx: Authentication screens/components demo
- categories-l1.stories.tsx: Top-level category browsing layout
- categories-l1-projects.stories.tsx: L1 category view focused on projects
- categories-l1-services.stories.tsx: L1 category view focused on services
- categories-l1-talent.stories.tsx: L1 category view focused on talent
- categories-l1-teams.stories.tsx: L1 category view focused on teams
- categories-l2.stories.tsx: Second-level category browsing
- categories-l2-projects.stories.tsx: L2 categories for projects
- categories-l2-services.stories.tsx: L2 categories for services
- categories-l2-talent.stories.tsx: L2 categories for talent
- categories-l2-teams.stories.tsx: L2 categories for teams
- categories-l3.stories.tsx: Third-level deep category browsing
- categories-l3-projects.stories.tsx: L3 categories for projects
- categories-l3-talent.stories.tsx: L3 categories for talent
- categories-l3-teams.stories.tsx: L3 categories for teams
- checkout.stories.tsx: Checkout and payment flow states
- client-onboarding.stories.tsx: Client onboarding walkthrough
- client-view-comps.stories.tsx: Client view UI components showcase
- complete-my-profile.stories.tsx: Profile completion flow
- complete-my-profile-implementation.stories.tsx: Impl-focused variants of profile completion
- emoji-picker.stories.tsx: Emoji picker component demos
- file-attachments.stories.tsx: File attachment uploader usage
- inbox.stories.tsx: Inbox and messaging layout examples
- message-forwarding.stories.tsx: Forwarding messages interactions
- pay-in-installaments.stories.tsx: Pay-in-installments UX
- project-details.stories.tsx: Project details page states
- publish-project.stories.tsx: Project publishing wizard/screens
- sidebar.stories.tsx: App sidebar navigation variants
- similar-projects.stories.tsx: Similar projects recommendations UI
- talent-onboarding.stories.tsx: Talent onboarding flow
- talent-profile.stories.tsx: Talent profile page states
- talent-profile-1.stories.tsx: Talent profile variant set 1
- talent-profile-2.stories.tsx: Talent profile variant set 2
- talent-profile-comps.stories.tsx: Talent profile component pieces
- time-selector.stories.tsx: Time selection widgets
- video-player-modal.stories.tsx: Video player modal interactions

#### Categories stories deep-dive

- Categories L1 (`stories/categories-l1.stories.tsx`)
  - Imports: `@blend-metrics/icons` (various), `@blend-metrics/icons/brands` (`AdobeBrand`), `@radix-ui/react-tabs` (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`), `@storybook/react` (`Meta`), `swiper/react` (`SwiperSlide`), local `components` (`NextImage`, `NextLink`, `Money`, `components/ui` primitives such as `Accordion`, `Avatar`, `Badge`, `Button`, `IconButton`, `Input*`, `ScrollArea`, `Tooltip*`, and custom `components/swiper` helpers: `SwiperRoot`, `SwiperContent`, `SwiperPrevTrigger`, `SwiperNextTrigger`).
  - JSX structure: Fullscreen page-like layout. Hero header with background image and breadcrumb, followed by a grid of top-level category cards (5 columns). Then a tabbed "Recommended" section with Swiper carousel of cards; sections for projects/services/teams/talent; additional featured lists and content blocks structured with grids and flex rows.
  - Data: Mock/static data. Uses `fromLength(6)` and array `.map`/`Array(fill)` to render repeated cards; hardcoded titles, ratings, images, pricing (`Money`), badges, etc. No external props/state.

- Categories L2 (`stories/categories-l2.stories.tsx`)
  - Imports: Similar to L1, minus Swiper components. Uses `@blend-metrics/icons`, `@radix-ui/react-tabs`, `@storybook/react` (`Meta`), `NextImage`, `NextLink`, and `components/ui` primitives (`Avatar*`, `Badge`, `Button`, `IconButton`, `Input*`, `ScrollArea`, `Tooltip*`, `Accordion*`, `Favorite*`).
  - JSX structure: Fullscreen page layout. Hero header with breadcrumb to L2 (e.g., Software Development / Mobile Applications). A 5-column grid of subcategory cards. Tabbed "Recommended in Software Development" section rendering repeated article cards in a flex row or grid (no Swiper).
  - Data: Mock/static content with `Array(4).fill(0).map(...)` for repeated cards, hardcoded text, ratings, price/time sections using `Money` and icons.

- Categories L3 (`stories/categories-l3.stories.tsx`)
  - Imports: `@blend-metrics/icons` (UI icons), `@radix-ui/react-tabs` (`Tabs*`), `@storybook/react` (`Meta`), local `NextImage`, `NextLink`, `Money`, and `components/ui` primitives (`Avatar*`, `Badge`, `Button`, `IconButton`, `Input*`, `ScrollArea`, `Tooltip*`, `Favorite*`).
  - JSX structure: Fullscreen page layout. Hero header; a Tabs section (Featured/Newest/Most Popular/Trending/Top-Rated/Best-Sellers) with a 4-column grid of project cards, each with image, title, rating, details (time, budget), avatar groups with tooltip, and call-to-action buttons.
  - Data: Purely mocked using `Array(8).fill(0).map(...)` to render cards; static labels, ratings, budget/time, avatar placeholders.
