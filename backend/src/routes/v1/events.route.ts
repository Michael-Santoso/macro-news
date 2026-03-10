import { Router } from "express";

const eventsRouter = Router();

eventsRouter.get("/", (_req, res) => {
  res.status(501).json({
    message: "Not implemented",
  });
});

export default eventsRouter;

