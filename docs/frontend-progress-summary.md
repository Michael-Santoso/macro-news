# Frontend Progress Summary For ChatGPT

Date: 2026-03-11

This document summarizes the current state of the `frontend/` app in `d:\Coding\macro-news`, what each frontend agent appears to have done, what is actually working in code now, what is still incomplete, and what issues were discovered during validation.

The goal is to give another model enough context to analyze the frontend accurately without having to reconstruct the repo state from scratch.

## 1. Project Intent

The frontend is a Next.js + TypeScript dashboard for a "Macro Tracker" demo.

Intended UX:

1. Top filter bar
2. Bubble-based discovery hero
3. Selected-theme detail panel
4. Lower evidence section with events timeline and macro releases

Design constraints from the project docs:

- Bubble visualization is only the hero/landing section
- The rest of the UI should be structured and evidence-driven
- The UI should feel modern, fintech-like, readable, and demo-friendly
- Shared types and API logic should be centralized
- Page-level state should be lifted and explicit

## 2. Current Frontend Stack

From `frontend/package.json`:

- Next.js `^15.5.0`
- React `^19.1.0`
- React DOM `^19.1.0`
- TypeScript `^5.9.2`

Scripts:

- `npm run dev` -> `next dev -p 3001`
- `npm run build` -> `next build`
- `npm run start` -> `next start -p 3001`

Notable gap:

- There is currently no `lint` script in `frontend/package.json`

## 3. Current App Structure

### Active app routes

- `frontend/app/page.tsx`
  - renders the main dashboard via `DashboardPage`
- `frontend/app/layout.tsx`
  - sets metadata and loads `globals.css`
- `frontend/app/theme-detail-preview/page.tsx`
  - currently reduced to a placeholder page and intentionally does not import the old preview component stack

### Shared frontend infrastructure

- `frontend/src/types/dashboard.ts`
  - shared dashboard API response and model types
- `frontend/src/types/macro.ts`
  - types used by the bubble hero
- `frontend/src/lib/api.ts`
  - centralized fetch helpers for:
    - `/api/v1/themes`
    - `/api/v1/themes/:theme`
    - `/api/v1/events`
    - `/api/v1/macro/releases`
- `frontend/src/lib/dashboard.ts`
  - filter defaults, label mapping, filter helpers, date formatting

### Main dashboard components in active use

- `frontend/src/components/dashboard/DashboardPage.tsx`
- `frontend/src/components/dashboard/FilterBar.tsx`
- `frontend/src/components/BubbleHero.tsx`
- `frontend/src/components/dashboard/ThemeDetailPanel.tsx`
- `frontend/src/components/dashboard/EventsTimeline.tsx`
- `frontend/src/components/dashboard/MacroReleasesPanel.tsx`

### Legacy / stale dashboard components still present but not active

These files still exist but are not part of the active page path and currently do not match the shared types:

- `frontend/src/components/dashboard/detail-panel.tsx`
- `frontend/src/components/dashboard/events-timeline.tsx`
- `frontend/src/components/dashboard/macro-releases-panel.tsx`
- `frontend/src/components/dashboard/theme-evidence-stack.tsx`

These are older lowercase variants and appear to be an abandoned or partial Agent 3 preview implementation.

## 4. Agent-By-Agent Progress

## Agent 1: Dashboard Shell, Layout, and Data Wiring

Status: largely implemented at MVP shell level

What appears completed:

- Main page route exists and renders the dashboard
- Shared page-level state is implemented in `DashboardPage.tsx`
- Centralized API helper module exists in `src/lib/api.ts`
- Centralized dashboard types exist in `src/types/dashboard.ts`
- Filter state is lifted at the page level
- Selected theme state is lifted at the page level
- The page composes:
  - `FilterBar`
  - `BubbleHero`
  - `ThemeDetailPanel`
  - `EventsTimeline`
  - `MacroReleasesPanel`
- Loading, empty, and page-level error handling exist

What Agent 1 implemented in behavior terms:

- On initial load and when region changes, the page fetches:
  - themes via `getThemes`
  - macro releases via `getMacroReleases`
- It filters themes client-side based on:
  - region
  - search term
  - heat level
- It auto-selects the first visible theme when needed
- When selected theme changes, it fetches:
  - theme details via `getThemeDetails`
  - events via `getEvents`

Current quality level:

- Solid shell and state flow
- Reasonable hook structure
- Shared types/helpers are in the right place
- The page architecture matches the planned dashboard well

Current limitations:

- The detail and lower panels are still shell-like and not fully polished
- The API assumptions depend on backend endpoints that are not all fully implemented yet
- There is a type cast on bubble selection:
  - `theme.id as MacroThemeKey`
  - this works because the mapped data uses theme keys, but the cast is still a trust boundary

## Agent 2: Bubble Hero Visualization

Status: implemented and currently the most complete/polished part of the frontend

What appears completed:

- `BubbleHero.tsx` exists and is active
- Bubble size is derived from:
  - `weeklyMentions`
  - fallback to `intensityScore`
- Bubble color reflects heat level:
  - HOT
  - STABLE
  - COOLING
- Clicking a bubble selects the theme
- Hover/focus behavior shows a tooltip
- Optional relation edges are supported when `relatedThemes` exists
- The layout uses deterministic presets and fallback placement logic
- The component is client-only and does not run browser APIs outside client boundaries

Important implementation detail:

- The bubble layout is not physics-based
- It uses predefined desktop/mobile coordinates plus a simple fallback grid-like placement
- This is good for demo stability and avoids force-graph chaos

Current quality level:

- The bubble hero is aligned with the original design intent
- It is stable, deterministic, and visually stronger than the rest of the dashboard
- It does not appear to be the current blocker

Potential limitations:

- There is no true bubble packing algorithm
- If the number of themes grows substantially, the preset/fallback layout may look crowded
- Related-theme edges require data that does not seem to be coming from current shared dashboard types yet

## Agent 3: Theme Detail Panel and Evidence Views

Status: partially implemented, split across two competing versions

There are effectively two Agent 3 tracks in the repo:

### Track A: Active uppercase components used by the dashboard

- `ThemeDetailPanel.tsx`
- `EventsTimeline.tsx`
- `MacroReleasesPanel.tsx`

These are the components currently rendered by `DashboardPage.tsx`.

What they do now:

- `ThemeDetailPanel.tsx`
  - shows selected theme label
  - shows heat, momentum, weekly mentions, updated date
  - shows a simple mini trend from `heatTrend`
  - shows loading skeleton lines
  - shows empty state when no detail is selected
- `EventsTimeline.tsx`
  - shows loading skeleton lines
  - lists up to 5 events
  - shows theme name and published date
  - shows event title and summary
  - shows empty state
- `MacroReleasesPanel.tsx`
  - shows loading skeleton lines
  - lists up to 6 macro releases
  - shows label, value, observation date
  - shows empty state

Assessment:

- These components are functional but still shell-level
- The copy inside the components explicitly says Agent 3 can replace them later
- They are suitable for MVP wiring but not for a final polished drill-down experience

### Track B: Legacy lowercase preview components

- `detail-panel.tsx`
- `events-timeline.tsx`
- `macro-releases-panel.tsx`
- `theme-evidence-stack.tsx`

These appear to be a more ambitious Agent 3 path, but they are stale and inconsistent with current shared types.

Problems with the legacy track:

- Imports non-existent types such as `ThemeDetail` and `ThemeKeyStat`
- Uses outdated enum/value conventions such as uppercase theme keys
- References fields that do not exist in current shared types
- Caused TypeScript failures
- Was previously imported by `/theme-detail-preview`

Assessment:

- This track is not safe to use in the current app state
- It should be treated as dead or experimental code until either deleted or rewritten against the shared contracts

## 5. Current State Of The Main Dashboard

The main homepage route is:

- `frontend/app/page.tsx` -> `DashboardPage`

Current runtime flow:

1. Page mounts
2. Fetches themes and macro releases
3. Filters themes client-side
4. Auto-selects a default theme when visible themes exist
5. Fetches selected theme details and events
6. Renders:
   - top filter bar
   - bubble hero
   - detail shell
   - current focus summary panel
   - events shell
   - macro releases shell

Current UX quality:

- The structure is coherent and matches the intended dashboard composition
- The top section and hero are the strongest area
- The lower sections are present but not feature-complete
- Loading and empty states exist, which is good for demo resilience

## 6. Build / Validation Investigation Summary

This is important because there was a report that multiple agents saw the frontend build hanging for a long time.

### What was checked

The validation sequence was adjusted to avoid using `npm run build` unless specifically investigating the build pipeline.

Observed validation work:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run dev`

### Results

#### TypeScript

Initial result:

- `npx tsc --noEmit` failed

The failures came from:

- `frontend/app/theme-detail-preview/page.tsx`
- `frontend/src/components/dashboard/detail-panel.tsx`
- `frontend/src/components/dashboard/events-timeline.tsx`
- `frontend/src/components/dashboard/theme-evidence-stack.tsx`
- and two nullable type issues in `DashboardPage.tsx`

#### Lint

- `npm run lint` could not run because no `lint` script exists

#### Dev mode

There were two separate findings:

1. In sandboxed execution, `next dev` failed with `spawn EPERM`
   - this looked like an environment/sandbox process restriction, not an app-code bug
2. In unrestricted dev validation, the main route `/` compiled and served
3. The preview route `/theme-detail-preview` was the path associated with the stale component graph and needed cleanup

### Most likely source of the shared frontend instability

The strongest concrete source found in code was not the bubble hero.

The real issue was the stale preview/legacy Agent 3 component path:

- the preview route imported old components
- those components no longer matched the centralized shared types
- this caused TypeScript breakage and route-level inconsistency

That made the frontend feel unstable and polluted the app graph, even though the live dashboard route itself was mostly fine.

## 7. Fixes Already Applied

The following targeted fixes were made to stabilize the frontend with the smallest safe changes.

### 1. Preview route disabled

File:

- `frontend/app/theme-detail-preview/page.tsx`

Change:

- removed the old preview stack imports
- replaced the page with a simple placeholder message

Reason:

- the preview route was the entry point for stale Agent 3 components that no longer matched the shared contracts

### 2. Nullable type issue fixed in active dashboard

File:

- `frontend/src/components/dashboard/DashboardPage.tsx`

Change:

- narrowed `selectedTheme` to a local `activeTheme` after checking for null
- used that variable for `getThemeDetails` and `getEvents`

Reason:

- `tsc` was flagging that `selectedTheme` might still be `null`

### 3. Legacy stale components excluded from TypeScript

File:

- `frontend/tsconfig.json`

Change:

- excluded:
  - `src/components/dashboard/detail-panel.tsx`
  - `src/components/dashboard/events-timeline.tsx`
  - `src/components/dashboard/macro-releases-panel.tsx`
  - `src/components/dashboard/theme-evidence-stack.tsx`

Reason:

- these files are stale, not used by the active dashboard, and do not conform to current shared types

### Validation after fixes

- `npx tsc --noEmit` passed
- unrestricted dev check on port `3002` compiled:
  - `/` -> `200`
  - `/theme-detail-preview` -> `200`

## 8. What Is Working Right Now

### Working well

- Main dashboard route exists and renders
- Shared frontend types are centralized
- Shared API helpers are centralized
- Filter bar exists and updates page state
- Bubble hero is implemented and interactive
- Theme selection drives detail/event fetching
- Detail, events, and releases panels render loading and empty states
- TypeScript passes after the stabilization changes

### Working, but still thin

- Theme detail panel
- Events timeline
- Macro releases panel

These all work as shells, but they are not yet fully realized UX components.

## 9. What Is Not Finished

### 1. Agent 3 polish and final content design

The lower dashboard sections are present but not complete:

- detail panel is still a shell
- events view is basic
- macro releases view is basic
- there is no strong visual hierarchy in the evidence section yet

### 2. Cleanup of duplicated component variants

The repo still contains two competing sets of dashboard components:

- uppercase active versions
- lowercase stale versions

This should be resolved to avoid confusion and future regressions.

### 3. Preview route strategy

The preview route now works only as a placeholder.

That is safe, but it means:

- there is no proper isolated UI playground for the detail/evidence area right now
- future preview work should be rebuilt against the shared types, not by reviving the old lowercase files

### 4. Linting / code quality tooling

The frontend currently has no `lint` script.

That means:

- there is no standard lint validation path
- code hygiene issues may slip through unless TypeScript catches them

### 5. Backend dependency risk

From `docs/backend-status.md`, the backend is still incomplete from a product API perspective.

Key backend risk to frontend:

- `/api/v1/events` is described there as currently `501 Not implemented`

This creates a major mismatch:

- the frontend assumes live working endpoints for themes, events, theme detail, and macro releases
- backend status suggests at least some of these may still be incomplete or placeholder-only

So part of the frontend may be structurally correct but blocked by backend readiness.

## 10. Main Risks / Inconsistencies Another Model Should Analyze

### Risk 1: Frontend-backend contract mismatch

The frontend now assumes a fairly complete dashboard API surface.

The backend status document says:

- `/api/v1/events` is not implemented yet

Questions to analyze:

- Are `/api/v1/themes`, `/api/v1/themes/:theme`, and `/api/v1/macro/releases` actually implemented and returning the shapes expected by `src/types/dashboard.ts`?
- Is the frontend over-modeling future backend responses instead of current responses?

### Risk 2: Dead code and duplicate component trees

There are still stale lowercase dashboard components in the repo.

Questions to analyze:

- Should they be deleted completely?
- Is there anything worth salvaging from them into the active uppercase components?

### Risk 3: Incomplete Agent 3 delivery

The detail/evidence section is currently only partially delivered.

Questions to analyze:

- What is the smallest path to turn the shell panels into a polished demo?
- Should the lower section become tabs, cards, or remain stacked panels?

### Risk 4: Validation gap

There is no lint script, and build validation was intentionally avoided except when specifically investigating the build pipeline.

Questions to analyze:

- Should ESLint be added now or postponed until after the MVP UI is stable?
- Are there any Next.js app-router issues that would only appear in `next build` but not `next dev`?

### Risk 5: BubbleHero data model assumptions

`BubbleHero` supports related-theme edges, but the active theme summary types do not currently expose `relatedThemes`.

Questions to analyze:

- Is edge rendering actually dead code for the current API?
- Should the bubble hero stay simpler for MVP and drop edge support unless backend relation data is real?

## 11. Practical Summary

If another model needs the shortest accurate picture:

- Agent 1 successfully built the dashboard shell, shared types, shared API helpers, lifted state, and page composition.
- Agent 2 successfully built the bubble hero and it is the strongest completed frontend component.
- Agent 3 work is split:
  - active uppercase components provide working shell panels
  - stale lowercase components are broken against current shared types
- the main dashboard route is structurally working
- the preview route was destabilizing the app graph and has been reduced to a safe placeholder
- TypeScript is now passing
- there is no lint script
- the biggest remaining frontend work is finishing the detail/evidence experience and cleaning up dead duplicate components
- the biggest system-level risk is mismatch between frontend expectations and backend API readiness

## 12. Recommended Next Actions

If continuing frontend work, the most sensible order is:

1. Decide whether to delete or rewrite the stale lowercase Agent 3 files
2. Keep only one dashboard component path
3. Confirm actual backend response shapes against the shared frontend types
4. Finish the active uppercase `ThemeDetailPanel`, `EventsTimeline`, and `MacroReleasesPanel`
5. Add a `lint` script once the active component tree is stabilized
6. Re-run `next build` only when specifically validating the build pipeline again

