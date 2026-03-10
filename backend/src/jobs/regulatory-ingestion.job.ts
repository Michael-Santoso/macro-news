import { Prisma } from "@prisma/client";
import { ingestRegulatoryAnnouncements } from "../services";

export async function runRegulatoryIngestionJob(): Promise<void> {
  try {
    const result = await ingestRegulatoryAnnouncements();
    console.log(
      `Regulatory ingestion complete: announcements=${result.announcements}, stored=${result.stored}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.error(
        'Regulatory ingestion skipped: database table "RegulatoryAnnouncement" is missing. Run the Prisma migration first.',
      );
      return;
    }

    throw error;
  }
}
