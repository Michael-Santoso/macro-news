export type ThemeHeatLevel = "HOT" | "STABLE" | "COOLING";

export type MacroThemeKey =
  | "inflation"
  | "interest_rates"
  | "recession_growth"
  | "labor_market"
  | "liquidity_credit"
  | "energy_oil"
  | "china_growth"
  | "trade_policy"
  | "financial_regulation";

export type AssetClass = "STOCK" | "BOND" | "FOREX" | "COMMODITY" | "MACRO";

export type ThemeEventSourceType =
  | "RAW_ARTICLE"
  | "OFFICIAL_ANNOUNCEMENT"
  | "REGULATORY_ANNOUNCEMENT"
  | "MACRO_OBSERVATION";

export type ThemeSort = "heat" | "momentum" | "mentions" | "theme";
export type ThemeTimelineSort = "newest" | "most_impactful";
export type MacroReleaseSort = "latest" | "series";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T, TMeta = Record<string, unknown>> = {
  data: T[];
  pagination: Pagination;
  meta?: TMeta;
  filters?: Record<string, unknown>;
};

export type ThemeSummary = {
  theme: MacroThemeKey;
  region: string | null;
  dailyMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  momentumScore: number;
  heatLevel: ThemeHeatLevel;
  updatedAt: string | null;
};

export type HeatTrendPoint = {
  date: string;
  mentions: number;
};

export type ThemeEvent = {
  id: string;
  title: string;
  theme: MacroThemeKey;
  region: string | null;
  summary: string;
  riskImplication: string;
  sourceUrl: string | null;
  publishedAt: string;
  assetClass: AssetClass | null;
  sourceType: ThemeEventSourceType;
  impactScore: number;
};

export type ThemeDetailResponse = {
  theme: ThemeSummary & {
    scoringSource: string;
  };
  timeline: PaginatedResponse<ThemeEvent>;
  heatTrend: HeatTrendPoint[];
  meta: {
    scoreRegion: string;
    timelineRegion: string | null;
  };
};

export type MacroRelease = {
  key: string;
  label: string;
  seriesId: string;
  value: string;
  observationDate: string;
  category: string | null;
  frequency: string | null;
  units: string | null;
  description: string | null;
};

export type ThemeFilters = {
  region: string;
  search: string;
  heatLevel: ThemeHeatLevel | "ALL";
};

export type ThemeListResponse = PaginatedResponse<
  ThemeSummary,
  {
    region: string;
    sort: ThemeSort;
    scoringSource: string;
  }
>;

export type EventsResponse = PaginatedResponse<ThemeEvent>;

export type MacroReleasesResponse = PaginatedResponse<
  MacroRelease,
  {
    sort: MacroReleaseSort;
    category: string | null;
    seriesId: string | null;
  }
>;
