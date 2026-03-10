import { fetchFederalReserveDocuments } from "./federal-reserve.client";
import { storeCentralBankDocuments } from "./central-bank-document.repository";

export async function ingestFederalReserveDocuments(): Promise<{
  documents: number;
  stored: number;
}> {
  const documents = await fetchFederalReserveDocuments();
  const storedCount = await storeCentralBankDocuments(documents);

  return {
    documents: documents.length,
    stored: storedCount,
  };
}
