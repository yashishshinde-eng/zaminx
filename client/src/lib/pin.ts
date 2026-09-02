import type { ChangeEvent } from "react";

/**
 * Sanitize a transaction-PIN input to exactly 4 digits in real time: strips any
 * non-digit character, caps the length at 4, and writes the cleaned value back
 * to the DOM so the user can never type or paste a non-digit.
 *
 * Returns the cleaned value so the caller can forward it to react-hook-form's
 * `setValue` — we override RHF's register `onChange` because mutating the event
 * target alone isn't enough for RHF to reliably re-read the cleaned value.
 */
export function sanitizePinEvent(e: ChangeEvent<HTMLInputElement>): string {
  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
  if (e.target.value !== cleaned) e.target.value = cleaned;
  return cleaned;
}