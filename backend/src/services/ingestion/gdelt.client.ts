import { fetchArticleMetadata } from "./article-metadata.client";
import { fetchArticlesFromRssFeed, type RssArticle } from "./rss.client";

const GDELT_DOC_API_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_QUERY =
  '("inflation" OR economy OR "interest rates" OR "central bank" OR markets OR sanctions OR "oil prices")';

type FetchFinancialNewsFromGdeltOptions = {
  timespan?: string;
};

export async function fetchFinancialNewsFromGdelt(
  options: FetchFinancialNewsFromGdeltOptions = {},
): Promise<RssArticle[]> {
  const params = new URLSearchParams({
    query: GDELT_QUERY,
    mode: "artlist",
    maxrecords: "250",
    timespan: options.timespan ?? "24h",
    sort: "datedesc",
    format: "rssarchive",
  });

  const articles = await fetchArticlesFromRssFeed({
    source: "GDELT",
    url: `${GDELT_DOC_API_URL}?${params.toString()}`,
  });

  const enrichedArticles = await Promise.all(
    articles.map(async (article) => {
      if (!article.url) {
        return article;
      }

      const metadata = await fetchArticleMetadata(article.url);

      return {
        ...article,
        description: article.description ?? metadata.description,
        content: article.content ?? metadata.content,
        author: article.author ?? metadata.author,
      } satisfies RssArticle;
    }),
  );

  return enrichedArticles;
}
