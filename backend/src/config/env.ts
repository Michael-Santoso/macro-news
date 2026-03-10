import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["DATABASE_URL"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL as string,
  newsApiKey: process.env.NEWS_API_KEY,
  fredApiKey: process.env.FRED_API_KEY,
  newsIngestionIntervalMs: Number(
    process.env.NEWS_INGESTION_INTERVAL_MS ?? 15 * 60 * 1000,
  ),
};
