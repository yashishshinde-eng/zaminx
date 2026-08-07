import { User, Deposit, Withdrawal, WalletTransaction, Wallet, BonanzaOffer, ActivityLog } from "../models/index.js";
import { buildCsv, buildExcelHtml } from "../utils/csv.js";
import { ApiError } from "../utils/ApiError.js";
import {
  dateRangeFilter,
  paginate,
  clampPage,
  toIso,
  amountSummary,
  ledgerSummary,
  EXPORT_CAP,
  todayUtc,
  type ReportQueryArgs,
  type ReportExportArgs,
} from "./report.service.js";
import type {
  AdminReportKind,
  AdminReportPayload,
  AdminReportResult,
  AdminReportSummary,
  AdminUserReportRow,
  AdminDepositReportRow,
  AdminWithdrawalReportRow,
  AdminIncomeReportRow,
  AdminWalletReportRow,
  AdminGatewayReportRow,
  AdminBonanzaReportRow,
  AdminActivityReportRow,
  WalletTxType,
  WalletTxDirection,
  WalletTxRef,
} from "@zeminex/shared";

/** The 6 income-stream ledger types (credit-only). */
const INCOME_TYPES: WalletTxType[] = [
  "trading_yield",
  "direct_bonus",
  "team_bonus",
  "community_bonus",
  "rank_reward",
  "bonanza",
];

/* ------------------------------------------------------------------ */
/*  Lean doc shapes (thin; matched by the mappers below)              */
/* ------------------------------------------------------------------ */

type LeanUser = {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  status: string;
  referralCode: string;
  referredBy?: string | null;
  isEmailVerified: boolean;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
};

type LeanWallet = {
  user: { toString(): string };
  balances: {
    main?: { available?: number; onHold?: number };
    bonus?: { available?: number; onHold?: number };
    trading?: { available?: number; onHold?: number };
  };
};

type LeanDeposit = {
  _id: { toString(): string };
  user: { toString(): string };
  userPackage: { toString(): string } | null;
  package: { toString(): string } | null;
  amountUsd: number;
  currency: string;
  status: string;
  payAddress?: string | null;
  payAmount?: number | null;
  hostedUrl?: string | null;
  nowpaymentsInvoiceId?: string | null;
  sandbox: boolean;
  createdAt: Date | string;
  paidAt?: Date | string | null;
};

type LeanWithdrawal = {
  _id: { toString(): string };
  user: { toString(): string };
  wallet: string;
  amount: number;
  currency: string;
  address: string;
  status: string;
  remarks?: string | null;
  processedBy?: { toString(): string } | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type LeanTx = {
  _id: { toString(): string };
  user: { toString(): string };
  wallet: string;
  type: string;
  direction: string;
  amount: number;
  availableAfter: number;
  onHoldAfter: number;
  reference?: { resource?: string | null; resourceId?: string | null } | null;
  memo?: string | null;
  createdAt: Date | string;
};

type LeanActivity = {
  _id: { toString(): string };
  actor?: { toString(): string } | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  ip?: string | null;
  createdAt: Date | string;
};

type LeanOffer = { _id: { toString(): string }; name: string };

type UserName = { name: string; email: string };

/* ------------------------------------------------------------------ */
/*  Shared join helper                                                 */
/* ------------------------------------------------------------------ */

/** Batch-fetch `name`+`email` for a set of user ids → Map keyed by id string. */
async function joinUsers(ids: (string | { toString(): string })[]): Promise<Map<string, UserName>> {
  const unique = Array.from(new Set(ids.map((id) => id.toString())));
  if (unique.length === 0) return new Map();
  const users = await User.find({ _id: { $in: unique } }).select("name email").lean();
  return new Map(users.map((u) => [u._id.toString(), { name: u.name, email: u.email }]));
}

function userName(map: Map<string, UserName>, id: string | null | undefined): string {
  if (!id) return "—";
  return map.get(id)?.name ?? "—";
}
function userEmail(map: Map<string, UserName>, id: string | null | undefined): string {
  if (!id) return "—";
  return map.get(id)?.email ?? "—";
}

/* ------------------------------------------------------------------ */
/*  Users                                                              */
/* ------------------------------------------------------------------ */

function toAdminUserRow(
  u: LeanUser,
  directCount: number,
  walletAvailable: number,
  walletOnHold: number,
): AdminUserReportRow {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role as AdminUserReportRow["role"],
    status: u.status as AdminUserReportRow["status"],
    referralCode: u.referralCode,
    referredBy: u.referredBy ?? null,
    isEmailVerified: u.isEmailVerified,
    directCount,
    walletAvailable,
    walletOnHold,
    joinedAt: toIso(u.createdAt),
    lastLoginAt: u.lastLoginAt == null ? null : toIso(u.lastLoginAt),
  };
}

/** Build the Users filter (date range on createdAt + status + name/email/code search). */
function usersFilter(q: ReportQueryArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to) };
  if (q.status) filter.status = q.status;
  if (q.q) {
    filter.$or = [
      { name: { $regex: q.q, $options: "i" } },
      { email: { $regex: q.q, $options: "i" } },
      { referralCode: { $regex: q.q, $options: "i" } },
    ];
  }
  return filter;
}

/** Fetch + join a page/export of users → admin user rows. Exported for reuse
 *  by the Phase 14A admin user-management list (same joined row shape). */
export async function fetchUsersRows(filter: Record<string, unknown>, limit: number, skip: number): Promise<AdminUserReportRow[]> {
  const users = (await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanUser[];
  const pageIds = users.map((u) => u._id.toString());
  const [directAgg, wallets] = await Promise.all([
    pageIds.length
      ? User.aggregate<{ _id: string; count: number }>([
          { $match: { sponsorId: { $in: pageIds } } },
          { $group: { _id: "$sponsorId", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    pageIds.length ? (Wallet.find({ user: { $in: pageIds } }).lean() as Promise<LeanWallet[]>) : Promise.resolve([]),
  ]);
  const directMap = new Map(directAgg.map((d) => [d._id.toString(), d.count]));
  const walletMap = new Map<string, { available: number; onHold: number }>();
  for (const w of wallets) {
    const b = w.balances;
    const available = (b.main?.available ?? 0) + (b.bonus?.available ?? 0) + (b.trading?.available ?? 0);
    const onHold = (b.main?.onHold ?? 0) + (b.bonus?.onHold ?? 0) + (b.trading?.onHold ?? 0);
    walletMap.set(w.user.toString(), { available, onHold });
  }
  return users.map((u) => {
    const id = u._id.toString();
    const w = walletMap.get(id) ?? { available: 0, onHold: 0 };
    return toAdminUserRow(u, directMap.get(id) ?? 0, w.available, w.onHold);
  });
}

async function getAdminUsersReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminUserReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = usersFilter(q);
  const [rows, total, byStatusAgg, dailyAgg] = await Promise.all([
    fetchUsersRows(filter, limit, (page - 1) * limit),
    User.countDocuments(filter),
    User.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    User.aggregate<{ _id: string; value: number }>([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const byStatus: Record<string, number> = {};
  for (const b of byStatusAgg) byStatus[b._id] = b.count;
  const summary: AdminReportSummary = {
    count: total,
    total: 0,
    series: dailyAgg.map((d) => ({ date: d._id, value: d.value })),
    byStatus,
  };
  return { rows, pagination: paginate(total, page, limit), summary };
}

/* ------------------------------------------------------------------ */
/*  Deposits / Gateway (both read the Deposit collection)              */
/* ------------------------------------------------------------------ */

function toAdminDepositRow(d: LeanDeposit, userMap: Map<string, UserName>): AdminDepositReportRow {
  const userId = d.user.toString();
  return {
    id: d._id.toString(),
    userPackageId: d.userPackage?.toString() ?? null,
    packageId: d.package?.toString() ?? null,
    amountUsd: d.amountUsd,
    currency: d.currency as AdminDepositReportRow["currency"],
    status: d.status as AdminDepositReportRow["status"],
    payAddress: d.payAddress ?? null,
    payAmount: d.payAmount ?? null,
    hostedUrl: d.hostedUrl ?? null,
    sandbox: d.sandbox,
    createdAt: toIso(d.createdAt),
    paidAt: d.paidAt == null ? null : toIso(d.paidAt),
    userId,
    userName: userName(userMap, userId),
    userEmail: userEmail(userMap, userId),
  };
}

function toAdminGatewayRow(d: LeanDeposit, userMap: Map<string, UserName>): AdminGatewayReportRow {
  const userId = d.user.toString();
  return {
    id: d._id.toString(),
    invoiceId: d.nowpaymentsInvoiceId ?? null,
    userId,
    userName: userName(userMap, userId),
    amountUsd: d.amountUsd,
    payAmount: d.payAmount ?? null,
    currency: d.currency,
    status: d.status,
    sandbox: d.sandbox,
    hostedUrl: d.hostedUrl ?? null,
    createdAt: toIso(d.createdAt),
    paidAt: d.paidAt == null ? null : toIso(d.paidAt),
  };
}

/** Deposit filter: date range + status (+ invoice-id search for gateway). */
function depositFilter(q: ReportQueryArgs, gateway: boolean): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to) };
  if (q.status) filter.status = q.status;
  if (q.q && gateway) filter.nowpaymentsInvoiceId = { $regex: q.q, $options: "i" };
  return filter;
}

async function fetchDepositRows(
  filter: Record<string, unknown>,
  limit: number,
  skip: number,
  gateway: boolean,
): Promise<AdminDepositReportRow[] | AdminGatewayReportRow[]> {
  const deps = (await Deposit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanDeposit[];
  const userMap = await joinUsers(deps.map((d) => d.user));
  return gateway ? deps.map((d) => toAdminGatewayRow(d, userMap)) : deps.map((d) => toAdminDepositRow(d, userMap));
}

async function getAdminDepositsReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminDepositReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = depositFilter(q, false);
  const [rows, total, base, byStatusAgg] = await Promise.all([
    fetchDepositRows(filter, limit, (page - 1) * limit, false) as Promise<AdminDepositReportRow[]>,
    Deposit.countDocuments(filter),
    amountSummary(Deposit, filter, "amountUsd"),
    Deposit.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const byStatus: Record<string, number> = {};
  for (const b of byStatusAgg) byStatus[b._id] = b.count;
  return { rows, pagination: paginate(total, page, limit), summary: { ...base, byStatus } };
}

async function getAdminGatewayReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminGatewayReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = depositFilter(q, true);
  const [rows, total, base, byStatusAgg] = await Promise.all([
    fetchDepositRows(filter, limit, (page - 1) * limit, true) as Promise<AdminGatewayReportRow[]>,
    Deposit.countDocuments(filter),
    amountSummary(Deposit, filter, "amountUsd"),
    Deposit.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const byStatus: Record<string, number> = {};
  for (const b of byStatusAgg) byStatus[b._id] = b.count;
  return { rows, pagination: paginate(total, page, limit), summary: { ...base, byStatus } };
}

/* ------------------------------------------------------------------ */
/*  Withdrawals                                                        */
/* ------------------------------------------------------------------ */

function toAdminWithdrawalRow(w: LeanWithdrawal, userMap: Map<string, UserName>): AdminWithdrawalReportRow {
  const userId = w.user.toString();
  return {
    id: w._id.toString(),
    wallet: w.wallet as AdminWithdrawalReportRow["wallet"],
    amount: w.amount,
    currency: w.currency as AdminWithdrawalReportRow["currency"],
    address: w.address,
    status: w.status as AdminWithdrawalReportRow["status"],
    remarks: w.remarks ?? null,
    processedBy: w.processedBy ? w.processedBy.toString() : null,
    processedAt: w.processedAt == null ? null : toIso(w.processedAt),
    createdAt: toIso(w.createdAt),
    updatedAt: toIso(w.updatedAt),
    userId,
    userName: userName(userMap, userId),
    userEmail: userEmail(userMap, userId),
  };
}

function withdrawalFilter(q: ReportQueryArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to) };
  if (q.status) filter.status = q.status;
  if (q.q) filter.address = { $regex: q.q, $options: "i" };
  return filter;
}

async function fetchWithdrawalRows(filter: Record<string, unknown>, limit: number, skip: number): Promise<AdminWithdrawalReportRow[]> {
  const ws = (await Withdrawal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanWithdrawal[];
  const userMap = await joinUsers(ws.map((w) => w.user));
  return ws.map((w) => toAdminWithdrawalRow(w, userMap));
}

async function getAdminWithdrawalsReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminWithdrawalReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = withdrawalFilter(q);
  const [rows, total, base, byStatusAgg] = await Promise.all([
    fetchWithdrawalRows(filter, limit, (page - 1) * limit),
    Withdrawal.countDocuments(filter),
    amountSummary(Withdrawal, filter, "amount"),
    Withdrawal.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const byStatus: Record<string, number> = {};
  for (const b of byStatusAgg) byStatus[b._id] = b.count;
  return { rows, pagination: paginate(total, page, limit), summary: { ...base, byStatus } };
}

/* ------------------------------------------------------------------ */
/*  Income / Wallet (both read the ledger)                             */
/* ------------------------------------------------------------------ */

function toAdminIncomeRow(t: LeanTx, userMap: Map<string, UserName>): AdminIncomeReportRow {
  const userId = t.user.toString();
  return {
    id: t._id.toString(),
    date: toIso(t.createdAt),
    userId,
    userName: userName(userMap, userId),
    type: t.type as WalletTxType,
    amount: t.amount,
    memo: t.memo ?? null,
  };
}

function toAdminWalletRow(t: LeanTx, userMap: Map<string, UserName>): AdminWalletReportRow {
  const userId = t.user.toString();
  const reference: WalletTxRef = {
    resource: t.reference?.resource ?? null,
    resourceId: t.reference?.resourceId ?? null,
  };
  return {
    id: t._id.toString(),
    wallet: t.wallet as AdminWalletReportRow["wallet"],
    type: t.type as WalletTxType,
    direction: t.direction as WalletTxDirection,
    amount: t.amount,
    availableAfter: t.availableAfter,
    onHoldAfter: t.onHoldAfter,
    memo: t.memo ?? null,
    reference,
    createdAt: toIso(t.createdAt),
    userId,
    userName: userName(userMap, userId),
    userEmail: userEmail(userMap, userId),
  };
}

/** Income = credit-only rows of the 6 income types; Wallet = all rows. */
function ledgerAdminFilter(q: ReportQueryArgs, income: boolean): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to) };
  if (income) {
    filter.type = { $in: INCOME_TYPES };
    filter.direction = "credit";
  }
  if (q.q) filter.memo = { $regex: q.q, $options: "i" };
  return filter;
}

async function fetchLedgerRows(
  filter: Record<string, unknown>,
  limit: number,
  skip: number,
  income: boolean,
): Promise<AdminIncomeReportRow[] | AdminWalletReportRow[]> {
  const txs = (await WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanTx[];
  const userMap = await joinUsers(txs.map((t) => t.user));
  return income ? txs.map((t) => toAdminIncomeRow(t, userMap)) : txs.map((t) => toAdminWalletRow(t, userMap));
}

async function getAdminIncomeReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminIncomeReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = ledgerAdminFilter(q, true);
  const [rows, total, base, byTypeAgg] = await Promise.all([
    fetchLedgerRows(filter, limit, (page - 1) * limit, true) as Promise<AdminIncomeReportRow[]>,
    WalletTransaction.countDocuments(filter),
    ledgerSummary(filter),
    WalletTransaction.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);
  const byType: Record<string, number> = {};
  for (const b of byTypeAgg) byType[b._id] = b.count;
  return { rows, pagination: paginate(total, page, limit), summary: { ...base, byType } };
}

async function getAdminWalletReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminWalletReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = ledgerAdminFilter(q, false);
  const [rows, total, base, byTypeAgg] = await Promise.all([
    fetchLedgerRows(filter, limit, (page - 1) * limit, false) as Promise<AdminWalletReportRow[]>,
    WalletTransaction.countDocuments(filter),
    ledgerSummary(filter),
    WalletTransaction.aggregate<{ _id: string; count: number }>([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
  ]);
  const byType: Record<string, number> = {};
  for (const b of byTypeAgg) byType[b._id] = b.count;
  return { rows, pagination: paginate(total, page, limit), summary: { ...base, byType } };
}

/* ------------------------------------------------------------------ */
/*  Bonanza (ledger type=bonanza, joined to BonanzaOffer + User)       */
/* ------------------------------------------------------------------ */

/** Parse the offer id from a bonanza idempotency key `bonanza:<offerId>:<userId>`. */
function offerIdFromRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const parts = ref.split(":");
  return parts.length >= 2 ? parts[1] : null;
}

function toAdminBonanzaRow(
  t: LeanTx,
  userMap: Map<string, UserName>,
  offerMap: Map<string, string>,
): AdminBonanzaReportRow {
  const userId = t.user.toString();
  const offerId = offerIdFromRef(t.reference?.resourceId) ?? "";
  return {
    id: t._id.toString(),
    userId,
    userName: userName(userMap, userId),
    offerId,
    offerName: offerMap.get(offerId) ?? "—",
    rewardAmount: t.amount,
    awardedAt: toIso(t.createdAt),
  };
}

function bonanzaFilter(q: ReportQueryArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to), type: "bonanza" };
  if (q.q) filter.memo = { $regex: q.q, $options: "i" };
  return filter;
}

async function fetchBonanzaRows(filter: Record<string, unknown>, limit: number, skip: number): Promise<AdminBonanzaReportRow[]> {
  const txs = (await WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanTx[];
  const offerIds = new Set<string>();
  for (const t of txs) {
    const oid = offerIdFromRef(t.reference?.resourceId);
    if (oid) offerIds.add(oid);
  }
  const [userMap, offers] = await Promise.all([
    joinUsers(txs.map((t) => t.user)),
    offerIds.size
      ? (BonanzaOffer.find({ _id: { $in: Array.from(offerIds) } }).lean() as Promise<LeanOffer[]>)
      : Promise.resolve([]),
  ]);
  const offerMap = new Map(offers.map((o) => [o._id.toString(), o.name]));
  return txs.map((t) => toAdminBonanzaRow(t, userMap, offerMap));
}

async function getAdminBonanzaReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminBonanzaReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = bonanzaFilter(q);
  const [rows, total, base] = await Promise.all([
    fetchBonanzaRows(filter, limit, (page - 1) * limit),
    WalletTransaction.countDocuments(filter),
    ledgerSummary(filter),
  ]);
  return { rows, pagination: paginate(total, page, limit), summary: base };
}

/* ------------------------------------------------------------------ */
/*  Activity (ActivityLog, joined to User actor)                       */
/* ------------------------------------------------------------------ */

function toAdminActivityRow(a: LeanActivity, userMap: Map<string, UserName>): AdminActivityReportRow {
  const actorId = a.actor ? a.actor.toString() : null;
  return {
    id: a._id.toString(),
    actorId,
    actorName: actorId ? userMap.get(actorId)?.name ?? null : null,
    action: a.action,
    resource: a.resource ?? null,
    resourceId: a.resourceId ?? null,
    ip: a.ip ?? null,
    createdAt: toIso(a.createdAt),
  };
}

function activityFilter(q: ReportQueryArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...dateRangeFilter(q.from, q.to) };
  if (q.q) filter.action = { $regex: q.q, $options: "i" };
  return filter;
}

async function fetchActivityRows(filter: Record<string, unknown>, limit: number, skip: number): Promise<AdminActivityReportRow[]> {
  const logs = (await ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()) as LeanActivity[];
  const actorIds = logs.map((l) => l.actor).filter(Boolean) as { toString(): string }[];
  const userMap = await joinUsers(actorIds);
  return logs.map((l) => toAdminActivityRow(l, userMap));
}

async function getAdminActivityReport(q: ReportQueryArgs): Promise<AdminReportResult<AdminActivityReportRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = activityFilter(q);
  const [rows, total, byActionAgg, dailyAgg] = await Promise.all([
    fetchActivityRows(filter, limit, (page - 1) * limit),
    ActivityLog.countDocuments(filter),
    ActivityLog.aggregate<{ _id: string; count: number }>([
      { $match: filter },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    ActivityLog.aggregate<{ _id: string; value: number }>([
      { $match: filter },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const byAction: Record<string, number> = {};
  for (const b of byActionAgg) byAction[b._id] = b.count;
  const summary: AdminReportSummary = {
    count: total,
    total: 0,
    series: dailyAgg.map((d) => ({ date: d._id, value: d.value })),
    byAction,
  };
  return { rows, pagination: paginate(total, page, limit), summary };
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                         */
/* ------------------------------------------------------------------ */

/** Route an admin report kind to its platform-wide read. */
export async function getAdminReport(kind: AdminReportKind, q: ReportQueryArgs): Promise<AdminReportPayload> {
  switch (kind) {
    case "users":
      return getAdminUsersReport(q);
    case "deposits":
      return getAdminDepositsReport(q);
    case "withdrawals":
      return getAdminWithdrawalsReport(q);
    case "income":
      return getAdminIncomeReport(q);
    case "wallet":
      return getAdminWalletReport(q);
    case "gateway":
      return getAdminGatewayReport(q);
    case "bonanza":
      return getAdminBonanzaReport(q);
    case "activity":
      return getAdminActivityReport(q);
  }
  throw ApiError.badRequest(`Unknown admin report kind: ${kind}`);
}

/* ------------------------------------------------------------------ */
/*  CSV / Excel export                                                  */
/* ------------------------------------------------------------------ */

type Cell = string | number | null | undefined;

/** Fetch up to EXPORT_CAP mapped rows for a kind (no pagination). */
async function fetchAdminExportRows(kind: AdminReportKind, q: ReportExportArgs): Promise<unknown[]> {
  const f: ReportQueryArgs = { from: q.from, to: q.to, status: q.status, q: q.q, page: 1, limit: 1 };
  switch (kind) {
    case "users":
      return fetchUsersRows(usersFilter(f), EXPORT_CAP, 0);
    case "deposits":
      return fetchDepositRows(depositFilter(f, false), EXPORT_CAP, 0, false);
    case "withdrawals":
      return fetchWithdrawalRows(withdrawalFilter(f), EXPORT_CAP, 0);
    case "income":
      return fetchLedgerRows(ledgerAdminFilter(f, true), EXPORT_CAP, 0, true);
    case "wallet":
      return fetchLedgerRows(ledgerAdminFilter(f, false), EXPORT_CAP, 0, false);
    case "gateway":
      return fetchDepositRows(depositFilter(f, true), EXPORT_CAP, 0, true);
    case "bonanza":
      return fetchBonanzaRows(bonanzaFilter(f), EXPORT_CAP, 0);
    case "activity":
      return fetchActivityRows(activityFilter(f), EXPORT_CAP, 0);
  }
  throw ApiError.badRequest(`Unknown admin report kind: ${kind}`);
}

/** Column spec for a kind → (headers, cell rows). */
function toAdminSheet(kind: AdminReportKind, rows: unknown[]): { headers: string[]; data: Cell[][] } {
  switch (kind) {
    case "users":
      return {
        headers: ["Joined", "Name", "Email", "Role", "Status", "Referral code", "Referred by", "Verified", "Directs", "Available", "On hold", "Last login"],
        data: (rows as AdminUserReportRow[]).map((r) => [
          r.joinedAt, r.name, r.email, r.role, r.status, r.referralCode, r.referredBy ?? "",
          r.isEmailVerified ? "yes" : "no", r.directCount, r.walletAvailable, r.walletOnHold, r.lastLoginAt ?? "",
        ]),
      };
    case "deposits":
      return {
        headers: ["Date", "User", "Email", "Amount (USD)", "Currency", "Status", "Paid at"],
        data: (rows as AdminDepositReportRow[]).map((r) => [r.createdAt, r.userName, r.userEmail, r.amountUsd, r.currency, r.status, r.paidAt ?? ""]),
      };
    case "withdrawals":
      return {
        headers: ["Date", "User", "Email", "Wallet", "Amount (USD)", "Currency", "Address", "Status", "Processed at"],
        data: (rows as AdminWithdrawalReportRow[]).map((r) => [r.createdAt, r.userName, r.userEmail, r.wallet, r.amount, r.currency, r.address, r.status, r.processedAt ?? ""]),
      };
    case "income":
      return {
        headers: ["Date", "User", "Type", "Amount", "Memo"],
        data: (rows as AdminIncomeReportRow[]).map((r) => [r.date, r.userName, r.type, r.amount, r.memo ?? ""]),
      };
    case "wallet":
      return {
        headers: ["Date", "User", "Wallet", "Type", "Direction", "Amount", "Memo"],
        data: (rows as AdminWalletReportRow[]).map((r) => [r.createdAt, r.userName, r.wallet, r.type, r.direction, r.amount, r.memo ?? ""]),
      };
    case "gateway":
      return {
        headers: ["Date", "User", "Invoice ID", "Amount (USD)", "Pay amount", "Currency", "Status", "Sandbox", "Paid at"],
        data: (rows as AdminGatewayReportRow[]).map((r) => [r.createdAt, r.userName, r.invoiceId ?? "", r.amountUsd, r.payAmount ?? "", r.currency, r.status, r.sandbox ? "yes" : "no", r.paidAt ?? ""]),
      };
    case "bonanza":
      return {
        headers: ["Awarded at", "User", "Offer", "Reward"],
        data: (rows as AdminBonanzaReportRow[]).map((r) => [r.awardedAt, r.userName, r.offerName, r.rewardAmount]),
      };
    case "activity":
      return {
        headers: ["Date", "Actor", "Action", "Resource", "Resource ID", "IP"],
        data: (rows as AdminActivityReportRow[]).map((r) => [r.createdAt, r.actorName ?? "", r.action, r.resource ?? "", r.resourceId ?? "", r.ip ?? ""]),
      };
  }
  throw ApiError.badRequest(`Unknown admin report kind: ${kind}`);
}

/** Build the export body for an admin report kind (CSV or Excel). */
export async function getAdminReportExport(
  kind: AdminReportKind,
  q: ReportExportArgs,
): Promise<{ filename: string; mime: string; body: string }> {
  const rows = await fetchAdminExportRows(kind, q);
  const { headers, data } = toAdminSheet(kind, rows);
  const ext = q.format === "xls" ? "xls" : "csv";
  const filename = `admin-report-${kind}-${todayUtc()}.${ext}`;
  if (q.format === "xls") {
    return { filename, mime: "application/vnd.ms-excel", body: buildExcelHtml(headers, data) };
  }
  return { filename, mime: "text/csv; charset=utf-8", body: buildCsv(headers, data) };
}