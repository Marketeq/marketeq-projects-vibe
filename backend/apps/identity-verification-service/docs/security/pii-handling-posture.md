# PII Handling Posture — identity-verification-service

This file explains the PII classification. It does not change any schema, any DTO, or any logging rule.

## The general pattern, already correct

Doc 04's response DTOs already minimize PII exposure: DocumentResponseDto omits both document_number and document_image_reference from every read response. Doc 08's logging-conventions.md already forbids logging document_number, document_number_normalized, and document_image_reference by name, requiring a document's id to be logged instead.

## Location data — classified low sensitivity

verified_home_country, detected_country, detected_region_state, detected_city, and time_zone are coarse, IP-derived signals, not precise geolocation. They are already returned to the caller themselves via GET /me — a user seeing their own location data is not third-party exposure.

## The one real gap this document surfaces: failure_code

verification_attempts.failure_code is vendor-provided, server-side-only data. Service Overview confirms it is never shown to the end user. But Doc 08's logging-conventions.md "what must never be logged" list does not name it.

Today, nothing in this service actually logs a full verification_attempts row, so this is not a confirmed live leak — but if a future log statement ever did print one, failure_code's vendor-specific detail would go out ungoverned. Closing this gap means adding failure_code to Doc 08's logging conventions.
