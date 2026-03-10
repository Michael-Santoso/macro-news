import { env } from "../../config/env";

const FRED_SERIES_OBSERVATIONS_URL =
  "https://api.stlouisfed.org/fred/series/observations";
const FRED_SERIES_URL = "https://api.stlouisfed.org/fred/series";

const DEFAULT_FRED_SERIES_IDS = [
  "CPIAUCSL",
  "CPILFESL",
  "PCEPI",
  "PCEPILFE",
  "PPIACO",
  "CES0500000003",
  "DFF",
  "DGS2",
  "T10Y2Y",
  "DFII10",
  "PAYEMS",
  "UNRATE",
  "ICSA",
  "JTSJOL",
  "CIVPART",
  "A191RL1Q225SBEA",
  "RSAFS",
  "INDPRO",
  "UMCSENT",
  "HOUST",
  "PERMIT",
  "BUSLOANS",
  "USREC",
  "WALCL",
];

const FRED_SERIES_CATEGORIES: Record<string, string> = {
  CPIAUCSL: "Inflation Indicators",
  CPILFESL: "Inflation Indicators",
  PCEPI: "Inflation Indicators",
  PCEPILFE: "Inflation Indicators",
  PPIACO: "Inflation Indicators",
  CES0500000003: "Inflation Indicators",
  DFF: "Rates and Liquidity",
  DGS2: "Rates and Liquidity",
  T10Y2Y: "Rates and Liquidity",
  DFII10: "Rates and Liquidity",
  PAYEMS: "Labour Market Indicators",
  UNRATE: "Labour Market Indicators",
  ICSA: "Labour Market Indicators",
  JTSJOL: "Labour Market Indicators",
  CIVPART: "Labour Market Indicators",
  A191RL1Q225SBEA: "Economic Growth Indicators",
  RSAFS: "Economic Growth Indicators",
  INDPRO: "Economic Growth Indicators",
  UMCSENT: "Economic Growth Indicators",
  HOUST: "Economic Growth Indicators",
  PERMIT: "Economic Growth Indicators",
  BUSLOANS: "Credit and Liquidity",
  USREC: "Recession and Regime",
  WALCL: "Credit and Liquidity",
};

type FredObservation = {
  date: string;
  value: string;
};

type FredSeriesObservationsResponse = {
  observations?: FredObservation[];
};

type FredSeriesMetadata = {
  id: string;
  title: string;
  notes?: string;
  frequency_short?: string;
  units_short?: string;
};

type FredSeriesResponse = {
  seriess?: FredSeriesMetadata[];
};

type FredSeriesSnapshot = {
  seriesId: string;
  observations: FredObservation[];
};

type FredSeriesCatalogEntry = {
  seriesId: string;
  category: string;
  shortDescription: string;
  longDescription: string | null;
  frequency: string | null;
  units: string | null;
};

export async function fetchFredSeriesObservations(
  seriesId: string,
  limit = 1,
): Promise<FredObservation[]> {
  if (!env.fredApiKey) {
    throw new Error("Missing FRED_API_KEY for FRED ingestion");
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: env.fredApiKey,
    file_type: "json",
    sort_order: "desc",
    limit: String(limit),
  });

  const response = await fetch(
    `${FRED_SERIES_OBSERVATIONS_URL}?${params.toString()}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `FRED request failed for ${seriesId} with status ${response.status}: ${errorText}`,
    );
  }

  const payload = (await response.json()) as FredSeriesObservationsResponse;
  return payload.observations ?? [];
}

export async function fetchFredSeriesCatalogEntry(
  seriesId: string,
): Promise<FredSeriesCatalogEntry> {
  if (!env.fredApiKey) {
    throw new Error("Missing FRED_API_KEY for FRED ingestion");
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: env.fredApiKey,
    file_type: "json",
  });

  const response = await fetch(`${FRED_SERIES_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `FRED series metadata request failed for ${seriesId} with status ${response.status}: ${errorText}`,
    );
  }

  const payload = (await response.json()) as FredSeriesResponse;
  const metadata = payload.seriess?.[0];

  if (!metadata) {
    throw new Error(`FRED series metadata missing for ${seriesId}`);
  }

  return {
    seriesId,
    category: FRED_SERIES_CATEGORIES[seriesId] ?? "Other",
    shortDescription: metadata.title,
    longDescription: metadata.notes?.trim() || null,
    frequency: metadata.frequency_short?.trim() || null,
    units: metadata.units_short?.trim() || null,
  };
}

export async function fetchDefaultFredSeriesSnapshots(): Promise<
  FredSeriesSnapshot[]
> {
  const results = await Promise.allSettled(
    DEFAULT_FRED_SERIES_IDS.map(async (seriesId) => ({
      seriesId,
      observations: await fetchFredSeriesObservations(seriesId),
    })),
  );

  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }

    console.error(
      `FRED fetch failed for ${DEFAULT_FRED_SERIES_IDS[index] ?? "unknown series"}`,
      result.reason,
    );
    return [];
  });
}

export { DEFAULT_FRED_SERIES_IDS };
export { FRED_SERIES_CATEGORIES };
export type { FredObservation, FredSeriesSnapshot, FredSeriesCatalogEntry };
