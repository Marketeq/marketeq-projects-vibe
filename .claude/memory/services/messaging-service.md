# messaging-service Memory

## Status
Implemented — E2E encryption fully wired (backend + frontend)

## Docs Location
/docs/md/Messaging Service/
/docs/md/Messaging Service/End 2 End Encryption/

## What This Service Does
Real-time encrypted messaging between users. Supports 1:1 and group conversations with AES-256-GCM message encryption and RSA-4096-OAEP key wrapping. Messages are encrypted client-side, server stores only ciphertext.

## Entities / Database Tables
Schema: `messaging` (synchronize: true in dev)

- `threads` — conversation metadata (participantIds[], isGroup, groupName)
- `messages` — content (plaintext fallback), ciphertext (encrypted), status, flags (edited, pinned, starred, deleted)
- `attachments` — file metadata linked to messages
- `user_public_keys` — RSA public keys per user (for key wrapping)
- `conversation_keys` — RSA-wrapped AES keys per user per thread
- `conversation_raw_keys` — server-encrypted raw AES keys per thread

## API Endpoints

### Encryption (EncryptionController — /messaging)
- `POST /messaging/public-key` — store user's RSA public key
- `GET /messaging/get-public-key?userId=` — retrieve public key
- `GET /messaging/conversations/:convId/key?isGroup=` — get wrapped conversation AES key (participant auth check)

### Messages (MessagesController — /v1/messages)
- `GET /v1/messages/thread/:threadId` — fetch thread messages
- `POST /v1/messages` — send message (ciphertext or plaintext)
- `PATCH /v1/messages/:id` — edit message (supports ciphertext)
- `DELETE /v1/messages/:id` — soft delete
- `PATCH /v1/messages/:id/read` — mark read (participant auth check)
- `POST /v1/messages/:id/forward` — forward to up to 5 users
- `POST /v1/messages/:id/pin` — pin message
- `DELETE /v1/messages/:id/pin` — unpin
- `POST /v1/messages/:id/star` — star message
- `GET /v1/messages/search?q=` — search messages (plaintext only)

### Threads (ThreadsController — /v1/threads)
- `GET /v1/threads` — list user's threads
- `GET /v1/threads/:id` — get thread details
- `POST /v1/threads` — create thread
- `POST /v1/threads/:id/participants` — add participant to group (with encrypted key)
- `GET /v1/threads/ably-token` — get Ably auth token

## RabbitMQ Events
- Listens on: `messaging_service_queue`
- Emits: none (uses Ably for real-time instead)

## Ably Channels
- `chat:thread-{threadId}` — message:new, message:edit, message:delete
- `user:{userId}` — message:read
- `presence:thread-{threadId}` — user presence

## Key Decisions
- **AES conversation keys, not direct RSA**: each conversation gets a shared AES-256 key. RSA is only used to wrap/unwrap the AES key per participant. This allows both sender and recipient to decrypt message history.
- **Server holds server-encrypted raw AES keys**: not true E2E (server can theoretically decrypt). Pragmatic for MVP — enables key recovery and new participant onboarding.
- **Plaintext fallback**: messages can be sent as plaintext (content field) when encryption isn't available. Enables backwards compatibility.
- **Client-side key generation**: RSA-4096 keypairs generated in browser via WebCrypto. Private key stored in localStorage. Public key pushed to messaging-service.
- **Cookie-based auth**: inbox reads JWT from cookies (via getAccessToken() helper) instead of localStorage, aligning with the rest of the app.
- **Ably only carries ciphertext**: plaintext is stripped from Ably payloads when ciphertext is present.

## Setup Requirements
- `E2EE_SERVER_SECRET` env var must be set (messaging-service crashes without it)
- `ABLY_API_KEY` env var for real-time messaging
- user-service needs `user_keys` and `user_devices` tables (migration at `user-service/src/migrations/1775000000000-CreateUserKeysAndDevices.ts`, but must be run manually since synchronize: false)
- Gateway needs `messaging`, `user-keys`, `devices` in SERVICE_PREFIX_MAP + v1 threads/messages routing

## Known Limitations

### ⚠️ Single-device only (no multi-device support)
The current implementation works for **one device per user**. Each browser generates its own RSA keypair on first login and stores the private key in localStorage. The server stores the user's public key (and refuses to overwrite it once set, to protect existing wrapped keys).

**What breaks**:
- Logging in on a second device/browser generates new keys, but the server rejects the upload, so the new device has keys that don't match any wrapped conversation keys
- User sees encrypted messages they can't decrypt
- Private/incognito browsers count as new devices

**Workarounds** (dev/testing only):
- Manually copy `localStorage.privateKey`, `publicKey`, `deviceId` from the first browser to the second
- Use one user per browser session for testing

**Proper fix** (not implemented): password-based key backup
1. On signup, derive KEK from user password via PBKDF2
2. Encrypt private key with KEK, upload encrypted blob to server
3. On new device login, download blob, decrypt with password, restore private key
4. Scaffolding exists in `frontend/src/crypto/backup.ts` but `systemSecret` is empty and flow isn't wired

### Other gotchas
- Forward copies ciphertext encrypted with source thread's AES key — recipient in destination thread can't decrypt. Forward button not in UI yet. Fix: client-side re-encrypt on forward.
- `stories/inbox.stories.tsx` exports Bubble/YourBubble components used by the actual inbox page — not just storybook. API paths and token reading must work there too.
- user-service has synchronize: false, so encryption tables need manual migration. messaging-service has synchronize: true in dev.
- `ensureEncryptionKeysExist()` always pushes the public key to messaging-service (not just on first keygen) to handle cases where messaging-service was down during initial registration.
- `storePublicKey()` refuses to overwrite existing public keys (prevents second device from breaking the first). Key rotation would need a dedicated endpoint that also re-wraps all conversation keys.

## Agent Log
- 2026-04-07: Implemented full E2E encryption — encryption module, key management, frontend hooks, API wiring, auth checks, gateway routes. PR #43 merged to dev-main.
- 2026-04-08: PR reverted pending code review (commit 2602439).
- 2026-04-10: Revert reverted after review approval, follow-up fixes in PR `fix/inbox-follow-ups` (textarea height, empty/loading states, Ably stability, right sidebar dynamic profile, left sidebar last message preview, pinned decrypt, talent profile "Message Me" button, public key no-overwrite protection, thread dedupe, last message in thread list).
