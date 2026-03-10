import { AssetClass, MacroTheme } from "@prisma/client";
import { Router } from "express";
import { dashboardService } from "../../services/dashboard.service";

const themesRouter = Router();

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

themesRouter.get("/", async (req, res) => {
  try {
    const response = await dashboardService.listThemes({
      region:
        typeof req.query.region === "string" ? req.query.region : undefined,
      page: parseInteger(req.query.page),
      limit: parseInteger(req.query.limit),
      sort:
        typeof req.query.sort === "string" &&
        ["heat", "momentum", "mentions", "theme"].includes(req.query.sort)
          ? (req.query.sort as "heat" | "momentum" | "mentions" | "theme")
          : undefined,
    });

    res.json(response);
  } catch (error) {
    console.error("Failed to list themes", error);
    res.status(500).json({ message: "Failed to list themes" });
  }
});

themesRouter.get("/:theme", async (req, res) => {
  if (!isMacroTheme(req.params.theme)) {
    res.status(400).json({ message: "Invalid theme" });
    return;
  }

  const fromDate = parseDate(req.query.fromDate);
  const toDate = parseDate(req.query.toDate);
  const assetClass =
    typeof req.query.assetClass === "string" &&
    isAssetClass(req.query.assetClass)
      ? req.query.assetClass
      : undefined;

  if (req.query.fromDate && !fromDate) {
    res.status(400).json({ message: "Invalid fromDate" });
    return;
  }

  if (req.query.toDate && !toDate) {
    res.status(400).json({ message: "Invalid toDate" });
    return;
  }

  if (
    typeof req.query.assetClass === "string" &&
    !assetClass
  ) {
    res.status(400).json({ message: "Invalid assetClass" });
    return;
  }

  try {
    const response = await dashboardService.getThemeDetails({
      theme: req.params.theme,
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
    console.error(`Failed to fetch theme ${req.params.theme}`, error);
    res.status(500).json({ message: "Failed to fetch theme" });
  }
});

export default themesRouter;
