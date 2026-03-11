"use client";

import {
  formatDate,
  formatSourceType,
  getThemeLabel,
} from "@/src/lib/dashboard";
import type { MacroThemeKey, ThemeEvent } from "@/src/types/dashboard";

type EventsTimelineProps = {
  events: ThemeEvent[];
  selectedTheme: MacroThemeKey | null;
  isLoading?: boolean;
};

export function EventsTimeline({
  events,
  selectedTheme,
  isLoading = false,
}: EventsTimelineProps) {
  const leadEvent = events[0] ?? null;
  const averageImpact =
    events.length > 0
      ? events.reduce((sum, event) => sum + event.impactScore, 0) / events.length
      : 0;

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Evidence</p>
          <h2>Event timeline</h2>
        </div>
        <p className="subtle">
          Latest linked signals for{" "}
          {selectedTheme ? getThemeLabel(selectedTheme) : "the current selection"}.
        </p>
      </div>

      {isLoading ? (
        <div className="stack">
          <div className="skeletonLine" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      ) : events.length > 0 ? (
        <div className="timelinePanelBody">
          <div className="timelineSummaryRow">
            <div className="timelineSummaryCard">
              <span>Events loaded</span>
              <strong>{events.length}</strong>
            </div>
            <div className="timelineSummaryCard">
              <span>Lead source</span>
              <strong>
                {formatSourceType(leadEvent?.sourceType ?? "RAW_ARTICLE")}
              </strong>
            </div>
            <div className="timelineSummaryCard">
              <span>Avg impact</span>
              <strong>{averageImpact.toFixed(0)}</strong>
            </div>
          </div>

          <div className="timelineScroller" aria-label="Scrollable event timeline">
            <div className="timelineList">
              {events.map((event) => (
                <article key={event.id} className="timelineItem">
                  <div className="timelineRail">
                    <span className="timelineDot" />
                  </div>
                  <div className="timelineContent">
                    <div className="timelineTopRow">
                      <time
                        className="timelineDate"
                        dateTime={event.publishedAt}
                      >
                        {formatDate(event.publishedAt)}
                      </time>
                      {event.sourceUrl ? (
                        <a
                          className="timelineSourceButton"
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open source for ${event.title}`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                          >
                            <path
                              d="M8 4h8v8m0-8-9 9M5 8v7h7"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      ) : null}
                    </div>
                    <div className="timelineMetaRow">
                      <span>{formatSourceType(event.sourceType)}</span>
                      <span>{getThemeLabel(event.theme)}</span>
                      {event.assetClass ? <span>{event.assetClass}</span> : null}
                      <span className="impactPill">
                        Impact {event.impactScore.toFixed(0)}
                      </span>
                    </div>
                    <h3>{event.title}</h3>
                    <p className="timelineRisk">
                      <span>Risk</span>
                      {event.riskImplication}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="emptyState">
          No events available for{" "}
          {selectedTheme
            ? getThemeLabel(selectedTheme)
            : "the current selection"}
          .
        </p>
      )}
    </section>
  );
}
