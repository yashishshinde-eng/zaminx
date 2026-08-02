import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { ok } from "../utils/ApiResponse.js";

export const health: RequestHandler = (_req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected
  const db = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";
  ok(res, {
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: db,
  }, "Service is healthy");
};