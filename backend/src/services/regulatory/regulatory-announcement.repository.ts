import { Prisma, type RegulatoryAnnouncement } from "@prisma/client";
import prisma from "../../lib/prisma";
import { publishRegulatoryAnnouncementJob } from "../queue";
import type { RegulatoryAnnouncementInput } from "./regulatory-sources.client";

type StoredRegulatoryAnnouncement = Pick<
  RegulatoryAnnouncement,
  | "id"
  | "institution"
  | "jurisdiction"
  | "category"
  | "documentType"
  | "sourceType"
  | "externalKey"
  | "title"
  | "url"
  | "pdfUrl"
  | "sourceFeed"
  | "publishedAt"
  | "effectiveAt"
  | "commentDeadline"
  | "summary"
  | "content"
  | "contentHash"
>;

function hasAnnouncementChanged(
  existingAnnouncement: StoredRegulatoryAnnouncement,
  incomingAnnouncement: RegulatoryAnnouncementInput,
): boolean {
  return (
    existingAnnouncement.institution !== incomingAnnouncement.institution ||
    existingAnnouncement.jurisdiction !== incomingAnnouncement.jurisdiction ||
    existingAnnouncement.category !== incomingAnnouncement.category ||
    existingAnnouncement.documentType !== incomingAnnouncement.documentType ||
    existingAnnouncement.sourceType !== incomingAnnouncement.sourceType ||
    existingAnnouncement.title !== incomingAnnouncement.title ||
    existingAnnouncement.url !== incomingAnnouncement.url ||
    existingAnnouncement.pdfUrl !== incomingAnnouncement.pdfUrl ||
    existingAnnouncement.sourceFeed !== incomingAnnouncement.sourceFeed ||
    existingAnnouncement.publishedAt.getTime() !== incomingAnnouncement.publishedAt.getTime() ||
    existingAnnouncement.effectiveAt?.getTime() !== incomingAnnouncement.effectiveAt?.getTime() ||
    existingAnnouncement.commentDeadline?.getTime() !== incomingAnnouncement.commentDeadline?.getTime() ||
    existingAnnouncement.summary !== incomingAnnouncement.summary ||
    existingAnnouncement.content !== incomingAnnouncement.content ||
    existingAnnouncement.contentHash !== incomingAnnouncement.contentHash
  );
}

export async function storeRegulatoryAnnouncements(
  announcements: RegulatoryAnnouncementInput[],
): Promise<number> {
  if (announcements.length === 0) {
    return 0;
  }

  const existingAnnouncements = await prisma.regulatoryAnnouncement.findMany({
    where: {
      externalKey: {
        in: announcements.map((announcement) => announcement.externalKey),
      },
    },
    select: {
      id: true,
      institution: true,
      jurisdiction: true,
      category: true,
      documentType: true,
      sourceType: true,
      externalKey: true,
      title: true,
      url: true,
      pdfUrl: true,
      sourceFeed: true,
      publishedAt: true,
      effectiveAt: true,
      commentDeadline: true,
      summary: true,
      content: true,
      contentHash: true,
    },
  });
  const existingByKey = new Map(
    existingAnnouncements.map((announcement) => [announcement.externalKey, announcement]),
  );
  let storedCount = 0;

  for (const announcement of announcements) {
    const existingAnnouncement = existingByKey.get(announcement.externalKey);
    const storedAnnouncement = existingAnnouncement
      ? await updateRegulatoryAnnouncement(existingAnnouncement, announcement)
      : await createRegulatoryAnnouncement(announcement);

    if (!storedAnnouncement) {
      continue;
    }

    storedCount += 1;

    try {
      await publishRegulatoryAnnouncementJob({
        jobType: "process_regulatory_announcement",
        regulatoryAnnouncementId: storedAnnouncement.id,
        institution: storedAnnouncement.institution,
        jurisdiction: storedAnnouncement.jurisdiction,
        category: storedAnnouncement.category,
        documentType: storedAnnouncement.documentType,
        publishedAt: storedAnnouncement.publishedAt.toISOString(),
        url: storedAnnouncement.url,
      });
    } catch (error) {
      console.error(
        `Queue publish failed for regulatory announcement ${storedAnnouncement.id}`,
        error,
      );
    }
  }

  return storedCount;
}

async function createRegulatoryAnnouncement(
  announcement: RegulatoryAnnouncementInput,
): Promise<StoredRegulatoryAnnouncement | null> {
  try {
    return await prisma.regulatoryAnnouncement.create({
      data: announcement,
      select: {
        id: true,
        institution: true,
        jurisdiction: true,
        category: true,
        documentType: true,
        sourceType: true,
        externalKey: true,
        title: true,
        url: true,
        pdfUrl: true,
        sourceFeed: true,
        publishedAt: true,
        effectiveAt: true,
        commentDeadline: true,
        summary: true,
        content: true,
        contentHash: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }
}

async function updateRegulatoryAnnouncement(
  existingAnnouncement: StoredRegulatoryAnnouncement,
  incomingAnnouncement: RegulatoryAnnouncementInput,
): Promise<StoredRegulatoryAnnouncement | null> {
  if (!hasAnnouncementChanged(existingAnnouncement, incomingAnnouncement)) {
    return null;
  }

  return prisma.regulatoryAnnouncement.update({
    where: {
      externalKey: existingAnnouncement.externalKey,
    },
    data: {
      institution: incomingAnnouncement.institution,
      jurisdiction: incomingAnnouncement.jurisdiction,
      category: incomingAnnouncement.category,
      documentType: incomingAnnouncement.documentType,
      sourceType: incomingAnnouncement.sourceType,
      title: incomingAnnouncement.title,
      url: incomingAnnouncement.url,
      pdfUrl: incomingAnnouncement.pdfUrl,
      sourceFeed: incomingAnnouncement.sourceFeed,
      publishedAt: incomingAnnouncement.publishedAt,
      effectiveAt: incomingAnnouncement.effectiveAt,
      commentDeadline: incomingAnnouncement.commentDeadline,
      summary: incomingAnnouncement.summary,
      content: incomingAnnouncement.content,
      contentHash: incomingAnnouncement.contentHash,
      processingStatus: "PENDING",
    },
    select: {
      id: true,
      institution: true,
      jurisdiction: true,
      category: true,
      documentType: true,
      sourceType: true,
      externalKey: true,
      title: true,
      url: true,
      pdfUrl: true,
      sourceFeed: true,
      publishedAt: true,
      effectiveAt: true,
      commentDeadline: true,
      summary: true,
      content: true,
      contentHash: true,
    },
  });
}
