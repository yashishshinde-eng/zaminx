import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export interface AccessJwtPayload extends JwtPayload {
  sub: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires — handy for clients. */
  expiresIn: number;
}

export function signAccessToken(userId: string, role: string): { token: string; expiresIn: number } {
  const expiresIn = env.JWT_ACCESS_EXPIRY;
  const token = jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, { expiresIn } as jwt.SignOptions);
  return { token, expiresIn: toSeconds(expiresIn) };
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessJwtPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessJwtPayload;
  } catch {
    throw ApiError.unauthorized("Invalid or expired access token");
  }
}

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    if (payload.type !== "refresh") throw new Error("wrong token type");
    return { sub: payload.sub as string };
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }
}

/** Issue a brand new pair for a user. */
export function issueTokens(userId: string, role: string): TokenPair {
  const { token: accessToken, expiresIn } = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId);
  return { accessToken, refreshToken, expiresIn };
}

function toSeconds(expiry: string): number {
  // Accepts "15m", "7d", "3600s", or a bare number of seconds.
  const match = /^(\d+)([smhd])?$/.exec(expiry.trim());
  if (!match) return 900;
  const value = Number(match[1]);
  switch (match[2]) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      return value;
  }
}