-- CreateEnum
CREATE TYPE "ThemeHeatLevel" AS ENUM (
  'HOT',
  'COOLING',
  'STABLE'
);

-- CreateTable
CREATE TABLE "ThemeScore" (
  "theme" "MacroTheme" NOT NULL,
  "region" TEXT NOT NULL,
  "dailyMentions" INTEGER NOT NULL DEFAULT 0,
  "weeklyMentions" INTEGER NOT NULL DEFAULT 0,
  "monthlyMentions" INTEGER NOT NULL DEFAULT 0,
  "momentumScore" INTEGER NOT NULL DEFAULT 0,
  "heatLevel" "ThemeHeatLevel" NOT NULL DEFAULT 'STABLE',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThemeScore_pkey" PRIMARY KEY ("theme", "region")
);
