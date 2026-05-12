import "dotenv/config";
import payload from "payload";

import { seedTalentProfiles } from "./talent-profiles.seed";

async function main(): Promise<void> {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) {
    throw new Error("PAYLOAD_SECRET environment variable is required");
  }

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info("Payload CMS initialized (talent seed runner)");
    },
  });

  const rabbitmqUrl = process.env.RABBITMQ_URL;
  if (rabbitmqUrl) {
    const { CmsEventPublisher } = await import("../rabbitmq/cms-event.publisher");
    await CmsEventPublisher.getInstance().connect(rabbitmqUrl);
    payload.logger.info("RabbitMQ publisher connected for seed");
  }

  await seedTalentProfiles(payload);

  payload.logger.info("Talent CMS seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Talent CMS seed failed:", err);
  process.exit(1);
});
