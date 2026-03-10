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
  const result = await prisma.rawArticle.createMany({
    data: deduplicatedArticles,
    skipDuplicates: true,
  });

  return result.count;
}
