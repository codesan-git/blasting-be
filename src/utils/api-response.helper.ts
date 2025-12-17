// src/utils/api-response.helper.ts
import { Response } from "express";
import {
  ApiResponse,
  SuccessResponse,
  ErrorResponse,
  HttpStatus,
  ValidationError,
  ResponseMeta,
} from "../types/api-response.types";

/**
 * Get Jakarta timestamp
 */
function getTimestamp(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Success Response Helper
 */
export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = "Success",
    statusCode: number = HttpStatus.OK,
    meta?: ResponseMeta,
  ): void {
    const response: SuccessResponse<T> = {
      success: true,
      statusCode: statusCode as 200 | 201 | 202 | 204,
      message,
      data,
      meta,
      timestamp: getTimestamp(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response (201)
   */
  static created<T>(
    res: Response,
    data: T,
    message: string = "Resource created successfully",
  ): void {
    this.success(res, data, message, HttpStatus.CREATED);
  }

  /**
   * Send accepted response (202)
   */
  static accepted(
    res: Response,
    message: string = "Request accepted for processing",
  ): void {
    const response: SuccessResponse<null> = {
      success: true,
      statusCode: HttpStatus.ACCEPTED,
      message,
      timestamp: getTimestamp(),
    };

    res.status(HttpStatus.ACCEPTED).json(response);
  }

  /**
   * Send no content response (204)
   */
  static noContent(res: Response): void {
    res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: ResponseMeta,
    message: string = "Success",
  ): void {
    const response: SuccessResponse<T[]> = {
      success: true,
      statusCode: HttpStatus.OK,
      message,
      data,
      meta,
      timestamp: getTimestamp(),
    };

    res.status(HttpStatus.OK).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    errors?: ValidationError[],
  ): void {
    const response: ErrorResponse = {
      success: false,
      statusCode: statusCode as
        | 400
        | 401
        | 403
        | 404
        | 409
        | 422
        | 429
        | 500
        | 502
        | 503,
      message,
      data: null,
      errors,
      timestamp: getTimestamp(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = "Bad request",
    errors?: ValidationError[],
  ): void {
    this.error(res, message, HttpStatus.BAD_REQUEST, errors);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = "Unauthorized. Please login first.",
  ): void {
    this.error(res, message, HttpStatus.UNAUTHORIZED);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = "Access denied. Insufficient permissions.",
  ): void {
    this.error(res, message, HttpStatus.FORBIDDEN);
  }

  /**
   * Send not found response (404)
   */
  static notFound(res: Response, message: string = "Resource not found"): void {
    this.error(res, message, HttpStatus.NOT_FOUND);
  }

  /**
   * Send conflict response (409)
   */
  static conflict(
    res: Response,
    message: string = "Resource already exists",
  ): void {
    this.error(res, message, HttpStatus.CONFLICT);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    errors: ValidationError[],
    message: string = "Validation failed",
  ): void {
    this.error(res, message, HttpStatus.UNPROCESSABLE_ENTITY, errors);
  }

  /**
   * Send too many requests response (429)
   */
  static tooManyRequests(
    res: Response,
    message: string = "Too many requests. Please try again later.",
  ): void {
    this.error(res, message, HttpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * Send internal server error response (500)
   */
  static internalError(
    res: Response,
    message: string = "Internal server error",
  ): void {
    this.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Send service unavailable response (503)
   */
  static serviceUnavailable(
    res: Response,
    message: string = "Service temporarily unavailable",
  ): void {
    this.error(res, message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

// Export default
export default ResponseHelper;
