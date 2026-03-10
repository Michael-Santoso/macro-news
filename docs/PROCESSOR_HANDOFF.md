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

Messages are published only after the corresponding row is successfully inserted into Supabase.

If validation fails, or the database insert is skipped or fails, no queue message should be published.

Current message shapes:

```json
{
  "jobType": "process_raw_article",
  "rawArticleId": "<raw_article_id>",
  "publishedAt": "<iso_timestamp>",
  "fetchedAt": "<iso_timestamp>"
}
```

```json
{
  "jobType": "process_macro_observation",
  "macroObservationId": "<macro_observation_id>",
  "seriesId": "<fred_series_id>",
  "observationDate": "<iso_timestamp>",
  "value": "<raw_fred_value>"
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

```json
{
  "jobType": "process_macro_observation",
  "macroObservationId": "cmmdemo1234567890macro01",
  "seriesId": "CPIAUCSL",
  "observationDate": "2026-02-01T00:00:00.000Z",
  "value": "319.082"
}
```

## Processor Flow

1. Read queue message.
2. Inspect `jobType`.
3. For `process_raw_article`, use `rawArticleId` to fetch the article from `RawArticle` in Supabase.
4. For `process_macro_observation`, use `macroObservationId` to fetch the observation from `MacroObservation` in Supabase.
5. Run downstream analysis.
6. Write extracted output back to Supabase.
7. Update status fields where applicable.

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

## MacroObservation Fields

Main fields:

- `id`
- `seriesId`
- `observationDate`
- `value`
