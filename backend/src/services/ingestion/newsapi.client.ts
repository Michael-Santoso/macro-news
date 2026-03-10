import { env } from "../../config/env";

const NEWS_API_BASE_URL = "https://newsapi.org/v2/everything";

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
  message?: string;
};

export async function fetchFinancialNewsFromNewsApi(): Promise<NewsApiArticle[]> {
  if (!env.newsApiKey) {
    throw new Error("Missing NEWS_API_KEY for NewsAPI ingestion");
  }

  const params = new URLSearchParams({
    q: "macro OR economy OR inflation OR interest rates OR central bank OR markets",
    language: "en",
    sortBy: "publishedAt",
    pageSize: "50",
    apiKey: env.newsApiKey,
  });

  const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`NewsAPI request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as NewsApiResponse;

  if (payload.status !== "ok") {
    throw new Error(payload.message ?? "NewsAPI returned an error");
  }

  return payload.articles ?? [];
}

export type { NewsApiArticle };

