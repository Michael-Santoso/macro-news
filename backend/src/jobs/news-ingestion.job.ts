import { ingestNewsFromNewsApi } from "../services";

export async function runNewsIngestionJob(): Promise<void> {
  const result = await ingestNewsFromNewsApi();
  console.log(
    `News ingestion complete: fetched=${result.fetched}, normalized=${result.normalized}, stored=${result.stored}`,
  );
}
