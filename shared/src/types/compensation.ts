/**
 * Compensation Engine — Phases 10 & 10A.
 *
 * Phase 10 ships Trade Yield, Direct Connect Bonus, and the Bonanza engine.
 * Phase 10A completes the engine with Daily Team Energy, Community Monthly, and
 * the Rank Reward ladder. The wallet ledger (`WalletTransaction`) is the source
 * of truth for every credit; these types are the API-facing shapes.
 */

export type BonanzaStatus = "active" | "inactive";

/** A Bonanza offer row, as returned to admins (full record). */
export interface BonanzaOfferRow {
  id: string;
  name: string;
  requiredDirects: number;
  rewardAmount: number;
  startDate: string; // ISO
  endDate: string; // ISO
  status: BonanzaStatus;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A user-facing offer plus the viewer's progress and award state. */
export interface BonanzaOfferView {
  id: string;
  name: string;
  requiredDirects: number;
  rewardAmount: number;
  startDate: string;
  endDate: string;
  terms: string | null;
  /** The viewer's current direct-referral count. */
  directCount: number;
  /** `directCount >= requiredDirects` (within the offer window). */
  qualified: boolean;
  /** The viewer has already been awarded this offer (ledger row exists). */
  awarded: boolean;
}

/** `GET /bonanzas` — the viewer's direct count + active offers with progress. */
export interface BonanzaOverview {
  directCount: number;
  offers: BonanzaOfferView[];
}

/** Result of an admin-triggered daily yield run. */
export interface YieldRunSummary {
  asOf: string; // ISO date the run targeted
  processed: number;
  credited: number;
  skipped: number;
  expired: number;
  errors: number;
}

/** Result of an admin-triggered bonanza evaluation. */
export interface BonanzaEvalSummary {
  evaluated: number;
  awarded: number;
  errors: number;
}

/* ------------------------------------------------------------------ */
/*  Phase 10A — team energy, community, ranks                          */
/* ------------------------------------------------------------------ */

export type RankStatus = "active" | "inactive";

/** A Rank ladder row, as returned to admins (full record). */
export interface RankRow {
  id: string;
  name: string;
  order: number;
  requiredDirects: number;
  requiredTeamSize: number;
  rewardAmount: number;
  status: RankStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard rank slice — matches `DashboardSummary["account"]["rank"]`. Computed
 * read-only from the active rank ladder (Phase 10A); no awards are issued here.
 */
export interface RankInfo {
  name: string;
  nextRank: string | null;
  progress: number; // 0..1 toward the next rank
}

/** Result of an admin-triggered daily team-energy run. */
export interface TeamEnergyRunSummary {
  asOf: string; // ISO date the run targeted
  processed: number;
  credited: number;
  skipped: number;
  errors: number;
}

/** Result of an admin-triggered monthly community-bonus run. */
export interface CommunityRunSummary {
  month: string; // YYYY-MM the run targeted
  processed: number;
  credited: number;
  skipped: number;
  errors: number;
}

/** Result of an admin-triggered rank evaluation. */
export interface RankEvalSummary {
  evaluated: number;
  awarded: number;
  errors: number;
}