import { Router } from "express";
import eventsRouter from "./events.route";

const v1Router = Router();

v1Router.use("/events", eventsRouter);

export default v1Router;

