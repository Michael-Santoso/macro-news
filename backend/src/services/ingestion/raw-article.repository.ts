import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { publishRawArticleJob } from "../queue";
import type { NormalizedRawArticle } from "../../types/ingestion";

type CreatedRawArticle = {
  id: string;
  publishedAt: Date;
  fetchedAt: Date;
};

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
  const existingArticles = await prisma.rawArticle.findMany({
    where: {
      url: {
        in: deduplicatedArticles.map((article) => article.url),
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
  let storedCount = 0;

  for (const article of newArticles) {
    const createdArticle = await createRawArticle(article);

    if (!createdArticle) {
      continue;
    }

    storedCount += 1;

    try {
      await publishRawArticleJob({
        jobType: "process_raw_article",
        rawArticleId: createdArticle.id,
        publishedAt: createdArticle.publishedAt.toISOString(),
        fetchedAt: createdArticle.fetchedAt.toISOString(),
      });
    } catch (error) {
      console.error(
        `Queue publish failed for raw article ${createdArticle.id}`,
        error,
      );
    }
  }

  return storedCount;
}

async function createRawArticle(
  article: NormalizedRawArticle,
): Promise<CreatedRawArticle | null> {
  try {
    return await prisma.rawArticle.create({
      data: article,
      select: {
        id: true,
        publishedAt: true,
        fetchedAt: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }
}
