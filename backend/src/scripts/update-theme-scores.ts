import { runUpdateThemeScoresJob } from "../jobs";

async function main(): Promise<void> {
  await runUpdateThemeScoresJob();
}

void main().catch((error: unknown) => {
  console.error("Theme score update failed", error);
  process.exit(1);
});
