type ArticleMetadata = {
  description: string | null;
  content: string | null;
  author: string | null;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function extractMetaContent(html: string, attribute: string, value: string): string | null {
  const doubleQuotedPattern = new RegExp(
    `<meta\\b[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["'][^>]*>`,
    "i",
  );

  return (
    cleanText(html.match(doubleQuotedPattern)?.[1]) ??
    cleanText(html.match(reversePattern)?.[1])
  );
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        description: null,
        content: null,
        author: null,
      };
    }

    const html = await response.text();
    const description =
      extractMetaContent(html, "property", "og:description") ??
      extractMetaContent(html, "name", "description") ??
      extractMetaContent(html, "name", "twitter:description");
    const author =
      extractMetaContent(html, "name", "author") ??
      extractMetaContent(html, "property", "article:author") ??
      extractMetaContent(html, "name", "parsely-author");

    return {
      description,
      content: description,
      author,
    };
  } catch {
    return {
      description: null,
      content: null,
      author: null,
    };
  }
}
