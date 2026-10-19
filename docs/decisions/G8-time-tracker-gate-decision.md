# G8 Time Tracker gate - online actions, installer download, and offline synchronization

Status: **ACCEPTED (Christopher).** Time Tracker actions that create or change recorded time, and the installer download
entry, are gated on the talent's verification status. The gate is enforced by `time-tracking-service`
(`TimeTrackerGate`, answering from identity-verification-service); the frontend and the desktop app never decide it.

## The rule (online)
* **Gated:** `POST /sessions`, session close, session entries/breaks/idles writes, `PATCH` entries/breaks,
  `POST /manual-time`, and `GET /time-tracking/downloads/time-tracker/check` (returns `{ allowed: true }`, never a URL).
* **Un-gated on purpose:** screenshots, activity minutes, ActivityWatch ingest, device heartbeat, take-over, delete, moderation.
* **Order:** authentication first, then the gate, before any write or side effect.

| Situation | Status | `error` |
|---|---|---|
| Gate closed (not verified, outside grace) | 403 | `VERIFICATION_REQUIRED` |
| Gate could not be evaluated | 503 | `IDENTITY_VERIFICATION_UNAVAILABLE` |

An unverified talent cannot start or change time online. Nothing below weakens that.

## Installer download
The download dialog (`frontend/components/download-desktop-tracker-dialog.tsx`, shared by /time-tracking and /earnings)
calls the gate check before every download (the Download button and the "click here" retry). A 403 opens the existing
`AccountVerificationGate` popup, a 503 its status-unavailable state; neither starts a download. The public release URLs are
unchanged and direct access to them is out of scope.

## Offline synchronization (Christopher's confirmed rule)
Time recorded offline in the desktop app is queued in the local outbox and synchronized later. When the server refuses a
queued write with **403 `VERIFICATION_REQUIRED`**:

* **The queued work is kept.** The row stays pending with its original payload and original idempotency key (the row id).
  It is never edited, re-keyed or dropped.
* **It is never dead-lettered and spends no attempt.** The normal budget of five attempts is not consumed by an unverified
  account; `attempts` stays unchanged.
* **It retries slowly, bounded, with jitter.** The next try is `VERIFICATION_RETRY_MS` (5 minutes) plus up to the same again
  at random, so 5-10 minutes after each refusal, never sooner. One retry time is chosen per refusal and shared by all waiting
  gated rows, so the queue sends a single probe per interval (not one per queued row), keeps its oldest-first order, and gated
  work queued while the gate is closed waits with the rest.
* **Un-gated kinds are not held** (screenshots, activity, heartbeat, take-over).
* **It survives restarts.** The retry time is stored on the row. After a restart the row stays quiet until its retry time
  (the in-memory shared hold is rebuilt by the first probe).
* **After the talent verifies, it synchronizes automatically, exactly once.** The next retry is accepted, the row is marked
  completed, and the same idempotency key means a write the server already saved is answered `409 Duplicate key` and is also
  treated as done. A completed row is never sent again; overlapping drains cannot double-send.
* **Other responses are unchanged:** any other 403 still dead-letters at once (kept and requeueable from Diagnostics); the
  gate-outage 503 (`IDENTITY_VERIFICATION_UNAVAILABLE`) keeps its existing behaviour (retry after 15-30 s, no attempt spent,
  no hold); 5xx/408/429 still dead-letter after five attempts; network failures stay transient.

This does not allow any online time action while unverified: the retry is the same gated request, and the server still
answers 403 until the talent is verified.

### Implementation
`desktop/src/main/services/sync/outbox.ts` (`holdForVerification`, `releaseToVerificationHold`, `VERIFICATION_RETRY_MS`,
`VERIFICATION_GATED_KINDS`) and `sync-worker.ts` (`isVerificationRequired`, 403 branch in `dispatch`). Tests:
`desktop/src/main/services/sync/__tests__/sync-worker.test.ts`.

### Known limits (not changed here)
* Rows dead-lettered as `HTTP 403` by an earlier build are not requeued automatically (an ordinary 403 and an old
  verification 403 are indistinguishable); Diagnostics retry still requeues them.
* A row left `inflight` by a crash mid-request is not reclaimed on launch (pre-existing).
