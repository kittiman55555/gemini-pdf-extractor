import Elysia from "elysia";
import { invoiceRoutes } from "./invoice";
import { lngRoutes } from "./lng";
import { lpgRoutes } from "./lpg";
import { pttSupplyRoutes } from "./ptt-supply";
import { supplyRoutes } from "./supply";
import { tsoRoutes } from "./tso";

export const pttRoutes = new Elysia().group(
    "/ptt",
    (c) =>
    c
            .use(supplyRoutes)
            .use(pttSupplyRoutes)
            .use(tsoRoutes)
            .use(lngRoutes)
            .use(lpgRoutes)
            .use(invoiceRoutes)
);
