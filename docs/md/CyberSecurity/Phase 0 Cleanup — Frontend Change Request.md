# **Phase 0 Cleanup — Frontend Change Request**

**As of:** 2026-10-15
**For:** whoever owns `frontend/`.
**Covers:** the four remaining Phase 0 items of Security Tasklist #2, all in `frontend/`. Four changes, all deletions or rewording. No application code, no behaviour change, no risk to a running build.
**Context:** `Client-Side Seed Material — Plan.md` (why) and `Client-Exposed Secret Guard — Implementation Notes.md` (the CI check these feed).
**Deadline:** three of the four have allowlist entries that **expire 2026-11-07**. After that the CI guard fails every PR until the lines are gone or the entries are renewed.

---

### **Read this first**

`NEXT_PUBLIC_*` values are compiled into the public JavaScript bundle and served to every visitor. `frontend/src/crypto/backup.ts` derives the key protecting every user's RSA private key from `userId` + `NEXT_PUBLIC_SYSTEM_SECRET` + a constant salt. The user id is not secret and the variable would be published, so **setting that variable makes every user's private key decryptable by anyone.**

Nothing is exposed today, because the variable is unset everywhere and `deriveKEK` throws without it. Every change below exists to stop someone setting it by following our own instructions.

**Change 1 is the urgent one.** It is not a stale document — it is a live instruction to cause the incident.

---

## **Change 1 — `E2E-NOTES.md` tells people to set the variable**

**File:** `frontend/app/(group)/inbox/E2E-NOTES.md`
**Branch:** can ride on `security/gateway-rate-limiting` (already pushed) — it is a document, so no env-template branch rule applies.
**Priority:** highest. This is the page someone opens when they decide to fix multi-device support.

### 1a. Line 157 — delete the instruction

Under `### Frontend (~3-4 hours)`, step 1 currently reads:

```
1. **`frontend/src/crypto/backup.ts`** — already has `deriveKEK(userId)` and
   `decryptWithKEK()` scaffolded. Need to:
   - Set `NEXT_PUBLIC_SYSTEM_SECRET` env var to a non-empty value
   - Add `encryptWithKEK()` (counterpart to existing decryptWithKEK)
```

Replace the whole `## How to close the gap (~half a day)` section — it is wrong end to end now — with:

```markdown
## How to close the gap

**The estimate below used to say "~half a day" and described wiring the
browser-derived KEK. Do not follow that approach. It is the vulnerability.**

The backend half is already built (2026-10-09). See
`docs/md/CyberSecurity/Server-Side Key Custody — Implementation Notes.md`
for the full contract. In short:

- `PUT /user-keys/private-key/backup` — send `{ privateKey, publicKey }`,
  both PEMs. The server wraps it; the wrapping key never leaves the server.
- `GET /user-keys/private-key/restore` — returns `{ privateKey, format }`.
  **`privateKey: null` is a normal answer**, meaning no usable backup. Keep
  or generate the local keypair; do not show an error.
- `GET /user-keys/private-key/status` — whether a backup exists, without
  decrypting. Works even when the server secret is unset.

Errors: **503** means `E2EE_SERVER_SECRET` is not configured on that
environment (an operator problem, not a client one). **409** means a backup
already exists under a different public key — the user is on a second
browser, so restore the existing key rather than forcing a new one.

### Frontend work remaining

1. **`frontend/src/crypto/backup.ts`** — delete it. `deriveKEK`,
   `encryptWithKEK` and `decryptWithKEK` all become dead once `keys.ts`
   calls the endpoints above. Deleting it is what removes the
   `NEXT_PUBLIC_SYSTEM_SECRET` read, which is the tasklist item.
2. **`frontend/src/crypto/keys.ts`** — drop the `./backup` import at line 4.
   Replace the `kek`-gated backup branch (~371–383) with a call to
   `/backup`, and the restore branch (~313–330) with a call to `/restore`.
   Replace the migration branch (~251–296) with a `/status` check followed
   by a backup call. **Keep the "refusing to migrate stale private key"
   guard at ~276** — it is correct, and the server's 409 is a second line of
   defence, not a replacement for it.
3. Then delete the `frontend/src/crypto/backup.ts` entry from
   `.github/client-exposed-secrets-allowlist.json` in the same PR. The CI
   guard fails on an allowlist entry that no longer matches anything, by
   design.

**Prerequisite:** `E2EE_SERVER_SECRET` must be generated
(`openssl rand -hex 32`) and set in the Render `marketeq-secrets` group. It
is declared in `render.yaml` but has never had a value. Until it does, all
three endpoints return 503.
```

### 1b. Other stale claims in the same file

| Line | Currently says | Should say |
|---|---|---|
| 15–16 | "scaffolding exists in `backup.ts` … ~half a day to wire properly" | The flow **is wired**. `keys.ts:4` imports it and lines ~251–330 are the full backup, migration and restore implementation. It is inert only because the variable is unset. |
| 29 | "Private key stored in localStorage" | **IndexedDB**, via `idb` (`keys.ts:30–41`). Only `deviceId` is in localStorage. |
| 35 | "stores the private key in `localStorage`" | Same correction. |
| 44 | "Clearing localStorage = losing all message history" | Clearing **IndexedDB**. |
| 50–56 | "Manually copy these localStorage entries: `privateKey`, `publicKey`, `deviceId`" | Wrong and will not work. The keypair is in IndexedDB (`messaging` DB, `keys` store); only `deviceId` is in localStorage. |
| 173 | "Migrate from localStorage to IndexedDB for the private key" | **Already done.** Delete this step. |
| 193 | "`backup.ts` — Scaffold for KEK-based backup, partially written, **NOT WIRED**" | Wired, and scheduled for deletion. This single line is why nobody treated this as live code. |
| 307 | "XSS in the browser (private key in localStorage; should migrate to IndexedDB)" | Already in IndexedDB. The residual XSS exposure is the **conversation AES keys**, which `crypto/storage.ts` still writes to localStorage as raw base64. |

**Two things in this file are correct and should stay.** The "NOT protected against: a determined server operator with access to both `systemSecret` and the DB" bullet is still accurate and is the trade-off Phase 1 deliberately keeps. And the open questions at lines 252–254 and 287–288 — where is the secret stored, how does rotation work, what if it leaks — are the right questions; Phase 1 answers them, so point them at the new document rather than deleting them.

---

## **Changes 2–4 — remove the variable from the env templates**

Three separate PRs to three different branches. That is not a preference: `sop-check.yml` Section 8 fails any PR that changes an env template on the wrong branch.

**All three files are CRLF.** Edit on Windows, or make sure your editor does not convert line endings — a converted file shows as a whole-file diff and will bury the one-line change.

### Change 2 — `frontend/.env.local.example` → branch off **`dev-main`**

Delete lines 43–46 (keep the blank line at 42 as the separator):

```
# --- E2E backup KEK seed ---
# Used for deterministic KEK derivation in key backup/restore.
# Keep this value consistent across environments where recovery is expected.
NEXT_PUBLIC_SYSTEM_SECRET=change-me-in-your-local-env
```

This is the worst of the three: a placeholder value plus an explicit instruction to reuse it across environments.

### Change 3 — `frontend/.env.staging.example` → branch off **`staging`**

Delete lines 48–49:

```
# --- E2E backup KEK seed ---
NEXT_PUBLIC_SYSTEM_SECRET=
```

### Change 4 — `frontend/.env.production.example` → branch off **`live-mvp`**

Delete lines 42–43:

```
# --- E2E backup KEK seed ---
NEXT_PUBLIC_SYSTEM_SECRET=
```

### With each of changes 2–4, delete the matching allowlist entry

In `.github/client-exposed-secrets-allowlist.json`, remove the object whose `path` matches the file you just cleaned. The guard **fails on an allowlist entry that matches nothing** — that is the mechanism that stops an exception outliving its cause, so expect it and do it in the same PR.

When all three are done only the `backup.ts` entry should remain.

---

## **Suggested PR text**

Same body works for all three template PRs; change the filename.

> **Title:** `security: remove NEXT_PUBLIC_SYSTEM_SECRET from <filename>`
>
> Security Tasklist item #2. `NEXT_PUBLIC_*` values are compiled into the public JS bundle, so this variable can never hold a secret — and `frontend/src/crypto/backup.ts` uses it to derive the key protecting every user's RSA private key. Setting it would make those keys decryptable by anyone who can read the bundle.
>
> Nothing is exposed today because the variable is unset. This removes the template entry that invites someone to set it.
>
> No behaviour change: the value is empty in this template and the code path fails closed without it.
>
> Also removes the matching entry from `.github/client-exposed-secrets-allowlist.json`, which the CI guard requires once the line is gone.
>
> Background: `docs/md/CyberSecurity/Client-Side Seed Material — Plan.md`

---

## **Order and checks**

1. **Change 1 first.** It is the live instruction, and it has no branch constraint.
2. Then 2, 3, 4 in any order — they are independent.
3. Each needs CODEOWNERS approval (`@CTorres9800` + `@Marketeq/code-review`); all four paths are covered.
4. After each merge, the guard should stay green. If it goes red with *"still allows … but it is no longer there"*, the allowlist entry was not removed — that is the intended behaviour, not a bug.

**What this does not close.** `backup.ts` still reads the variable until Phase 1's frontend work lands, so **item #2 remains open** after all four changes. What they remove is every instruction telling someone to set it.

**Still unverified:** whether `NEXT_PUBLIC_SYSTEM_SECRET` is set in any Vercel environment. The guard reads the repository and cannot see Vercel. Five minutes in the dashboard settles it, and if it is set anywhere, this stops being cleanup and becomes an incident.

---

## **Revision log**

| Date | Change |
|---|---|
| 2026-10-15 | Written. Line numbers verified against the working tree at commit `97a22d6d`. |
