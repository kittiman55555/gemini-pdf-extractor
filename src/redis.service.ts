import { Effect } from "effect";

export class RedisService extends Effect.Service<RedisService>()(
  "Service/Redis",
  {
    effect: Effect.gen(function* () {
      return {};
    }),
  }
) {}
