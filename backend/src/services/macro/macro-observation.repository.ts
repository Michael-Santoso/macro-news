import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import type { FredSeriesSnapshot } from "./fred.client";

type StoredObservation = {
  seriesId: string;
  observationDate: Date;
  value: string;
};

function toObservationDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSnapshots(snapshots: FredSeriesSnapshot[]): StoredObservation[] {
  return snapshots.flatMap((snapshot) =>
    snapshot.observations.flatMap((observation) => {
      const observationDate = toObservationDate(observation.date);

      if (!observationDate) {
        return [];
      }

      return [
        {
          seriesId: snapshot.seriesId,
          observationDate,
          value: observation.value,
        },
      ];
    }),
  );
}

export async function storeFredSeriesSnapshots(
  snapshots: FredSeriesSnapshot[],
): Promise<number> {
  const normalizedSnapshots = normalizeSnapshots(snapshots);

  if (normalizedSnapshots.length === 0) {
    return 0;
  }

  const insertedCounts = await Promise.all(
    normalizedSnapshots.map((snapshot) =>
      prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "MacroObservation" ("id", "seriesId", "observationDate", "value", "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${snapshot.seriesId}, ${snapshot.observationDate}, ${snapshot.value}, NOW(), NOW())
          ON CONFLICT ("seriesId", "observationDate") DO NOTHING
        `,
      ),
    ),
  );

  return insertedCounts.reduce((sum, count) => sum + count, 0);
}
