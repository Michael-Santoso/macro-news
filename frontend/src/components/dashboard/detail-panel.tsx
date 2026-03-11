import type { ThemeDetail, ThemeKeyStat } from "../../types/dashboard";

type ThemeDetailPanelProps = {
  theme?: ThemeDetail | null;
  state?: "loading" | "empty" | "error" | "success";
  errorMessage?: string;
};

const heatLevelText: Record<ThemeDetail["heatLevel"], string> = {
  HOT: "Hot",
  STABLE: "Stable",
  COOLING: "Cooling",
};

function formatThemeName(value: string) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function defaultStats(theme: ThemeDetail): ThemeKeyStat[] {
  return [
    { label: "Daily mentions", value: `${theme.dailyMentions ?? 0}` },
    { label: "Weekly mentions", value: `${theme.weeklyMentions ?? 0}` },
    { label: "Monthly mentions", value: `${theme.monthlyMentions ?? 0}` },
    { label: "Updated", value: formatTimestamp(theme.updatedAt) },
  ];
}

export function ThemeDetailPanel({
  theme,
  state = "success",
  errorMessage,
}: ThemeDetailPanelProps) {
  if (state === "loading") {
    return (
      <section className="panel">
        <div className="panel__header">
          <div>
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--badge" />
          </div>
          <div className="skeleton skeleton--metric" />
        </div>
        <div className="panel__body">
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line short" />
          <div className="stats-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="stat-card stat-card--skeleton" key={index}>
                <div className="skeleton skeleton--label" />
                <div className="skeleton skeleton--value" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="panel panel--error">
        <div className="panel__eyebrow">Selected theme</div>
        <h2 className="panel__title">Unable to load theme details</h2>
        <p className="panel__copy">{errorMessage ?? "Try reloading the theme data."}</p>
      </section>
    );
  }

  if (state === "empty" || !theme) {
    return (
      <section className="panel panel--empty">
        <div className="panel__eyebrow">Selected theme</div>
        <h2 className="panel__title">Select a theme to inspect</h2>
        <p className="panel__copy">
          Choose a macro theme from the discovery view to see its momentum, risk,
          and supporting evidence.
        </p>
      </section>
    );
  }

  const stats = theme.keyStats?.length ? theme.keyStats : defaultStats(theme);

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <div className="panel__eyebrow">Selected theme</div>
          <div className="title-row">
            <h2 className="panel__title">{formatThemeName(theme.theme)}</h2>
            <span className={`heat-badge heat-badge--${theme.heatLevel.toLowerCase()}`}>
              {heatLevelText[theme.heatLevel]}
            </span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-card__label">Momentum score</span>
          <strong className="metric-card__value">{theme.momentumScore.toFixed(1)}</strong>
        </div>
      </div>

      <div className="panel__body">
        <div className="copy-block">
          <span className="copy-block__label">Summary</span>
          <p className="panel__copy">{theme.summary}</p>
        </div>
        <div className="copy-block copy-block--risk">
          <span className="copy-block__label">Risk implication</span>
          <p className="panel__copy">{theme.riskImplication}</p>
        </div>
        <div className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span className="stat-card__label">{stat.label}</span>
              <strong className={`stat-card__value${stat.tone ? ` stat-card__value--${stat.tone}` : ""}`}>
                {stat.value}
              </strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
