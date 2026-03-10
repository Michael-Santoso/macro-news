import { createHash } from "crypto";
import type { FeedEntry } from "./official-announcement.types";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_FETCH_ATTEMPTS = 3;

export function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

export function cleanText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = stripTags(decodeHtml(value)).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export function cleanMultilineText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = decodeHtml(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/main|\/tr|\/h\d)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return cleaned || null;
}

export function toDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hashContent(parts: Array<string | null | undefined>): string | null {
  const normalized = parts.filter(Boolean).join("\n").trim();

  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex");
}

export function normalizeUrl(url: string, baseUrl: string): string {
  const normalized = new URL(url, baseUrl);
  normalized.pathname = normalized.pathname.replace(/\/{2,}/g, "/");
  return normalized.toString();
}

export async function fetchText(url: string, accept: string): Promise<string> {
  const normalizedUrl = normalizeUrl(url, url);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(normalizedUrl, {
        headers: {
          "User-Agent": DEFAULT_USER_AGENT,
          Accept: accept,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Request failed for ${normalizedUrl} with status ${response.status}`,
        );
      }

      return response.text();
    } catch (error) {
      lastError = error;

      if (attempt === MAX_FETCH_ATTEMPTS) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Request failed for ${normalizedUrl}`);
}

export function extractTag(block: string, tagName: string): string | undefined {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );
  return block.match(pattern)?.[1];
}

export function extractAtomLink(block: string): string | undefined {
  const alternateLinkTag = block.match(
    /<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i,
  );

  if (alternateLinkTag?.[1]) {
    return alternateLinkTag[1];
  }

  return block.match(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/i)?.[1];
}

export function extractFeedPublishedAt(block: string): string | undefined {
  return (
    cleanText(extractTag(block, "pubDate")) ??
    cleanText(extractTag(block, "published")) ??
    cleanText(extractTag(block, "updated")) ??
    cleanText(extractTag(block, "dc:date")) ??
    undefined
  );
}

export function parseFeed(xml: string, baseUrl: string): FeedEntry[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const entries =
    items.length > 0 ? items : (xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []);

  return entries.flatMap((entry) => {
    const title = cleanText(extractTag(entry, "title"));
    const rawUrl = cleanText(extractAtomLink(entry) ?? extractTag(entry, "link"));
    const description =
      cleanText(extractTag(entry, "description")) ??
      cleanText(extractTag(entry, "summary"));
    const publishedAt = toDate(extractFeedPublishedAt(entry) ?? "");

    if (!title || !rawUrl || !publishedAt) {
      return [];
    }

    return [
      {
        title,
        url: normalizeUrl(rawUrl, baseUrl),
        description,
        publishedAt,
      },
    ];
  });
}

export function extractMetaContent(
  html: string,
  attribute: string,
  value: string,
): string | null {
  const directPattern = new RegExp(
    `<meta\\b[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["'][^>]*>`,
    "i",
  );

  return (
    cleanText(html.match(directPattern)?.[1]) ??
    cleanText(html.match(reversePattern)?.[1])
  );
}

export function extractPdfUrl(html: string, pageUrl: string): string | null {
  const match = html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
  return match?.[1] ? normalizeUrl(match[1], pageUrl) : null;
}

export function extractBodyText(html: string): string | null {
  const preferredSections = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div\b[^>]*id=["']article["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div\b[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
    /<section\b[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
  ];

  for (const pattern of preferredSections) {
    const match = html.match(pattern);
    const text = cleanMultilineText(match?.[1]);

    if (text && text.length > 200) {
      return text;
    }
  }

  return cleanMultilineText(html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]);
}

export async function fetchPageDetails(url: string): Promise<{
  description: string | null;
  content: string | null;
  pdfUrl: string | null;
}> {
  try {
    const html = await fetchText(url, "text/html,application/xhtml+xml");
    const description =
      extractMetaContent(html, "property", "og:description") ??
      extractMetaContent(html, "name", "description");

    return {
      description,
      content: extractBodyText(html),
      pdfUrl: extractPdfUrl(html, url),
    };
  } catch (error) {
    console.error(`Announcement page fetch failed for ${url}`, error);
    return {
      description: null,
      content: null,
      pdfUrl: null,
    };
  }
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const matches = html.matchAll(/href=["']([^"']+)["']/gi);
  const links = new Set<string>();

  for (const match of matches) {
    const href = match[1];

    if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
      continue;
    }

    try {
      links.add(normalizeUrl(href, baseUrl));
    } catch {
      continue;
    }
  }

  return [...links];
}
