# Claim Rate Limiting

## Overview

Talent users can claim unowned projects to become the project owner. Client-side rate limiting restricts how many projects a single user can claim within rolling time windows, preventing abuse and encouraging quality ownership.

## Rate Limits

| Time Window | Maximum Claims |
|-------------|---------------|
| 24 hours    | 3             |
| 7 days      | 5             |
| 30 days     | 10            |
| 90 days     | 15            |

All windows are rolling (measured from the current moment, not calendar boundaries).

## User Experience

### Normal Flow
1. User clicks "Claim this Project."
2. System checks all rolling limits against `localStorage` claim history.
3. Confirmation dialog opens: "Claim this Project?"
4. User confirms. On success, a "This project is yours" dialog appears.

### Blocked Flow
1. User clicks "Claim this Project."
2. A rolling limit is exceeded.
3. A "Claim limit reached" popup appears with the specific violation (e.g., "You have claimed 3 projects in the last 24 hours.").
4. User clicks "Got it" to dismiss. No claim is made.

## Source Files

| File | Purpose |
|------|---------|
| `frontend/src/lib/api/claim.ts` | `checkClaimLimit()`, `recordClaim()`, limit constants |
| `frontend/app/(group)/(group)/project-details/[slug]/page.tsx` | Dialog UI for confirm, blocked, and success states |

## Key Functions

### `checkClaimLimit(): ClaimLimitResult`
Returns `{ allowed: true, reason: "" }` when all limits pass, or `{ allowed: false, reason: "..." }` with a human readable message when exceeded.

### `recordClaim(projectId: string)`
Appends a new entry to the `localStorage` claim log after a successful claim.

### `openClaimDialog()`
Page-level callback that checks limits before opening the confirmation dialog. If blocked, sets `claimStep` to `"blocked"` and stores the reason.

## Storage Format

Claims are stored in `localStorage` under `marketeq_claim_log`:

```json
[
  { "projectId": "abc-123", "timestamp": 1696550400000 },
  { "projectId": "def-456", "timestamp": 1696636800000 }
]
```

## Dialog States

| `claimStep` | Description |
|-------------|-------------|
| `"closed"` | Dialog hidden |
| `"confirm"` | Confirmation prompt |
| `"blocked"` | Rate limit violation popup (red alert icon) |
| `"done"` | Success message (green checkmark) |

## Notes

- **Client-side only.** This is a convenience guard, not a security boundary. Server-side enforcement can be layered on later.
- **Rolling windows.** "24 hours" means the last 86,400,000ms from the current moment, not a calendar day reset.
- **Per-browser scope.** `localStorage` is per-browser and per-device. Server-side limits would close this gap.
