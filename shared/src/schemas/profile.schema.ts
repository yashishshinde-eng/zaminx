import { z } from "zod";

/** Reused name + phone field rules (mirror the register schema). */
const name = z.string().trim().min(2, { message: "Name is required" }).max(80);
const phone = z
  .string()
  .trim()
  .max(20, { message: "Phone must be at most 20 characters" })
  .optional()
  .transform((v) => (v === "" ? undefined : v));

/** BEP20/EVM address validation. Empty string clears the saved address. */
const usdtBep20 = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v == null ? "" : v))
  .refine((v) => v === "" || /^0x[a-fA-F0-9]{40}$/.test(v), {
    message: "Enter a valid USDT-BEP20 (0x…) address",
  });

/** PUT /profile — personal details. */
export const updateProfileSchema = z.object({
  body: z.object({ name, phone }),
});

/** PUT /profile/wallet-addresses — the user's USDT-BEP20 payout/deposit address. */
export const updateWalletAddressesSchema = z.object({
  body: z.object({ usdtBep20 }),
});

/** PUT /profile/theme — persist theme preference to the account. */
export const updateThemeSchema = z.object({
  body: z.object({
    theme: z.enum(["light", "dark"]),
  }),
});

/** PUT /profile/notifications — notification channel preferences. */
export const updateNotificationPreferenceSchema = z.object({
  body: z.object({
    email: z.boolean(),
    dashboard: z.boolean(),
  }),
});