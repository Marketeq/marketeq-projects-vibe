# Caching Posture — identity-verification-service

This service has no caching layer of any kind today, checked directly against its own dependencies, environment variables, and module wiring.

## Confirmed absent

- No caching npm package in Doc 06's package.json.
- No cache-related environment variable in the confirmed nine-variable inventory.
- No CacheModule, CacheInterceptor, or manual in-memory cache wired into app.module.ts.
- Every read route queries Postgres directly, with no cache fallback, on every call.

## Not the same fact as pricing-service's own cache

The Architecture Overview confirms pricing-service "caches the latest exchange rates in Redis on a 24-hour TTL" — a different, already-built service's own confirmed behavior. It does not extend to this service. The Architecture Overview's generic per-service template lists "Cache policies (Redis keys & TTL)" as a heading every service's documentation might address, not a requirement that every service has one.

## For consideration only, nothing chosen

- **GET /me** and **GET .../documents** are the two read routes most likely to benefit from a short-TTL, invalidate-on-write cache if request volume ever justified one. No source confirms that volume.
- Choosing to build this, and choosing a caching product, is an Architecture/Infrastructure decision, not one this document makes.
