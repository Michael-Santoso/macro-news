"use client";

import { useEffect, useMemo, useState } from "react";
import { BubbleHero } from "@/src/components/BubbleHero";
import type { MacroTheme as BubbleTheme } from "@/src/types/macro";
import {
  getEvents,
  getMacroReleases,
  getThemeDetails,
  getThemes,
} from "@/src/lib/api";
import {
  DEFAULT_FILTERS,
  type EvidenceTypeFilter,
  filterThemes,
  formatDate,
  isValidNavigableUrl,
  REGION_OPTIONS,
  getThemeLabel,
} from "@/src/lib/dashboard";
import type {
  MacroRelease,
  MacroThemeKey,
  ThemeDetailResponse,
  ThemeEvent,
  ThemeFilters,
  ThemeSummary,
} from "@/src/types/dashboard";
import { EventsTimeline } from "./EventsTimeline";
import { FilterBar } from "./FilterBar";
import { MacroReleasesPanel } from "./MacroReleasesPanel";
import { ThemeDetailPanel } from "./ThemeDetailPanel";

const TIMELINE_DISPLAY_LIMIT = 8;
const EVIDENCE_FETCH_LIMIT = 100;
const EVIDENCE_PAGE_SIZE = 5;

function toBubbleTheme(theme: ThemeSummary): BubbleTheme {
  return {
    id: theme.theme,
    name: getThemeLabel(theme.theme),
    heatLevel: theme.heatLevel,
    weeklyMentions: theme.weeklyMentions,
    momentumScore: theme.momentumScore,
    intensityScore: theme.momentumScore,
    summary: `${theme.weeklyMentions} weekly mentions with momentum ${theme.momentumScore > 0 ? "+" : ""}${theme.momentumScore}. Updated ${formatDate(
      theme.updatedAt,
    )}.`,
  };
}

export function DashboardPage() {
  const [filters, setFilters] = useState<ThemeFilters>(DEFAULT_FILTERS);
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<MacroThemeKey | null>(
    null,
  );
  const [themeDetail, setThemeDetail] = useState<ThemeDetailResponse | null>(
    null,
  );
  const [themeEvents, setThemeEvents] = useState<ThemeEvent[]>([]);
  const [evidencePage, setEvidencePage] = useState(1);
  const [evidenceTypeFilter, setEvidenceTypeFilter] =
    useState<EvidenceTypeFilter>("ALL");
  const [releases, setReleases] = useState<MacroRelease[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [themesLoading, setThemesLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [releasesLoading, setReleasesLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadShellData() {
      setThemesLoading(true);
      setReleasesLoading(true);
      setPageError(null);

      try {
        const [themesResponse, releasesResponse] = await Promise.all([
          getThemes({
            region: filters.region,
            limit: 24,
            sort: "heat",
            signal: controller.signal,
          }),
          getMacroReleases({
            limit: 6,
            sort: "latest",
            signal: controller.signal,
          }),
        ]);

        setThemes(themesResponse.data);
        setReleases(releasesResponse.data);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setPageError((error as Error).message);
      } finally {
        setThemesLoading(false);
        setReleasesLoading(false);
      }
    }

    void loadShellData();

    return () => controller.abort();
  }, [filters.region]);

  const visibleThemes = useMemo(
    () => filterThemes(themes, filters),
    [themes, filters],
  );

  useEffect(() => {
    if (visibleThemes.length === 0) {
      setSelectedTheme(null);
      setThemeDetail(null);
      setThemeEvents([]);
      return;
    }

    if (
      !selectedTheme ||
      !visibleThemes.some((theme) => theme.theme === selectedTheme)
    ) {
      setSelectedTheme(visibleThemes[0].theme);
    }
  }, [selectedTheme, visibleThemes]);

  useEffect(() => {
    setEvidencePage(1);
  }, [evidenceTypeFilter, filters.region, selectedTheme]);

  useEffect(() => {
    if (selectedTheme == null) {
      return;
    }

    const activeTheme = selectedTheme;
    const controller = new AbortController();

    async function loadSelectedThemeData() {
      setDetailLoading(true);

      try {
        const detailResponse = await getThemeDetails({
          theme: activeTheme,
          region: filters.region,
          limit: TIMELINE_DISPLAY_LIMIT,
          sort: "newest",
          signal: controller.signal,
        });

        setThemeDetail(detailResponse);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setPageError((error as Error).message);
      } finally {
        setDetailLoading(false);
      }
    }

    void loadSelectedThemeData();

    return () => controller.abort();
  }, [filters.region, selectedTheme]);

  useEffect(() => {
    if (selectedTheme == null) {
      return;
    }

    const activeTheme = selectedTheme;
    const controller = new AbortController();

    async function loadThemeEvidence() {
      setFeedLoading(true);
      setThemeEvents([]);

      try {
        const allEvents: ThemeEvent[] = [];
        let nextPage = 1;
        let totalPages = 1;

        while (nextPage <= totalPages) {
          const eventsResponse = await getEvents({
            theme: activeTheme,
            region: filters.region,
            page: nextPage,
            limit: EVIDENCE_FETCH_LIMIT,
            sort: "newest",
            signal: controller.signal,
          });

          allEvents.push(...eventsResponse.data);
          totalPages = eventsResponse.pagination.totalPages;
          nextPage += 1;
        }

        setThemeEvents(allEvents);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setPageError((error as Error).message);
      } finally {
        setFeedLoading(false);
      }
    }

    void loadThemeEvidence();

    return () => controller.abort();
  }, [filters.region, selectedTheme]);

  const bubbleThemes = visibleThemes.map(toBubbleTheme);
  const hotThemes = visibleThemes.filter((theme) => theme.heatLevel === "HOT").length;
  const stableThemes = visibleThemes.filter((theme) => theme.heatLevel === "STABLE").length;
  const coolingThemes = visibleThemes.filter((theme) => theme.heatLevel === "COOLING").length;
  const selectedRegionLabel =
    REGION_OPTIONS.find((region) => region.value === filters.region)?.label ??
    filters.region;
  const linkedEvidenceEvents = useMemo(
    () =>
      [...themeEvents]
        .filter(
          (event): event is ThemeEvent & { sourceUrl: string } =>
            isValidNavigableUrl(event.sourceUrl),
        )
        .sort(
          (left, right) =>
            new Date(right.publishedAt).getTime() -
            new Date(left.publishedAt).getTime(),
        ),
    [themeEvents],
  );

  return (
    <main className="dashboardShell">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        stats={{
          visibleThemes: visibleThemes.length,
          hotThemes,
          stableThemes,
          coolingThemes,
          selectedRegionLabel,
        }}
      />

      {pageError ? (
        <section className="feedbackCard">
          <h2>Dashboard unavailable</h2>
          <p>{pageError}</p>
        </section>
      ) : null}

      {!pageError && !themesLoading && themes.length === 0 ? (
        <section className="feedbackCard">
          <h2>No theme data available</h2>
          <p>
            The API returned no themes for region{" "}
            <strong>{filters.region}</strong>.
          </p>
        </section>
      ) : null}

      {!pageError &&
      !themesLoading &&
      themes.length > 0 &&
      visibleThemes.length === 0 ? (
        <section className="feedbackCard">
          <h2>No themes match the current filters</h2>
          <p>Adjust the search term or filter to broaden the result set.</p>
        </section>
      ) : null}

      <section className="dashboardGrid">
        <div className="dashboardGridHero">
          <BubbleHero
            themes={bubbleThemes}
            selectedRegionLabel={selectedRegionLabel}
            selectedThemeId={selectedTheme}
            onSelectTheme={(theme) =>
              setSelectedTheme(theme.id as MacroThemeKey)
            }
          />

          <div className="dashboardGridDetail">
            <ThemeDetailPanel
              detail={themeDetail}
              leadEvidenceEvent={linkedEvidenceEvents[0] ?? null}
              linkedEvidenceCount={linkedEvidenceEvents.length}
              selectedRegionLabel={selectedRegionLabel}
              isLoading={detailLoading}
            />
          </div>
        </div>
      </section>

      <section className="dashboardLower">
        <EventsTimeline
          events={themeEvents}
          currentPage={evidencePage}
          pageSize={EVIDENCE_PAGE_SIZE}
          typeFilter={evidenceTypeFilter}
          onTypeFilterChange={setEvidenceTypeFilter}
          onPageChange={setEvidencePage}
          isLoading={feedLoading}
          selectedTheme={selectedTheme}
        />
      </section>

      <section className="dashboardLowerSecondary">
        <MacroReleasesPanel releases={releases} isLoading={releasesLoading} />
      </section>
    </main>
  );
}
