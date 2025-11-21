import path from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ExtractPDFService } from "../src/extract-pdf.service";
import { readFileAndSize } from "../src/helpers";
import { Runtime } from "../src/runtime";
import { CARGO_SYSTEM_PROMPT, LNGCargoSchemaFlat } from "../src/schema/cargo";

const files = {
  egat: path.join(__dirname, "Invoice_EGAT.pdf"),
  pelng: path.join(__dirname, "PELNG_EGAT.pdf"),
  cargo2: path.join(__dirname, "EGAT_Cargo2.pdf"),
};

describe("extract invoice", () => {
  // it("should extract invoice data", async () => {
  //   const { file } = await readFileAndSize(files.egat);

  //   const program = Effect.all({
  //     svc: ExtractPDFService,
  //   }).pipe(
  //     Effect.andThen(({ svc }) =>
  //       svc.processInline(file, InvoiceSystemPrompt, InvoiceSchema)
  //     ),
  //     Effect.tap((data) => Effect.log("data", data)),
  //     Effect.tapError((error) => Effect.logError("error -->", error.error))
  //   );

  //   const object = await Runtime.runPromise(program);

  //   expect(object.quantity).eq(4_964_035);
  //   expect(object.unitPriceTHBPerMMBTU).eq(433.7759);
  //   expect(object.subtotalTHB).eq(2_153_278_749.76);
  //   expect(object.vatTHB).eq(150_729_512.48);
  //   expect(object.totalTHB).eq(2_304_008_262.24);
  //   expect(object.currency).eq("THB");
  //   expect(object.vatRate).eq(0.07);
  // });

  // it("should ok with PELNG pdf", async () => {
  //   const { file } = await readFileAndSize(files.pelng);

  //   const program = Effect.all({
  //     svc: ExtractPDFService,
  //   }).pipe(
  //     Effect.andThen(({ svc }) =>
  //       svc.processInline(
  //         file,
  //         PELNG_EXTRACTION_SYSTEM_PROMPT,
  //         PELNGInvoiceSchema
  //       )
  //     ),
  //     Effect.tap((data) => Effect.log("data", data)),
  //     Effect.tapError((error) => Effect.logError("error -->", error.error))
  //   );

  //   const object = await Runtime.runPromise(program);

  //   expect(object.stationServiceFeeTHB).eq(119_909_458.92);
  //   expect(object.fixedCostQuantityMMBTU).eq(6_510_000);
  //   expect(object.fixedCostUnitPriceTHBPerMMBTU).eq(17.7598);
  //   expect(object.fixedCostAmountTHB).eq(115_616_298);
  //   expect(object.variableCostQuantityMMBTU).eq(4_965_488);
  //   expect(object.variableCostUnitPriceTHBPerMMBTU).eq(0.8646);
  //   expect(object.variableCostAmountTHB).eq(4_293_160.92);
  //   expect(object.rlngTotalValueTHB).eq(2_033_999_638.4);
  //   expect(object.totalAmountTHB).eq(128_303_121.04);
  //   expect(object.currency).eq("THB");
  //   expect(object.notes).eq(
  //     "ไม่ต้องหักภาษี ณ ที่จ่ายเนื่องจากได้รับการส่งเสริมจาก BOI (บัตรส่งเสริม เลขที่ 67-1448-1-00-1-2)"
  //   );
  // });

  it("should ok with cargo pdf", async () => {
    const { file } = await readFileAndSize(files.cargo2);

    const program = Effect.all({
      svc: ExtractPDFService,
    }).pipe(
      Effect.andThen(({ svc }) =>
        svc.processInline(file, CARGO_SYSTEM_PROMPT, LNGCargoSchemaFlat)
      ),
      Effect.tap((data) => Effect.log("data", data)),
      Effect.tapError((error) => Effect.logError("error -->", error.error))
    );

    const object = await Runtime.runPromise(program);
    console.log({ object });

    // {
    //    voyage_seller_name: 'PetroChina International (Singapore) Pte. Ltd.',
    //    voyage_payment_due_date: '2025-09-17',
    //    voyage_vessel_name: 'CELSIUS GALAPAGOS',
    //    voyage_load_port: 'Corpus Christi, United States of America',
    //    voyage_quantity_mmbtu: 3727474,
    //    voyage_price_usd_per_mmbtu: 12.8111,
    //    voyage_net_amount_usd: 47753042.16,
    //    voyage_total_amount_incl_gst: 47753042.16,
    //    unloading_higher_heating_value: 1031.12,
    //    quantity_net_delivered: 71121.478,
    //    survey_fee_before_tax: 19164.75,
    //    exchange_rate_usd_to_thb: 32.4975,
    //    customs_clearance_services: [
    //      {
    //        description: 'Customs document and off-premises fees',
    //        final_cost: 3280,
    //        currency: 'THB',
    //        reference_no: '2621-642229/28-08-68'
    //      },
    //      {
    //        description: 'Customs Overtime Fee',
    //        final_cost: 1000,
    //        currency: 'THB',
    //        reference_no: '2621-642232/28-08-68'
    //      },
    //      {
    //        description: 'Customs Clearance Fee',
    //        final_cost: 200,
    //        currency: 'THB',
    //        reference_no: '2621-9000144/28-08-68'
    //      }
    //    ],
    //  }

    expect(object.voyage_seller_name.toLowerCase()).eq(
      "petrochina international (singapore) pte. ltd."
    );
    expect(object.voyage_payment_due_date).eq("2025-09-17");
    expect(object.voyage_vessel_name.toLowerCase()).eq("celsius galapagos");
    // expect(object.voyage_load_port.toLowerCase()).eq(
    //   "corpus christi, united states of america"
    // );
    expect(object.voyage_load_port.toLowerCase()).contain("corpus christi");
    expect(object.voyage_quantity_mmbtu).eq(3_727_474);
    expect(object.voyage_price_usd_per_mmbtu).eq(12.8111);
    expect(object.voyage_net_amount_usd).eq(47_753_042.16);
    expect(object.voyage_total_amount_incl_gst).eq(47_753_042.16);
    expect(object.unloading_higher_heating_value).eq(1031.12);
    expect(object.quantity_net_delivered).eq(71_121.478);
    expect(object.survey_fee_before_tax).eq(19_164.75);
    expect(object.exchange_rate_usd_to_thb).eq(32.4975);
    expect(
      object.customs_clearance_services.map((item) => item.final_cost)
    ).toEqual([3280, 1000, 200]);
  });
});
