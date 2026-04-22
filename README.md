# marketeq-projects-vibe

Vibe Coding Marketeq Projects talent network platform.

## Install:
``` npm install --legacy-peer-deps ```

### frontend:
```npm run dev ```

### Backend:
### Ports:
- Frontend: 3000
- Gateway: 4000
- Auth: 3001
- User: 3002
- Listings: 3003
- Messaging: 3005
- Notification: 3006
- Checkout: 3009
- Contracts: 3010
- Favorites: 3012
- Invitations: 3013
- Content moderation: 3014
- Transaction: 3018
- Autocomplete: 3019
- Python moderation API: 8000

### Dependencies:
- npm install @grpc/grpc-js @grpc/proto-loader --legacy-peer-deps
- npm install -w apps/user-service geo-tz --legacy-peer-deps
- npm install bad-words --legacy-peer-deps
- npm install -D @types/multer @types/express --legacy-peer-deps
- npm install -D @types/superagent @types/multer @types/express --legacy-peer-deps
- npm install @nestjs/platform-express multer --legacy-peer-deps
- npm install sharp --legacy-peer-deps
- npm install @nestjs/event-emitter --legacy-peer-deps
- npm install @golevelup/nestjs-rabbitmq --legacy-peer-deps
- npm install prom-client --legacy-peer-deps
- py -m pip install fastapi uvicorn transformers torch pillow
- py -m pip install python-multipart
- py --version
- npm install nodemailer @types/nodemailer --legacy-peer-deps

### Install the Brevo (Sendinblue) Node.js SDK in your
- npm install sib-api-v3-sdk  

### Build:
- npx nest build api-gateway
- npx nest build autocomplete-service
- npx nest build listings-service / npm run build -w apps/listings-service
- npx nest build content-moderation-service
- npx nest build invitations-service
- npx nest build notification-service

### Start Serices:
- npx nest start auth-service --watch
- npx nest start api-gateway --watch
- npx nest start user-service --watch
- npx nest start listings-service --watch
- npx nest start autocomplete-service --watch
- npx nest start content-moderation-service
- npx nest start notification-service
- npx nest start invitations-service
- npx nest start favorites-service
- npx nest start category-service
- npx nest start transaction-service

### Start CMS service

```bash
cd backend/apps/cms-service
npm install
npm run start:dev
```

`start:dev` runs `npm run bootstrap` once before the dev server (first admin from `CMS_ADMIN_*` if none exists; sample CategoryPages for L1 “design”; project fixtures from `src/seeds/projects.seed.ts` when not already present — can take a while on first run). Set `SKIP_PROJECT_SEED=true` to skip project seeding. To run bootstrap only: `npm run bootstrap`. To re-run project seed alone after changing fixtures: `npm run seed:projects`.

Alternatively without the dev watcher: `npx ts-node src/server.ts` (run `npm run bootstrap` first if the DB is empty).

#### Log in to Payload CMS admin at
http://localhost:3020/admin
Enable API Key -> Generate New API Key
Set this value as CMS_API_KEY in your .env for category-service

OR 
http://localhost:3020/api/users/login
{
  "email": "*****@gmail.com",
  "password": "********"
}

### Using npm:
```npm exec nest -- start listings-service --watch```

### Create Schema:
psql -U postgres -d transaction_db -c "CREATE SCHEMA transaction_service;"

### Database creation:
psql -U postgres -c "CREATE DATABASE transaction_db;"

### Run Migration:
```npx typeorm-ts-node-commonjs -d apps/user-service/src/data-source.ts migration:run```
```npx typeorm-ts-node-commonjs -d apps/invitations-service/src/data-source.ts migration:run```
```npx typeorm-ts-node-commonjs -d apps/transaction-service/src/data-source.ts migration:run ```

### To generate private and public key :
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem 
cat private.pem

openssl rsa -in private.pem -pubout -out public.pem
cat public.pem

### Rabbitmq:
```docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management```
``` docker start rabbitmq ```

### Redis:
docker run -d --name redis -p 6379:6379 redis:7

### PAYLOAD_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Internal service token
```node -e "console.log(require('crypto').randomUUID())"```

### Fast API:
```py -m uvicorn clip_moderation_api:app --host 0.0.0.0 --port 8000 --app-dir apps/content-moderation-service/src/filters/python```
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Moderate endpoint: `POST http://localhost:8000/moderate` (multipart file upload)

## Claude CLI Setup (API Key)

Use these steps to install Claude CLI and authenticate with an Anthropic API key.

### 1) Install Claude CLI

Choose one install method:

```bash
# Option A: npm
npm install -g @anthropic-ai/claude-code

# Option B: native installer (macOS/Linux/WSL)
curl -fsSL https://claude.ai/install.sh | bash
```

### 2) Add your API key

Set the key for the current terminal session:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Optional: persist for future shells (zsh):

```bash
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc
```

### 3) Verify and start

```bash
claude --version
claude
```

Inside Claude CLI, run:

```text
/status
```

to confirm authentication is using your API key.

### 4) If auth fails

- Check the key value and organization access in Anthropic Console.
- Remove the variable to fall back to browser login:

```bash
unset ANTHROPIC_API_KEY
claude
```

## E2E Encryption Setup (Messaging)

The messaging service uses end-to-end encryption. Additional setup required:

### 1) Add `E2EE_SERVER_SECRET` to `backend/.env`
```bash
# Generate a random secret
openssl rand -hex 32
# Add to .env
E2EE_SERVER_SECRET=<paste_generated_value>
```
The messaging-service **will not start** without this variable.

### 2) Create user-keys tables
The user-service has `synchronize: false`, so encryption tables must be created manually:
```bash
cd backend
node -e "
const { DataSource } = require('typeorm');
require('dotenv').config();
const ds = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, schema: 'user_service' });
ds.initialize().then(async () => {
  await ds.query('CREATE TABLE IF NOT EXISTS user_service.user_keys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), \"userId\" UUID NOT NULL, \"publicKey\" TEXT NOT NULL, \"encryptedPrivateKey\" TEXT, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now())');
  await ds.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_keys_userId ON user_service.user_keys (\"userId\")');
  await ds.query('CREATE TABLE IF NOT EXISTS user_service.user_devices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), \"userId\" UUID NOT NULL, \"publicKey\" TEXT NOT NULL, \"deviceName\" VARCHAR, \"createdAt\" TIMESTAMP NOT NULL DEFAULT now(), \"updatedAt\" TIMESTAMP NOT NULL DEFAULT now())');
  await ds.query('CREATE INDEX IF NOT EXISTS idx_user_devices_userId ON user_service.user_devices (\"userId\")');
  console.log('Tables created');
  await ds.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
"
```

### 3) Gateway route mappings
Ensure `backend/apps/api-gateway/src/proxy/proxy.controller.ts` has these in `SERVICE_PREFIX_MAP`:
```ts
messaging: 'messages',
'user-keys': 'users',
devices: 'users',
```
And the v1 routing block includes:
```ts
} else if (prefix === 'v1' && (segments[1] === 'threads' || segments[1] === 'messages')) {
  prefix = 'messages'
}
```

## Project Notes

- Repo guidance for agents and workflows: `CLAUDE.md`
- Shared agent memory files: `.claude/memory/`

## Content moderation:

### Publish Moderation Matrix (Deterministic)
This repo includes a PowerShell script to run the full publish moderation matrix through the gateway:

- bad title + good image
- bad short/long description + good image
- bad image + good content
- good content + good image

Script path:
- backend/scripts/run-publish-moderation-matrix.ps1

Run command:
- powershell -ExecutionPolicy Bypass -File "./scripts/run-publish-moderation-matrix.ps1"
- With explicit token: `powershell -ExecutionPolicy Bypass -File "./scripts/run-publish-moderation-matrix.ps1" -Token "<jwt>"`

Fixtures:
- `backend/scripts/fixtures/bad-image-emoji.png` — deterministic bad image
- `backend/scripts/fixtures/good_test_image.jpg` — safe test image

### Python Moderation Scripts

Located at `backend/apps/content-moderation-service/src/filters/python/`:

| Script | Purpose |
|--------|---------|
| `clip_moderation_api.py` | FastAPI server — CLIP-based image moderation with 16 label categories |
| `clip_moderation.py` | CLI — binary safe/unsafe image classification |
| `blur_check.py` | CLI — Laplacian variance blur detection (requires opencv) |
| `detect_animation.py` | CLI — checks if an image is animated (GIF) |
| `video_moderation.py` | CLI — frame-by-frame CLIP moderation for videos (requires opencv) |

### Test Matrix Results

| Scenario | Project | Media | Result |
|----------|---------|-------|--------|
| Bad title + good image | ok | ok | Text flagged |
| Bad description + good image | ok | ok | Text flagged |
| Bad image + good content | ok | ok | Image rejected |
| Good content + good image | ok | ok | Clean pass |


- good video - samplelib.com/lib/preview/mp4/sample-5s.mp4   
- bad video - pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev/projects/318fd0e8-0d86-455d-bebb-656bd0530c70/media/angry_face-58e0a31f-c8d7-447a-b1d7-06cfda191980.mp4

### Invitation Email Delivery (notification-service)
- Invitation accept URL (UI): `http://localhost:3000/invite/accept?token=YOUR_TOKEN`
- `POST http://localhost:4000/invitations/accept {"token":""}`
- Open this URL in browser while signed in with the invited email account.
- If you are signed in with a different account, click Sign In With Invited Email on the accept page.
- Primary transport: SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`) — currently commented out
- Fallback transport: SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`)
- If SendGrid key is missing/invalid, service automatically attempts SMTP.
- Restart notification-service after changing env values.

### Email Provider: Brevo (Active for Testing)

The notification-service and invitations-service now use **Brevo** for transactional emails.
SendGrid code is commented out but preserved for future use.

#### Required env vars (per service `.env`):
```
BREVO_API_KEY=xkeysib-...
BREVO_FROM_EMAIL=your-verified-sender@example.com
BREVO_FROM_NAME=YourName
```

#### Services that need Brevo config:
- `backend/apps/notification-service/.env` — handles RabbitMQ-routed emails (team invitations, notifications)
- `backend/apps/invitations-service/.env` — direct Brevo send for testing invitations

#### How invitation emails flow:
1. **invitations-service** creates the invite in DB
2. **invitations-service** emits `notification.email.team_invitation` via RabbitMQ → **notification-service** picks it up and sends via Brevo
3. **invitations-service** also sends a direct Brevo email (for testing, can be commented out)

#### Brevo sender setup:
- The `BREVO_FROM_EMAIL` must be a **verified sender** in Brevo dashboard → Settings → Senders, domains, IPs
- The from email must be a verified sender in your Brevo account

#### Switching back to SendGrid:
- Uncomment SendGrid imports and calls in `notification.service.ts`
- Comment out the Brevo calls
- Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` in the notification-service `.env`

## category-service ↔ cms-service auth (API Key)

category-service talks to cms-service as a machine client using Payload's
**API Key** feature (not a JWT). The Authorization header sent by
`backend/apps/category-service/src/content/cms-client.ts` is:

```
Authorization: API-Key <CMS_API_KEY>
```

For this to work, three things must all line up on the CMS side.

### 1) Users collection must enable API keys

`backend/apps/cms-service/src/collections/Users.ts` must declare:

```ts
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    useAPIKey: true,
  },
  // ...
};
```

This adds `enable_a_p_i_key`, `api_key`, and `api_key_index` columns to the
`users` table. If you ever see a drizzle-kit schema-push prompt offering to
**delete** those columns on `npm run start:dev`, answer **`N`** — that
means the flag was removed from `Users.ts` and the push would drop your
API keys.

### 2) The CMS user that owns the key must have `role: admin` or `developer`

`backend/apps/cms-service/src/collections/Categories.ts` gates writes with
`isAdminOrDeveloper` (see `src/access/roles.ts`). API-key auth only tells
Payload *who* the caller is; the collection's access rules still apply.

In the Payload admin UI (`http://localhost:3020/admin`), open the user and
set:

- **User Type** → `Admin` *(set this **first** — the Role field is hidden
  by a UI condition until User Type is `Admin`)*
- **Role** → `Admin` (or `Developer`)
- Save, reload, confirm both fields stuck.

Without a privileged role, every write returns
`403 "You are not allowed to perform this action."` even though reads work
(because `Categories.read` is public).

### 3) Copy the API key into category-service env

On the admin user's page in Payload:

- Toggle **Enable API Key** on.
- Click **Generate new API key** and copy the UUID.
- Paste into `backend/apps/category-service/.env` (category-service loads
  `.env.${NODE_ENV}` first, so also update `.env.development` if present):

```
CMS_SERVICE_URL=http://localhost:3020
CMS_API_KEY=<uuid-from-payload>
```

- Restart category-service.

### Smoke test

```bash
# read-only (public, should return {docs: [...]})
curl http://localhost:3020/api/categories?limit=1

# authenticated write via category-service
curl -X POST http://localhost:3014/api/categories/push-test \
  -H "x-service-token: dev-internal-token"
```

A 200 from `push-test` confirms the full chain:
API-Key header → `useAPIKey: true` → admin role → `isAdminOrDeveloper` →
create.
