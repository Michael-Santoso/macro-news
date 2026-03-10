import { Prisma } from "@prisma/client";
import { ingestFederalReserveDocuments } from "../services";

export async function runCentralBankIngestionJob(): Promise<void> {
  try {
    const result = await ingestFederalReserveDocuments();
    console.log(
      `Central bank ingestion complete: documents=${result.documents}, stored=${result.stored}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.error(
        'Central bank ingestion skipped: database table "CentralBankDocument" is missing. Run the Prisma migration first.',
      );
      return;
    }

    throw error;
  }
}
