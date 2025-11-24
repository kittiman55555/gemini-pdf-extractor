// import path from "node:path";
// import { Effect } from "effect";
// import { describe, expect, it } from "vitest";
// import { ExtractPDFService } from "../src/extract-pdf.service";
// import { readFileAndSize } from "../src/helpers";
// import { Runtime } from "../src/runtime";
// import { pttTSOSchemaAndPrompt } from "../src/schema/ptt/tso";

// const files = {
//     egat: path.join(__dirname, "Invoice_EGAT.pdf"),
//     pelng: path.join(__dirname, "PELNG_EGAT.pdf"),
//     cargo2: path.join(__dirname, "EGAT_Cargo2.pdf"),
//     ptt: {
//         supply: {
//             invoice: path.join(__dirname, "PTT/G1-61_Aug25.pdf"),
//         },
//         tso: {
//             gasAmount: path.join(
//                 __dirname,
//                 "PTT/80000856-236-2568_ข้อมูลรายงาน Pool Manager cc PTT สค68_10กย68_PTT.pdf"
//             ),
//         },
//     },
// };

// describe("extract invoice", () => {

//     // === TSO Gas Anoount ===

//     it("should extract invoice data", async () => {
//         const { file } = await readFileAndSize(files.ptt.tso.gasAmount);
//         const program = Effect.all({
//             svc: ExtractPDFService,
//         }).pipe(
//             Effect.andThen(({ svc }) =>
//                 svc.processInline(
//                     file,
//                     pttTSOSchemaAndPrompt.gasAmount.systemPrompt,
//                     pttTSOSchemaAndPrompt.gasAmount.schema
//                 )
//             ),
//             Effect.tap((data) => Effect.log("data", data)),
//             Effect.tapError((error) => Effect.logError("error -->", error.error))
//         );
//         const result = await Runtime.runPromise(program);
//         // {
//         //   volumeArea2KhanomMMBTU: 2165209,
//         //     volumeArea3OnshoreMMBTU: 87753753,
//         //       volumeArea4ChanaMMBTU: 2990682
//         // }

//         expect(result.volumeArea2KhanomMMBTU).toEqual(2_165_209);
//         expect(result.volumeArea3OnshoreMMBTU).toEqual(87_753_753);
//         expect(result.volumeArea4ChanaMMBTU).toEqual(2_990_682);
//     });
// });
export {};
