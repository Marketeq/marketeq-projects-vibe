#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  buildN8nBuildCommand,
  extractRunnerUrl,
} from "./build-n8n-build-command.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "marketeq-devops.config.json"), "utf8"),
)

const args = new Set(process.argv.slice(2))
const checkOnly = args.has("--check")
const apply = args.has("--apply")

if (!checkOnly && !apply) {
  console.error("Usage: node scripts/devops/sync-n8n-workflow.mjs [--check|--apply]")
  process.exit(1)
}

const baseUrl = process.env.N8N_BASE_URL
const apiKey = process.env.N8N_API_KEY

if (!baseUrl || !apiKey) {
  console.error("N8N_BASE_URL and N8N_API_KEY are required")
  process.exit(1)
}

function slimNode(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    typeVersion: node.typeVersion,
    position: node.position,
    parameters: node.parameters,
    ...(node.webhookId ? { webhookId: node.webhookId } : {}),
  }
}

async function fetchWorkflow() {
  const response = await fetch(`${baseUrl}/api/v1/workflows/${config.n8n.workflowId}`, {
    headers: {
      "X-N8N-API-KEY": apiKey,
    },
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow: ${response.status} ${body}`)
  }
  return JSON.parse(body)
}

async function putWorkflow(payload) {
  const response = await fetch(`${baseUrl}/api/v1/workflows/${config.n8n.workflowId}`, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Failed to update workflow: ${response.status} ${body}`)
  }
  return JSON.parse(body)
}

function buildPayload(workflow) {
  const expectedJsCode = buildN8nBuildCommand({
    runnerRawUrl: config.n8n.runnerRawUrl,
    runtimeEnvFilePath: config.n8n.runtimeEnvFilePath,
  })

  return {
    name: workflow.name,
    nodes: workflow.nodes.map((node) => {
      if (node.name !== "Build Command") {
        return slimNode(node)
      }

      return slimNode({
        ...node,
        parameters: {
          ...node.parameters,
          jsCode: expectedJsCode,
        },
      })
    }),
    connections: workflow.connections,
    settings: {
      executionOrder: workflow.settings?.executionOrder ?? "v1",
      callerPolicy: workflow.settings?.callerPolicy ?? "workflowsFromSameOwner",
    },
  }
}

async function main() {
  const workflow = await fetchWorkflow()
  const buildCommandNode = workflow.nodes.find((node) => node.name === "Build Command")
  const currentJsCode = String(buildCommandNode?.parameters?.jsCode ?? "")
  const currentRunnerUrl = extractRunnerUrl(buildCommandNode?.parameters?.jsCode ?? "")
  const expectedJsCode = buildN8nBuildCommand({
    runnerRawUrl: config.n8n.runnerRawUrl,
    runtimeEnvFilePath: config.n8n.runtimeEnvFilePath,
  })
  const drift = currentJsCode !== expectedJsCode

  if (checkOnly) {
    console.log(
      JSON.stringify(
        {
          ok: !drift,
          workflowId: workflow.id,
          workflowName: workflow.name,
          currentMatchesConfig: !drift,
          currentRunnerUrl,
          expectedRunnerUrl: config.n8n.runnerRawUrl,
          runtimeEnvFilePath: config.n8n.runtimeEnvFilePath,
        },
        null,
        2,
      ),
    )
    process.exit(drift ? 1 : 0)
  }

  const payload = buildPayload(workflow)
  await putWorkflow(payload)
  const verified = await fetchWorkflow()
  const verifiedNode = verified.nodes.find((node) => node.name === "Build Command")
  const verifiedUrl = extractRunnerUrl(verifiedNode?.parameters?.jsCode ?? "")
  const verifiedJsCode = String(verifiedNode?.parameters?.jsCode ?? "")

  if (verifiedUrl !== config.n8n.runnerRawUrl || verifiedJsCode !== expectedJsCode) {
    throw new Error("Workflow update did not match the configured Build Command contract")
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        workflowId: verified.id,
        workflowName: verified.name,
        active: verified.active,
        runnerUrl: verifiedUrl,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
