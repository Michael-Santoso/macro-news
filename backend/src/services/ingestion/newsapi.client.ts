import { env } from "../../config/env";

const NEWS_API_BASE_URL = "https://newsapi.org/v2/everything";
const NEWS_API_PAGE_SIZE = 100;
const NEWS_API_MAX_PAGES = 5;

type NewsApiArticle = {
  source?: {
    name?: string;
  };
  author?: string | null;
  title?: string;
  description?: string | null;
  url?: string;
  content?: string | null;
  publishedAt?: string;
};

type NewsApiResponse = {
  status: "ok" | "error";
  articles?: NewsApiArticle[];
  totalResults?: number;
  message?: string;
};

type FetchFinancialNewsFromNewsApiOptions = {
  from?: Date;
  to?: Date;
  maxPages?: number;
};

export async function fetchFinancialNewsFromNewsApi(
  options: FetchFinancialNewsFromNewsApiOptions = {},
): Promise<NewsApiArticle[]> {
  if (!env.newsApiKey) {
    throw new Error("Missing NEWS_API_KEY for NewsAPI ingestion");
  }

  const articles: NewsApiArticle[] = [];

  const maxPages = options.maxPages ?? NEWS_API_MAX_PAGES;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      q: "macro OR economy OR inflation OR interest rates OR central bank OR markets",
      language: "en",
      sortBy: "publishedAt",
      pageSize: String(NEWS_API_PAGE_SIZE),
      page: String(page),
      apiKey: env.newsApiKey,
    });

    if (options.from) {
      params.set("from", options.from.toISOString());
    }

    if (options.to) {
      params.set("to", options.to.toISOString());
    }

    const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NewsAPI request failed with status ${response.status}${errorText ? `: ${errorText}` : ""}`,
      );
    }

    const payload = (await response.json()) as NewsApiResponse;

    if (payload.status !== "ok") {
      throw new Error(payload.message ?? "NewsAPI returned an error");
    }

    const pageArticles = payload.articles ?? [];
    articles.push(...pageArticles);

    if (
      pageArticles.length < NEWS_API_PAGE_SIZE ||
      page * NEWS_API_PAGE_SIZE >= (payload.totalResults ?? 0)
    ) {
      break;
    }
  }

  return articles;
}

export type { NewsApiArticle };
