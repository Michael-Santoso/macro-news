"use client";

import {
  formatCompactNumber,
  formatDate,
  formatSourceType,
  formatTrendDelta,
  getHeatLevelLabel,
  getThemeLabel,
} from "@/src/lib/dashboard";
import type { ThemeDetailResponse } from "@/src/types/dashboard";

type ThemeDetailPanelProps = {
  detail: ThemeDetailResponse | null;
  isLoading?: boolean;
};

export function ThemeDetailPanel({
  detail,
  isLoading = false,
}: ThemeDetailPanelProps) {
  const leadEvent = detail?.timeline.data[0] ?? null;
  const recentTrend = detail?.heatTrend.slice(-7) ?? [];
  const trendMentions = recentTrend.reduce((sum, point) => sum + point.mentions, 0);
  const trendDelta =
    recentTrend.length >= 2
      ? recentTrend[recentTrend.length - 1].mentions - recentTrend[0].mentions
      : 0;

  return (
    <aside className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Selected theme</p>
          <h2>{detail ? getThemeLabel(detail.theme.theme) : "Theme detail"}</h2>
        </div>
        {detail ? (
          <div className={`heatBadge heatBadge${detail.theme.heatLevel}`}>
            {getHeatLevelLabel(detail.theme.heatLevel)}
          </div>
        ) : (
          <p className="subtle">Choose a theme to inspect its signal stack.</p>
        )}
      </div>

      {isLoading ? (
        <div className="stack">
          <div className="skeletonLine skeletonLineTitle" />
          <div className="skeletonLine" />
          <div className="detailKpiGrid">
            <div className="statCard">
              <div className="skeletonLine" />
              <div className="skeletonLine skeletonLineTitle" />
            </div>
            <div className="statCard">
              <div className="skeletonLine" />
              <div className="skeletonLine skeletonLineTitle" />
            </div>
            <div className="statCard">
              <div className="skeletonLine" />
              <div className="skeletonLine skeletonLineTitle" />
            </div>
          </div>
          <div className="skeletonLine" />
        </div>
      ) : detail ? (
        <div className="detailPanelBody">
          <div className="detailIntro">
            <div className="detailLeadRow">
              <p className="detailLead">
                <strong>{getThemeLabel(detail.theme.theme)}</strong>
              </p>
              <p className="detailLeadSupport">
                {detail.meta.scoreRegion} coverage with{" "}
                {formatCompactNumber(detail.theme.weeklyMentions)} weekly mentions.
              </p>
            </div>
            <div className="detailMetaRow">
              <span className="detailMetaChip">
                Heat uses weekly mentions plus momentum
              </span>
              <span className="detailMetaChip">Scored from {detail.theme.scoringSource}</span>
              <span className="detailMetaChip">{detail.timeline.pagination.total} linked events</span>
              <span className="detailMetaChip">Updated {formatDate(detail.theme.updatedAt)}</span>
            </div>
          </div>

          <div className="detailKpiGrid">
            <div className="statCard">
              <span>Momentum score</span>
              <strong>{detail.theme.momentumScore.toFixed(1)}</strong>
            </div>
            <div className="statCard">
              <span>Weekly mentions</span>
              <strong>{formatCompactNumber(detail.theme.weeklyMentions)}</strong>
            </div>
            <div className="statCard">
              <span>30-day mentions</span>
              <strong>{formatCompactNumber(detail.theme.monthlyMentions)}</strong>
            </div>
            <div className="statCard">
              <span>7-day trend</span>
              <strong>{formatTrendDelta(trendDelta)}</strong>
            </div>
            <div className="statCard">
              <span>Daily mentions</span>
              <strong>{formatCompactNumber(detail.theme.dailyMentions)}</strong>
            </div>
            <div className="statCard">
              <span>Recent 7-day total</span>
              <strong>{formatCompactNumber(trendMentions)}</strong>
            </div>
          </div>

          <div className="detailSection">
            <div className="sectionIntro">
              <div>
                <p className="eyebrow">Heat trend</p>
                <h3>Recent mention pattern</h3>
              </div>
              <p className="subtle">Last 12 daily observations.</p>
            </div>
            <div className="miniTrendChart" aria-label="Theme heat trend">
              {detail.heatTrend.slice(-12).map((point) => (
                <div key={point.date} className="miniTrendBarWrap">
                  <span
                    className="miniTrendBar"
                    style={{ height: `${Math.max(point.mentions * 12, 14)}px` }}
                    title={`${point.date}: ${point.mentions} mentions`}
                  />
                  <small>{point.date.slice(5)}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="detailSection detailSectionEvidence">
            <div className="sectionIntro">
              <div>
                <p className="eyebrow">Lead evidence</p>
                <h3>Why this theme is active</h3>
              </div>
              <p className="subtle">Top event driving the current read.</p>
            </div>

            {leadEvent ? (
              <article className="evidenceCallout">
                <div className="evidenceMetaRow">
                  <span className="detailMetaChip">{formatSourceType(leadEvent.sourceType)}</span>
                  {leadEvent.assetClass ? (
                    <span className="detailMetaChip">{leadEvent.assetClass}</span>
                  ) : null}
                  <span className="detailMetaChip">
                    Impact {leadEvent.impactScore.toFixed(0)}
                  </span>
                  <span className="detailMetaChip">{formatDate(leadEvent.publishedAt)}</span>
                </div>
                <h4>{leadEvent.title}</h4>
                <p>{leadEvent.summary}</p>
                <p className="riskCallout">{leadEvent.riskImplication}</p>
                {leadEvent.sourceUrl ? (
                  <a href={leadEvent.sourceUrl} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                ) : null}
              </article>
            ) : (
              <p className="emptyState">No event evidence is attached to this theme yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="emptyState">Select a theme to populate the detail panel.</p>
      )}
    </aside>
  );
}
