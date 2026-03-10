import { Prisma } from "@prisma/client";
import { ingestOfficialAnnouncements } from "../services";

export async function runOfficialAnnouncementIngestionJob(): Promise<void> {
  try {
    const result = await ingestOfficialAnnouncements();
    console.log(
      `Official announcement ingestion complete: documents=${result.documents}, stored=${result.stored}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.error(
        'Official announcement ingestion skipped: database table "OfficialAnnouncement" is missing. Run the Prisma migration first.',
      );
      return;
    }

    throw error;
  }
}
