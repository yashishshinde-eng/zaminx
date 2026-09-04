/**
 * Real coin logos for the Trade page market list/header.
 *
 * SVGs are imported from `cryptocurrency-icons` so Vite bundles them locally —
 * no runtime CDN dependency, no broken images if a third-party host is down.
 * Each import resolves to a hashed asset URL string. Unknown bases fall back to
 * `null` so the caller can render its existing ticker-letter badge.
 */
import btc from "cryptocurrency-icons/svg/color/btc.svg";
import eth from "cryptocurrency-icons/svg/color/eth.svg";
import bnb from "cryptocurrency-icons/svg/color/bnb.svg";
import ltc from "cryptocurrency-icons/svg/color/ltc.svg";
import ada from "cryptocurrency-icons/svg/color/ada.svg";
import xrp from "cryptocurrency-icons/svg/color/xrp.svg";
import trx from "cryptocurrency-icons/svg/color/trx.svg";

const ICONS: Record<string, string> = {
  BTC: btc,
  ETH: eth,
  BNB: bnb,
  LTC: ltc,
  ADA: ada,
  XRP: xrp,
  TRX: trx,
};

/** Bundled SVG URL for a base asset (e.g. "BTC"), or `null` if unavailable. */
export function coinIcon(base: string): string | null {
  return ICONS[base] ?? null;
}