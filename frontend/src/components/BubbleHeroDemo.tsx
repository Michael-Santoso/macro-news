"use client";

import { useState } from "react";
import { BubbleHero } from "./BubbleHero";
import type { MacroTheme } from "../types/macro";

const DEMO_THEMES: MacroTheme[] = [
  {
    id: "inflation",
    name: "Inflation",
    heatLevel: "HOT",
    weeklyMentions: 148,
    intensityScore: 91,
    summary: "Sticky services inflation is keeping rate-cut expectations under pressure.",
    relatedThemes: [
      { themeId: "rates", strength: 0.92 },
      { themeId: "labor", strength: 0.61 },
    ],
  },
  {
    id: "rates",
    name: "Rates",
    heatLevel: "HOT",
    weeklyMentions: 136,
    intensityScore: 88,
    summary: "Policy repricing remains the fastest-moving driver across broad risk assets.",
    relatedThemes: [
      { themeId: "inflation", strength: 0.92 },
      { themeId: "usd", strength: 0.65 },
    ],
  },
  {
    id: "usd",
    name: "US Dollar",
    heatLevel: "STABLE",
    weeklyMentions: 97,
    intensityScore: 71,
    summary: "Dollar strength is firm but no longer accelerating at the same pace.",
    relatedThemes: [
      { themeId: "rates", strength: 0.65 },
      { themeId: "commodities", strength: 0.58 },
    ],
  },
  {
    id: "commodities",
    name: "Commodities",
    heatLevel: "STABLE",
    weeklyMentions: 90,
    intensityScore: 68,
    summary: "Energy and metals remain sensitive to growth and supply headlines.",
    relatedThemes: [{ themeId: "usd", strength: 0.58 }],
  },
  {
    id: "labor",
    name: "Labor Market",
    heatLevel: "COOLING",
    weeklyMentions: 74,
    intensityScore: 58,
    summary: "Hiring data is still healthy, but momentum is no longer broadening.",
    relatedThemes: [{ themeId: "inflation", strength: 0.61 }],
  },
  {
    id: "china",
    name: "China Growth",
    heatLevel: "COOLING",
    weeklyMentions: 66,
    intensityScore: 54,
    summary: "Stimulus expectations are offsetting weaker property and trade signals.",
  },
  {
    id: "credit",
    name: "Credit Stress",
    heatLevel: "HOT",
    weeklyMentions: 82,
    intensityScore: 76,
    summary: "Credit conditions are tightening in pockets that matter for cyclicals.",
  },
  {
    id: "housing",
    name: "Housing",
    heatLevel: "STABLE",
    weeklyMentions: 61,
    intensityScore: 49,
    summary: "Mortgage sensitivity remains elevated, but transaction volumes have stabilized.",
  },
];

export function BubbleHeroDemo() {
  const [selectedTheme, setSelectedTheme] = useState<MacroTheme>(DEMO_THEMES[0]);

  return (
    <BubbleHero
      themes={DEMO_THEMES}
      selectedThemeId={selectedTheme.id}
      onSelectTheme={setSelectedTheme}
    />
  );
}
