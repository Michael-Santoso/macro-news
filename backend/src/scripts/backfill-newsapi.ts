import prisma from "../lib/prisma";
import { ingestNewsFromNewsApi } from "../services";
import { runUpdateThemeScoresJob } from "../jobs";
import { processThemeSources } from "../services/theme-processing";

const DEFAULT_BACKFILL_DAYS = 30;
const MAX_PROCESSING_PASSES = 20;

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
  const backfillDays = parseBackfillDays();
  const overallTo = new Date();
  const overallFrom = new Date(overallTo);
  overallFrom.setUTCDate(overallFrom.getUTCDate() - (backfillDays - 1));
  overallFrom.setUTCHours(0, 0, 0, 0);

  await prisma.$connect();

  let fetched = 0;
  let normalized = 0;
  let stored = 0;

  for (let offset = 0; offset < backfillDays; offset += 1) {
    const windowFrom = new Date(overallFrom);
    windowFrom.setUTCDate(overallFrom.getUTCDate() + offset);
    windowFrom.setUTCHours(0, 0, 0, 0);

    const windowTo = new Date(windowFrom);
    windowTo.setUTCHours(23, 59, 59, 999);

    if (windowTo > overallTo) {
      windowTo.setTime(overallTo.getTime());
    }

    const result = await ingestNewsFromNewsApi({
      from: windowFrom,
      to: windowTo,
      maxPages: 1,
    });

    fetched += result.fetched;
    normalized += result.normalized;
    stored += result.stored;

    console.log(
      `NewsAPI backfill window ${offset + 1}/${backfillDays}: range=${windowFrom.toISOString()}..${windowTo.toISOString()} fetched=${result.fetched} normalized=${result.normalized} stored=${result.stored}`,
    );
  }

  console.log(
    `NewsAPI backfill complete: range=${overallFrom.toISOString()}..${overallTo.toISOString()} fetched=${fetched} normalized=${normalized} stored=${stored}`,
  );

  await processAllPendingSources();
  await runUpdateThemeScoresJob();

  console.log("NewsAPI backfill post-processing complete");
}

void main()
  .catch((error: unknown) => {
    console.error("NewsAPI backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
