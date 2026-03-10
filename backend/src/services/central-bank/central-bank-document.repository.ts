import { Prisma, type OfficialAnnouncement } from "@prisma/client";
import prisma from "../../lib/prisma";
import { publishOfficialAnnouncementJob } from "../queue";
import type { OfficialAnnouncementInput } from "./official-announcement.types";

type StoredOfficialAnnouncement = Pick<
  OfficialAnnouncement,
  | "id"
  | "institution"
  | "region"
  | "documentType"
  | "externalKey"
  | "url"
  | "pdfUrl"
  | "sourceFeed"
  | "speaker"
  | "publishedAt"
  | "meetingDate"
  | "title"
  | "description"
  | "content"
  | "contentHash"
>;

function deduplicateDocuments(
  documents: OfficialAnnouncementInput[],
): OfficialAnnouncementInput[] {
  const uniqueDocuments = new Map<string, OfficialAnnouncementInput>();

  for (const document of documents) {
    if (!uniqueDocuments.has(document.externalKey)) {
      uniqueDocuments.set(document.externalKey, document);
    }
  }

  return [...uniqueDocuments.values()];
}

function hasAnnouncementChanged(
  existingAnnouncement: StoredOfficialAnnouncement,
  incomingAnnouncement: OfficialAnnouncementInput,
): boolean {
  return (
    existingAnnouncement.title !== incomingAnnouncement.title ||
    existingAnnouncement.institution !== incomingAnnouncement.institution ||
    existingAnnouncement.region !== incomingAnnouncement.region ||
    existingAnnouncement.documentType !== incomingAnnouncement.documentType ||
    existingAnnouncement.url !== incomingAnnouncement.url ||
    existingAnnouncement.pdfUrl !== incomingAnnouncement.pdfUrl ||
    existingAnnouncement.sourceFeed !== incomingAnnouncement.sourceFeed ||
    existingAnnouncement.speaker !== incomingAnnouncement.speaker ||
    existingAnnouncement.publishedAt.getTime() !== incomingAnnouncement.publishedAt.getTime() ||
    existingAnnouncement.meetingDate?.getTime() !== incomingAnnouncement.meetingDate?.getTime() ||
    existingAnnouncement.description !== incomingAnnouncement.description ||
    existingAnnouncement.content !== incomingAnnouncement.content ||
    existingAnnouncement.contentHash !== incomingAnnouncement.contentHash
  );
}

export async function storeOfficialAnnouncements(
  documents: OfficialAnnouncementInput[],
): Promise<number> {
  if (documents.length === 0) {
    return 0;
  }

  const deduplicatedDocuments = deduplicateDocuments(documents);
  const existingDocuments = await prisma.officialAnnouncement.findMany({
    where: {
      externalKey: {
        in: deduplicatedDocuments.map((document) => document.externalKey),
      },
    },
    select: {
      id: true,
      institution: true,
      region: true,
      documentType: true,
      externalKey: true,
      url: true,
      pdfUrl: true,
      sourceFeed: true,
      speaker: true,
      publishedAt: true,
      meetingDate: true,
      title: true,
      description: true,
      content: true,
      contentHash: true,
    },
  });
  const existingByKey = new Map(
    existingDocuments.map((document) => [document.externalKey, document]),
  );
  let storedCount = 0;

  for (const document of deduplicatedDocuments) {
    const existingDocument = existingByKey.get(document.externalKey);
    const storedDocument = existingDocument
      ? await updateOfficialAnnouncement(existingDocument, document)
      : await createOfficialAnnouncement(document);

    if (!storedDocument) {
      continue;
    }

    storedCount += 1;

    try {
      await publishOfficialAnnouncementJob({
        jobType: "process_official_announcement",
        officialAnnouncementId: storedDocument.id,
        institution: storedDocument.institution,
        region: storedDocument.region,
        documentType: storedDocument.documentType,
        publishedAt: storedDocument.publishedAt.toISOString(),
        url: storedDocument.url,
      });
    } catch (error) {
      console.error(
        `Queue publish failed for official announcement ${storedDocument.id}`,
        error,
      );
    }
  }

  return storedCount;
}

async function createOfficialAnnouncement(
  document: OfficialAnnouncementInput,
): Promise<StoredOfficialAnnouncement | null> {
  try {
    return await prisma.officialAnnouncement.create({
      data: document,
      select: {
        id: true,
        institution: true,
        region: true,
        documentType: true,
        externalKey: true,
        url: true,
        pdfUrl: true,
        sourceFeed: true,
        speaker: true,
        publishedAt: true,
        meetingDate: true,
        title: true,
        description: true,
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

async function updateOfficialAnnouncement(
  existingAnnouncement: StoredOfficialAnnouncement,
  incomingAnnouncement: OfficialAnnouncementInput,
): Promise<StoredOfficialAnnouncement | null> {
  if (!hasAnnouncementChanged(existingAnnouncement, incomingAnnouncement)) {
    return null;
  }

  return prisma.officialAnnouncement.update({
    where: {
      externalKey: existingAnnouncement.externalKey,
    },
    data: {
      institution: incomingAnnouncement.institution,
      region: incomingAnnouncement.region,
      documentType: incomingAnnouncement.documentType,
      title: incomingAnnouncement.title,
      url: incomingAnnouncement.url,
      pdfUrl: incomingAnnouncement.pdfUrl,
      sourceFeed: incomingAnnouncement.sourceFeed,
      speaker: incomingAnnouncement.speaker,
      publishedAt: incomingAnnouncement.publishedAt,
      meetingDate: incomingAnnouncement.meetingDate,
      description: incomingAnnouncement.description,
      content: incomingAnnouncement.content,
      contentHash: incomingAnnouncement.contentHash,
      processingStatus: "PENDING",
    },
    select: {
      id: true,
      institution: true,
      region: true,
      documentType: true,
      externalKey: true,
      url: true,
      pdfUrl: true,
      sourceFeed: true,
      speaker: true,
      publishedAt: true,
      meetingDate: true,
      title: true,
      description: true,
      content: true,
      contentHash: true,
    },
  });
}
