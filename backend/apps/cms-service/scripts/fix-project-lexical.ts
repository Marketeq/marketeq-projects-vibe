/**
 * Fix Payload richText fields that still contain legacy Slate JSON.
 *
 * Payload's Lexical editor stores richText as a Lexical document object
 * (e.g. `{ root: {...} }`). Older data may be stored as a Slate node array,
 * which causes the Admin UI to error:
 *   "You have tried to pass in data from the old, Slate editor..."
 *
 * This script patches a single Project document by ID:
 * - If a known richText field is Slate (Array), replace it with an empty Lexical doc.
 *
 * Usage:
 *   PROJECT_ID=91 npm run fix:project-lexical
 */
import "dotenv/config";
import payload from "payload";

function emptyLexicalDoc() {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          textStyle: "",
          children: [],
        },
      ],
    },
  };
}

function isSlateValue(value: unknown): boolean {
  // Slate rich text stored by Payload v1 was an array of nodes.
  return Array.isArray(value);
}

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET environment variable is required");

  const projectId = process.env.PROJECT_ID;
  if (!projectId) throw new Error("PROJECT_ID environment variable is required");

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info("Payload CMS initialized (fix-project-lexical)");
    },
  });

  const project = await payload.findByID({
    collection: "projects",
    id: projectId as any,
    overrideAccess: true,
    depth: 0,
  });

  const patch: Record<string, any> = {};

  // Top-level richText fields in Projects collection
  // fullDescription is now a textarea (string) to match /publish-project.
  if (isSlateValue((project as any).fullDescription)) {
    patch.fullDescription = "";
  }
  if (isSlateValue((project as any).deliverables)) {
    patch.deliverables = emptyLexicalDoc();
  }
  if (isSlateValue((project as any).adminNotes)) {
    patch.adminNotes = emptyLexicalDoc();
  }

  // Nested FAQ richText fields
  const faqQuestions = (project as any).faqQuestions;
  if (Array.isArray(faqQuestions)) {
    const nextFaq = faqQuestions.map((row: any) => {
      if (!row) return row;
      if (isSlateValue(row.answer)) {
        return { ...row, answer: emptyLexicalDoc() };
      }
      return row;
    });

    // Only write if we changed something
    const changed = nextFaq.some((row: any, idx: number) => {
      const prev = faqQuestions[idx];
      return !!row && !!prev && row.answer !== prev.answer;
    });
    if (changed) patch.faqQuestions = nextFaq;
  }

  const keys = Object.keys(patch);
  if (keys.length === 0) {
    console.log(`• Project ${projectId}: no Slate richText fields detected. Nothing to change.`);
    return;
  }

  await payload.update({
    collection: "projects",
    id: projectId as any,
    overrideAccess: true,
    data: patch,
  });

  console.log(`✔ Project ${projectId}: patched Slate → empty Lexical for: ${keys.join(", ")}`);

  // Best-effort cleanup so the script exits (Payload v2 doesn't guarantee a
  // stable top-level destroy API).
  const anyPayload = payload as any;
  if (typeof anyPayload.destroy === "function") {
    await anyPayload.destroy();
  } else if (typeof anyPayload.close === "function") {
    await anyPayload.close();
  } else if (typeof anyPayload.db?.destroy === "function") {
    await anyPayload.db.destroy();
  } else if (typeof anyPayload.db?.pool?.end === "function") {
    await anyPayload.db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
