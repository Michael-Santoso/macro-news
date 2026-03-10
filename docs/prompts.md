Continue the tasks:

Read docs/TASKS.md and complete the next unchecked task only.
Follow the docs strictly.
Keep changes minimal and modular.
Update TASKS.md by checking off completed items.
At the end, summarize what changed and what I should run next.

Requirements:

- Follow docs/SYSTEM.md and docs/DATABASE.md
- Keep changes minimal and production-readable
- Do not modify unrelated files
- After completing, update TASKS.md by checking off the completed item
- Briefly explain what was changed

#

#

#

Prompts you can use at each stage

1. Initial project setup
   Set up the initial project structure for this repo.

Create:

- frontend/
- backend/
- docs/

Do not add unnecessary features yet.
Keep Prisma inside backend for now.
Update docs/TASKS.md to reflect the completed setup items. 2. Backend initialization
Read docs/TASKS.md and complete the backend setup tasks.

Initialize the backend project with a clean structure suitable for:

- Express or Fastify
- Prisma
- scheduled jobs
- service-based architecture

Create only the minimum files needed.
Do not implement business logic yet.
Update docs/TASKS.md after completion. 3. Prisma initialization
Read docs/DATABASE.md and initialize Prisma inside backend.

Requirements:

- create prisma schema
- define the enums and models from docs/DATABASE.md
- configure Prisma client usage in backend/src/lib/prisma.ts
- do not add extra tables unless necessary

After completion, update docs/TASKS.md and explain what commands I should run. 4. Database connection
Set up PostgreSQL connection for Prisma in the backend.

Requirements:

- use environment variables
- create a safe backend/src/lib/prisma.ts
- ensure the project is ready for migrations
- do not hardcode secrets

After completion, update docs/TASKS.md and list the exact commands to run next. 5. News ingestion first
Read docs/TASKS.md and implement the highest-priority unfinished news ingestion task.

Current priority:

- fetch financial news
- normalize article format
- store raw articles in RawArticle table

Start with NewsAPI first.
Do not implement event extraction yet.
Keep code modular.
Update docs/TASKS.md after completion. 6. RSS fetcher
Implement the RSS ingestion module as the next unchecked task in docs/TASKS.md.

Requirements:

- parse RSS feeds
- normalize article fields into the same structure as NewsAPI results
- reuse shared storage logic
- avoid duplicate code
- update TASKS.md after completion

7. Scheduler
   Implement the scheduled ingestion job as the next unchecked task in docs/TASKS.md.

Requirements:

- create a scheduler file
- run ingestion every 3 hours
- keep scheduling logic separate from fetching logic
- do not implement unrelated features
- update TASKS.md after completion
