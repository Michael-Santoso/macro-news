import { CentralBankDocumentType, CentralBankInstitution } from "@prisma/client";
import { createHash } from "crypto";

const FED_BASE_URL = "https://www.federalreserve.gov";
const FED_FOMC_CALENDAR_URL =
  "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
const FED_POWELL_FEED_URL = "https://www.federalreserve.gov/feeds/s_t_powell.xml";

type CentralBankDocumentInput = {
  institution: CentralBankInstitution;
  documentType: CentralBankDocumentType;
  externalKey: string;
  title: string;
  url: string | null;
  pdfUrl: string | null;
  sourceFeed: string | null;
  speaker: string | null;
  publishedAt: Date;
  meetingDate: Date | null;
  description: string | null;
  content: string | null;
  contentHash: string | null;
};

type FeedEntry = {
  title: string;
  url: string;
  description: string | null;
  publishedAt: Date;
};

type MeetingRecord = {
  meetingDate: Date;
  title: string;
  description: string | null;
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

function normalizeUrl(url: string): string {
  return new URL(url, FED_BASE_URL).toString();
}

function toDate(value: string): Date | null {
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

function extractFeedPublishedAt(block: string): string | undefined {
  return (
    cleanText(extractTag(block, "pubDate")) ??
    cleanText(extractTag(block, "published")) ??
    cleanText(extractTag(block, "updated")) ??
    cleanText(extractTag(block, "dc:date")) ??
    undefined
  );
}

function parsePowellFeed(xml: string): FeedEntry[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const entries = items.length > 0 ? items : (xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []);

  return entries.flatMap((entry) => {
    const title = cleanText(extractTag(entry, "title"));
    const url = cleanText(extractAtomLink(entry) ?? extractTag(entry, "link"));
    const description =
      cleanText(extractTag(entry, "description")) ??
      cleanText(extractTag(entry, "summary"));
    const publishedAt = toDate(extractFeedPublishedAt(entry) ?? "");

    if (!title || !url || !publishedAt) {
      return [];
    }

    return [
      {
        title,
        url: normalizeUrl(url),
        description,
        publishedAt,
      },
    ];
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

function extractMetaContent(html: string, attribute: string, value: string): string | null {
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

function extractPdfUrl(html: string, pageUrl: string): string | null {
  const match = html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i);
  return match?.[1] ? normalizeUrl(new URL(match[1], pageUrl).toString()) : null;
}

function extractBodyText(html: string): string | null {
  const preferredSections = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div\b[^>]*id=["']article["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div\b[^>]*class=["'][^"']*col-xs-12 col-sm-8 col-md-8[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div\b[^>]*id=["']content["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of preferredSections) {
    const match = html.match(pattern);
    const text = cleanMultilineText(match?.[1]);

    if (text && text.length > 200) {
      return text;
    }
  }

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return cleanMultilineText(bodyMatch?.[1]);
}

async function fetchPageDetails(url: string): Promise<{
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
    console.error(`Federal Reserve page fetch failed for ${url}`, error);
    return {
      description: null,
      content: null,
      pdfUrl: null,
    };
  }
}

function formatMeetingDateLabel(meetingDate: Date): string {
  return meetingDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function monthLabelToMonth(label: string, useSecondMonth: boolean): number | null {
  const normalized = label.split("/")[useSecondMonth ? 1 : 0] ?? label;
  const key = normalized.slice(0, 3).toLowerCase();
  const monthMap: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };

  return monthMap[key] ?? null;
}

function parseMeetingDate(year: number, monthLabel: string, dayLabel: string): Date | null {
  const dayMatch = dayLabel.match(/(\d{1,2})(?:-(\d{1,2}))?/);

  if (!dayMatch) {
    return null;
  }

  const endDay = Number(dayMatch[2] ?? dayMatch[1]);
  const useSecondMonth = monthLabel.includes("/") && Boolean(dayMatch[2]);
  const month = monthLabelToMonth(monthLabel, useSecondMonth);

  if (month === null) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month, endDay));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMeetingSchedule(calendarHtml: string): MeetingRecord[] {
  const currentYear = new Date().getUTCFullYear();
  const text = cleanMultilineText(calendarHtml) ?? "";
  const sectionPattern = /(\d{4}) FOMC Meetings([\s\S]*?)(?=\d{4} FOMC Meetings|$)/g;
  const meetings: MeetingRecord[] = [];

  for (const match of text.matchAll(sectionPattern)) {
    const year = Number(match[1]);

    if (year < currentYear - 1) {
      continue;
    }

    const lines = match[2]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (let index = 0; index < lines.length - 1; index += 1) {
      const monthLabel = lines[index];
      const dayLabel = lines[index + 1];

      if (!/^[A-Z][a-z]+(?:\/[A-Z][a-z]+)?$/.test(monthLabel)) {
        continue;
      }

      if (!/^\d{1,2}(?:-\d{1,2})?(?:\s*\(notation vote\))?\*?$/.test(dayLabel)) {
        continue;
      }

      const meetingDate = parseMeetingDate(year, monthLabel, dayLabel);

      if (!meetingDate) {
        continue;
      }

      const hasProjectionMarker = dayLabel.includes("*");
      const isNotationVote = dayLabel.toLowerCase().includes("notation vote");
      const descriptionParts = [
        hasProjectionMarker
          ? "Meeting associated with a Summary of Economic Projections."
          : null,
        isNotationVote ? "Notation vote." : null,
      ].filter(Boolean);

      meetings.push({
        meetingDate,
        title: `FOMC Meeting - ${monthLabel} ${dayLabel.replace("*", "").trim()}, ${year}`,
        description: descriptionParts.length > 0 ? descriptionParts.join(" ") : null,
      });
    }
  }

  return meetings;
}

function parseDocumentLinks(
  calendarHtml: string,
  type: "FOMC_MINUTES" | "FOMC_PROJECTIONS",
): Map<string, { htmlUrl: string | null; pdfUrl: string | null }> {
  const suffix = type === CentralBankDocumentType.FOMC_MINUTES ? "fomcminutes" : "fomcprojtabl";
  const matches = [
    ...calendarHtml.matchAll(
      new RegExp(
        `href=["']([^"']*${suffix}(\\d{8})\\.(pdf|htm)[^"']*)["']`,
        "gi",
      ),
    ),
  ];
  const linkMap = new Map<string, { htmlUrl: string | null; pdfUrl: string | null }>();

  for (const match of matches) {
    const url = normalizeUrl(match[1]);
    const dateKey = match[2];
    const extension = match[3].toLowerCase();
    const existing = linkMap.get(dateKey) ?? {
      htmlUrl: null,
      pdfUrl: null,
    };

    if (extension === "pdf") {
      existing.pdfUrl = url;
    } else {
      existing.htmlUrl = url;
    }

    linkMap.set(dateKey, existing);
  }

  return linkMap;
}

function formatDateKey(value: Date): string {
  return value.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchFedChairSpeechDocuments(): Promise<CentralBankDocumentInput[]> {
  const xml = await fetchText(
    FED_POWELL_FEED_URL,
    "application/rss+xml, application/atom+xml, application/xml, text/xml",
  );
  const entries = parsePowellFeed(xml);
  const pageResults = await Promise.all(
    entries.map(async (entry) => {
      const pageDetails = await fetchPageDetails(entry.url);

      return {
        institution: CentralBankInstitution.FEDERAL_RESERVE,
        documentType: CentralBankDocumentType.CHAIR_SPEECH,
        externalKey: entry.url,
        title: entry.title,
        url: entry.url,
        pdfUrl: pageDetails.pdfUrl,
        sourceFeed: FED_POWELL_FEED_URL,
        speaker: "Jerome H. Powell",
        publishedAt: entry.publishedAt,
        meetingDate: null,
        description: pageDetails.description ?? entry.description,
        content: pageDetails.content,
        contentHash: hashContent([
          entry.title,
          entry.url,
          pageDetails.description ?? entry.description,
          pageDetails.content,
        ]),
      } satisfies CentralBankDocumentInput;
    }),
  );

  return pageResults;
}

async function fetchFedFomcDocuments(): Promise<CentralBankDocumentInput[]> {
  const calendarHtml = await fetchText(
    FED_FOMC_CALENDAR_URL,
    "text/html,application/xhtml+xml",
  );
  const meetings = parseMeetingSchedule(calendarHtml);
  const meetingByDateKey = new Map(
    meetings.map((meeting) => [formatDateKey(meeting.meetingDate), meeting]),
  );
  const minuteLinks = parseDocumentLinks(
    calendarHtml,
    CentralBankDocumentType.FOMC_MINUTES,
  );
  const projectionLinks = parseDocumentLinks(
    calendarHtml,
    CentralBankDocumentType.FOMC_PROJECTIONS,
  );

  const releaseSources = [
    ...[...minuteLinks.entries()].map(([dateKey, links]) => ({
      dateKey,
      links,
      documentType: CentralBankDocumentType.FOMC_MINUTES,
    })),
    ...[...projectionLinks.entries()].map(([dateKey, links]) => ({
      dateKey,
      links,
      documentType: CentralBankDocumentType.FOMC_PROJECTIONS,
    })),
  ];
  const releaseDocuments = await Promise.all(
    releaseSources.map(
      async ({ dateKey, links, documentType }): Promise<CentralBankDocumentInput> => {
        const htmlUrl = links.htmlUrl;
        const meeting = meetingByDateKey.get(dateKey);
        const meetingDate =
          meeting?.meetingDate ??
          toDate(
            `${dateKey.slice(0, 4)}-${dateKey.slice(4, 6)}-${dateKey.slice(6, 8)}T00:00:00.000Z`,
          );

        if (!meetingDate) {
          throw new Error(`Unable to derive meeting date for ${dateKey}`);
        }

        const pageDetails = htmlUrl
          ? await fetchPageDetails(htmlUrl)
          : { description: null, content: null, pdfUrl: null };
        const titlePrefix =
          documentType === CentralBankDocumentType.FOMC_MINUTES
            ? "FOMC Minutes"
            : "FOMC Projections";

        return {
          institution: CentralBankInstitution.FEDERAL_RESERVE,
          documentType,
          externalKey:
            htmlUrl ??
            links.pdfUrl ??
            `federal-reserve:${documentType.toLowerCase()}:${dateKey}`,
          title: meeting
            ? `${titlePrefix} - ${meeting.title.replace("FOMC Meeting - ", "")}`
            : `${titlePrefix} - ${formatMeetingDateLabel(meetingDate)}`,
          url: htmlUrl,
          pdfUrl: links.pdfUrl ?? pageDetails.pdfUrl,
          sourceFeed: FED_FOMC_CALENDAR_URL,
          speaker: null,
          publishedAt: meetingDate,
          meetingDate,
          description: pageDetails.description,
          content: pageDetails.content,
          contentHash: hashContent([
            titlePrefix,
            htmlUrl,
            links.pdfUrl,
            pageDetails.description,
            pageDetails.content,
          ]),
        };
      },
    ),
  );

  return releaseDocuments;
}

function deduplicateDocuments(
  documents: CentralBankDocumentInput[],
): CentralBankDocumentInput[] {
  const deduplicated = new Map<string, CentralBankDocumentInput>();

  for (const document of documents) {
    const existing = deduplicated.get(document.externalKey);

    if (!existing) {
      deduplicated.set(document.externalKey, document);
      continue;
    }

    deduplicated.set(document.externalKey, {
      ...existing,
      title: existing.title.length >= document.title.length ? existing.title : document.title,
      url: existing.url ?? document.url,
      pdfUrl: existing.pdfUrl ?? document.pdfUrl,
      sourceFeed: existing.sourceFeed ?? document.sourceFeed,
      speaker: existing.speaker ?? document.speaker,
      description: existing.description ?? document.description,
      content: existing.content ?? document.content,
      contentHash: existing.contentHash ?? document.contentHash,
    });
  }

  return [...deduplicated.values()];
}

export async function fetchFederalReserveDocuments(): Promise<
  CentralBankDocumentInput[]
> {
  const [meetingsResult, speechesResult] = await Promise.allSettled([
    fetchFedFomcDocuments(),
    fetchFedChairSpeechDocuments(),
  ]);
  const documents: CentralBankDocumentInput[] = [];

  if (meetingsResult.status === "fulfilled") {
    documents.push(...meetingsResult.value);
  } else {
    console.error("Federal Reserve FOMC fetch failed", meetingsResult.reason);
  }

  if (speechesResult.status === "fulfilled") {
    documents.push(...speechesResult.value);
  } else {
    console.error("Federal Reserve chair speech fetch failed", speechesResult.reason);
  }

  return deduplicateDocuments(documents);
}

export type { CentralBankDocumentInput };
