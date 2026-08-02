import { z } from "zod";

/** POST /packages/activate — initiate a package activation (creates a pending
 *  subscription; Phase 7 wires the invoice/payment that confirms it). */
export const activatePackageSchema = z.object({
  body: z.object({
    packageId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid package id"),
  }),
});