import {
  AssetClass,
  MacroTheme,
  Prisma,
  ThemeEventSourceType,
} from "@prisma/client";
import prisma from "../lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const IMPACTFUL_SOURCE_WEIGHTS: Record<ThemeEventSourceType, number> = {
  MACRO_OBSERVATION: 4,
  OFFICIAL_ANNOUNCEMENT: 3,
  REGULATORY_ANNOUNCEMENT: 2,
  RAW_ARTICLE: 1,
};

export type EventSort = "newest" | "most_impactful";

export type ListEventsParams = {
  theme?: MacroTheme;
  region?: string;
  fromDate?: Date;
  toDate?: Date;
  assetClass?: AssetClass;
  page?: number;
  limit?: number;
  sort?: EventSort;
};

type EventListItem = {
  id: string;
  title: string;
  theme: MacroTheme;
  region: string | null;
  summary: string;
  riskImplication: string;
  sourceUrl: string | null;
  publishedAt: string;
  assetClass: AssetClass | null;
  sourceType: ThemeEventSourceType;
  impactScore: number;
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

function buildEventWhere(params: ListEventsParams): Prisma.ThemeEventWhereInput {
  const publishedAt: Prisma.DateTimeFilter = {};
  const normalizedRegion = params.region?.trim();

  if (params.fromDate) {
    publishedAt.gte = params.fromDate;
  }

  if (params.toDate) {
    publishedAt.lte = params.toDate;
  }

  return {
    ...(params.theme ? { theme: params.theme } : {}),
    ...(normalizedRegion && normalizedRegion !== "GLOBAL"
      ? {
          OR: [{ region: normalizedRegion }, { region: null }],
        }
      : {}),
    ...(params.assetClass ? { assetClass: params.assetClass } : {}),
    ...(params.fromDate || params.toDate ? { publishedAt } : {}),
  };
}

function toImpactScore(
  sourceType: ThemeEventSourceType,
  publishedAt: Date,
  now: Date,
): number {
  const sourceWeight = IMPACTFUL_SOURCE_WEIGHTS[sourceType] ?? 0;
  const ageInHours = Math.max(
    1,
    (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60),
  );

  return Number((sourceWeight * 1000 - ageInHours).toFixed(2));
}

function mapEventListItem(
  event: {
    id: string;
    title: string;
    theme: MacroTheme;
    region: string | null;
    summary: string;
    riskImplication: string;
    sourceUrl: string | null;
    publishedAt: Date;
    assetClass: AssetClass | null;
    sourceType: ThemeEventSourceType;
  },
  now: Date,
): EventListItem {
  return {
    id: event.id,
    title: event.title,
    theme: event.theme,
    region: event.region,
    summary: event.summary,
    riskImplication: event.riskImplication,
    sourceUrl: event.sourceUrl,
    publishedAt: event.publishedAt.toISOString(),
    assetClass: event.assetClass,
    sourceType: event.sourceType,
    impactScore: toImpactScore(event.sourceType, event.publishedAt, now),
  };
}

export const eventService = {
  async listEvents(params: ListEventsParams) {
    const page = clampPage(params.page);
    const limit = clampLimit(params.limit);
    const sort = params.sort ?? "newest";
    const where = buildEventWhere(params);
    const total = await prisma.themeEvent.count({ where });
    const now = new Date();

    let items = await prisma.themeEvent.findMany({
      where,
      orderBy: {
        publishedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        theme: true,
        region: true,
        summary: true,
        riskImplication: true,
        sourceUrl: true,
        publishedAt: true,
        assetClass: true,
        sourceType: true,
      },
    });

    const mappedItems = items.map((item) => mapEventListItem(item, now));

    if (sort === "most_impactful") {
      mappedItems.sort((left, right) => {
        if (right.impactScore !== left.impactScore) {
          return right.impactScore - left.impactScore;
        }

        return (
          new Date(right.publishedAt).getTime() -
          new Date(left.publishedAt).getTime()
        );
      });
    }

    const start = (page - 1) * limit;
    items = [];

    return {
      data: mappedItems.slice(start, start + limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
      filters: {
        theme: params.theme ?? null,
        region: params.region ?? null,
        fromDate: params.fromDate?.toISOString() ?? null,
        toDate: params.toDate?.toISOString() ?? null,
        assetClass: params.assetClass ?? null,
        sort,
      },
    };
  },
};
