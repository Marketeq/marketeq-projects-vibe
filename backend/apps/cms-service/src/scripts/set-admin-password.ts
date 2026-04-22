import "dotenv/config";
import payload from "payload";

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET environment variable is required");

  const email = process.env.ADMIN_EMAIL || "admin@marketeq.com";
  const password = process.env.ADMIN_PASSWORD || "change-me";

  await payload.init({ secret, local: true });

  const found = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  if (found.totalDocs === 0) throw new Error(`No user found for ${email}`);
  const user = found.docs[0] as any;

  await payload.update({
    collection: "users",
    id: user.id,
    overrideAccess: true,
    data: { password } as any,
  });

  // eslint-disable-next-line no-console
  console.log(`updated-password:${email}`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

