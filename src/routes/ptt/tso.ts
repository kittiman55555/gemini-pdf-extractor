import { Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { Runtime } from "../../runtime";
import { pttTSOSchemaAndPrompt } from "../../schema/ptt/tso";

export const tsoRoutes = new Elysia().group("/tso", (c) =>
  c.post(
    "/gas-amount",
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
            pttTSOSchemaAndPrompt.gasAmount.systemPrompt,
            pttTSOSchemaAndPrompt.gasAmount.schema
          )
        ),
        Effect.andThen(({volumeArea2KhanomMMBTU, volumeArea3OnshoreMMBTU, volumeArea4ChanaMMBTU}) => {
          const sum = volumeArea2KhanomMMBTU + volumeArea3OnshoreMMBTU + volumeArea4ChanaMMBTU
          return {
            volumeArea234: sum
          }
        }),
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
