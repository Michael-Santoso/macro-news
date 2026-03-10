import { fetchFederalReserveDocuments } from "./federal-reserve.client";
import { fetchEuropeanCentralBankAnnouncements } from "./european-central-bank.client";
import { fetchBankOfEnglandAnnouncements } from "./bank-of-england.client";
import { fetchBankOfJapanAnnouncements } from "./bank-of-japan.client";
import { fetchPeoplesBankOfChinaAnnouncements } from "./peoples-bank-of-china.client";
import { storeOfficialAnnouncements } from "./central-bank-document.repository";

export async function ingestOfficialAnnouncements(): Promise<{
  documents: number;
  stored: number;
}> {
  const results = await Promise.allSettled([
    fetchFederalReserveDocuments(),
    fetchEuropeanCentralBankAnnouncements(),
    fetchBankOfEnglandAnnouncements(),
    fetchBankOfJapanAnnouncements(),
    fetchPeoplesBankOfChinaAnnouncements(),
  ]);
  const documents = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const sourceLabels = [
      "Federal Reserve",
      "European Central Bank",
      "Bank of England",
      "Bank of Japan",
      "People's Bank of China",
    ];
    console.error(`${sourceLabels[index]} announcement fetch failed`, result.reason);
    return [];
  });
  const storedCount = await storeOfficialAnnouncements(documents);

  return {
    documents: documents.length,
    stored: storedCount,
  };
}
