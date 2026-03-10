const DEFAULT_RSS_FEEDS: RssFeedConfig[] = [
  {
    source: "CNBC",
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
  },
];

type RssFeedConfig = {
  source: string;
  url: string;
};

type RssArticle = {
  source: string;
  title?: string;
  url?: string;
  description?: string | null;
  content?: string | null;
  author?: string | null;
  publishedAt?: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanText(value?: string): string | null {
  if (!value) {
    return null;
  }

  const cleaned = stripTags(decodeXml(value)).trim();
  return cleaned || null;
}

function extractTag(block: string, tagName: string): string | undefined {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );
  return block.match(pattern)?.[1];
}

function extractAtomLink(block: string): string | undefined {
  const alternateLinkTag = block.match(
    /<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i,
  );

  if (alternateLinkTag?.[1]) {
    return alternateLinkTag[1];
  }

  const linkTag = block.match(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/i);
  return linkTag?.[1];
}

function extractRssLink(block: string): string | undefined {
  return (
    cleanText(extractTag(block, "link")) ??
    cleanText(extractTag(block, "guid")) ??
    undefined
  );
}

function extractPublishedAt(block: string): string | undefined {
  return (
    cleanText(extractTag(block, "pubDate")) ??
    cleanText(extractTag(block, "published")) ??
    cleanText(extractTag(block, "updated")) ??
    cleanText(extractTag(block, "dc:date")) ??
    undefined
  );
}

function parseRssItem(itemXml: string, source: string): RssArticle {
  return {
    source,
    title: cleanText(extractTag(itemXml, "title")) ?? undefined,
    url: extractRssLink(itemXml),
    description: cleanText(extractTag(itemXml, "description")),
    content:
      cleanText(extractTag(itemXml, "content:encoded")) ??
      cleanText(extractTag(itemXml, "description")),
    author:
      cleanText(extractTag(itemXml, "dc:creator")) ??
      cleanText(extractTag(itemXml, "author")),
    publishedAt: extractPublishedAt(itemXml),
  };
}

function parseAtomEntry(entryXml: string, source: string): RssArticle {
  return {
    source,
    title: cleanText(extractTag(entryXml, "title")) ?? undefined,
    url: cleanText(extractAtomLink(entryXml)) ?? undefined,
    description:
      cleanText(extractTag(entryXml, "summary")) ??
      cleanText(extractTag(entryXml, "content")),
    content: cleanText(extractTag(entryXml, "content")),
    author:
      cleanText(extractTag(entryXml, "name")) ??
      cleanText(extractTag(entryXml, "author")),
    publishedAt: extractPublishedAt(entryXml),
  };
}

function parseRssFeed(xml: string, source: string): RssArticle[] {
  const rssItems = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  if (rssItems.length > 0) {
    return rssItems.map((item) => parseRssItem(item, source));
  }

  const atomEntries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return atomEntries.map((entry) => parseAtomEntry(entry, source));
}

export async function fetchArticlesFromRssFeed(
  feed: RssFeedConfig,
): Promise<RssArticle[]> {
  const response = await fetch(feed.url, {
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `RSS request failed for ${feed.source} with status ${response.status}`,
    );
  }

  const xml = await response.text();
  return parseRssFeed(xml, feed.source);
}

export async function fetchArticlesFromRssFeeds(
  feeds: RssFeedConfig[] = DEFAULT_RSS_FEEDS,
): Promise<RssArticle[]> {
  const results = await Promise.allSettled(
    feeds.map((feed) => fetchArticlesFromRssFeed(feed)),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(
      `RSS fetch failed for ${feeds[index]?.source ?? "unknown source"}`,
      result.reason,
    );
    return [];
  });
}

export { DEFAULT_RSS_FEEDS };
export type { RssArticle, RssFeedConfig };
