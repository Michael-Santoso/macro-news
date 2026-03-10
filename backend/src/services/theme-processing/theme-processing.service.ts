import type {
  AnnouncementRegion,
  AssetClass,
  MacroObservation,
  MacroTheme,
  MacroObservationCatalog,
  ProcessingStatus,
  RegulatoryJurisdiction,
  ThemeEventSourceType,
} from "@prisma/client";
import prisma from "../../lib/prisma";
import { classifyThemes } from "./theme-classifier";
import { THEME_ASSET_CLASS, THEME_PRIORITY } from "./theme-taxonomy";

type ProcessResult = {
  sourceType: ThemeEventSourceType;
  scanned: number;
  processed: number;
  failed: number;
  eventsCreated: number;
};

type SourceRecordBase = {
  title: string;
  sourceUrl: string | null;
  publishedAt: Date;
  region: string | null;
  textContent: string;
  assetClass: AssetClass | null;
};

type MacroObservationWithCatalog = MacroObservation & {
  catalog: MacroObservationCatalog | null;
};

type PendingMacroObservationRow = {
  id: string;
  seriesId: string;
  observationDate: Date;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

const SOURCE_BATCH_SIZE = 100;

function normalizeText(value: string | null | undefined): string {
  return value
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

function toSentences(value: string): string[] {
  return normalizeText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstParagraph(value: string): string {
  const normalized = value
    .replace(/<[^>]+>/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => normalizeText(paragraph))
    .find(Boolean);

  return normalized ?? "";
}

function ensureSentence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function truncateSentence(value: string, limit: number): string {
  const trimmed = value.trim();

  if (trimmed.length <= limit) {
    return ensureSentence(trimmed);
  }

  return ensureSentence(`${trimmed.slice(0, limit).trimEnd()}...`);
}

function primaryTheme(themes: MacroTheme[]): MacroTheme | null {
  return THEME_PRIORITY.find((theme) => themes.includes(theme)) ?? null;
}

function inferAssetClass(
  theme: MacroTheme,
  assetClass: AssetClass | null,
): AssetClass {
  return assetClass ?? THEME_ASSET_CLASS[theme] ?? "MACRO";
}

function deriveDirection(text: string): "rising" | "falling" | "neutral" {
  const normalized = normalizeText(text).toLowerCase();

  if (
    /(rise|rising|higher|hotter|accelerat|tighten|hike|increase|surge|sticky)/.test(
      normalized,
    )
  ) {
    return "rising";
  }

  if (
    /(fall|falling|lower|cooling|slowdown|cut|ease|decline|drop|weaken)/.test(
      normalized,
    )
  ) {
    return "falling";
  }

  return "neutral";
}

function generateSummary(title: string, content: string, themes: MacroTheme[]): string {
  const intro = ensureSentence(title);
  const paragraph = firstParagraph(content);
  const paragraphSentence =
    toSentences(paragraph)[0] ?? truncateSentence(paragraph, 220);

  if (paragraphSentence) {
    return `${intro} ${ensureSentence(paragraphSentence)}`.trim();
  }

  const theme = primaryTheme(themes);

  if (!theme) {
    return intro;
  }

  return `${intro} ${ensureSentence(
    `The item was classified under ${theme.replace(/_/g, " ")}`,
  )}`.trim();
}

function generateRiskImplication(themes: MacroTheme[], content: string): string {
  const theme = primaryTheme(themes);
  const direction = deriveDirection(content);

  switch (theme) {
    case "inflation":
      return direction === "falling"
        ? "Cooling inflation may reduce pressure for additional policy tightening."
        : "Persistent inflation pressure may keep interest rates elevated and pressure duration-sensitive assets.";
    case "interest_rates":
      return direction === "falling"
        ? "Lower rate pressure may support bonds and ease broader financial conditions."
        : "Higher rate pressure may tighten financial conditions and weigh on rate-sensitive risk assets.";
    case "recession_growth":
      return direction === "falling"
        ? "Weaker growth signals may raise recession risk and pressure cyclical assets."
        : "Improving growth signals may support cyclical assets if inflation does not re-accelerate.";
    case "labor_market":
      return direction === "falling"
        ? "Labor market cooling may ease wage pressure but increase growth concerns."
        : "A firm labor market may keep wage pressure elevated and delay policy easing.";
    case "liquidity_credit":
      return direction === "falling"
        ? "Tighter liquidity or weaker credit creation may increase funding stress across markets."
        : "Improving liquidity conditions may support risk appetite and credit transmission.";
    case "energy_oil":
      return direction === "falling"
        ? "Lower energy pressure may ease headline inflation and support consumers."
        : "Rising energy prices may lift inflation expectations and squeeze margins.";
    case "china_growth":
      return direction === "falling"
        ? "China growth weakness may weigh on commodities, trade flows, and regional risk sentiment."
        : "Stabilizing China growth may support global demand-sensitive assets and commodities.";
    case "trade_policy":
      return "Trade policy shifts may disrupt supply chains, alter cross-border flows, and raise market volatility.";
    case "financial_regulation":
      return "Regulatory changes may increase compliance costs and pressure affected financial-sector business models.";
    default:
      return "The development may shift macro expectations and move cross-asset pricing.";
  }
}

async function createThemeEvents(
  sourceType: ThemeEventSourceType,
  sourceId: string,
  sourceRecord: SourceRecordBase,
  themes: MacroTheme[],
): Promise<number> {
  if (themes.length === 0) {
    return 0;
  }

  const summary = generateSummary(
    sourceRecord.title,
    sourceRecord.textContent,
    themes,
  );
  const riskImplication = generateRiskImplication(themes, sourceRecord.textContent);
  const created = await prisma.themeEvent.createMany({
    data: themes.map((theme) => ({
      theme,
      title: sourceRecord.title,
      summary,
      region: sourceRecord.region,
      assetClass: inferAssetClass(theme, sourceRecord.assetClass),
      sourceType,
      sourceId,
      sourceUrl: sourceRecord.sourceUrl,
      publishedAt: sourceRecord.publishedAt,
      riskImplication,
    })),
    skipDuplicates: true,
  });

  return created.count;
}

function mapAnnouncementRegion(region: AnnouncementRegion): string {
  switch (region) {
    case "UNITED_KINGDOM":
      return "UK";
    default:
      return region;
  }
}

function mapRegulatoryRegion(jurisdiction: RegulatoryJurisdiction): string {
  return jurisdiction;
}

async function markStatus(
  model: "rawArticle" | "officialAnnouncement" | "regulatoryAnnouncement",
  id: string,
  status: ProcessingStatus,
): Promise<void> {
  if (model === "rawArticle") {
    await prisma.rawArticle.update({
      where: { id },
      data: { processingStatus: status },
    });
    return;
  }

  if (model === "officialAnnouncement") {
    await prisma.officialAnnouncement.update({
      where: { id },
      data: { processingStatus: status },
    });
    return;
  }

  await prisma.regulatoryAnnouncement.update({
    where: { id },
    data: { processingStatus: status },
  });
}

async function processPendingRawArticles(): Promise<ProcessResult> {
  const rows = await prisma.rawArticle.findMany({
    where: { processingStatus: "PENDING" },
    take: SOURCE_BATCH_SIZE,
    orderBy: { publishedAt: "asc" },
  });

  let processed = 0;
  let failed = 0;
  let eventsCreated = 0;

  for (const row of rows) {
    try {
      const textContent = [row.description, row.content].filter(Boolean).join("\n\n");
      const themes = classifyThemes({
        title: row.title,
        content: textContent,
        sourceType: "RAW_ARTICLE",
      });

      eventsCreated += await createThemeEvents("RAW_ARTICLE", row.id, {
        title: row.title,
        sourceUrl: row.url,
        publishedAt: row.publishedAt,
        region: null,
        textContent,
        assetClass: null,
      }, themes);

      await markStatus("rawArticle", row.id, "PROCESSED");
      processed += 1;
    } catch (error) {
      failed += 1;
      await markStatus("rawArticle", row.id, "FAILED");
      console.error(`Theme processing failed for raw article ${row.id}`, error);
    }
  }

  return {
    sourceType: "RAW_ARTICLE",
    scanned: rows.length,
    processed,
    failed,
    eventsCreated,
  };
}

async function processPendingOfficialAnnouncements(): Promise<ProcessResult> {
  const rows = await prisma.officialAnnouncement.findMany({
    where: { processingStatus: "PENDING" },
    take: SOURCE_BATCH_SIZE,
    orderBy: { publishedAt: "asc" },
  });

  let processed = 0;
  let failed = 0;
  let eventsCreated = 0;

  for (const row of rows) {
    try {
      const textContent = [row.description, row.content].filter(Boolean).join("\n\n");
      const themes = classifyThemes({
        title: row.title,
        content: textContent,
        sourceType: "OFFICIAL_ANNOUNCEMENT",
        regionHint: row.region,
      });

      eventsCreated += await createThemeEvents("OFFICIAL_ANNOUNCEMENT", row.id, {
        title: row.title,
        sourceUrl: row.url ?? row.pdfUrl ?? null,
        publishedAt: row.publishedAt,
        region: mapAnnouncementRegion(row.region),
        textContent,
        assetClass: "MACRO",
      }, themes);

      await markStatus("officialAnnouncement", row.id, "PROCESSED");
      processed += 1;
    } catch (error) {
      failed += 1;
      await markStatus("officialAnnouncement", row.id, "FAILED");
      console.error(
        `Theme processing failed for official announcement ${row.id}`,
        error,
      );
    }
  }

  return {
    sourceType: "OFFICIAL_ANNOUNCEMENT",
    scanned: rows.length,
    processed,
    failed,
    eventsCreated,
  };
}

async function processPendingRegulatoryAnnouncements(): Promise<ProcessResult> {
  const rows = await prisma.regulatoryAnnouncement.findMany({
    where: { processingStatus: "PENDING" },
    take: SOURCE_BATCH_SIZE,
    orderBy: { publishedAt: "asc" },
  });

  let processed = 0;
  let failed = 0;
  let eventsCreated = 0;

  for (const row of rows) {
    try {
      const textContent = [row.summary, row.content].filter(Boolean).join("\n\n");
      const themes = classifyThemes({
        title: row.title,
        content: textContent,
        sourceType: "REGULATORY_ANNOUNCEMENT",
        regulatoryCategory: row.category,
        regionHint: row.jurisdiction,
      });

      eventsCreated += await createThemeEvents("REGULATORY_ANNOUNCEMENT", row.id, {
        title: row.title,
        sourceUrl: row.url ?? row.pdfUrl ?? null,
        publishedAt: row.publishedAt,
        region: mapRegulatoryRegion(row.jurisdiction),
        textContent,
        assetClass: "MACRO",
      }, themes);

      await markStatus("regulatoryAnnouncement", row.id, "PROCESSED");
      processed += 1;
    } catch (error) {
      failed += 1;
      await markStatus("regulatoryAnnouncement", row.id, "FAILED");
      console.error(
        `Theme processing failed for regulatory announcement ${row.id}`,
        error,
      );
    }
  }

  return {
    sourceType: "REGULATORY_ANNOUNCEMENT",
    scanned: rows.length,
    processed,
    failed,
    eventsCreated,
  };
}

function macroObservationTitle(row: MacroObservationWithCatalog): string {
  const label = row.catalog?.shortDescription?.trim() || row.seriesId;
  const date = row.observationDate.toISOString().slice(0, 10);
  return `${label} release for ${date}`;
}

function macroObservationContent(
  row: MacroObservationWithCatalog,
  previousValue: string | null,
): string {
  const description = row.catalog?.longDescription || row.catalog?.shortDescription || row.seriesId;
  const changeText = previousValue
    ? `Previous reading was ${previousValue} and the latest reading is ${row.value}.`
    : `Latest reading is ${row.value}.`;

  return `${description}. ${changeText}`;
}

async function previousObservationValue(row: MacroObservation): Promise<string | null> {
  const previous = await prisma.macroObservation.findFirst({
    where: {
      seriesId: row.seriesId,
      observationDate: {
        lt: row.observationDate,
      },
    },
    orderBy: {
      observationDate: "desc",
    },
    select: {
      value: true,
    },
  });

  return previous?.value ?? null;
}

async function processMacroObservations(): Promise<ProcessResult> {
  // TODO(agent-2-or-schema-owner): MacroObservation still lacks processingStatus,
  // so Agent 1 selects unprocessed rows via ThemeEvent absence instead of status transitions.
  const rows = await prisma.$queryRaw<PendingMacroObservationRow[]>`
    SELECT
      mo."id",
      mo."seriesId",
      mo."observationDate",
      mo."value",
      mo."createdAt",
      mo."updatedAt"
    FROM "MacroObservation" mo
    WHERE NOT EXISTS (
      SELECT 1
      FROM "ThemeEvent" te
      WHERE te."sourceType" = 'MACRO_OBSERVATION'::"ThemeEventSourceType"
        AND te."sourceId" = mo."id"
    )
    ORDER BY mo."observationDate" DESC, mo."updatedAt" DESC
    LIMIT ${SOURCE_BATCH_SIZE}
  `;
  const catalogs = await prisma.macroObservationCatalog.findMany({
    where: {
      seriesId: {
        in: rows.map((row) => row.seriesId),
      },
    },
  });
  const catalogBySeriesId = new Map(
    catalogs.map((catalog) => [catalog.seriesId, catalog]),
  );
  const rowsWithCatalog: MacroObservationWithCatalog[] = rows.map((row) => ({
    ...row,
    catalog: catalogBySeriesId.get(row.seriesId) ?? null,
  }));

  let processed = 0;
  let failed = 0;
  let eventsCreated = 0;

  for (const row of rowsWithCatalog) {
    try {
      const previousValue = await previousObservationValue(row);
      const textContent = macroObservationContent(row, previousValue);
      const title = macroObservationTitle(row);
      const themes = classifyThemes({
        title,
        content: textContent,
        sourceType: "MACRO_OBSERVATION",
        seriesId: row.seriesId,
        regionHint: "US",
      });

      eventsCreated += await createThemeEvents("MACRO_OBSERVATION", row.id, {
        title,
        sourceUrl: null,
        publishedAt: row.observationDate,
        region: "US",
        textContent,
        assetClass: "MACRO",
      }, themes);

      processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`Theme processing failed for macro observation ${row.id}`, error);
    }
  }

  return {
    sourceType: "MACRO_OBSERVATION",
    scanned: rowsWithCatalog.length,
    processed,
    failed,
    eventsCreated,
  };
}

export async function processThemeSources(): Promise<ProcessResult[]> {
  return [
    await processPendingRawArticles(),
    await processPendingOfficialAnnouncements(),
    await processPendingRegulatoryAnnouncements(),
    await processMacroObservations(),
  ];
}
