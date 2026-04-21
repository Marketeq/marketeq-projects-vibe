import fs from "node:fs/promises"
import path from "node:path"

const rootDir = path.resolve(import.meta.dirname, "..")
const compatibilityPatches = [
  {
    filePath: path.join(
      rootDir,
      "app/node_modules/zod-prisma-types/dist/classes/directoryHelper.js"
    ),
    from: "fs_1.default.rmdirSync(path, { recursive: true });",
    to: "fs_1.default.rmSync(path, { recursive: true, force: true });",
    label: "zod-prisma-types Node 25 directory removal compatibility",
  },
]

let patchedFiles = 0

for (const patch of compatibilityPatches) {
  try {
    const original = await fs.readFile(patch.filePath, "utf8")

    if (original.includes(patch.to)) {
      continue
    }

    if (!original.includes(patch.from)) {
      throw new Error(`Expected snippet not found for ${patch.label}`)
    }

    await fs.writeFile(
      patch.filePath,
      original.replace(patch.from, patch.to),
      "utf8"
    )

    patchedFiles += 1
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      continue
    }

    throw error
  }
}

if (patchedFiles > 0) {
  console.log(`Applied ${patchedFiles} scheduling-service compatibility patch(es).`)
}
