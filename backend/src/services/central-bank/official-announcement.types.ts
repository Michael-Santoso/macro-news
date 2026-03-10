import type {
  AnnouncementDocumentType,
  AnnouncementInstitution,
  AnnouncementRegion,
} from "@prisma/client";

export type OfficialAnnouncementInput = {
  institution: AnnouncementInstitution;
  region: AnnouncementRegion;
  documentType: AnnouncementDocumentType;
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

export type FeedEntry = {
  title: string;
  url: string;
  description: string | null;
  publishedAt: Date;
};
