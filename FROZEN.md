# FROZEN FILES

These files are frozen. Do not restructure, rewrite, or refactor them.
Surgical additions only, and only when explicitly asked.

## Profile data loading and auth (frozen)
- app/talent-profile/page.tsx
- auth.tsx
- user.ts
- service/index.ts
Never modify profile loading logic, the auth flow, or API methods in these files.

## Navigation (frozen)
- top-most-header.tsx
This is the single master nav. Never copy it, duplicate it, or replace it.
Surgical additions only.
