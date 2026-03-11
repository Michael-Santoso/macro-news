import type {
  MacroRelease,
  MacroThemeKey,
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
