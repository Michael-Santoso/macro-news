import { env } from "../../config/env";

type QueueJobPayload = {
  jobType: "process_raw_article";
  rawArticleId: string;
  publishedAt: string;
  fetchedAt: string;
} | {
  jobType: "process_macro_observation";
  macroObservationId: string;
  seriesId: string;
  observationDate: string;
  value: string;
} | {
  jobType: "process_central_bank_document";
  centralBankDocumentId: string;
  institution: "FEDERAL_RESERVE";
  documentType:
    | "FOMC_MINUTES"
    | "FOMC_PROJECTIONS"
    | "CHAIR_SPEECH";
  publishedAt: string;
  url: string | null;
};

type CloudflareQueueMessage = {
  body: QueueJobPayload;
};

function hasQueueConfig(): boolean {
  return Boolean(
    env.cloudflareAccountId &&
      env.cloudflareApiToken &&
      env.cloudflareQueueId,
  );
}

export async function publishRawArticleJob(
  payload: Extract<QueueJobPayload, { jobType: "process_raw_article" }>,
): Promise<void> {
  await publishQueueJob(payload);
}

export async function publishMacroObservationJob(
  payload: Extract<QueueJobPayload, { jobType: "process_macro_observation" }>,
): Promise<void> {
  await publishQueueJob(payload);
}

export async function publishCentralBankDocumentJob(
  payload: Extract<
    QueueJobPayload,
    { jobType: "process_central_bank_document" }
  >,
): Promise<void> {
  await publishQueueJob(payload);
}

async function publishQueueJob(payload: QueueJobPayload): Promise<void> {
  if (!hasQueueConfig()) {
    return;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.cloudflareAccountId}/queues/${env.cloudflareQueueId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.cloudflareApiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: payload,
      } satisfies CloudflareQueueMessage),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Cloudflare queue publish failed with status ${response.status}: ${errorText}`,
    );
  }
}
