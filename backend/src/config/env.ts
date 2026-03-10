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
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN,
  cloudflareQueueId: process.env.CLOUDFLARE_QUEUE_ID,
  newsIngestionIntervalMs: Number(
    process.env.NEWS_INGESTION_INTERVAL_MS ?? 15 * 60 * 1000,
  ),
  fredIngestionIntervalMs: Number(
    process.env.FRED_INGESTION_INTERVAL_MS ?? 24 * 60 * 60 * 1000,
  ),
  officialAnnouncementIngestionIntervalMs: Number(
    process.env.OFFICIAL_ANNOUNCEMENT_INGESTION_INTERVAL_MS ??
      process.env.FED_INGESTION_INTERVAL_MS ??
      24 * 60 * 60 * 1000,
  ),
  regulatoryIngestionIntervalMs: Number(
    process.env.REGULATORY_INGESTION_INTERVAL_MS ?? 24 * 60 * 60 * 1000,
  ),
};
