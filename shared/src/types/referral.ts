/**
 * Referral engine types (Phase 9).
 *
 * `User.sponsorId` (direct referrer's _id) + `User.lineage` (ancestor _ids,
 * root → sponsor) materialise the referral graph so descendant queries are a
 * single indexed lookup. Downline rows deliberately expose `name` + `referralCode`
 * + `status` + `joinedAt` + `directCount` only — no email / wallet / PII.
 *
 * Exception: `phone` is exposed *only* for the viewer's direct (level-1)
 * referrals — a team-owner privilege for contacting their own directs.
 * Deeper-level rows always carry `phone: undefined`.
 */

export type ReferralMemberStatus = "active" | "inactive" | "blocked";

/** A single downline member row (used by the direct list + lazy tree). */
export interface ReferralMemberRow {
  id: string;
  name: string;
  referralCode: string;
  status: ReferralMemberStatus;
  joinedAt: string; // ISO createdAt
  /** This member's own direct-referral count — drives the tree expand affordance. */
  directCount: number;
  /**
   * Depth relative to the viewer (1 = direct referral, 2 = second level, …).
   * For the direct list this equals `lineage.length` since the viewer is the
   * only ancestor; for the full-team view it's computed from the viewer's
   * position in `lineage`.
   */
  level: number;
  /**
   * Phone number, populated **only** for the viewer's direct (level-1)
   * referrals. Always `undefined` for deeper-level rows (no PII leakage).
   */
  phone?: string;
}

/** Descendant counts bucketed by level relative to the viewer. */
export interface ReferralByLevel {
  level: number; // 1 = direct, 2 = second level, …
  count: number;
  active: number;
  /**
   * Total active-package business volume at this level — the sum of
   * `snapshot.priceUsd` across the level's users' currently-active
   * UserPackages (status === "active"). Excludes pending/expired/cancelled.
   */
  business: number;
}

/** `GET /referrals/me` — referral code/link + team statistics. */
export interface ReferralStats {
  code: string;
  link: string;
  directCount: number;
  /** All-level descendants. */
  teamCount: number;
  activeDirectCount: number;
  activeTeamCount: number;
  byLevel: ReferralByLevel[];
  /** Sum of every level's `business` — total active downline business volume. */
  teamBusiness: number;
}

/** `GET /referrals/direct` + `/referrals/children/:userId` — paginated members. */
export interface ReferralPage {
  items: ReferralMemberRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}