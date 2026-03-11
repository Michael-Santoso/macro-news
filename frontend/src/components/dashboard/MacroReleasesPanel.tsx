"use client";

import { formatDate, formatReleaseValue } from "@/src/lib/dashboard";
import type { MacroRelease } from "@/src/types/dashboard";

type MacroReleasesPanelProps = {
  releases: MacroRelease[];
  isLoading?: boolean;
};

export function MacroReleasesPanel({
  releases,
  isLoading = false,
}: MacroReleasesPanelProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Supporting data</p>
          <h2>Macro release board</h2>
        </div>
        <p className="subtle">Recent macro prints that anchor the read.</p>
      </div>

      {isLoading ? (
        <div className="stack">
          <div className="skeletonLine" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      ) : releases.length > 0 ? (
        <div className="releasePanelBody">
          <div className="releaseSummaryBanner">
            <strong>{releases.length}</strong>
            <span>tracked macro series in the current snapshot</span>
          </div>

          <div className="releaseList">
            {releases.slice(0, 6).map((release) => (
              <article key={release.seriesId} className="releaseCard">
                <div className="releaseCardTop">
                  <div>
                    <h3>{release.label}</h3>
                    <p>{release.seriesId}</p>
                  </div>
                  {release.category ? (
                    <span className="detailMetaChip">{release.category}</span>
                  ) : null}
                </div>

                <strong>{formatReleaseValue(release)}</strong>

                <div className="releaseCardMeta">
                  <span>{formatDate(release.observationDate)}</span>
                  {release.frequency ? <span>{release.frequency}</span> : null}
                  {release.units ? <span>{release.units}</span> : null}
                </div>

                {release.description ? (
                  <p className="releaseDescription">{release.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="emptyState">No macro releases returned.</p>
      )}
    </section>
  );
}
