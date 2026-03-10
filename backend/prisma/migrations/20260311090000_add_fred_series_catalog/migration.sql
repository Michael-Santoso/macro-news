-- CreateTable
CREATE TABLE "MacroObservationCatalog" (
    "seriesId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT,
    "frequency" TEXT,
    "units" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MacroObservationCatalog_pkey" PRIMARY KEY ("seriesId")
);
