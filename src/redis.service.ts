import { createHash } from "node:crypto";
import process from "node:process";
import { Data, Duration, Effect, Option } from "effect";
import { createClient } from "redis";

export class RedisCreateClientError extends Data.TaggedError(
  "Redis/Client/Create/Error"
)<{ error: unknown; message: string }> {}

export class RedisOperationError extends Data.TaggedError(
  "Redis/Operation/Error"
)<{
  error: unknown;
  operation: string;
  message: string;
}> {}

export class RedisService extends Effect.Service<RedisService>()(
  "Service/Redis",
  {
    effect: Effect.gen(function* () {
      const redisClient = yield* Effect.tryPromise({
        try: async () =>
          createClient({
            url: process.env.USE_CACHE,
          }),
        catch: (error) =>
          new RedisCreateClientError({
            error,
            message: "create redis client error",
          }),
      }).pipe(
        Effect.andThen((client) =>
          Effect.tryPromise({
            try: () => client.connect(),
            catch: (error) =>
              new RedisOperationError({
                error,
                operation: "connect",
                message: "connect error",
              }),
          })
        )
      );

      const flush = Effect.tryPromise({
        try: () => redisClient.FLUSHDB("ASYNC"),
        catch: (error) =>
          new RedisOperationError({
            error,
            operation: "flush db",
            message: "clear cache error",
          }),
      });

      const hashFile = (file: Buffer): string =>
        createHash("sha256").update(file).digest("hex");

      const get = <T>(key: string) =>
        Effect.tryPromise({
          try: () => redisClient.get(key),
          catch: (error) =>
            new RedisOperationError({
              error,
              operation: "get",
              message: `get by key: ${key} error`,
            }),
        }).pipe(
          Effect.andThen(Effect.fromNullable),
          Effect.map((str) => Option.some(JSON.parse(str) as T)),
          Effect.catchTag("NoSuchElementException", () =>
            Effect.succeed(Option.none<T>())
          )
        );

      const set = <Value>(
        key: string,
        value: Value,
        expiresIn: Duration.Duration
      ) =>
        Effect.tryPromise({
          try: () =>
            redisClient.set(key, JSON.stringify(value), {
              expiration: {
                type: "EX",
                value: Duration.toSeconds(expiresIn),
              },
            }),
          catch: (error) =>
            new RedisOperationError({
              error,
              operation: "set",
              message: `set error, key:${key}, value: ${JSON.stringify(value, null, 2)}, expires in: ${Duration.toSeconds(expiresIn)}`,
            }),
        });

      const withCache =
        ({ file, expiresIn }: { file: Buffer; expiresIn: Duration.Duration }) =>
        <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          Effect.gen(function* () {
            const key = hashFile(file);
            const cacheValue = yield* get<A>(key);
            if (Option.isSome(cacheValue)) {
              return cacheValue.value;
            }

            const result = yield* effect;
            yield* set(key, result, expiresIn);
            return result;
          });

      return {
        redisClient,
        flush,
        withCache,
      };
    }),
  }
) {}
