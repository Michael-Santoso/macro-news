import type {
  MacroRelease,
  MacroThemeKey,
  ThemeEvent,
  ThemeEventSourceType,
  ThemeFilters,
  ThemeHeatLevel,
  ThemeSummary,
} from "@/src/types/dashboard";

export const DEFAULT_REGION = "GLOBAL";

export const REGION_OPTIONS = [
  { value: "GLOBAL", label: "Global" },
  { value: "US", label: "US" },
  { value: "EUROPE", label: "Europe" },
  { value: "ASIA", label: "Asia" },
  { value: "CHINA", label: "China" },
  { value: "EMERGING_MARKETS", label: "Emerging Markets" },
] as const;

export const HEAT_LEVEL_OPTIONS: Array<{
  value: ThemeHeatLevel | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All levels" },
  { value: "HOT", label: "Heating Up" },
  { value: "STABLE", label: "Stable" },
  { value: "COOLING", label: "Cooling" },
];

export const DEFAULT_FILTERS: ThemeFilters = {
  region: DEFAULT_REGION,
  search: "",
  heatLevel: "ALL",
};

export type EvidenceTypeFilter = "ALL" | "NEWS_ONLY" | "OFFICIAL_ONLY";

export const THEME_LABELS: Record<MacroThemeKey, string> = {
  inflation: "Inflation",
  interest_rates: "Interest Rates",
  recession_growth: "Recession / Growth",
  labor_market: "Labor Market",
  liquidity_credit: "Liquidity / Credit",
  energy_oil: "Energy / Oil",
  china_growth: "China Growth",
  trade_policy: "Trade Policy",
  financial_regulation: "Financial Regulation",
};

export function getThemeLabel(theme: MacroThemeKey): string {
  return THEME_LABELS[theme] ?? theme.replaceAll("_", " ");
}

export function filterThemes(
  themes: ThemeSummary[],
  filters: ThemeFilters,
): ThemeSummary[] {
  const searchTerm = filters.search.trim().toLowerCase();

  return themes.filter((theme) => {
    const matchesHeat =
      filters.heatLevel === "ALL" || theme.heatLevel === filters.heatLevel;
    const matchesSearch =
      searchTerm.length === 0 ||
      getThemeLabel(theme.theme).toLowerCase().includes(searchTerm) ||
      theme.theme.toLowerCase().includes(searchTerm);

    return matchesHeat && matchesSearch;
  });
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "No recent update";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatTrendDelta(value: number): string {
  if (value === 0) {
    return "Flat";
  }

  return `${value > 0 ? "+" : ""}${value}`;
}

export function formatSourceType(sourceType: ThemeEventSourceType): string {
  return sourceType
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const NAVIGABLE_PROTOCOLS = new Set(["http:", "https:"]);

const SOURCE_HOST_LABELS: Array<[RegExp, string]> = [
  [/(^|\.)reuters\.com$/i, "Reuters"],
  [/(^|\.)cnbc\.com$/i, "CNBC"],
  [/(^|\.)bloomberg\.com$/i, "Bloomberg"],
  [/(^|\.)apnews\.com$/i, "Associated Press"],
  [/(^|\.)businessinsider\.com$/i, "Business Insider"],
  [/(^|\.)nbcnews\.com$/i, "NBC News"],
  [/(^|\.)npr\.org$/i, "NPR"],
  [/(^|\.)fortune\.com$/i, "Fortune"],
  [/(^|\.)usatoday\.com$/i, "USA Today"],
  [/(^|\.)aljazeera\.com$/i, "Al Jazeera"],
  [/(^|\.)sec\.gov$/i, "SEC"],
  [/(^|\.)federalreserve\.gov$/i, "Federal Reserve"],
  [/(^|\.)ecb\.europa\.eu$/i, "European Central Bank"],
  [/(^|\.)bankofengland\.co\.uk$/i, "Bank of England"],
  [/(^|\.)boj\.or\.jp$/i, "Bank of Japan"],
  [/(^|\.)pbc\.gov\.cn$/i, "People's Bank of China"],
  [/(^|\.)bis\.org$/i, "BIS"],
  [/(^|\.)federalregister\.gov$/i, "Federal Register"],
  [/(^|\.)wto\.org$/i, "WTO"],
];

function inferHostLabel(hostname: string): string {
  const normalizedHost = hostname.replace(/^www\./i, "");
  const match = SOURCE_HOST_LABELS.find(([pattern]) => pattern.test(normalizedHost));

  if (match) {
    return match[1];
  }

  const parts = normalizedHost.split(".");
  if (parts.length >= 2) {
    return parts[0].replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return normalizedHost || "Source";
}

export function getEventSourceLabel(event: Pick<ThemeEvent, "sourceType" | "sourceUrl">): string {
  if (event.sourceUrl) {
    try {
      const url = new URL(event.sourceUrl);
      return inferHostLabel(url.hostname);
    } catch {
      return formatSourceType(event.sourceType);
    }
  }

  return formatSourceType(event.sourceType);
}

export function isOfficialEventSourceType(sourceType: ThemeEventSourceType): boolean {
  return (
    sourceType === "OFFICIAL_ANNOUNCEMENT" ||
    sourceType === "REGULATORY_ANNOUNCEMENT"
  );
}

export function isNewsEventSourceType(sourceType: ThemeEventSourceType): boolean {
  return sourceType === "RAW_ARTICLE";
}

export function isValidNavigableUrl(sourceUrl: string | null | undefined): sourceUrl is string {
  if (typeof sourceUrl !== "string") {
    return false;
  }

  const trimmedSourceUrl = sourceUrl.trim();
  if (trimmedSourceUrl.length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedSourceUrl);
    return NAVIGABLE_PROTOCOLS.has(parsedUrl.protocol) && parsedUrl.hostname.length > 0;
  } catch {
    return false;
  }
}

export function matchesEvidenceTypeFilter(
  event: Pick<ThemeEvent, "sourceType">,
  filter: EvidenceTypeFilter,
): boolean {
  if (filter === "NEWS_ONLY") {
    return isNewsEventSourceType(event.sourceType);
  }

  if (filter === "OFFICIAL_ONLY") {
    return isOfficialEventSourceType(event.sourceType);
  }

  return true;
}

export function formatReleaseValue(release: MacroRelease): string {
  return release.units ? `${release.value} ${release.units}` : release.value;
}

export function getHeatLevelLabel(heatLevel: ThemeHeatLevel): string {
  if (heatLevel === "HOT") {
    return "Heating up";
  }

  if (heatLevel === "COOLING") {
    return "Cooling";
  }

  return "Stable";
}
