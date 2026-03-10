# Supabase Setup

Use Supabase when both the ingestion backend and a future processing service need the same database.

## Why

- Shared `RawArticle` records across services
- Easier queue payloads because workers can fetch by `rawArticleId`
- Cleaner path to separate ingestion and processing backends later

## Connection Strings

Set these in [`backend/.env`](file:///d:/Coding/macro-news/backend/.env):

```env
# Runtime Prisma Client traffic via Supavisor transaction pooler
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma CLI traffic for migrations and Studio
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Use the session/direct URL shown in your Supabase `Connect` page for `DIRECT_URL`.

## Prisma Behavior

This repo is configured so:

- `DATABASE_URL` is used by the app at runtime
- `DIRECT_URL` is used by Prisma CLI for migrations and schema operations

That is why both values must be present when using Supabase.

## Migration Steps

1. Create a Supabase project.
2. Open the `Connect` view in Supabase and copy:
   - the transaction pooler URL
   - the session/direct URL you are using for Prisma CLI
3. Update [`backend/.env`](file:///d:/Coding/macro-news/backend/.env).
4. Run:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

## Recommended Team Setup

- Ingestion backend and processing backend should both point to the same Supabase project.
- Queue messages should contain `rawArticleId` and lightweight metadata, not full article payloads.
- `RawArticle.processingStatus` should be updated by the processor service, not the ingestion scheduler.

## References

- Prisma + Supabase: https://www.prisma.io/docs/v6/orm/overview/databases/supabase
- Prisma PgBouncer guidance: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer
- Supabase connection strings: https://supabase.com/docs/reference/postgres/connection-strings
