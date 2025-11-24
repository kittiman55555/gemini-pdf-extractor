import { Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { Runtime } from "../../runtime";
import { pttSupplySchemaAndPrompt } from "../../schema/ptt/ptt-supply";

export const pttSupplyRoutes = new Elysia().group("/supply", (c) =>
  c.post(
    "/yadana",
    async ({ body }) => {
      const file = body.file;
      const arrBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrBuf);

      const result = await Effect.all({
        svc: ExtractPDFService,
      }).pipe(
        Effect.andThen(({ svc }) =>
          svc.processInline(
            buf,
            pttSupplySchemaAndPrompt.yadana.systemPrompt,
            pttSupplySchemaAndPrompt.yadana.schema
          )
        ),
        Effect.andThen((results) => ({
          yadana_occurred_quantities:
            results.moge_quantity_mmbtu + results.pttepi_quantity_mmbtu,
          overall_payment: results.overall_payment_due_usd,
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
  ).post(
      "/yetagun",
      async ({ body }) => {
          const file = body.file;
          const arrBuf = await file.arrayBuffer();
          const buf = Buffer.from(arrBuf);

          const result = await Effect.all({
              svc: ExtractPDFService,
          }).pipe(
              Effect.andThen(({ svc }) =>
                  svc.processInline(
                      buf,
                      pttSupplySchemaAndPrompt.yetagun.systemPrompt,
                      pttSupplySchemaAndPrompt.yetagun.schema
                  )
              ),
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
