import type { ThemeEvent } from "../../types/dashboard";

type EventsTimelineProps = {
  themeName?: string | null;
  events?: ThemeEvent[];
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

function inferSourceLabel(event: ThemeEvent) {
  return event.source ?? event.sourceType?.replaceAll("_", " ") ?? "Source";
}

export function EventsTimeline({
  themeName,
  events,
  state = "success",
  errorMessage,
}: EventsTimelineProps) {
  if (state === "loading") {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <div className="skeleton skeleton--subtitle" />
            <div className="skeleton skeleton--line short" />
          </div>
        </div>
        <div className="timeline-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="timeline-item timeline-item--skeleton" key={index}>
              <div className="skeleton skeleton--dot" />
              <div className="timeline-item__content">
                <div className="skeleton skeleton--label" />
                <div className="skeleton skeleton--line" />
                <div className="skeleton skeleton--line short" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="panel panel--error">
        <div className="section-heading">
          <div>
            <div className="panel__eyebrow">Evidence timeline</div>
            <h3 className="section-heading__title">Recent related events</h3>
          </div>
        </div>
        <p className="panel__copy">{errorMessage ?? "Unable to load event evidence."}</p>
      </section>
    );
  }

  if (state === "empty" || !events?.length) {
    return (
      <section className="panel panel--empty">
        <div className="section-heading">
          <div>
            <div className="panel__eyebrow">Evidence timeline</div>
            <h3 className="section-heading__title">Recent related events</h3>
          </div>
        </div>
        <p className="panel__copy">
          No recent events were found{themeName ? ` for ${themeName}` : ""}.
        </p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <div className="panel__eyebrow">Evidence timeline</div>
          <h3 className="section-heading__title">Recent related events</h3>
        </div>
        <span className="section-heading__meta">{events.length} items</span>
      </div>
      <div className="timeline-list">
        {events.map((event) => (
          <article className="timeline-item" key={event.id}>
            <div className="timeline-item__rail">
              <span className="timeline-item__dot" />
            </div>
            <div className="timeline-item__content">
              <div className="timeline-item__meta">
                <time dateTime={event.publishedAt}>{formatDate(event.publishedAt)}</time>
                <span>{inferSourceLabel(event)}</span>
                {event.assetClass ? <span>{event.assetClass}</span> : null}
              </div>
              <h4 className="timeline-item__title">{event.title}</h4>
              <p className="timeline-item__summary">{event.summary}</p>
              {event.riskImplication ? (
                <p className="timeline-item__risk">
                  <span>Risk</span> {event.riskImplication}
                </p>
              ) : null}
              {event.sourceUrl ? (
                <a
                  className="timeline-item__link"
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open source
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
