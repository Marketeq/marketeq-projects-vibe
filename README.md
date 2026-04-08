# marketeq-projects-vibe

Vibe Coding Marketeq Projects talent network platform.

## Install:
``` npm install --legacy-peer-deps ```

### frontend:
```npm run dev ```

### Backend:
### Ports:
- Auth: 3001
- Gateway: 4000
- User: 3002
- Listings: 3003
- Messaging: 3005
- Checkout: 3009
- Notification: 3006
- Favorites: 3012
- Contracts: 3010
- Autocomplete: 3019
- Content moderation: 3014
- Invitations: 3013
- Python moderation API: 8000

### Dependencies:
- npm install @grpc/grpc-js @grpc/proto-loader --legacy-peer-deps
- npm install -w apps/user-service geo-tz --legacy-peer-deps
- npm install bad-words --legacy-peer-deps
- npm install -D @types/multer @types/express --legacy-peer-deps
- npm install -D @types/superagent @types/multer @types/express --legacy-peer-deps
- npm install @nestjs/platform-express multer --legacy-peer-deps
- npm install sharp --legacy-peer-deps
- py -m pip install fastapi uvicorn transformers torch pillow
- py -m pip install python-multipart
- py --version
- npm install -w apps/notification-service nodemailer @types/nodemailer --legacy-peer-deps

### Fast API:
```py -m uvicorn clip_moderation_api:app --host 0.0.0.0 --port 8000 --app-dir apps/content-moderation-service/src/filters/python```

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

### Using npm:
```npm exec nest -- start listings-service --watch```

### Run Migration:
```npx typeorm-ts-node-commonjs -d apps/user-service/src/data-source.ts migration:run```
```npx typeorm-ts-node-commonjs -d apps/invitations-service/src/data-source.ts migration:run```

### Rabbitmq:
```docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management```

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

### Invitation Email Delivery (notification-service)
- Invitation accept URL (UI): `http://localhost:3000/invite/accept?token=YOUR_TOKEN`
- POST http://localhost:4000/invitations/accept
   {"token":"<token>"}
- Open this URL in browser while signed in with the invited email account.
- If you are signed in with a different account, click **Sign In With Invited Email** on the accept page.
- Primary transport: SendGrid (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`)
- Fallback transport: SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`)
- If SendGrid key is missing/invalid, service automatically attempts SMTP.
- Restart `notification-service` after changing env values.
