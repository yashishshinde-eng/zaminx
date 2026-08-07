import type { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyAccessToken } from "../services/token.service.js";
import { User, type UserDocument } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import type { UserRole } from "@zeminex/shared";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDocument & { id: string };
      accessToken?: string;
      /** Raw request body captured for webhook signature verification. */
      rawBody?: Buffer;
    }
  }
}

/** Extract and verify the bearer token, attaching the user to `req.user`. */
export const authenticate: RequestHandler = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized("Missing access token");

    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized("User no longer exists");
    if (user.status !== "active") throw ApiError.forbidden("Account is not active");

    req.user = user as UserDocument & { id: string };
    req.accessToken = token;
    next();
  } catch (err) {
    next(err);
  }
};

/** Restrict a route to one or more roles. Must run after `authenticate`. */
export const authorize =
  (...roles: UserRole[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role as UserRole)) return next(ApiError.forbidden("Insufficient permissions"));
    next();
  };