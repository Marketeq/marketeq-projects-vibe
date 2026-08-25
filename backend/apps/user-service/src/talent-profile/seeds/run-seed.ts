import "reflect-metadata";
import { AppDataSource } from "../../data-source";
import { seedTalentProfiles } from "./talent-profile.seed";

async function main() {
  await AppDataSource.initialize();
  console.log("Database connected. Running talent-profile seed...");

  await seedTalentProfiles(AppDataSource);

  console.log("Talent-profile seed complete.");
  await AppDataSource.destroy();
}

main().catch((error) => {
  console.error("Talent-profile seed failed:", error);
  process.exit(1);
});
