import prisma from "../lib/prisma";
import {
  runMacroIngestionJob,
  runNewsIngestionJob,
  runOfficialAnnouncementIngestionJob,
  runRegulatoryIngestionJob,
  runUpdateThemeScoresJob,
} from "../jobs";
import { processThemeSources } from "../services/theme-processing";

const MAX_PROCESSING_PASSES = 20;
const DEFAULT_BACKFILL_DAYS = 30;

function parseBackfillDays(): number {
  const arg = process.argv.find((value) => value.startsWith("--days="));
  const rawValue = arg?.slice("--days=".length) ?? process.env.NEWS_BACKFILL_DAYS;
  const parsed = Number.parseInt(rawValue ?? String(DEFAULT_BACKFILL_DAYS), 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_BACKFILL_DAYS;
  }

  return parsed;
}

async function processAllPendingSources(): Promise<void> {
  for (let pass = 1; pass <= MAX_PROCESSING_PASSES; pass += 1) {
    const results = await processThemeSources();
    const totalScanned = results.reduce((sum, result) => sum + result.scanned, 0);
    const totalProcessed = results.reduce(
      (sum, result) => sum + result.processed,
      0,
    );
    const totalFailed = results.reduce((sum, result) => sum + result.failed, 0);
    const totalEventsCreated = results.reduce(
      (sum, result) => sum + result.eventsCreated,
      0,
    );

    console.log(
      `Theme processing pass ${pass}: scanned=${totalScanned}, processed=${totalProcessed}, failed=${totalFailed}, eventsCreated=${totalEventsCreated}`,
    );

    if (totalScanned === 0) {
      return;
    }
  }

  console.warn(
    `Theme processing stopped after ${MAX_PROCESSING_PASSES} passes. There may still be pending source rows to process.`,
  );
}

async function main(): Promise<void> {
  await prisma.$connect();

  const backfillDays = parseBackfillDays();
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (backfillDays - 1));
  from.setUTCHours(0, 0, 0, 0);

  console.log(
    `Bootstrapping dashboard data for ${backfillDays} day(s) from ${from.toISOString()} to ${to.toISOString()}`,
  );

  await runNewsIngestionJob({
    from,
    to,
    gdeltTimespan: `${backfillDays}d`,
  });
  await runOfficialAnnouncementIngestionJob();
  await runRegulatoryIngestionJob();
  await runMacroIngestionJob();
  await processAllPendingSources();
  await runUpdateThemeScoresJob();

  console.log("Dashboard bootstrap complete");
}

void main()
  .catch((error: unknown) => {
    console.error("Dashboard bootstrap failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
