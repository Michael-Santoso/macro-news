import {
  AnnouncementDocumentType,
  AnnouncementInstitution,
  AnnouncementRegion,
} from "@prisma/client";
import {
  fetchPageDetails,
  fetchText,
  hashContent,
  parseFeed,
} from "./official-announcement.utils";
import type { FeedEntry, OfficialAnnouncementInput } from "./official-announcement.types";

const ECB_BASE_URL = "https://www.ecb.europa.eu";
const ECB_PRESS_FEED_URL = "https://www.ecb.europa.eu/rss/press.html";
const ECB_OPERATIONS_FEED_URL = "https://www.ecb.europa.eu/rss/operations.html";

function classifyEcbEntry(
  entry: FeedEntry,
): AnnouncementDocumentType | null {
  const title = entry.title.toLowerCase();
  const url = entry.url.toLowerCase();

  if (
    title.includes("monetary policy decisions") ||
    title.includes("interest rates") ||
    url.includes("/press/pr/date/")
  ) {
    return AnnouncementDocumentType.RATE_DECISION;
  }

  if (
    title.includes("monetary policy statement") ||
    title.includes("press conference") ||
    url.includes("/press/press_conference/")
  ) {
    return AnnouncementDocumentType.PRESS_CONFERENCE_TRANSCRIPT;
  }

  if (title.includes("account of the monetary policy meeting") || url.includes("/press/accounts/")) {
    return AnnouncementDocumentType.MINUTES;
  }

  if (title.includes("asset purchase") || title.includes("pepp") || title.includes("app")) {
    return AnnouncementDocumentType.ASSET_PURCHASE_PROGRAM;
  }

  if (title.includes("speech") || title.includes("remarks") || url.includes("/press/key/")) {
    return AnnouncementDocumentType.SPEECH;
  }

  return null;
}

function shouldKeepEcbEntry(entry: FeedEntry): boolean {
  return classifyEcbEntry(entry) !== null;
}

async function toAnnouncement(entry: FeedEntry, sourceFeed: string): Promise<OfficialAnnouncementInput> {
  const pageDetails = await fetchPageDetails(entry.url);
  const documentType = classifyEcbEntry(entry);

  if (!documentType) {
    throw new Error(`Unsupported ECB entry: ${entry.url}`);
  }

  return {
    institution: AnnouncementInstitution.EUROPEAN_CENTRAL_BANK,
    region: AnnouncementRegion.EUROPE,
    documentType,
    externalKey: entry.url,
    title: entry.title,
    url: entry.url,
    pdfUrl: pageDetails.pdfUrl,
    sourceFeed,
    speaker: null,
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
  };
}

export async function fetchEuropeanCentralBankAnnouncements(): Promise<
  OfficialAnnouncementInput[]
> {
  const [pressXml, operationsXml] = await Promise.all([
    fetchText(ECB_PRESS_FEED_URL, "application/rss+xml, application/xml, text/xml"),
    fetchText(ECB_OPERATIONS_FEED_URL, "application/rss+xml, application/xml, text/xml"),
  ]);

  const entries = [
    ...parseFeed(pressXml, ECB_BASE_URL).map((entry) => ({
      entry,
      sourceFeed: ECB_PRESS_FEED_URL,
    })),
    ...parseFeed(operationsXml, ECB_BASE_URL).map((entry) => ({
      entry,
      sourceFeed: ECB_OPERATIONS_FEED_URL,
    })),
  ].filter(({ entry }) => shouldKeepEcbEntry(entry));

  return Promise.all(entries.map(({ entry, sourceFeed }) => toAnnouncement(entry, sourceFeed)));
}
