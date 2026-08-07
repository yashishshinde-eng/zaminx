import { Deposit, Withdrawal, WalletTransaction } from "../models/index.js";
import { buildCsv, buildExcelHtml } from "../utils/csv.js";
import type {
  UserReportKind,
  ReportResult,
  ReportPagination,
  ReportSummary,
  DepositRow,
  WithdrawalRow,
  WalletTxRow,
  WalletTxType,
  WalletTxDirection,
  WalletTxRef,
  ReportExportFormat,
} from "@zeminex/shared";

const DAY_MS = 86_400_000;
/** Max rows materialised for a single export (no pagination on exports). */
export const EXPORT_CAP = 5000;

/**
 * Ledger `WalletTxType` for each income-stream kind. `wallet` → undefined means
 * "all types"; deposits/withdrawals are not ledger kinds (unused entries).
 */
const LEDGER_KIND_TO_TYPE: Record<UserReportKind, WalletTxType | undefined> = {
  deposits: undefined,
  withdrawals: undefined,
  wallet: undefined,
  trading: "trading_yield",
  direct: "direct_bonus",
  team: "team_bonus",
  community: "community_bonus",
  rank: "rank_reward",
  bonanza: "bonanza",
};

/* ------------------------------------------------------------------ */
/*  Query args                                                         */
/* ------------------------------------------------------------------ */

export interface ReportQueryArgs {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  page: number;
  limit: number;
}

export interface ReportExportArgs {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  format: ReportExportFormat;
}

/** Shared filter fields (date range + status + search) without pagination. */
interface FilterArgs {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** `{ createdAt: { $gte?, $lt? } }` over UTC midnight bounds (`to` inclusive). */
export function dateRangeFilter(from?: string, to?: string): Record<string, unknown> {
  const range: Record<string, unknown> = {};
  if (from) {
    const start = new Date(`${from}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) range.$gte = start;
  }
  if (to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    if (!Number.isNaN(end.getTime())) range.$lt = new Date(end.getTime() + DAY_MS);
  }
  return Object.keys(range).length ? { createdAt: range } : {};
}

export function paginate(total: number, page: number, limit: number): ReportPagination {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

export function toIso(d: Date | string | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date().toISOString();
}

/** Clamp the page-size for the paginated JSON endpoint (export uses EXPORT_CAP). */
export function clampPage(page: number, limit: number): { page: number; limit: number } {
  return { page: Math.max(1, page), limit: Math.min(100, Math.max(1, limit)) };
}

/* ------------------------------------------------------------------ */
/*  Filter builders (shared by paginated reads + export)               */
/* ------------------------------------------------------------------ */

function depositFilter(userId: string, q: FilterArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { user: userId, ...dateRangeFilter(q.from, q.to) };
  if (q.status) filter.status = q.status;
  return filter;
}

function withdrawalFilter(userId: string, q: FilterArgs): Record<string, unknown> {
  const filter: Record<string, unknown> = { user: userId, ...dateRangeFilter(q.from, q.to) };
  if (q.status) filter.status = q.status;
  if (q.q) filter.address = { $regex: q.q, $options: "i" };
  return filter;
}

function ledgerFilter(userId: string, kind: UserReportKind, q: FilterArgs): Record<string, unknown> {
  const type = LEDGER_KIND_TO_TYPE[kind];
  const filter: Record<string, unknown> = { user: userId, ...dateRangeFilter(q.from, q.to) };
  // Income streams are credit-only of one type; `wallet` shows all rows.
  if (type !== undefined) {
    filter.type = type;
    filter.direction = "credit";
  }
  if (q.q) filter.memo = { $regex: q.q, $options: "i" };
  return filter;
}

/* ------------------------------------------------------------------ */
/*  Mappers (thin; same shapes as the owning services' mappers)       */
/* ------------------------------------------------------------------ */

type LeanDeposit = {
  _id: { toString(): string };
  userPackage: { toString(): string };
  package: { toString(): string };
  amountUsd: number;
  currency: string;
  status: string;
  payAddress?: string | null;
  payAmount?: number | null;
  hostedUrl?: string | null;
  sandbox: boolean;
  createdAt: Date | string;
  paidAt?: Date | string | null;
};

function toDepositRow(d: LeanDeposit): DepositRow {
  return {
    id: d._id.toString(),
    userPackageId: d.userPackage.toString(),
    packageId: d.package.toString(),
    amountUsd: d.amountUsd,
    currency: d.currency as DepositRow["currency"],
    status: d.status as DepositRow["status"],
    payAddress: d.payAddress ?? null,
    payAmount: d.payAmount ?? null,
    hostedUrl: d.hostedUrl ?? null,
    sandbox: d.sandbox,
    createdAt: toIso(d.createdAt),
    paidAt: d.paidAt == null ? null : toIso(d.paidAt),
  };
}

type LeanWithdrawal = {
  _id: { toString(): string };
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

function toWithdrawalRow(w: LeanWithdrawal): WithdrawalRow {
  return {
    id: w._id.toString(),
    wallet: w.wallet as WithdrawalRow["wallet"],
    amount: w.amount,
    currency: w.currency as WithdrawalRow["currency"],
    address: w.address,
    status: w.status as WithdrawalRow["status"],
    remarks: w.remarks ?? null,
    processedBy: w.processedBy ? w.processedBy.toString() : null,
    processedAt: w.processedAt == null ? null : toIso(w.processedAt),
    createdAt: toIso(w.createdAt),
    updatedAt: toIso(w.updatedAt),
  };
}

type LeanTx = {
  _id: { toString(): string };
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

function toTxRow(d: LeanTx): WalletTxRow {
  const reference: WalletTxRef = {
    resource: d.reference?.resource ?? null,
    resourceId: d.reference?.resourceId ?? null,
  };
  return {
    id: d._id.toString(),
    wallet: d.wallet as WalletTxRow["wallet"],
    type: d.type as WalletTxType,
    direction: d.direction as WalletTxDirection,
    amount: d.amount,
    availableAfter: d.availableAfter,
    onHoldAfter: d.onHoldAfter,
    memo: d.memo ?? null,
    reference,
    createdAt: toIso(d.createdAt),
  };
}

/* ------------------------------------------------------------------ */
/*  Summary aggregations                                               */
/* ------------------------------------------------------------------ */

/** `$sum` of a signed amount: credits add, debits subtract. For income
 *  streams (all credits) this is a plain sum; for `wallet` it is the net. */
export const SIGNED_AMOUNT = { $cond: [{ $eq: ["$direction", "credit"] }, "$amount", { $multiply: ["$amount", -1] }] };

export async function ledgerSummary(filter: Record<string, unknown>): Promise<ReportSummary> {
  const [agg, daily] = await Promise.all([
    WalletTransaction.aggregate<{ _id: null; count: number; total: number }>([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: SIGNED_AMOUNT } } },
    ]),
    WalletTransaction.aggregate<{ _id: string; value: number }>([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: SIGNED_AMOUNT },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  return {
    count: agg[0]?.count ?? 0,
    total: agg[0]?.total ?? 0,
    series: daily.map((d) => ({ date: d._id, value: d.value })),
  };
}

export async function amountSummary(
  model: typeof Deposit | typeof Withdrawal,
  filter: Record<string, unknown>,
  amountField: "amountUsd" | "amount",
): Promise<ReportSummary> {
  const [agg, daily] = await Promise.all([
    model.aggregate<{ _id: null; count: number; total: number }>([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: `$${amountField}` } } },
    ]),
    model.aggregate<{ _id: string; value: number }>([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: `$${amountField}` },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);
  return {
    count: agg[0]?.count ?? 0,
    total: agg[0]?.total ?? 0,
    series: daily.map((d) => ({ date: d._id, value: d.value })),
  };
}

/* ------------------------------------------------------------------ */
/*  Report reads (paginated JSON endpoint)                             */
/* ------------------------------------------------------------------ */

/** `GET /reports/deposits` — the user's deposits, paginated + summarised. */
export async function getDepositReport(userId: string, q: ReportQueryArgs): Promise<ReportResult<DepositRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = depositFilter(userId, q);
  const [rows, total, summary] = await Promise.all([
    Deposit.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Deposit.countDocuments(filter),
    amountSummary(Deposit, filter, "amountUsd"),
  ]);
  return { rows: rows.map((r) => toDepositRow(r as never)), pagination: paginate(total, page, limit), summary };
}

/** `GET /reports/withdrawals` — the user's withdrawals, paginated + summarised. */
export async function getWithdrawalReport(userId: string, q: ReportQueryArgs): Promise<ReportResult<WithdrawalRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = withdrawalFilter(userId, q);
  const [rows, total, summary] = await Promise.all([
    Withdrawal.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Withdrawal.countDocuments(filter),
    amountSummary(Withdrawal, filter, "amount"),
  ]);
  return { rows: rows.map((r) => toWithdrawalRow(r as never)), pagination: paginate(total, page, limit), summary };
}

/**
 * `GET /reports/wallet` and the 6 income-stream kinds — the user's wallet
 * ledger, optionally filtered by `type` (income streams) and `direction`
 * (income streams are credits only; `wallet` shows both). Paginated + summarised
 * (net total for `wallet`, credit total for income streams).
 */
export async function getLedgerReport(
  userId: string,
  kind: UserReportKind,
  q: ReportQueryArgs,
): Promise<ReportResult<WalletTxRow>> {
  const { page, limit } = clampPage(q.page, q.limit);
  const filter = ledgerFilter(userId, kind, q);
  const [rows, total, summary] = await Promise.all([
    WalletTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    WalletTransaction.countDocuments(filter),
    ledgerSummary(filter),
  ]);
  return { rows: rows.map((r) => toTxRow(r as never)), pagination: paginate(total, page, limit), summary };
}

/* ------------------------------------------------------------------ */
/*  CSV / Excel export                                                 */
/* ------------------------------------------------------------------ */

/** Today's UTC `YYYY-MM-DD` for the export filename. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Fetch up to `EXPORT_CAP` mapped rows for a kind (no pagination). */
async function fetchExportRows(userId: string, kind: UserReportKind, q: ReportExportArgs): Promise<unknown[]> {
  const f: FilterArgs = { from: q.from, to: q.to, status: q.status, q: q.q };
  if (kind === "deposits") {
    const rows = await Deposit.find(depositFilter(userId, f)).sort({ createdAt: -1 }).limit(EXPORT_CAP).lean();
    return rows.map((r) => toDepositRow(r as never));
  }
  if (kind === "withdrawals") {
    const rows = await Withdrawal.find(withdrawalFilter(userId, f)).sort({ createdAt: -1 }).limit(EXPORT_CAP).lean();
    return rows.map((r) => toWithdrawalRow(r as never));
  }
  const rows = await WalletTransaction.find(ledgerFilter(userId, kind, f))
    .sort({ createdAt: -1 })
    .limit(EXPORT_CAP)
    .lean();
  return rows.map((r) => toTxRow(r as never));
}

type Cell = string | number | null | undefined;

/** Column spec for a kind → (headers, cell rows). */
function toSheet(kind: UserReportKind, rows: unknown[]): { headers: string[]; data: Cell[][] } {
  if (kind === "deposits") {
    return {
      headers: ["Date", "Amount (USD)", "Currency", "Status", "Paid at"],
      data: (rows as DepositRow[]).map((r) => [r.createdAt, r.amountUsd, r.currency, r.status, r.paidAt]),
    };
  }
  if (kind === "withdrawals") {
    return {
      headers: ["Date", "Wallet", "Amount (USD)", "Currency", "Address", "Status", "Processed at"],
      data: (rows as WithdrawalRow[]).map((r) => [r.createdAt, r.wallet, r.amount, r.currency, r.address, r.status, r.processedAt]),
    };
  }
  return {
    headers: ["Date", "Wallet", "Type", "Direction", "Amount", "Memo", "Reference"],
    data: (rows as WalletTxRow[]).map((r) => [
      r.createdAt,
      r.wallet,
      r.type,
      r.direction,
      r.amount,
      r.memo,
      r.reference?.resourceId ?? "",
    ]),
  };
}

/**
 * Build the export body for a report kind. Returns the filename, MIME type,
 * and body string (CSV or Excel-HTML depending on `format`).
 */
export async function getReportExport(
  userId: string,
  kind: UserReportKind,
  q: ReportExportArgs,
): Promise<{ filename: string; mime: string; body: string }> {
  const rows = await fetchExportRows(userId, kind, q);
  const { headers, data } = toSheet(kind, rows);
  const ext = q.format === "xls" ? "xls" : "csv";
  const filename = `report-${kind}-${todayUtc()}.${ext}`;

  if (q.format === "xls") {
    return { filename, mime: "application/vnd.ms-excel", body: buildExcelHtml(headers, data) };
  }
  return { filename, mime: "text/csv; charset=utf-8", body: buildCsv(headers, data) };
}