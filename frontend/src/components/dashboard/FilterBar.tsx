"use client";

import {
  DEFAULT_FILTERS,
  HEAT_LEVEL_OPTIONS,
  REGION_OPTIONS,
} from "@/src/lib/dashboard";
import type { ThemeFilters } from "@/src/types/dashboard";

type FilterBarProps = {
  filters: ThemeFilters;
  onChange: (filters: ThemeFilters) => void;
  stats: {
    visibleThemes: number;
    hotThemes: number;
    selectedRegionLabel: string;
  };
};

export function FilterBar({ filters, onChange, stats }: FilterBarProps) {
  return (
    <section className="filterBar">
      <div className="filterBarTop">
        <div className="filterBarHeading">
          <p className="eyebrow">Macro Tracker</p>
          <h1>Theme heat dashboard</h1>
          <p className="subtle">Track the highest-conviction macro themes by region.</p>
        </div>

        <div className="filterBarTopRail">
          <div className="filterBarHighlights" aria-label="Dashboard snapshot">
            <div className="highlightChip">
              <span>Visible themes</span>
              <strong>{stats.visibleThemes}</strong>
            </div>
            <div className="highlightChip">
              <span>Heating up</span>
              <strong>{stats.hotThemes}</strong>
            </div>
            <div className="highlightChip">
              <span>Region</span>
              <strong>{stats.selectedRegionLabel}</strong>
            </div>
          </div>

          <button
            className="secondaryButton"
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="toolbarCard">
        <div className="toolbarRegion">
          <span className="toolbarLabel">Region</span>
          <div className="regionPillGroup" aria-label="Region filter">
            {REGION_OPTIONS.map((region) => {
              const isActive = filters.region === region.value;

              return (
                <button
                  key={region.value}
                  type="button"
                  className={`regionPill ${isActive ? "isActive" : ""}`.trim()}
                  onClick={() => onChange({ ...filters, region: region.value })}
                  aria-pressed={isActive}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="filterBarControls">
          <label className="field fieldSearch">
            <span>Theme search</span>
            <div className="searchInputWrap">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className="searchIcon"
              >
                <path
                  d="M14.584 14.583 18 18m-1.75-8.25a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="search"
                placeholder="Search inflation, rates, labor, trade"
                value={filters.search}
                onChange={(event) =>
                  onChange({ ...filters, search: event.target.value })
                }
              />
            </div>
          </label>

          <label className="field fieldCompact">
            <span></span>
            <select
              value={filters.heatLevel}
              onChange={(event) =>
                onChange({
                  ...filters,
                  heatLevel: event.target.value as ThemeFilters["heatLevel"],
                })
              }
            >
              {HEAT_LEVEL_OPTIONS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
