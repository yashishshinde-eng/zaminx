/**
 * Compensation Engine — Phase 10.
 *
 * Three income streams ship in Phase 10: Trade Yield, Direct Connect Bonus, and
 * the Bonanza engine. The remaining three (Daily Team Energy, Community Monthly,
 * Rank Reward) arrive in Phase 10A. The wallet ledger (`WalletTransaction`) is
 * the source of truth for every credit; these types are the API-facing shapes.
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