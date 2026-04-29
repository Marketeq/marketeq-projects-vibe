import "dotenv/config";
import payload from "payload";
import { clearSeededProjects } from "./clear-projects";

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error("PAYLOAD_SECRET environment variable is required");
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info("Payload CMS initialized (clear projects runner)");
    },
  });

  await clearSeededProjects(payload);
  payload.logger.info("Clear projects complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Clear projects failed:", err);
  process.exit(1);
});

