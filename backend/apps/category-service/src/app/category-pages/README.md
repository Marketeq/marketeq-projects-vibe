# Category Pages Module.

**Developer**: Lokesh Para  
**Status**: Complete - Ready for Integration

---

## Quick Start
```bash
# Build the service
npx tsc -p apps/category-service/tsconfig.app.json --outDir dist/apps/category-service
# Start the service
set port=3002 && node dist/apps/category-service/main.js

# Test endpoints
curl http://localhost:3000/api/category-pages/creative
curl http://localhost:3000/api/category-pages/creative/ui-design
curl http://localhost:3000/api/category-pages/creative/ui-design/mobile-ui
```

---

## What Was Implemented

### Complete Feature List

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Level Paths** | Support for L1, L2, L3 category hierarchy | Complete |
| **Dynamic Content Blocks** | Blocks assembled from taxonomy rules | Complete |
| **Cursor Pagination** | Opaque base64url tokens, per-block independent pagination | Complete |
| **Suggestions Engine** | Related, trending, popular categories + skills | Complete |
| **Editorial Content** | Hero, guides, courses, FAQ support | Complete |
| **Navigation** | Breadcrumbs, parent, children, siblings | Complete |
| **Adapter Pattern** | Clean interfaces for external services | Complete |
| **Mock Implementations** | Fully functional with realistic test data | Complete |
| **Error Handling** | 404 for missing categories, 500 masking | Complete |

---

## API Endpoints

### GET /api/category-pages/:l1

Root level category page.

**Example**: `GET /api/category-pages/creative`

**Query Parameters**:
- `kind` - Filter blocks: `show-all`, `projects`, `services`, `teams`, `talent` (default: `show-all`)
- `cursor` - Pagination cursor (opaque token)
- `limit` - Items per block, max 10 (default: 10)

---

### GET /api/category-pages/:l1/:l2

Child level category page.

**Example**: `GET /api/category-pages/creative/ui-design`

**Features**:
- 2-level breadcrumb trail
- Parent category linked
- Child categories included

---

### GET /api/category-pages/:l1/:l2/:l3

Grandchild level category page.

**Example**: `GET /api/category-pages/creative/ui-design/mobile-ui`

**Features**:
- 3-level breadcrumb trail
- Full hierarchy navigation
- Leaf node support

---

### POST /api/category-pages/cms-sync

Webhook endpoint for CMS (Payload) category/tag synchronization. Requires `x-service-token` header.

---

## Response Structure
```json
{
  "category": {
    "uuid": "7ju-pzj",
    "name": "Creative",
    "slug": "creative",
    "seo": {
      "title": "Creative Projects & Talent",
      "description": "..."
    },
    "approved": false,
    "publishedInMarketplace": true,
    "createdAt": "2025-10-13T20:47:50.548Z",
    "updatedAt": "2025-10-16T01:00:00.779Z"
  },
  "breadcrumbs": [
    { "uuid": "7ju-pzj", "name": "Creative", "slug": "creative" }
  ],
  "parent": null,
  "children": [
    { "uuid": "cs6-eek", "name": "UI Design", "slug": "ui-design" }
  ],
  "siblings": [],
  "relatedCategories": [],
  "tags": [],
  "blocks": [
    {
      "key": "rule-0",
      "type": "grid",
      "entity": "projects",
      "title": "Top Rated",
      "description": "Highest rated",
      "items": [
        {
          "id": "project-1",
          "title": "Mock Project 1",
          "rating": 4.5,
          "reviewCount": 41,
          "price": 967
        }
      ],
      "pagination": {
        "nextCursor": "eyJpZCI6InByb2plY3QtMTAi...",
        "hasMore": true
      },
      "viewMoreUrl": "/api/category-pages/7ju-pzj?kind=projects",
      "gridSize": 12,
      "carousel": false
    }
  ],
  "suggestions": {
    "relatedCategories": [
      {
        "uuid": "cs6-eek",
        "level": 2,
        "name": "UI Design",
        "slugPath": ["creative", "ui-design"],
        "link": "/c/creative/ui-design"
      }
    ],
    "trendingCategories": [...],
    "popularCategories": [...],
    "relatedSkills": [
      {
        "name": "Mobile UI",
        "slug": "mobile-ui",
        "link": "/skills/mobile-ui"
      }
    ]
  },
  "editorial": {
    "seoOverride": {
      "title": "Explore Top Talent & Projects",
      "description": "...",
      "canonical": "https://marketplace.com/c/creative"
    },
    "hero": {
      "title": "Discover Amazing Talent & Projects",
      "subtitle": "Browse thousands of portfolios",
      "image": "https://images.unsplash.com/...",
      "link": "/guides/getting-started"
    },
    "guides": [
      {
        "id": "guide-1",
        "title": "Getting Started Guide",
        "description": "...",
        "link": "/guides/getting-started",
        "thumbnail": "https://images.unsplash.com/..."
      }
    ],
    "courses": [...],
    "faq": [
      {
        "question": "What is this category about?",
        "answer": "..."
      }
    ]
  }
}
```

---

## Architecture
### System Overview
```
┌─────────────┐
│  Frontend   │
│  (Next.js)  │
└──────┬──────┘
       │ GET /api/category-pages/:slug
       │
┌──────▼────────────────────────────┐
│   NestJS Category Service         │
│                                   │
│  ┌─────────────────────────────┐ │
│  │  CategoryPagesController    │ │
│  └──────────┬──────────────────┘ │
│             │                     │
│  ┌──────────▼──────────────────┐ │
│  │  CategoryPagesService       │ │
│  └──┬────┬────┬────┬───────────┘ │
│     │    │    │    │              │
│  ┌──▼──┐ │ ┌──▼──┐ │             │
│  │CMS  │ │ │List │ │ ┌────────┐ │
│  │Adapt│ │ │ing  │ │ │Suggest.│ │
│  │er   │ │ │Mock │ │ │Mock    │ │
│  └─────┘ │ └─────┘ │ └────────┘ │
│       ┌──▼──┐   ┌──▼──┐          │
│       │User │   │Eval │          │
│       │Mock │   │Fact.│          │
│       └─────┘   └─────┘          │
└───────────────────────────────────┘
```


### Adapter Pattern Implementation

All external dependencies abstracted behind adapter interfaces for easy integration.

**Adapters Implemented**:

| Adapter | Purpose | Status |
|---------|---------|--------|
| **CmsAdapter** | Fetch taxonomy rules and editorial content |  Interface + Mock + Real |
| **ListingAdapter** | Fetch projects, services, teams |  Interface + Mock |
| **UserAdapter** | Fetch talent profiles |  Interface + Mock |
| **SuggestionsAdapter** | Generate category and skill recommendations |  Interface + Mock |

**Current State**: All adapters use mock implementations with realistic test data.  
**Integration Ready**: Replace mocks with real HTTP clients pointing to production services.

---

### File Structure
```
src/category-pages/
├── adapters/
│   ├── listing.adapter.ts              # Interface
│   ├── listing.adapter.mock.ts         # Mock (50 items each)
│   ├── cms.adapter.ts                  # Interface
│   ├── cms.adapter.mock.ts             # Mock (taxonomy + editorial)
│   ├── cms.adapter.real.ts             # Real (Payload CMS REST API)
│   ├── user.adapter.ts                 # Interface
│   └── user.adapter.mock.ts            # Mock (talent profiles)
├── evaluators/
│   ├── evaluator-factory.ts            # Rule execution engine
│   ├── mock-data.ts                    # Test data generators
│   └── types.ts                        # Block/Item types
├── suggestions/
│   ├── suggestions.adapter.ts          # Interface
│   └── suggestions.adapter.mock.ts     # Heuristic-based logic
├── types/
│   ├── editorial.types.ts              # Editorial content types
│   ├── suggestions.types.ts            # Suggestion types
│   └── taxonomy.types.ts               # Rule, TaxonomyGroup, Block types
├── utils/
│   └── cursor.utils.ts                 # Pagination encoding/decoding
├── category-pages.controller.ts        # HTTP endpoints
├── category-pages.module.ts            # DI configuration
└── category-pages.service.ts           # Business logic
```

---

## Key Implementation Details

### 1. Multi-Level Path Resolution

**Challenge**: NestJS doesn't support multiple `@Get()` decorators on one method.

**Solution**: Created three separate route handlers (`L1`, `L2`, `L3`) that call shared business logic.
```typescript
// Three route handlers
@Get(':l1')
getCategoryPageL1(@Param('l1') l1: string) { ... }

@Get(':l1/:l2')
getCategoryPageL2(@Param('l1') l1, @Param('l2') l2) { ... }

@Get(':l1/:l2/:l3')
getCategoryPageL3(@Param('l1') l1, @Param('l2') l2, @Param('l3') l3) { ... }

// Shared logic method
private handleCategoryPageRequest(slugParts: string[]) {
  return this.service.getCategoryPageBySlugPath(slugParts);
}
```

**Path Resolution**: Service walks down category hierarchy level by level to find the target category.

---

### 2. Cursor-Based Pagination

**Implementation**: Opaque base64url-encoded tokens containing last item's position.
```typescript
// Cursor structure
interface CursorData {
  id: string;
  createdAt: string;
}

// Encoding
encodeCursor({ id: "project-10", createdAt: "2025-10-13..." })
// Returns: "eyJpZCI6InByb2plY3QtMTAi..."

// Decoding
decodeCursor("eyJpZCI6...")
// Returns: { id: "project-10", createdAt: "2025-10-13..." }
```

**Benefits**:
- Opaque (hides internal implementation)
- URL-safe (no escaping needed)
- Stable ordering (prevents duplicates/missing items)
- Works with concurrent inserts

**Per-Block Pagination**: Each content block has independent `nextCursor`, allowing frontend to advance carousels independently.

---

### 3. Rule Evaluator System

**Flow**:
1. Service fetches taxonomy groups from CMS (via adapter)
2. Each taxonomy group contains ordered list of rules
3. EvaluatorFactory executes each rule by calling appropriate adapter
4. Rules filtered by `pageKind` parameter
5. Results assembled into blocks with pagination

**Example Rule**:
```json
{
  "entity": "projects",
  "kind": "top_rated",
  "limit": 12,
  "pageKind": "show-all"
}
```

**Execution**: `evaluatorFactory.executeRule()` → `listingAdapter.queryProjects()` → Returns paginated results

---

### 4. Suggestions Engine

**Strategy** (Mock Implementation):

| Suggestion Type | Logic |
|----------------|-------|
| **Related Categories** | Categories with shared tags → siblings → any published |
| **Trending Categories** | Recently updated categories (ORDER BY updated_at DESC) |
| **Popular Categories** | Categories with most children |
| **Related Skills** | Tags associated with current category |

**Returns**: 6 related, 6 trending, 6 popular categories + 12 skills per request.

---

### 5. Editorial Content

**Structure**:
- SEO Override (title, description, canonical)
- Hero Section (title, subtitle, image, link)
- Guides (3 items with descriptions and thumbnails)
- Courses (3 items with duration)
- FAQ (6 question/answer pairs)

**Integration**: Fetched via `cmsAdapter.getEditorial()`, included in every category page response.

---

## Data Models

### Rule
```typescript
interface Rule {
  entity: 'projects' | 'services' | 'teams' | 'talent' | 'guides' | 'courses';
  kind: 'top_rated' | 'trending' | 'new' | 'curated';
  limit?: number;
  gridSize?: number;
  carousel?: boolean;
  pageKind?: 'show-all' | 'projects' | 'services' | 'teams' | 'talent';
}
```

### TaxonomyGroup
```typescript
interface TaxonomyGroup {
  id: number;
  name: string;
  path_scope?: 'l1' | 'l2' | 'l3' | 'subtree';
  categoryUuids: string[];
  rules: Rule[];
}
```

### EditorialContent
```typescript
interface EditorialContent {
  seoOverride?: { title, description, canonical };
  hero?: { title, subtitle, image, link };
  guides?: Array<{ id, title, description, link, thumbnail }>;
  courses?: Array<{ id, title, description, link, thumbnail, duration }>;
  faq?: Array<{ question, answer }>;
}
```

---

## Integration Points

### CMS Integration

**What's Ready**:
- All adapter interfaces defined
- Mock + Real implementations working
- Service logic complete and tested
- Full documentation of expected data formats

**Switching from Mock to Real**:
```typescript
// In category-pages.module.ts
{
  provide: CmsAdapter,
  useClass: CmsAdapterReal,  // Change from CmsAdapterMock
}
```

---

## Environment Variables
```bash
# Required for real adapter integration
CMS_SERVICE_URL=http://localhost:3020
CMS_API_KEY=<your-api-key>
INTERNAL_SERVICE_TOKEN=<service-token>

# Development (uses mocks)
NODE_ENV=development

# Production (uses real adapters)
NODE_ENV=production
```

---

## Testing

### Test with Mocks (Current)
```bash
# Start service
npx nx serve category-service

# Test L1
curl http://localhost:3000/api/category-pages/creative 

# Test L2
curl http://localhost:3000/api/category-pages/creative/ui-design 

# Test L3
curl http://localhost:3000/api/category-pages/creative/ui-design/mobile-ui 

# Test filtering
curl http://localhost:3000/api/category-pages/creative?kind=projects 

# Test pagination
curl http://localhost:3000/api/category-pages/creative 
# Use returned cursor in next request
curl "http://localhost:3000/api/category-pages/creative?cursor=<paste-cursor>

# Test limit
curl http://localhost:3000/api/category-pages/creative?limit=5 
```

### Expected Behavior

- All endpoints return 200 OK
- L1 breadcrumbs: `[Creative]`
- L2 breadcrumbs: `[Creative, UI Design]`
- L3 breadcrumbs: `[Creative, UI Design, Mobile UI]`
- Each block has 10 items (or specified limit)
- Pagination cursors present when more items available
- Suggestions include 6+6+6 categories + 12 skills
- Editorial includes hero, guides, courses, FAQ

---

## Error Handling

**404 - Category Not Found**:
```json
{
  "statusCode": 404,
  "message": "Category not found at path: creative/nonexistent"
}
```

**500 - Internal Server Error**:
- Errors logged with full stack trace
- Generic error returned to client (no leak)
- Empty arrays returned for failed adapters (graceful degradation)

---

## Module Status

**Completed**:
- ✅ All endpoints implemented and tested
- ✅ Multi-level path support (L1/L2/L3)
- ✅ Pagination system with opaque cursors
- ✅ Rule evaluator with adapter pattern
- ✅ Suggestions engine (heuristic-based)
- ✅ Editorial content support
- ✅ Complete navigation (breadcrumbs, parent, children, siblings)
- ✅ Error handling (404, 500)
- ✅ Mock adapters with realistic data
- ✅ Complete TypeScript types
- ✅ Swagger/OpenAPI documentation

**Ready For**:
- Integration with Payload CMS
- Integration with Listing Service
- Integration with User Service
- Frontend consumption
- Production deployment

---

## Summary

**What Was Built**: A complete, production-ready category pages API with dynamic content assembly, pagination, suggestions, and editorial content support.

**Architecture**: Adapter pattern for clean separation between business logic and external services, making integration straightforward.

**Current State**: Fully functional with mock implementations. All features tested and working.

**Next Steps**: Replace remaining mock adapters with real implementations pointing to CMS service and microservices.

---
