#!/usr/bin/env node

import { randomUUID } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "marketeq-devops.config.json"), "utf8"),
)

const baseUrl = process.env.N8N_BASE_URL
const apiKey = process.env.N8N_API_KEY

if (!baseUrl || !apiKey) {
  console.error("N8N_BASE_URL and N8N_API_KEY are required")
  process.exit(1)
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function getRuntimeSecrets() {
  const secrets = Object.fromEntries(
    config.n8n.runtimeSecretKeys.map((key) => [key, process.env[key] || ""]),
  )
  const missing = Object.entries(secrets)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing runtime secret env vars: ${missing.join(", ")}`)
  }

  return secrets
}

async function api(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      "X-N8N-API-KEY": apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${pathname} failed: ${response.status} ${body}`)
  }
  return body ? JSON.parse(body) : {}
}

async function createTemporaryWorkflow(command) {
  const slug = `codex-install-runtime-secrets-${randomUUID().replace(/-/g, "")}`
  const payload = {
    name: `Codex Install Runtime Secrets ${slug}`,
    nodes: [
      {
        parameters: {
          path: slug,
          httpMethod: "POST",
          responseMode: "lastNode",
        },
        id: "webhook-node",
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2,
        position: [260, 300],
        webhookId: slug,
      },
      {
        parameters: {
          command,
        },
        id: "install-command-node",
        name: "Install Runtime Secrets",
        type: "n8n-nodes-base.executeCommand",
        typeVersion: 1,
        position: [540, 300],
      },
    ],
    connections: {
      Webhook: {
        main: [
          [
            {
              node: "Install Runtime Secrets",
              type: "main",
              index: 0,
            },
          ],
        ],
      },
    },
    settings: {},
  }

  const workflow = await api("/api/v1/workflows", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  await api(`/api/v1/workflows/${workflow.id}/activate`, { method: "POST" })
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    id: workflow.id,
    path: slug,
  }
}

async function deleteWorkflow(workflowId) {
  try {
    await api(`/api/v1/workflows/${workflowId}`, { method: "DELETE" })
  } catch (error) {
    console.error(`Cleanup warning for workflow ${workflowId}: ${error.message}`)
  }
}

async function triggerWorkflow(webhookPath) {
  const response = await fetch(`${baseUrl}/webhook/${webhookPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ install: true }),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Trigger failed: ${response.status} ${body}`)
  }
  return body ? JSON.parse(body) : {}
}

function buildInstallCommand(secrets) {
  const filePath = config.n8n.runtimeEnvFilePath
  const dirPath = path.posix.dirname(filePath)
  const lines = [
    "# Managed by scripts/devops/install-n8n-runtime-secrets.mjs",
    ...Object.entries(secrets).map(([key, value]) => `${key}=${shellSingleQuote(value)}`),
  ]

  return [
    "set -eu",
    `mkdir -p ${shellSingleQuote(dirPath)}`,
    `cat > ${shellSingleQuote(filePath)} <<'EOF'`,
    ...lines,
    "EOF",
    `chmod 600 ${shellSingleQuote(filePath)}`,
    `printf 'runtime_env_path=%s\\n' ${shellSingleQuote(filePath)}`,
    `stat -c 'owner=%U mode=%a path=%n' ${shellSingleQuote(filePath)}`,
    `sed -n 's/=.*//p' ${shellSingleQuote(filePath)}`,
  ].join("\n")
}

async function main() {
  const secrets = getRuntimeSecrets()
  const workflow = await createTemporaryWorkflow(buildInstallCommand(secrets))

  try {
    const result = await triggerWorkflow(workflow.path)
    console.log(
      JSON.stringify(
        {
          ok: result.exitCode === 0,
          workflowId: workflow.id,
          runtimeEnvFilePath: config.n8n.runtimeEnvFilePath,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        },
        null,
        2,
      ),
    )
    process.exitCode = result.exitCode === 0 ? 0 : 1
  } finally {
    await deleteWorkflow(workflow.id)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
