/**
 * Referral engine types (Phase 9).
 *
 * `User.sponsorId` (direct referrer's _id) + `User.lineage` (ancestor _ids,
 * root → sponsor) materialise the referral graph so descendant queries are a
 * single indexed lookup. Downline rows deliberately expose `name` + `referralCode`
 * + `status` + `joinedAt` + `directCount` only — no email / wallet / PII.
 */

export type ReferralMemberStatus = "active" | "suspended" | "banned";

/** A single downline member row (used by the direct list + lazy tree). */
export interface ReferralMemberRow {
  id: string;
  name: string;
  referralCode: string;
  status: ReferralMemberStatus;
  joinedAt: string; // ISO createdAt
  /** This member's own direct-referral count — drives the tree expand affordance. */
  directCount: number;
  /** Absolute depth = lineage.length (root=0; a direct referral=1). */
  level: number;
}

/** Descendant counts bucketed by level relative to the viewer. */
export interface ReferralByLevel {
  level: number; // 1 = direct, 2 = second level, …
  count: number;
  active: number;
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
}

/** `GET /referrals/direct` + `/referrals/children/:userId` — paginated members. */
export interface ReferralPage {
  items: ReferralMemberRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}