-- CreateEnum
CREATE TYPE "MacroTheme" AS ENUM (
  'inflation',
  'interest_rates',
  'recession_growth',
  'labor_market',
  'liquidity_credit',
  'energy_oil',
  'china_growth',
  'trade_policy',
  'financial_regulation'
);

-- CreateEnum
CREATE TYPE "ThemeEventSourceType" AS ENUM (
  'RAW_ARTICLE',
  'OFFICIAL_ANNOUNCEMENT',
  'REGULATORY_ANNOUNCEMENT',
  'MACRO_OBSERVATION'
);

-- CreateTable
CREATE TABLE "ThemeEvent" (
  "id" TEXT NOT NULL,
  "theme" "MacroTheme" NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "region" TEXT,
  "assetClass" "AssetClass",
  "sourceType" "ThemeEventSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "riskImplication" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThemeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThemeEvent_sourceType_sourceId_theme_key"
ON "ThemeEvent"("sourceType", "sourceId", "theme");
