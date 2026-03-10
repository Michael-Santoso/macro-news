import {
  AnnouncementDocumentType,
  AnnouncementInstitution,
  AnnouncementRegion,
} from "@prisma/client";
import {
  cleanText,
  extractLinks,
  fetchPageDetails,
  fetchText,
  hashContent,
  normalizeUrl,
  toDate,
} from "./official-announcement.utils";
import type { OfficialAnnouncementInput } from "./official-announcement.types";

const PBOC_BASE_URL = "https://www.pbc.gov.cn";
const PBOC_SOURCE_FEEDS = [
  "https://www.pbc.gov.cn/en/3688229/3688335/3730270/index.html",
  "https://www.pbc.gov.cn/en/3688229/3688335/5844693/index.html",
  "https://www.pbc.gov.cn/en/3688229/3688311/3688329/index.html",
];

function classifyPbocPage(title: string, url: string): AnnouncementDocumentType | null {
  const text = `${title} ${url}`.toLowerCase();

  if (text.includes("reserve requirement ratio") || /\brrr\b/.test(text)) {
    return AnnouncementDocumentType.RESERVE_REQUIREMENT_RATIO;
  }

  if (text.includes("liquidity") || text.includes("open market") || text.includes("monetary policy instruments")) {
    return AnnouncementDocumentType.LIQUIDITY_OPERATION;
  }

  if (text.includes("property") || text.includes("housing") || text.includes("mortgage")) {
    return AnnouncementDocumentType.PROPERTY_SUPPORT;
  }

  if (text.includes("monetary policy committee") || text.includes("statement")) {
    return AnnouncementDocumentType.MONETARY_POLICY_STATEMENT;
  }

  if (text.includes("speech") || text.includes("remarks")) {
    return AnnouncementDocumentType.SPEECH;
  }

  return null;
}

function extractPublishedAt(html: string): Date | null {
  const match =
    html.match(/(\d{4})-(\d{2})-(\d{2})/) ??
    html.match(/(\d{4})\/(\d{2})\/(\d{2})/);

  if (!match) {
    return null;
  }

  return toDate(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function filterCandidateLinks(links: string[]): string[] {
  return links.filter((link) => {
    const normalized = link.toLowerCase();

    return (
      normalized.startsWith("https://www.pbc.gov.cn/en/") &&
      normalized.endsWith("/index.html") &&
      !normalized.includes("/en/3688006/")
    );
  });
}

async function fetchCandidateLinksFromSource(sourceUrl: string): Promise<string[]> {
  try {
    const html = await fetchText(sourceUrl, "text/html,application/xhtml+xml");
    return filterCandidateLinks(extractLinks(html, sourceUrl));
  } catch (error) {
    console.error(`PBOC source fetch failed for ${sourceUrl}`, error);
    return [];
  }
}

export async function fetchPeoplesBankOfChinaAnnouncements(): Promise<
  OfficialAnnouncementInput[]
> {
  const candidateLinkSets = await Promise.all(
    PBOC_SOURCE_FEEDS.map((sourceUrl) => fetchCandidateLinksFromSource(sourceUrl)),
  );
  const candidateLinks = [...new Set(candidateLinkSets.flat())].slice(0, 40);
  const announcementRequests: Array<Promise<OfficialAnnouncementInput | null>> =
    candidateLinks.map(async (url) => {
      try {
        const html = await fetchText(url, "text/html,application/xhtml+xml");
        const title =
          cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) ?? url;
        const documentType = classifyPbocPage(title, url);

        if (!documentType) {
          return null;
        }

        const pageDetails = await fetchPageDetails(url);
        const publishedAt = extractPublishedAt(html) ?? new Date();

        return {
          institution: AnnouncementInstitution.PEOPLES_BANK_OF_CHINA,
          region: AnnouncementRegion.CHINA,
          documentType,
          externalKey: url,
          title,
          url: normalizeUrl(url, PBOC_BASE_URL),
          pdfUrl: pageDetails.pdfUrl,
          sourceFeed: PBOC_SOURCE_FEEDS.find((sourceUrl) => url.startsWith(sourceUrl.replace("/index.html", "/"))) ?? PBOC_SOURCE_FEEDS[0],
          speaker: null,
          publishedAt,
          meetingDate: null,
          description: pageDetails.description,
          content: pageDetails.content,
          contentHash: hashContent([title, url, pageDetails.description, pageDetails.content]),
        } satisfies OfficialAnnouncementInput;
      } catch (error) {
        console.error(`PBOC page fetch failed for ${url}`, error);
        return null;
      }
    });
  const announcements = await Promise.all(announcementRequests);

  return announcements.filter(
    (announcement): announcement is OfficialAnnouncementInput => announcement !== null,
  );
}
