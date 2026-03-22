"use client";

import { useState } from "react";
import {
  formatCompactNumber,
  getHeatLevelLabel,
} from "../lib/dashboard";
import styles from "./BubbleHero.module.css";
import type { MacroTheme, ThemeHeatLevel } from "../types/macro";

interface BubbleHeroProps {
  themes: MacroTheme[];
  selectedRegionLabel?: string;
  selectedThemeId?: string | null;
  onSelectTheme?: (theme: MacroTheme) => void;
  className?: string;
}

interface BubbleLayout {
  left: number;
  top: number;
}

const HEAT_STYLES: Record<
  ThemeHeatLevel,
  { fill: string; glow: string; edge: string }
> = {
  HOT: {
    fill: "linear-gradient(145deg, #f59e0b 0%, #ea580c 48%, #dc2626 100%)",
    glow: "rgba(234, 88, 12, 0.22)",
    edge: "rgba(251, 191, 36, 0.22)",
  },
  STABLE: {
    fill: "linear-gradient(145deg, #94a3b8 0%, #64748b 46%, #334155 100%)",
    glow: "rgba(100, 116, 139, 0.2)",
    edge: "rgba(148, 163, 184, 0.22)",
  },
  COOLING: {
    fill: "linear-gradient(145deg, #34d399 0%, #0f766e 52%, #14532d 100%)",
    glow: "rgba(16, 185, 129, 0.2)",
    edge: "rgba(52, 211, 153, 0.2)",
  },
};

const DESKTOP_LAYOUTS: BubbleLayout[] = [
  { left: 19, top: 18 },
  { left: 42, top: 18 },
  { left: 66, top: 22 },
  { left: 24, top: 44 },
  { left: 49, top: 41 },
  { left: 76, top: 46 },
  { left: 16, top: 69 },
  { left: 39, top: 69 },
  { left: 61, top: 67 },
  { left: 82, top: 72 },
  { left: 72, top: 28 },
  { left: 30, top: 28 },
];

const MOBILE_LAYOUTS: BubbleLayout[] = [
  { left: 28, top: 14 },
  { left: 64, top: 16 },
  { left: 46, top: 28 },
  { left: 24, top: 41 },
  { left: 69, top: 42 },
  { left: 47, top: 55 },
  { left: 24, top: 67 },
  { left: 68, top: 69 },
  { left: 42, top: 81 },
  { left: 71, top: 84 },
  { left: 20, top: 84 },
  { left: 52, top: 41 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getThemeMagnitude(theme: MacroTheme) {
  return theme.weeklyMentions ?? theme.intensityScore ?? 0;
}

function formatMomentum(value: number | null | undefined) {
  const resolvedValue = value ?? 0;

  if (resolvedValue === 0) {
    return "Flat";
  }

  return `${resolvedValue > 0 ? "+" : ""}${resolvedValue}`;
}

function getBubbleSize(theme: MacroTheme, minValue: number, maxValue: number) {
  const range = Math.max(maxValue - minValue, 1);
  const normalized = (getThemeMagnitude(theme) - minValue) / range;

  return Math.round(88 + normalized * 72);
}

function getLayout(index: number, total: number): BubbleLayout {
  const isMobileDense = total > 8;
  const layouts = isMobileDense ? MOBILE_LAYOUTS : DESKTOP_LAYOUTS;
  const preset = layouts[index];

  if (preset) {
    return preset;
  }

  const columns = total > 9 ? 4 : 3;
  const row = Math.floor(index / columns);
  const column = index % columns;
  const baseLeft = 18 + column * (64 / Math.max(columns - 1, 1));
  const baseTop = 16 + row * 20;

  return {
    left: clamp(baseLeft + (row % 2 === 0 ? 0 : 5), 16, 84),
    top: clamp(baseTop, 16, 84),
  };
}

function getStrongestEdges(themes: MacroTheme[]) {
  const themeMap = new Map(themes.map((theme) => [theme.id, theme]));
  const uniqueEdges = new Map<
    string,
    { from: string; to: string; strength: number; edgeColor: string }
  >();

  for (const theme of themes) {
    for (const relation of theme.relatedThemes ?? []) {
      if (!relation.themeId || !themeMap.has(relation.themeId)) {
        continue;
      }

      const strength = relation.strength ?? 0;

      if (strength < 0.55) {
        continue;
      }

      const pair = [theme.id, relation.themeId].sort().join(":");

      if (uniqueEdges.has(pair)) {
        continue;
      }

      uniqueEdges.set(pair, {
        from: theme.id,
        to: relation.themeId,
        strength,
        edgeColor: HEAT_STYLES[theme.heatLevel].edge,
      });
    }
  }

  return [...uniqueEdges.values()]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 6);
}

export function BubbleHero({
  themes,
  selectedRegionLabel,
  selectedThemeId,
  onSelectTheme,
  className,
}: BubbleHeroProps) {
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);

  if (themes.length === 0) {
    return (
      <section className={`${styles.hero} ${className ?? ""}`.trim()}>
        <div className={styles.empty}>No active macro themes available.</div>
      </section>
    );
  }

  const sortedThemes = [...themes].sort(
    (left, right) => getThemeMagnitude(right) - getThemeMagnitude(left),
  );
  const magnitudes = sortedThemes.map(getThemeMagnitude);
  const minValue = Math.min(...magnitudes);
  const maxValue = Math.max(...magnitudes);
  const hoveredTheme =
    hoveredThemeId != null
      ? (sortedThemes.find((theme) => theme.id === hoveredThemeId) ?? null)
      : null;
  const selectedTheme =
    selectedThemeId != null
      ? (sortedThemes.find((theme) => theme.id === selectedThemeId) ?? null)
      : sortedThemes[0] ?? null;
  const previewTheme = hoveredTheme ?? selectedTheme;
  const edges = getStrongestEdges(sortedThemes);
  const heatCounts = {
    HOT: sortedThemes.filter((theme) => theme.heatLevel === "HOT").length,
    STABLE: sortedThemes.filter((theme) => theme.heatLevel === "STABLE").length,
    COOLING: sortedThemes.filter((theme) => theme.heatLevel === "COOLING").length,
  };
  const positions = Object.fromEntries(
    sortedThemes.map((theme, index) => [
      theme.id,
      getLayout(index, sortedThemes.length),
    ]),
  );

  return (
    <section className={`${styles.hero} ${className ?? ""}`.trim()}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Macro Discovery</p>
          <h1 className={styles.title}>Theme Heatmap</h1>
          <p className={styles.subtitle}>
            Bubble size tracks weekly mentions. Color reflects the current heat state
            {selectedRegionLabel ? ` for ${selectedRegionLabel}` : ""}.
          </p>
          <div className={styles.statusRail} aria-label="Heat state distribution">
            {(["HOT", "STABLE", "COOLING"] as const).map((heatLevel) => (
              <span key={heatLevel} className={styles.statusChip}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: HEAT_STYLES[heatLevel].fill }}
                />
                {getHeatLevelLabel(heatLevel)} {heatCounts[heatLevel]}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.headerRail}>
          <div className={styles.legend} aria-label="Heat level legend">
            {(["HOT", "STABLE", "COOLING"] as const).map((heatLevel) => (
              <span key={heatLevel} className={styles.legendChip}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: HEAT_STYLES[heatLevel].fill }}
                />
                {getHeatLevelLabel(heatLevel)}
              </span>
            ))}
          </div>

          <div className={styles.hoverCard} aria-live="polite">
            {previewTheme ? (
              <>
                <p className={styles.hoverCardLabel}>
                  {hoveredTheme ? "Hover preview" : "Current selection"}
                </p>
                <h2 className={styles.hoverCardTitle}>{previewTheme.name}</h2>
                <p className={styles.hoverCardBody}>
                  {previewTheme.summary ?? "Select a theme to push it into the detail panel."}
                </p>
                <div className={styles.hoverCardStats}>
                  <span className={styles.metaPill}>
                    {getHeatLevelLabel(previewTheme.heatLevel)}
                  </span>
                  {previewTheme.weeklyMentions != null ? (
                    <span className={styles.metaPill}>
                      {formatCompactNumber(previewTheme.weeklyMentions)} weekly mentions
                    </span>
                  ) : null}
                  {previewTheme.momentumScore != null ? (
                    <span className={styles.metaPill}>
                      Trend {formatMomentum(previewTheme.momentumScore)}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className={styles.hoverCardLabel}>Current selection</p>
                <p className={styles.hoverCardHint}>Choose a bubble to inspect the signal stack below.</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.surface}>
        {edges.length > 0 ? (
          <svg
            className={styles.edges}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {edges.map((edge) => {
              const start = positions[edge.from];
              const end = positions[edge.to];

              if (!start || !end) {
                return null;
              }

              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={start.left}
                  y1={start.top}
                  x2={end.left}
                  y2={end.top}
                  stroke={edge.edgeColor}
                  strokeWidth={Math.max(0.3, edge.strength * 0.8)}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
        ) : null}

        {sortedThemes.map((theme, index) => {
          const size = getBubbleSize(theme, minValue, maxValue);
          const position = positions[theme.id];
          const heat = HEAT_STYLES[theme.heatLevel];
          const isSelected = selectedThemeId === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              className={`${styles.bubble} ${isSelected ? styles.selected : ""}`.trim()}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: heat.fill,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.12), 0 20px 38px ${heat.glow}`,
                animationDelay: `${index * 45}ms`,
                zIndex: isSelected || hoveredThemeId === theme.id ? 2 : 1,
              }}
              onMouseEnter={() => setHoveredThemeId(theme.id)}
              onMouseLeave={() =>
                setHoveredThemeId((current) =>
                  current === theme.id ? null : current,
                )
              }
              onFocus={() => setHoveredThemeId(theme.id)}
              onBlur={() =>
                setHoveredThemeId((current) =>
                  current === theme.id ? null : current,
                )
              }
              onClick={() => onSelectTheme?.(theme)}
              aria-pressed={isSelected}
              aria-label={`Select ${theme.name}`}
            >
              <span className={styles.bubbleName}>{theme.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
