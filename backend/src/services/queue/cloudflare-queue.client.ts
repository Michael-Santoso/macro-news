import { env } from "../../config/env";

type QueueJobPayload = {
  jobType: "process_raw_article";
  rawArticleId: string;
  publishedAt: string;
  fetchedAt: string;
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
  payload: QueueJobPayload,
): Promise<void> {
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
