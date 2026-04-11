import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "@portalpro/types";

import { logger } from "../lib/logger";

/**
 * Global error handling middleware.
 * Catches all errors thrown in route handlers and services,
 * returning standardized error responses.
 */
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.headers["x-request-id"] as string;

  // Handle typed application errors
  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, message: err.message }, "Application error");
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (!details[path]) details[path] = [];
      details[path].push(issue.message);
    }

    logger.warn({ requestId, details }, "Validation error");
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details,
      },
    });
    return;
  }

  // Handle Prisma connection / initialization errors with a clean 503
  if (err.name === "PrismaClientInitializationError" || err.message?.includes("Can't reach database server")) {
    logger.error({ requestId, error: err.message }, "Database connection error");
    res.status(503).json({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database temporarily unavailable. Please retry in a moment.",
      },
    });
    return;
  }

  // Handle unexpected errors
  logger.error({ requestId, error: err.message, stack: err.stack }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}
