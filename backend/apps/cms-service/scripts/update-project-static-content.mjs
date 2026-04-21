#!/usr/bin/env node
/**
 * Upsert published `project-static-contents` (slug `default`) How It Works steps.
 *
 * Usage:
 *   CMS_BASE_URL=http://localhost:3020 \
 *   CMS_ADMIN_EMAIL=you@example.com \
 *   CMS_ADMIN_PASSWORD=your-password \
 *   node scripts/update-project-static-content.mjs
 *
 * Do not commit real passwords. Optional: pass --dry-run to only print the GET.
 */

const CMS_BASE_URL = (process.env.CMS_BASE_URL || "http://localhost:3020").replace(
  /\/+$/,
  "",
);
const email = process.env.CMS_ADMIN_EMAIL;
const password = process.env.CMS_ADMIN_PASSWORD;
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (!email || !password) {
    console.error(
      "Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD (see script header).",
    );
    process.exit(1);
  }

  const loginRes = await fetch(`${CMS_BASE_URL}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    console.error("Login failed:", loginRes.status, await loginRes.text());
    process.exit(1);
  }
  const { token } = await loginRes.json();
  const auth = { Authorization: `JWT ${token}` };

  const findRes = await fetch(
    `${CMS_BASE_URL}/api/project-static-contents?limit=1&where[slug][equals]=default&depth=0`,
    { headers: { ...auth } },
  );
  const findBody = await findRes.json();
  const doc = findBody?.docs?.[0];
  if (!doc?.id) {
    console.error("No project-static-contents doc with slug=default. Seed CMS first.");
    process.exit(1);
  }

  const marker = new Date().toISOString().slice(0, 19);
  const body = {
    howItWorks: {
      steps: [
        {
          stepNumber: "1",
          title: `CMS step one (${marker})`,
          description: "Updated by scripts/update-project-static-content.mjs — one.",
          iconUrl: "/cms-media/seed-1558655146-9f40138edfeb.jpg",
        },
        {
          stepNumber: "2",
          title: `CMS step two (${marker})`,
          description: "Updated by scripts/update-project-static-content.mjs — two.",
          iconUrl: "/cms-media/seed-1454165804606-c3d57bc86b40.jpg",
        },
        {
          stepNumber: "3",
          title: `CMS step three (${marker})`,
          description: "Updated by scripts/update-project-static-content.mjs — three.",
          iconUrl: "/cms-media/seed-1455390582262-044cdead277a.jpg",
        },
      ],
    },
    _status: "published",
  };

  if (dryRun) {
    console.log("Dry run — would PATCH id", doc.id, body);
    process.exit(0);
  }

  const patchRes = await fetch(
    `${CMS_BASE_URL}/api/project-static-contents/${doc.id}?draft=false`,
    {
      method: "PATCH",
      headers: {
        ...auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const patchText = await patchRes.text();
  if (!patchRes.ok) {
    console.error("PATCH failed:", patchRes.status, patchText);
    process.exit(1);
  }
  console.log("Updated and published project-static-contents id=%s", doc.id);

  const pub = await fetch(
    `${CMS_BASE_URL}/api/project-static-contents?limit=1&depth=0&draft=false&where[slug][equals]=default`,
  );
  const pubJson = await pub.json();
  const steps = pubJson?.docs?.[0]?.howItWorks?.steps || [];
  console.log(
    "Public read check (no auth):",
    steps.map((s) => s.title).join(" | "),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
