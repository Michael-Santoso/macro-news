import { MacroTheme, Prisma, ThemeHeatLevel } from "@prisma/client";
import prisma from "../../lib/prisma";
import { MACRO_SERIES_THEME_MAP } from "../theme-processing/theme-taxonomy";

const HOT_WEEKLY_MENTION_THRESHOLD = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const US_REGION = "US";
const GLOBAL_REGION = "GLOBAL";

type AggregatedThemeMentionsRow = {
  theme: MacroTheme;
  region: string | null;
  dailyMentions: bigint;
  weeklyMentions: bigint;
  monthlyMentions: bigint;
  previousWeekMentions: bigint;
};

type ObservationSnapshotRow = {
  seriesId: string;
  value: string;
  rowNumber: bigint;
};

type ComputedThemeScore = {
  theme: MacroTheme;
  region: string;
  dailyMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  momentumScore: number;
  heatLevel: ThemeHeatLevel;
};

type ThemeCounter = {
  dailyMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  previousWeekMentions: number;
};

type UpdateThemeScoresResult = {
  upserted: number;
  reset: number;
};

function getScoreKey(theme: MacroTheme, region: string): string {
  return `${theme}:${region}`;
}

function normalizeRegion(region: string | null | undefined): string {
  return region?.trim() || GLOBAL_REGION;
}

function toNumber(value: bigint): number {
  return Number(value);
}

function buildWindowStart(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_IN_MS);
}

function createEmptyCounter(): ThemeCounter {
  return {
    dailyMentions: 0,
    weeklyMentions: 0,
    monthlyMentions: 0,
    previousWeekMentions: 0,
  };
}

function getOrCreateCounter(
  counters: Map<string, ThemeCounter>,
  theme: MacroTheme,
  region: string,
): ThemeCounter {
  const key = getScoreKey(theme, region);
  const existingCounter = counters.get(key);

  if (existingCounter) {
    return existingCounter;
  }

  const counter = createEmptyCounter();
  counters.set(key, counter);
  return counter;
}

function classifyHeatLevel(
  weeklyMentions: number,
  momentumScore: number,
): ThemeHeatLevel {
  if (
    weeklyMentions > HOT_WEEKLY_MENTION_THRESHOLD &&
    momentumScore > 0
  ) {
    return "HOT";
  }

  if (momentumScore < 0) {
    return "COOLING";
  }

  return "STABLE";
}

function applyObservationBoost(
  counters: Map<string, ThemeCounter>,
  theme: MacroTheme,
  regions: string[],
  points: number,
): void {
  if (points <= 0) {
    return;
  }

  for (const region of regions) {
    const counter = getOrCreateCounter(counters, theme, region);
    counter.previousWeekMentions -= points;
  }
}

function getObservationSignalPoints(
  seriesId: string,
  latestValue: number,
  previousValue: number,
): number {
  if (!Number.isFinite(latestValue) || !Number.isFinite(previousValue)) {
    return 0;
  }

  const delta = latestValue - previousValue;

  switch (seriesId) {
    case "CPIAUCSL":
    case "CPILFESL":
    case "PCEPI":
    case "PCEPILFE":
    case "PPIACO":
    case "CES0500000003":
    case "DFF":
    case "DGS2":
    case "DFII10":
    case "UNRATE":
    case "ICSA":
    case "USREC":
    case "WALCL":
      return delta > 0 ? 1 : 0;
    case "T10Y2Y":
      return latestValue < 0 || delta < 0 ? 1 : 0;
    case "PAYEMS":
    case "JTSJOL":
    case "CIVPART":
    case "A191RL1Q225SBEA":
    case "RSAFS":
    case "INDPRO":
    case "UMCSENT":
    case "HOUST":
    case "PERMIT":
    case "BUSLOANS":
      return delta < 0 ? 1 : 0;
    default:
      return 0;
  }
}

async function loadAggregatedThemeMentions(
  now: Date,
): Promise<Map<string, ThemeCounter>> {
  const dayStart = buildWindowStart(now, 1);
  const weekStart = buildWindowStart(now, 7);
  const previousWeekStart = buildWindowStart(now, 14);
  const monthStart = buildWindowStart(now, 30);

  const rows = await prisma.$queryRaw<AggregatedThemeMentionsRow[]>(
    Prisma.sql`
      SELECT
        "theme",
        COALESCE("region", 'GLOBAL') AS "region",
        COUNT(*) FILTER (WHERE "publishedAt" >= ${dayStart}) AS "dailyMentions",
        COUNT(*) FILTER (WHERE "publishedAt" >= ${weekStart}) AS "weeklyMentions",
        COUNT(*) FILTER (WHERE "publishedAt" >= ${monthStart}) AS "monthlyMentions",
        COUNT(*) FILTER (
          WHERE "publishedAt" >= ${previousWeekStart}
            AND "publishedAt" < ${weekStart}
        ) AS "previousWeekMentions"
      FROM "ThemeEvent"
      WHERE "publishedAt" >= ${monthStart}
      GROUP BY "theme", COALESCE("region", 'GLOBAL')
    `,
  );

  const counters = new Map<string, ThemeCounter>();

  for (const row of rows) {
    const region = normalizeRegion(row.region);
    const regionalCounter = getOrCreateCounter(counters, row.theme, region);
    regionalCounter.dailyMentions += toNumber(row.dailyMentions);
    regionalCounter.weeklyMentions += toNumber(row.weeklyMentions);
    regionalCounter.monthlyMentions += toNumber(row.monthlyMentions);
    regionalCounter.previousWeekMentions += toNumber(row.previousWeekMentions);

    if (region !== GLOBAL_REGION) {
      const globalCounter = getOrCreateCounter(counters, row.theme, GLOBAL_REGION);
      globalCounter.dailyMentions += toNumber(row.dailyMentions);
      globalCounter.weeklyMentions += toNumber(row.weeklyMentions);
      globalCounter.monthlyMentions += toNumber(row.monthlyMentions);
      globalCounter.previousWeekMentions += toNumber(row.previousWeekMentions);
    }
  }

  return counters;
}

async function applyMacroObservationBoosts(
  counters: Map<string, ThemeCounter>,
): Promise<void> {
  const seriesIds = Object.keys(MACRO_SERIES_THEME_MAP);

  if (seriesIds.length === 0) {
    return;
  }

  const rows = await prisma.$queryRaw<ObservationSnapshotRow[]>(
    Prisma.sql`
      WITH ranked_observations AS (
        SELECT
          "seriesId",
          "value",
          ROW_NUMBER() OVER (
            PARTITION BY "seriesId"
            ORDER BY "observationDate" DESC, "updatedAt" DESC
          ) AS "rowNumber"
        FROM "MacroObservation"
        WHERE "seriesId" IN (${Prisma.join(seriesIds)})
      )
      SELECT "seriesId", "value", "rowNumber"
      FROM ranked_observations
      WHERE "rowNumber" <= 2
    `,
  );

  const observationMap = new Map<string, ObservationSnapshotRow[]>();

  for (const row of rows) {
    const existingRows = observationMap.get(row.seriesId) ?? [];
    existingRows.push(row);
    observationMap.set(row.seriesId, existingRows);
  }

  for (const [seriesId, snapshots] of observationMap.entries()) {
    if (snapshots.length < 2) {
      continue;
    }

    const latestRow = snapshots.find((snapshot) => Number(snapshot.rowNumber) === 1);
    const previousRow = snapshots.find(
      (snapshot) => Number(snapshot.rowNumber) === 2,
    );

    if (!latestRow || !previousRow) {
      continue;
    }

    const latestValue = Number.parseFloat(latestRow.value);
    const previousValue = Number.parseFloat(previousRow.value);
    const signalPoints = getObservationSignalPoints(
      seriesId,
      latestValue,
      previousValue,
    );

    if (signalPoints <= 0) {
      continue;
    }

    for (const theme of MACRO_SERIES_THEME_MAP[seriesId] ?? []) {
      applyObservationBoost(counters, theme, [US_REGION, GLOBAL_REGION], signalPoints);
    }
  }
}

function buildComputedScores(
  counters: Map<string, ThemeCounter>,
): ComputedThemeScore[] {
  const scores: ComputedThemeScore[] = [];

  for (const [key, counter] of counters.entries()) {
    const separatorIndex = key.indexOf(":");
    const theme = key.slice(0, separatorIndex) as MacroTheme;
    const region = key.slice(separatorIndex + 1);
    const momentumScore =
      counter.weeklyMentions - counter.previousWeekMentions;

    scores.push({
      theme,
      region,
      dailyMentions: counter.dailyMentions,
      weeklyMentions: counter.weeklyMentions,
      monthlyMentions: counter.monthlyMentions,
      momentumScore,
      heatLevel: classifyHeatLevel(counter.weeklyMentions, momentumScore),
    });
  }

  return scores;
}

export async function updateThemeScores(): Promise<UpdateThemeScoresResult> {
  const counters = await loadAggregatedThemeMentions(new Date());

  // Agent 1 owns ThemeEvent population. This service only scores rows that
  // already exist, and layers in MacroObservation-derived boosts for US themes.
  await applyMacroObservationBoosts(counters);

  const scores = buildComputedScores(counters);
  const activeKeys = new Set(scores.map((score) => getScoreKey(score.theme, score.region)));

  for (const score of scores) {
    await prisma.themeScore.upsert({
      where: {
        theme_region: {
          theme: score.theme,
          region: score.region,
        },
      },
      create: score,
      update: {
        dailyMentions: score.dailyMentions,
        weeklyMentions: score.weeklyMentions,
        monthlyMentions: score.monthlyMentions,
        momentumScore: score.momentumScore,
        heatLevel: score.heatLevel,
      },
    });
  }

  const existingScores = await prisma.themeScore.findMany({
    select: {
      theme: true,
      region: true,
    },
  });

  let resetCount = 0;

  for (const existingScore of existingScores) {
    if (activeKeys.has(getScoreKey(existingScore.theme, existingScore.region))) {
      continue;
    }

    resetCount += 1;

    await prisma.themeScore.update({
      where: {
        theme_region: {
          theme: existingScore.theme,
          region: existingScore.region,
        },
      },
      data: {
        dailyMentions: 0,
        weeklyMentions: 0,
        monthlyMentions: 0,
        momentumScore: 0,
        heatLevel: "STABLE",
      },
    });
  }

  return {
    upserted: scores.length,
    reset: resetCount,
  };
}
