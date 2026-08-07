/**
 * Mongoose model barrel (Phase 17). Exports are grouped by the Blueprint's
 * logical partition:
 *
 *   Master       — config / reference data (users, settings, packages, …).
 *   Transactions — operational / financial data (deposits, ledger, logs, …).
 *
 * Both partitions live in a single MongoDB database today. A physical
 * two-database split (a `MONGO_TX_URI` routing transaction models to a separate
 * DB) is a deploy/replica-set concern and is **deferred** — it can't be
 * runtime-validated without a live replica set and is not needed for current
 * single-node operation.
 *
 * Blueprint collection → model mapping:
 *
 *   Master
 *     users            → User
 *     settings         → Setting
 *     packages         → Package            (catalog tiers)
 *     ranks            → Rank
 *     bonanza_offers   → BonanzaOffer
 *     cms_pages        → CmsPage
 *     announcements     → Announcement       (new, schema-ready)
 *     email_templates   → EmailTemplate      (new, schema-ready)
 *
 *   Transactions
 *     deposits          → Deposit
 *     withdrawal_requests → Withdrawal
 *     wallet_transactions → WalletTransaction
 *     trading_income   ┐
 *     direct_income     │
 *     team_bonus        ├─ collapsed into WalletTransaction rows keyed by
 *     community_bonus   │  `type` (immutable-ledger design); no separate
 *     rank_rewards      │  collections are created.
 *     bonanza_rewards   ┘
 *     notifications     → Notification       (new, schema-ready; Phase 12)
 *     payment_logs      → PaymentLog        (new; written by the webhook)
 *     cron_logs         → CronLog           (new, schema-ready; Phase 18)
 *     activity_logs     → ActivityLog
 *
 * (`UserPackage` is the user-subscription join table backing `packages`;
 * `Wallet` is the per-user balance document; `ContactMessage` stores public
 * contact-form submissions — implementation tables not in the Blueprint list.)
 */

/* ------------------------------------------------------------------ */
/*  Master                                                            */
/* ------------------------------------------------------------------ */
export { User } from "./User.model.js";
export type { UserDocument, UserModel } from "./User.model.js";
export { Setting } from "./Setting.model.js";
export type { SettingDocument } from "./Setting.model.js";
export { Package } from "./Package.model.js";
export type { PackageDocument } from "./Package.model.js";
export { Rank } from "./Rank.model.js";
export type { RankDocument } from "./Rank.model.js";
export { BonanzaOffer } from "./BonanzaOffer.model.js";
export type { BonanzaOfferDocument } from "./BonanzaOffer.model.js";
export { CmsPage } from "./CmsPage.model.js";
export type { CmsPageDocument } from "./CmsPage.model.js";
export { Announcement } from "./Announcement.model.js";
export type { AnnouncementDocument } from "./Announcement.model.js";
export { EmailTemplate } from "./EmailTemplate.model.js";
export type { EmailTemplateDocument } from "./EmailTemplate.model.js";

/* ------------------------------------------------------------------ */
/*  Transactions                                                      */
/* ------------------------------------------------------------------ */
export { Deposit } from "./Deposit.model.js";
export type { DepositDocument } from "./Deposit.model.js";
export { Withdrawal } from "./Withdrawal.model.js";
export type { WithdrawalDocument } from "./Withdrawal.model.js";
export { WalletTransaction } from "./WalletTransaction.model.js";
export type { WalletTransactionDocument } from "./WalletTransaction.model.js";
export { ActivityLog } from "./ActivityLog.model.js";
export type { ActivityLogDocument } from "./ActivityLog.model.js";
export { PaymentLog } from "./PaymentLog.model.js";
export type { PaymentLogDocument } from "./PaymentLog.model.js";
export { Notification } from "./Notification.model.js";
export type { NotificationDocument } from "./Notification.model.js";
export { CronLog } from "./CronLog.model.js";
export type { CronLogDocument } from "./CronLog.model.js";

/* ------------------------------------------------------------------ */
/*  Implementation tables (not in the Blueprint collection list)       */
/* ------------------------------------------------------------------ */
export { UserPackage } from "./UserPackage.model.js";
export type { UserPackageDocument } from "./UserPackage.model.js";
export { Wallet } from "./Wallet.model.js";
export type { WalletDocument } from "./Wallet.model.js";
export { ContactMessage } from "./ContactMessage.model.js";
export type { ContactMessageDocument } from "./ContactMessage.model.js";

/* ------------------------------------------------------------------ */
/*  P2P Transfers (Phase: wallet-to-wallet)                            */
/* ------------------------------------------------------------------ */
export { P2PTransfer } from "./P2PTransfer.model.js";
export type { P2PTransferDocument } from "./P2PTransfer.model.js";