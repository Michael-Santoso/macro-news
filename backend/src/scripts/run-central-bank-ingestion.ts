import { runCentralBankIngestionJob } from "../jobs";

async function main(): Promise<void> {
  await runCentralBankIngestionJob();
}

void main().catch((error: unknown) => {
  console.error("Central bank ingestion failed", error);
  process.exit(1);
});
