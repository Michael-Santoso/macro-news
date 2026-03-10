import {
  AssetClass,
  MacroTheme,
  Prisma,
  ThemeHeatLevel,
} from "@prisma/client";
import prisma from "../lib/prisma";
import { eventService, type EventSort } from "./event.service";

const THEME_LIST = Object.values(MacroTheme);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const THEME_TREND_DAYS = 30;

const DEFAULT_RELEASE_SERIES = [
  { key: "cpi", label: "CPI", seriesId: "CPIAUCSL" },
  { key: "unemployment", label: "Unemployment Rate", seriesId: "UNRATE" },
  { key: "interest_rates", label: "Fed Funds Rate", seriesId: "DFF" },
] as const;

type ThemeTimelineParams = {
  theme: MacroTheme;
  region?: string;
  fromDate?: Date;
  toDate?: Date;
  assetClass?: AssetClass;
  page?: number;
  limit?: number;
  sort?: EventSort;
};

type ListThemesParams = {
  region?: string;
  page?: number;
  limit?: number;
  sort?: "heat" | "momentum" | "mentions" | "theme";
};

type ListMacroReleasesParams = {
  page?: number;
  limit?: number;
  sort?: "latest" | "series";
  category?: string;
  seriesId?: string;
};

type ThemeAggregate = {
  theme: MacroTheme;
  region: string | null;
  dailyMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  momentumScore: number;
  heatLevel: ThemeHeatLevel;
  updatedAt: string | null;
};

type MacroReleaseRow = {
  seriesId: string;
  observationDate: Date;
  value: string;
  category: string | null;
  shortDescription: string | null;
  frequency: string | null;
  units: string | null;
};

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(limit, 1), MAX_LIMIT);
}

function clampPage(page?: number): number {
  if (!page || Number.isNaN(page)) {
    return DEFAULT_PAGE;
  }

  return Math.max(page, 1);
}

function normalizeRegion(region?: string): string {
  return region?.trim() || "GLOBAL";
}

async function loadThemeScores(region?: string): Promise<ThemeAggregate[]> {
  const resolvedRegion = normalizeRegion(region);
  const scores = await prisma.themeScore.findMany({
    where: {
      region: resolvedRegion,
    },
    select: {
      theme: true,
      region: true,
      dailyMentions: true,
      weeklyMentions: true,
      monthlyMentions: true,
      momentumScore: true,
      heatLevel: true,
      updatedAt: true,
    },
  });

  const scoreMap = new Map(
    scores.map((score) => [
      score.theme,
      {
        theme: score.theme,
        region: score.region,
        dailyMentions: score.dailyMentions,
        weeklyMentions: score.weeklyMentions,
        monthlyMentions: score.monthlyMentions,
        momentumScore: score.momentumScore,
        heatLevel: score.heatLevel,
        updatedAt: score.updatedAt.toISOString(),
      } satisfies ThemeAggregate,
    ]),
  );

  return THEME_LIST.map(
    (theme) =>
      scoreMap.get(theme) ?? {
        theme,
        region: resolvedRegion,
        dailyMentions: 0,
        weeklyMentions: 0,
        monthlyMentions: 0,
        momentumScore: 0,
        heatLevel: "STABLE",
        updatedAt: null,
      },
  );
}

async function loadThemeScore(
  theme: MacroTheme,
  region?: string,
): Promise<ThemeAggregate> {
  const resolvedRegion = normalizeRegion(region);
  const score = await prisma.themeScore.findUnique({
    where: {
      theme_region: {
        theme,
        region: resolvedRegion,
      },
    },
    select: {
      theme: true,
      region: true,
      dailyMentions: true,
      weeklyMentions: true,
      monthlyMentions: true,
      momentumScore: true,
      heatLevel: true,
      updatedAt: true,
    },
  });

  if (!score) {
    return {
      theme,
      region: resolvedRegion,
      dailyMentions: 0,
      weeklyMentions: 0,
      monthlyMentions: 0,
      momentumScore: 0,
      heatLevel: "STABLE",
      updatedAt: null,
    };
  }

  return {
    theme: score.theme,
    region: score.region,
    dailyMentions: score.dailyMentions,
    weeklyMentions: score.weeklyMentions,
    monthlyMentions: score.monthlyMentions,
    momentumScore: score.momentumScore,
    heatLevel: score.heatLevel,
    updatedAt: score.updatedAt.toISOString(),
  };
}

async function loadHeatTrend(theme: MacroTheme, region?: string) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - THEME_TREND_DAYS + 1);
  since.setUTCHours(0, 0, 0, 0);

  const events = await prisma.themeEvent.findMany({
    where: {
      theme,
      ...(region ? { region } : {}),
      publishedAt: { gte: since },
    },
    select: {
      publishedAt: true,
    },
    orderBy: {
      publishedAt: "asc",
    },
  });

  const mentionsByDay = new Map<string, number>();

  for (let offset = 0; offset < THEME_TREND_DAYS; offset += 1) {
    const current = new Date(since);
    current.setUTCDate(since.getUTCDate() + offset);
    mentionsByDay.set(current.toISOString().slice(0, 10), 0);
  }

  for (const event of events) {
    const key = event.publishedAt.toISOString().slice(0, 10);
    mentionsByDay.set(key, (mentionsByDay.get(key) ?? 0) + 1);
  }

  return Array.from(mentionsByDay.entries()).map(([date, mentions]) => ({
    date,
    mentions,
  }));
}

function paginate<T>(items: T[], page?: number, limit?: number) {
  const resolvedPage = clampPage(page);
  const resolvedLimit = clampLimit(limit);
  const start = (resolvedPage - 1) * resolvedLimit;

  return {
    data: items.slice(start, start + resolvedLimit),
    pagination: {
      page: resolvedPage,
      limit: resolvedLimit,
      total: items.length,
      totalPages: items.length === 0 ? 0 : Math.ceil(items.length / resolvedLimit),
    },
  };
}

export const dashboardService = {
  async listThemes(params: ListThemesParams) {
    const sort = params.sort ?? "heat";
    const items = await loadThemeScores(params.region);

    items.sort((left, right) => {
      if (sort === "theme") {
        return left.theme.localeCompare(right.theme);
      }

      if (sort === "mentions") {
        if (right.weeklyMentions !== left.weeklyMentions) {
          return right.weeklyMentions - left.weeklyMentions;
        }

        return left.theme.localeCompare(right.theme);
      }

      if (sort === "momentum") {
        if (right.momentumScore !== left.momentumScore) {
          return right.momentumScore - left.momentumScore;
        }

        return right.weeklyMentions - left.weeklyMentions;
      }

      const heatRank = { HOT: 3, STABLE: 2, COOLING: 1 };

      if (heatRank[right.heatLevel] !== heatRank[left.heatLevel]) {
        return heatRank[right.heatLevel] - heatRank[left.heatLevel];
      }

      if (right.momentumScore !== left.momentumScore) {
        return right.momentumScore - left.momentumScore;
      }

      return right.weeklyMentions - left.weeklyMentions;
    });

    const paginated = paginate(items, params.page, params.limit);

      return {
      data: paginated.data,
      pagination: paginated.pagination,
      meta: {
        region: normalizeRegion(params.region),
        sort,
        scoringSource: "persisted_theme_scores",
      },
    };
  },

  async getThemeDetails(params: ThemeTimelineParams) {
    const aggregate = await loadThemeScore(params.theme, params.region);

    const timeline = await eventService.listEvents({
      theme: params.theme,
      region: params.region,
      fromDate: params.fromDate,
      toDate: params.toDate,
      assetClass: params.assetClass,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
    });

    const heatTrend = await loadHeatTrend(params.theme, params.region);

    return {
      theme: {
        ...(aggregate ?? {
          theme: params.theme,
          region: normalizeRegion(params.region),
          dailyMentions: 0,
          weeklyMentions: 0,
          monthlyMentions: 0,
          momentumScore: 0,
          heatLevel: "STABLE" as const,
        }),
        scoringSource: "persisted_theme_scores",
      },
      timeline,
      heatTrend,
      meta: {
        scoreRegion: normalizeRegion(params.region),
        timelineRegion: params.region ?? null,
      },
    };
  },

  async listMacroReleases(params: ListMacroReleasesParams) {
    const seriesFilter = params.seriesId
      ? [params.seriesId]
      : DEFAULT_RELEASE_SERIES.map((item) => item.seriesId);
    const sort = params.sort ?? "latest";

    const rows = await prisma.$queryRaw<MacroReleaseRow[]>(Prisma.sql`
      SELECT DISTINCT ON (mo."seriesId")
        mo."seriesId",
        mo."observationDate",
        mo."value",
        catalog."category",
        catalog."shortDescription",
        catalog."frequency",
        catalog."units"
      FROM "MacroObservation" mo
      LEFT JOIN "MacroObservationCatalog" catalog
        ON catalog."seriesId" = mo."seriesId"
      WHERE mo."seriesId" IN (${Prisma.join(seriesFilter)})
      ${params.category ? Prisma.sql`AND catalog."category" = ${params.category}` : Prisma.empty}
      ORDER BY mo."seriesId", mo."observationDate" DESC
    `);

    const itemMap = new Map<string, (typeof DEFAULT_RELEASE_SERIES)[number]>(
      DEFAULT_RELEASE_SERIES.map((item) => [item.seriesId, item]),
    );

    const items = rows.map((row) => {
      const mappedRelease = itemMap.get(row.seriesId);

      return {
        key: mappedRelease?.key ?? row.seriesId.toLowerCase(),
        label: mappedRelease?.label ?? row.shortDescription ?? row.seriesId,
        seriesId: row.seriesId,
        value: row.value,
        observationDate: row.observationDate.toISOString(),
        category: row.category,
        frequency: row.frequency,
        units: row.units,
        description: row.shortDescription,
      };
    });

    items.sort((left, right) => {
      if (sort === "series") {
        return left.seriesId.localeCompare(right.seriesId);
      }

      return (
        new Date(right.observationDate).getTime() -
        new Date(left.observationDate).getTime()
      );
    });

    const paginated = paginate(items, params.page, params.limit);

    return {
      data: paginated.data,
      pagination: paginated.pagination,
      meta: {
        sort,
        category: params.category ?? null,
        seriesId: params.seriesId ?? null,
      },
    };
  },
};
