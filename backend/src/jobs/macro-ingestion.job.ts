import { ingestDefaultFredSeries } from "../services";

export async function runMacroIngestionJob(): Promise<void> {
  if (!process.env.FRED_API_KEY) {
    return;
  }

  const result = await ingestDefaultFredSeries();
  console.log(
    `Macro ingestion complete: fred(series=${result.series}, observations=${result.observations}, stored=${result.stored})`,
  );
}
