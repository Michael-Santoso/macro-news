-- CreateEnum
CREATE TYPE "RegulatoryInstitution" AS ENUM ('SEC', 'FCA', 'MAS', 'ESMA', 'WTO', 'US_COMMERCE', 'EUROPEAN_COMMISSION');

-- CreateEnum
CREATE TYPE "RegulatoryJurisdiction" AS ENUM ('US', 'UK', 'SG', 'EU', 'GLOBAL');

-- CreateEnum
CREATE TYPE "RegulatoryCategory" AS ENUM ('FINANCIAL_REGULATION', 'TRADE_POLICY', 'GEOPOLITICAL_REGULATION', 'AI_REGULATION', 'BANK_CAPITAL', 'ENERGY_POLICY', 'ENVIRONMENTAL_RULES', 'GENERAL_REGULATION');

-- CreateEnum
CREATE TYPE "RegulatoryDocumentType" AS ENUM ('PRESS_RELEASE', 'SPEECH', 'CONSULTATION', 'PROPOSED_RULE', 'FINAL_RULE', 'GUIDANCE', 'CIRCULAR', 'ENFORCEMENT_ACTION', 'FAQ', 'REPORT', 'NOTICE');

-- CreateEnum
CREATE TYPE "RegulatorySourceType" AS ENUM ('RSS', 'API', 'HTML', 'PDF');

-- CreateTable
CREATE TABLE "RegulatoryAnnouncement" (
    "id" TEXT NOT NULL,
    "institution" "RegulatoryInstitution" NOT NULL,
    "jurisdiction" "RegulatoryJurisdiction" NOT NULL,
    "category" "RegulatoryCategory" NOT NULL,
    "documentType" "RegulatoryDocumentType" NOT NULL,
    "sourceType" "RegulatorySourceType" NOT NULL,
    "externalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "pdfUrl" TEXT,
    "sourceFeed" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "effectiveAt" TIMESTAMP(3),
    "commentDeadline" TIMESTAMP(3),
    "summary" TEXT,
    "content" TEXT,
    "contentHash" TEXT,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegulatoryAnnouncement_externalKey_key" ON "RegulatoryAnnouncement"("externalKey");
