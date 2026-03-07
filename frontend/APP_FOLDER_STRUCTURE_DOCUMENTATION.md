# App Folder Structure Documentation

## Overview
This document provides a comprehensive breakdown of the folder structure within the `app` directory, specifically focusing on the nested group structure: `app/(group)/(group)/level-1`, `level-2`, and `level-3`.

## Folder Hierarchy

```
app/
├── layout.tsx                          # Root layout for the entire application
├── (group)/                            # First route group (Next.js route groups)
│   ├── layout.tsx                      # Layout for first group routes
│   └── (group)/                        # Second nested route group
│       ├── layout.tsx                  # Layout for marketplace routes
│       ├── page.tsx                    # Main marketplace page
│       ├── level-1/                    # Level 1 category pages
│       │   ├── all/
│       │   │   └── page.tsx            # All items page for level 1
│       │   ├── projects/
│       │   │   ├── page.tsx            # Projects listing page for level 1
│       │   │   └── api-wrapper.tsx    # API wrapper component for projects
│       │   ├── services/
│       │   │   └── page.tsx            # Services listing page for level 1
│       │   ├── talent/
│       │   │   └── page.tsx            # Talent listing page for level 1
│       │   └── teams/
│       │       └── page.tsx            # Teams listing page for level 1
│       ├── level-2/                    # Level 2 category pages
│       │   ├── all/
│       │   │   └── page.tsx            # All items page for level 2
│       │   ├── projects/
│       │   │   └── page.tsx            # Projects listing page for level 2
│       │   ├── services/
│       │   │   └── page.tsx            # Services listing page for level 2
│       │   ├── talent/
│       │   │   └── page.tsx            # Talent listing page for level 2
│       │   └── teams/
│       │       └── page.tsx            # Teams listing page for level 2
│       └── level-3/                    # Level 3 category pages
│           ├── all/
│           │   └── page.tsx            # All items page for level 3
│           ├── projects/
│           │   └── page.tsx            # Projects listing page for level 3
│           ├── talent/
│           │   └── page.tsx            # Talent listing page for level 3
│           └── teams/
│               └── page.tsx            # Teams listing page for level 3
```

---

## Detailed File Documentation

### Root Level Files

#### `app/layout.tsx`
**Purpose**: Root layout component that wraps the entire application.

**Key Features**:
- Sets up global providers (GoogleOAuthProvider, AuthProvider, QueryProvider)
- Configures global styles and fonts
- Includes third-party integrations (Google Analytics, Google Tag Manager)
- Provides global UI components (Toaster, NProgressBar, InviteWindow)
- Defines metadata for SEO (title, description, icons)

**Dependencies**:
- React Suspense for code splitting
- Next.js Metadata API
- Authentication context
- Query provider for data fetching
- Global CSS imports

---

### First Group Level

#### `app/(group)/layout.tsx`
**Purpose**: Layout wrapper for the first route group, providing the topmost header component.

**Key Features**:
- Renders `TopMostHeader` component
- Wraps all child routes within this group
- Provides consistent header navigation across group routes

**Components Used**:
- `TopMostHeader`: Main navigation header component

---

### Second Group Level

#### `app/(group)/(group)/layout.tsx`
**Purpose**: Marketplace layout component that provides the main structure for marketplace pages.

**Key Features**:
- Renders marketplace-specific navigation bar
- Includes category sidebar with filtering options
- Provides footer component with links and social media
- Displays team member count and category selection
- Includes breadcrumb navigation
- Responsive design with mobile/desktop variations

**Components Included**:
- **Sidebar**: Category selection dialog with scrollable list
- **Footer**: Footer with company links, social media, and newsletter signup
- **Navigation Bar**: Top navigation with category filters (Research, Design, Development, Testing, Security, Maintenance, Digital Marketing)
- **Team Members Display**: Shows current team member count with dropdown

**Route Protection**:
- Currently has `AuthenticatedRoute` commented out (can be enabled for authentication)

---

#### `app/(group)/(group)/page.tsx`
**Purpose**: Main marketplace landing page (if exists).

**Functionality**:
- Serves as the entry point for the marketplace section
- May display featured content, categories, or navigation to level pages

---

## Level 1 Pages

### `app/(group)/(group)/level-1/`

#### `level-1/all/page.tsx`
**Purpose**: Displays all items (projects, services, talent, teams) for Level 1 category.

**Features**:
- Comprehensive listing of all available items
- Filtering and sorting capabilities
- Search functionality
- Grid/list view toggle
- Pagination support

---

#### `level-1/projects/page.tsx`
**Purpose**: Projects listing page specifically for Level 1 category.

**Key Features**:
- **Hero Section**: Large banner image with category title and description
- **Category Browsing**: Grid of project categories (Front-end Development, etc.)
- **Featured Projects Tab**: Displays top projects with filtering options:
  - Featured
  - Newest
  - Most Popular
  - Trending
  - Top-Rated
- **Project Cards**: Each card displays:
  - Project thumbnail image
  - Project title and rating
  - Description
  - Delivery time
  - Budget/price
  - Team avatars
  - Favorite/save functionality
- **Project Type Filtering**: Tabs for filtering by:
  - Project Type
  - Industry
  - Budget
  - Project Length
  - Team Size
- **Skills Browsing**: Badge-based skill filtering
- **Technology Grid**: Technology stack icons and names
- **Recommended Projects**: Tabbed section with category-specific recommendations
- **Blog/Guides Section**: Related articles and guides
- **Newsletter Signup**: Email subscription form

**Data Fetching**:
- Uses `getCategoryPage` API function
- Fetches data from category API endpoint
- Displays loading states during data fetch
- Handles empty states when no projects found

**Components Used**:
- NextImage for optimized images
- NextLink for client-side navigation
- Tabs from Radix UI
- Avatar components for team display
- Favorite component for saving projects
- Tooltip components for additional information

---

#### `level-1/projects/api-wrapper.tsx`
**Purpose**: API wrapper component for handling project-related API calls.

**Functionality**:
- Encapsulates API logic for projects
- Provides reusable API functions
- Handles error states
- Manages loading states
- May include caching or data transformation logic

---

#### `level-1/services/page.tsx`
**Purpose**: Services listing page for Level 1 category.

**Key Features**:
- Similar structure to projects page but focused on services
- Service cards with:
  - Service thumbnail
  - Service title and description
  - Pricing information
  - Service provider information
  - Rating and reviews
- Service category filtering
- Featured services section
- Service type tabs (similar to projects)
- Related services recommendations
- Newsletter signup section

**Layout**:
- Hero banner with category information
- Grid layout for service cards
- Filtering and sorting options
- Responsive design

---

#### `level-1/talent/page.tsx`
**Purpose**: Talent/individuals listing page for Level 1 category.

**Key Features**:
- Talent profile cards displaying:
  - Profile picture/avatar
  - Name and username
  - Professional title/role
  - Location (with MarkerPin icon)
  - Hourly rate (with Money icon)
  - Rating and review count
  - Skills and expertise tags
  - Portfolio samples
- Talent search and filtering:
  - By skills
  - By location
  - By rate range
  - By availability
- Featured talent section
- Talent category tabs
- Browse by skills section
- Technology expertise grid
- Related guides section
- Newsletter signup

**Components**:
- Avatar components for profile pictures
- Star ratings
- Location markers
- Skill badges
- Favorite functionality

---

#### `level-1/teams/page.tsx`
**Purpose**: Teams listing page for Level 1 category.

**Key Features**:
- Team profile cards showing:
  - Team logo/thumbnail
  - Team name and description
  - Team size
  - Team members (avatar group)
  - Team rating
  - Portfolio projects
  - Technology stack
  - Budget range
- Team filtering:
  - By team size
  - By technology stack
  - By industry
  - By location
- Featured teams section
- Team category tabs
- Browse by technology section
- Related guides
- Newsletter signup

**Components**:
- AvatarGroup for displaying multiple team members
- Brand icons (Adobe, etc.)
- Team portfolio showcases
- Rating displays

---

## Level 2 Pages

### `app/(group)/(group)/level-2/`

#### `level-2/all/page.tsx`
**Purpose**: Displays all items for Level 2 category.

**Features**:
- Similar to level-1/all but with Level 2 specific data
- May have different filtering or sorting options
- Level 2 category-specific content

---

#### `level-2/projects/page.tsx`
**Purpose**: Projects listing page for Level 2 category.

**Key Differences from Level 1**:
- Server-side rendered (no 'use client' directive)
- May have different project categories
- Different featured projects
- Level 2 specific filtering options
- Similar UI structure but with Level 2 data

**Features**:
- Hero banner
- Category browsing
- Featured projects tabs
- Project filtering
- Skills browsing
- Technology grid
- Recommended projects
- Blog guides
- Newsletter signup

---

#### `level-2/services/page.tsx`
**Purpose**: Services listing page for Level 2 category.

**Features**:
- Level 2 specific services
- Service cards with pricing
- Service category filtering
- Featured services
- Related content

---

#### `level-2/talent/page.tsx`
**Purpose**: Talent listing page for Level 2 category.

**Features**:
- Level 2 specific talent profiles
- Talent search and filtering
- Featured talent section
- Skills and technology expertise
- Related guides

---

#### `level-2/teams/page.tsx`
**Purpose**: Teams listing page for Level 2 category.

**Features**:
- Level 2 specific team profiles
- Team filtering options
- Featured teams
- Technology stack browsing
- Related content

---

## Level 3 Pages

### `app/(group)/(group)/level-3/`

#### `level-3/all/page.tsx`
**Purpose**: Displays all items for Level 3 category.

**Features**:
- Most specific category level
- All items aggregated view
- Level 3 specific filtering

---

#### `level-3/projects/page.tsx`
**Purpose**: Projects listing page for Level 3 category.

**Key Features**:
- **Sidebar Integration**: Includes search sidebar component
- **Grid/List View Toggle**: Users can switch between grid and list views
- **Filter Dropdown**: Advanced filtering options
- **Level 3 Specific Projects**: Most granular project category
- Similar structure to other levels but with sidebar navigation

**Unique Components**:
- `Sidebar` component from search route
- `ToggleGroup` for view switching (Grid/List)
- `Filter` icon component
- `DropdownIcon` for filter dropdowns

**Layout**:
- Two-column layout with sidebar
- Main content area with projects
- Filter controls at top
- View toggle buttons

---

#### `level-3/talent/page.tsx`
**Purpose**: Talent listing page for Level 3 category.

**Features**:
- Most specific talent category
- Level 3 specific talent profiles
- Advanced filtering
- Featured talent
- Skills browsing

---

#### `level-3/teams/page.tsx`
**Purpose**: Teams listing page for Level 3 category.

**Features**:
- Most specific team category
- Level 3 specific team profiles
- Advanced team filtering
- Featured teams
- Technology expertise

---

## Common Patterns Across All Levels

### Shared Components
All level pages share common UI components:
- **Hero Banners**: Category-specific hero images with titles
- **Tabs**: For filtering and categorization (Featured, Newest, Most Popular, etc.)
- **Cards**: Consistent card design for items (projects, services, talent, teams)
- **Avatars**: For displaying team members and talent
- **Badges**: For skills, categories, and tags
- **Buttons**: Consistent button styling throughout
- **Icons**: From `@blend-metrics/icons` library
- **Images**: Optimized Next.js Image components
- **Links**: Next.js Link components for navigation

### Shared Features
- **Search Functionality**: All pages support searching
- **Filtering**: Multiple filter options (category, type, budget, etc.)
- **Sorting**: Various sorting options (newest, popular, trending)
- **Pagination**: For large datasets
- **Favorites**: Save items to favorites
- **Ratings**: Display ratings and reviews
- **Newsletter**: Email subscription forms
- **Related Content**: Blog posts and guides

### Data Fetching Patterns
- Client-side data fetching with `useState` and `useEffect`
- API wrapper components for reusable logic
- Loading states with skeleton screens
- Error handling
- Empty state handling

### Styling
- Tailwind CSS for styling
- Consistent color scheme (dark-blue-400, primary-500, etc.)
- Responsive design (mobile, tablet, desktop)
- Custom scrollbars
- Smooth transitions and animations

---

## Route Structure

### URL Patterns
- Level 1: `/level-1/projects`, `/level-1/services`, `/level-1/talent`, `/level-1/teams`, `/level-1/all`
- Level 2: `/level-2/projects`, `/level-2/services`, `/level-2/talent`, `/level-2/teams`, `/level-2/all`
- Level 3: `/level-3/projects`, `/level-3/talent`, `/level-3/teams`, `/level-3/all`

### Next.js Route Groups
- `(group)` folders are Next.js route groups that don't affect the URL structure
- They allow for organizing routes without adding segments to the URL
- Used for layout organization and code splitting

---

## Best Practices

1. **Component Reusability**: Common components are extracted and reused across levels
2. **Consistent UI**: All pages follow the same design patterns
3. **Performance**: Images are optimized with Next.js Image component
4. **Accessibility**: Proper semantic HTML and ARIA attributes
5. **Responsive Design**: Mobile-first approach with breakpoints
6. **Loading States**: Skeleton screens and loading indicators
7. **Error Handling**: Graceful error states and fallbacks
8. **SEO**: Proper metadata and semantic HTML structure

---

## Future Enhancements

Potential improvements for the folder structure:
1. Extract common page components into shared components
2. Create reusable hooks for data fetching
3. Implement proper TypeScript types for all data structures
4. Add unit tests for components
5. Implement proper error boundaries
6. Add analytics tracking for user interactions
7. Optimize bundle size with code splitting
8. Add internationalization (i18n) support

---

## Notes

- The `(group)` folders are Next.js route groups and don't appear in the URL
- All pages are client components unless specified otherwise
- The structure allows for easy scaling and adding new levels
- Each level can have different features while maintaining consistency
- The layout components provide shared UI elements across routes

---

# Source Code Structure (`src/` Directory)

## Overview
The `src/` directory contains the core business logic, API integrations, data fetching utilities, and shared features that power the application. This section documents how these modules connect to and support the app folder structure, particularly the level-1, level-2, and level-3 pages.

## Folder Hierarchy

```
src/
├── api/
│   └── user.ts                          # User-related API functions
├── crypto/                               # End-to-end encryption utilities
│   ├── backup.ts                         # Key backup functionality
│   ├── e2ee.ts                           # E2EE encryption/decryption
│   ├── indexedDb.ts                     # IndexedDB key storage
│   ├── keys.ts                           # Key management utilities
│   └── storage.ts                        # Local storage for keys
├── features/                             # Feature-based modules
│   ├── category-pages/                  # Category page feature
│   │   ├── api.ts                        # Category page API client
│   │   └── hook.ts                       # React Query hooks for category pages
│   └── shared/                          # Shared features
│       └── query-provider.tsx            # React Query provider setup
├── hooks/                                # Custom React hooks
│   ├── useConversationKey.ts            # Conversation key management hook
│   ├── useMessage.ts                     # Message handling hook
│   └── useSendMessage.ts                 # Message sending hook
└── lib/                                  # Core library utilities
    ├── api/                              # API utilities
    │   └── category-pages.ts             # Legacy category pages API (Axios-based)
    ├── api.ts                            # Base API fetch utility
    ├── http.ts                           # HTTP client factory
    └── jwt.ts                            # JWT parsing utilities
```

---

## `src/lib/` - Core Library Utilities

### `src/lib/api.ts`
**Purpose**: Base API fetch utility providing a simple wrapper around the native `fetch` API.

**Key Features**:
- Configurable base URL via `NEXT_PUBLIC_API_BASE_URL` environment variable
- Automatic JSON serialization/deserialization
- Content-Type header management
- Error handling with status codes
- Type-safe generic responses

**Function**:
```typescript
apiFetch<T>(path: string, options?: FetchOpts): Promise<T>
```

**Usage**:
- Used by other API modules as a foundation
- Provides consistent error handling across API calls
- Used in `src/api/user.ts` for user-related API calls

**Connection to App Levels**:
- Indirectly used through higher-level API modules
- Provides the foundation for all API communication

---

### `src/lib/http.ts`
**Purpose**: HTTP client factory that creates a configurable HTTP client with authentication support.

**Key Features**:
- **Configurable Base URL**: Uses `NEXT_PUBLIC_API_BASE_URL` or defaults to `http://localhost:3002/api`
- **Token Management**: Optional token getter function for authentication
- **Automatic Headers**: Sets Content-Type and Authorization headers
- **HTTP Methods**: Provides `get`, `post`, `patch`, `del` methods
- **Error Handling**: Throws descriptive errors with status codes
- **Credentials**: Includes credentials for cookie-based auth

**Exported Functions**:
- `createHttp(config?)`: Factory function to create HTTP client instances
- `http`: Default HTTP client instance (singleton)

**Type Safety**:
- Generic type parameters for request/response types
- TypeScript interfaces for configuration

**Connection to App Levels**:
- **Primary HTTP Client**: Used by `src/features/category-pages/api.ts` for all category page API calls
- **Level-Specific Endpoints**: Supports different endpoints for L1, L2, L3:
  - L1: `/category-pages/{l1}`
  - L2: `/category-pages/{l1}/{l2}`
  - L3: `/category-pages/{l1}/{l2}/{l3}`

**Example Usage**:
```typescript
// Used in CategoryPagesAPI
http.get<CategoryPageData>(`/category-pages/${l1}`)
```

---

### `src/lib/jwt.ts`
**Purpose**: JWT token parsing utility for extracting payload data from JWT tokens.

**Key Features**:
- Parses JWT without verification (client-side only)
- Handles Base64-URL encoding/decoding
- UTF-8 decoding for payload
- Type-safe payload extraction

**Function**:
```typescript
parseJwt<T>(token: string): T
```

**Usage**:
- Used for extracting user information from authentication tokens
- Can be used in authentication contexts
- Extracts claims and user data from JWT payloads

**Connection to App Levels**:
- Used in authentication flows
- May be used to determine user permissions for accessing different levels

---

### `src/lib/api/category-pages.ts` (Legacy)
**Purpose**: Legacy category pages API implementation using Axios.

**Key Features**:
- **Axios-based**: Uses Axios instead of native fetch
- **Direct API Calls**: Makes direct calls to backend API
- **Type Definitions**: Defines `BlockItem`, `ContentBlock`, and `CategoryPageResponse` interfaces
- **Error Handling**: Returns `null` on error with console logging

**Interfaces**:
- `BlockItem`: Represents individual items (projects, services, talent, teams)
  - Contains: id, title, slug, type, thumbnail, description, creator, rating, reviews, tags, price, deliveryTime
- `ContentBlock`: Represents a block of content with items
  - Contains: type, title, description, items array, hasMore flag, totalCount
- `CategoryPageResponse`: Complete category page response structure
  - Contains: category, breadcrumbs, parent, children, siblings, relatedCategories, tags, blocks

**Function**:
```typescript
getCategoryPage(slug: string): Promise<CategoryPageResponse | null>
```

**API Endpoint**:
- `GET ${API_BASE_URL}/category-pages/${slug}`
- Default base URL: `http://localhost:3002/api`

**Connection to App Levels**:
- **Currently Used In**: 
  - `app/(group)/(group)/level-1/projects/page.tsx` - Direct import and usage
  - `app/(group)/(group)/level-1/projects/api-wrapper.tsx` - Used in wrapper component
- **Usage Pattern**: 
  ```typescript
  import { getCategoryPage, type BlockItem } from '../../../../../src/lib/api/category-pages';
  const data = await getCategoryPage('creative');
  ```
- **Data Flow**: 
  1. Component calls `getCategoryPage('creative')`
  2. Function makes Axios GET request
  3. Returns category page data with blocks
  4. Component extracts items from blocks and displays them

**Migration Note**: This is a legacy implementation. The newer implementation in `src/features/category-pages/api.ts` should be preferred for new code.

---

## `src/features/` - Feature-Based Modules

### `src/features/category-pages/api.ts`
**Purpose**: Modern category pages API client with level-specific methods.

**Key Features**:
- **Level-Specific Methods**: Separate methods for L1, L2, L3
- **Query Parameters**: Supports filtering via query params (kind, cursor, limit)
- **Type-Safe**: Full TypeScript type definitions
- **Uses HTTP Client**: Built on top of `src/lib/http.ts`

**Type Definitions**:
- `CategoryPageData`: Comprehensive type definition including:
  - `category`: Category information with UUID, name, slug, SEO data
  - `breadcrumbs`: Navigation breadcrumb array
  - `parent`: Parent category information
  - `children`: Child categories array
  - `siblings`: Sibling categories array
  - `blocks`: Content blocks with items, pagination, viewMoreUrl
  - `suggestions`: Related, trending, popular categories and skills
  - `editorial`: Hero content, guides, courses, FAQ

**API Methods**:

1. **`getL1(l1: string, params?)`**
   - Endpoint: `/category-pages/{l1}`
   - Query params: `kind`, `cursor`, `limit`
   - Returns: `Promise<CategoryPageData>`
   - Used for: Level 1 category pages

2. **`getL2(l1: string, l2: string, params?)`**
   - Endpoint: `/category-pages/{l1}/{l2}`
   - Query params: `kind`, `cursor`, `limit`
   - Returns: `Promise<CategoryPageData>`
   - Used for: Level 2 category pages

3. **`getL3(l1: string, l2: string, l3: string, params?)`**
   - Endpoint: `/category-pages/{l1}/{l2}/{l3}`
   - Query params: `kind`, `cursor`, `limit`
   - Returns: `Promise<CategoryPageData>`
   - Used for: Level 3 category pages

**Query Parameters**:
- `kind`: Filter by item type (projects, services, talent, teams)
- `cursor`: Pagination cursor for infinite scroll
- `limit`: Number of items to return

**Connection to App Levels**:
- **Designed for**: All three levels (L1, L2, L3)
- **Ready for Integration**: Can be used in level-1, level-2, level-3 pages
- **Current Status**: Available but not yet fully integrated (legacy API still in use)

---

### `src/features/category-pages/hook.ts`
**Purpose**: React Query hooks for category pages with caching and state management.

**Key Features**:
- **React Query Integration**: Uses `@tanstack/react-query` for data fetching
- **Automatic Caching**: Query keys ensure proper cache invalidation
- **Level-Specific Hooks**: Separate hooks for each level
- **Type Safety**: Full TypeScript support

**Query Keys Structure**:
- L1: `["category-page", "l1", l1, params]`
- L2: `["category-page", "l2", l1, l2, params]`
- L3: `["category-page", "l3", l1, l2, l3, params]`

**Hooks**:

1. **`useCategoryPageL1(l1, params?)`**
   - Uses: `CategoryPagesAPI.getL1()`
   - Returns: `UseQueryResult<CategoryPageData>`
   - Features: Automatic refetching, caching, loading states
   - Usage: For Level 1 pages

2. **`useCategoryPageL2(l1, l2, params?)`**
   - Uses: `CategoryPagesAPI.getL2()`
   - Returns: `UseQueryResult<CategoryPageData>`
   - Features: Automatic refetching, caching, loading states
   - Usage: For Level 2 pages

3. **`useCategoryPageL3(l1, l2, l3, params?)`**
   - Uses: `CategoryPagesAPI.getL3()`
   - Returns: `UseQueryResult<CategoryPageData>`
   - Features: Automatic refetching, caching, loading states
   - Usage: For Level 3 pages

**Benefits**:
- **Automatic Loading States**: `isLoading`, `isError`, `isSuccess` flags
- **Caching**: Prevents unnecessary API calls
- **Refetching**: Automatic refetch on window focus (configurable)
- **Error Handling**: Built-in error states
- **Type Safety**: Full TypeScript inference

**Connection to App Levels**:
- **Recommended Usage**: Should replace direct API calls in level pages
- **Integration Example**:
  ```typescript
  // In level-1/projects/page.tsx
  const { data, isLoading, error } = useCategoryPageL1('creative', { kind: 'projects' });
  ```
- **Future Migration**: All level pages should migrate to using these hooks

---

### `src/features/shared/query-provider.tsx`
**Purpose**: React Query provider component that wraps the application for data fetching.

**Key Features**:
- **QueryClient Setup**: Creates and manages React Query client
- **Default Options**: Configures retry logic and refetch behavior
- **Singleton Pattern**: Creates client once and reuses it
- **Global Configuration**: Sets app-wide query defaults

**Configuration**:
- `retry: 2`: Retries failed queries twice
- `refetchOnWindowFocus: false`: Prevents refetch on window focus

**Connection to App Levels**:
- **Used In**: `app/layout.tsx` - Wraps entire application
- **Provides**: Query context for all level pages
- **Enables**: React Query hooks to work throughout the app
- **Required For**: `useCategoryPageL1`, `useCategoryPageL2`, `useCategoryPageL3` hooks

**Usage**:
```typescript
// In app/layout.tsx
<QueryProvider>
  {children}
</QueryProvider>
```

---

## `src/api/` - API Functions

### `src/api/user.ts`
**Purpose**: User-related API functions, specifically for messaging and encryption.

**Key Features**:
- **Public Key Retrieval**: Fetches recipient's public key for encryption
- **Uses Base API**: Built on `src/lib/api.ts` (`apiFetch`)
- **Authentication**: Supports Bearer token authentication
- **Type Safety**: TypeScript types for request/response

**Function**:
```typescript
getRecipientPublicKey(userId: string, token: string): Promise<string>
```

**API Endpoint**:
- `GET /api/messaging/keys/{userId}/public-key`
- Headers: `Authorization: Bearer {token}`

**Connection to App Levels**:
- **Used In**: Messaging/chat features (inbox functionality)
- **Not Directly Related**: To level-1, level-2, level-3 pages
- **Purpose**: Supports end-to-end encryption for user communications

---

## `src/crypto/` - Encryption Utilities

### Overview
The `src/crypto/` directory contains utilities for end-to-end encryption (E2EE) functionality, primarily used for secure messaging.

### `src/crypto/e2ee.ts`
**Purpose**: End-to-end encryption functions for message encryption/decryption.

**Key Features**:
- **RSA-OAEP Encryption**: Uses RSA-OAEP algorithm for encryption
- **Message Encryption**: Encrypts plain text with recipient's public key
- **Message Decryption**: Decrypts cipher text with private key
- **Key Wrapping**: Wraps/unwraps AES keys with RSA keys

**Functions**:
- `encryptMessage(plainText, recipientPublicKey)`: Encrypts a message
- `decryptMessage(cipherText, privateKey)`: Decrypts a message
- `encryptWithPublicKey(data, publicKeyPem)`: Encrypts with PEM public key
- `decryptWithPrivateKey(cipherText, privateKeyPem)`: Decrypts with PEM private key

**Connection to App Levels**:
- **Not Directly Related**: To level-1, level-2, level-3 pages
- **Used In**: Messaging/chat features for secure communication

---

### `src/crypto/storage.ts`
**Purpose**: Local storage utilities for persisting encryption keys.

**Key Features**:
- **Key Persistence**: Saves AES keys to localStorage
- **Key Retrieval**: Loads keys from localStorage
- **Conversation-Specific**: Keys are stored per conversation ID

**Functions**:
- `saveKey(convId, rawKeyB64)`: Saves Base64-encoded AES key
- `loadKey(convId)`: Loads and decodes AES key

**Connection to App Levels**:
- **Not Directly Related**: To level-1, level-2, level-3 pages
- **Used In**: Messaging features for key management

---

## `src/hooks/` - Custom React Hooks

### `src/hooks/useConversationKey.ts`
**Purpose**: React hook for managing conversation encryption keys.

**Key Features**:
- **Key Unwrapping**: Unwraps encrypted conversation keys
- **Key Storage**: Automatically saves keys to IndexedDB
- **State Management**: Manages key state in component
- **Effect-Based**: Uses useEffect for key initialization

**Connection to App Levels**:
- **Not Directly Related**: To level-1, level-2, level-3 pages
- **Used In**: Messaging/chat features

---

## API Connection Flow: How `src/` Links to App Folder Levels

### Current Implementation (Level 1)

**Flow Diagram**:
```
app/(group)/(group)/level-1/projects/page.tsx
    ↓ (imports)
src/lib/api/category-pages.ts
    ↓ (calls)
Backend API: GET /category-pages/{slug}
    ↓ (returns)
CategoryPageResponse with blocks
    ↓ (extracts)
BlockItem[] array
    ↓ (displays)
Project cards in UI
```

**Step-by-Step**:

1. **Component Import**:
   ```typescript
   // In level-1/projects/page.tsx
   import { getCategoryPage, type BlockItem } from '../../../../../src/lib/api/category-pages';
   ```

2. **Data Fetching**:
   ```typescript
   useEffect(() => {
     async function fetchData() {
       const data = await getCategoryPage('creative');
       // Extract items from blocks
       const allItems = data.blocks.flatMap(block => block.items);
       setProjects(allItems);
     }
     fetchData();
   }, []);
   ```

3. **API Call**:
   - `getCategoryPage('creative')` makes Axios GET request
   - Endpoint: `http://localhost:3002/api/category-pages/creative`
   - Returns: `CategoryPageResponse` with blocks containing items

4. **Data Transformation**:
   - Extracts all items from all blocks
   - Filters/transforms as needed
   - Sets state with `BlockItem[]` array

5. **UI Rendering**:
   - Maps over projects array
   - Renders project cards with data
   - Shows loading/error states

---

### Recommended Implementation (All Levels)

**Flow Diagram**:
```
app/(group)/(group)/level-{1,2,3}/projects/page.tsx
    ↓ (uses hook)
src/features/category-pages/hook.ts
    ↓ (uses API)
src/features/category-pages/api.ts
    ↓ (uses HTTP client)
src/lib/http.ts
    ↓ (makes request)
Backend API: GET /category-pages/{l1}/{l2}/{l3}
    ↓ (returns)
CategoryPageData
    ↓ (React Query caches)
Cached data with loading/error states
    ↓ (component uses)
UI renders with data
```

**Step-by-Step**:

1. **Component Setup**:
   ```typescript
   // In level-1/projects/page.tsx
   import { useCategoryPageL1 } from '@/features/category-pages/hook';
   
   export default function Projects() {
     const { data, isLoading, error } = useCategoryPageL1('creative', { 
       kind: 'projects',
       limit: 20 
     });
     
     if (isLoading) return <Loading />;
     if (error) return <Error />;
     
     // Use data.blocks to render items
   }
   ```

2. **Hook Execution**:
   - `useCategoryPageL1` calls `CategoryPagesAPI.getL1()`
   - React Query manages caching and state

3. **API Call**:
   - `CategoryPagesAPI.getL1()` uses `http.get()` from `src/lib/http.ts`
   - Makes authenticated request to backend
   - Handles errors automatically

4. **Data Flow**:
   - Backend returns `CategoryPageData`
   - React Query caches the response
   - Component receives data with loading/error states
   - Automatic refetching on dependency changes

---

### Level-Specific API Endpoints

**Level 1**:
- **Endpoint**: `/category-pages/{l1}`
- **Example**: `/category-pages/creative`
- **Method**: `CategoryPagesAPI.getL1('creative')`
- **Hook**: `useCategoryPageL1('creative')`

**Level 2**:
- **Endpoint**: `/category-pages/{l1}/{l2}`
- **Example**: `/category-pages/creative/web-design`
- **Method**: `CategoryPagesAPI.getL2('creative', 'web-design')`
- **Hook**: `useCategoryPageL2('creative', 'web-design')`

**Level 3**:
- **Endpoint**: `/category-pages/{l1}/{l2}/{l3}`
- **Example**: `/category-pages/creative/web-design/responsive`
- **Method**: `CategoryPagesAPI.getL3('creative', 'web-design', 'responsive')`
- **Hook**: `useCategoryPageL3('creative', 'web-design', 'responsive')`

---

### Query Parameters

All levels support the same query parameters:

- **`kind`**: Filter by item type
  - Values: `'projects'`, `'services'`, `'talent'`, `'teams'`
  - Example: `{ kind: 'projects' }`

- **`cursor`**: Pagination cursor
  - Used for infinite scroll
  - Example: `{ cursor: 'abc123' }`

- **`limit`**: Number of items
  - Controls pagination size
  - Example: `{ limit: 20 }`

**Usage Example**:
```typescript
useCategoryPageL1('creative', {
  kind: 'projects',
  cursor: 'next-page-token',
  limit: 20
})
```

---

## Data Structure Flow

### Request Flow
```
Component (Level Page)
  → Hook (useCategoryPageL1/L2/L3)
    → API Client (CategoryPagesAPI)
      → HTTP Client (http.get)
        → Backend API
```

### Response Flow
```
Backend API
  → HTTP Client (parses JSON)
    → API Client (returns CategoryPageData)
      → React Query (caches & manages state)
        → Hook (returns UseQueryResult)
          → Component (renders UI)
```

### Data Transformation
```
CategoryPageData
  ├── category (category info)
  ├── breadcrumbs (navigation)
  ├── blocks[] (content blocks)
  │   └── items[] (actual items: projects/services/talent/teams)
  ├── suggestions (related content)
  └── editorial (guides, FAQ, etc.)
```

---

## Migration Path: Legacy to Modern API

### Current State (Legacy)
- **Used In**: `level-1/projects/page.tsx`, `level-1/projects/api-wrapper.tsx`
- **Implementation**: Direct import of `getCategoryPage` from `src/lib/api/category-pages.ts`
- **Issues**: 
  - No caching
  - Manual loading state management
  - No automatic refetching
  - Axios dependency

### Target State (Modern)
- **Should Use**: `useCategoryPageL1/L2/L3` hooks from `src/features/category-pages/hook.ts`
- **Benefits**:
  - Automatic caching
  - Built-in loading/error states
  - Automatic refetching
  - Type-safe
  - Uses modern fetch API

### Migration Steps:
1. Replace direct API calls with hooks
2. Remove manual `useState`/`useEffect` for data fetching
3. Use React Query's loading/error states
4. Update to use `CategoryPageData` type instead of `CategoryPageResponse`
5. Remove Axios dependency from components

---

## Summary: Key Connections

### Direct Connections
1. **Level 1 Projects** → `src/lib/api/category-pages.ts` (legacy, currently used)
2. **All Levels** → `src/features/category-pages/hook.ts` (recommended, ready to use)
3. **HTTP Client** → `src/lib/http.ts` (used by modern API)
4. **Query Provider** → `src/features/shared/query-provider.tsx` (required for hooks)

### Indirect Connections
1. **Authentication** → `src/lib/jwt.ts` (for user context)
2. **Base API** → `src/lib/api.ts` (foundation for other APIs)
3. **Messaging** → `src/crypto/`, `src/hooks/` (not related to levels)

### Best Practices
1. **Use Hooks**: Prefer `useCategoryPageL1/L2/L3` over direct API calls
2. **Type Safety**: Use TypeScript types from API modules
3. **Error Handling**: Leverage React Query's error states
4. **Caching**: Let React Query handle caching automatically
5. **Loading States**: Use React Query's loading flags

---

## Future Enhancements

1. **Complete Migration**: Migrate all level pages to use React Query hooks
2. **Remove Legacy Code**: Deprecate `src/lib/api/category-pages.ts` once migration complete
3. **Add More Hooks**: Create hooks for other API endpoints
4. **Error Boundaries**: Add error boundaries for better error handling
5. **Optimistic Updates**: Implement optimistic updates for mutations
6. **Infinite Scroll**: Add infinite scroll support using cursor pagination
7. **Real-time Updates**: Consider WebSocket integration for real-time data

