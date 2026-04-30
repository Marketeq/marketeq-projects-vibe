#!/usr/bin/env node

const GH_TOKEN = process.env.GH_TOKEN || "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const RENDER_TOKEN = process.env.RENDER_TOKEN || "";

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

const SMOKE_USER_EMAIL = "deploy-smoke@marketeq.local";
const SMOKE_USER_PASSWORD = "MarketeqSmoke1!";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  if (![201, 409].includes(response.status)) {
    throw new Error(
      `smoke-register expected 201/409 but got ${response.status}: ${formatSmokeBody(body)}`,
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
  const protectedBranches = ["dev-main", "staging", "live-mvp"];
  if (EVENT !== "push" || !protectedBranches.includes(BRANCH)) {
    console.log(JSON.stringify({ ok: true, status: "skipped", event: EVENT, branch: BRANCH, sha: SHA_INPUT, reason: "event-or-branch-not-managed" }));
    return;
  }

  const refs = {
    "dev-main": await getBranchSha("dev-main"),
    staging: await getBranchSha("staging"),
    "live-mvp": await getBranchSha("live-mvp"),
  };

  let targetSha = SHA_INPUT || refs[BRANCH];
  if (BRANCH === "staging" && targetSha === refs["dev-main"]) {
    console.log(JSON.stringify({ ok: true, status: "skipped", event: EVENT, branch: BRANCH, sha: targetSha, reason: "staging-sync-handled-by-dev-main" }));
    return;
  }

  const targetBranches = BRANCH === "dev-main" ? ["dev-main", "staging"] : [BRANCH];

  await markNonTargetContexts(targetSha, targetBranches);
  await markNonTargetSmokeContexts(targetSha, targetBranches);
  await setTargetContexts(targetSha, targetBranches, "pending", "n8n deployment in progress");

  try {
    if (BRANCH === "dev-main") {
      targetSha = SHA_INPUT || refs["dev-main"];
      const compareBaseSha = BASE_SHA_OVERRIDE || refs.staging;
      if (compareBaseSha === targetSha) {
        console.log(JSON.stringify({ ok: true, status: "skipped", reason: "no-new-code-to-promote", branch: BRANCH, sha: targetSha }));
        return;
      }

      const changedFiles = await compareFiles(compareBaseSha, targetSha);
      const promotion = classifyPromotionFiles(changedFiles);

      if (refs.staging !== targetSha) {
        await ghApi("PATCH", `/repos/${REPO}/git/refs/heads/staging`, { sha: targetSha, force: true });
        await sleep(3_000);
      }

      if (promotion.mode === "none") {
        await setTargetContexts(targetSha, targetBranches, "success", promotion.description);
        console.log(
          JSON.stringify({
            ok: true,
            status: "skipped",
            reason: "non-runtime-changes-only",
            branch: BRANCH,
            sha: targetSha,
            changedFiles,
          }),
        );
        return;
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

      const devStart = await triggerVercelDeploy(PROJECTS["dev-main"], targetSha);
      const stagingStart = await triggerVercelDeploy(PROJECTS.staging, targetSha);
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

      console.log(
        JSON.stringify({
          ok: true,
          status: "success",
          mode: promotion.mode === "backend" ? "dev-main-to-staging" : "frontend-only",
          branch: BRANCH,
          sha: targetSha,
          changedFiles,
          checks: [renderResult, devResult, stagingResult, devSmoke, stagingSmoke],
        }),
      );
      return;
    }

    if (BRANCH === "staging") {
      const renderResult = await ensureRenderLive(targetSha);
      if (!renderResult.ok) {
        await setTargetContexts(targetSha, targetBranches, "failure", "Blocked: shared Render deploy failed", renderResult.url);
        throw new Error(JSON.stringify({ ok: false, status: "failed", mode: "staging-render", branch: BRANCH, sha: targetSha, checks: [renderResult] }));
      }

      await ensureRepoPublic();
      const start = await triggerVercelDeploy(PROJECTS.staging, targetSha);
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

      console.log(JSON.stringify({ ok: true, status: "success", mode: "staging", branch: BRANCH, sha: targetSha, checks: [renderResult, stagingResult, stagingSmoke] }));
      return;
    }

    await ensureRepoPublic();
    const start = await triggerVercelDeploy(PROJECTS[BRANCH], targetSha);
    await sleep(5_000);

    const result = await waitForVercelDeployment(PROJECTS[BRANCH], targetSha);
    if (!result.ok) {
      throw new Error(JSON.stringify({ ok: false, status: "failed", mode: BRANCH, branch: BRANCH, sha: targetSha, checks: [result] }));
    }

    console.log(JSON.stringify({ ok: true, status: "success", mode: BRANCH, branch: BRANCH, sha: targetSha, checks: [result] }));
  } finally {
    if (repoPublic) {
      await setVisibility("private");
      repoPublic = false;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
