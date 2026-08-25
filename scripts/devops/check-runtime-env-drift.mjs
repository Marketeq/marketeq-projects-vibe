#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "marketeq-devops.config.json"), "utf8"),
)
const baseline = JSON.parse(
  fs.readFileSync(path.join(repoRoot, config.n8n.stagingEnvBaselinePath), "utf8"),
)

const vercelToken = process.env.VERCEL_TOKEN
const renderToken = process.env.RENDER_TOKEN

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

function toSortedUniqueStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort()
}

function parseOriginList(value) {
  return toSortedUniqueStrings(String(value || "").split(","))
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

async function fetchVercelEnv() {
  if (!vercelToken) {
    return {
      available: false,
      reason: "VERCEL_TOKEN not set",
      report: null,
    }
  }

  try {
    const payload = await fetchJson(
      `https://api.vercel.com/v9/projects/${baseline.vercelStaging.projectId}/env?teamId=${config.vercel.teamId}`,
      {
        Authorization: `Bearer ${vercelToken}`,
      },
    )

    const target = JSON.stringify(baseline.vercelStaging.target.slice().sort())
    const live = new Map()
    for (const entry of payload?.envs || []) {
      const entryTarget = JSON.stringify((entry?.target || []).slice().sort())
      if (entryTarget !== target || !entry?.key) continue
      live.set(entry.key, String(entry.value ?? ""))
    }

    const drift = []
    for (const [key, value] of Object.entries(baseline.vercelStaging.values)) {
      const actual = live.has(key) ? live.get(key) : null
      if (actual === null) {
        drift.push({ key, reason: "missing", expected: value, actual: null })
      } else if (String(actual) !== String(value)) {
        drift.push({ key, reason: "value-mismatch", expected: value, actual })
      }
    }

    return {
      available: true,
      reason: "",
      report: {
        ok: drift.length === 0,
        drift,
        liveValues: Object.fromEntries(
          Object.keys(baseline.vercelStaging.values).map((key) => [key, live.get(key) ?? null]),
        ),
      },
    }
  } catch (error) {
    return {
      available: false,
      reason: error.message || String(error),
      report: null,
    }
  }
}

async function fetchRenderEnv() {
  if (!renderToken) {
    return {
      available: false,
      reason: "RENDER_TOKEN not set",
      report: null,
    }
  }

  try {
    const payload = await fetchJson(
      `https://api.render.com/v1/services/${config.render.serviceId}/env-vars?limit=100`,
      {
        Authorization: `Bearer ${renderToken}`,
        Accept: "application/json",
      },
    )

    const live = new Map(
      (Array.isArray(payload) ? payload : [])
        .map((entry) => [entry?.envVar?.key, entry?.envVar?.value])
        .filter(([key]) => Boolean(key)),
    )

    const minimumVarCount = baseline.renderSharedBackend.minimumVarCount || 0
    if (minimumVarCount > 0 && live.size < minimumVarCount) {
      return {
        available: true,
        reason: "",
        report: {
          ok: false,
          drift: [{ key: "__ENV_COUNT__", reason: "bulk-deletion", expected: minimumVarCount, actual: live.size }],
          missingSecrets: [],
          bulkDeletion: true,
          liveCount: live.size,
          expectedMinimum: minimumVarCount,
        },
      }
    }

    const drift = []
    for (const [key, value] of Object.entries(baseline.renderSharedBackend.values)) {
      const actual = String(live.get(key) ?? "")
      if (actual !== String(value)) {
        drift.push({ key, reason: actual ? "value-mismatch" : "missing", expected: value, actual })
      }
    }

    const requiredOrigins = toSortedUniqueStrings(baseline.renderSharedBackend.requiredOriginList)
    const actualOrigins = parseOriginList(live.get("FRONTEND_URL") ?? "")
    const missingOrigins = requiredOrigins.filter((origin) => !actualOrigins.includes(origin))
    const extraOrigins = actualOrigins.filter((origin) => !requiredOrigins.includes(origin))
    if (missingOrigins.length > 0 || extraOrigins.length > 0) {
      drift.push({
        key: "FRONTEND_URL",
        reason: "origin-mismatch",
        expected: requiredOrigins,
        actual: actualOrigins,
        missingOrigins,
        extraOrigins,
      })
    }

    const missingSecrets = Object.entries(baseline.renderSharedBackend.requiredSecrets)
      .filter(([key]) => !String(live.get(key) ?? ""))
      .map(([key, backupEnv]) => ({
        key,
        backupEnv,
        backupPresent: Boolean(process.env[backupEnv]),
      }))

    return {
      available: true,
      reason: "",
      report: {
        ok: drift.length === 0 && missingSecrets.length === 0,
        drift,
        missingSecrets,
        liveValues: {
          DATABASE_SSL: String(live.get("DATABASE_SSL") ?? ""),
          FRONTEND_URL: String(live.get("FRONTEND_URL") ?? ""),
        },
      },
    }
  } catch (error) {
    return {
      available: false,
      reason: error.message || String(error),
      report: null,
    }
  }
}

async function checkRenderServiceCount() {
  if (!renderToken) {
    return { available: false, reason: "RENDER_TOKEN not set", report: null }
  }

  try {
    const services = await fetchJson(
      `https://api.render.com/v1/services?ownerId=${config.render.ownerId}&limit=50`,
      { Authorization: `Bearer ${renderToken}`, Accept: "application/json" },
    )

    const allowed = new Set(config.render.allowedServiceIds)
    const active = (Array.isArray(services) ? services : [])
      .map((s) => s.service)
      .filter((s) => s.suspended !== "suspended")

    const rogue = active.filter((s) => !allowed.has(s.id))

    return {
      available: true,
      reason: "",
      report: {
        ok: rogue.length === 0,
        activeCount: active.length,
        allowedCount: allowed.size,
        rogue: rogue.map((s) => ({ id: s.id, name: s.name, branch: s.branch, url: s.serviceDetails?.url })),
      },
    }
  } catch (error) {
    return { available: false, reason: error.message || String(error), report: null }
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

  const vercel = await fetchVercelEnv()
  const render = await fetchRenderEnv()
  const renderServices = await checkRenderServiceCount()
  const failures = []

  if (!vercel.available) {
    failures.push(`Vercel staging env read unavailable: ${vercel.reason}`)
  } else if (!vercel.report.ok) {
    failures.push(`Vercel staging drift detected: ${vercel.report.drift.map((item) => item.key).join(", ")}`)
  }

  if (!renderServices.available) {
    failures.push(`Render service count check unavailable: ${renderServices.reason}`)
  } else if (!renderServices.report.ok) {
    const names = renderServices.report.rogue.map((s) => `${s.name} (${s.id})`).join(", ")
    failures.push(`ROGUE Render services detected — delete immediately: ${names}`)
  }

  if (!render.available) {
    failures.push(`Render env read unavailable: ${render.reason}`)
  } else {
    if (render.report.drift.length > 0) {
      failures.push(`Render drift detected: ${render.report.drift.map((item) => item.key).join(", ")}`)
    }
    if (render.report.missingSecrets.length > 0) {
      failures.push(
        `Render missing required secrets: ${render.report.missingSecrets.map((item) => item.key).join(", ")}`,
      )
    }
  }

  const report = {
    ok: failures.length === 0,
    failures,
    expectations,
    vercelStaging: vercel,
    renderSharedBackend: render,
    renderServiceGuard: renderServices,
  }

  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.ok ? 0 : 1
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
