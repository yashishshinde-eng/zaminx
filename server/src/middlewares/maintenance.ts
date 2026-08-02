import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { getMaintenanceSettings } from "../services/setting.service.js";
import { verifyAccessToken } from "../services/token.service.js";
import type { MaintenanceSettings } from "@zaminex/shared";

/**
 * Maintenance enforcement (Phase 14C). When `general.maintenanceMode.enabled`
 * is true, respond 503 (JSON) to every non-admin API request — except the auth
 * endpoints an admin needs to get back in (`/auth/login`, `/auth/refresh`,
 * `/auth/logout`). Admins pass through. The role is read best-effort from the
 * access JWT (no DB lookup) so the cost of an active maintenance window is
 * minimal.
 *
 * Auth endpoints are bypassed unconditionally (so a locked-out admin can still
 * log in and disable maintenance). A 5s in-memory cache avoids a DB hit per
 * request.
 */
const AUTH_BYPASS = new Set(["/auth/login", "/auth/refresh", "/auth/logout"]);

let cache: { value: MaintenanceSettings; at: number } | null = null;
const CACHE_TTL_MS = 5_000;

async function currentMaintenance(): Promise<MaintenanceSettings> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;
  // If the DB isn't connected we can't read the maintenance flag — default to
  // off (allow traffic) AND skip the call entirely so we don't block on
  // Mongoose's connection-buffering timeout when the DB is down (dev/smoke).
  // readyState 1 === connected.
  let value: MaintenanceSettings = { enabled: false, message: "" };
  if (mongoose.connection.readyState === 1) {
    try {
      value = await getMaintenanceSettings();
    } catch {
      value = { enabled: false, message: "" };
    }
  }
  cache = { value, at: now };
  return value;
}

export async function enforceMaintenance(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (AUTH_BYPASS.has(req.path)) return next();

  const { enabled, message } = await currentMaintenance();
  if (!enabled) return next();

  // Best-effort role from the access token (no DB lookup). A missing/invalid
  // token is treated as non-admin → 503 (auth endpoints already bypassed above).
  let role: string | undefined;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      role = verifyAccessToken(auth.slice(7)).role;
    } catch {
      role = undefined;
    }
  }
  if (role === "admin") return next();

  res.status(503).json({
    success: false,
    error: {
      code: "MAINTENANCE",
      message: "Service under maintenance",
      details: { message: message || "We'll be right back." },
    },
  });
}