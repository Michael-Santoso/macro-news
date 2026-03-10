import {
  type CentralBankDocument,
  type CentralBankDocumentType,
  Prisma,
} from "@prisma/client";
import prisma from "../../lib/prisma";
import { publishCentralBankDocumentJob } from "../queue";
import type { CentralBankDocumentInput } from "./federal-reserve.client";

type StoredCentralBankDocument = Pick<
  CentralBankDocument,
  | "id"
  | "institution"
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
  documents: CentralBankDocumentInput[],
): CentralBankDocumentInput[] {
  const uniqueDocuments = new Map<string, CentralBankDocumentInput>();

  for (const document of documents) {
    if (!uniqueDocuments.has(document.externalKey)) {
      uniqueDocuments.set(document.externalKey, document);
    }
  }

  return [...uniqueDocuments.values()];
}

function hasDocumentChanged(
  existingDocument: StoredCentralBankDocument,
  incomingDocument: CentralBankDocumentInput,
): boolean {
  return (
    existingDocument.title !== incomingDocument.title ||
    existingDocument.url !== incomingDocument.url ||
    existingDocument.pdfUrl !== incomingDocument.pdfUrl ||
    existingDocument.sourceFeed !== incomingDocument.sourceFeed ||
    existingDocument.speaker !== incomingDocument.speaker ||
    existingDocument.publishedAt.getTime() !== incomingDocument.publishedAt.getTime() ||
    existingDocument.meetingDate?.getTime() !== incomingDocument.meetingDate?.getTime() ||
    existingDocument.description !== incomingDocument.description ||
    existingDocument.content !== incomingDocument.content ||
    existingDocument.contentHash !== incomingDocument.contentHash
  );
}

function isQueueableDocumentType(
  documentType: CentralBankDocumentType,
): documentType is "FOMC_MINUTES" | "FOMC_PROJECTIONS" | "CHAIR_SPEECH" {
  return (
    documentType === "FOMC_MINUTES" ||
    documentType === "FOMC_PROJECTIONS" ||
    documentType === "CHAIR_SPEECH"
  );
}

export async function storeCentralBankDocuments(
  documents: CentralBankDocumentInput[],
): Promise<number> {
  if (documents.length === 0) {
    return 0;
  }

  const deduplicatedDocuments = deduplicateDocuments(documents);
  const existingDocuments = await prisma.centralBankDocument.findMany({
    where: {
      externalKey: {
        in: deduplicatedDocuments.map((document) => document.externalKey),
      },
    },
    select: {
      id: true,
      institution: true,
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
      ? await updateCentralBankDocument(existingDocument, document)
      : await createCentralBankDocument(document);

    if (!storedDocument) {
      continue;
    }

    storedCount += 1;

    if (!isQueueableDocumentType(storedDocument.documentType)) {
      continue;
    }

    try {
      await publishCentralBankDocumentJob({
        jobType: "process_central_bank_document",
        centralBankDocumentId: storedDocument.id,
        institution: storedDocument.institution,
        documentType: storedDocument.documentType,
        publishedAt: storedDocument.publishedAt.toISOString(),
        url: storedDocument.url,
      });
    } catch (error) {
      console.error(
        `Queue publish failed for central bank document ${storedDocument.id}`,
        error,
      );
    }
  }

  return storedCount;
}

async function createCentralBankDocument(
  document: CentralBankDocumentInput,
): Promise<StoredCentralBankDocument | null> {
  try {
    return await prisma.centralBankDocument.create({
      data: document,
      select: {
        id: true,
        institution: true,
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

async function updateCentralBankDocument(
  existingDocument: StoredCentralBankDocument,
  incomingDocument: CentralBankDocumentInput,
): Promise<StoredCentralBankDocument | null> {
  if (!hasDocumentChanged(existingDocument, incomingDocument)) {
    return null;
  }

  return prisma.centralBankDocument.update({
    where: {
      externalKey: existingDocument.externalKey,
    },
    data: {
      institution: incomingDocument.institution,
      documentType: incomingDocument.documentType,
      title: incomingDocument.title,
      url: incomingDocument.url,
      pdfUrl: incomingDocument.pdfUrl,
      sourceFeed: incomingDocument.sourceFeed,
      speaker: incomingDocument.speaker,
      publishedAt: incomingDocument.publishedAt,
      meetingDate: incomingDocument.meetingDate,
      description: incomingDocument.description,
      content: incomingDocument.content,
      contentHash: incomingDocument.contentHash,
      processingStatus: "PENDING",
    },
    select: {
      id: true,
      institution: true,
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
