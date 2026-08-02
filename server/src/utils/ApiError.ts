export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, options?: { details?: unknown; isOperational?: boolean }) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = "Bad request", details?: unknown): ApiError {
    return new ApiError(400, message, { details });
  }
  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }
  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict", details?: unknown): ApiError {
    return new ApiError(409, message, { details });
  }
  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, { isOperational: false });
  }
}