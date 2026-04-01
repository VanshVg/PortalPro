/**
 * Error codes used across the application.
 */
export type ErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR";

/**
 * Base application error. All typed errors extend this class.
 * Carries a machine-readable `code` and HTTP `statusCode`.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Thrown when a requested entity does not exist (or is not accessible by the current tenant).
 */
export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND", 404);
  }
}

/**
 * Thrown when the authenticated user lacks permission for the requested action.
 */
export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, "FORBIDDEN", 403);
  }
}

/**
 * Thrown when the request is not authenticated.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "UNAUTHORIZED", 401);
  }
}

/**
 * Thrown when request input fails Zod validation.
 */
export class ValidationError extends AppError {
  constructor(details: Record<string, string[]>) {
    super("Validation failed", "VALIDATION_ERROR", 400, details);
  }
}
