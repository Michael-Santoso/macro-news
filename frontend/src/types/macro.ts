export type ThemeHeatLevel = "HOT" | "STABLE" | "COOLING";

export interface ThemeRelation {
  themeId: string;
  strength?: number | null;
}

export interface MacroTheme {
  id: string;
  name: string;
  heatLevel: ThemeHeatLevel;
  weeklyMentions?: number | null;
  momentumScore?: number | null;
  intensityScore?: number | null;
  summary?: string | null;
  relatedThemes?: ThemeRelation[] | null;
}
