import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isProd } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getSetting } from "./setting.service.js";
import type { EmailContent } from "./emailTemplates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Directory where dev-file-transport emails are written. */
const DEV_MAIL_DIR = join(__dirname, "..", "..", "logs", "emails");

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Minimal user shape needed to send a notification email (with opt-out gate). */
export interface NotifiableUser {
  email: string;
  name?: string;
  notificationPreference?: { email?: boolean } | null;
}

/** True when SMTP credentials (user + password) are provided in env. Used by
 * the admin SMTP settings badge. Secrets never enter the DB. */
export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

/** Resolved SMTP transport config: non-secret host/port/from read from the
 * `Setting` collection (env fallback); user/pass always from env (secret). */
export interface SmtpConfig {
  host: string;
  port: number;
  from: string;
  user: string | undefined;
  pass: string | undefined;
}

/** Read the live SMTP config (Settings with env fallback). Async because the
 * non-secret fields now live in MongoDB. */
export async function getSmtpConfig(): Promise<SmtpConfig> {
  const host = await getSetting<string>("smtp.host", env.SMTP_HOST ?? "");
  const port = await getSetting<number>("smtp.port", env.SMTP_PORT);
  const from = await getSetting<string>("smtp.from", env.SMTP_FROM);
  return { host, port, from, user: env.SMTP_USER, pass: env.SMTP_PASS };
}

/** Whether the "dev file transport active" warning has already been logged. */
let devTransportWarned = false;

async function writeDevEmail(input: SendEmailInput): Promise<void> {
  if (!devTransportWarned) {
    devTransportWarned = true;
    logger.warn(
      "SMTP not configured — dev file email transport active. Outbound mail is written to server/logs/emails/.",
    );
  }
  await mkdir(DEV_MAIL_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const safeSubject = input.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();
  const filename = `${ts}-${safeSubject}.html`;
  const content = `<!-- to: ${input.to} | subject: ${input.subject} -->
<!-- text fallback:
${input.text}
-->
${input.html}`;
  await writeFile(join(DEV_MAIL_DIR, filename), content, "utf8");
  logger.info(`📧 Dev email written → ${filename}`, { to: input.to, subject: input.subject });
}

/** Build a real SMTP transporter from the live (Settings + env) config. */
function buildTransporter(cfg: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

/**
 * Cached SMTP transporter (Phase 16). Rebuilding a transporter (and its
 * connection pool) on every outbound email is wasteful. The transporter is
 * reused as long as the resolved config is unchanged; any change to host /
 * port / from / user / pass produces a new signature, so the next send rebuilds
 * it — preserving the "config changes apply on the next send without a restart"
 * guarantee. The signature includes the env `pass` so an env credential
 * rotation is also picked up on the next send.
 */
let cachedTransporter: { sig: string; transporter: Transporter } | null = null;

function transporterSignature(cfg: SmtpConfig): string {
  return `${cfg.host}|${cfg.port}|${cfg.from ?? ""}|${cfg.user ?? ""}|${cfg.pass ?? ""}`;
}

function getTransporter(cfg: SmtpConfig): Transporter {
  const sig = transporterSignature(cfg);
  if (cachedTransporter && cachedTransporter.sig === sig) return cachedTransporter.transporter;
  const transporter = buildTransporter(cfg);
  cachedTransporter = { sig, transporter };
  return transporter;
}

/**
 * Send a transactional email. Never throws to the caller — email outages are
 * logged but must not block registration, verification, or password reset.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    const cfg = await getSmtpConfig();
    // No host, or dev-without-credentials → dev file transport (skip real SMTP).
    if (!cfg.host || (!isProd && !isSmtpConfigured())) {
      await writeDevEmail(input);
      return;
    }
    const info = await getTransporter(cfg).sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    logger.info("📧 Email sent", { to: input.to, subject: input.subject, messageId: info.messageId });
  } catch (err) {
    logger.error("Email send failed", {
      to: input.to,
      subject: input.subject,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Send a test email for the admin "Send test email" action. Unlike
 * `sendEmail`, this DOES throw on failure so the admin sees the real SMTP
 * error. When SMTP is unconfigured (no host), it writes a dev file instead and
 * returns `{ dev: true }`.
 */
export async function sendTestEmail(to: string): Promise<{ dev: boolean }> {
  const cfg = await getSmtpConfig();
  const input: SendEmailInput = {
    to,
    subject: "Zeminex Global SMTP test",
    text: "This is a test email from the Zeminex Global admin panel. If you received it, SMTP is working.",
    html: "<p>This is a test email from the Zeminex Global admin panel. If you received it, SMTP is working.</p>",
  };
  if (!cfg.host || (!isProd && !isSmtpConfigured())) {
    await writeDevEmail(input);
    return { dev: true };
  }
  // Throws on failure (surfaced to the admin as a 4xx/5xx with the SMTP message).
  await getTransporter(cfg).sendMail({ from: cfg.from, ...input });
  return { dev: false };
}

/**
 * Send a notification email (deposit success, withdrawal update, rank
 * achievement, bonanza earned). Skipped when the user has opted out of email
 * notifications (`notificationPreference.email === false`). Never throws —
 * delegates to `sendEmail`, which swallows and logs all failures. Auth emails
 * (verify-email, welcome, reset-password) bypass this and use `sendEmail`
 * directly, since security/transactional mail must reach the user regardless
 * of their notification preference.
 */
export async function sendNotificationEmail(user: NotifiableUser, content: EmailContent): Promise<void> {
  if (user.notificationPreference?.email === false) return;
  await sendEmail({ to: user.email, subject: content.subject, html: content.html, text: content.text });
}