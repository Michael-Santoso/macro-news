import { Router } from "express";
import eventsRouter from "./events.route";
import macroRouter from "./macro.route";
import themesRouter from "./themes.route";

const v1Router = Router();

v1Router.use("/events", eventsRouter);
v1Router.use("/themes", themesRouter);
v1Router.use("/macro", macroRouter);

export default v1Router;
