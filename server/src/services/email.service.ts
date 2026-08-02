import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer, { type Transporter } from "nodemailer";
import { env, isProd } from "../config/env.js";
import { logger } from "../config/logger.js";
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

/** True when SMTP credentials have been provided (real outbound mail). */
export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST);
}

let transporter: Transporter | null = null;
let devMode = false;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (isSmtpConfigured()) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    devMode = false;
  } else {
    // Dev fallback: a no-op transporter. We intercept sendMail and write the
    // message to disk instead (see sendEmail below).
    transporter = nodemailer.createTransport({ jsonTransport: true });
    devMode = !isProd;
    logger.warn(
      "SMTP_HOST not set — dev file email transport active. Outbound mail is written to server/logs/emails/.",
    );
  }
  return transporter;
}

async function writeDevEmail(input: SendEmailInput): Promise<void> {
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

/**
 * Send a transactional email. Never throws to the caller — email outages are
 * logged but must not block registration, verification, or password reset.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    if (devMode || (!isSmtpConfigured() && !isProd)) {
      await writeDevEmail(input);
      return;
    }
    const info = await getTransporter().sendMail({
      from: env.SMTP_FROM,
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