import { createLogger, format, transports } from "winston";
import { isProd } from "./env.js";

const { combine, timestamp, printf, colorize, errors, splat } = format;

// Vercel's serverless filesystem is read-only at runtime, so file transports
// (which write under ./logs) only run on long-running hosts. The Console
// transport is serverless-safe and is always enabled.
const canWriteFiles = isProd && !process.env.VERCEL;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] ${stack ?? message}${metaStr}`;
});

export const logger = createLogger({
  level: isProd ? "info" : "debug",
  format: combine(
    errors({ stack: true }),
    splat(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat,
  ),
  defaultMeta: { service: "zeminex-api" },
  transports: [
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    ...(canWriteFiles
      ? [
          new transports.File({ filename: "logs/error.log", level: "error" }),
          new transports.File({ filename: "logs/combined.log" }),
        ]
      : []),
  ],
  exceptionHandlers: canWriteFiles
    ? [new transports.File({ filename: "logs/exceptions.log" })]
    : undefined,
  rejectionHandlers: canWriteFiles
    ? [new transports.File({ filename: "logs/rejections.log" })]
    : undefined,
});

export const stream = {
  write: (message: string) => logger.http(message.trim()),
};