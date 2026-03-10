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

const BOJ_BASE_URL = "https://www.boj.or.jp";
const BOJ_FEED_URL = "https://www.boj.or.jp/en/rss/whatsnew.xml";

function classifyBojEntry(entry: FeedEntry): AnnouncementDocumentType | null {
  const title = entry.title.toLowerCase();
  const url = entry.url.toLowerCase();

  if (title.includes("statement on monetary policy") || url.includes("/mopo/mpmdeci/state_")) {
    return AnnouncementDocumentType.MONETARY_POLICY_STATEMENT;
  }

  if (title.includes("outlook for economic activity and prices") || url.includes("/mopo/outlook/")) {
    return AnnouncementDocumentType.MONETARY_POLICY_REPORT;
  }

  if (title.includes("speech") || title.includes("remarks") || url.includes("/announcements/press/koen_")) {
    return AnnouncementDocumentType.SPEECH;
  }

  return null;
}

export async function fetchBankOfJapanAnnouncements(): Promise<
  OfficialAnnouncementInput[]
> {
  const xml = await fetchText(
    BOJ_FEED_URL,
    "application/rss+xml, application/xml, text/xml",
  );
  const entries = parseFeed(xml, BOJ_BASE_URL).filter(
    (entry) => classifyBojEntry(entry) !== null,
  );

  return Promise.all(
    entries.map(async (entry) => {
      const pageDetails = await fetchPageDetails(entry.url);
      const documentType = classifyBojEntry(entry);

      if (!documentType) {
        throw new Error(`Unsupported Bank of Japan entry: ${entry.url}`);
      }

      return {
        institution: AnnouncementInstitution.BANK_OF_JAPAN,
        region: AnnouncementRegion.JAPAN,
        documentType,
        externalKey: entry.url,
        title: entry.title,
        url: entry.url,
        pdfUrl: pageDetails.pdfUrl,
        sourceFeed: BOJ_FEED_URL,
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
