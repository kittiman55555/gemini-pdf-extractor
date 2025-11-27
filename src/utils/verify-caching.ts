import { t } from "elysia";


export const queryModel = t.Object({
    cache: 
        t.Union([t.Literal("true"), t.Literal("false")], {
            default: "true",
        }),
    cacheDuration: t.Number({ default: 60 }), // in seconds
});

export function shouldCache(query: { cache: string | undefined }) {
  return query.cache === "true" || query.cache === undefined;
}