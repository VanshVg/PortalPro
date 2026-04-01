import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Attaches a unique request ID to every incoming request.
 * Used for request tracing across logs.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.headers["x-request-id"] = req.headers["x-request-id"] ?? randomUUID();
  next();
}
