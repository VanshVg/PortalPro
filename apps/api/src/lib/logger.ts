import pino from "pino";
import { LOG_LEVEL, IS_DEVELOPMENT } from "./env";

/**
 * Structured JSON logger using pino.
 * Every log entry should include contextual fields (tenantId, userId, requestId).
 */
export const logger = pino({
  level: LOG_LEVEL,
  transport:
    IS_DEVELOPMENT
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
