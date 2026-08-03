import { CronLog } from "../models/index.js";
import { logger } from "../config/logger.js";
import { verifyPendingDeposits } from "../services/paymentVerify.service.js";
import {
  runDailyYield,
  runDailyTeamEnergy,
  runMonthlyCommunityBonus,
  runBonanzaEvaluationAll,
} from "../services/compensation.service.js";
import { runRankCheckAll } from "../services/rank.service.js";

/**
 * Dependency-free in-process scheduler (Phase 18). A 60-second tick walks the
 * registry and runs any enabled job that is due, where "due" is derived from the
 * last `CronLog` row for that job (the Phase-17 `{job:1,createdAt:-1}` index makes
 * this cheap). This is restart-safe — a freshly-booted process does not re-run a
 * job that already ran this period — and avoids pulling in `node-cron` for what
 * are very coarse schedules.
 *
 * The compensation engines are themselves idempotent per day/month (their ledger
 * references dedupe), so CronLog skip-by-history is belt-and-braces, not load-bearing.
 */

/** A job's `run` returns a service-specific summary (yield/rank/bonanza/payment).
 * The scheduler only reads `processed`/`evaluated`/`skipped` from it for the
 * CronLog row, so the return is left untyped here and narrowed at the log site. */
type Schedule =
  | { kind: "daily"; hourUTC: number; minuteUTC: number }
  | { kind: "monthly"; dayUTC: number; hourUTC: number; minuteUTC: number }
  | { kind: "interval"; everyMinutes: number };

interface Job {
  name: string;
  schedule: Schedule;
  run: () => Promise<unknown>;
  /** Defaults to true. Disabled jobs stay in the registry (full Blueprint list
   * represented) but never fire. */
  enabled?: boolean;
}

const TICK_MS = 60_000;

/** The 8 Blueprint jobs. 6 enabled, 2 disabled (their backing queues don't exist
 * yet — notification queue is Phase 12 deferred, emails are already fire-and-forget
 * with no outbox). Registered so the full list is represented in code. */
const REGISTRY: Job[] = [
  { name: "daily_yield", schedule: { kind: "daily", hourUTC: 0, minuteUTC: 30 }, run: runDailyYield },
  { name: "daily_team_energy", schedule: { kind: "daily", hourUTC: 0, minuteUTC: 45 }, run: runDailyTeamEnergy },
  { name: "monthly_community_bonus", schedule: { kind: "monthly", dayUTC: 1, hourUTC: 1, minuteUTC: 0 }, run: runMonthlyCommunityBonus },
  { name: "rank_check", schedule: { kind: "daily", hourUTC: 1, minuteUTC: 15 }, run: runRankCheckAll },
  { name: "bonanza_check", schedule: { kind: "daily", hourUTC: 1, minuteUTC: 30 }, run: runBonanzaEvaluationAll },
  { name: "payment_verify", schedule: { kind: "interval", everyMinutes: 15 }, run: verifyPendingDeposits },
  { name: "email_queue", schedule: { kind: "interval", everyMinutes: 5 }, run: async () => ({}), enabled: false },
  { name: "notification_queue", schedule: { kind: "interval", everyMinutes: 5 }, run: async () => ({}), enabled: false },
];

let timer: NodeJS.Timeout | null = null;
const running = new Set<string>();

/** UTC midnight-bounded instant for `now`'s day at HH:MM. */
function dailyTarget(now: Date, hourUTC: number, minuteUTC: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUTC, minuteUTC, 0, 0));
}

/** UTC instant for the 1st of `now`'s month at D HH:MM. */
function monthlyTarget(now: Date, dayUTC: number, hourUTC: number, minuteUTC: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayUTC, hourUTC, minuteUTC, 0, 0));
}

async function lastRunAt(name: string): Promise<Date | null> {
  const last = await CronLog.findOne({ job: name }).sort({ createdAt: -1 }).lean().exec();
  return last?.createdAt ?? null;
}

/** Is `job` due to run as of `now`? Uses the most recent CronLog row so a restart
 * after a run already completed this period does not re-run it. */
async function isDue(job: Job, now: Date): Promise<boolean> {
  const last = await lastRunAt(job.name).catch(() => null);
  const sched = job.schedule;
  if (sched.kind === "interval") {
    if (!last) return true;
    return now.getTime() - last.getTime() >= sched.everyMinutes * 60_000;
  }
  if (sched.kind === "daily") {
    const target = dailyTarget(now, sched.hourUTC, sched.minuteUTC);
    if (now < target) return false; // not yet reached today
    return !last || last < target; // either never ran, or last ran before today's slot
  }
  // monthly
  const target = monthlyTarget(now, sched.dayUTC, sched.hourUTC, sched.minuteUTC);
  if (now < target) return false;
  return !last || last < target;
}

/** Run `fn` and record a `CronLog` row regardless of outcome. A log-write failure
 * never propagates (best-effort audit). */
async function withCronLog(name: string, fn: () => Promise<unknown>): Promise<void> {
  const startedAt = new Date();
  try {
    const summary = (await fn()) as Record<string, unknown> | null | undefined;
    const processed =
      typeof summary?.processed === "number"
        ? summary.processed
        : typeof summary?.evaluated === "number"
          ? summary.evaluated
          : 0;
    void CronLog.create({
      job: name,
      status: "success",
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      processed,
      meta: summary ?? {},
    }).catch(() => undefined);
    logger.info(`cron:${name} done`, { processed, skipped: summary?.skipped ?? false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void CronLog.create({
      job: name,
      status: "failed",
      startedAt,
      finishedAt: new Date(),
      durationMs: Date.now() - startedAt.getTime(),
      error: message,
    }).catch(() => undefined);
    logger.error(`cron:${name} failed`, { error: message });
  }
}

async function tick(): Promise<void> {
  const now = new Date();
  const started: Promise<void>[] = [];
  for (const job of REGISTRY) {
    if (job.enabled === false) continue;
    if (running.has(job.name)) continue; // overlap guard
    let due = false;
    try {
      due = await isDue(job, now);
    } catch {
      // isDue already swallows its own errors; defensive.
      continue;
    }
    if (!due) continue;
    running.add(job.name);
    started.push(
      (async () => {
        try {
          await withCronLog(job.name, job.run);
        } finally {
          running.delete(job.name);
        }
      })(),
    );
  }
  // Await all started jobs so callers that drive a single pass (the Vercel
  // Cron HTTP handler) don't return — and get killed — before jobs finish. The
  // in-process setInterval tick also awaits here (harmless; one pass/60s).
  await Promise.allSettled(started);
}

/**
 * Run a single scheduler pass: evaluate every enabled job's due status and run
 * the ones that are due (idempotent + CronLog-guarded). Used by the Vercel Cron
 * handler `/api/cron/tick`. Identical to one `tick()` invocation.
 */
export async function runDueJobs(): Promise<void> {
  await tick();
}

/** Start the scheduler. Idempotent — calling twice does not create a second tick. */
export function startScheduler(): void {
  if (timer) return;
  const enabled = REGISTRY.filter((j) => j.enabled !== false).map((j) => j.name);
  logger.info(`⏰ Scheduler started — ${enabled.length} active job(s): ${enabled.join(", ")}`);
  timer = setInterval(() => {
    void tick().catch(() => undefined);
  }, TICK_MS);
  timer.unref?.();
}

/** Stop the scheduler and clear the tick. Safe to call when not started. */
export function stopScheduler(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  logger.info("⏰ Scheduler stopped");
}