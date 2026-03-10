import { normalizeNewsApiArticles } from "./article-normalizer";
import { fetchFinancialNewsFromNewsApi } from "./newsapi.client";
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

