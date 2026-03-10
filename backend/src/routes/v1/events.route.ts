import { AssetClass, MacroTheme } from "@prisma/client";
import { Router } from "express";
import { eventService } from "../../services";

const eventsRouter = Router();

function parseInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isMacroTheme(value: string): value is MacroTheme {
  return Object.values(MacroTheme).includes(value as MacroTheme);
}

function isAssetClass(value: string): value is AssetClass {
  return Object.values(AssetClass).includes(value as AssetClass);
}

eventsRouter.get("/", async (req, res) => {
  const theme =
    typeof req.query.theme === "string" && isMacroTheme(req.query.theme)
      ? req.query.theme
      : undefined;
  const assetClass =
    typeof req.query.assetClass === "string" &&
    isAssetClass(req.query.assetClass)
      ? req.query.assetClass
      : undefined;
  const fromDate = parseDate(req.query.fromDate);
  const toDate = parseDate(req.query.toDate);

  if (req.query.theme && !theme) {
    res.status(400).json({ message: "Invalid theme" });
    return;
  }

  if (req.query.assetClass && !assetClass) {
    res.status(400).json({ message: "Invalid assetClass" });
    return;
  }

  if (req.query.fromDate && !fromDate) {
    res.status(400).json({ message: "Invalid fromDate" });
    return;
  }

  if (req.query.toDate && !toDate) {
    res.status(400).json({ message: "Invalid toDate" });
    return;
  }

  try {
    const response = await eventService.listEvents({
      theme,
      region:
        typeof req.query.region === "string" ? req.query.region : undefined,
      fromDate,
      toDate,
      assetClass,
      page: parseInteger(req.query.page),
      limit: parseInteger(req.query.limit),
      sort:
        typeof req.query.sort === "string" &&
        ["newest", "most_impactful"].includes(req.query.sort)
          ? (req.query.sort as "newest" | "most_impactful")
          : undefined,
    });

    res.json(response);
  } catch (error) {
    console.error("Failed to list events", error);
    res.status(500).json({ message: "Failed to list events" });
  }
});

export default eventsRouter;
