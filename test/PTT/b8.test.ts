import path from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ExtractPDFService } from "../../src/extract-pdf.service";
import { readFileAndSize } from "../../src/helpers";
import { Runtime } from "../../src/runtime";
import { B8InvoiceAndHeatSchemaAndSystemPrompt } from "../../src/schema/ptt/b8-invoice-and-heat";

describe("ptt invoice register", () => {
  it("should extract ok", async () => {
    const filePath = path.join(__dirname, "./แหล่ง B8 เดือน ส.ค. 68 - Pool.pdf");
    const { file } = await readFileAndSize(filePath);

    const program = Effect.all({
      svc: ExtractPDFService,
    }).pipe(
      Effect.andThen(({ svc }) =>
        svc.processInline(
          file,
          B8InvoiceAndHeatSchemaAndSystemPrompt.prompt,
          B8InvoiceAndHeatSchemaAndSystemPrompt.schema
        )
      ),
      Effect.andThen((data) => ({
        ...data,
        totalInvoiceAmount: data.invoices.reduce(
          (acc, cur) =>
            acc +
            cur.lineItems.reduce(
              (acc2, cur2) => acc2 + cur2.amountExcludingVAT,
              0
            ),
          0
        ),
      })),
      Effect.tap((data) => Effect.log("data", data)),
      Effect.tapError((error) => Effect.logError("error -->", error.error))
    );

    const object = await Runtime.runPromise(program);
    console.log({ object });
    expect(object).toMatchSnapshot();
  });
});
