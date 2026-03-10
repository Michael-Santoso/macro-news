# Macro Tracker Backend – Task Assignment

Project: Wealth Wellness Hub – Macro Tracker (Question 2)

Goal:
Transform ingested macroeconomic data (news, macro releases, central bank speeches, regulatory announcements) into structured macro themes, events, and signals that can power a macro intelligence dashboard.

Current Status:

- Ingestion pipelines exist for:
  - Financial news
  - FRED macroeconomic series
  - Central bank announcements
  - Regulatory announcements
- Source tables exist but **post-ingestion intelligence layer is missing**

Target MVP Capabilities:

- Convert raw sources into **macro themes and events**
- Track **hot vs cooling themes**
- Connect **macro data releases with narratives**
- Provide **API endpoints for dashboard visualization**

---

# Agent 1 — Theme Extraction & Event Processing

Objective:
Transform ingested raw content into structured macro themes and events.

Input Tables:

- RawArticle
- OfficialAnnouncement
- RegulatoryAnnouncement
- MacroObservation

Tasks:

1. Create Macro Theme Taxonomy

Create a fixed set of macro themes:

- inflation
- interest_rates
- recession_growth
- labor_market
- liquidity_credit
- energy_oil
- china_growth
- trade_policy
- financial_regulation

2. Implement Theme Classifier

Create a simple rules-based classifier that:

- scans title + content
- assigns one or more macro themes

Use keyword matching.

Example:

inflation:

- inflation
- CPI
- price pressure

interest_rates:

- interest rate
- Fed hike
- tightening
- rate cuts

3. Create Event Model

Create a new model:

ThemeEvent

Fields:

- id
- theme
- title
- summary
- region
- assetClass
- sourceType
- sourceUrl
- publishedAt
- riskImplication
- createdAt

4. Build Processing Script

Create worker:

process_sources.ts

Logic:

- find records with processingStatus = PENDING
- classify theme
- generate short summary
- generate simple risk implication
- insert ThemeEvent
- mark source row as PROCESSED

5. Summary Generation

Generate 2–3 sentence summary using:

- article title
- first paragraph

6. Risk Implication

Generate simple heuristic risk tags:

Examples:

inflation rising →
risk: higher interest rates

bank regulation →
risk: financial sector pressure

---

# Agent 2 — Macro Signals & Theme Heat Scoring

Objective:
Determine which macro themes are heating up or cooling down.

Tasks:

1. Theme Mention Aggregation

Compute counts of ThemeEvents by:

- theme
- day
- region

2. Create ThemeScore Table

Fields:

- theme
- region
- dailyMentions
- weeklyMentions
- monthlyMentions
- momentumScore
- heatLevel
- updatedAt

3. Momentum Score

Compute:

momentum = weeklyMentions - previousWeekMentions

4. Heat Level Classification

Rules:

HOT:
weeklyMentions > threshold
AND momentum > 0

COOLING:
momentum < 0

STABLE:
otherwise

5. Connect MacroObservation Signals

Use FRED observations.

Examples:

CPI increase →
inflation theme score +

Unemployment spike →
labor_market score +

6. Scheduled Job

Create job:

update_theme_scores.ts

Runs every 6 hours.

---

# Agent 3 — API Layer for Macro Dashboard

Objective:
Expose backend intelligence to frontend dashboard.

Tasks:

1. Implement GET /api/v1/events

Filters:

- theme
- region
- fromDate
- toDate
- assetClass

Return:

- title
- theme
- region
- summary
- riskImplication
- sourceUrl
- publishedAt

2. Implement GET /api/v1/themes

Return:

- theme
- heatLevel
- weeklyMentions
- momentumScore

3. Implement GET /api/v1/themes/{theme}

Return:

- theme details
- historical event timeline
- heat trend

4. Implement GET /api/v1/macro/releases

Return:

- latest macro data releases
- CPI
- unemployment
- interest rates

5. Add Pagination

Events endpoint:

?page=1
?limit=20

6. Add Sorting

Sort by:

- newest
- most impactful

---

# MVP Completion Criteria

Backend must be able to:

1. Convert raw articles into ThemeEvents
2. Detect hot/cooling macro themes
3. Track macro releases
4. Provide API endpoints for frontend
5. Show event timeline with sources

---

# Not Required for MVP

- Machine learning models
- Perfect NLP
- Complex entity extraction
- Full knowledge graph

Simple rules-based logic is sufficient.
