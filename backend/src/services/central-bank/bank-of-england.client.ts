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

const BOE_BASE_URL = "https://www.bankofengland.co.uk";
const BOE_NEWS_FEED_URL = "https://www.bankofengland.co.uk/rss/news";
const BOE_SPEECHES_FEED_URL = "https://www.bankofengland.co.uk/rss/speeches";

function classifyBoeEntry(entry: FeedEntry): AnnouncementDocumentType | null {
  const title = entry.title.toLowerCase();
  const url = entry.url.toLowerCase();

  if (
    title.includes("monetary policy summary and minutes") ||
    url.includes("/monetary-policy-summary-and-minutes/")
  ) {
    return AnnouncementDocumentType.RATE_DECISION;
  }

  if (title.includes("monetary policy report") || url.includes("/monetary-policy-report/")) {
    return AnnouncementDocumentType.MONETARY_POLICY_REPORT;
  }

  if (url.includes("/speech/") || title.includes("speech") || title.includes("remarks")) {
    return AnnouncementDocumentType.SPEECH;
  }

  return null;
}

export async function fetchBankOfEnglandAnnouncements(): Promise<
  OfficialAnnouncementInput[]
> {
  const [newsXml, speechesXml] = await Promise.all([
    fetchText(BOE_NEWS_FEED_URL, "application/rss+xml, application/xml, text/xml"),
    fetchText(BOE_SPEECHES_FEED_URL, "application/rss+xml, application/xml, text/xml"),
  ]);

  const entries = [
    ...parseFeed(newsXml, BOE_BASE_URL).map((entry) => ({
      entry,
      sourceFeed: BOE_NEWS_FEED_URL,
    })),
    ...parseFeed(speechesXml, BOE_BASE_URL).map((entry) => ({
      entry,
      sourceFeed: BOE_SPEECHES_FEED_URL,
    })),
  ].filter(({ entry }) => classifyBoeEntry(entry) !== null);

  return Promise.all(
    entries.map(async ({ entry, sourceFeed }) => {
      const pageDetails = await fetchPageDetails(entry.url);
      const documentType = classifyBoeEntry(entry);

      if (!documentType) {
        throw new Error(`Unsupported Bank of England entry: ${entry.url}`);
      }

      return {
        institution: AnnouncementInstitution.BANK_OF_ENGLAND,
        region: AnnouncementRegion.UNITED_KINGDOM,
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
      } satisfies OfficialAnnouncementInput;
    }),
  );
}
