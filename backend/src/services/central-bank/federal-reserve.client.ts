import {
  AnnouncementDocumentType,
  AnnouncementInstitution,
  AnnouncementRegion,
} from "@prisma/client";
import {
  cleanMultilineText,
  fetchPageDetails,
  fetchText,
  hashContent,
  normalizeUrl,
  parseFeed,
  toDate,
} from "./official-announcement.utils";
import type { OfficialAnnouncementInput } from "./official-announcement.types";

const FED_BASE_URL = "https://www.federalreserve.gov";
const FED_FOMC_CALENDAR_URL =
  "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
const FED_POWELL_FEED_URL = "https://www.federalreserve.gov/feeds/s_t_powell.xml";

type MeetingRecord = {
  meetingDate: Date;
  title: string;
  description: string | null;
};

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
  type: "MINUTES" | "PROJECTIONS",
): Map<string, { htmlUrl: string | null; pdfUrl: string | null }> {
  const suffix = type === "MINUTES" ? "fomcminutes" : "fomcprojtabl";
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
    const url = normalizeUrl(match[1], FED_BASE_URL);
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

async function fetchFedChairSpeechDocuments(): Promise<OfficialAnnouncementInput[]> {
  const xml = await fetchText(
    FED_POWELL_FEED_URL,
    "application/rss+xml, application/atom+xml, application/xml, text/xml",
  );
  const entries = parseFeed(xml, FED_BASE_URL);

  return Promise.all(
    entries.map(async (entry) => {
      const pageDetails = await fetchPageDetails(entry.url);

      return {
        institution: AnnouncementInstitution.FEDERAL_RESERVE,
        region: AnnouncementRegion.US,
        documentType: AnnouncementDocumentType.SPEECH,
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
      } satisfies OfficialAnnouncementInput;
    }),
  );
}

async function fetchFedFomcDocuments(): Promise<OfficialAnnouncementInput[]> {
  const calendarHtml = await fetchText(
    FED_FOMC_CALENDAR_URL,
    "text/html,application/xhtml+xml",
  );
  const meetings = parseMeetingSchedule(calendarHtml);
  const meetingByDateKey = new Map(
    meetings.map((meeting) => [formatDateKey(meeting.meetingDate), meeting]),
  );
  const minuteLinks = parseDocumentLinks(calendarHtml, "MINUTES");
  const projectionLinks = parseDocumentLinks(calendarHtml, "PROJECTIONS");

  const releaseSources = [
    ...[...minuteLinks.entries()].map(([dateKey, links]) => ({
      dateKey,
      links,
      documentType: AnnouncementDocumentType.MINUTES,
    })),
    ...[...projectionLinks.entries()].map(([dateKey, links]) => ({
      dateKey,
      links,
      documentType: AnnouncementDocumentType.PROJECTIONS,
    })),
  ];

  return Promise.all(
    releaseSources.map(async ({ dateKey, links, documentType }) => {
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
        documentType === AnnouncementDocumentType.MINUTES
          ? "FOMC Minutes"
          : "FOMC Projections";

      return {
        institution: AnnouncementInstitution.FEDERAL_RESERVE,
        region: AnnouncementRegion.US,
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
        description: pageDetails.description ?? meeting?.description ?? null,
        content: pageDetails.content,
        contentHash: hashContent([
          titlePrefix,
          htmlUrl,
          links.pdfUrl,
          pageDetails.description,
          pageDetails.content,
        ]),
      } satisfies OfficialAnnouncementInput;
    }),
  );
}

function deduplicateDocuments(
  documents: OfficialAnnouncementInput[],
): OfficialAnnouncementInput[] {
  const deduplicated = new Map<string, OfficialAnnouncementInput>();

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
  OfficialAnnouncementInput[]
> {
  const [meetingsResult, speechesResult] = await Promise.allSettled([
    fetchFedFomcDocuments(),
    fetchFedChairSpeechDocuments(),
  ]);
  const documents: OfficialAnnouncementInput[] = [];

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
