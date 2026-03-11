import prisma from "../lib/prisma";
import { ingestNewsFromNewsApi } from "../services";

const DEFAULT_BACKFILL_DAYS = 30;

function parseBackfillDays(): number {
  const arg = process.argv.find((value) => value.startsWith("--days="));
  const rawValue = arg?.slice("--days=".length) ?? String(DEFAULT_BACKFILL_DAYS);
  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_BACKFILL_DAYS;
  }

  return parsed;
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
}

void main()
  .catch((error: unknown) => {
    console.error("NewsAPI backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
