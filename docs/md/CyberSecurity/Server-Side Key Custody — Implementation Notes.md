# **Server-Side Key Custody — Implementation Notes**

**As of:** 2026-10-09
**Audience:** whoever implements the frontend half, and anyone operating `user-service`.
**Status:** backend implemented on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** Purely additive — no existing endpoint, method or stored row changes behaviour. The frontend half is not done, and the feature is inert until `E2EE_SERVER_SECRET` is set.
**Why it exists:** Security Tasklist item #2, Phase 1 of `docs/md/CyberSecurity/Client-Side Seed Material — Plan.md`. Phase 0 was the CI guard (`Client-Exposed Secret Guard — Implementation Notes.md`). This document is the API contract and operating reference.

---

### **What changed, in one line**

The browser no longer derives the key that protects its private key; it hands the private key to `user-service` and gets it back, and the wrapping key is derived in-process and never leaves it.

---

## **1. Why Option B — the key never leaves the server**

Two options were on the table. Option A: the server derives each user's KEK and sends it to the browser. Option B: the server wraps and unwraps, and the KEK stays put. B was chosen:

1. **A key the client never holds cannot be stolen from the client.**
2. **It changes what an XSS is worth.** Under Option A an attacker who runs script on the page fetches the KEK once and keeps it — durable, offline, still valid after the session is revoked. Under Option B the most they can do is ask the server to unwrap during a live session: visible in logs, and dead when the session ends.
3. **Less new code.** `user-keys.service.ts` already had a working AES-256-GCM wrap helper on `E2EE_SERVER_SECRET`. Option A would have meant building a key-delivery endpoint from scratch.
4. **It makes the spec's claim true.** The key-recovery spec asserts "Platform manages KEK securely ✅". Option B is the only version where that sentence is accurate.

**The honest trade-off:** the private key PEM itself crosses the wire inside TLS on backup and restore. Under Option A the *wrapped* key crosses instead — but wrapped with a key the client is also handed, which amounts to the same exposure. Neither is worse; B just does not leave a durable copy in the browser.

**What has not changed:** the server can still decrypt any user's private key. It always could, the spec accepts that explicitly ("server can decrypt the private key, not 'true' E2E in the Signal sense"), and `conversation_raw_keys` already stores server-encrypted AES keys. This phase does not weaken the trust model — it stops the general public from sharing the server's powers.

## **2. The API**

All three routes are under the existing global `JwtAuthGuard` and key off `user.sub` from the verified token. No route accepts a user id.

### `PUT /user-keys/private-key/backup`

```json
{ "privateKey": "<PEM, PKCS#8>", "publicKey": "<PEM, SPKI>" }
```

→ `200 { "success": true, "replaced": false }`

`publicKey` is **required, not optional.** It is what stops a second browser's unrelated keypair from replacing the backup the user's conversation keys are wrapped against. If a backup already exists under a different public key the call is refused with **409 Conflict** and the stored key is left untouched.

A re-backup from the same keypair succeeds and returns `replaced: true`. PEM comparison normalises whitespace, because PEMs differ by line wrapping and trailing newlines far more often than by content, and uses a constant-time compare.

### `GET /user-keys/private-key/restore`

→ `200 { "privateKey": "<PEM, PKCS#8>", "format": "v2" }`
→ `200 { "privateKey": null, "format": "legacy-2" | "unknown" }`

> **A note on the examples above.** The PEM payloads are written as `<PEM, PKCS#8>` rather than spelled out with their real `-----BEGIN …-----` headers. Those header literals match the `pem-private-key-file` and `private-key` gitleaks rules, so writing them out turns this file red in the Secret Scan even though it contains no key material. Please keep the placeholders.


**`privateKey: null` is a normal answer, not a failure.** It means there is no usable backup — a new user, or one holding only a browser-wrapped legacy blob. The client must respond by keeping or generating its local keypair, never by surfacing an error.

### `GET /user-keys/private-key/status`

→ `200 { "hasBackup": true, "format": "v2" }`

Answers whether a usable backup exists without decrypting anything, so it works even when `E2EE_SERVER_SECRET` is absent. Use it to decide whether to attempt a restore.

### Errors

| Condition | Status |
|---|---|
| `E2EE_SERVER_SECRET` not configured | **503** `"Key recovery is not configured on this environment."` |
| Backup exists under a different public key | **409** with an explanation |
| Stored blob fails authentication (tampered, wrong owner) | 500 — this is corruption or an attack, not a client error |

A missing server secret is an operator problem, so it is a 503 rather than a 500, and the message says nothing about the secret beyond what an operator needs to recognise it.

## **3. Stored formats**

The writer only ever emits `v2`. The reader is shape-based, so a row's format is never inferred from when it was written.

| Format | Shape | Written by | Readable server-side |
|---|---|---|---|
| **v2** | `v2:<salt>:<iv>:<tag>:<ciphertext>` | `backupPrivateKey` | Yes |
| **legacy-3** | `<iv>:<tag>:<ciphertext>` | `registerDevice` (still live) | **Yes — newly** |
| **legacy-2** | `<iv>:<ciphertext>` | the **browser**, under the public KEK | **Deliberately not** |

**v2 key derivation:** `scrypt(E2EE_SERVER_SECRET + ":" + userId, salt)` with a fresh 16-byte random salt per wrap, AES-256-GCM. Two properties worth naming:

- **The user id is bound into the key material**, so a blob moved into another user's row — bad migration, SQL injection, restore from the wrong dump — fails to authenticate rather than decrypting for the wrong person. There is a test for exactly that.
- **The salt is per-wrap and lives inside the blob**, not in a column. That means **no schema change and no migration**, which matters because `user-service` runs `synchronize: false` and its migrations are applied by hand.

scrypt rather than HKDF because `E2EE_SERVER_SECRET` is operator-supplied and its entropy cannot be assumed. Default cost parameters, so memory stays inside Node's default `maxmem`.

**legacy-3 becoming readable fixes a real bug.** `registerDevice` has always wrapped incoming key material with the old constant-salt helper, and there was no decrypt counterpart anywhere in the service — so any row it wrote was **write-only and permanently unrecoverable.** The format-aware reader closes that, which is most of what Phase 2 of the plan was for.

**legacy-2 is refused on purpose.** Those blobs are wrapped under the KEK that `crypto/backup.ts` derives from `NEXT_PUBLIC_SYSTEM_SECRET`. The server could technically derive that same KEK — the value is public — but treating such a blob as trustworthy key material would import the exact weakness this phase exists to remove. There should be none in existence, since the flow is inert. If one appears it is logged and reported as unusable.

## **4. Prerequisites before this can be switched on**

**1. `E2EE_SERVER_SECRET` must be generated and set.** It was declared nowhere in `render.yaml` — 25 keys in the `marketeq-secrets` group and this was not among them — so it is almost certainly unset in every Render environment. It is now declared (`sync: false`), which means Render will expect a value to be filled in the dashboard.

```
openssl rand -hex 32
```

Until it is set, all three endpoints answer 503 and nothing is stored. That is the intended failure mode: no fallback, no improvised key.

**2. Rotating it later is not a straight swap.** Every existing wrapped private key becomes unreadable. Rotation needs a re-wrap migration — read with the old secret, write with the new, both available at once. Worth deciding before the first real key is stored, not after.

**3. The frontend half has to be written** — see §6.

## **5. Test record**

22 tests in `user-keys.service.spec.ts`, all passing, plus a clean `tsc --noEmit` of `user-service`.

| Group | What it covers |
|---|---|
| Round trip | key returns unchanged; never stored in the clear; fresh salt per wrap so the same key never yields the same blob; no backup returns `null` rather than throwing |
| Ownership binding | a blob moved into another user's row fails to authenticate |
| Legacy formats | legacy-3 reads correctly (the previously write-only rows); legacy-2 refused and reported; unrecognisable blob reported, not thrown at the caller |
| Overwrite protection | second device with a different public key refused; same keypair re-backup allowed across PEM whitespace differences; **original still recoverable after a refused overwrite** |
| Missing secret | refuses to store and stores nothing; refuses to restore rather than returning something wrong; `status` still answers without it |
| Tamper detection | altered ciphertext rejected; swapped salt rejected |
| Format detection | all four shapes, plus a truncated `v2` blob classified as corrupt rather than misread as legacy-3 |

The negative cases are the point. A happy-path test would have passed over every one of them, and each is a way for message history to be silently lost or silently exposed — which is what doc 17's sign-off criteria ask for.

**A correction to an earlier claim.** These tests ran on the linked machine in 49 seconds once the jest config was scoped to one directory. An earlier note in `Cybersecurity Test Cases — Dry-Run Record.md` said the repo's specs could not be run from here because jest timed out; that was the full-repo haste crawl, not the filesystem. `rate-limit.spec.ts` can be run the same way, and test case 25's remaining Redis gap should be closed that way.

## **6. Frontend change request**

Not done by me. The backend is additive, so nothing breaks while this is outstanding — the old endpoints still work and the flow stays inert.

| File | Change |
|---|---|
| `frontend/src/crypto/backup.ts` | **Delete the file**, or reduce it to nothing. `deriveKEK`, `encryptWithKEK` and `decryptWithKEK` all become dead once `keys.ts` calls the new endpoints. This is what removes the `NEXT_PUBLIC_SYSTEM_SECRET` read, and it is the line the tasklist item names. |
| `frontend/src/crypto/keys.ts` | Drop the `import … from "./backup"` at line 4. Replace the `kek`-gated backup branch (~371–383) with `PUT /user-keys/private-key/backup` sending `{ privateKey: privPem, publicKey: pubPem }`. Replace the restore branch (~313–330) with `GET /user-keys/private-key/restore` and treat `privateKey: null` as "no backup, keep local keys". Replace the migration branch (~251–296) with a `GET /user-keys/private-key/status` check followed by a backup call. **Keep the "refusing to migrate stale private key" guard at ~276** — it is correct, and the server's 409 is a second line of defence, not a replacement. |
| `frontend/app/(group)/inbox/E2E-NOTES.md` | Rewrite the key-recovery section against the new contract, and carry over the corrections already made in `.claude/memory/services/messaging-service.md`. |

Then delete the `frontend/src/crypto/backup.ts` entry from `.github/client-exposed-secrets-allowlist.json` in the same PR — the Phase 0 guard fails on an allowlist entry that no longer matches anything, by design.

**Two notes for whoever picks this up:** `restore` returning `null` must be a quiet path, not an error toast — most users will have no backup for a while. And the 409 on a mismatched public key is the case where a user has opened a second browser; the right behaviour is to restore the existing key, not to force a new one.

## **7. What this phase does not do**

- **It does not remove the exposure.** `backup.ts` still reads `NEXT_PUBLIC_SYSTEM_SECRET` until §6 lands. Phase 1 builds the safe replacement; it does not delete the unsafe original. Item #2 is not closed.
- **It does not enable multi-device.** That is Phase 3, and it depends on §6 plus the secret being set.
- **It does not reconcile the two legacy write paths.** `registerDevice` still wraps with the constant salt and `storeEncryptedPrivateKey` still stores raw. Both are now *readable*, which was the dangerous half, but the remaining Phase 2 work is to retire them once the frontend stops calling them.
- **It does not address the constant salt in the legacy helper**, which is kept byte-identical so existing rows stay readable.

## **8. Change Log**

- **2026-10-09** — `backupPrivateKey`, `restorePrivateKey`, `backupStatus`, versioned user-bound wrapping and a format-aware reader added to `user-keys.service.ts`; three routes added to `user-keys.controller.ts`; `BackupPrivateKeyDto` added; 22 tests added; `E2EE_SERVER_SECRET` declared in `render.yaml`. Additive only, nothing removed. Not committed, not pushed, never deployed. Found during the work: `E2EE_SERVER_SECRET` was declared in no Render env group, and `registerDevice`'s wrapped rows had no reader anywhere in the service.
