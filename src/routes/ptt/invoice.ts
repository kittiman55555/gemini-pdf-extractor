import { Duration, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { RedisService } from "../../redis.service";
import { Runtime } from "../../runtime";
import { pttTotalDemandGulfSchemaAndPrompt } from "../../schema/ptt/invoice-total-demand-gulf";

export const invoiceRoutes = new Elysia().group("/invoice", (c) =>
  c.post(
    "/total-demand-gulf",
    async ({ body }) => {
      const file = body.file;
      const arrBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrBuf);

      const result = await Effect.all({
        svc: ExtractPDFService,
        redisSvc: RedisService,
      }).pipe(
        Effect.let("cacheFn", ({ redisSvc }) =>
          redisSvc.withCache({
            file: buf,
            expiresIn: Duration.minutes(1),
          })
        ),
        Effect.andThen(({ svc, cacheFn }) =>
          cacheFn(
            svc.processInline(
              buf,
              pttTotalDemandGulfSchemaAndPrompt.totalDemandGulf.systemPrompt,
              pttTotalDemandGulfSchemaAndPrompt.totalDemandGulf.schema
            )
          )
        ),
        Effect.andThen((data) => ({
          ...data,
          total_demand_gulf:
            data.gpd_glng_shipper_total_mmbtu +
            data.gsrc_glng_shipper_total_mmbtu +
            data.spps_glng_shipper_total_mmbtu,
        })),
        Runtime.runPromise
      );

      return result;
    },
    {
      body: t.Object({
        file: elysiaPdf,
      }),
      tags: ["PTT"],
    }
  )
);
