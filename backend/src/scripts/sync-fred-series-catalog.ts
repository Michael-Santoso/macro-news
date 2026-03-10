import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import {
  DEFAULT_FRED_SERIES_IDS,
  fetchFredSeriesCatalogEntry,
} from "../services/macro";

async function main(): Promise<void> {
  await prisma.$connect();

  try {
    for (const seriesId of DEFAULT_FRED_SERIES_IDS) {
      const entry = await fetchFredSeriesCatalogEntry(seriesId);

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "MacroObservationCatalog" (
            "seriesId",
            "category",
            "shortDescription",
            "longDescription",
            "frequency",
            "units",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${entry.seriesId},
            ${entry.category},
            ${entry.shortDescription},
            ${entry.longDescription},
            ${entry.frequency},
            ${entry.units},
            NOW(),
            NOW()
          )
          ON CONFLICT ("seriesId") DO UPDATE
          SET
            "category" = EXCLUDED."category",
            "shortDescription" = EXCLUDED."shortDescription",
            "longDescription" = EXCLUDED."longDescription",
            "frequency" = EXCLUDED."frequency",
            "units" = EXCLUDED."units",
            "updatedAt" = NOW()
        `,
      );
    }

    console.log(
      `FRED series catalog sync complete: synced=${DEFAULT_FRED_SERIES_IDS.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("FRED series catalog sync failed", error);
  process.exit(1);
});
