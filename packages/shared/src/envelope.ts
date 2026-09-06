export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return { success: true, data, ...(meta ? { meta } : {}) };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiError {
  return {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
}

export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  THREAD_NOT_FOUND: 'THREAD_NOT_FOUND',
  INVALID_QUERY_PARAM: 'INVALID_QUERY_PARAM',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_BODY: 'INVALID_BODY',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  LLM_UPSTREAM: 'LLM_UPSTREAM',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
