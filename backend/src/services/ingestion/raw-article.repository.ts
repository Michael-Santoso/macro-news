import prisma from "../../lib/prisma";
import type { NormalizedRawArticle } from "../../types/ingestion";

function deduplicateArticlesByUrl(
  articles: NormalizedRawArticle[],
): NormalizedRawArticle[] {
  const uniqueArticles = new Map<string, NormalizedRawArticle>();

  for (const article of articles) {
    if (!uniqueArticles.has(article.url)) {
      uniqueArticles.set(article.url, article);
    }
  }

  return [...uniqueArticles.values()];
}

export async function storeRawArticles(
  articles: NormalizedRawArticle[],
): Promise<number> {
  if (articles.length === 0) {
    return 0;
  }

  const deduplicatedArticles = deduplicateArticlesByUrl(articles);
  const urls = deduplicatedArticles.map((article) => article.url);
  const existingArticles = await prisma.rawArticle.findMany({
    where: {
      url: {
        in: urls,
      },
    },
    select: {
      url: true,
    },
  });

  const existingUrls = new Set(existingArticles.map((article) => article.url));
  const newArticles = deduplicatedArticles.filter(
    (article) => !existingUrls.has(article.url),
  );

  if (newArticles.length === 0) {
    return 0;
  }

  const result = await prisma.rawArticle.createMany({
    data: newArticles,
    skipDuplicates: true,
  });

  return result.count;
}
