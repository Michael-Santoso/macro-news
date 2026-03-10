import { runNewsIngestionJob } from "../jobs";

async function main(): Promise<void> {
  await runNewsIngestionJob();
}

void main().catch((error: unknown) => {
  console.error("News ingestion failed", error);
  process.exit(1);
});

