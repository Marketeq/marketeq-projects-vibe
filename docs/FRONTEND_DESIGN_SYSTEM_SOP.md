# Frontend Design System SOP

**Status:** MANDATORY — all contributors must follow this SOP.

## 1. One Frontend, One Design System

The Marketeq platform has **one unified frontend** at `/frontend/`. There are NO separate frontend applications per microservice. Each microservice is backend-only (NestJS at `/backend/apps/<service>/`). Any UI for a microservice's data is built as pages within the main Next.js frontend.

**Violations that will be blocked:**
- Creating a standalone `apps/<service>-ui/` frontend application
- Creating a separate `package.json` with its own Tailwind config, design tokens, or component library
- Installing alternative UI libraries (Material UI, Chakra, Ant Design, shadcn/ui, etc.) alongside the existing design system
- Building custom components when an equivalent exists in `@/components/ui`

## 2. Design System Source of Truth

### Components
All UI components live at `frontend/components/ui/` and are exported from `frontend/components/ui/index.ts`. Before building anything, search this directory for an existing component.

### Colors (white, grey, purple palette)
| Token | Usage |
|-------|-------|
| `bg-gray-50` | Page backgrounds |
| `bg-white` | Cards, panels |
| `text-dark-blue-400` | Primary text, headings |
| `text-gray-500` | Secondary/muted text |
| `text-primary-500` | Active states, links, accents (purple) |
| `bg-primary-50` | Active sidebar item background |
| `border-gray-200` | Borders, dividers |

Never use raw hex colors. Always use Tailwind tokens from `tailwind.config.ts`.

### Icons
All icons come from `@blend-metrics/icons`. Never use Heroicons, Lucide, FontAwesome, or inline SVGs.

### Typography
- Font: Noto Sans (`var(--font-noto-sans)`)
- Headings: `text-[24px] font-bold leading-none text-dark-blue-400`
- Subheadings: `text-[14px] font-light leading-normal text-gray-500`
- Body: `text-sm leading-6 text-dark-blue-400`
- Small: `text-xs leading-5 font-medium text-dark-blue-400`

### Charts
Use `recharts` (already installed). Follow the pattern in `/frontend/app/(group)/reports/page.tsx`:
- Wrap in `<ResponsiveContainer width="100%" height={N}>`
- Use platform colors from Tailwind config (primary-500: `#306CFE`, etc.)
- Import `Tooltip as RechartsTooltip` to avoid collision with the UI Tooltip

## 3. Navigation Structure

### Primary Header
Fixed top bar (`top-most-header.tsx`). Do NOT modify without explicit approval.

### Account Sidebar (224px, left)
Defined in `frontend/components/account-sidebars.tsx`. Two variants:
- `TalentAccountSidebar` — for talent role
- `ClientAccountSidebar` — for client role

To add a new page to sidebar navigation, add a `SidebarItem` to the appropriate `buildTalentSections()` and/or `buildClientSections()` function.

### Page Layout Pattern
Every authenticated page must follow this structure:
```tsx
<AuthenticatedRoute>
  <div className="flex bg-gray-50">
    <LeftSidebar />
    <div className="flex-auto p-3.5 gap-x-6 flex md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
      <div className="flex-auto min-w-0">
        {/* Page content */}
      </div>
    </div>
  </div>
</AuthenticatedRoute>
```

### Secondary/Tertiary Navigation
For pages with sub-sections (e.g., analytics with overview/funnel/segments tabs), use the `Tabs` component from the design system — NOT a custom sidebar or separate layout.

## 4. Adding a New Service's UI

When integrating a microservice's UI into the platform:

1. **Create page(s)** at `frontend/app/(group)/<page-name>/page.tsx`
2. **Add to sidebar** in `frontend/components/account-sidebars.tsx`
3. **Use ONLY** components from `@/components/ui` and icons from `@blend-metrics/icons`
4. **Data fetching** goes through `frontend/service/http/<service>.ts` using the shared Axios instance from `frontend/service/index.ts`
5. **Types** go in `frontend/src/types/<service>.ts` or co-located in the page file if small
6. **Sub-pages** use the `Tabs` component, NOT nested routes with a custom sidebar
7. **Colors** must use Tailwind tokens — no custom color palettes per service

## 5. What to Do with External Service UIs

If a microservice ships with its own standalone frontend (e.g., `apps/analytics-service-ui`):

1. **Extract the data types and API contracts** — port them to `frontend/src/types/`
2. **Extract the business logic** (hooks, formatters) — adapt to use the platform's API client
3. **Rebuild the views** using the platform's design system components
4. **Delete the standalone frontend** — it should not exist

Never copy-paste a standalone frontend's components wholesale. Rebuild using the platform's primitives.

## 6. Checklist for PR Review

Any PR adding UI must pass these checks:

- [ ] All imports from `@/components/ui` (no external UI libraries)
- [ ] All icons from `@blend-metrics/icons` (no other icon libraries)
- [ ] Colors use Tailwind tokens only (no raw hex, no custom CSS variables)
- [ ] Page follows the standard layout pattern (AuthenticatedRoute + LeftSidebar + content area)
- [ ] Navigation entry added to `account-sidebars.tsx` if it's a new page
- [ ] No standalone `package.json`, `tailwind.config`, or `globals.css` per service
- [ ] Charts use `recharts` with platform color tokens
- [ ] Responsive: works at mobile (`xs`), tablet (`md`), and desktop (`lg`+)
