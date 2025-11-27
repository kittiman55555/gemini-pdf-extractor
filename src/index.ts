import openapi from "@elysiajs/openapi";
import { Array, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "./extract-pdf.service";
import { pttRoutes } from "./routes/ptt";
import { Runtime } from "./runtime";
import { CARGO_SYSTEM_PROMPT, LNGCargoSchemaFlat } from "./schema/cargo";
import { InvoiceSchema, InvoiceSystemPrompt } from "./schema/invoice";
import {
  PELNG_EXTRACTION_SYSTEM_PROMPT,
  PELNGInvoiceSchema,
} from "./schema/pelng";
import { TSO_SYSTEM_PROMPT, TSOfileSchema } from "./schema/tso";

const app = new Elysia();

function debugEnv() {
  const program = Effect.Do.pipe(
    Effect.tap(() => Effect.logDebug("env", process.env))
  );
  Runtime.runSync(program);
}

debugEnv();

app
  .use(
    openapi({
      path: "/docs",
    })
  )
  .get("/health", () => "Ok")
  .use(pttRoutes)
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
      tags: ["PDF"],
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
      tags: ["PDF"],
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
        Effect.andThen((data) => ({
          ...data,
          customs_clearance_services_total: Array.reduce(
            data.customs_clearance_services,
            0,
            (acc, cur) => acc + cur.final_cost
          ),
        })),
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
      tags: ["PDF"],
    }
  )
  .post(
    "/tso",
    async ({ body, set }) => {
      const arrBuf = await body.file.arrayBuffer();
      const fileBuffer = Buffer.from(arrBuf);

      const program = Effect.all({
        svc: ExtractPDFService,
      }).pipe(
        Effect.andThen(({ svc }) =>
          svc.processInline(fileBuffer, TSO_SYSTEM_PROMPT, TSOfileSchema)
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
      tags: ["PDF"],
    }
  );

app.listen(3000);
console.log("server start at port:", 3000);
