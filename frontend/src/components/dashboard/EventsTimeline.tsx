"use client";

import { useEffect, useMemo } from "react";
import {
  type EvidenceTypeFilter,
  formatDate,
  getEventSourceLabel,
  getThemeLabel,
  isOfficialEventSourceType,
  isNewsEventSourceType,
  isValidNavigableUrl,
  matchesEvidenceTypeFilter,
} from "@/src/lib/dashboard";
import type {
  MacroThemeKey,
  ThemeEvent,
} from "@/src/types/dashboard";

type EventsTimelineProps = {
  events: ThemeEvent[];
  currentPage: number;
  pageSize: number;
  typeFilter: EvidenceTypeFilter;
  isLoading?: boolean;
  onTypeFilterChange: (filter: EvidenceTypeFilter) => void;
  onPageChange: (page: number) => void;
  selectedTheme: MacroThemeKey | null;
};

const EVIDENCE_TYPE_OPTIONS: Array<{
  value: EvidenceTypeFilter;
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "NEWS_ONLY", label: "News only" },
  { value: "OFFICIAL_ONLY", label: "Official only" },
];

function getEventTypeLabel(event: ThemeEvent): "Official" | "News" | "Other" {
  if (isNewsEventSourceType(event.sourceType)) {
    return "News";
  }

  if (isOfficialEventSourceType(event.sourceType)) {
    return "Official";
  }

  return "Other";
}

export function EventsTimeline({
  events,
  currentPage,
  pageSize,
  typeFilter,
  isLoading = false,
  onTypeFilterChange,
  onPageChange,
  selectedTheme,
}: EventsTimelineProps) {
  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => selectedTheme == null || event.theme === selectedTheme)
        .filter(
          (event): event is ThemeEvent & { sourceUrl: string } =>
            isValidNavigableUrl(event.sourceUrl),
        )
        .filter((event) => matchesEvidenceTypeFilter(event, typeFilter))
        .sort(
          (left, right) =>
            new Date(right.publishedAt).getTime() -
            new Date(left.publishedAt).getTime(),
        ),
    [events, selectedTheme, typeFilter],
  );

  const totalCount = filteredEvents.length;
  const officialCount = filteredEvents.filter((event) =>
    isOfficialEventSourceType(event.sourceType),
  ).length;
  const newsCount = filteredEvents.filter((event) =>
    isNewsEventSourceType(event.sourceType),
  ).length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const safePage =
    totalPages === 0 ? 1 : Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const timelineEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (safePage !== currentPage) {
      onPageChange(safePage);
    }
  }, [currentPage, onPageChange, safePage]);

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Evidence</p>
          <h2>Mixed event timeline</h2>
        </div>
        <p className="subtle">
          {selectedTheme
            ? `Relevant evidence for ${getThemeLabel(selectedTheme)}.`
            : "Latest official and news signals in one chronological feed."}
        </p>
      </div>

      {isLoading ? (
        <div className="stack">
          <div className="skeletonLine" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      ) : (
        <div className="timelinePanelBody">
          <div className="timelineFilterBar" role="tablist" aria-label="Evidence type filter">
            {EVIDENCE_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={typeFilter === option.value}
                className={`timelineFilterChip${typeFilter === option.value ? " isActive" : ""}`}
                onClick={() => onTypeFilterChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="timelineSummaryRow">
            <div className="timelineSummaryCard">
              <span>Total</span>
              <strong>{totalCount}</strong>
            </div>
            <div className="timelineSummaryCard">
              <span>Official</span>
              <strong>{officialCount}</strong>
            </div>
            <div className="timelineSummaryCard">
              <span>News</span>
              <strong>{newsCount}</strong>
            </div>
          </div>

          <div className="eventList">
            {totalCount > 0 ? timelineEvents.map((event) => {
              const typeLabel = getEventTypeLabel(event);

              return (
                <article key={event.id} className="eventCard eventCard--evidence">
                  <div className="eventCardMeta">
                    <span className="publisherBadge">{getEventSourceLabel(event)}</span>
                    <span
                      className={`typeBadge ${
                        typeLabel === "Official"
                          ? "typeBadgeOfficial"
                          : typeLabel === "News"
                            ? "typeBadgeNews"
                            : "typeBadgeOther"
                      }`}
                    >
                      {typeLabel}
                    </span>
                    <time dateTime={event.publishedAt}>
                      {formatDate(event.publishedAt)}
                    </time>
                  </div>
                  <h3 className="eventCardTitle">
                    <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                      {event.title}
                    </a>
                  </h3>
                  <a className="timelineLink" href={event.sourceUrl} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                </article>
              );
            }) : (
              <p className="emptyState">
                No linked evidence matches the current filter for{" "}
                {selectedTheme ? getThemeLabel(selectedTheme) : "the current theme"}.
              </p>
            )}
          </div>

          {totalPages > 0 ? (
            <div className="timelinePagination">
              <button
                type="button"
                className="secondaryButton timelinePaginationButton"
                onClick={() => onPageChange(Math.max(safePage - 1, 1))}
                disabled={safePage <= 1}
              >
                Previous
              </button>
              <span className="timelinePaginationStatus">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                className="secondaryButton timelinePaginationButton"
                onClick={() => onPageChange(Math.min(safePage + 1, totalPages))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
