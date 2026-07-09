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

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const checkOnly = !apply
const jsonOnly = args.includes("--json")
const componentIndex = args.indexOf("--component")
const component = componentIndex >= 0 ? args[componentIndex + 1] : "all"

if (!["all", "vercel", "render"].includes(component)) {
  console.error("Usage: node scripts/devops/sync-staging-runtime-envs.mjs [--apply] [--component all|vercel|render] [--json]")
  process.exit(1)
}

const vercelToken = process.env.VERCEL_TOKEN
const renderToken = process.env.RENDER_TOKEN

function envValue(key) {
  return process.env[key] || ""
}

function toSortedUniqueStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort()
}

function parseOriginList(value) {
  return toSortedUniqueStrings(String(value || "").split(","))
}

function serializeOriginList(origins) {
  return toSortedUniqueStrings(origins).join(",")
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init)
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`)
  }
  return data
}

async function vercelApi(method, pathname, body) {
  if (!vercelToken) {
    throw new Error("VERCEL_TOKEN not set")
  }

  const suffix = pathname.includes("?") ? "&" : "?"
  return fetchJson(`https://api.vercel.com${pathname}${suffix}teamId=${config.vercel.teamId}`, {
    method,
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

async function renderApi(method, pathname, body) {
  if (!renderToken) {
    throw new Error("RENDER_TOKEN not set")
  }

  return fetchJson(`https://api.render.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${renderToken}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

async function fetchVercelProjectEnv(projectId) {
  const payload = await vercelApi("GET", `/v9/projects/${projectId}/env`)
  return Array.isArray(payload?.envs) ? payload.envs : []
}

async function upsertVercelProjectEnv(projectId, key, value, target) {
  return vercelApi("POST", `/v10/projects/${projectId}/env?upsert=true`, {
    key,
    value,
    type: "plain",
    target,
  })
}

async function fetchAllRenderEnvVars() {
  const items = []
  let cursor = ""

  while (true) {
    const query = new URLSearchParams({ limit: "100" })
    if (cursor) query.set("cursor", cursor)
    const payload = await renderApi(
      "GET",
      `/v1/services/${config.render.serviceId}/env-vars?${query.toString()}`,
    )
    const page = Array.isArray(payload) ? payload : []
    items.push(...page)
    if (page.length === 0 || !page[page.length - 1]?.cursor) break
    cursor = page[page.length - 1].cursor
    if (page.length < 100) break
  }

  return items
}

async function replaceRenderEnvVars(entries) {
  const body = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
  }))

  try {
    return await renderApi("PUT", `/v1/services/${config.render.serviceId}/env-vars`, body)
  } catch (error) {
    if (!String(error.message || "").includes("400")) throw error
    return renderApi("PUT", `/v1/services/${config.render.serviceId}/env-vars`, {
      envVars: body,
    })
  }
}

function buildVercelReport(liveEnvs) {
  const target = baseline.vercelStaging.target
  const liveMap = new Map()

  for (const entry of liveEnvs) {
    const entryTargets = Array.isArray(entry?.target) ? entry.target.slice().sort() : []
    if (JSON.stringify(entryTargets) !== JSON.stringify(target.slice().sort())) continue
    if (!entry?.key) continue
    liveMap.set(entry.key, String(entry.value ?? ""))
  }

  const expected = baseline.vercelStaging.values
  const drift = []
  for (const [key, value] of Object.entries(expected)) {
    if (!liveMap.has(key)) {
      drift.push({ key, expected: value, actual: null, reason: "missing" })
    } else if (String(liveMap.get(key)) !== String(value)) {
      drift.push({ key, expected: value, actual: String(liveMap.get(key)), reason: "value-mismatch" })
    }
  }

  return {
    ok: drift.length === 0,
    drift,
    liveValues: Object.fromEntries([...liveMap.entries()].filter(([key]) => key in expected)),
  }
}

function buildRenderReport(liveEntries) {
  const liveMap = new Map(
    liveEntries
      .map((entry) => [entry?.envVar?.key, entry?.envVar?.value])
      .filter(([key]) => Boolean(key)),
  )

  const drift = []
  const secrets = []
  for (const [key, expected] of Object.entries(baseline.renderSharedBackend.values)) {
    const actual = String(liveMap.get(key) ?? "")
    if (actual !== String(expected)) {
      drift.push({ key, expected: String(expected), actual, reason: actual ? "value-mismatch" : "missing" })
    }
  }

  const requiredOrigins = toSortedUniqueStrings(baseline.renderSharedBackend.requiredOriginList)
  const actualOrigins = parseOriginList(liveMap.get("FRONTEND_URL") ?? "")
  const missingOrigins = requiredOrigins.filter((origin) => !actualOrigins.includes(origin))
  const extraOrigins = actualOrigins.filter((origin) => !requiredOrigins.includes(origin))
  if (missingOrigins.length > 0 || extraOrigins.length > 0) {
    drift.push({
      key: "FRONTEND_URL",
      expected: serializeOriginList(requiredOrigins),
      actual: serializeOriginList(actualOrigins),
      reason: "origin-mismatch",
      missingOrigins,
      extraOrigins,
    })
  }

  for (const [key, backupEnv] of Object.entries(baseline.renderSharedBackend.requiredSecrets)) {
    const actual = String(liveMap.get(key) ?? "")
    if (!actual) {
      secrets.push({
        key,
        backupEnv,
        repairable: Boolean(envValue(backupEnv)),
      })
    }
  }

  return {
    ok: drift.length === 0 && secrets.length === 0,
    drift,
    missingSecrets: secrets,
    liveValues: {
      DATABASE_SSL: String(liveMap.get("DATABASE_SSL") ?? ""),
      FRONTEND_URL: String(liveMap.get("FRONTEND_URL") ?? ""),
    },
  }
}

async function reconcileVercel() {
  const liveEnvs = await fetchVercelProjectEnv(baseline.vercelStaging.projectId)
  const report = buildVercelReport(liveEnvs)

  if (!apply || report.drift.length === 0) return report

  for (const item of report.drift) {
    await upsertVercelProjectEnv(
      baseline.vercelStaging.projectId,
      item.key,
      item.expected,
      baseline.vercelStaging.target,
    )
  }

  const verified = buildVercelReport(await fetchVercelProjectEnv(baseline.vercelStaging.projectId))
  return {
    ...verified,
    applied: report.drift.map((item) => item.key),
  }
}

async function reconcileRender() {
  const liveEntries = await fetchAllRenderEnvVars()
  const report = buildRenderReport(liveEntries)

  if (!apply || (report.drift.length === 0 && report.missingSecrets.length === 0)) {
    return report
  }

  const nextMap = new Map(
    liveEntries
      .map((entry) => [entry?.envVar?.key, entry?.envVar?.value])
      .filter(([key]) => Boolean(key)),
  )

  for (const [key, expected] of Object.entries(baseline.renderSharedBackend.values)) {
    nextMap.set(key, String(expected))
  }

  nextMap.set(
    "FRONTEND_URL",
    serializeOriginList(baseline.renderSharedBackend.requiredOriginList),
  )

  for (const issue of report.missingSecrets) {
    const backupValue = envValue(issue.backupEnv)
    if (!backupValue) {
      throw new Error(`Missing Render secret ${issue.key} and backup env ${issue.backupEnv} is not set`)
    }
    nextMap.set(issue.key, backupValue)
  }

  await replaceRenderEnvVars(
    [...nextMap.entries()].map(([key, value]) => ({
      key,
      value: String(value ?? ""),
    })),
  )

  const verified = buildRenderReport(await fetchAllRenderEnvVars())
  return {
    ...verified,
    applied: [
      ...report.drift.map((item) => item.key),
      ...report.missingSecrets.map((item) => item.key),
    ],
  }
}

async function main() {
  const report = {
    ok: true,
    mode: apply ? "apply" : "check",
    component,
  }

  if (component === "all" || component === "vercel") {
    report.vercelStaging = await reconcileVercel()
  }

  if (component === "all" || component === "render") {
    report.renderSharedBackend = await reconcileRender()
  }

  report.ok = [report.vercelStaging, report.renderSharedBackend]
    .filter(Boolean)
    .every((item) => item.ok)

  const output = JSON.stringify(report, null, 2)
  if (!jsonOnly) {
    console.log(output)
  } else {
    process.stdout.write(`${output}\n`)
  }
  process.exitCode = report.ok ? 0 : 1
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exit(1)
})
