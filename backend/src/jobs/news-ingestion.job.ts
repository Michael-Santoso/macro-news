import {
  ingestNewsFromGdelt,
  ingestNewsFromNewsApi,
  ingestNewsFromRss,
} from "../services";

export async function runNewsIngestionJob(): Promise<void> {
  const results: string[] = [];

  if (process.env.NEWS_API_KEY) {
    const newsApiResult = await ingestNewsFromNewsApi();
    results.push(
      `newsapi(fetched=${newsApiResult.fetched}, normalized=${newsApiResult.normalized}, stored=${newsApiResult.stored})`,
    );
  }

  const gdeltResult = await ingestNewsFromGdelt();
  results.push(
    `gdelt(fetched=${gdeltResult.fetched}, normalized=${gdeltResult.normalized}, stored=${gdeltResult.stored})`,
  );

  const rssResult = await ingestNewsFromRss();
  results.push(
    `rss(fetched=${rssResult.fetched}, normalized=${rssResult.normalized}, stored=${rssResult.stored})`,
  );

  console.log(`News ingestion complete: ${results.join(", ")}`);
}
