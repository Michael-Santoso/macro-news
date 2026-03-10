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
  jobType: "process_official_announcement";
  officialAnnouncementId: string;
  institution:
    | "FEDERAL_RESERVE"
    | "EUROPEAN_CENTRAL_BANK"
    | "BANK_OF_ENGLAND"
    | "BANK_OF_JAPAN"
    | "PEOPLES_BANK_OF_CHINA";
  region: "US" | "EUROPE" | "UNITED_KINGDOM" | "JAPAN" | "CHINA";
  documentType:
    | "RATE_DECISION"
    | "MONETARY_POLICY_STATEMENT"
    | "PRESS_CONFERENCE_TRANSCRIPT"
    | "MINUTES"
    | "PROJECTIONS"
    | "MONETARY_POLICY_REPORT"
    | "SPEECH"
    | "LIQUIDITY_OPERATION"
    | "ASSET_PURCHASE_PROGRAM"
    | "RESERVE_REQUIREMENT_RATIO"
    | "PROPERTY_SUPPORT";
  publishedAt: string;
  url: string | null;
} | {
  jobType: "process_regulatory_announcement";
  regulatoryAnnouncementId: string;
  institution:
    | "SEC"
    | "FCA"
    | "MAS"
    | "ESMA"
    | "WTO"
    | "US_COMMERCE"
    | "EUROPEAN_COMMISSION";
  jurisdiction: "US" | "UK" | "SG" | "EU" | "GLOBAL";
  category:
    | "FINANCIAL_REGULATION"
    | "TRADE_POLICY"
    | "GEOPOLITICAL_REGULATION"
    | "AI_REGULATION"
    | "BANK_CAPITAL"
    | "ENERGY_POLICY"
    | "ENVIRONMENTAL_RULES"
    | "GENERAL_REGULATION";
  documentType:
    | "PRESS_RELEASE"
    | "SPEECH"
    | "CONSULTATION"
    | "PROPOSED_RULE"
    | "FINAL_RULE"
    | "GUIDANCE"
    | "CIRCULAR"
    | "ENFORCEMENT_ACTION"
    | "FAQ"
    | "REPORT"
    | "NOTICE";
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

export async function publishOfficialAnnouncementJob(
  payload: Extract<
    QueueJobPayload,
    { jobType: "process_official_announcement" }
  >,
): Promise<void> {
  await publishQueueJob(payload);
}

export async function publishRegulatoryAnnouncementJob(
  payload: Extract<
    QueueJobPayload,
    { jobType: "process_regulatory_announcement" }
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
