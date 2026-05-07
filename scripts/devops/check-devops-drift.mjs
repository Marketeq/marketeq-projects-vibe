#!/usr/bin/env node

import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildN8nBuildCommand,
  containsInlineSecret,
  extractRunnerUrl,
} from "./build-n8n-build-command.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const configPath = path.join(__dirname, "marketeq-devops.config.json")
const config = JSON.parse(fs.readFileSync(configPath, "utf8"))

function sh(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim()
}

function trySh(command, args, options = {}) {
  try {
    return { ok: true, value: sh(command, args, options) }
  } catch (error) {
    return {
      ok: false,
      error: String(error.stderr || error.message || error),
    }
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function parseEnvTemplate(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const keys = []

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (match) keys.push(match[1])
  }

  return {
    file: path.relative(repoRoot, filePath),
    keys,
    keySet: new Set(keys),
  }
}

function getTemplateReport() {
  const frontendTemplates = [
    parseEnvTemplate(path.join(repoRoot, "frontend/.env.local.example")),
    parseEnvTemplate(path.join(repoRoot, "frontend/.env.staging.example")),
    parseEnvTemplate(path.join(repoRoot, "frontend/.env.production.example")),
  ]
  const backendTemplates = [
    parseEnvTemplate(path.join(repoRoot, "backend/.env.local.example")),
    parseEnvTemplate(path.join(repoRoot, "backend/.env.staging.example")),
    parseEnvTemplate(path.join(repoRoot, "backend/.env.production.example")),
  ]

  const frontendMissing = frontendTemplates.map((template) => ({
    file: template.file,
    missing: config.envContracts.frontendRequiredKeys.filter((key) => !template.keySet.has(key)),
  }))
  const backendMissing = backendTemplates.map((template) => ({
    file: template.file,
    missing: config.envContracts.backendRequiredKeys.filter((key) => !template.keySet.has(key)),
  }))

  return {
    frontend: frontendMissing,
    backend: backendMissing,
  }
}

async function getN8nReport() {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY

  if (!baseUrl || !apiKey) {
    return {
      available: false,
      reason: "N8N_BASE_URL or N8N_API_KEY not set",
    }
  }

  const workflow = await fetch(`${baseUrl}/api/v1/workflows/${config.n8n.workflowId}`, {
    headers: {
      "X-N8N-API-KEY": apiKey,
    },
  }).then(async (response) => {
    const body = await response.text()
    if (!response.ok) {
      throw new Error(`n8n workflow fetch failed: ${response.status} ${body}`)
    }
    return JSON.parse(body)
  })

  const buildCommandNode = workflow.nodes.find((node) => node.name === "Build Command")
  const webhookNode = workflow.nodes.find((node) => node.name === "Webhook")
  const buildCommandJs = String(buildCommandNode?.parameters?.jsCode ?? "")
  const expectedBuildCommandJs = buildN8nBuildCommand({
    runnerRawUrl: config.n8n.runnerRawUrl,
    runtimeEnvFilePath: config.n8n.runtimeEnvFilePath,
  })
  const runnerUrl = extractRunnerUrl(buildCommandJs)

  return {
    available: true,
    workflowId: workflow.id,
    workflowName: workflow.name,
    active: workflow.active,
    webhookId: webhookNode?.webhookId ?? "",
    webhookPath: webhookNode?.parameters?.path ?? "",
    runnerUrl,
    runnerUrlMatchesConfig: runnerUrl === config.n8n.runnerRawUrl,
    runtimeEnvFileReferenced: buildCommandJs.includes(config.n8n.runtimeEnvFilePath),
    buildCommandMatchesConfig: buildCommandJs === expectedBuildCommandJs,
    containsInlineSecret: containsInlineSecret(buildCommandJs),
  }
}

function getGistReport() {
  const response = JSON.parse(sh("gh", ["api", `/gists/${config.n8n.runnerGistId}`]))
  const file = response.files["marketeq_orchestrator_node.js"]
  const currentRawUrl = file?.raw_url ?? ""
  const content = file?.content ?? ""

  return {
    gistId: config.n8n.runnerGistId,
    currentRawUrl,
    rawUrlMatchesConfig: currentRawUrl === config.n8n.runnerRawUrl,
    liveHash: content ? sha256(content) : "",
  }
}

function getBranchReport() {
  const branches = Object.fromEntries(
    config.protectedBranches.map((branch) => [
      branch,
      sh("git", ["rev-parse", `origin/${branch}`]),
    ]),
  )

  return {
    branches,
    parity: {
      devMainEqualsStaging: branches["dev-main"] === branches.staging,
      stagingEqualsLive: branches.staging === branches["live-mvp"],
    },
  }
}

function getStatusReport() {
  const headSha = sh("git", ["rev-parse", "origin/dev-main"])
  const raw = sh("gh", ["api", `repos/${config.repo}/commits/${headSha}/status`])
  const payload = JSON.parse(raw)
  const relevant = payload.statuses
    .filter((status) => /^(Vercel|Smoke) – /.test(status.context))
    .map((status) => ({
      context: status.context,
      state: status.state,
      description: status.description,
      updatedAt: status.updated_at,
    }))

  return {
    sha: headSha,
    statuses: relevant,
  }
}

async function main() {
  const repoRunnerPath = path.resolve(
    repoRoot,
    process.env.MARKETEQ_ORCHESTRATOR_SOURCE || config.n8n.runnerSourcePath,
  )
  const repoRunnerExists = fs.existsSync(repoRunnerPath)
  const repoRunnerContent = repoRunnerExists ? fs.readFileSync(repoRunnerPath, "utf8") : ""
  const repoRunnerHash = repoRunnerContent ? sha256(repoRunnerContent) : ""

  const gist = getGistReport()
  const branches = getBranchReport()
  const envContracts = getTemplateReport()
  const latestStatuses = getStatusReport()
  const n8n = await getN8nReport()

  const failures = []

  for (const report of [...envContracts.frontend, ...envContracts.backend]) {
    if (report.missing.length > 0) {
      failures.push(`Missing env keys in ${report.file}: ${report.missing.join(", ")}`)
    }
  }

  if (!gist.rawUrlMatchesConfig) {
    failures.push("Pinned runnerRawUrl in config does not match the current gist raw URL")
  }

  if (repoRunnerExists && gist.liveHash && repoRunnerHash !== gist.liveHash) {
    failures.push("Live gist content hash differs from the local orchestrator source")
  }

  if (n8n.available) {
    if (!n8n.active) failures.push("n8n workflow is not active")
    if (n8n.workflowName !== config.n8n.workflowName) {
      failures.push("n8n workflow name differs from config")
    }
    if (n8n.webhookId !== config.n8n.webhookId) {
      failures.push("n8n webhookId differs from config")
    }
    if (n8n.webhookPath !== config.n8n.webhookPath) {
      failures.push("n8n webhook path differs from config")
    }
    if (!n8n.runnerUrlMatchesConfig) {
      failures.push("n8n Build Command runner URL differs from config")
    }
    if (!n8n.runtimeEnvFileReferenced) {
      failures.push("n8n Build Command does not reference the configured runtime env file")
    }
    if (!n8n.buildCommandMatchesConfig) {
      failures.push("n8n Build Command differs from the repo-controlled contract")
    }
    if (n8n.containsInlineSecret) {
      failures.push("n8n Build Command still contains inline secrets")
    }
  }

  const report = {
    ok: failures.length === 0,
    failures,
    repoRunner: {
      path: repoRunnerExists ? path.relative(repoRoot, repoRunnerPath) : null,
      exists: repoRunnerExists,
      hash: repoRunnerHash,
    },
    gist,
    n8n,
    branches,
    envContracts,
    latestStatuses,
  }

  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.ok ? 0 : 1
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
