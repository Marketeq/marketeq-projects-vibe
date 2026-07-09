#!/usr/bin/env node

const fs = require("node:fs");

const GH_TOKEN = process.env.GH_TOKEN || "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const RENDER_TOKEN = process.env.RENDER_TOKEN || "";
const SMOKE_USER_EMAIL = process.env.SMOKE_USER_EMAIL || "";
const SMOKE_USER_PASSWORD = process.env.SMOKE_USER_PASSWORD || "";
const RENDER_ENV_DATABASE_URL = process.env.RENDER_ENV_DATABASE_URL || "";
const RENDER_ENV_INTERNAL_SERVICE_TOKEN = process.env.RENDER_ENV_INTERNAL_SERVICE_TOKEN || "";
const RENDER_ENV_AUTH_REFRESH_SECRET = process.env.RENDER_ENV_AUTH_REFRESH_SECRET || "";
const RENDER_ENV_AUTH_JWT_PRIVATE_KEY = process.env.RENDER_ENV_AUTH_JWT_PRIVATE_KEY || "";
const RENDER_ENV_AUTH_JWT_PUBLIC_KEY = process.env.RENDER_ENV_AUTH_JWT_PUBLIC_KEY || "";
const RENDER_ENV_AUTH_JWT_TOKEN_EXPIRES_IN = process.env.RENDER_ENV_AUTH_JWT_TOKEN_EXPIRES_IN || "";
const RENDER_ENV_AUTH_REFRESH_TOKEN_EXPIRES_IN = process.env.RENDER_ENV_AUTH_REFRESH_TOKEN_EXPIRES_IN || "";
const RENDER_ENV_E2EE_SERVER_SECRET = process.env.RENDER_ENV_E2EE_SERVER_SECRET || "";
const RENDER_ENV_GOOGLE_CLIENT_ID = process.env.RENDER_ENV_GOOGLE_CLIENT_ID || "";
const RENDER_ENV_GOOGLE_CLIENT_SECRET = process.env.RENDER_ENV_GOOGLE_CLIENT_SECRET || "";
const RENDER_ENV_LINKEDIN_CLIENT_ID = process.env.RENDER_ENV_LINKEDIN_CLIENT_ID || "";
const RENDER_ENV_LINKEDIN_CLIENT_SECRET = process.env.RENDER_ENV_LINKEDIN_CLIENT_SECRET || "";
const RENDER_ENV_CLOUDFLARE_ACCOUNT_ID = process.env.RENDER_ENV_CLOUDFLARE_ACCOUNT_ID || "";
const RENDER_ENV_CLOUDFLARE_R2_ACCESS_KEY = process.env.RENDER_ENV_CLOUDFLARE_R2_ACCESS_KEY || "";
const RENDER_ENV_CLOUDFLARE_R2_SECRET_KEY = process.env.RENDER_ENV_CLOUDFLARE_R2_SECRET_KEY || "";
const RENDER_ENV_CLOUDFLARE_R2_BUCKET = process.env.RENDER_ENV_CLOUDFLARE_R2_BUCKET || "";
const RENDER_ENV_CLOUDFLARE_R2_ENDPOINT = process.env.RENDER_ENV_CLOUDFLARE_R2_ENDPOINT || "";
const RENDER_ENV_CLOUDFLARE_PUBLIC_URL = process.env.RENDER_ENV_CLOUDFLARE_PUBLIC_URL || "";
const RENDER_ENV_BREVO_API_KEY = process.env.RENDER_ENV_BREVO_API_KEY || "";
const RENDER_ENV_BREVO_FROM_EMAIL = process.env.RENDER_ENV_BREVO_FROM_EMAIL || "";
const RENDER_ENV_BREVO_FROM_NAME = process.env.RENDER_ENV_BREVO_FROM_NAME || "";

const EVENT = process.env.EVENT || "";
const BRANCH = process.env.BRANCH || "";
const SHA_INPUT = process.env.SHA_INPUT || "";
const BASE_SHA_OVERRIDE = process.env.BASE_SHA_OVERRIDE || "";

const REPO = "Marketeq/marketeq-projects-vibe";
const GITHUB_API = "https://api.github.com";
const VERCEL_API = "https://api.vercel.com";
const RENDER_API = "https://api.render.com";

const VERCEL_TEAM_ID = "team_t2RzlUaGU3p6OALpArhrWXh0";
const RENDER_SERVICE_ID = "srv-d76r48nafjfc73e1djf0";
const RENDER_URL = "https://marketeq-backend.onrender.com";
const RENDER_OWNER_ID = "tea-d0r57undiees73bn5npg";
const RENDER_ALLOWED_SERVICE_IDS = new Set([RENDER_SERVICE_ID]);

const PROJECTS = {
  "dev-main": {
    projectId: "prj_IuUgufT5MaEY03bNmdb3lFcr51WC",
    hookUrl:
      "https://api.vercel.com/v1/integrations/deploy/prj_IuUgufT5MaEY03bNmdb3lFcr51WC/DnIKP7dVUY",
    context: "Vercel – marketeq-projects-dev",
  },
  staging: {
    projectId: "prj_zxwZ4cEzY1kRsMbPst6nAoMWTxTG",
    hookUrl:
      "https://api.vercel.com/v1/integrations/deploy/prj_zxwZ4cEzY1kRsMbPst6nAoMWTxTG/Bi7aBdOndl",
    context: "Vercel – marketeq-projects-staging",
  },
  "live-mvp": {
    projectId: "prj_vvtSNsNsVxyMteDejCo32rh2CEiD",
    hookUrl:
      "https://api.vercel.com/v1/integrations/deploy/prj_vvtSNsNsVxyMteDejCo32rh2CEiD/tRsZvywpt4",
    context: "Vercel – marketeq-projects-live-mvp",
  },
};

const SMOKE_TARGETS = {
  "dev-main": {
    frontendUrl: "https://dev-marketeq-projects.vercel.app",
    context: "Smoke – marketeq-projects-dev",
  },
  staging: {
    frontendUrl: "https://staging-marketeq-projects.vercel.app",
    context: "Smoke – marketeq-projects-staging",
  },
  "live-mvp": {
    frontendUrl: "https://live-marketeq-projects.vercel.app",
    context: "Smoke – marketeq-projects-live-mvp",
  },
};

const STAGING_VERCEL_TARGET = ["production", "preview"];
const STAGING_VERCEL_ENV_BASELINE = {
  NEXT_PUBLIC_BACKEND_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_API_BASE_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_API_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_AUTH_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_USER_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_LISTINGS_URL: "https://marketeq-backend.onrender.com/api",
  NEXT_PUBLIC_WS_URL: "wss://marketeq-backend.onrender.com",
  NEXT_PUBLIC_AUTH_MODE: "staging",
  NEXT_PUBLIC_COOKIE_SAMESITE: "none",
  NEXT_PUBLIC_COOKIE_SECURE: "true",
  NEXT_PUBLIC_COOKIE_DOMAIN: ".marketeq-staging.com",
  NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT: "https://staging.marketeq.com/auth/google/callback",
  NEXT_PUBLIC_LINKEDIN_OAUTH_REDIRECT: "https://staging.marketeq.com/auth/linkedin/callback",
  NEXT_PUBLIC_ENABLE_DEV_LOGIN_BYPASS: "false",
  NEXT_PUBLIC_ENABLE_DEBUG_PANELS: "false",
  NEXT_PUBLIC_R2_CDN_BASE: "https://cdn.marketeq.com",
};
const RENDER_SHARED_BACKEND_BASELINE = {
  FRONTEND_URL: [
    "http://localhost:3000",
    "https://dev-marketeq-projects.vercel.app",
    "https://staging-marketeq-projects.vercel.app",
    "https://live-marketeq-projects.vercel.app",
    "https://marketeq-mvp-dev.vercel.app",
    "https://marketeq-mvp-staging.vercel.app",
    "https://marketeq-mvp-live.vercel.app",
    "https://dev.marketeq.com",
    "https://staging.marketeq.com",
    "https://marketeq.com",
  ],
  DATABASE_SSL: "false",
  DATABASE_SSL_ENABLED: "false",
  NODE_ENV: "production",
  RABBITMQ_REQUIRED: "false",
};
const RENDER_REQUIRED_SECRET_BACKUPS = {
  DATABASE_URL: { env: "RENDER_ENV_DATABASE_URL", value: RENDER_ENV_DATABASE_URL },
  INTERNAL_SERVICE_TOKEN: {
    env: "RENDER_ENV_INTERNAL_SERVICE_TOKEN",
    value: RENDER_ENV_INTERNAL_SERVICE_TOKEN,
  },
  AUTH_REFRESH_SECRET: {
    env: "RENDER_ENV_AUTH_REFRESH_SECRET",
    value: RENDER_ENV_AUTH_REFRESH_SECRET,
  },
  AUTH_JWT_PRIVATE_KEY: {
    env: "RENDER_ENV_AUTH_JWT_PRIVATE_KEY",
    value: RENDER_ENV_AUTH_JWT_PRIVATE_KEY,
  },
  AUTH_JWT_PUBLIC_KEY: {
    env: "RENDER_ENV_AUTH_JWT_PUBLIC_KEY",
    value: RENDER_ENV_AUTH_JWT_PUBLIC_KEY,
  },
  AUTH_JWT_TOKEN_EXPIRES_IN: {
    env: "RENDER_ENV_AUTH_JWT_TOKEN_EXPIRES_IN",
    value: RENDER_ENV_AUTH_JWT_TOKEN_EXPIRES_IN,
  },
  AUTH_REFRESH_TOKEN_EXPIRES_IN: {
    env: "RENDER_ENV_AUTH_REFRESH_TOKEN_EXPIRES_IN",
    value: RENDER_ENV_AUTH_REFRESH_TOKEN_EXPIRES_IN,
  },
  E2EE_SERVER_SECRET: {
    env: "RENDER_ENV_E2EE_SERVER_SECRET",
    value: RENDER_ENV_E2EE_SERVER_SECRET,
  },
  GOOGLE_CLIENT_ID: { env: "RENDER_ENV_GOOGLE_CLIENT_ID", value: RENDER_ENV_GOOGLE_CLIENT_ID },
  GOOGLE_CLIENT_SECRET: {
    env: "RENDER_ENV_GOOGLE_CLIENT_SECRET",
    value: RENDER_ENV_GOOGLE_CLIENT_SECRET,
  },
  LINKEDIN_CLIENT_ID: { env: "RENDER_ENV_LINKEDIN_CLIENT_ID", value: RENDER_ENV_LINKEDIN_CLIENT_ID },
  LINKEDIN_CLIENT_SECRET: {
    env: "RENDER_ENV_LINKEDIN_CLIENT_SECRET",
    value: RENDER_ENV_LINKEDIN_CLIENT_SECRET,
  },
  CLOUDFLARE_ACCOUNT_ID: {
    env: "RENDER_ENV_CLOUDFLARE_ACCOUNT_ID",
    value: RENDER_ENV_CLOUDFLARE_ACCOUNT_ID,
  },
  CLOUDFLARE_R2_ACCESS_KEY: {
    env: "RENDER_ENV_CLOUDFLARE_R2_ACCESS_KEY",
    value: RENDER_ENV_CLOUDFLARE_R2_ACCESS_KEY,
  },
  CLOUDFLARE_R2_SECRET_KEY: {
    env: "RENDER_ENV_CLOUDFLARE_R2_SECRET_KEY",
    value: RENDER_ENV_CLOUDFLARE_R2_SECRET_KEY,
  },
  CLOUDFLARE_R2_BUCKET: {
    env: "RENDER_ENV_CLOUDFLARE_R2_BUCKET",
    value: RENDER_ENV_CLOUDFLARE_R2_BUCKET,
  },
  CLOUDFLARE_R2_ENDPOINT: {
    env: "RENDER_ENV_CLOUDFLARE_R2_ENDPOINT",
    value: RENDER_ENV_CLOUDFLARE_R2_ENDPOINT,
  },
  CLOUDFLARE_PUBLIC_URL: {
    env: "RENDER_ENV_CLOUDFLARE_PUBLIC_URL",
    value: RENDER_ENV_CLOUDFLARE_PUBLIC_URL,
  },
  BREVO_API_KEY: { env: "RENDER_ENV_BREVO_API_KEY", value: RENDER_ENV_BREVO_API_KEY },
  BREVO_FROM_EMAIL: {
    env: "RENDER_ENV_BREVO_FROM_EMAIL",
    value: RENDER_ENV_BREVO_FROM_EMAIL,
  },
  BREVO_FROM_NAME: {
    env: "RENDER_ENV_BREVO_FROM_NAME",
    value: RENDER_ENV_BREVO_FROM_NAME,
  },
};

const IGNORED_PROMOTION_PATTERNS = [
  /^docs\//,
  /^\.github\//,
  /^README\.md$/i,
  /^CONTRIBUTING\.md$/i,
  /^CLAUDE\.md$/i,
  /^CONFIDENTIALITY\.md$/i,
  /^LICENSE$/i,
  /^MIGRATION-GUIDE\.md$/i,
  /\.md$/i,
];

const BACKEND_PROMOTION_PATTERNS = [
  /^backend\//,
  /^render\.ya?ml$/i,
];

let repoPublic = false;
const PROTECTED_BRANCHES = ["dev-main", "staging", "live-mvp"];
const DEPLOY_SUMMARY_PREFIX = "<!-- marketeq-deploy-summary:";
const LOCK_ROOT = "/home/node/.n8n/marketeq-locks";
const LOCK_STALE_MS = 30 * 60 * 1000;
const LOCK_WAIT_MS = 5 * 60 * 1000;

function assertRequiredSecrets() {
  const missing = [];

  if (!GH_TOKEN) missing.push("GH_TOKEN");
  if (!VERCEL_TOKEN) missing.push("VERCEL_TOKEN");
  if (!RENDER_TOKEN) missing.push("RENDER_TOKEN");
  if (!SMOKE_USER_EMAIL) missing.push("SMOKE_USER_EMAIL");
  if (!SMOKE_USER_PASSWORD) missing.push("SMOKE_USER_PASSWORD");

  if (missing.length > 0) {
    throw new Error(`Missing required runtime secrets: ${missing.join(", ")}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSortedUniqueStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

function parseOriginList(value) {
  return toSortedUniqueStrings(String(value || "").split(","));
}

function serializeOriginList(values) {
  return toSortedUniqueStrings(values).join(",");
}

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function ghApi(method, path, body) {
  return jsonFetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function renderApi(method, path, body) {
  return jsonFetch(`${RENDER_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RENDER_TOKEN}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function vercelApi(method, path, body) {
  return jsonFetch(`${VERCEL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function fetchVercelProjectEnv(projectId) {
  const payload = await vercelApi("GET", `/v9/projects/${projectId}/env?teamId=${VERCEL_TEAM_ID}`);
  return Array.isArray(payload?.envs) ? payload.envs : [];
}

async function upsertVercelProjectEnv(projectId, key, value, target = STAGING_VERCEL_TARGET) {
  return vercelApi("POST", `/v10/projects/${projectId}/env?upsert=true&teamId=${VERCEL_TEAM_ID}`, {
    key,
    value,
    type: "plain",
    target,
  });
}

async function fetchAllRenderEnvVars() {
  const items = [];
  let cursor = "";

  while (true) {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const payload = await renderApi("GET", `/v1/services/${RENDER_SERVICE_ID}/env-vars?${query.toString()}`);
    const page = Array.isArray(payload) ? payload : [];
    items.push(...page);
    if (page.length === 0 || !page[page.length - 1]?.cursor || page.length < 100) {
      break;
    }
    cursor = page[page.length - 1].cursor;
  }

  return items;
}

async function replaceRenderEnvVars(entries) {
  const body = entries.map((entry) => ({
    key: entry.key,
    value: entry.value,
  }));

  try {
    return await renderApi("PUT", `/v1/services/${RENDER_SERVICE_ID}/env-vars`, body);
  } catch (error) {
    if (!String(error?.message || "").includes("400")) {
      throw error;
    }
    return renderApi("PUT", `/v1/services/${RENDER_SERVICE_ID}/env-vars`, {
      envVars: body,
    });
  }
}

async function setCommitStatus(sha, context, state, description, targetUrl = "") {
  await ghApi("POST", `/repos/${REPO}/statuses/${sha}`, {
    state,
    context,
    description,
    ...(targetUrl ? { target_url: targetUrl } : {}),
  });
}

async function setTargetContexts(sha, targetBranches, state, description, targetUrl = "") {
  for (const branchName of targetBranches) {
    const project = PROJECTS[branchName];
    if (!project) continue;
    await setCommitStatus(sha, project.context, state, description, targetUrl);
  }
}

async function setSmokeContexts(sha, targetBranches, state, description, targetUrl = "") {
  for (const branchName of targetBranches) {
    const smokeTarget = SMOKE_TARGETS[branchName];
    if (!smokeTarget) continue;
    await setCommitStatus(sha, smokeTarget.context, state, description, targetUrl);
  }
}

async function markNonTargetContexts(sha, targetBranches) {
  for (const [branchName, project] of Object.entries(PROJECTS)) {
    if (targetBranches.includes(branchName)) continue;
    await setCommitStatus(sha, project.context, "success", "Non-target preview intentionally skipped by n8n");
  }
}

async function markNonTargetSmokeContexts(sha, targetBranches) {
  for (const [branchName, smokeTarget] of Object.entries(SMOKE_TARGETS)) {
    if (targetBranches.includes(branchName)) continue;
    await setCommitStatus(sha, smokeTarget.context, "success", "Non-target smoke intentionally skipped by n8n");
  }
}

async function setVisibility(visibility) {
  await ghApi("PATCH", `/repos/${REPO}`, { visibility });
}

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeCheck(check) {
  if (!check || typeof check !== "object") return null;
  return {
    ok: check.ok === true,
    system: check.system || "",
    context: check.context || "",
    branch: check.branch || "",
    state: check.state || "",
    url: check.url || "",
    route: check.route || "",
    reused: check.reused === true,
    deployId: check.deployId || "",
  };
}

function normalizeSummary(summary) {
  return {
    startedAt: summary.startedAt || "",
    endedAt: summary.endedAt || "",
    event: summary.event || "",
    branch: summary.branch || "",
    sha: summary.sha || "",
    status: summary.status || "",
    mode: summary.mode || "",
    reason: summary.reason || "",
    repoVisibilityFinal: summary.repoVisibilityFinal || "",
    targetBranches: Array.isArray(summary.targetBranches) ? summary.targetBranches : [],
    changedFiles: Array.isArray(summary.changedFiles) ? summary.changedFiles : [],
    checks: Array.isArray(summary.checks) ? summary.checks.map(normalizeCheck).filter(Boolean) : [],
    locks: summary.locks || null,
    error: summary.error || "",
    commentUrl: summary.commentUrl || "",
    commentError: summary.commentError || "",
  };
}

function buildSummaryCommentBody(summary) {
  const marker = `${DEPLOY_SUMMARY_PREFIX}${summary.branch} -->`;
  const normalized = normalizeSummary(summary);
  const changedFiles = normalized.changedFiles.slice(0, 20);
  const hiddenCount = Math.max(0, normalized.changedFiles.length - changedFiles.length);
  const checkLines =
    normalized.checks.length > 0
      ? normalized.checks.map((check) => {
          const parts = [
            check.system || "check",
            check.context || check.branch || "",
            check.state || "",
            check.ok ? "ok" : "not-ok",
            check.reused ? "reused" : "",
            check.route ? `route=${check.route}` : "",
          ].filter(Boolean);
          return `- ${parts.join(" | ")}${check.url ? ` | ${check.url}` : ""}`;
        })
      : ["- none"];

  const lines = [
    marker,
    "## Marketeq Deploy Summary",
    "",
    `- Status: \`${normalized.status}\``,
    `- Mode: \`${normalized.mode || "n/a"}\``,
    `- Branch: \`${normalized.branch}\``,
    `- SHA: \`${normalized.sha}\``,
    `- Event: \`${normalized.event}\``,
    `- Started: \`${normalized.startedAt}\``,
    `- Ended: \`${normalized.endedAt}\``,
    `- Final repo visibility: \`${normalized.repoVisibilityFinal}\``,
    `- Target branches: ${normalized.targetBranches.length > 0 ? normalized.targetBranches.map((value) => `\`${value}\``).join(", ") : "none"}`,
  ];

  if (normalized.reason) lines.push(`- Reason: ${normalized.reason}`);
  if (normalized.error) lines.push(`- Error: ${normalized.error}`);
  if (normalized.locks?.branches?.length) {
    lines.push(`- Lock wait: \`${normalized.locks.waitedMs}ms\``);
  }

  lines.push("", "### Checks", ...checkLines, "", "### Changed Files");

  if (changedFiles.length > 0) {
    lines.push(...changedFiles.map((file) => `- \`${file}\``));
    if (hiddenCount > 0) {
      lines.push(`- ...and ${hiddenCount} more`);
    }
  } else {
    lines.push("- none");
  }

  lines.push(
    "",
    "<details><summary>JSON</summary>",
    "",
    "```json",
    JSON.stringify(normalized, null, 2),
    "```",
    "",
    "</details>",
  );

  return lines.join("\n");
}

async function upsertDeploySummaryComment(summary) {
  if (!summary.sha || !PROTECTED_BRANCHES.includes(summary.branch)) {
    return null;
  }

  const marker = `${DEPLOY_SUMMARY_PREFIX}${summary.branch} -->`;
  const body = buildSummaryCommentBody(summary);
  const comments = await ghApi("GET", `/repos/${REPO}/commits/${summary.sha}/comments`);
  const existing = Array.isArray(comments)
    ? comments.find((comment) => String(comment.body || "").includes(marker))
    : null;

  if (existing) {
    const updated = await ghApi("PATCH", `/repos/${REPO}/comments/${existing.id}`, { body });
    return updated.html_url || "";
  }

  const created = await ghApi("POST", `/repos/${REPO}/commits/${summary.sha}/comments`, { body });
  return created.html_url || "";
}

function mergeErrorIntoSummary(summary, error) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const structured = safeJsonParse(message);

  if (structured && typeof structured === "object") {
    if (structured.sha) summary.sha = structured.sha;
    if (structured.mode) summary.mode = structured.mode;
    if (structured.status) summary.status = structured.status;
    if (structured.reason) summary.reason = structured.reason;
    if (Array.isArray(structured.changedFiles)) summary.changedFiles = structured.changedFiles;
    if (Array.isArray(structured.checks)) summary.checks = structured.checks.map(normalizeCheck).filter(Boolean);
  } else {
    summary.error = message;
  }

  if (!summary.status || summary.status === "pending") {
    summary.status = "failed";
  }

  if (!summary.error) {
    summary.error = message;
  }
}

function getLockDir(branchName) {
  return `${LOCK_ROOT}/${branchName}`;
}

function ensureLockRoot() {
  fs.mkdirSync(LOCK_ROOT, { recursive: true });
}

function isLockStale(lockDir) {
  try {
    const stat = fs.statSync(lockDir);
    return Date.now() - stat.mtimeMs > LOCK_STALE_MS;
  } catch {
    return false;
  }
}

async function acquireBranchLock(branchName) {
  ensureLockRoot();
  const lockDir = getLockDir(branchName);
  const startedAt = Date.now();

  while (Date.now() - startedAt <= LOCK_WAIT_MS) {
    try {
      fs.mkdirSync(lockDir);
      fs.writeFileSync(
        `${lockDir}/meta.json`,
        JSON.stringify({ branch: branchName, pid: process.pid, createdAt: nowIso() }, null, 2),
      );

      return {
        branch: branchName,
        lockDir,
        waitedMs: Date.now() - startedAt,
        release() {
          fs.rmSync(lockDir, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      if (isLockStale(lockDir)) {
        fs.rmSync(lockDir, { recursive: true, force: true });
        continue;
      }

      await sleep(2_000);
    }
  }

  throw new Error(`Timed out waiting for branch lock: ${branchName}`);
}

async function acquirePromotionLocks(branchNames) {
  const releases = [];
  const waits = [];

  try {
    for (const branchName of [...new Set(branchNames)].sort()) {
      const lock = await acquireBranchLock(branchName);
      releases.push(lock);
      waits.push({ branch: branchName, waitedMs: lock.waitedMs });
    }

    return {
      waitedMs: waits.reduce((sum, entry) => sum + entry.waitedMs, 0),
      branches: waits,
      release() {
        for (const lock of releases.reverse()) {
          lock.release();
        }
      },
    };
  } catch (error) {
    for (const lock of releases.reverse()) {
      lock.release();
    }
    throw error;
  }
}

async function ensureRepoPublic() {
  if (repoPublic) return;
  await setVisibility("public");
  repoPublic = true;
  await sleep(5_000);
}

async function getBranchSha(branchName) {
  const ref = await ghApi("GET", `/repos/${REPO}/git/ref/heads/${branchName}`);
  return ref.object.sha;
}

async function compareFiles(baseSha, headSha) {
  const payload = await ghApi("GET", `/repos/${REPO}/compare/${baseSha}...${headSha}`);
  return (payload.files || []).map((file) => file.filename).filter(Boolean);
}

function matchesAnyPattern(filename, patterns) {
  return patterns.some((pattern) => pattern.test(filename));
}

function classifyPromotionFiles(files) {
  const relevantFiles = files.filter((file) => !matchesAnyPattern(file, IGNORED_PROMOTION_PATTERNS));

  if (relevantFiles.length === 0) {
    return {
      mode: "none",
      description: "Skipped: non-runtime changes only",
      files,
      relevantFiles,
    };
  }

  if (relevantFiles.some((file) => matchesAnyPattern(file, BACKEND_PROMOTION_PATTERNS))) {
    return {
      mode: "backend",
      description: "Full-stack promotion in progress",
      files,
      relevantFiles,
    };
  }

  return {
    mode: "frontend",
    description: "Frontend-only promotion in progress",
    files,
    relevantFiles,
  };
}

async function triggerHook(url) {
  const response = await fetch(url, { method: "POST" });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`deploy hook failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function getLatestStatusByContext(sha, context) {
  const payload = await ghApi("GET", `/repos/${REPO}/commits/${sha}/status`);
  return (payload.statuses || []).find((status) => status.context === context) || null;
}

async function waitForVercelDeployment(project, sha) {
  for (let attempt = 1; attempt <= 180; attempt += 1) {
    const status = await getLatestStatusByContext(sha, project.context);
    if (status) {
      const state = String(status.state || "").toLowerCase();
      const url = status.target_url || "";
      if (state === "success") {
        return { ok: true, system: "vercel", context: project.context, state, url };
      }
      if (state === "failure" || state === "error") {
        return { ok: false, system: "vercel", context: project.context, state, url };
      }
    }
    await sleep(5_000);
  }

  await setCommitStatus(sha, project.context, "failure", "Deployment timed out in n8n");
  return { ok: false, system: "vercel", context: project.context, state: "timeout", url: "" };
}

function buildStagingVercelEnvDrift(liveEnvs) {
  const targetSignature = JSON.stringify(STAGING_VERCEL_TARGET.slice().sort());
  const liveMap = new Map();

  for (const entry of liveEnvs) {
    const entryTargets = Array.isArray(entry?.target) ? entry.target.slice().sort() : [];
    if (JSON.stringify(entryTargets) !== targetSignature || !entry?.key) continue;
    liveMap.set(entry.key, String(entry.value ?? ""));
  }

  const drift = [];
  for (const [key, expected] of Object.entries(STAGING_VERCEL_ENV_BASELINE)) {
    const actual = liveMap.has(key) ? String(liveMap.get(key)) : "";
    if (!actual) {
      drift.push({ key, expected: String(expected), actual: "", reason: "missing" });
    } else if (actual !== String(expected)) {
      drift.push({ key, expected: String(expected), actual, reason: "value-mismatch" });
    }
  }

  return drift;
}

function buildRenderEnvDrift(liveEntries) {
  const liveMap = new Map(
    liveEntries
      .map((entry) => [entry?.envVar?.key, entry?.envVar?.value])
      .filter(([key]) => Boolean(key)),
  );

  const drift = [];
  const missingSecrets = [];

  const actualOrigins = parseOriginList(liveMap.get("FRONTEND_URL") || "");
  const expectedOrigins = toSortedUniqueStrings(RENDER_SHARED_BACKEND_BASELINE.FRONTEND_URL);
  const missingOrigins = expectedOrigins.filter((origin) => !actualOrigins.includes(origin));
  const extraOrigins = actualOrigins.filter((origin) => !expectedOrigins.includes(origin));
  if (missingOrigins.length > 0 || extraOrigins.length > 0) {
    drift.push({
      key: "FRONTEND_URL",
      reason: "origin-mismatch",
      expected: serializeOriginList(expectedOrigins),
      actual: serializeOriginList(actualOrigins),
      missingOrigins,
      extraOrigins,
    });
  }

  for (const [key, expected] of Object.entries(RENDER_SHARED_BACKEND_BASELINE)) {
    if (key === "FRONTEND_URL") continue;
    const actual = String(liveMap.get(key) ?? "");
    if (actual !== String(expected)) {
      drift.push({ key, expected: String(expected), actual, reason: actual ? "value-mismatch" : "missing" });
    }
  }

  for (const [key, backup] of Object.entries(RENDER_REQUIRED_SECRET_BACKUPS)) {
    if (!String(liveMap.get(key) ?? "")) {
      missingSecrets.push({
        key,
        backupEnv: backup.env,
        repairable: Boolean(backup.value),
      });
    }
  }

  return {
    drift,
    missingSecrets,
    liveMap,
  };
}

async function waitForRenderRuntimeReady() {
  let lastError = null;

  for (let attempt = 1; attempt <= 90; attempt += 1) {
    try {
      await smokeExpectOk("render-health", `${RENDER_URL}/health`);
      await smokeExpectStatus("render-auth-login-shape", `${RENDER_URL}/api/auth/login`, 400, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      });
      return { ok: true, system: "env", context: "Render runtime", state: "ready", url: RENDER_URL };
    } catch (error) {
      lastError = error;
      await sleep(5_000);
    }
  }

  throw lastError || new Error("Render runtime did not become ready after env update");
}

async function ensureStagingRuntimeEnvs() {
  const checks = [];

  const vercelEnvs = await fetchVercelProjectEnv(PROJECTS.staging.projectId);
  const vercelDrift = buildStagingVercelEnvDrift(vercelEnvs);
  if (vercelDrift.length > 0) {
    for (const item of vercelDrift) {
      await upsertVercelProjectEnv(PROJECTS.staging.projectId, item.key, item.expected, STAGING_VERCEL_TARGET);
    }
    const verified = buildStagingVercelEnvDrift(await fetchVercelProjectEnv(PROJECTS.staging.projectId));
    if (verified.length > 0) {
      throw new Error(
        JSON.stringify({
          ok: false,
          status: "failed",
          mode: "staging-env-vercel",
          branch: BRANCH,
          sha: SHA_INPUT || "",
          reason: `staging-vercel-env-drift:${verified.map((item) => item.key).join(",")}`,
          checks: [
            {
              ok: false,
              system: "env",
              context: "Vercel staging env",
              state: "drift",
              url: SMOKE_TARGETS.staging.frontendUrl,
            },
          ],
        }),
      );
    }
    checks.push({
      ok: true,
      system: "env",
      context: "Vercel staging env",
      state: "repaired",
      url: SMOKE_TARGETS.staging.frontendUrl,
    });
  } else {
    checks.push({
      ok: true,
      system: "env",
      context: "Vercel staging env",
      state: "verified",
      url: SMOKE_TARGETS.staging.frontendUrl,
    });
  }

  const renderEntries = await fetchAllRenderEnvVars();
  const renderReport = buildRenderEnvDrift(renderEntries);
  const needsRenderRepair = renderReport.drift.length > 0 || renderReport.missingSecrets.length > 0;

  if (needsRenderRepair) {
    for (const item of renderReport.missingSecrets) {
      if (!item.repairable) {
        throw new Error(
          JSON.stringify({
            ok: false,
            status: "failed",
            mode: "staging-env-render",
            branch: BRANCH,
            sha: SHA_INPUT || "",
            reason: `render-secret-missing:${item.key}`,
            checks: [
              {
                ok: false,
                system: "env",
                context: "Render shared backend env",
                state: "missing-secret",
                url: RENDER_URL,
              },
            ],
          }),
        );
      }
    }

    const nextMap = new Map(
      renderEntries
        .map((entry) => [entry?.envVar?.key, entry?.envVar?.value])
        .filter(([key]) => Boolean(key)),
    );

    nextMap.set("FRONTEND_URL", serializeOriginList(RENDER_SHARED_BACKEND_BASELINE.FRONTEND_URL));
    nextMap.set("DATABASE_SSL", String(RENDER_SHARED_BACKEND_BASELINE.DATABASE_SSL));
    for (const issue of renderReport.missingSecrets) {
      nextMap.set(issue.key, RENDER_REQUIRED_SECRET_BACKUPS[issue.key].value);
    }

    await replaceRenderEnvVars(
      [...nextMap.entries()].map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      })),
    );

    const verified = buildRenderEnvDrift(await fetchAllRenderEnvVars());
    if (verified.drift.length > 0 || verified.missingSecrets.length > 0) {
      throw new Error(
        JSON.stringify({
          ok: false,
          status: "failed",
          mode: "staging-env-render",
          branch: BRANCH,
          sha: SHA_INPUT || "",
          reason: `render-env-drift:${[
            ...verified.drift.map((item) => item.key),
            ...verified.missingSecrets.map((item) => item.key),
          ].join(",")}`,
          checks: [
            {
              ok: false,
              system: "env",
              context: "Render shared backend env",
              state: "drift",
              url: RENDER_URL,
            },
          ],
        }),
      );
    }

    const readiness = await waitForRenderRuntimeReady();
    checks.push({
      ok: true,
      system: "env",
      context: "Render shared backend env",
      state: "repaired",
      url: RENDER_URL,
    });
    checks.push(readiness);
  } else {
    checks.push({
      ok: true,
      system: "env",
      context: "Render shared backend env",
      state: "verified",
      url: RENDER_URL,
    });
  }

  return checks;
}

async function smokeRequest(url, init = {}, retries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1_000);
      }
    }
  }

  throw lastError;
}

function formatSmokeBody(body) {
  if (typeof body === "string") {
    return body.slice(0, 240);
  }

  return JSON.stringify(body).slice(0, 240);
}

async function smokeExpectStatus(label, url, expectedStatus, init = {}) {
  const { response, body } = await smokeRequest(url, init);
  if (response.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus} but got ${response.status}: ${formatSmokeBody(body)}`);
  }
  return body;
}

async function smokeExpectOk(label, url, init = {}) {
  const { response, body } = await smokeRequest(url, init);
  if (!response.ok) {
    throw new Error(`${label} expected 2xx but got ${response.status}: ${formatSmokeBody(body)}`);
  }
  return body;
}

async function smokeExpectTextNotContains(label, url, forbiddenText, init = {}) {
  const body = await smokeExpectOk(label, url, init);
  const text = typeof body === "string" ? body : JSON.stringify(body);
  if (text.includes(forbiddenText)) {
    throw new Error(`${label} unexpectedly contained ${JSON.stringify(forbiddenText)}`);
  }
  return text;
}

function resolveSmokeExpectedRoute(user) {
  const role = String(user?.role || user?.accountType || user?.userType || "").toLowerCase();
  const onboardingComplete =
    user?.hasCompletedOnboarding === true ||
    user?.onboardingDismissed === true ||
    user?.onboardedAt != null;

  if (!role || !onboardingComplete) {
    return "/onboarding";
  }

  if (role === "talent") {
    return "/talent-dashboard";
  }

  return "/client-dashboard";
}

function buildSmokeCookieHeader(session) {
  return [
    `access_token=${session.access_token}`,
    `refresh_token=${session.refresh_token}`,
    session.sessionId ? `session_id=${session.sessionId}` : "",
    session.session_id ? `session_id=${session.session_id}` : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function formatSmokeStatusDescription(error) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);

  const normalized = raw
    .replace(/\s+/g, " ")
    .replace(/^FAIL\s+deploy-smoke:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();

  if (!normalized) {
    return "Post-deploy smoke failed";
  }

  return `Smoke failed: ${normalized}`.slice(0, 140);
}

async function ensureSmokeAccount(backendBase) {
  const username = SMOKE_USER_EMAIL.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
  const { response, body } = await smokeRequest(`${backendBase}/api/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: SMOKE_USER_EMAIL,
      username,
      password: SMOKE_USER_PASSWORD,
    }),
  });

  const alreadyExists =
    response.status === 409 ||
    (response.status === 400 &&
      body &&
      typeof body === "object" &&
      String(body.message || "").toLowerCase() === "user already exists");

  if (response.status !== 201 && !alreadyExists) {
    throw new Error(
      `smoke-register expected 201/existing-user but got ${response.status}: ${formatSmokeBody(body)}`,
    );
  }

  return {
    created: response.status === 201,
    body,
  };
}

async function loginSmokeAccount(backendBase) {
  const session = await smokeExpectOk("smoke-login", `${backendBase}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: SMOKE_USER_EMAIL,
      password: SMOKE_USER_PASSWORD,
    }),
  });

  if (!session?.access_token) {
    throw new Error(`smoke-login missing access token: ${formatSmokeBody(session)}`);
  }

  return session;
}

async function runPostDeploySmoke(branchName) {
  const smokeTarget = SMOKE_TARGETS[branchName];
  if (!smokeTarget) {
    return { ok: true, system: "smoke", branch: branchName, state: "skipped", url: "" };
  }

  const frontendBase = smokeTarget.frontendUrl.replace(/\/$/, "");
  const backendBase = RENDER_URL.replace(/\/$/, "");

  await smokeExpectTextNotContains("frontend-homepage-shell", `${frontendBase}/`, "Homepage unavailable");
  await smokeExpectTextNotContains("frontend-sign-in-page", `${frontendBase}/sign-in`, "Homepage unavailable");

  await smokeExpectOk("backend-health", `${backendBase}/health`);
  await smokeExpectOk("homepage-health", `${backendBase}/homepage/health`);
  const homepage = await smokeExpectOk("homepage-api", `${backendBase}/homepage`);
  if (!homepage || typeof homepage !== "object" || !homepage.slug) {
    throw new Error(`homepage-api missing slug: ${formatSmokeBody(homepage)}`);
  }

  await ensureSmokeAccount(backendBase);
  const session = await loginSmokeAccount(backendBase);

  const bearerHeaders = {
    Authorization: `Bearer ${session.access_token}`,
  };

  const me = await smokeExpectOk("authenticated-user-me", `${backendBase}/api/user/me`, {
    headers: bearerHeaders,
  });

  const expectedRoute = resolveSmokeExpectedRoute(me);

  await smokeExpectOk("notifications-list", `${backendBase}/api/v1/notifications?limit=3`, {
    headers: bearerHeaders,
  });
  await smokeExpectOk("notifications-unread-count", `${backendBase}/api/v1/notifications/unread-count`, {
    headers: bearerHeaders,
  });

  const protectedShell = await smokeExpectOk("authenticated-route-shell", `${frontendBase}${expectedRoute}`, {
    headers: {
      Cookie: buildSmokeCookieHeader(session),
    },
  });
  const protectedText =
    typeof protectedShell === "string" ? protectedShell : JSON.stringify(protectedShell);
  if (protectedText.includes("/sign-in")) {
    throw new Error(`authenticated-route-shell still references sign-in for ${expectedRoute}`);
  }

  return {
    ok: true,
    system: "smoke",
    branch: branchName,
    state: "passed",
    url: frontendBase,
    route: expectedRoute,
  };
}

async function listRenderDeploysForSha(sha) {
  const data = await renderApi("GET", `/v1/services/${RENDER_SERVICE_ID}/deploys`);
  const items = Array.isArray(data) ? data : [];
  return items.filter((item) => (item?.deploy?.commit?.id || "") === sha);
}

async function getRenderDeploy(deployId) {
  return renderApi("GET", `/v1/services/${RENDER_SERVICE_ID}/deploys/${deployId}`);
}

async function waitForRenderDeploy(sha, deployId) {
  let lastSeen = null;
  for (let attempt = 1; attempt <= 180; attempt += 1) {
    let deployment = null;
    if (deployId) {
      deployment = await getRenderDeploy(deployId);
    } else {
      const candidates = await listRenderDeploysForSha(sha);
      deployment = candidates[0]?.deploy || null;
    }

    if (deployment) {
      lastSeen = deployment;
      const status = String(deployment.status || "").toLowerCase();
      if (status === "live") {
        return { ok: true, system: "render", state: status, url: RENDER_URL };
      }
      if (["build_failed", "update_failed", "canceled", "failed"].includes(status)) {
        return { ok: false, system: "render", state: status, url: RENDER_URL };
      }
    }

    await sleep(10_000);
  }

  return {
    ok: false,
    system: "render",
    state: "timeout",
    url: RENDER_URL,
    deployId: lastSeen?.id || deployId || "",
  };
}

async function assertNoRogueRenderServices() {
  const services = await renderApi("GET", `/v1/services?ownerId=${RENDER_OWNER_ID}&limit=50`);
  const active = (Array.isArray(services) ? services : [])
    .map((s) => s.service || s)
    .filter((s) => s.suspended !== "suspended" && !RENDER_ALLOWED_SERVICE_IDS.has(s.id));
  if (active.length > 0) {
    const names = active.map((s) => `${s.name} (${s.id})`).join(", ");
    throw new Error(`BLOCKED: rogue Render services detected — delete before deploying: ${names}`);
  }
}

async function ensureRenderLive(sha) {
  const existing = await listRenderDeploysForSha(sha);
  const live = existing.find((item) => item?.deploy?.status === "live");
  if (live) {
    return { ok: true, system: "render", state: "live", url: RENDER_URL, reused: true };
  }

  let deployId = "";
  try {
    const created = await renderApi("POST", `/v1/services/${RENDER_SERVICE_ID}/deploys`, {
      commitId: sha,
      clearCache: "do_not_clear",
    });
    deployId = created?.id || created?.deploy?.id || "";
  } catch (error) {
    if (!String(error.message || "").includes("409")) throw error;
    const candidates = await listRenderDeploysForSha(sha);
    const inFlight = candidates.find((item) =>
      ["build_in_progress", "update_in_progress", "queued"].includes(String(item?.deploy?.status || "")),
    );
    deployId = inFlight?.deploy?.id || candidates[0]?.deploy?.id || "";
  }

  return waitForRenderDeploy(sha, deployId);
}

async function triggerVercelDeploy(project, sha) {
  const startedAt = Date.now();
  await triggerHook(project.hookUrl);
  return { startedAt, projectContext: project.context, sha };
}

async function main() {
  assertRequiredSecrets();
  await assertNoRogueRenderServices();
  const isRollback = EVENT === "rollback";
  const summary = {
    startedAt: nowIso(),
    endedAt: "",
    event: EVENT,
    branch: BRANCH,
    sha: SHA_INPUT || "",
    status: "pending",
    mode: "",
    reason: "",
    repoVisibilityFinal: "private",
    targetBranches: [],
    changedFiles: [],
    checks: [],
    error: "",
  };

  let fatalError = null;
  let lockHandle = null;

  try {
    if (!["push", "rollback"].includes(EVENT) || !PROTECTED_BRANCHES.includes(BRANCH)) {
      summary.status = "skipped";
      summary.reason = "event-or-branch-not-managed";
      return;
    }

    if (isRollback && BRANCH !== "staging") {
      summary.status = "skipped";
      summary.reason = "rollback-supported-for-staging-only";
      return;
    }

    const refs = {
      "dev-main": await getBranchSha("dev-main"),
      staging: await getBranchSha("staging"),
      "live-mvp": await getBranchSha("live-mvp"),
    };

    let targetSha = SHA_INPUT || refs[BRANCH];
    summary.sha = targetSha;

    if (!isRollback && BRANCH === "staging" && targetSha === refs["dev-main"]) {
      summary.status = "skipped";
      summary.reason = "staging-sync-handled-by-dev-main";
      return;
    }

    const targetBranches = BRANCH === "dev-main" ? ["dev-main", "staging"] : [BRANCH];
    summary.targetBranches = targetBranches;
    lockHandle = await acquirePromotionLocks(targetBranches);
    summary.locks = {
      waitedMs: lockHandle.waitedMs,
      branches: lockHandle.branches,
    };

    await markNonTargetContexts(targetSha, targetBranches);
    await markNonTargetSmokeContexts(targetSha, targetBranches);
    await setTargetContexts(targetSha, targetBranches, "pending", "n8n deployment in progress");

    if (!isRollback && BRANCH === "dev-main") {
      targetSha = SHA_INPUT || refs["dev-main"];
      summary.sha = targetSha;

      const compareBaseSha = BASE_SHA_OVERRIDE || refs.staging;
      if (compareBaseSha === targetSha) {
        await setTargetContexts(targetSha, targetBranches, "success", "No new code to promote");
        summary.status = "skipped";
        summary.reason = "no-new-code-to-promote";
        return;
      }

      const changedFiles = await compareFiles(compareBaseSha, targetSha);
      const promotion = classifyPromotionFiles(changedFiles);
      summary.mode = promotion.mode === "backend" ? "dev-main-to-staging" : promotion.mode;
      summary.changedFiles = changedFiles;

      if (refs.staging !== targetSha) {
        await ghApi("PATCH", `/repos/${REPO}/git/refs/heads/staging`, { sha: targetSha, force: true });
        await sleep(3_000);
      }

      if (promotion.mode === "none") {
        await setTargetContexts(targetSha, targetBranches, "success", promotion.description);
        summary.status = "skipped";
        summary.reason = "non-runtime-changes-only";
        return;
      }

      let envChecks = [];
      try {
        envChecks = await ensureStagingRuntimeEnvs();
      } catch (error) {
        await setTargetContexts(targetSha, targetBranches, "failure", "Blocked: staging env repair failed", RENDER_URL);
        throw error;
      }

      let renderResult = { ok: true, system: "render", state: "skipped", url: RENDER_URL };
      if (promotion.mode === "backend") {
        renderResult = await ensureRenderLive(targetSha);
        if (!renderResult.ok) {
          await setTargetContexts(targetSha, targetBranches, "failure", "Blocked: shared Render deploy failed", renderResult.url);
          throw new Error(
            JSON.stringify({
              ok: false,
              status: "failed",
              mode: "dev-main-render",
              branch: BRANCH,
              sha: targetSha,
              changedFiles,
              checks: [renderResult],
            }),
          );
        }
      }

      await ensureRepoPublic();

      await triggerVercelDeploy(PROJECTS["dev-main"], targetSha);
      await triggerVercelDeploy(PROJECTS.staging, targetSha);
      await sleep(5_000);

      const devResult = await waitForVercelDeployment(PROJECTS["dev-main"], targetSha);
      const stagingResult = await waitForVercelDeployment(PROJECTS.staging, targetSha);
      const ok = renderResult.ok && devResult.ok && stagingResult.ok;
      if (!ok) {
        throw new Error(
          JSON.stringify({
            ok: false,
            status: "failed",
            mode: promotion.mode === "backend" ? "dev-main-to-staging" : "frontend-only",
            branch: BRANCH,
            sha: targetSha,
            changedFiles,
            checks: [renderResult, devResult, stagingResult],
          }),
        );
      }

      await setSmokeContexts(targetSha, ["dev-main", "staging"], "pending", "Post-deploy smoke in progress");
      let devSmoke;
      let stagingSmoke;
      try {
        devSmoke = await runPostDeploySmoke("dev-main");
        await setCommitStatus(targetSha, SMOKE_TARGETS["dev-main"].context, "success", "Post-deploy smoke passed", devSmoke.url);
        stagingSmoke = await runPostDeploySmoke("staging");
        await setCommitStatus(targetSha, SMOKE_TARGETS.staging.context, "success", "Post-deploy smoke passed", stagingSmoke.url);
      } catch (error) {
        const smokeDescription = formatSmokeStatusDescription(error);
        await setCommitStatus(targetSha, SMOKE_TARGETS["dev-main"].context, "failure", smokeDescription);
        await setCommitStatus(targetSha, SMOKE_TARGETS.staging.context, "failure", smokeDescription);
        throw error;
      }

      summary.status = "success";
      summary.mode = promotion.mode === "backend" ? "dev-main-to-staging" : "frontend-only";
      summary.checks = [...envChecks, renderResult, devResult, stagingResult, devSmoke, stagingSmoke]
        .map(normalizeCheck)
        .filter(Boolean);
      return;
    }

    if (BRANCH === "staging") {
      summary.mode = isRollback ? "rollback-staging" : "staging";

      if (isRollback && refs.staging !== targetSha) {
        await ghApi("PATCH", `/repos/${REPO}/git/refs/heads/staging`, { sha: targetSha, force: true });
        await sleep(3_000);
      }

      let envChecks = [];
      try {
        envChecks = await ensureStagingRuntimeEnvs();
      } catch (error) {
        await setTargetContexts(targetSha, targetBranches, "failure", "Blocked: staging env repair failed", RENDER_URL);
        throw error;
      }
      const renderResult = await ensureRenderLive(targetSha);
      if (!renderResult.ok) {
        await setTargetContexts(targetSha, targetBranches, "failure", "Blocked: shared Render deploy failed", renderResult.url);
        throw new Error(JSON.stringify({ ok: false, status: "failed", mode: "staging-render", branch: BRANCH, sha: targetSha, checks: [renderResult] }));
      }

      await ensureRepoPublic();
      await triggerVercelDeploy(PROJECTS.staging, targetSha);
      await sleep(5_000);

      const stagingResult = await waitForVercelDeployment(PROJECTS.staging, targetSha);
      if (!stagingResult.ok) {
        throw new Error(JSON.stringify({ ok: false, status: "failed", mode: "staging", branch: BRANCH, sha: targetSha, checks: [renderResult, stagingResult] }));
      }

      await setSmokeContexts(targetSha, ["staging"], "pending", "Post-deploy smoke in progress");
      let stagingSmoke;
      try {
        stagingSmoke = await runPostDeploySmoke("staging");
        await setCommitStatus(targetSha, SMOKE_TARGETS.staging.context, "success", "Post-deploy smoke passed", stagingSmoke.url);
      } catch (error) {
        await setCommitStatus(targetSha, SMOKE_TARGETS.staging.context, "failure", formatSmokeStatusDescription(error));
        throw error;
      }

      summary.status = "success";
      summary.checks = [...envChecks, renderResult, stagingResult, stagingSmoke].map(normalizeCheck).filter(Boolean);
      return;
    }

    summary.mode = BRANCH;
    await ensureRepoPublic();
    await triggerVercelDeploy(PROJECTS[BRANCH], targetSha);
    await sleep(5_000);

    const result = await waitForVercelDeployment(PROJECTS[BRANCH], targetSha);
    if (!result.ok) {
      throw new Error(JSON.stringify({ ok: false, status: "failed", mode: BRANCH, branch: BRANCH, sha: targetSha, checks: [result] }));
    }

    summary.status = "success";
    summary.checks = [result].map(normalizeCheck).filter(Boolean);
  } catch (error) {
    fatalError = error;
    mergeErrorIntoSummary(summary, error);
  } finally {
    try {
      if (repoPublic) {
        await setVisibility("private");
        repoPublic = false;
      }
    } finally {
      if (lockHandle) {
        lockHandle.release();
        lockHandle = null;
      }
    }

    summary.endedAt = nowIso();
    summary.repoVisibilityFinal = repoPublic ? "public" : "private";

    try {
      summary.commentUrl = await upsertDeploySummaryComment(summary);
    } catch (commentError) {
      summary.commentError =
        commentError instanceof Error ? commentError.message : String(commentError);
    }

    console.log(JSON.stringify(normalizeSummary(summary)));
  }

  if (fatalError) {
    throw fatalError;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
