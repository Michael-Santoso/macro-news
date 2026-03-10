import type {
  MacroTheme,
  RegulatoryCategory,
  ThemeEventSourceType,
} from "@prisma/client";
import {
  MACRO_SERIES_THEME_MAP,
  MACRO_THEME_KEYWORDS,
  THEME_PRIORITY,
} from "./theme-taxonomy";

type ClassifyThemeInput = {
  title?: string | null;
  content?: string | null;
  sourceType: ThemeEventSourceType;
  seriesId?: string | null;
  regulatoryCategory?: RegulatoryCategory | null;
  regionHint?: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return value
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() ?? "";
}

function scoreThemes(text: string): Map<MacroTheme, number> {
  const scores = new Map<MacroTheme, number>();

  for (const theme of THEME_PRIORITY) {
    let score = 0;

    for (const keyword of MACRO_THEME_KEYWORDS[theme]) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > 0) {
      scores.set(theme, score);
    }
  }

  return scores;
}

function regulatoryCategoryThemes(
  regulatoryCategory: RegulatoryCategory | null | undefined,
): MacroTheme[] {
  switch (regulatoryCategory) {
    case "TRADE_POLICY":
      return ["trade_policy"];
    case "BANK_CAPITAL":
    case "FINANCIAL_REGULATION":
    case "GENERAL_REGULATION":
      return ["financial_regulation"];
    case "ENERGY_POLICY":
      return ["energy_oil"];
    default:
      return [];
  }
}

function regionHintThemes(regionHint: string | null | undefined): MacroTheme[] {
  const value = normalizeText(regionHint);

  if (value.includes("china")) {
    return ["china_growth"];
  }

  return [];
}

export function classifyThemes(input: ClassifyThemeInput): MacroTheme[] {
  const combinedText = normalizeText(
    [input.title, input.content].filter(Boolean).join(" "),
  );
  const scores = scoreThemes(combinedText);

  for (const theme of input.seriesId ? MACRO_SERIES_THEME_MAP[input.seriesId] ?? [] : []) {
    scores.set(theme, Math.max(scores.get(theme) ?? 0, 2));
  }

  for (const theme of regulatoryCategoryThemes(input.regulatoryCategory)) {
    scores.set(theme, Math.max(scores.get(theme) ?? 0, 2));
  }

  for (const theme of regionHintThemes(input.regionHint)) {
    scores.set(theme, Math.max(scores.get(theme) ?? 0, 1));
  }

  return THEME_PRIORITY.filter((theme) => (scores.get(theme) ?? 0) > 0);
}
