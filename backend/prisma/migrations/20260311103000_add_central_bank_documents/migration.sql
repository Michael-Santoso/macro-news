CREATE TYPE "CentralBankInstitution" AS ENUM ('FEDERAL_RESERVE');

CREATE TYPE "CentralBankDocumentType" AS ENUM (
    'FOMC_MEETING',
    'FOMC_MINUTES',
    'FOMC_PROJECTIONS',
    'CHAIR_SPEECH'
);

CREATE TABLE "CentralBankDocument" (
    "id" TEXT NOT NULL,
    "institution" "CentralBankInstitution" NOT NULL,
    "documentType" "CentralBankDocumentType" NOT NULL,
    "externalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "pdfUrl" TEXT,
    "sourceFeed" TEXT,
    "speaker" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "description" TEXT,
    "content" TEXT,
    "contentHash" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CentralBankDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CentralBankDocument_externalKey_key" ON "CentralBankDocument"("externalKey");
