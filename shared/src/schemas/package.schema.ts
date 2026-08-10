import { z } from "zod";

/** POST /packages/activate — initiate a package activation (creates a pending
 *  subscription; Phase 7 wires the invoice/payment that confirms it). */
export const activatePackageSchema = z.object({
  body: z.object({
    packageId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid package id"),
  }),
});

/** POST /packages/activate-for — an active user pays from their own Main wallet
 *  to activate a package for another inactive user (the beneficiary). The actor
 *  is the authenticated, active user; `targetUserId` is the beneficiary. */
export const activateForSchema = z.object({
  body: z.object({
    packageId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid package id"),
    targetUserId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid target user id"),
  }),
});

/** GET /packages/lookup-target — resolve a referral code to a user so the actor
 *  can confirm the beneficiary before activating a package for them. */
export const packageTargetLookupSchema = z.object({
  query: z.object({
    code: z.string().trim().min(1, "Referral code is required").max(64, "Referral code too long"),
  }),
});