// src/types/api-response.types.ts
// Standardized API response types

/**
 * HTTP Status Codes
 */
export enum HttpStatus {
  // Success
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,

  // Client Errors
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,

  // Server Errors
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Base API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: ResponseMeta;
  timestamp: string;
}

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Response Metadata
 */
export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * Success Response
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  statusCode: 200 | 201 | 202 | 204;
}

/**
 * Error Response
 */
export interface ErrorResponse extends ApiResponse<null> {
  success: false;
  statusCode: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
  data: null;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  meta: Required<ResponseMeta>;
}
