import {
  ingestNewsFromGdelt,
  ingestNewsFromNewsApi,
  ingestNewsFromRss,
} from "../services";

type RunNewsIngestionJobOptions = {
  from?: Date;
  to?: Date;
  gdeltTimespan?: string;
};

export async function runNewsIngestionJob(
  options: RunNewsIngestionJobOptions = {},
): Promise<void> {
  const results: string[] = [];
  let hasSuccessfulSource = false;

  if (process.env.NEWS_API_KEY) {
    try {
      const newsApiResult = await ingestNewsFromNewsApi({
        from: options.from,
        to: options.to,
      });
      results.push(
        `newsapi(fetched=${newsApiResult.fetched}, normalized=${newsApiResult.normalized}, stored=${newsApiResult.stored})`,
      );
      hasSuccessfulSource = true;
    } catch (error) {
      console.error("NewsAPI ingestion failed", error);
      results.push("newsapi(error)");
    }
  }

  try {
    const gdeltResult = await ingestNewsFromGdelt({
      gdeltTimespan: options.gdeltTimespan,
    });
    results.push(
      `gdelt(fetched=${gdeltResult.fetched}, normalized=${gdeltResult.normalized}, stored=${gdeltResult.stored})`,
    );
    hasSuccessfulSource = true;
  } catch (error) {
    console.error("GDELT ingestion failed", error);
    results.push("gdelt(error)");
  }

  try {
    const rssResult = await ingestNewsFromRss();
    results.push(
      `rss(fetched=${rssResult.fetched}, normalized=${rssResult.normalized}, stored=${rssResult.stored})`,
    );
    hasSuccessfulSource = true;
  } catch (error) {
    console.error("RSS ingestion failed", error);
    results.push("rss(error)");
  }

  if (!hasSuccessfulSource) {
    throw new Error("All ingestion sources failed");
  }

  console.log(`News ingestion complete: ${results.join(", ")}`);
}
