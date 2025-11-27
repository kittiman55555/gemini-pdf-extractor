import process from "node:process";
import { Layer, Logger, LogLevel, ManagedRuntime } from "effect";
import { ExtractPDFService } from "./extract-pdf.service";
import { ModelProvider } from "./model.provider";
import { RedisService } from "./redis.service";

const allLive = Layer.mergeAll(
  ExtractPDFService.Default,
  RedisService.Default,
  Logger.minimumLogLevel(LogLevel.fromLiteral(process.env.LOG_LEVEL || "Info")),
  Logger.pretty
).pipe(Layer.provideMerge(ModelProvider.Default));

export const Runtime = ManagedRuntime.make(allLive);
