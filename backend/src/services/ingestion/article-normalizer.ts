import type { NormalizedRawArticle } from "../../types/ingestion";
import type { NewsApiArticle } from "./newsapi.client";
import type { RssArticle } from "./rss.client";

function toDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeNewsApiArticles(
  articles: NewsApiArticle[],
): NormalizedRawArticle[] {
  return articles
    .map((article) => {
      const publishedAt = toDate(article.publishedAt);
      const title = article.title?.trim();
      const url = article.url?.trim();

      if (!title || !url || !publishedAt) {
        return null;
      }

      return {
        source: article.source?.name?.trim() || "NewsAPI",
        title,
        url,
        description: article.description?.trim() || null,
        content: article.content?.trim() || null,
        author: article.author?.trim() || null,
        publishedAt,
      } satisfies NormalizedRawArticle;
    })
    .filter((article): article is NormalizedRawArticle => article !== null);
}

export function normalizeRssArticles(
  articles: RssArticle[],
): NormalizedRawArticle[] {
  return articles
    .map((article) => {
      const publishedAt = toDate(article.publishedAt);
      const title = article.title?.trim();
      const url = article.url?.trim();

      if (!title || !url || !publishedAt) {
        return null;
      }

      return {
        source: article.source.trim(),
        title,
        url,
        description: article.description?.trim() || null,
        content: article.content?.trim() || null,
        author: article.author?.trim() || null,
        publishedAt,
      } satisfies NormalizedRawArticle;
    })
    .filter((article): article is NormalizedRawArticle => article !== null);
}
