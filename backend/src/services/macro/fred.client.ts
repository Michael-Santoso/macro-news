import { env } from "../../config/env";

const FRED_SERIES_OBSERVATIONS_URL =
  "https://api.stlouisfed.org/fred/series/observations";

const DEFAULT_FRED_SERIES_IDS = ["CPIAUCSL", "FEDFUNDS", "DGS10", "UNRATE"];

type FredObservation = {
  date: string;
  value: string;
};

type FredSeriesObservationsResponse = {
  observations?: FredObservation[];
};

type FredSeriesSnapshot = {
  seriesId: string;
  observations: FredObservation[];
};

export async function fetchFredSeriesObservations(
  seriesId: string,
  limit = 10,
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
    throw new Error(`FRED request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as FredSeriesObservationsResponse;
  return payload.observations ?? [];
}

export async function fetchDefaultFredSeriesSnapshots(): Promise<
  FredSeriesSnapshot[]
> {
  return Promise.all(
    DEFAULT_FRED_SERIES_IDS.map(async (seriesId) => ({
      seriesId,
      observations: await fetchFredSeriesObservations(seriesId),
    })),
  );
}

export { DEFAULT_FRED_SERIES_IDS };
export type { FredObservation, FredSeriesSnapshot };
