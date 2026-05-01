#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "marketeq-devops.config.json"), "utf8"),
)

function parseEnvTemplate(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const keys = []

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (match) keys.push(match[1])
  }

  return [...new Set(keys)].sort()
}

function diffKeys(expectedKeys, liveKeys) {
  const expected = new Set(expectedKeys)
  const live = new Set(liveKeys)

  return {
    missing: expectedKeys.filter((key) => !live.has(key)),
    extra: liveKeys.filter((key) => !expected.has(key)),
  }
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers })
  const body = await response.text()
  let parsed = null
  try {
    parsed = body ? JSON.parse(body) : null
  } catch {
    parsed = body
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(parsed)}`)
  }

  return parsed
}

async function fetchRenderKeys() {
  const token = process.env.RENDER_TOKEN
  if (!token) {
    return {
      available: false,
      reason: "RENDER_TOKEN not set",
      keys: [],
    }
  }

  try {
    const payload = await fetchJson(
      `https://api.render.com/v1/services/${config.render.serviceId}/env-vars?limit=100`,
      {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    )

    const keys = Array.isArray(payload)
      ? payload
          .map((entry) => entry?.envVar?.key)
          .filter(Boolean)
          .sort()
      : []

    return {
      available: true,
      reason: "",
      keys,
    }
  } catch (error) {
    return {
      available: false,
      reason: error.message || String(error),
      keys: [],
    }
  }
}

async function fetchVercelKeys(projectId) {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    return {
      available: false,
      reason: "VERCEL_TOKEN not set",
      keys: [],
    }
  }

  try {
    const payload = await fetchJson(
      `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${config.vercel.teamId}`,
      {
        Authorization: `Bearer ${token}`,
      },
    )

    const keys = Array.isArray(payload?.envs)
      ? [...new Set(payload.envs.map((entry) => entry?.key).filter(Boolean))].sort()
      : []

    return {
      available: true,
      reason: "",
      keys,
    }
  } catch (error) {
    return {
      available: false,
      reason: error.message || String(error),
      keys: [],
    }
  }
}

async function main() {
  const expectations = {
    vercel: {
      "dev-main": parseEnvTemplate(path.join(repoRoot, "frontend/.env.local.example")),
      staging: parseEnvTemplate(path.join(repoRoot, "frontend/.env.staging.example")),
      "live-mvp": parseEnvTemplate(path.join(repoRoot, "frontend/.env.production.example")),
    },
    render: parseEnvTemplate(path.join(repoRoot, "backend/.env.production.example")),
  }

  const renderLive = await fetchRenderKeys()
  const vercelReports = {}
  for (const branchName of ["dev-main", "staging", "live-mvp"]) {
    const projectId = config.vercel.projects[branchName].projectId
    const live = await fetchVercelKeys(projectId)
    vercelReports[branchName] = {
      available: live.available,
      reason: live.reason,
      expectedKeys: expectations.vercel[branchName],
      liveKeys: live.keys,
      ...diffKeys(expectations.vercel[branchName], live.keys),
    }
  }

  const renderReport = {
    available: renderLive.available,
    reason: renderLive.reason,
    expectedKeys: expectations.render,
    liveKeys: renderLive.keys,
    ...diffKeys(expectations.render, renderLive.keys),
  }

  const failures = []

  for (const [branchName, report] of Object.entries(vercelReports)) {
    if (!report.available) {
      failures.push(`Vercel env read unavailable for ${branchName}: ${report.reason}`)
      continue
    }

    if (report.missing.length > 0) {
      failures.push(`Vercel ${branchName} missing env keys: ${report.missing.join(", ")}`)
    }
  }

  if (!renderReport.available) {
    failures.push(`Render env read unavailable: ${renderReport.reason}`)
  } else if (renderReport.missing.length > 0) {
    failures.push(`Render missing env keys: ${renderReport.missing.join(", ")}`)
  }

  const report = {
    ok: failures.length === 0,
    failures,
    vercel: vercelReports,
    render: renderReport,
  }

  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.ok ? 0 : 1
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
