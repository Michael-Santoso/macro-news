import { runRegulatoryIngestionJob } from "../jobs";

async function main(): Promise<void> {
  await runRegulatoryIngestionJob();
}

void main().catch((error: unknown) => {
  console.error("Regulatory ingestion failed", error);
  process.exit(1);
});
