import dotenv from "dotenv";
dotenv.config();

import express from "express";
import payload from "payload";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { CmsEventPublisher } from "./rabbitmq/cms-event.publisher";
import { ContractsEventConsumer } from "./rabbitmq/contracts-event.consumer";

const app = express();
const PORT = Number(process.env.CMS_PORT) || 3020;

async function seedFirstAdminUser() {
  const existing = await payload.find({
    collection: "users",
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    return;
  }

  const adminEmail = process.env.CMS_ADMIN_EMAIL;
  const adminPassword = process.env.CMS_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    payload.logger.warn(
      "No users found, but CMS_ADMIN_EMAIL/CMS_ADMIN_PASSWORD are not set. Skipping first-admin bootstrap.",
    );
    return;
  }

  await payload.create({
    collection: "users",
    overrideAccess: true,
    data: {
      email: adminEmail,
      password: adminPassword,
      name: process.env.CMS_ADMIN_NAME || "CMS Admin",
      userType: "admin",
      role: "admin",
      status: "active",
    },
  });

  payload.logger.info(
    "First admin user created from CMS_ADMIN_* environment variables.",
  );
}

// Health check — registered before payload.init() so it's always available
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "cms-service" });
});

// Same-origin autocomplete proxy for Payload admin UI.
// The admin bundle runs in the browser; calling autocomplete-service directly is
// brittle (CORS/env/port). This endpoint keeps the UI working after refresh.
const autocompleteOrigin = (process.env.AUTOCOMPLETE_SERVICE_URL || "http://localhost:3016").replace(
  /\/$/,
  "",
);
app.get("/cms-autocomplete/:type", async (req, res) => {
  const type = String(req.params.type || "").trim();
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!type) {
    res.status(400).json({ error: "type required" });
    return;
  }
  const upstreamUrl = `${autocompleteOrigin}/autocomplete/${encodeURIComponent(type)}?q=${encodeURIComponent(
    q,
  )}`;
  try {
    const upstream = await fetch(upstreamUrl);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (err) {
    payload.logger?.warn({ err, upstreamUrl }, "cms-autocomplete proxy failed");
    res.status(502).json({ error: "autocomplete proxy failed" });
  }
});

// Same-origin media proxy. Payload's `generateFileURL` stores media paths as
// `/cms-media/<filename>` (see payload.config.ts) so the Next.js Image
// Optimizer doesn't trip its private-IP SSRF guard. The frontend rewrites
// that path to MinIO/R2; without this proxy the admin UI (same origin as
// cms-service) 404s on every thumbnail. In prod the env override points at
// the real Cloudflare R2 / CDN host.
const cmsMediaOrigin = (
  process.env.CMS_MEDIA_ORIGIN || "http://localhost:9000/marketeq-media"
).replace(/\/$/, "");
app.get("/cms-media/*", async (req, res) => {
  const key = (req.params as { 0: string })[0];
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const upstreamUrl = `${cmsMediaOrigin}/${key}${qs}`;
  try {
    const upstream = await fetch(upstreamUrl);
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding" || lower === "connection") return;
      res.setHeader(key, value);
    });
    if (!upstream.body) {
      res.end();
      return;
    }
    await pipeline(Readable.fromWeb(upstream.body as any), res);
  } catch (err) {
    payload.logger?.error({ err, upstreamUrl }, "cms-media proxy failed");
    res.status(502).json({ error: "media proxy failed" });
  }
});

// Readiness check — verifies DB + RabbitMQ
app.get("/ready", async (_req, res) => {
  const checks: Record<string, boolean> = { database: false, rabbitmq: false };

  try {
    // Use Payload local API for adapter-agnostic DB connectivity check
    await payload.find({ collection: "users", limit: 0 });
    checks.database = true;
  } catch {
    checks.database = false;
  }

  checks.rabbitmq = CmsEventPublisher.getInstance()?.isConnected() ?? false;

  const allHealthy = Object.values(checks).every(Boolean);
  res.status(allHealthy ? 200 : 503).json({
    ready: allHealthy,
    checks,
  });
});

async function start() {
  const payloadSecret = process.env.PAYLOAD_SECRET;
  if (!payloadSecret) {
    throw new Error("PAYLOAD_SECRET environment variable is required");
  }

  // Initialize Payload CMS
  // REST API is always mounted. Admin panel requires `npm run build` (runs
  // `payload build` then `tsc`) so ./build contains the webpack bundle; see Dockerfile.
  await payload.init({
    secret: payloadSecret,
    express: app,
    onInit: async () => {
      await seedFirstAdminUser();
      payload.logger.info("Payload CMS initialized");
      payload.logger.info(
        `Collections: ${payload.collections ? Object.keys(payload.collections).join(", ") : "none"}`,
      );
    },
  });

  // Connect RabbitMQ publisher (non-blocking)
  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    try {
      const publisher = CmsEventPublisher.getInstance();
      await publisher.connect(rabbitmqUrl);
      payload.logger.info("RabbitMQ publisher connected");
    } catch (err) {
      payload.logger.error(
        { err },
        "RabbitMQ connection failed — events will not publish",
      );
    }

    // Inbound consumer: contracts-service → orders projection (CS-00 §727).
    // contracts-service emits `contract.activated` via NestJS RMQ ClientProxy
    // onto `contracts_events_queue`; this consumer projects each event into
    // an Orders row so admins can track contracts from the Payload UI.
    try {
      const consumer = new ContractsEventConsumer(payload);
      await consumer.connect(rabbitmqUrl);
    } catch (err) {
      payload.logger.error(
        { err },
        "contracts-event consumer failed to start — orders will not be auto-created from contracts",
      );
    }
  } else {
    payload.logger.warn("RABBITMQ_URL not set — category sync events disabled");
  }

  app.listen(PORT, () => {
    payload.logger.info(`cms-service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start cms-service:", err);
  process.exit(1);
});
