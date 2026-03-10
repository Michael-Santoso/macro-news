# Tasks

## Phase 1 — Project Setup

- [x] Create frontend app
- [x] Create backend app
- [x] Set up Prisma in backend
- [x] Connect PostgreSQL database
- [x] Add environment variables
- [x] Create backend scaffold (routes, services, scheduler, jobs)
- [x] Test backend can connect to DB (run after installing dependencies)

## Phase 2 — News Ingestion

- [x] Create NewsAPI fetcher
- [x] Create GDELT fetcher
- [x] Create RSS fetcher
- [x] Normalize article format
- [x] Store raw articles in database
- [x] Add deduplication by URL
- [x] Create ingestion job
- [x] Add scheduler

## Phase 2.5 â€” Macro Data Ingestion

- [x] Create FRED client
- [x] Separate daily FRED scheduler and series/date-based storage updates
- [x] Expand FRED coverage for core macro indicator series
- [x] Separate daily FRED scheduler and series/date-based storage updates

## Phase 3 — Event Extraction

- [ ] Create article processor
- [ ] Extract entities
- [ ] Classify theme
- [ ] Detect region
- [ ] Assign sentiment / stance
- [ ] Save Event records

## Phase 4 — API Layer

- [ ] Create GET /articles
- [ ] Create GET /events
- [ ] Create GET /themes

## Phase 5 — Frontend

- [ ] Create dashboard shell
- [ ] Show raw articles
- [ ] Show extracted events
- [ ] Show hot themes
- [ ] Add chatbot UI
