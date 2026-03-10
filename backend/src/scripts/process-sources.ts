import prisma from "../lib/prisma";
import { processThemeSources } from "../services/theme-processing";

async function main(): Promise<void> {
  const results = await processThemeSources();

  for (const result of results) {
    console.log(
      [
        result.sourceType,
        `scanned=${result.scanned}`,
        `processed=${result.processed}`,
        `failed=${result.failed}`,
        `eventsCreated=${result.eventsCreated}`,
      ].join(" "),
    );
  }
}

void main()
  .catch((error: unknown) => {
    console.error("Theme source processing failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
