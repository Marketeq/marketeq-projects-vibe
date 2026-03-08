# Title

Talent Profile --- Edit Modals (Backend: CRUD + Validation + Progress +
Uploads) for user-service

# User

As a talent user editing my profile (authenticated owner of the
profile),

# Goal

I want to edit my profile details through the modals (e.g., Job Title &
Rate, Languages, Certifications, etc.),

# Benefit

So my information is saved correctly, enforced by rules from the UI, and
the profile completion progress updates immediately.

# Description

- Update the existing user-service to support all Edit Modal flows
  visible in the "Complete My Profile" designs in one coherent backend
  feature:

- • Provide/confirm CRUD endpoints and validation for the fields used by
  the Edit Modals.

- • Ensure every write (create/update/delete) returns updated profile
  progress (percent + section statuses) so the "Ready to Get Hired?" bar
  can refresh.

- • Where required, add new fields/tables and new endpoints (if not
  already present) and keep existing ones when sufficient.

- • Support pagination, simple sorting, and optional search for list
  screens.

- • Where needed, support file uploads with a pre-signed URL flow (e.g.,
  Certifications attachment).

- • Enforce rate limiting on write operations (e.g., 10
  writes/min/user).

- • Produce a Data Dictionary (CSV/Google Sheet) that inventories all
  fields from the designs and maps each to DB and API.

- 

- Deliverables inside the single document: Data Dictionary summary, DB
  deltas (migrations), API endpoints (request/response, errors),
  progress contract, upload flow, and frontend integration notes (how
  each modal calls the endpoints).

# Acceptance Criteria

## A) Global 

1.  Authentication & ownership enforced: only the profile owner (or
    admin) can write.

2.  Write responses include progress: any POST/PATCH/DELETE returns {
    progress: { percent, sections\[\] } }.

3.  Validation on server mirrors UI rules (no reliance on client-only
    checks).

4.  Pagination: list endpoints return { data, total, limit, offset };
    optional q filter and sort where applicable.

5.  Rate limit: writes are limited to 10/min/user; on breach, return 429
    rate_limit_exceeded.

6.  Error shape: clear, consistent error codes for
    validation/limits/ownership (e.g., duplicate_resource, invalid_url,
    limit_exceeded, forbidden, not_found).

## B) Job Title & Rate

7.  Create/Update/Delete titles with fields: job_title (required, text),
    client_rate (required, decimal), currency (default USD unless
    configured), is_default (boolean).

8.  Max 3 titles per user; attempts to add a 4th return 400
    max_job_titles_reached.

9.  Exactly 1 default when list is non-empty; toggling one to default
    clears others.

10. List endpoint supports pagination and sorting (e.g., client_rate,
    created_at).

11. Writes return progress payload.

## C) Languages

12. Add/Update/Delete languages with optional variant and (if used)
    proficiency.

13. Max 10 languages; attempts to add an 11th return 400
    languages_limit_exceeded.

14. Case-insensitive de-dupe of language names; optional variants
    allowed.

15. List endpoint supports pagination.

16. Writes return progress payload.

## D) Certifications

17. Create/Update/Delete certifications with fields: name\*,
    issue_date\* (YYYY-MM-DD), doesnt_expire (bool), expiry_date
    (optional; ignored when doesnt_expire=true), credential_id
    (optional), credential_url (optional http/https), skills (optional
    string\[\] up to 10, deduped), attachment_url (optional).

18. Date rules: issue_date not more than +90 days in the future; if
    doesnt_expire=false and expiry_date provided ⇒ expiry_date \>=
    issue_date.

19. No duplicates per user on (normalized(name), issue_date,
    credential_id); on conflict return 400 duplicate_certification.

20. Attachment flow: endpoint to issue pre-signed upload URL; after
    client upload, patch attachment_url.

21. List endpoint supports pagination, q (name contains), and sort
    (issue_date, created_at).

22. Writes return progress payload.

## E) Data Dictionary 

23. A single CSV/Sheet enumerates all fields for all Edit Modals, with
    columns like: section \| field_name \| type \| required \| rules \|
    create_or_update \| db_table \| existing_in_db \| api_endpoint \|
    notes.

24. Each field is mapped to database location (table/column) and API
    (method/path).

25. Missing fields are clearly marked and included in DB migration
    acceptance criteria.

## F) Frontend Integration Notes 

26. For each modal (Job Title & Rate, Languages, Certifications...),
    include request/response examples showing exactly what the UI should
    send and what it receives (including progress).

27. Include error examples that match the UI messages (e.g., max limits,
    invalid URL, duplicate).
