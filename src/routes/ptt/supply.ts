import { Array, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { Runtime } from "../../runtime";
import { B8InvoiceAndHeatSchemaAndSystemPrompt } from "../../schema/ptt/b8-invoice-and-heat";
import { invoiceAndHeatSchemaAndPrompt } from "../../schema/ptt/invoice-register-and-heat";
import { pttSupplySchemaAndPrompt } from "../../schema/ptt/supply";

export const supplyRoutes = new Elysia().group("/supply", (c) =>
  c
    .post(
      "/invoice",
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
              pttSupplySchemaAndPrompt.invoice.systemPrompt,
              pttSupplySchemaAndPrompt.invoice.schema
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
    .post(
      "/invoice-and-heat",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              invoiceAndHeatSchemaAndPrompt.systemPrompt,
              invoiceAndHeatSchemaAndPrompt.schema
            )
          ),
          Effect.tap((data) => Effect.log("data", data)),
          Effect.tapError((error) => Effect.logError("error -->", error.error)),
          Effect.catchTag("ExtractPDF/Process/Error", (error) =>
            Effect.succeed(
              Response.json(
                {
                  message: error.message,
                  error: error.error,
                  status: "500",
                },
                {
                  status: 500,
                }
              )
            )
          )
        );

        return Runtime.runPromise(program);
      },
      {
        body: t.Object({
          file: elysiaPdf,
        }),
        tags: ["PTT"],
      }
    )
    .post(
      "/b8-invoice-and-heat",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              B8InvoiceAndHeatSchemaAndSystemPrompt.prompt,
              B8InvoiceAndHeatSchemaAndSystemPrompt.schema
            )
          ),
          Effect.andThen((data) => ({
            ...data,
            totalInvoiceAmount: Array.reduce(
              data.invoices,
              0,
              (acc, cur) => acc + cur.amountExcludingVAT
            ),
          })),
          Effect.tap((data) => Effect.log("data", data)),
          Effect.tapError((error) => Effect.logError("error -->", error.error)),
          Effect.catchTag("ExtractPDF/Process/Error", (error) =>
            Effect.succeed(
              Response.json(
                {
                  message: error.message,
                  error: error.error,
                  status: "500",
                },
                {
                  status: 500,
                }
              )
            )
          )
        );

        const result = await Runtime.runPromise(program);
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
