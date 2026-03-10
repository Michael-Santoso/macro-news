import prisma from "../../lib/prisma";
import type { NormalizedRawArticle } from "../../types/ingestion";

export async function storeRawArticles(
  articles: NormalizedRawArticle[],
): Promise<number> {
  if (articles.length === 0) {
    return 0;
  }

  const result = await prisma.rawArticle.createMany({
    data: articles,
    skipDuplicates: true,
  });

  return result.count;
}

