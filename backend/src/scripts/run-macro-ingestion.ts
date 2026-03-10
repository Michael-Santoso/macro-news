import { runMacroIngestionJob } from "../jobs";

async function main(): Promise<void> {
  await runMacroIngestionJob();
}

void main().catch((error: unknown) => {
  console.error("Macro ingestion failed", error);
  process.exit(1);
});
