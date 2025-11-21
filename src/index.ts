import openapi from "@elysiajs/openapi";
import { Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "./extract-pdf.service";
import { Runtime } from "./runtime";
import { CARGO_SYSTEM_PROMPT, LNGCargoSchemaFlat } from "./schema/cargo";
import { InvoiceSchema, InvoiceSystemPrompt } from "./schema/invoice";
import {
  PELNG_EXTRACTION_SYSTEM_PROMPT,
  PELNGInvoiceSchema,
} from "./schema/pelng";

const app = new Elysia();

app
  .use(
    openapi({
      path: "/docs",
    })
  )
  .get("/health", () => "Ok")
  .post(
    "/invoice",
    async ({ body }) => {
      const arrBuf = await body.file.arrayBuffer();
      const fileBuffer = Buffer.from(arrBuf);

      const program = Effect.all({
        svc: ExtractPDFService,
      }).pipe(
        Effect.andThen(({ svc }) =>
          svc.processInline(fileBuffer, InvoiceSystemPrompt, InvoiceSchema)
        ),
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
      console.log({ result });
      return result;
    },
    {
      body: t.Object(
        {
          file: t.File({ format: "application/pdf" }),
        },
        {
          description: "Upload an invoice",
        }
      ),
      tags: ["Invoice"],
    }
  )
  .post(
    "/pelng",
    async ({ body }) => {
      const arrBuf = await body.file.arrayBuffer();
      const fileBuffer = Buffer.from(arrBuf);

      const program = Effect.all({
        svc: ExtractPDFService,
      }).pipe(
        Effect.andThen(({ svc }) =>
          svc.processInline(
            fileBuffer,
            PELNG_EXTRACTION_SYSTEM_PROMPT,
            PELNGInvoiceSchema
          )
        ),
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
      console.log({ result });
      return result;
    },
    {
      body: t.Object({
        file: t.File({ format: "application/pdf" }),
      }),
      tags: ["Invoice"],
    }
  )
  .post(
    "/cargo",
    async ({ body, set }) => {
      const arrBuf = await body.file.arrayBuffer();
      const fileBuffer = Buffer.from(arrBuf);

      const program = Effect.all({
        svc: ExtractPDFService,
      }).pipe(
        Effect.andThen(({ svc }) =>
          svc.processInline(fileBuffer, CARGO_SYSTEM_PROMPT, LNGCargoSchemaFlat)
        ),
        Effect.catchTag("ExtractPDF/Process/Error", (error) => {
          set.status = 500;
          return Effect.succeed({
            message: error.message,
            error: error.error,
            status: "500",
          });
        })
      );

      const result = await Runtime.runPromise(program);
      console.log({ result });
      return result;
    },
    {
      body: t.Object({
        file: t.File({ format: "application/pdf" }),
      }),

      response: {
        200: t.Object({
          voyage_seller_name: t.String(),
          voyage_payment_due_date: t.String(),
          voyage_vessel_name: t.String(),
          voyage_load_port: t.String(),
          voyage_quantity_mmbtu: t.Number(),
          voyage_price_usd_per_mmbtu: t.Number(),
          voyage_net_amount_usd: t.Number(),
          customs_clearance_services: t.Array(
            t.Object({
              final_cost: t.Number(),
              description: t.Optional(t.String()),
              currency: t.Optional(t.String()),
              reference_no: t.Optional(t.String()),
            })
          ),
          voyage_total_amount_incl_gst: t.Optional(t.Number()),
          unloading_higher_heating_value: t.Optional(t.Number()),
          quantity_net_delivered: t.Optional(t.Number()),
          survey_fee_before_tax: t.Optional(t.Number()),
          exchange_rate_usd_to_thb: t.Optional(t.Number()),
        }),
        500: t.Object({
          message: t.String(),
          error: t.Any(),
          status: t.String(),
        }),
      },
      tags: ["Invoice"],
    }
  );

app.listen(3000);
console.log("server start at port:", 3000);
