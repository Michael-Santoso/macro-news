# Processor Handoff

Your analysis service needs access to:

- Supabase Postgres
- Cloudflare Queue

## Env

```env
DATABASE_URL=<supabase_runtime_or_processor_db_url>
DIRECT_URL=<supabase_direct_or_session_url_if_needed>

CLOUDFLARE_ACCOUNT_ID=<cloudflare_account_id>
CLOUDFLARE_API_TOKEN=<cloudflare_api_token>
CLOUDFLARE_QUEUE_ID=<cloudflare_queue_id>
```

## Queue Payload

Messages are published with:

```json
{
  "jobType": "process_raw_article",
  "rawArticleId": "<raw_article_id>",
  "publishedAt": "<iso_timestamp>",
  "fetchedAt": "<iso_timestamp>"
}
```

Example:

```json
{
  "jobType": "process_raw_article",
  "rawArticleId": "cmmkqevqx000810o7y2g3p40g",
  "publishedAt": "2026-03-09T14:52:00.000Z",
  "fetchedAt": "2026-03-10T14:55:09.370Z"
}
```

## Processor Flow

1. Read queue message.
2. Use `rawArticleId` to fetch the article from `RawArticle` in Supabase.
3. Run AI analysis.
4. Write extracted output back to Supabase.
5. Update `RawArticle.processingStatus` to `PROCESSING`, then `PROCESSED` or `FAILED`.

## RawArticle Fields

Main fields:

- `id`
- `source`
- `title`
- `url`
- `description`
- `content`
- `author`
- `publishedAt`
- `fetchedAt`
- `processingStatus`
