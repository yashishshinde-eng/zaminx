/**
 * Plain HTML/text email templates (no template engine required).
 * DB-backed / admin-editable templates are deferred to Phase 14 (Admin Panel);
 * Phase 13 keeps these as plain TS so all 7 Blueprint email events fire.
 */

export const BRAND_NAME = "Zeminex Global";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface LinkEmailArgs {
  name: string;
  link: string;
}

interface WelcomeEmailArgs {
  name: string;
  loginLink: string;
}

interface DepositSuccessEmailArgs {
  name: string;
  packageName: string;
  amountUsd: number;
  txId: string;
}

/** The withdrawal statuses that trigger a user email (review is internal). */
export type WithdrawalEmailStatus = "approved" | "rejected" | "paid" | "cancelled";

interface WithdrawalUpdateEmailArgs {
  name: string;
  status: WithdrawalEmailStatus;
  amount: number;
  currency: string;
  wallet: string;
  address: string;
  remarks?: string;
  txId?: string;
}

interface RankAchievementEmailArgs {
  name: string;
  rankName: string;
  rewardAmount: number;
}

interface BonanzaEarnedEmailArgs {
  name: string;
  offerName: string;
  rewardAmount: number;
}

/** Shared wrapper for a branded transactional email. */
function wrap(subject: string, bodyHtml: string, bodyText: string): EmailContent {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#4f46e5;padding:24px 32px;">
          <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:.02em;">${BRAND_NAME}</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 32px;">
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
            If you did not request this, you can safely ignore this email. This is an automated message from ${BRAND_NAME}; please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return { subject, html, text: `${subject}\n\n${bodyText}\n\n— ${BRAND_NAME}` };
}

function button(link: string, label: string): string {
  return `<a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:15px;">${label}</a>`;
}

export function verifyEmailTemplate({ name, link }: LinkEmailArgs): EmailContent {
  return wrap(
    `${BRAND_NAME} — Verify your email`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi ${name},</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Welcome to ${BRAND_NAME}! Please confirm your email address to activate your account and unlock all features.</p>
     <p style="margin:24px 0;">${button(link, "Verify my email")}</p>
     <p style="margin:0;font-size:14px;color:#64748b;">Or paste this link into your browser: <br><a href="${link}" style="color:#4f46e5;word-break:break-all;">${link}</a></p>`,
    `Hi ${name},\n\nWelcome to ${BRAND_NAME}! Confirm your email by opening this link:\n${link}`,
  );
}

export function welcomeTemplate({ name, loginLink }: WelcomeEmailArgs): EmailContent {
  return wrap(
    `Welcome to ${BRAND_NAME}`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">You're all set, ${name}! 🎉</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Your email is verified and your ${BRAND_NAME} account is ready. Log in to explore your dashboard, view packages, and grab your referral link.</p>
     <p style="margin:24px 0;">${button(loginLink, "Go to dashboard")}</p>
     <p style="margin:0;font-size:14px;color:#64748b;">Thanks for joining us.</p>`,
    `You're all set, ${name}! Your email is verified and your ${BRAND_NAME} account is ready.\n\nLog in here: ${loginLink}`,
  );
}

export function resetPasswordTemplate({ name, link }: LinkEmailArgs): EmailContent {
  return wrap(
    `${BRAND_NAME} — Reset your password`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi ${name},</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">We received a request to reset your ${BRAND_NAME} password. Choose a new password using the link below. This link expires soon, so don't wait.</p>
     <p style="margin:24px 0;">${button(link, "Reset password")}</p>
     <p style="margin:0;font-size:14px;color:#64748b;">Or paste this link into your browser: <br><a href="${link}" style="color:#4f46e5;word-break:break-all;">${link}</a></p>`,
    `Hi ${name},\n\nReset your ${BRAND_NAME} password by opening this link:\n${link}\n\nIf you didn't request this, ignore this email.`,
  );
}

export function depositSuccessTemplate({
  name,
  packageName,
  amountUsd,
  txId,
}: DepositSuccessEmailArgs): EmailContent {
  return wrap(
    `${BRAND_NAME} — Deposit confirmed`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi ${name},</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Your deposit has been confirmed and your <strong>${packageName}</strong> package is now active. Daily trading yield begins accruing.</p>
     <p style="margin:0 0 8px;font-size:15px;color:#334155;">Amount: <strong>$${amountUsd.toFixed(2)}</strong> (USDT-BEP20)</p>
     <p style="margin:0;font-size:14px;color:#64748b;">Transaction: <span style="font-family:monospace;word-break:break-all;">${txId}</span></p>`,
    `Hi ${name},\n\nYour deposit has been confirmed and your ${packageName} package is now active.\nAmount: $${amountUsd.toFixed(2)} (USDT-BEP20)\nTransaction: ${txId}`,
  );
}

/** Shared withdrawal detail block (amount / wallet / address) + optional remarks. */
function withdrawalDetails({ amount, currency, wallet, address, remarks, txId }: Omit<WithdrawalUpdateEmailArgs, "name" | "status">): { html: string; text: string } {
  const amt = `${amount.toFixed(2)} ${currency}`;
  const html = [
    `<p style="margin:0 0 8px;font-size:15px;color:#334155;">Amount: <strong>${amt}</strong></p>`,
    `<p style="margin:0 0 8px;font-size:15px;color:#334155;">Wallet: <strong>${wallet}</strong></p>`,
    `<p style="margin:0 0 8px;font-size:14px;color:#64748b;">Address: <span style="font-family:monospace;word-break:break-all;">${address}</span></p>`,
    txId ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b;">Reference: <span style="font-family:monospace;word-break:break-all;">${txId}</span></p>` : "",
    remarks ? `<p style="margin:0;font-size:14px;color:#64748b;">Note: ${remarks}</p>` : "",
  ].filter(Boolean).join("\n     ");
  const text = [
    `Amount: ${amt}`,
    `Wallet: ${wallet}`,
    `Address: ${address}`,
    txId ? `Reference: ${txId}` : "",
    remarks ? `Note: ${remarks}` : "",
  ].filter(Boolean).join("\n");
  return { html, text };
}

/**
 * Withdrawal status update — one template for approved / rejected / paid /
 * cancelled. (`under_review` is an internal admin step and does not email.)
 */
export function withdrawalUpdateTemplate({
  name,
  status,
  amount,
  currency,
  wallet,
  address,
  remarks,
  txId,
}: WithdrawalUpdateEmailArgs): EmailContent {
  const detail = withdrawalDetails({ amount, currency, wallet, address, remarks, txId });
  const headline: Record<WithdrawalEmailStatus, string> = {
    approved: "Your withdrawal request has been approved and is being processed. You'll receive another email once the payment has been sent.",
    rejected: "Your withdrawal request was rejected. The held funds have been returned to your available balance.",
    paid: "Your withdrawal has been sent. The held funds have been paid out to your wallet address.",
    cancelled: "Your withdrawal request was cancelled. The held funds have been returned to your available balance.",
  };
  const subject = `${BRAND_NAME} — Withdrawal ${status}`;
  return wrap(
    subject,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Hi ${name},</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">${headline[status]}</p>
     ${detail.html}`,
    `Hi ${name},\n\n${headline[status]}\n${detail.text}`,
  );
}

/** Rank achievement — a rank ladder run awarded a new rank + reward. */
export function rankAchievementTemplate({ name, rankName, rewardAmount }: RankAchievementEmailArgs): EmailContent {
  return wrap(
    `${BRAND_NAME} — Rank achieved: ${rankName}`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Congratulations, ${name}! 🏆</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You've achieved the <strong>${rankName}</strong> rank. A reward of <strong>$${rewardAmount.toFixed(2)}</strong> has been credited to your bonus wallet. Keep growing your team to unlock the next rank.</p>`,
    `Congratulations, ${name}!\n\nYou've achieved the ${rankName} rank. A reward of $${rewardAmount.toFixed(2)} has been credited to your bonus wallet.`,
  );
}

/** Bonanza earned — a bonanza offer's reward was credited to the bonus wallet. */
export function bonanzaEarnedTemplate({ name, offerName, rewardAmount }: BonanzaEarnedEmailArgs): EmailContent {
  return wrap(
    `${BRAND_NAME} — Bonanza reward earned`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;">Great work, ${name}! 🎉</h1>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">You've earned the <strong>${offerName}</strong> bonanza reward. <strong>$${rewardAmount.toFixed(2)}</strong> has been credited to your bonus wallet.</p>`,
    `Great work, ${name}!\n\nYou've earned the ${offerName} bonanza reward. $${rewardAmount.toFixed(2)} has been credited to your bonus wallet.`,
  );
}