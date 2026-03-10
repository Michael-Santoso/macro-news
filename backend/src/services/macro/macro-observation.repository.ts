import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import type { FredSeriesSnapshot } from "./fred.client";
import { publishMacroObservationJob } from "../queue";

type StoredObservation = {
  seriesId: string;
  observationDate: Date;
  value: string;
};

type CreatedMacroObservation = {
  id: string;
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
      const value = observation.value.trim();

      if (!observationDate || !value || value === ".") {
        return [];
      }

      return [
        {
          seriesId: snapshot.seriesId,
          observationDate,
          value,
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

  let storedCount = 0;

  for (const snapshot of normalizedSnapshots) {
    const createdObservation = await createMacroObservation(snapshot);

    if (!createdObservation) {
      continue;
    }

    storedCount += 1;

    try {
      await publishMacroObservationJob({
        jobType: "process_macro_observation",
        macroObservationId: createdObservation.id,
        seriesId: createdObservation.seriesId,
        observationDate: createdObservation.observationDate.toISOString(),
        value: createdObservation.value,
      });
    } catch (error) {
      console.error(
        `Queue publish failed for macro observation ${createdObservation.id}`,
        error,
      );
    }
  }

  return storedCount;
}

async function createMacroObservation(
  snapshot: StoredObservation,
): Promise<CreatedMacroObservation | null> {
  const existingRows = await prisma.$queryRaw<CreatedMacroObservation[]>(
    Prisma.sql`
      SELECT "id", "seriesId", "observationDate", "value"
      FROM "MacroObservation"
      WHERE "seriesId" = ${snapshot.seriesId}
        AND "observationDate" = ${snapshot.observationDate}
      LIMIT 1
    `,
  );

  const existingRow = existingRows[0];

  if (!existingRow) {
    const insertedRows = await prisma.$queryRaw<CreatedMacroObservation[]>(
      Prisma.sql`
        INSERT INTO "MacroObservation" ("id", "seriesId", "observationDate", "value", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${snapshot.seriesId}, ${snapshot.observationDate}, ${snapshot.value}, NOW(), NOW())
        RETURNING "id", "seriesId", "observationDate", "value"
      `,
    );

    return insertedRows[0] ?? null;
  }

  if (existingRow.value === snapshot.value) {
    return null;
  }

  const updatedRows = await prisma.$queryRaw<CreatedMacroObservation[]>(
    Prisma.sql`
      UPDATE "MacroObservation"
      SET "value" = ${snapshot.value},
          "updatedAt" = NOW()
      WHERE "id" = ${existingRow.id}
      RETURNING "id", "seriesId", "observationDate", "value"
    `,
  );

  return updatedRows[0] ?? null;
}
