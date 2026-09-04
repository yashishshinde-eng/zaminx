import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** Max rungs on the ladder above Starter (1 Star … 10 Star). */
export const MAX_RANK_STARS = 10;

/**
 * Parse the star level from a rank name.
 * "1 Star" → 1, "10 Star" → 10, "Starter"/"Unranked"/anything else → 0.
 * Clamped to [0, MAX_RANK_STARS].
 */
export function rankStarCount(name: string | null | undefined): number {
  if (!name) return 0;
  const m = name.trim().match(/^(\d+)\s*star/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return 0;
  return Math.min(MAX_RANK_STARS, Math.max(0, n));
}

/** A row of gold stars showing the rank's star level out of 10.
 *  Achieved stars are filled gold; the remaining rungs are faint outlines,
 *  so the ladder reads as a progression (e.g. 1 of 10) at a glance.
 *  Starter (0 stars) shows all 10 outlines. */
export function RankStars({
  name,
  size = 12,
  max = MAX_RANK_STARS,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  max?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const level = rankStarCount(name);
  return (
    <span
      className={cn("inline-flex items-center", className)}
      role="img"
      aria-label={t("rankStars.ariaLabel", { level, max })}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          strokeWidth={1.5}
          className={cn(i < level ? "text-gold" : "text-gold/20")}
          fill={i < level ? "hsl(var(--gold))" : "none"}
        />
      ))}
    </span>
  );
}