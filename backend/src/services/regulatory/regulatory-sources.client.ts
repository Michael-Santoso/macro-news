import {
  RegulatoryCategory,
  RegulatoryDocumentType,
  RegulatoryInstitution,
  RegulatoryJurisdiction,
  RegulatorySourceType,
} from "@prisma/client";
import { createHash } from "crypto";

const SEC_PRESS_RELEASE_FEED_URL = "https://www.sec.gov/news/pressreleases.rss";
const SEC_SPEECH_FEED_URL = "https://www.sec.gov/news/speeches.rss";
const WTO_NEWS_FEED_URL = "https://www.wto.org/library/rss/latest_news_e.xml";
const FCA_SITEMAP_URL = "https://www.fca.org.uk/sitemap.xml";
const FCA_NEWS_BASE_URL = "https://www.fca.org.uk/news";
const BIS_FEDERAL_REGISTER_URL =
  "https://www.bis.gov/regulations/federal-register-notices";

export type RegulatoryAnnouncementInput = {
  institution: RegulatoryInstitution;
  jurisdiction: RegulatoryJurisdiction;
  category: RegulatoryCategory;
  documentType: RegulatoryDocumentType;
  sourceType: RegulatorySourceType;
  externalKey: string;
  title: string;
  url: string | null;
  pdfUrl: string | null;
  sourceFeed: string | null;
  publishedAt: Date;
  effectiveAt: Date | null;
  commentDeadline: Date | null;
  summary: string | null;
  content: string | null;
  contentHash: string | null;
};

type FeedEntry = {
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date;
};

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function cleanText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const cleaned = stripTags(decodeHtml(value)).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function cleanMultilineText(value?: string | null): string | null {
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

function toDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hashContent(parts: Array<string | null | undefined>): string | null {
  const normalized = parts.filter(Boolean).join("\n").trim();

  if (!normalized) {
    return null;
  }

  return createHash("sha256").update(normalized).digest("hex");
}

function extractTag(block: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return block.match(pattern)?.[1];
}

function extractAtomLink(block: string): string | undefined {
  const alternateLinkTag = block.match(
    /<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*\/?>/i,
  );

  if (alternateLinkTag?.[1]) {
    return alternateLinkTag[1];
  }

  return block.match(/<link\b[^>]*href="([^"]+)"[^>]*\/?>/i)?.[1];
}

function extractFeedPublishedAt(block: string): string | undefined {
  return (
    cleanText(extractTag(block, "pubDate")) ??
    cleanText(extractTag(block, "published")) ??
    cleanText(extractTag(block, "updated")) ??
    cleanText(extractTag(block, "dc:date")) ??
    undefined
  );
}

function parseFeed(xml: string): FeedEntry[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const entries = items.length > 0 ? items : (xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []);

  return entries.flatMap((entry) => {
    const title = cleanText(extractTag(entry, "title"));
    const url = cleanText(extractAtomLink(entry) ?? extractTag(entry, "link"));
    const summary =
      cleanText(extractTag(entry, "description")) ??
      cleanText(extractTag(entry, "summary"));
    const publishedAt = toDate(extractFeedPublishedAt(entry));

    if (!title || !url || !publishedAt) {
      return [];
    }

    return [{ title, url, summary, publishedAt }];
  });
}

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: accept,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url} with status ${response.status}`);
  }

  return await response.text();
}

async function fetchTextWithFallbackAccept(
  url: string,
  primaryAccept: string,
  fallbackAccept = "*/*",
): Promise<string> {
  try {
    return await fetchText(url, primaryAccept);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes(`Request failed for ${url} with status 406`)
    ) {
      return fetchText(url, fallbackAccept);
    }

    throw error;
  }
}

function normalizeUrl(url: string, baseUrl: string): string {
  return new URL(url, baseUrl).toString();
}

function extractMetaContent(html: string, attribute: string, value: string): string | null {
  const directPattern = new RegExp(
    `<meta\\b[^>]*${attribute}=["']${value}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const reversePattern = new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${value}["'][^>]*>`,
    "i",
  );

  return cleanText(html.match(directPattern)?.[1]) ?? cleanText(html.match(reversePattern)?.[1]);
}

function extractPdfUrl(html: string, pageUrl: string): string | null {
  const match = html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
  return match?.[1] ? normalizeUrl(match[1], pageUrl) : null;
}

function extractBodyText(html: string): string | null {
  const preferredSections = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div\b[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
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

async function fetchPageDetails(url: string): Promise<{
  summary: string | null;
  content: string | null;
  pdfUrl: string | null;
}> {
  try {
    const html = await fetchText(url, "text/html,application/xhtml+xml");
    return {
      summary:
        extractMetaContent(html, "property", "og:description") ??
        extractMetaContent(html, "name", "description"),
      content: extractBodyText(html),
      pdfUrl: extractPdfUrl(html, url),
    };
  } catch (error) {
    console.error(`Regulatory page fetch failed for ${url}`, error);
    return {
      summary: null,
      content: null,
      pdfUrl: null,
    };
  }
}

function inferCategory(title: string, summary: string | null): RegulatoryCategory {
  const text = `${title} ${summary ?? ""}`.toLowerCase();

  if (text.includes("ai ") || text.includes("artificial intelligence")) {
    return RegulatoryCategory.AI_REGULATION;
  }

  if (text.includes("capital") || text.includes("basel") || text.includes("bank")) {
    return RegulatoryCategory.BANK_CAPITAL;
  }

  if (text.includes("energy")) {
    return RegulatoryCategory.ENERGY_POLICY;
  }

  if (
    text.includes("environment") ||
    text.includes("climate") ||
    text.includes("emissions")
  ) {
    return RegulatoryCategory.ENVIRONMENTAL_RULES;
  }

  if (
    text.includes("trade") ||
    text.includes("tariff") ||
    text.includes("export") ||
    text.includes("sanction")
  ) {
    return RegulatoryCategory.TRADE_POLICY;
  }

  return RegulatoryCategory.FINANCIAL_REGULATION;
}

function inferDocumentType(title: string, summary: string | null): RegulatoryDocumentType {
  const text = `${title} ${summary ?? ""}`.toLowerCase();

  if (text.includes("speech") || text.includes("remarks")) {
    return RegulatoryDocumentType.SPEECH;
  }

  if (text.includes("consult") || text.includes("call for input")) {
    return RegulatoryDocumentType.CONSULTATION;
  }

  if (text.includes("proposed rule") || text.includes("proposes")) {
    return RegulatoryDocumentType.PROPOSED_RULE;
  }

  if (text.includes("final rule") || text.includes("adopts")) {
    return RegulatoryDocumentType.FINAL_RULE;
  }

  if (text.includes("guidance")) {
    return RegulatoryDocumentType.GUIDANCE;
  }

  if (text.includes("circular")) {
    return RegulatoryDocumentType.CIRCULAR;
  }

  if (text.includes("faq")) {
    return RegulatoryDocumentType.FAQ;
  }

  if (text.includes("report")) {
    return RegulatoryDocumentType.REPORT;
  }

  if (text.includes("notice")) {
    return RegulatoryDocumentType.NOTICE;
  }

  return RegulatoryDocumentType.PRESS_RELEASE;
}

function buildAnnouncement(
  input: Omit<RegulatoryAnnouncementInput, "contentHash">,
): RegulatoryAnnouncementInput {
  return {
    ...input,
    contentHash: hashContent([input.title, input.url, input.summary, input.content]),
  };
}

async function fetchSecAnnouncements(): Promise<RegulatoryAnnouncementInput[]> {
  const [pressXml, speechXml] = await Promise.all([
    fetchText(SEC_PRESS_RELEASE_FEED_URL, "application/rss+xml, application/xml, text/xml"),
    fetchText(SEC_SPEECH_FEED_URL, "application/rss+xml, application/xml, text/xml"),
  ]);
  const pressEntries = parseFeed(pressXml);
  const speechEntries = parseFeed(speechXml);

  const pressAnnouncements = await Promise.all(
    pressEntries.map(async (entry) => {
      const page = await fetchPageDetails(entry.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.SEC,
        jurisdiction: RegulatoryJurisdiction.US,
        category: inferCategory(entry.title, page.summary ?? entry.summary),
        documentType: RegulatoryDocumentType.PRESS_RELEASE,
        sourceType: RegulatorySourceType.RSS,
        externalKey: entry.url,
        title: entry.title,
        url: entry.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: SEC_PRESS_RELEASE_FEED_URL,
        publishedAt: entry.publishedAt,
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary ?? entry.summary,
        content: page.content,
      });
    }),
  );

  const speechAnnouncements = await Promise.all(
    speechEntries.map(async (entry) => {
      const page = await fetchPageDetails(entry.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.SEC,
        jurisdiction: RegulatoryJurisdiction.US,
        category: RegulatoryCategory.FINANCIAL_REGULATION,
        documentType: RegulatoryDocumentType.SPEECH,
        sourceType: RegulatorySourceType.RSS,
        externalKey: entry.url,
        title: entry.title,
        url: entry.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: SEC_SPEECH_FEED_URL,
        publishedAt: entry.publishedAt,
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary ?? entry.summary,
        content: page.content,
      });
    }),
  );

  return [...pressAnnouncements, ...speechAnnouncements];
}

function parseHtmlCards(
  html: string,
  baseUrl: string,
): Array<{ title: string; url: string; publishedAt: Date | null }> {
  const matches = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
  const items: Array<{ title: string; url: string; publishedAt: Date | null }> = [];

  for (const match of matches) {
    const href = match[1];
    const title = cleanText(match[2]);

    if (!title || title.length < 12) {
      continue;
    }

    if (!href.startsWith("/") && !href.startsWith("http")) {
      continue;
    }

    const surroundingHtml = html.slice(Math.max(0, match.index - 300), match.index + 500);
    const publishedAt =
      toDate(surroundingHtml.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/)?.[0]) ??
      toDate(surroundingHtml.match(/\b[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\b/)?.[0]);

    items.push({
      title,
      url: normalizeUrl(href, baseUrl),
      publishedAt,
    });
  }

  return items;
}

function parseSitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => cleanText(match[1]))
    .filter((value): value is string => Boolean(value));
}

async function fetchFcaAnnouncements(): Promise<RegulatoryAnnouncementInput[]> {
  const sitemapXml = await fetchText(FCA_SITEMAP_URL, "application/xml,text/xml");
  const sitemapUrls = parseSitemapUrls(sitemapXml);
  const pressItems = sitemapUrls
    .filter((url) => url.startsWith(`${FCA_NEWS_BASE_URL}/press-releases/`))
    .slice(0, 20)
    .map((url) => ({
      title: url.split("/").pop()?.replace(/-/g, " ") ?? url,
      url,
      publishedAt: null,
    }));
  const speechItems = sitemapUrls
    .filter((url) => url.startsWith(`${FCA_NEWS_BASE_URL}/speeches/`))
    .slice(0, 20)
    .map((url) => ({
      title: url.split("/").pop()?.replace(/-/g, " ") ?? url,
      url,
      publishedAt: null,
    }));

  const pressAnnouncements = await Promise.all(
    pressItems.map(async (item) => {
      const page = await fetchPageDetails(item.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.FCA,
        jurisdiction: RegulatoryJurisdiction.UK,
        category: inferCategory(item.title, page.summary),
        documentType: RegulatoryDocumentType.PRESS_RELEASE,
        sourceType: RegulatorySourceType.HTML,
        externalKey: item.url,
        title: item.title,
        url: item.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: FCA_SITEMAP_URL,
        publishedAt: item.publishedAt ?? new Date(),
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary,
        content: page.content,
      });
    }),
  );

  const speechAnnouncements = await Promise.all(
    speechItems.map(async (item) => {
      const page = await fetchPageDetails(item.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.FCA,
        jurisdiction: RegulatoryJurisdiction.UK,
        category: RegulatoryCategory.FINANCIAL_REGULATION,
        documentType: RegulatoryDocumentType.SPEECH,
        sourceType: RegulatorySourceType.HTML,
        externalKey: item.url,
        title: item.title,
        url: item.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: FCA_SITEMAP_URL,
        publishedAt: item.publishedAt ?? new Date(),
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary,
        content: page.content,
      });
    }),
  );

  return [...pressAnnouncements, ...speechAnnouncements];
}

async function fetchWtoAnnouncements(): Promise<RegulatoryAnnouncementInput[]> {
  const xml = await fetchTextWithFallbackAccept(
    WTO_NEWS_FEED_URL,
    "application/rss+xml, application/atom+xml, application/xml, text/xml",
  );
  const entries = parseFeed(xml);

  return Promise.all(
    entries.map(async (entry) => {
      const page = await fetchPageDetails(entry.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.WTO,
        jurisdiction: RegulatoryJurisdiction.GLOBAL,
        category: RegulatoryCategory.TRADE_POLICY,
        documentType: inferDocumentType(entry.title, page.summary ?? entry.summary),
        sourceType: RegulatorySourceType.RSS,
        externalKey: entry.url,
        title: entry.title,
        url: entry.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: WTO_NEWS_FEED_URL,
        publishedAt: entry.publishedAt,
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary ?? entry.summary,
        content: page.content,
      });
    }),
  );
}

function parseBisNotices(
  html: string,
): Array<{ title: string; url: string; publishedAt: Date | null }> {
  const matches = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  return matches.flatMap((match) => {
    const href = match[1];
    const title = cleanText(match[2]);

    if (!title || !/federal register|export administration|entity list|rule/i.test(title)) {
      return [];
    }

    const surroundingHtml = html.slice(Math.max(0, match.index - 250), match.index + 500);
    const publishedAt =
      toDate(surroundingHtml.match(/\b[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\b/)?.[0]) ??
      toDate(surroundingHtml.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]);

    return [
      {
        title,
        url: normalizeUrl(href, BIS_FEDERAL_REGISTER_URL),
        publishedAt,
      },
    ];
  });
}

async function fetchBisAnnouncements(): Promise<RegulatoryAnnouncementInput[]> {
  const html = await fetchText(BIS_FEDERAL_REGISTER_URL, "text/html,application/xhtml+xml");
  const items = parseBisNotices(html).slice(0, 30);

  return Promise.all(
    items.map(async (item) => {
      const page = await fetchPageDetails(item.url);
      return buildAnnouncement({
        institution: RegulatoryInstitution.US_COMMERCE,
        jurisdiction: RegulatoryJurisdiction.US,
        category: RegulatoryCategory.TRADE_POLICY,
        documentType: inferDocumentType(item.title, page.summary),
        sourceType: RegulatorySourceType.HTML,
        externalKey: item.url,
        title: item.title,
        url: item.url,
        pdfUrl: page.pdfUrl,
        sourceFeed: BIS_FEDERAL_REGISTER_URL,
        publishedAt: item.publishedAt ?? new Date(),
        effectiveAt: null,
        commentDeadline: null,
        summary: page.summary,
        content: page.content,
      });
    }),
  );
}

function deduplicateAnnouncements(
  announcements: RegulatoryAnnouncementInput[],
): RegulatoryAnnouncementInput[] {
  const deduplicated = new Map<string, RegulatoryAnnouncementInput>();

  for (const announcement of announcements) {
    const existing = deduplicated.get(announcement.externalKey);

    if (!existing) {
      deduplicated.set(announcement.externalKey, announcement);
      continue;
    }

    deduplicated.set(announcement.externalKey, {
      ...existing,
      title: existing.title.length >= announcement.title.length ? existing.title : announcement.title,
      pdfUrl: existing.pdfUrl ?? announcement.pdfUrl,
      summary: existing.summary ?? announcement.summary,
      content: existing.content ?? announcement.content,
      contentHash: existing.contentHash ?? announcement.contentHash,
    });
  }

  return [...deduplicated.values()];
}

export async function fetchRegulatoryAnnouncements(): Promise<RegulatoryAnnouncementInput[]> {
  const results = await Promise.allSettled([
    fetchSecAnnouncements(),
    fetchFcaAnnouncements(),
    fetchWtoAnnouncements(),
    fetchBisAnnouncements(),
  ]);
  const announcements: RegulatoryAnnouncementInput[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      announcements.push(...result.value);
      continue;
    }

    console.error("Regulatory source fetch failed", result.reason);
  }

  return deduplicateAnnouncements(announcements);
}
