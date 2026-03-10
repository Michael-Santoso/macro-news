-- CreateTable
CREATE TABLE "MacroObservation" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "observationDate" TIMESTAMP(3) NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MacroObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MacroObservation_seriesId_observationDate_key" ON "MacroObservation"("seriesId", "observationDate");
