# Query / Index Performance Notes — identity-verification-service

This file restates Doc 03 and Doc 05's already-built index inventory (13 indexes total) against the actual query patterns Docs 05-07 built, and documents the two gaps and one declined addition Doc 11 found.

## Confirmed well-indexed today

- **identity_verification_profiles.user_id** (idx_ivp_user_id, unique) — backs getOrCreateProfile's per-request look-up.
- **identity_documents.profile_id** (idx_identity_documents_profile_id) — backs the per-profile document list.
- **identity_documents(document_number_normalized, issuing_country, document_type)** (idx_identity_documents_fingerprint) — backs the duplicate-detection transaction's match query.
- **verification_attempts.vendor_session_id** and **pending_verification_sessions.vendor_session_id** (both unique) — back the webhook handler's session-correlation look-ups.
- **verification_attempts(profile_id, document_id)** — served today by two separate single-column indexes combined via Postgres's bitmap AND.

## Two gaps this document closes (1756915200000-AddPerformanceIndexes.ts)

1. **pending_verification_sessions** had no index at all on profile_id or document_id, despite startVerificationSession's ceiling-check count() filtering on both together on every new verification attempt. Closed by idx_pending_verification_sessions_profile_document.

2. **identity_verification_profiles** had no index on travel_mode_active or next_travel_reminder_at, despite TravelModeReminderJob's daily sweep filtering both together with no LIMIT. Closed by idx_ivp_travel_mode_reminder.

## Considered and declined

- **A third composite index on verification_attempts(profile_id, document_id):** the two existing single-column indexes already let Postgres answer that filter via a bitmap AND. No confirmed query pattern or load figure justifies the added write cost of a dedicated composite index.

## Not addressed by this document

- Connection-pool sizing — Doc 03's data-source.ts sets none, and no source provides a load figure or instance size to tune against.
- Any index on identity_verification_profiles.identity_verification_status, .location_verification_status, or identity_documents.duplicate_of_document_id — all three already have an index; no confirmed query pattern currently uses them.
