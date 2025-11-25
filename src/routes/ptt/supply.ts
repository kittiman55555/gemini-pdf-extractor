/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: <explanation> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */

import { Array, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { Runtime } from "../../runtime";
import { arthitGasPlatformSchemaAndPrompt } from "../../schema/ptt/arthit";
import { B8InvoiceAndHeatSchemaAndSystemPrompt } from "../../schema/ptt/b8-invoice-and-heat";
import { invoiceAndHeatSchemaAndPrompt } from "../../schema/ptt/invoice-register-and-heat";
import { jdaSchemaAndPrompt } from "../../schema/ptt/jda-a18-b17";
import { pttSupplySchemaAndPrompt as PttSupplySchemaAndPromptSouthern } from "../../schema/ptt/ptt-supply";
import { pttSupplySchemaAndPrompt } from "../../schema/ptt/supply";
import { supplyClassification } from "../../schema/ptt/supply.classification";

export const supplyRoutes = new Elysia().group("/supply", (c) =>
  c
    .post(
      "/any-supply",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.gen(function* () {
          const svc = yield* ExtractPDFService;

          const classification = yield* svc.processInline(
            buf,
            supplyClassification.systemPrompt,
            supplyClassification.schema
          );

          const { confidence, detectedFeatures, documentType, reasoning } =
            classification;

          console.log(
            `📋 Classification: $${documentType} ($$ {confidence}% confidence)`
          );
          console.log(`💭 Reasoning: ${reasoning}`);
          console.log(
            `🏷️  Platforms detected: ${detectedFeatures.platforms.join(", ")}`
          );

          if (documentType === "c5_g4" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                invoiceAndHeatSchemaAndPrompt.systemPrompt,
                invoiceAndHeatSchemaAndPrompt.schema
              )
              .pipe(
                Effect.andThen((data) => ({
                  ...data,
                  total_amount_exclude_vat: Array.reduce(
                    data.invoiceData,
                    0,
                    (acc, cur) => acc + cur.totalAmount_ExclVAT
                  ),
                }))
              );
          }

          if (documentType === "ptt_supply" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                pttSupplySchemaAndPrompt.invoice.systemPrompt,
                pttSupplySchemaAndPrompt.invoice.schema
              )
              .pipe(
                Effect.andThen((data) => ({
                  ...data,
                  totalInvoiceAmount: Number.parseFloat(
                    Array.reduce(
                      data.invoices,
                      0,
                      (acc, cur) => acc + cur.amount_before_vat
                    ).toFixed(2)
                  ),
                  total_quantity: Array.reduce(
                    data.invoices,
                    0,
                    (acc, cur) => acc + cur.quantity
                  ),
                }))
              );
          }

          if (documentType === "b8_platform" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                B8InvoiceAndHeatSchemaAndSystemPrompt.prompt,
                B8InvoiceAndHeatSchemaAndSystemPrompt.schema
              )
              .pipe(
                Effect.andThen((data) => ({
                  ...data,
                  totalInvoiceAmount: Number.parseFloat(
                    Array.reduce(
                      data.invoices,
                      0,
                      (acc, cur) => acc + cur.amountExcludingVAT
                    ).toFixed(2)
                  ),
                })),
                Effect.orElseSucceed(() => null)
              );
          }

          if (documentType === "arthit_statement" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              arthitGasPlatformSchemaAndPrompt.statement.systemPrompt,
              arthitGasPlatformSchemaAndPrompt.statement.schema
            );
          }

          if (documentType === "yadana" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                PttSupplySchemaAndPromptSouthern.yadana.systemPrompt,
                PttSupplySchemaAndPromptSouthern.yadana.schema
              )
              .pipe(
                Effect.andThen((data) => ({
                  ...data,
                  sum: data.moge_quantity_mmbtu + data.pttepi_quantity_mmbtu,
                }))
              );
          }

          if (documentType === "yetagun" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              PttSupplySchemaAndPromptSouthern.yetagun.systemPrompt,
              PttSupplySchemaAndPromptSouthern.yetagun.schema
            );
          }

          if (documentType === "zawtika" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                PttSupplySchemaAndPromptSouthern.zawtika.systemPrompt,
                PttSupplySchemaAndPromptSouthern.zawtika.schema
              )
              .pipe(
                Effect.andThen((data) => ({
                  ...data,
                  sum_quantity:
                    data.moge_quantity_mmbtu + data.pttepi_quantity_mmbtu,
                  sum_usd: data.moge_payment_usd + data.pttepi_payment_usd,
                }))
              );
          }

          if (documentType === "jda" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              jdaSchemaAndPrompt.systemPrompt,
              jdaSchemaAndPrompt.schema
            );
          }

          return yield* svc.processInline(
            buf,
            pttSupplySchemaAndPrompt.invoice.systemPrompt,
            pttSupplySchemaAndPrompt.invoice.schema
          );
        }).pipe(
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
          Effect.andThen((data) => ({
            ...data,
            total_amount: Array.reduce(
              data.invoices,
              0,
              (acc, cur) => acc + cur.amount_before_vat
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
          Effect.andThen((data) => ({
            ...data,
            total_amount_exclude_vat: Array.reduce(
              data.invoiceData,
              0,
              (acc, cur) => acc + cur.totalAmount_ExclVAT
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
    .post(
      "/arthit",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              arthitGasPlatformSchemaAndPrompt.statement.systemPrompt,
              arthitGasPlatformSchemaAndPrompt.statement.schema
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
    .post(
      "/jda-a18-b17",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              jdaSchemaAndPrompt.systemPrompt,
              jdaSchemaAndPrompt.schema
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
