# Backend Status

## Scope

This document summarizes the current backend state in `backend/`, with focus on:

- external fetching
- normalization and enrichment
- database writes
- queue publishing
- scheduling and manual runners
- what exists but is not fully wired yet

Date of review: 2026-03-11

## High-Level State

The backend is currently an ingestion-oriented service with a minimal API layer.

What is actively implemented:

- scheduled and manual ingestion for news, macro data, central bank announcements, and regulatory announcements
- persistence to Postgres through Prisma
- optional publishing of follow-up jobs to a Cloudflare Queue after successful inserts or updates
- health endpoints

What is not implemented yet:

- queue consumers / downstream processors for any published queue message
- event extraction pipeline from `RawArticle` into `Event` and `Entity`
- meaningful `/api/v1/events` API behavior

Net result: the backend can fetch and store source material, and it can emit queue messages for later processing, but the later processing stage is not present in this repo.

## Runtime Entry Points

### Server startup

`src/index.ts` calls `startServer()` from `src/server.ts`.

On startup the server:

1. connects Prisma to the database
2. creates the scheduler
3. starts all scheduled ingestion loops
4. starts the Express server
5. registers SIGINT/SIGTERM shutdown hooks

### Express app

The API surface is small:

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/v1/events`

Current behavior:

- health endpoints work
- `/api/v1/events` returns `501 Not implemented`

## Environment and Controls

### Required env

- `DATABASE_URL`

### Optional env used by ingestion

- `DIRECT_URL`
- `PORT`
- `NODE_ENV`
- `NEWS_API_KEY`
- `FRED_API_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_QUEUE_ID`
- `NEWS_INGESTION_INTERVAL_MS`
- `FRED_INGESTION_INTERVAL_MS`
- `OFFICIAL_ANNOUNCEMENT_INGESTION_INTERVAL_MS`
- `REGULATORY_INGESTION_INTERVAL_MS`

Important behavior:

- NewsAPI ingestion runs only when `NEWS_API_KEY` exists.
- FRED scheduled ingestion runs only when `FRED_API_KEY` exists.
- Queue publishing is silently skipped when Cloudflare queue env vars are missing.
- Official announcement and regulatory ingestion always attempt to run on schedule.

## Scheduler and Jobs

The scheduler starts four loops:

- news ingestion
- macro ingestion
- official announcement ingestion
- regulatory ingestion

Each loop:

- runs immediately once at scheduler start
- then runs on `setInterval`
- is guarded by an in-memory `is...JobRunning` flag to prevent overlapping runs inside one process

There is no distributed lock. If multiple backend instances run at once, each instance can perform the same scheduled ingestion.

Manual runners also exist:

- `npm run ingest:newsapi`
- `npm run ingest:macro`
- `npm run ingest:fed`
- `npm run ingest:announcements`
- `npm run ingest:regulatory`
- `npm run sync:fred-catalog`

## Database Model Status

### Tables actively written by ingestion

- `RawArticle`
- `MacroObservation`
- `MacroObservationCatalog`
- `OfficialAnnouncement`
- `RegulatoryAnnouncement`

### Tables present but not currently populated by implemented logic

- `Event`
- `Entity`

### Processing status usage

`RawArticle`, `OfficialAnnouncement`, and `RegulatoryAnnouncement` have `processingStatus`:

- `PENDING`
- `PROCESSING`
- `PROCESSED`
- `FAILED`

Current actual behavior:

- new rows default to `PENDING`
- updated official/regulatory rows are reset to `PENDING`
- nothing in this repo transitions rows beyond that

So `processingStatus` is provisioned for later async work, but that worker path is missing.

## Queue Layer

Queue publishing lives in `src/services/queue/cloudflare-queue.client.ts`.

Supported message types:

- `process_raw_article`
- `process_macro_observation`
- `process_official_announcement`
- `process_regulatory_announcement`

Behavior:

- sends one HTTP POST per item to Cloudflare Queues API
- requires account ID, API token, and queue ID
- if queue config is missing, publish functions return immediately without error
- if queue publish fails, the ingestion continues and only logs the error

Important implication:

- database persistence is the primary success path
- queueing is best-effort only
- there is no retry, dead-letter handling, or local fallback in this repo

## Pipeline 1: News Ingestion

### Sources

News ingestion uses up to three sources:

1. NewsAPI
2. GDELT Doc API in RSS archive mode
3. RSS feeds, currently only CNBC by default

### Job behavior

`runNewsIngestionJob()`:

- tries NewsAPI if configured
- always tries GDELT
- always tries RSS
- logs per-source success/error summaries
- throws only if all sources fail

This means partial success is acceptable.

### NewsAPI flow

Client: `src/services/ingestion/newsapi.client.ts`

Behavior:

- calls `https://newsapi.org/v2/everything`
- query string is a broad macro/markets keyword search
- language is fixed to English
- sort is `publishedAt`
- page size is `50`

Normalization:

- `normalizeNewsApiArticles()` drops items missing `title`, `url`, or parseable `publishedAt`
- maps the payload to `NormalizedRawArticle`

Persistence:

- `storeRawArticles()` deduplicates in-memory by URL
- preloads existing `RawArticle.url` values for the batch
- inserts only URLs not already in DB
- each successful insert publishes `process_raw_article`

### GDELT flow

Client: `src/services/ingestion/gdelt.client.ts`

Behavior:

- calls GDELT Doc API with macro-related query terms
- requests `mode=artlist`, `format=rssarchive`, `timespan=24h`, `maxrecords=50`
- parses the returned RSS-like XML via the RSS parser

Enrichment:

- for each article URL it attempts `fetchArticleMetadata()`
- this fetches the actual article page and extracts meta description/author
- `content` is currently set to the description, not full article body

Persistence:

- normalized through `normalizeRssArticles()`
- stored through the same `storeRawArticles()` path
- queue publish is identical to NewsAPI flow

### RSS flow

Client: `src/services/ingestion/rss.client.ts`

Current configured feed list:

- CNBC RSS feed only

Behavior:

- fetches RSS/Atom XML
- parses `<item>` or `<entry>` blocks with regex-based extraction
- extracts title, link, description/content, author, and published date
- `fetchArticlesFromRssFeeds()` uses `Promise.allSettled`, so one broken feed does not fail the whole RSS batch

Persistence:

- normalized via `normalizeRssArticles()`
- stored via `storeRawArticles()`
- each inserted row can emit a queue message

### RawArticle write semantics

For news, a stored row contains:

- source
- title
- url
- optional description/content/author
- publishedAt
- fetchedAt defaulted by DB
- processingStatus defaulted to `PENDING`

Important current limitation:

- once an article URL already exists, there is no update path
- improved metadata from a later source run will not refresh the row

## Pipeline 2: Macro / FRED Ingestion

### Source

Macro ingestion uses the FRED API.

Implemented endpoints:

- `fred/series/observations`
- `fred/series`

### Default series set

The backend has a fixed default list of 24 FRED series covering:

- inflation
- rates and liquidity
- labor
- growth
- credit
- recession regime

### Ingestion flow

`ingestDefaultFredSeries()`:

1. fetches the latest observation for each default series
2. flattens snapshots into normalized observations
3. stores them one by one
4. publishes queue messages for changed or new observations

### Observation normalization

`storeFredSeriesSnapshots()`:

- converts `YYYY-MM-DD` to UTC midnight dates
- drops invalid dates
- drops blank values and `"."`

### DB write behavior

The macro repository uses raw SQL instead of standard Prisma model methods.

Per observation it:

1. queries for an existing row by `(seriesId, observationDate)`
2. inserts a new row if none exists
3. updates the row if the value changed
4. skips if the value is unchanged

This means `stored` counts include both inserts and value updates.

### Queue behavior

For each inserted or updated observation, it publishes `process_macro_observation` with:

- observation row id
- series id
- observation date
- value

### Catalog sync

`sync-fred-series-catalog.ts` is a separate manual script.

It:

- fetches metadata for each default FRED series
- assigns a hardcoded category map
- upserts into `MacroObservationCatalog`

This catalog sync is not part of the scheduler. It must be run separately.

## Pipeline 3: Official Central Bank Announcements

### Sources

Implemented institutions:

- Federal Reserve
- European Central Bank
- Bank of England
- Bank of Japan
- People's Bank of China

### High-level flow

`ingestOfficialAnnouncements()`:

- fetches all institution sources in parallel with `Promise.allSettled`
- keeps successful source results
- logs failed sources and continues
- stores all returned documents through one repository

### Common document shape

All official announcements are normalized into:

- institution
- region
- documentType
- externalKey
- title
- url
- pdfUrl
- sourceFeed
- speaker
- publishedAt
- meetingDate
- description
- content
- contentHash

### Common enrichment helpers

Utility behavior includes:

- retrying fetches up to 3 attempts
- 20 second timeout per attempt
- HTML cleaning
- feed parsing
- body text extraction from preferred page sections
- first-PDF-link extraction
- SHA-256 content hashing

### Federal Reserve

Implemented flows:

- FOMC calendar scraping for meetings, minutes, and projections
- Powell speeches from a dedicated RSS feed

Details:

- parses meeting dates from the FOMC calendar HTML
- extracts minutes/projections links by regex
- builds meeting-linked documents with derived titles and dates
- scrapes each speech page for description/content/PDF link

Notable behavior:

- minutes/projections can exist with HTML URL, PDF URL, or generated fallback key
- meeting date is inferred from the date embedded in the calendar links

### European Central Bank

Sources:

- press RSS feed
- operations RSS feed

Classification is heuristic based on title and URL. Supported document types include:

- rate decisions
- press conference transcripts
- minutes
- asset purchase program items
- speeches

Each entry fetches the full page for summary/content/pdf enrichment.

### Bank of England

Sources:

- news RSS feed
- speeches RSS feed

Classification is heuristic based on title and URL. Supported types include:

- rate decisions
- monetary policy reports
- speeches

Each kept item fetches the linked page for enrichment.

### Bank of Japan

Source:

- BOJ "what's new" RSS feed

Classification supports:

- monetary policy statements
- monetary policy reports
- speeches

Each kept entry fetches page details.

### People's Bank of China

Source approach is HTML crawling, not RSS.

Behavior:

- starts from three hardcoded English-language source pages
- extracts candidate links
- keeps only PBOC English pages ending in `/index.html`
- caps candidate pages to 40 unique links
- fetches each page and classifies by title/URL text

Supported types include:

- reserve requirement ratio
- liquidity operation
- property support
- monetary policy statement
- speech

Important caveats:

- `publishedAt` is extracted by simple date regex from HTML, otherwise defaults to `new Date()`
- source feed attribution is inferred from URL prefix and may be approximate
- this source is the most heuristic and likely the most fragile of the central bank ingestors

### OfficialAnnouncement repository behavior

Repository: `src/services/central-bank/central-bank-document.repository.ts`

Write semantics:

- deduplicates incoming batch by `externalKey`
- loads existing DB rows by `externalKey`
- inserts if missing
- updates if any tracked field changed
- resets `processingStatus` to `PENDING` on update
- skips unchanged rows

Queue behavior:

- publishes `process_official_announcement` for both newly inserted and updated rows
- queue payload does not include content or hash, only key metadata

Migration handling:

- the job catches Prisma `P2021`
- if the `OfficialAnnouncement` table is missing, the run is skipped with a clear log message

## Pipeline 4: Regulatory Announcements

### Sources

Implemented regulatory sources:

- SEC press releases RSS
- SEC speeches RSS
- FCA sitemap crawling
- WTO latest news RSS
- BIS federal register notices HTML page

Note: the Prisma enum includes `MAS`, `ESMA`, and `EUROPEAN_COMMISSION`, but there are no source fetchers for them yet.

### High-level flow

`ingestRegulatoryAnnouncements()`:

- calls `fetchRegulatoryAnnouncements()`
- stores all announcements through the repository

`fetchRegulatoryAnnouncements()`:

- runs each source fetcher in parallel with `Promise.allSettled`
- keeps successful results
- logs failures
- deduplicates by `externalKey`

### SEC

Behavior:

- fetches press and speech RSS feeds
- parses entries
- fetches each article page for summary/content/pdf

Classification:

- press items are hard-coded as `PRESS_RELEASE`
- speeches are hard-coded as `SPEECH`
- category is inferred heuristically for press items

### FCA

Behavior:

- fetches FCA sitemap XML
- filters URLs under `/news/press-releases/` and `/news/speeches/`
- takes up to 20 of each
- uses URL slug text as fallback title
- fetches each target page for summary/content/pdf

Important caveat:

- `publishedAt` defaults to `new Date()` because sitemap parsing does not extract reliable publish dates here

### WTO

Behavior:

- fetches latest news RSS
- retries with a looser `Accept` header when a 406 occurs
- enriches each item by fetching its page

Classification:

- jurisdiction is `GLOBAL`
- category is fixed to `TRADE_POLICY`
- document type is inferred heuristically

### BIS / US Commerce

Behavior:

- scrapes BIS federal-register notices page
- looks for links mentioning federal register / export administration / entity list / rule
- takes up to 30 items
- fetches each notice page for summary/content/pdf

Classification:

- institution `US_COMMERCE`
- jurisdiction `US`
- category fixed to `TRADE_POLICY`
- document type inferred heuristically

### Regulatory classification rules

Heuristics are title/summary driven.

Category inference can map into:

- AI regulation
- bank capital
- energy policy
- environmental rules
- trade policy
- otherwise financial regulation

Document type inference can map into:

- speech
- consultation
- proposed rule
- final rule
- guidance
- circular
- FAQ
- report
- notice
- otherwise press release

### Regulatory repository behavior

Write semantics:

- loads existing rows by `externalKey`
- inserts missing rows
- updates changed rows
- resets `processingStatus` to `PENDING` on update
- skips unchanged rows

Queue behavior:

- publishes `process_regulatory_announcement` after successful insert/update
- queue failure does not roll back the DB write

Migration handling:

- the job catches Prisma `P2021`
- if `RegulatoryAnnouncement` is missing, the run is skipped with a migration warning log

## API Status

### Health

Implemented:

- `GET /api/health` returns service status and timestamp
- `GET /api/health/db` runs `SELECT 1` through Prisma

### Events API

Current state:

- `event.service.ts` is placeholder-only and returns an empty list
- `/api/v1/events` returns `501 Not implemented`

This means none of the ingested source material is exposed through a real product API yet.

## Migrations Status

Observed migration folders:

- `20260309233407_init`
- `20260310120000_add_macro_observation`
- `20260310181320_test`
- `20260311090000_add_fred_series_catalog`
- `20260311103000_add_central_bank_documents`
- `20260311120000_add_regulatory_announcements`
- `20260311123000_rename_central_bank_documents_to_official_announcements`

The schema and code are aligned around `OfficialAnnouncement`, not `CentralBankDocument`.

## Key Strengths

- ingestion is modular and easy to trace
- most pipelines degrade gracefully when one source fails
- DB writes are deduplicated by stable external identifiers
- queue publish points already exist for downstream async processing
- scheduler prevents overlapping runs inside a single process

## Current Gaps and Risks

### Missing downstream processing

The biggest functional gap is after persistence:

- queue messages are emitted but nothing here consumes them
- `Event` and `Entity` tables are unused
- `processingStatus` does not advance

### No distributed scheduling lock

If multiple app instances run, each instance schedules the same jobs and may duplicate fetch work. Unique constraints prevent some duplicate inserts, but extra network traffic and queue attempts still happen.

### Best-effort queue only

Queue failures are only logged. There is:

- no retry policy
- no outbox table
- no replay tooling

This can create a state where DB rows exist in `PENDING`, but no downstream job was actually queued.

### Heuristic scraping fragility

Several pipelines depend on regex and loose HTML parsing:

- Fed calendar parsing
- PBOC page crawling
- FCA sitemap/title derivation
- BIS notice parsing
- RSS/Atom parsing via regex generally

These will be sensitive to upstream markup changes.

### Incomplete source coverage

Enums suggest broader ambitions than current fetchers implement.

Examples:

- regulatory enums include MAS, ESMA, and European Commission, but no fetch logic exists
- default RSS news feed list is only CNBC

### Limited update strategy for news

`RawArticle` is insert-only by URL. Existing rows are not refreshed if better metadata is available later.

### Potential performance issues at scale

Most repository writes are per-item loops:

- insert/update one row at a time
- publish one queue message at a time
- fetch full page details for many source items individually

This is acceptable for current scale, but it will become slow or expensive as feed counts grow.

## Bottom Line

The backend is already capable of acting as a source-ingestion layer:

- it fetches from external macro/news/policy/regulatory sources
- normalizes and stores source records in Postgres
- optionally emits queue messages for downstream processing

But it is not yet a full end-to-end application backend because:

- the downstream consumers are absent
- the events API is not implemented
- several ingestion paths rely on brittle scraping heuristics

If another model is being asked what to do next, the most accurate framing is:

the ingestion foundation exists and is reasonably broad, but the system is currently in an intermediate state between "data collector" and "usable product backend."
