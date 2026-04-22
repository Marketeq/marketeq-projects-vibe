# Inbox E2E Encryption — Design Notes & Limitations

This doc explains the current state of end-to-end encryption in the inbox,
the spec requirements, the gap between them, and how to close it. Read this
before making changes to encryption-related code.

## TL;DR

- **What the spec requires**: server-side deterministic KEK so message
  history is *never* lost across password resets, new devices, or cleared
  browsers. Trade-off: server can decrypt the private key (not "true" E2E
  in the Signal sense).
- **What we currently have**: per-device RSA keypair with no recovery flow.
  Works on one browser, breaks on every other scenario.
- **The gap is small**: scaffolding exists in `frontend/src/crypto/backup.ts`
  with the right function names. Estimated ~half a day to wire properly.

## What's currently implemented

- **RSA-4096 + AES-256-GCM hybrid encryption**
  - RSA wraps a per-conversation AES key
  - AES-GCM encrypts message content
  - All encryption/decryption happens in the browser via WebCrypto
- **Client-side key generation** on first login (`ensureEncryptionKeysExist`)
- **Public key stored on server**, refuses to overwrite once set
- **Conversation AES keys wrapped per user**, stored server-side
- **Plaintext fallback** for backwards compatibility with old messages
- **Ably real-time** transport carries only ciphertext
- **Private key stored in localStorage** (one device only, no recovery)

## ⚠️ Known limitation: single-device only (gap vs spec)

The current implementation works for **one browser/device per user**. Each
device generates its own RSA keypair and stores the private key in
`localStorage`. Once a user's public key is on the server, the server refuses
to overwrite it (to protect existing wrapped conversation keys from becoming
undecryptable).

### What breaks with multi-device

- Logging in on a second browser → new keypair generated → server rejects
  the public key upload → second browser can't decrypt anything
- Private/incognito sessions count as a new device
- Clearing localStorage = losing all message history (no recovery)
- Password reset doesn't lose history *only because* nothing is tied to the
  password — but a new login on a different device still loses access

### Workarounds for testing

Manually copy these localStorage entries from the working browser to the new
one (DevTools → Application → Local Storage → http://localhost:3000):
- `privateKey`
- `publicKey`
- `deviceId`

Then hard refresh.

## What the spec actually requires (and we haven't built)

The authoritative doc is
`docs/md/Messaging Service/End 2 End Encryption/🔐 Seamless Key Recovery for End-to-End Encrypted Messaging(1).md`

Key non-negotiable platform constraints from that doc:
- "Message history is never lost — non-negotiable"
- "Users never interact with encryption keys"
- "Password resets or new devices do **not** break access to encrypted messages"
- "Key recovery must be automatic and secure"

### The required architecture

1. Generate RSA keypair in the browser (we do this ✅)
2. Public key stored in PostgreSQL (we do this ✅)
3. **Private key encrypted with a deterministic KEK and stored in PostgreSQL** (❌ not built)
4. KEK derived from `userId + systemSecret` via PBKDF2 (❌ scaffold exists in `backup.ts` but unused)
5. On any login (including password reset, new device): client derives the same KEK,
   downloads the encrypted private key blob, decrypts it locally, restores the key

```
// from the spec:
const kek = await deriveKEK(user.id);
const encryptedPrivateKey = await api.getEncryptedPrivateKey(user.id);
const rawPrivateKey = await decryptWithKEK(encryptedPrivateKey, kek);
const privateKey = await importPrivateKey(rawPrivateKey);
```

### Required backend schema (per the spec)

```sql
CREATE TABLE user_keys (
  user_id UUID PRIMARY KEY,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

Our `user_keys` table currently has `publicKey` and `encryptedPrivateKey`
columns already. The `encryptedPrivateKey` field is unused (always null).
The schema is ready — only the wiring is missing.

### The trade-off the spec accepts

Because the KEK is deterministic from `userId + systemSecret`, and the
server holds `systemSecret`, **the server can decrypt the private key**.
This means:
- ✅ Survives password resets (KEK doesn't depend on password)
- ✅ Works for OAuth users (no password involved at all)
- ✅ Works on any device (any browser can derive the same KEK)
- ✅ Multi-device, automatic, invisible to the user
- ❌ Not "true" E2E in the Signal/WhatsApp sense — server is in the trust zone
- ❌ A server compromise + DB breach can decrypt all stored private keys

The spec explicitly accepts this trade-off because the platform constraint
"never lose history" is non-negotiable.

## Industry comparison

| App | E2E? | Multi-device? | Lose history on password reset? |
|-----|------|---------------|--------------------------------|
| **WhatsApp** | True E2E | Yes (with iCloud/Drive backup) | Yes if no backup |
| **Signal** | True E2E | Yes (each device own keys) | Yes |
| **iMessage** | True E2E | Yes (with iCloud) | Yes if no backup |
| **LinkedIn** | No (plaintext at rest) | Yes (server has all messages) | No |
| **Discord** | No (text plaintext) | Yes | No |
| **Upwork** | No (active scanning) | Yes | No |
| **ProtonMail** | True E2E (password-derived) | Yes (with password) | Yes |
| **Marketeq spec** | "Encrypted-ish" (server holds KEK) | Yes (automatic) | No |
| **Marketeq actual** | True E2E (per device) | No | N/A |

The marketplace pattern (LinkedIn/Discord/Upwork) is plaintext + server-side
features. The Signal pattern is true E2E + accept the UX cost. The Marketeq
spec picks a middle ground: encryption strong enough that a casual data
breach can't read messages, but with a recovery story that doesn't lose
customer data.

## How to close the gap (~half a day)

### Backend (~2-3 hours)

1. The `user_keys` table already has `encryptedPrivateKey` column —
   nothing to migrate.
2. Add endpoints to user-service `user-keys.controller.ts`:
   - `PUT /user-keys/private-key` — upload encrypted blob (body: `{ encryptedPrivateKey: string }`)
   - `GET /user-keys/private-key` — download blob (returns `{ encryptedPrivateKey: string }`)
3. Update `user-keys.service.ts` to read/write the column.
4. Confirm gateway proxy mapping for `user-keys` is in place (it is — we
   added it earlier).

### Frontend (~3-4 hours)

1. **`frontend/src/crypto/backup.ts`** — already has `deriveKEK(userId)` and
   `decryptWithKEK()` scaffolded. Need to:
   - Set `NEXT_PUBLIC_SYSTEM_SECRET` env var to a non-empty value
   - Add `encryptWithKEK()` (counterpart to existing decryptWithKEK)
2. **`frontend/src/crypto/keys.ts`** — `ensureEncryptionKeysExist()` needs to
   change. Current logic: if no local keypair, generate + register device.
   New logic:
   ```
   1. Try to load privateKey from localStorage/IndexedDB
   2. If found, done.
   3. Otherwise, derive KEK from userId
   4. Try to download encrypted_private_key from /user-keys/private-key
   5. If found, decrypt with KEK, restore to local storage. Done.
   6. Otherwise (first signup), generate new RSA keypair
   7. Encrypt private key with KEK
   8. Upload encrypted blob to /user-keys/private-key
   9. Upload public key to /messaging/public-key
   ```
3. Migrate from `localStorage` to `IndexedDB` for the private key
   (`frontend/src/crypto/indexedDb.ts` already exists, currently unused for
   private keys). The spec recommends IndexedDB for security (less XSS
   exposure).

### Testing

- Sign up on browser A → send messages
- Clear browser A's localStorage/IndexedDB → log in again → messages still decrypt
- Sign up on browser A → log in on browser B → messages decrypt automatically
- Reset password → log in → messages still decrypt
- OAuth signup → log in on new device → messages decrypt

## Files involved

| File | Role |
|------|------|
| `frontend/src/crypto/keys.ts` | RSA keygen, import/export, `ensureEncryptionKeysExist` |
| `frontend/src/crypto/e2ee.ts` | AES encrypt/decrypt, RSA wrap/unwrap |
| `frontend/src/crypto/storage.ts` | localStorage helpers for conversation AES keys |
| `frontend/src/crypto/backup.ts` | **Scaffold for KEK-based backup, partially written, NOT WIRED** |
| `frontend/src/crypto/indexedDb.ts` | IndexedDB storage (currently unused) |
| `backend/apps/messaging-service/src/encryption/` | Public key + conversation key endpoints |
| `backend/apps/user-service/src/user-keys/` | Device registration, user key storage |

## All E2E encryption docs (full digest)

In `docs/md/Messaging Service/End 2 End Encryption/` there are 22 files. This
is the complete digest so future devs don't need to re-read everything. The
docs split into roughly 4 categories: foundations, key recovery, group chat,
and supporting/operational.

### Foundations (read first)

| # | Doc | What it covers |
|---|-----|----------------|
| 1 | `🚀 How to implement E2EE for messaging in your platform.md` | High-level overview of E2EE, trade-offs, intro to SubtleCrypto |
| 2 | `End-to-End Encryption (E2EE) – Messaging Platform Full Implementation Guide.md` | Full implementation walkthrough for 1:1 messages using recipient public key |
| 3 | `Why simple 1_1 encryption (encrypt only with the recipient's public key) fails for sender chat history.md` | Explains why both participants need the conversation key — motivates the AES + RSA hybrid |
| 4 | `🚀 E2EE direct 1_1 conversations using AES conversationKey.md` | The actual hybrid pattern we use: AES conversation key + RSA wrapping |
| 5 | `📂 Suggested File Structure.md` | Recommended frontend `/crypto` folder layout (we mostly follow this) |

### Key recovery — ⚠️ CONTRADICTION ALERT

There are **THREE files** in this folder that propose how to handle private
key recovery, and they describe **two different approaches**. The
"Seamless Recovery" approach is the canonical one based on completeness +
the fact that two copies exist of it (the "(1)" duplicate).

| # | Doc | Approach | Status |
|---|-----|----------|--------|
| 6 | `🔥 Problem_ User changes device or clears browser storage.md` | Password-derived KEK (PBKDF2 from login password) | **Superseded** — accepts losing history on password reset |
| 7 | `Private Key Backup, Restore & Cross-Device Access – E2EE Implementation Guide.md` | Password-derived KEK (PBKDF2 from login password) — full code | **Superseded** — same approach as #6, more detail |
| 8 | `🔐 Seamless Key Recovery for End-to-End Encrypted Messaging.md` | Deterministic server-side KEK (`PBKDF2(userId + systemSecret)`) | **Canonical** |
| 8b | `🔐 Seamless Key Recovery for End-to-End Encrypted Messaging(1).md` | Identical duplicate of #8 | **Canonical** (same content) |

**The contradiction**:
- Docs 6 & 7 say: derive KEK from user password (true E2E, but breaks on
  password reset, accepts "lose old messages on reset" as fallback like
  WhatsApp)
- Docs 8 & 8b say: derive KEK from `userId + systemSecret` server-side
  (NOT true E2E since server can decrypt, but never loses history,
  invisible to user, "non-negotiable" history preservation)

**Why we treat #8/#8b as canonical**:
1. Two duplicate files exist of the same approach (likely revised twice)
2. Doc #8 is more detailed (full code, schema, error handling)
3. Doc #6 is framed as a *problem statement* with proposed solution; #8 reads
   as the *full final architecture*
4. Doc #8 explicitly addresses constraints docs #6/#7 leave open: "password
   resets do not break decryption" and "users never interact with encryption
   keys" — only the deterministic KEK can guarantee both
5. None of the other E2E docs reference #6/#7. Several reference the
   architecture in #8

**Open questions the canonical doc #8 doesn't answer**:
- Where is `SYSTEM_SECRET` stored? (env var? KMS? both?)
- How does key rotation work if `SYSTEM_SECRET` ever changes?
- How are existing users migrated if `SYSTEM_SECRET` is compromised?

### Group chat (independent of recovery)

| # | Doc | What it covers |
|---|-----|----------------|
| 9 | `🗄️ 01 - Postgres Schema_ groups, group_participants, group_keys.md` | DB schema for groups (`groups`, `group_participants`, `group_keys`) |
| 10 | `🚀 02 - Flow for adding a new participant to a group chat (E2EE).md` | Client-side re-encryption when adding a member |
| 11 | `✅ GROUP CHAT ENCRYPTION USE CASES.md` | All the group scenarios: invite, leave, rotate keys |

### Supporting / operational

| # | Doc | What it covers |
|---|-----|----------------|
| 12 | `🚀 03 - Secure private key storage in IndexedDB.md` | Use IndexedDB (not localStorage) for private key. Uses `idb` library |
| 13 | `🔄 04 - Public Key Rotation & Re-encryption Strategy.md` | What happens on key rotation, new device flow, re-wrapping conversation keys |
| 14 | `⚙️ Ably Integration with Ciphertext Payloads.md` | Ably real-time channels carry only ciphertext blobs, never plaintext |
| 15 | `💌 Notification-Service Integration with E2EE Messaging.md` | Notifications use metadata only — never decrypted server-side |
| 16 | `⚙️ Minimal NestJS Notification Forwarder Example.md` | Code example of notification service that handles ciphertext |
| 17 | `⚙️ Document_ Integration for Notification & Message Dropdowns in Your E2EE Platform.md` | UI dropdown for notifications; client-side decryption only |
| 18 | `⚙️ Sample UI Notifications and Messages_.md` | Sample text content for UI notification truncation |
| 19 | `📝 Sample decrypted message payloads.md` | JSON examples for testing/truncation |
| 20 | `🔐 Admin Auditing in an E2EE Messaging Platform.md` | How to support admin audits without breaking E2EE — metadata-only with optional arbitration decrypt |
| 21 | `🛡 Security Incident Response Plan (E2EE Platform).md` | What to do if DB or Ably are breached |

### Topics NOT addressed in any doc

- **OAuth users specifically** — no doc discusses Google/LinkedIn login users.
  The deterministic KEK approach (canonical) handles them naturally because
  it doesn't depend on a password, but no doc spells this out.
- **Mixed auth** — no doc covers users who add password login to an OAuth
  account or vice versa. Likely safe with the canonical approach because
  KEK is tied to userId, not auth method.
- **Where to store SYSTEM_SECRET** — env var? KMS? Both? No doc says.
- **Rotating SYSTEM_SECRET** — what happens if it leaks? No doc covers this.
- **Key transparency** — no UI for users to verify their own/others' public
  keys. No doc proposes one.

## Threat model

**Protected against**:
- Database breach (only ciphertext stored, plus encrypted private keys —
  attacker would need both DB and `systemSecret`)
- Network MITM (TLS + ciphertext)
- Casual server employee inspection (without `systemSecret` they see only ciphertext)
- Ably platform reading messages (Ably only sees ciphertext)

**NOT protected against**:
- A determined server operator with access to both `systemSecret` and the
  DB (they can derive any user's KEK and decrypt the private key, then read
  all messages). The spec accepts this trade-off explicitly.
- XSS in the browser (private key in localStorage; should migrate to
  IndexedDB)
- A malicious server that swaps in its own public key on first signup
  (no key transparency / verification UI)
- A user's own device being compromised
