import type {
  MacroRelease,
  ThemeDetail,
  ThemeEvent,
} from "../../types/dashboard";
import { EventsTimeline } from "./events-timeline";
import { MacroReleasesPanel } from "./macro-releases-panel";
import { ThemeDetailPanel } from "./detail-panel";

type ThemeEvidenceStackProps = {
  theme?: ThemeDetail | null;
  events?: ThemeEvent[];
  releases?: MacroRelease[];
  detailState?: "loading" | "empty" | "error" | "success";
  eventsState?: "loading" | "empty" | "error" | "success";
  releasesState?: "loading" | "empty" | "error" | "success";
  detailError?: string;
  eventsError?: string;
  releasesError?: string;
};

export function ThemeEvidenceStack(props: ThemeEvidenceStackProps) {
  return (
    <section className="evidence-stack">
      <ThemeDetailPanel
        theme={props.theme}
        state={props.detailState}
        errorMessage={props.detailError}
      />
      <div className="evidence-grid">
        <EventsTimeline
          themeName={props.theme?.theme ?? null}
          events={props.events}
          state={props.eventsState}
          errorMessage={props.eventsError}
        />
        <MacroReleasesPanel
          releases={props.releases}
          state={props.releasesState}
          errorMessage={props.releasesError}
        />
      </div>
    </section>
  );
}
