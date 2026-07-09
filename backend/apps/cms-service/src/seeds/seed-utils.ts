import crypto from "crypto";
import type { Payload } from "payload";
import type { SerializedEditorState } from "lexical";

export function stableHashInt(input: string): number {
  const hex = crypto.createHash("sha256").update(input).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16);
}

export function lexicalText(text: string): SerializedEditorState {
  return {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          version: 1,
          format: "",
          indent: 0,
          direction: "ltr",
          children: [{ type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" }],
        },
      ],
    },
  } as unknown as SerializedEditorState;
}

export async function upsertPlaceholderMedia(payload: Payload): Promise<number> {
  const filename = "seed-placeholder.png";
  const existing = await payload.find({
    collection: "media",
    where: { filename: { equals: filename } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) return existing.docs[0].id as number;

  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X6i0AAAAASUVORK5CYII=",
    "base64",
  );
  const doc = await payload.create({
    collection: "media",
    data: { alt: "Seed placeholder" } as any,
    file: {
      data: buffer,
      mimetype: "image/png",
      name: filename,
      size: buffer.length,
    } as any,
    overrideAccess: true,
    disableVerificationEmail: true,
  });
  return doc.id as number;
}

