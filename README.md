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
- Listings: 3004
- Autocomplete: 3019
- Content moderation: 3014
- Notification: 3006
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

### Fast API:
```py -m uvicorn clip_moderation_api:app --host 0.0.0.0 --port 8000 --app-dir apps/content-moderation-service/src/filters/python```

### Build:
- npx nest build api-gateway
- npx nest build autocomplete-service
- npx nest build listings-service / npm run build -w apps/listings-service
- npx nest build content-moderation-service

### Start Serices:
- npx nest start auth-service --watch
- npx nest start api-gateway --watch
- npx nest start user-service --watch
- npx nest start listings-service --watch
- npx nest start autocomplete-service --watch
- npx nest start content-moderation-service
- npx nest start notification-service
- npx nest start invitations-service

### Using npm:
```npm exec nest -- start listings-service --watch```

### Run Migration:
```npx typeorm-ts-node-commonjs -d apps/user-service/src/data-source.ts migration:run```

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

