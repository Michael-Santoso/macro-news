import { fetchArticlesFromRssFeed, type RssArticle } from "./rss.client";

const GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_QUERY =
  '("inflation" OR economy OR "interest rates" OR "central bank" OR markets OR sanctions OR "oil prices")';

export async function fetchFinancialNewsFromGdelt(): Promise<RssArticle[]> {
  const params = new URLSearchParams({
    query: GDELT_QUERY,
    mode: "artlist",
    maxrecords: "50",
    timespan: "24h",
    sort: "datedesc",
    format: "rssarchive",
  });

  return fetchArticlesFromRssFeed({
    source: "GDELT",
    url: `${GDELT_DOC_API_URL}?${params.toString()}`,
  });
}
