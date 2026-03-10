export type NormalizedRawArticle = {
  source: string;
  title: string;
  url: string;
  description: string | null;
  content: string | null;
  author: string | null;
  publishedAt: Date;
};

