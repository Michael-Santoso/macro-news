import { runOfficialAnnouncementIngestionJob } from "../jobs";

async function main(): Promise<void> {
  await runOfficialAnnouncementIngestionJob();
}

void main().catch((error: unknown) => {
  console.error("Official announcement ingestion failed", error);
  process.exit(1);
});
