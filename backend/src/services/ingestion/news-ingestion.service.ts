import {
  normalizeNewsApiArticles,
  normalizeRssArticles,
} from "./article-normalizer";
import { fetchFinancialNewsFromGdelt } from "./gdelt.client";
import { fetchFinancialNewsFromNewsApi } from "./newsapi.client";
import {
  DEFAULT_RSS_FEEDS,
  fetchArticlesFromRssFeeds,
  type RssFeedConfig,
} from "./rss.client";
import { storeRawArticles } from "./raw-article.repository";

export async function ingestNewsFromNewsApi(): Promise<{
  fetched: number;
  normalized: number;
  stored: number;
}> {
  const fetchedArticles = await fetchFinancialNewsFromNewsApi();
  const normalizedArticles = normalizeNewsApiArticles(fetchedArticles);
  const storedCount = await storeRawArticles(normalizedArticles);

  return {
    fetched: fetchedArticles.length,
    normalized: normalizedArticles.length,
    stored: storedCount,
  };
}

export async function ingestNewsFromGdelt(): Promise<{
  fetched: number;
  normalized: number;
  stored: number;
}> {
  const fetchedArticles = await fetchFinancialNewsFromGdelt();
  const normalizedArticles = normalizeRssArticles(fetchedArticles);
  const storedCount = await storeRawArticles(normalizedArticles);

  return {
    fetched: fetchedArticles.length,
    normalized: normalizedArticles.length,
    stored: storedCount,
  };
}

export async function ingestNewsFromRss(
  feeds: RssFeedConfig[] = DEFAULT_RSS_FEEDS,
): Promise<{
  fetched: number;
  normalized: number;
  stored: number;
}> {
  const fetchedArticles = await fetchArticlesFromRssFeeds(feeds);
  const normalizedArticles = normalizeRssArticles(fetchedArticles);
  const storedCount = await storeRawArticles(normalizedArticles);

  return {
    fetched: fetchedArticles.length,
    normalized: normalizedArticles.length,
    stored: storedCount,
  };
}
