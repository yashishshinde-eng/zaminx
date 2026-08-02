export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  /** HTTP headers to attach to the error response (e.g. `Retry-After`). */
  public readonly headers?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    options?: { details?: unknown; isOperational?: boolean; headers?: Record<string, string> },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    this.headers = options?.headers;
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
  static payloadTooLarge(message = "Request body too large"): ApiError {
    return new ApiError(413, message);
  }
  static tooManyRequests(message = "Too many requests, please try again later.", retryAfterSeconds?: number): ApiError {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (retryAfterSeconds && retryAfterSeconds > 0) headers["Retry-After"] = String(retryAfterSeconds);
    return new ApiError(429, message, { headers });
  }
  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, { isOperational: false });
  }
  static badGateway(message = "Upstream gateway error"): ApiError {
    return new ApiError(502, message, { isOperational: false });
  }
  static serviceUnavailable(message = "Service unavailable", retryAfterSeconds?: number): ApiError {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (retryAfterSeconds && retryAfterSeconds > 0) headers["Retry-After"] = String(retryAfterSeconds);
    return new ApiError(503, message, { headers });
  }
  static gatewayTimeout(message = "Gateway timeout"): ApiError {
    return new ApiError(504, message, { isOperational: false });
  }
}