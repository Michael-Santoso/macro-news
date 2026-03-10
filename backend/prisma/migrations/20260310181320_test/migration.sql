-- Keep this historical test migration harmless in a clean database.
-- The real CentralBankDocument table is introduced later in the timeline.
ALTER TABLE IF EXISTS "CentralBankDocument"
ALTER COLUMN "updatedAt" DROP DEFAULT;
