import { fetchDefaultFredSeriesSnapshots } from "./fred.client";
import { storeFredSeriesSnapshots } from "./macro-observation.repository";

export async function ingestDefaultFredSeries(): Promise<{
  series: number;
  observations: number;
  stored: number;
}> {
  const snapshots = await fetchDefaultFredSeriesSnapshots();
  const totalObservations = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.observations.length,
    0,
  );
  const storedCount = await storeFredSeriesSnapshots(snapshots);

  return {
    series: snapshots.length,
    observations: totalObservations,
    stored: storedCount,
  };
}
