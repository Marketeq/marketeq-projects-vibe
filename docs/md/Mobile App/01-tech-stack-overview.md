# Marketeq Projects Mobile App - Tech Stack Overview

## 1. Overview

A standalone React Native mobile app for iOS and Android that connects to the existing Marketeq NestJS backend. Not a responsive wrapper around the web app. Native mobile experience, same backend APIs.

---

## 2. Core Framework

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | React Native (Expo SDK 52+) | Team already knows React/TypeScript from the web frontend and has RN experience from Uptu Vibe. Expo managed workflow handles native builds without Xcode/Android Studio friction. |
| **Language** | TypeScript (strict) | Matches the entire existing codebase (frontend + backend). Shared types possible. |
| **Runtime** | Expo Go (dev) / EAS Build (prod) | Expo Go for rapid dev iteration, EAS Build for store-ready binaries. |

---

## 3. Navigation

| Library | Purpose |
|---------|---------|
| **expo-router** | File-based routing (mirrors Next.js App Router patterns the team already uses). Supports deep linking, tab layouts, stack navigation, and modals out of the box. |

### Proposed route structure
```
mobile/app/
  (auth)/
    login.tsx
    signup.tsx
  (tabs)/
    _layout.tsx              # Bottom tab navigator
    index.tsx                # Home / Dashboard
    marketplace/
      index.tsx              # Browse listings
      [id].tsx               # Listing detail
    messages/
      index.tsx              # Inbox
      [conversationId].tsx   # Chat thread
    projects/
      index.tsx              # My projects
      [id].tsx               # Active project detail
    profile/
      index.tsx              # My profile
      edit.tsx               # Edit profile
  settings/
    index.tsx
    notifications.tsx
    tax-info.tsx
```

---

## 4. Networking & API Layer

| Concern | Solution |
|---------|----------|
| **HTTP Client** | `axios` (same as web frontend, same interceptor patterns) |
| **Base URL** | Points to the existing api-gateway on Render (`https://marketeq-backend.onrender.com/api`) |
| **Auth** | JWT Bearer tokens stored in `expo-secure-store` (not cookies, since RN has no browser cookie jar). Login returns `access_token` + `refresh_token`, stored securely on device. |
| **Token Refresh** | Same 401-intercept-and-retry pattern as web (`service/index.ts`), but reads/writes tokens from SecureStore instead of cookies. |
| **Data Fetching** | `@tanstack/react-query` (already used on web). Caching, pagination, optimistic updates, offline-aware refetching. |

### Auth difference from web
The web frontend relies on httpOnly cookies set by the backend. The mobile app cannot use cookies. The backend already accepts `Authorization: Bearer <token>` headers (all guards check the Bearer token first). The mobile app will:
1. POST `/auth/login` (or OAuth callback) to get tokens
2. Store both tokens in `expo-secure-store` (encrypted, per-device keychain)
3. Attach `Authorization: Bearer <access_token>` on every request
4. On 401, POST `/auth/refresh` with the refresh token, store new tokens, retry

No backend changes required for this flow.

---

## 5. State Management

| Library | Use Case |
|---------|----------|
| **Zustand** | Global client state (already used on web). Auth state, UI state, filters. |
| **React Query** | Server state (API data caching, sync, pagination). |
| **React Hook Form + Zod** | Form state and validation (same as web). |

---

## 6. UI & Styling

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Component Library** | **NativeWind (Tailwind for RN)** | The team already thinks in Tailwind. NativeWind v4 compiles Tailwind classes to RN StyleSheet at build time. Same class names as the web frontend. |
| **Icons** | `@expo/vector-icons` + custom SVGs from the design system | Blend Metrics icons are SVGs; wrap them in `react-native-svg` components. |
| **Animations** | `react-native-reanimated` | 60fps native animations for gestures, transitions, shared element transitions. |
| **Gestures** | `react-native-gesture-handler` | Swipe-to-dismiss, pull-to-refresh, drag-and-drop (for task reordering). |

### Design system strategy

The web design system (`frontend/components/ui/`) is built on Radix + Tailwind. Radix primitives are web-only (they render DOM elements). React Native has no DOM, so the mobile app needs its own component library built on native primitives.

#### What is shared from web (tokens only)

These values are copied from the web design system and kept in `mobile/tokens/`:

| Token | Source | Example |
|-------|--------|---------|
| **Colors** | `frontend/tailwind.config.ts` | `primary-500: #306CFE`, `gray-200: #E4E7EC`, etc. |
| **Spacing scale** | Tailwind default | 4, 8, 12, 16, 20, 24, 32, 40, 48... |
| **Typography** | `frontend/tailwind.config.ts` | Inter font, sizes 12/14/16/18/20/24/30, weights 400/500/600/700 |
| **Border radii** | Design system | 4, 6, 8, 12, 16, full |
| **Shadows** | Design system | `shadow-xs`, `shadow-sm`, `shadow-md` definitions |

#### What is built new for mobile

Every component in `mobile/components/ui/` is a fresh implementation using React Native primitives:

| Web (Radix + Tailwind) | Mobile (RN + NativeWind) |
|------------------------|--------------------------|
| `<button>` via Radix Slot | `Pressable` |
| `<input>` via Radix | `TextInput` |
| `<dialog>` via Radix Dialog | `Modal` or bottom sheet |
| `<select>` via Radix Select | Custom picker / bottom sheet list |
| Radix Dropdown Menu | Bottom sheet action list |
| Radix Tabs | Top tab bar or segmented control |
| Radix Tooltip | Long-press popover |
| Radix Scroll Area | `ScrollView` / `FlatList` |
| framer-motion | `react-native-reanimated` |

#### Component API parity

Mobile components should mirror web component prop APIs where possible:

```tsx
// Web
<Button variant="primary" size="md" disabled>Save</Button>

// Mobile - same props, native rendering
<Button variant="primary" size="md" disabled>Save</Button>
```

Same component names, same variant names, same size names. An engineer switching between web and mobile should feel at home.

#### Mobile-only patterns (no web equivalent)

| Pattern | Implementation |
|---------|---------------|
| Bottom sheets | `@gorhom/bottom-sheet` |
| Swipe actions (delete, archive) | `react-native-gesture-handler` Swipeable |
| Pull-to-refresh | `RefreshControl` on ScrollView/FlatList |
| Haptic feedback | `expo-haptics` |
| Safe area insets | `react-native-safe-area-context` (every screen) |
| Tab bar | expo-router bottom tabs |
| Toast/snackbar | `react-native-toast-message` or custom |

#### File structure

```
mobile/components/
  ui/
    button.tsx          # Pressable + NativeWind variants
    icon-button.tsx     # Icon-only button
    input.tsx           # TextInput wrapper
    textarea.tsx        # Multiline TextInput
    avatar.tsx          # Image + initials fallback
    badge.tsx           # Status badges
    dialog.tsx          # Modal wrapper
    bottom-sheet.tsx    # @gorhom/bottom-sheet wrapper
    select.tsx          # Bottom sheet picker
    checkbox.tsx        # Animated checkbox
    switch.tsx          # Toggle switch
    tabs.tsx            # Segmented control / top tabs
    card.tsx            # Surface container
    label.tsx           # Form label
    skeleton.tsx        # Loading placeholder
    toast.tsx           # Notification toast
    spinner.tsx         # Activity indicator wrapper
  index.ts              # Barrel export

mobile/tokens/
  colors.ts             # Color palette matching web
  spacing.ts            # Spacing scale
  typography.ts         # Font sizes, weights, line heights
  radii.ts              # Border radius values
  shadows.ts            # Shadow definitions
```

#### Rules

1. **NEVER use raw RN primitives in screens.** Always use the design system component. `Pressable` in a screen file is the same violation as `<button>` on web.
2. **NEVER modify a token value without updating the web equivalent (and vice versa).** Colors, spacing, and typography must stay in sync.
3. **NEVER add a new component to `mobile/components/ui/` without CTO approval.** Same rule as web: if it doesn't exist, ask first.
4. **Every component must support NativeWind `className` prop** for per-instance overrides, same as web components support `className` via `twMerge`.

---

## 7. Realtime

| Feature | Technology |
|---------|-----------|
| **Messaging** | Ably SDK for React Native (`ably` package already supports RN). Same channels and events as the web inbox. |
| **Notifications (in-app)** | Ably presence + channel subscriptions. |
| **Push Notifications** | `expo-notifications` + backend integration. The notification-service (port 3006) already emits events; add a push-token registration endpoint and a Firebase Cloud Messaging / APNs relay. |

---

## 8. Storage & Media

| Concern | Solution |
|---------|----------|
| **Secure storage** | `expo-secure-store` (tokens, sensitive user data) |
| **Local cache** | `@tanstack/react-query` persistent cache via `AsyncStorage` |
| **Image loading** | `expo-image` (fast, cached, supports blurhash placeholders, progressive loading) |
| **File uploads** | `expo-document-picker` + `expo-image-picker` for attachments, profile photos. Upload to the same R2 presigned URL flow the web uses. |
| **Camera** | `expo-camera` (for profile photos, document scanning if needed later) |

---

## 9. Build & Distribution

| Stage | Tool |
|-------|------|
| **Dev builds** | Expo Go (quick), or `npx expo run:ios` / `run:android` for native module testing |
| **CI builds** | EAS Build (cloud) or local builds on Jenkins |
| **OTA updates** | EAS Update (push JS bundle updates without app store review) |
| **App Store** | EAS Submit for both Apple App Store and Google Play Store |
| **Env management** | `eas.json` profiles: `development`, `staging`, `production` (mirrors the web's three Vercel projects) |

### eas.json environments
```json
{
  "build": {
    "development": {
      "env": { "API_URL": "http://localhost:4000/api" }
    },
    "staging": {
      "env": { "API_URL": "https://marketeq-backend.onrender.com/api" }
    },
    "production": {
      "env": { "API_URL": "https://marketeq-backend.onrender.com/api" }
    }
  }
}
```

---

## 10. Testing

| Type | Tool |
|------|------|
| **Unit / Component** | Jest + React Native Testing Library |
| **E2E** | Maestro (simpler than Detox, YAML-based flows, good for CI) |
| **Type checking** | `tsc --noEmit` (same as web) |
| **Linting** | ESLint + Prettier (same config as web) |

---

## 11. Repo Structure

Lives in the monorepo at `mobile/`:

```
marketeq-projects-vibe/
  backend/          # Existing NestJS microservices (shared, no changes)
  frontend/         # Existing Next.js web app
  mobile/           # NEW - React Native (Expo)
    app/            # expo-router file-based routes
    components/
      ui/           # Mobile design system components (Button, Input, Avatar, etc.)
    hooks/          # Custom hooks (useAuth, useApi, etc.)
    lib/
      api.ts        # Axios instance + token interceptor
      auth.ts       # SecureStore token management
      urls.ts       # API URL resolution (mirrors frontend/lib/runtime-urls.ts)
    service/
      http/         # API modules mirroring frontend/service/http/
        auth.ts
        user.ts
        listings.ts
        messaging.ts
        ...
    stores/         # Zustand stores
    tokens/         # Design tokens (colors, spacing, typography)
    assets/         # Static images, fonts
    app.json        # Expo config
    eas.json        # EAS Build profiles
    tsconfig.json
    package.json
```

---

## 12. Shared Code with Web Frontend

Code that CAN be shared (extract to a shared package later if worth it):
- TypeScript interfaces/types for API responses
- Zod validation schemas
- Zustand store logic (auth state shape, filter logic)
- API endpoint paths and HTTP method definitions

Code that CANNOT be shared:
- UI components (Radix vs native primitives)
- Navigation (Next.js router vs expo-router)
- Storage (cookies vs SecureStore)
- Styling (while both use Tailwind classes, the runtime is different)

Start by duplicating the relevant `service/http/*.ts` files and adapting them. Extract shared types into a `packages/shared/` workspace package only if the duplication becomes painful.

---

## 13. Backend Changes Needed

Minimal. The existing backend already supports everything the mobile app needs:

| Change | Why | Effort |
|--------|-----|--------|
| Push token registration endpoint | Store device push tokens (FCM/APNs) for push notifications | Small - new endpoint on notification-service |
| Push notification relay | Send push via FCM/APNs when notification-service emits events | Medium - new worker in notification-service |
| OAuth mobile flow | Google/LinkedIn OAuth needs mobile redirect URIs (deep links) | Small - config change + new redirect handler |
| CORS for mobile | Not needed. Mobile apps don't enforce CORS (no browser). | None |

Everything else (auth, listings, messaging, projects, tasks, contracts, etc.) works as-is through the api-gateway.

### BACKEND IS FROZEN FOR MOBILE

Once the 3 additive endpoints above are built, the backend is fully frozen for mobile engineers. Rules:

1. **Mobile engineers work in `mobile/` only.** They never open, edit, or commit to `backend/` or `frontend/`.
2. **No existing endpoint may be modified for mobile.** No changing response shapes, no renaming fields, no removing fields. If mobile needs data in a different format, transform it client-side in `mobile/`.
3. **No new backend endpoints without CTO approval.** If a mobile engineer believes they need a backend change, they file a ticket and flag it. They do not make the change themselves. A backend engineer reviews and implements it if approved.
4. **Additive only.** Any approved backend work for mobile must be a new endpoint, new field, or new service. Never modify or remove anything the web frontend depends on.
5. **The web app is the primary consumer.** If there is ever a conflict between what mobile wants and what web needs, web wins. Mobile adapts.

---

## 14. v1 Feature Scope (Recommended)

Priority order for initial release:

| Phase | Features | Depends On |
|-------|----------|------------|
| **1 - Auth** | Email login, Google OAuth, signup, token management | Push token endpoint |
| **2 - Profile** | View/edit profile, avatar upload, skills, portfolio | None |
| **3 - Marketplace** | Browse listings (projects, services, talent), search, filters, favorites | None |
| **4 - Messaging** | Inbox, real-time chat via Ably, attachments | None |
| **5 - Notifications** | In-app notification feed, push notifications | Push relay |
| **6 - Projects** | Active project dashboard, task list, task detail | None |
| **7 - Time Tracking** | Timer start/stop, manual entry, screenshot viewing | None |
| **8 - Contracts & Offers** | View/accept/decline offers, contract details | None |

---

## 15. Key Dependencies (package.json)

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-image": "~2.0.0",
    "expo-image-picker": "~16.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-notifications": "~0.29.0",
    "expo-camera": "~16.0.0",
    "react-native": "0.76.x",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-svg": "~15.8.0",
    "react-native-safe-area-context": "~4.12.0",
    "nativewind": "^4.0.0",
    "axios": "^1.7.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "ably": "^2.0.0",
    "date-fns": "^3.3.0"
  }
}
```

---

## 16. Engineer Onboarding Checklist

1. Clone the monorepo, `cd mobile/`
2. `npm install`
3. Install Expo Go on your phone (or use iOS/Android simulator)
4. Copy `.env.example` to `.env` and set `API_URL`
5. `npx expo start` - scan QR code with Expo Go
6. Read this doc and the v1 feature scope
7. Pick a phase from Section 14, read the corresponding web frontend code in `frontend/service/http/` and `frontend/app/` to understand the API contracts
8. Build the mobile equivalent
