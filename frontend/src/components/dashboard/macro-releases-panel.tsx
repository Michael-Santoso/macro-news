import type { MacroRelease } from "../../types/dashboard";

type MacroReleasesPanelProps = {
  releases?: MacroRelease[];
  state?: "loading" | "empty" | "error" | "success";
  errorMessage?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatValue(release: MacroRelease) {
  return release.units ? `${release.value} ${release.units}` : release.value;
}

export function MacroReleasesPanel({
  releases,
  state = "success",
  errorMessage,
}: MacroReleasesPanelProps) {
  if (state === "loading") {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <div className="skeleton skeleton--subtitle" />
            <div className="skeleton skeleton--line short" />
          </div>
        </div>
        <div className="release-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="release-card" key={index}>
              <div className="skeleton skeleton--label" />
              <div className="skeleton skeleton--value" />
              <div className="skeleton skeleton--line short" />
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="panel panel--error">
        <div className="panel__eyebrow">Macro releases</div>
        <h3 className="section-heading__title">Supporting releases</h3>
        <p className="panel__copy">{errorMessage ?? "Unable to load macro releases."}</p>
      </section>
    );
  }

  if (state === "empty" || !releases?.length) {
    return (
      <section className="panel panel--empty">
        <div className="panel__eyebrow">Macro releases</div>
        <h3 className="section-heading__title">Supporting releases</h3>
        <p className="panel__copy">No relevant macro releases are available for this theme.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <div className="panel__eyebrow">Macro releases</div>
          <h3 className="section-heading__title">Supporting releases</h3>
        </div>
        <span className="section-heading__meta">{releases.length} tracked</span>
      </div>
      <div className="release-list">
        {releases.map((release) => (
          <article className="release-card" key={release.key}>
            <div className="release-card__topline">
              <h4 className="release-card__title">{release.label}</h4>
              <span className="release-card__series">{release.seriesId}</span>
            </div>
            <strong className="release-card__value">{formatValue(release)}</strong>
            <div className="release-card__meta">
              <span>{formatDate(release.observationDate)}</span>
              {release.frequency ? <span>{release.frequency}</span> : null}
              {release.category ? <span>{release.category}</span> : null}
            </div>
            {release.description ? (
              <p className="release-card__description">{release.description}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
