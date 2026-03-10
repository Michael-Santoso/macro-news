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

```json
{
  "jobType": "process_official_announcement",
  "officialAnnouncementId": "<official_announcement_id>",
  "institution": "FEDERAL_RESERVE",
  "region": "US",
  "documentType": "MINUTES",
  "publishedAt": "<iso_timestamp>",
  "url": "<official_document_url_or_null>"
}
```

```json
{
  "jobType": "process_regulatory_announcement",
  "regulatoryAnnouncementId": "<regulatory_announcement_id>",
  "institution": "SEC",
  "jurisdiction": "US",
  "category": "FINANCIAL_REGULATION",
  "documentType": "PRESS_RELEASE",
  "publishedAt": "<iso_timestamp>",
  "url": "<official_document_url_or_null>"
}
```

## Processor Flow

1. Read queue message.
2. Inspect `jobType`.
3. For `process_raw_article`, use `rawArticleId` to fetch the article from `RawArticle`.
4. For `process_macro_observation`, use `macroObservationId` to fetch the observation from `MacroObservation`.
5. For `process_official_announcement`, use `officialAnnouncementId` to fetch the document from `OfficialAnnouncement`.
6. For `process_regulatory_announcement`, use `regulatoryAnnouncementId` to fetch the document from `RegulatoryAnnouncement`.
7. Run downstream analysis.
8. Write extracted output back to Supabase.
9. Update status fields where applicable.

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

## OfficialAnnouncement Fields

Main fields:

- `id`
- `institution`
- `region`
- `documentType`
- `externalKey`
- `title`
- `url`
- `pdfUrl`
- `speaker`
- `publishedAt`
- `meetingDate`
- `description`
- `content`
- `contentHash`
- `processingStatus`

## RegulatoryAnnouncement Fields

Main fields:

- `id`
- `institution`
- `jurisdiction`
- `category`
- `documentType`
- `sourceType`
- `externalKey`
- `title`
- `url`
- `pdfUrl`
- `sourceFeed`
- `publishedAt`
- `effectiveAt`
- `commentDeadline`
- `summary`
- `content`
- `contentHash`
- `processingStatus`
