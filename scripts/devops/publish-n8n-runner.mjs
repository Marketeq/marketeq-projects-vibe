#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const configPath = path.join(__dirname, "marketeq-devops.config.json")
const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
const sourcePath = path.resolve(repoRoot, config.n8n.runnerSourcePath)

function sh(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function getCurrentRawUrl() {
  const payload = JSON.parse(sh("gh", ["api", `/gists/${config.n8n.runnerGistId}`]))
  return payload.files["marketeq_orchestrator_node.js"]?.raw_url ?? ""
}

function updateConfigRawUrl(rawUrl) {
  const next = {
    ...config,
    n8n: {
      ...config.n8n,
      runnerRawUrl: rawUrl,
    },
  }
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`)
}

function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Runner source file not found: ${sourcePath}`)
  }

  sh("gh", [
    "gist",
    "edit",
    config.n8n.runnerGistId,
    sourcePath,
    "--filename",
    "marketeq_orchestrator_node.js",
  ])

  const rawUrl = getCurrentRawUrl()
  if (!rawUrl) {
    throw new Error("Failed to resolve raw_url after gist publish")
  }

  updateConfigRawUrl(rawUrl)
  console.log(
    JSON.stringify(
      {
        ok: true,
        gistId: config.n8n.runnerGistId,
        runnerSourcePath: path.relative(repoRoot, sourcePath),
        runnerRawUrl: rawUrl,
      },
      null,
      2,
    ),
  )
}

main()
