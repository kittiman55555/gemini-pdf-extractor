import { Duration, Effect } from "effect";
import Elysia, { t } from "elysia";
import { ExtractPDFService } from "../../extract-pdf.service";
import { elysiaPdf } from "../../helpers";
import { RedisService } from "../../redis.service";
import { Runtime } from "../../runtime";
import { pttInventorySchemaAndPrompt } from "../../schema/ptt/inventory";
import { queryModel } from "../../utils/verify-caching";

export const inventoryRoutes = new Elysia().group("/inventory", (c) =>
  c.post(
    "/terminal-cost",
    async ({ body, query }) => {
      const file = body.file;
      const arrBuf = await file.arrayBuffer();
      const buf = Buffer.from(arrBuf);

      const result = await Effect.all({
        svc: ExtractPDFService,
        redis: RedisService,
      }).pipe(
        Effect.let("cacheFn", ({ redis }) => redis.withCache({
          file: buf,
          expiresIn: Duration.seconds(query.cacheDuration)
        })),
        Effect.andThen(({ svc, cacheFn }) =>

        {
          const program = svc.processInline(
            buf,
            pttInventorySchemaAndPrompt.terminalCost.systemPrompt,
            pttInventorySchemaAndPrompt.terminalCost.schema
          )
          if (query.cache === "false") {
            return program
          }
          return cacheFn(program)
        }
        ),
        Runtime.runPromise
      );

      return result;
    },
    {
      body: t.Object({
        file: elysiaPdf,
      }),
      query: queryModel,
      tags: ["PTT"],
    }
  )
);
