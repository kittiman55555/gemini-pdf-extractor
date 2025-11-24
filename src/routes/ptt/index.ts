import Elysia from "elysia";
import { supplyRoutes } from "./supply";
import { tsoRoutes } from "./tso";

export const pttRoutes = new Elysia().group("/ptt", (c) => c.use(supplyRoutes).use(tsoRoutes));
