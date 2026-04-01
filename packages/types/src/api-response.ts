import type { ErrorCode } from "./errors";

/**
 * Standard successful API response wrapper.
 *
 * @example
 * { data: { id: "clx...", name: "My Project" } }
 * { data: [...], meta: { page: 1, limit: 20, total: 45 } }
 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** Pagination metadata for list endpoints. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard error API response.
 *
 * @example
 * { error: { code: "NOT_FOUND", message: "Project not found: clx..." } }
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Convenience type for paginated list responses.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
