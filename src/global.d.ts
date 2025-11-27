/* eslint-disable @typescript-eslint/no-empty-object-type */
/** biome-ignore-all lint/style/noNamespace: NodeJS */

import type { LogLevel } from "effect";

type Env = {
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  LOG_LEVEL: LogLevel.LogLevel["_tag"];
  REDIS_URL: string;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {
      NODE_ENV: "development" | "production" | "test" | "uat";
    }
  }
}
export type IEnv = Env;
