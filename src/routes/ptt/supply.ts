/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: <explanation> */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <explanation> */

import { Array, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { Runtime } from "../../runtime";
import { arthitGasPlatformSchemaAndPrompt } from "../../schema/ptt/arthit";
import { B8InvoiceAndHeatSchemaAndSystemPrompt } from "../../schema/ptt/b8-invoice-and-heat";
import { pttC5SchemaandPromt } from "../../schema/ptt/c5-g448";
import { invoiceAndHeatSchemaAndPrompt } from "../../schema/ptt/invoice-register-and-heat";
import { pttJdaSchemaAndPrompt } from "../../schema/ptt/jda-a18-b17";
import { pailinSchemaAndPrompt } from "../../schema/ptt/pailin";
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

          // if (documentType === "c5_g4" && confidence > 90) {
          //   return yield* svc
          //     .processInline(
          //       buf,
          //       invoiceAndHeatSchemaAndPrompt.systemPrompt,
          //       invoiceAndHeatSchemaAndPrompt.schema
          //     )
          //     .pipe(
          //       Effect.andThen((data) => ({
          //         ...data,
          //         total_amount_exclude_vat: Array.reduce(
          //           data.invoiceData,
          //           0,
          //           (acc, cur) => acc + cur.totalAmount_ExclVAT
          //         ),
          //       }))
          //     );
          // }
          if (documentType === "c5_g4" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              pttC5SchemaandPromt.g448.systemPrompt,
              pttC5SchemaandPromt.g448.schema
            )
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

          if (documentType === "b8_benchamas" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                B8InvoiceAndHeatSchemaAndSystemPrompt.prompt,
                B8InvoiceAndHeatSchemaAndSystemPrompt.schema
              )
              .pipe(
                Effect.let("svcData", (data) => data),
                Effect.let("totalInvoiceAmount", ({ svcData }) => {
                  const invoice = Array.flatMap(svcData.invoices, (inv) =>
                    Array.map(inv.lineItems, (a) => a.amountExcludingVAT)
                  );
                  return Array.reduce(invoice, 0, (acc, cur) => acc + cur);
                }),
                Effect.andThen(({ svcData, totalInvoiceAmount }) => ({
                  ...svcData,
                  totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
                })),
                Effect.orElseSucceed(() => null)
              );
          }

          if (documentType === "pailin" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              pailinSchemaAndPrompt.systemPrompt,
              pailinSchemaAndPrompt.schema
            )
              .pipe(
                Effect.andThen((data) => {
                  const n = Array.flatMap(data.invoices, (d) =>
                    Array.map(d.lineItems, (a) => a.amountExcludingVAT)
                  );
                  const totalInvoiceAmount = Array.reduce(
                    n,
                    0,
                    (acc, cur) => acc + cur
                  );

                  return {
                    ...data,
                    totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
                  };
                }),
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
          }

          if (documentType === "arthit_statement" && confidence > 90) {
            return yield* svc
              .processInline(
                buf,
                arthitGasPlatformSchemaAndPrompt.statement.systemPrompt,
                arthitGasPlatformSchemaAndPrompt.statement.schema
            )
              .pipe(
                Effect.andThen((results) => {
                  let total_mmbtu = 0;
                  let total_thb = 0;
                  for (const item of results) {
                    total_mmbtu += item.quantity_mmbtu;
                    total_thb += item.amount_thb;
                  }
                  return {
                    results,
                    total_mmbtu,
                    total_thb,
                  };
                })
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

          if (documentType === "jda_a18" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              pttJdaSchemaAndPrompt.jdaa18.systemPrompt,
              pttJdaSchemaAndPrompt.jdaa18.schema
            ).pipe(
              Effect.andThen((results) => ({
                results,
                total_scf: results.contract_gas_mmbtu + results.shortfall_gas_mmbtu,
                total_usd:
                  results.contract_gas_amount_usd +
                  results.shortfall_gas_amount_usd,
              })),
            )
          }

          if (documentType === "jda_b17" && confidence > 90) {
            return yield* svc.processInline(
              buf,
              pttJdaSchemaAndPrompt.jdab17.systemPrompt,
              pttJdaSchemaAndPrompt.jdab17.schema
            ).pipe(
              Effect.andThen((results) => ({
                results,
                total_mmbtu:
                  results.contract_price_2_mmbtu +
                  results.contract_price_mmbtu +
                  results.swapping_mmbtu,
                total_usd:
                  results.contract_price_2_amount_usd +
                  results.contract_price_amount_usd +
                  results.swapping_amount_usd,
              })),
            )
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
          Effect.let("svcData", (data) => data),
          Effect.let("totalInvoiceAmount", ({ svcData }) => {
            const invoice = Array.flatMap(svcData.invoices, (inv) =>
              Array.map(inv.lineItems, (a) => a.amountExcludingVAT)
            );
            return Array.reduce(invoice, 0, (acc, cur) => acc + cur);
          }),
          Effect.andThen(({ svcData, totalInvoiceAmount }) => ({
            ...svcData,
            totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
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
          Effect.andThen((results) => {
            let total_mmbtu = 0;
            let total_thb = 0;
            for (const item of results) {
              total_mmbtu += item.quantity_mmbtu;
              total_thb += item.amount_thb;
            }
            return {
              results,
              total_mmbtu,
              total_thb,
            };
          }),
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
      "/jda-a18",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              pttJdaSchemaAndPrompt.jdaa18.systemPrompt,
              pttJdaSchemaAndPrompt.jdaa18.schema
            )
          ),
          Effect.andThen((results) => ({
            results,
            total_scf: results.contract_gas_mmbtu + results.shortfall_gas_mmbtu,
            total_usd:
              results.contract_gas_amount_usd +
              results.shortfall_gas_amount_usd,
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
      "/jda-b17",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              pttJdaSchemaAndPrompt.jdab17.systemPrompt,
              pttJdaSchemaAndPrompt.jdab17.schema
            )
          ),
          Effect.andThen((results) => ({
            results,
            total_mmbtu:
              results.contract_price_2_mmbtu +
              results.contract_price_mmbtu +
              results.swapping_mmbtu,
            total_usd:
              results.contract_price_2_amount_usd +
              results.contract_price_amount_usd +
              results.swapping_amount_usd,
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
      "/c5",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              pttC5SchemaandPromt.g448.systemPrompt,
              pttC5SchemaandPromt.g448.schema
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
      "/pailin",
      async ({ body }) => {
        const arrBuf = await body.file.arrayBuffer();
        const buf = Buffer.from(arrBuf);

        const program = Effect.all({
          svc: ExtractPDFService,
        }).pipe(
          Effect.andThen(({ svc }) =>
            svc.processInline(
              buf,
              pailinSchemaAndPrompt.systemPrompt,
              pailinSchemaAndPrompt.schema
            )
          ),
          Effect.andThen((data) => {
            const n = Array.flatMap(data.invoices, (d) =>
              Array.map(d.lineItems, (a) => a.amountExcludingVAT)
            );
            const totalInvoiceAmount = Array.reduce(
              n,
              0,
              (acc, cur) => acc + cur
            );

            return {
              ...data,
              totalInvoiceAmount: totalInvoiceAmount.toFixed(2),
            };
          }),
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
