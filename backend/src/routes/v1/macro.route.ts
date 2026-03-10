import { Router } from "express";
import { dashboardService } from "../../services/dashboard.service";

const macroRouter = Router();

function parseInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

macroRouter.get("/releases", async (req, res) => {
  try {
    const response = await dashboardService.listMacroReleases({
      page: parseInteger(req.query.page),
      limit: parseInteger(req.query.limit),
      sort:
        typeof req.query.sort === "string" &&
        ["latest", "series"].includes(req.query.sort)
          ? (req.query.sort as "latest" | "series")
          : undefined,
      category:
        typeof req.query.category === "string" ? req.query.category : undefined,
      seriesId:
        typeof req.query.seriesId === "string" ? req.query.seriesId : undefined,
    });

    res.json(response);
  } catch (error) {
    console.error("Failed to list macro releases", error);
    res.status(500).json({ message: "Failed to list macro releases" });
  }
});

export default macroRouter;
