import type { Response } from "express";

export class ApiResponse<T> {
  constructor(
    public readonly statusCode: number,
    public readonly data: T,
    public readonly message?: string,
  ) {}

  send(res: Response): Response {
    return res.status(this.statusCode).json({
      success: this.statusCode < 400,
      message: this.message,
      data: this.data,
    });
  }
}

/** Convenience helpers. */
export const ok = <T>(res: Response, data: T, message?: string) =>
  new ApiResponse(200, data, message).send(res);

export const created = <T>(res: Response, data: T, message?: string) =>
  new ApiResponse(201, data, message).send(res);