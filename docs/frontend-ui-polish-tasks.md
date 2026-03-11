# Frontend UI Polish Brief – Macro Tracker

Project: Macro Tracker dashboard for hackathon demo.

## Goal

Polish the current dashboard so it feels more professional, readable, and finance-grade without redesigning the product concept.

Current concept to preserve:

- Bubble visualization stays on the landing/hero section only
- Clicking a bubble updates the selected theme
- The right panel shows the selected theme details
- Lower sections show evidence and supporting macro context

## Current UI issues observed

### 1. Filter/search bar issues

- Controls feel too stretched horizontally
- Spacing between label, control, and reset button is inconsistent
- Search input looks too empty and weak visually
- Filter bar does not feel like one coherent toolbar
- Region and heat-level controls should show clearer options and stronger affordance

### 2. Bubble chart issues

- Bubble area feels visually crowded
- Colors are too similar and too aggressive in orange/red
- Heat state is not immediately distinguishable enough
- Selected-theme popup overlays the chart and blocks nearby bubbles
- Bubble labels and badges feel slightly noisy
- Bubble layout needs to feel more intentional and premium

### 3. Detail panel issues

- Detail panel is readable but still feels too large and sparse in some places
- Some cards are too tall relative to the amount of information shown
- Visual hierarchy can be improved so the most important metrics stand out faster

### 4. Overall spacing and professionalism

- Some sections feel too tall or too padded
- The dashboard could use tighter spacing rhythm and more balanced card sizing
- Overall look should feel more like a polished analytics platform and less like an early prototype

---

## Design direction

### A. Filter/Search Toolbar

Improve the top controls so they look like a single professional toolbar.

#### Required changes

1. Turn the current filters into a tighter grouped toolbar
2. Give Region a clearer selectable control with obvious options
3. Improve Theme search input:
   - stronger placeholder contrast
   - proper icon alignment
   - cleaner padding
   - better width
4. Improve Heat level dropdown so options are visually clear
5. Reduce excessive horizontal spacing and oversized empty areas
6. Make Reset Filters visually secondary but still easy to reach

#### Toolbar design guidance

- Labels should align consistently above or inside controls
- Control widths should feel intentional, not stretched arbitrarily
- Inputs and selects should have consistent height
- Reset button should not visually compete with primary controls
- The entire filter row should feel like one card or one aligned strip

#### Suggested filter options

Region:

- GLOBAL
- US
- EUROPE
- ASIA
- CHINA
- EMERGING MARKETS

Heat level:

- All levels
- Heating Up
- Stable
- Cooling

---

### B. Bubble Hero Cleanup

Polish the bubble visualization while preserving the concept.

#### Required changes

1. Replace the current near-monochrome orange/red look with a meaningful heat scale:
   - Heating Up -> warm red / orange
   - Stable -> neutral blue / slate
   - Cooling -> green / teal
2. Use a more controlled palette so the chart feels premium and readable
3. Reduce visual clutter in badges and labels
4. Improve spacing between bubbles so the layout looks intentional
5. Keep labels readable without feeling oversized
6. Reduce unnecessary glow or make it subtler
7. Remove or reposition the selected-theme popup so it does not cover bubbles

#### Popup behavior fix

The selected-theme mini-popup currently overlaps the bubble area.

Preferred fixes:

- either anchor it outside the chart area
- or convert it into a subtle hover tooltip
- or move selected-theme summary fully into the right-side detail panel and remove the overlapping chart popup entirely

Preferred choice for MVP:

- remove persistent overlapping popup from the bubble chart
- keep hover tooltip only
- let the right-side detail panel be the main selected-theme summary

#### Bubble color guidance

Do not use only one hue for most bubbles.
Use three states clearly:

- Heating Up = warm
- Stable = neutral/cool
- Cooling = green/teal

Make sure the palette still works on a dark fintech dashboard.

---

### C. Detail Panel Polish

Make the selected-theme area feel denser and more executive.

#### Required changes

1. Reduce oversized empty space in cards
2. Tighten metric card heights
3. Improve hierarchy:
   - theme name
   - heat badge
   - short summary
   - key metrics
4. Keep risk implication and evidence easy to scan
5. Make the panel feel more like an insight sidebar than a stack of loose boxes

#### Guidance

- Important metrics should be visible without too much scrolling
- Avoid long paragraphs where concise summary chips or compact copy would work better
- Use smaller card heights where possible

---

### D. Global Layout Polish

Improve professionalism across the whole dashboard.

#### Required changes

1. Tighten vertical rhythm and spacing
2. Reduce unnecessarily tall sections
3. Normalize card border radius, padding, and shadows/glow
4. Keep typography strong, but reduce places where headers are oversized
5. Improve balance between hero visual and detail panel
6. Make the page look closer to a polished market intelligence product

---

## Implementation constraints

- Do not redesign the product into a different visualization type
- Do not remove the bubble hero concept
- Do not add complex graph physics
- Do not broaden scope into backend work
- Do not block on npm run build
- Validate with:
  - npx tsc --noEmit
  - npm run dev

---

## Suggested implementation approach

### Priority 1

- Fix toolbar spacing and options
- Clean bubble colors
- remove overlapping selected-theme popup from chart

### Priority 2

- Tighten detail panel spacing
- tighten card sizing
- improve hierarchy

### Priority 3

- overall polish pass on typography, spacing, and layout balance

---

## Deliverables expected from the agent

1. Updated filter/search toolbar with correct spacing and options
2. Updated bubble chart with improved heat-state color system
3. Selected-theme popup no longer blocking the chart
4. More professional spacing and card sizing across the dashboard
5. Summary of files changed
6. Validation results from:
   - npx tsc --noEmit
   - npm run dev
