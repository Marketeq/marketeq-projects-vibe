#!/usr/bin/env node

import { execFileSync } from "node:child_process"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const explicitShaIndex = args.indexOf("--to-sha")
const explicitSha = explicitShaIndex >= 0 ? args[explicitShaIndex + 1] : ""
const searchDepthIndex = args.indexOf("--depth")
const searchDepth = searchDepthIndex >= 0 ? Number(args[searchDepthIndex + 1]) : 40

const baseUrl = process.env.N8N_BASE_URL
const apiKey = process.env.N8N_API_KEY

if (apply && (!baseUrl || !apiKey)) {
  console.error("N8N_BASE_URL and N8N_API_KEY are required for --apply")
  process.exit(1)
}

function sh(command, args) {
  return execFileSync(command, args, {
    cwd: "/tmp/marketeq-devops-remediation",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function getStatusContexts(sha) {
  const payload = JSON.parse(sh("gh", ["api", `repos/Marketeq/marketeq-projects-vibe/commits/${sha}/status`]))
  const statuses = payload.statuses || []
  const vercel = statuses.find((status) => status.context === "Vercel – marketeq-projects-staging")
  const smoke = statuses.find((status) => status.context === "Smoke – marketeq-projects-staging")
  return {
    vercelState: vercel?.state || "",
    vercelDescription: vercel?.description || "",
    smokeState: smoke?.state || "",
    smokeDescription: smoke?.description || "",
  }
}

function findRollbackCandidate(depth) {
  const shas = sh("git", ["rev-list", "origin/staging", "-n", String(depth)]).split("\n").filter(Boolean)
  const headSha = shas[0] || ""

  for (const sha of shas.slice(1)) {
    const status = getStatusContexts(sha)
    if (status.vercelState === "success" && status.smokeState === "success") {
      return { headSha, candidateSha: sha, status }
    }
  }

  return { headSha, candidateSha: "", status: null }
}

async function triggerRollback(targetSha) {
  const startedAt = new Date().toISOString()
  const response = await fetch(`${baseUrl}/webhook/${"marketeq-vibe-deploy"}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "rollback",
      branch: "staging",
      sha: targetSha,
    }),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Rollback trigger failed: ${response.status} ${body}`)
  }

  return { startedAt, response: body ? JSON.parse(body) : {} }
}

async function waitForExecution(startedAtIso) {
  const startedAtMs = Date.parse(startedAtIso)

  for (let attempt = 1; attempt <= 180; attempt += 1) {
    const payload = await fetch(`${baseUrl}/api/v1/executions?workflowId=PPUT0GooYV2jbwMC&limit=10&includeData=true`, {
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    }).then(async (response) => {
      const body = await response.text()
      if (!response.ok) throw new Error(`Execution poll failed: ${response.status} ${body}`)
      return JSON.parse(body)
    })

    const match = (payload.data || []).find((entry) => Date.parse(entry.startedAt) >= startedAtMs - 1000)
    if (match?.finished) {
      const deploy = match.data?.resultData?.runData?.["Deploy Orchestrator"]?.[0]?.data?.main?.[0]?.[0]?.json || {}
      let parsed = {}
      try {
        parsed = JSON.parse(deploy.stdout || "{}")
      } catch {
        parsed = { raw: deploy.stdout || "" }
      }
      return {
        executionId: match.id,
        status: match.status,
        startedAt: match.startedAt,
        stoppedAt: match.stoppedAt,
        summary: parsed,
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  throw new Error("Timed out waiting for rollback execution")
}

async function main() {
  const candidate = findRollbackCandidate(searchDepth)
  const targetSha = explicitSha || candidate.candidateSha

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          ok: Boolean(candidate.candidateSha),
          mode: "check",
          currentStagingSha: candidate.headSha,
          candidateSha: candidate.candidateSha,
          candidateStatus: candidate.status,
        },
        null,
        2,
      ),
    )
    process.exit(candidate.candidateSha ? 0 : 1)
  }

  if (!targetSha) {
    throw new Error("No rollback candidate found and no --to-sha was provided")
  }

  const trigger = await triggerRollback(targetSha)
  const execution = await waitForExecution(trigger.startedAt)

  console.log(
    JSON.stringify(
      {
        ok: execution.status === "success",
        mode: "apply",
        currentStagingSha: candidate.headSha,
        targetSha,
        trigger,
        execution,
      },
      null,
      2,
    ),
  )

  process.exit(execution.status === "success" ? 0 : 1)
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
