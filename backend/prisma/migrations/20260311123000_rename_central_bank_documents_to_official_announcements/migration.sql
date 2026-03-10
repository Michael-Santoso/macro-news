CREATE TYPE "AnnouncementInstitution" AS ENUM (
    'FEDERAL_RESERVE',
    'EUROPEAN_CENTRAL_BANK',
    'BANK_OF_ENGLAND',
    'BANK_OF_JAPAN',
    'PEOPLES_BANK_OF_CHINA'
);

CREATE TYPE "AnnouncementRegion" AS ENUM (
    'US',
    'EUROPE',
    'UNITED_KINGDOM',
    'JAPAN',
    'CHINA'
);

CREATE TYPE "AnnouncementDocumentType" AS ENUM (
    'RATE_DECISION',
    'MONETARY_POLICY_STATEMENT',
    'PRESS_CONFERENCE_TRANSCRIPT',
    'MINUTES',
    'PROJECTIONS',
    'MONETARY_POLICY_REPORT',
    'SPEECH',
    'LIQUIDITY_OPERATION',
    'ASSET_PURCHASE_PROGRAM',
    'RESERVE_REQUIREMENT_RATIO',
    'PROPERTY_SUPPORT'
);

ALTER TABLE "CentralBankDocument" RENAME TO "OfficialAnnouncement";
ALTER INDEX "CentralBankDocument_externalKey_key" RENAME TO "OfficialAnnouncement_externalKey_key";
ALTER TABLE "OfficialAnnouncement" RENAME CONSTRAINT "CentralBankDocument_pkey" TO "OfficialAnnouncement_pkey";

ALTER TABLE "OfficialAnnouncement"
ADD COLUMN "region" "AnnouncementRegion" NOT NULL DEFAULT 'US';

ALTER TABLE "OfficialAnnouncement"
ALTER COLUMN "institution" TYPE "AnnouncementInstitution"
USING (
    CASE "institution"::text
        WHEN 'FEDERAL_RESERVE' THEN 'FEDERAL_RESERVE'
    END
)::"AnnouncementInstitution";

ALTER TABLE "OfficialAnnouncement"
ALTER COLUMN "documentType" TYPE "AnnouncementDocumentType"
USING (
    CASE "documentType"::text
        WHEN 'FOMC_MEETING' THEN 'RATE_DECISION'
        WHEN 'FOMC_MINUTES' THEN 'MINUTES'
        WHEN 'FOMC_PROJECTIONS' THEN 'PROJECTIONS'
        WHEN 'CHAIR_SPEECH' THEN 'SPEECH'
    END
)::"AnnouncementDocumentType";

ALTER TABLE "OfficialAnnouncement"
ALTER COLUMN "region" DROP DEFAULT;

DROP TYPE "CentralBankInstitution";
DROP TYPE "CentralBankDocumentType";
