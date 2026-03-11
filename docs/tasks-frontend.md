# Macro Tracker Frontend – Task Assignment

Project:
Wealth Wellness Hub – Macro Tracker (Question 2)

Frontend Goal:
Build a dashboard that helps users quickly discover which macro themes are heating up or cooling down, then drill into details, timelines, and evidence.

Backend Endpoints Available:

- GET /api/v1/events
- GET /api/v1/themes
- GET /api/v1/themes/:theme
- GET /api/v1/macro/releases

Product Direction:

- Bubble UI is only for the landing/hero discovery section
- Bubble size reflects hotness / weekly mentions / score
- Bubble click opens a detail panel
- Optional edges only if there is meaningful related-theme data
- The rest of the dashboard should be clean, readable, and evidence-driven

Primary UX Structure:

1. Top filter bar
2. Hero bubble discovery section
3. Right-side selected theme detail panel
4. Lower evidence section with timeline/events and macro releases

Do Not:

- Build a chaotic force-directed graph with too many edges
- Make the bubble chart the only UI
- Add unnecessary animation that harms readability
- Hardcode backend response shapes if shared types can be created

Suggested Tech Direction:

- Next.js frontend
- TypeScript
- Component-based architecture
- Keep design modern, fintech-like, and readable
- Prefer simple, stable layouts over overly experimental ones

---

## Shared UX Rules

- Bubble size should represent current theme intensity
- Bubble color should represent heat level:
  - HOT
  - STABLE
  - COOLING
- Clicking a bubble should set the selected theme globally on the page
- Selected theme should update:
  - detail panel
  - timeline/events section
  - related evidence section
- Use loading skeletons where helpful
- Handle empty states clearly
- Keep the UI demo-friendly and visually strong

---

## Agent 1 — Dashboard Shell, Layout, and Data Wiring

Objective:
Build the overall dashboard page and connect frontend state to backend APIs.

Tasks:

1. Create the main dashboard page layout
2. Add top filter bar
   - region
   - theme search/select if useful
   - heat level filter if useful
3. Create shared API client/helpers for:
   - /api/v1/themes
   - /api/v1/themes/:theme
   - /api/v1/events
   - /api/v1/macro/releases
4. Create shared frontend types for theme/event/macro release data
5. Manage selected theme state
6. Compose the page using:
   - BubbleHero
   - ThemeDetailPanel
   - EventsTimeline
   - MacroReleasesPanel
7. Add loading/error/empty page-level handling

Deliverable:
A working dashboard page shell that wires all subcomponents together cleanly.

---

## Agent 2 — Bubble Hero Visualization

Objective:
Build the landing bubble-based discovery visualization.

Tasks:

1. Create BubbleHero component
2. Render themes as bubbles
3. Map:
   - bubble size -> weeklyMentions or intensity score
   - bubble color -> heatLevel
4. Support:
   - hover tooltip
   - click to select theme
5. Keep layout readable and stable
6. Optional:
   - show only strongest edges if related-theme data exists
   - otherwise show no edges
7. Make it responsive enough for demo use
8. Add polished but restrained animation

Important:

- Prioritize readability over visual complexity
- Avoid messy graph physics unless already easy to maintain
- Stable bubble packing/grid-like arrangement is preferred over chaotic movement

Deliverable:
A visually strong landing bubble visualization that acts as the dashboard entry point.

---

## Agent 3 — Theme Detail Panel and Evidence Views

Objective:
Build the drill-down experience after a theme is selected.

Tasks:

1. Create ThemeDetailPanel
   Show:
   - theme name
   -
   - momentum score
   - summary
   - risk implication
   - basic stats
2. Create EventsTimeline or EventsList
   Show:
   - recent theme events
   - title
   - publishedAt
   - source
   - summary
   - source link
3. Create MacroReleasesPanel
   Show:
   - latest macro releases
   - series name
   - latest value/date if available
4. Add empty/loading/error states
5. Ensure selected theme updates detail content correctly

Deliverable:
A clean, evidence-driven drill-down panel and lower dashboard information views.

---

## MVP Completion Criteria

The frontend should:

1. Display a bubble-based landing view of macro themes
2. Clearly show which themes are hot, stable, or cooling
3. Let the user click a bubble to inspect a theme
4. Show timeline/events evidence for the selected theme
5. Show supporting macro release information
6. Feel polished enough for a hackathon demo

---

## Not Required for MVP

- Advanced graph analytics
- Full relation network engine
- Drag-and-drop node interactions
- Complex personalization
- Perfect mobile optimization
