/**
 * Manual daily "closing" runner. Calls the same compensation engines the
 * scheduler / admin API use, directly (no HTTP server needed). Idempotent per
 * UTC day (ledger-reference dedupe), so re-running the same day is a no-op.
 *
 *   cd server && npx tsx src/scripts/run-daily-close.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { runDailyYield, runDailyTeamEnergy, runBonanzaEvaluationAll } from "../services/compensation.service.js";
import { runRankCheckAll } from "../services/rank.service.js";

const URI = process.env.MONGO_URI;
if (!URI) {
  console.error("MONGO_URI missing");
  process.exit(1);
}
const MONGO_URI: string = URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("DB connected. Running daily closing…\n");

  const started = Date.now();

  console.log("1) daily_yield …");
  const yieldSummary = await runDailyYield();
  console.log("   " + JSON.stringify(yieldSummary));

  console.log("2) daily_team_energy …");
  const teamSummary = await runDailyTeamEnergy();
  console.log("   " + JSON.stringify(teamSummary));

  console.log("3) rank_check …");
  const rankSummary = await runRankCheckAll();
  console.log("   " + JSON.stringify(rankSummary));

  console.log("4) bonanza_check …");
  const bonanzaSummary = await runBonanzaEvaluationAll();
  console.log("   " + JSON.stringify(bonanzaSummary));

  console.log(`\nDaily closing complete in ${Date.now() - started}ms`);

  // Write a CronLog row for each step so this manual run is audited the same way
  // the scheduler's runs are.
  const col = mongoose.connection.db!.collection("cronlogs");
  const now = new Date();
  const log = async (job: string, status: string, processed: number, meta: any, error?: string) =>
    col.insertOne({ job, status, startedAt: now, finishedAt: new Date(), durationMs: Date.now() - started, processed, meta: meta ?? {}, error: error ?? null, createdAt: new Date() } as any);
  await log("daily_yield", "success", (yieldSummary as any)?.processed ?? 0, yieldSummary);
  await log("daily_team_energy", "success", (teamSummary as any)?.processed ?? 0, teamSummary);
  await log("rank_check", "success", (rankSummary as any)?.processed ?? (rankSummary as any)?.evaluated ?? 0, rankSummary);
  await log("bonanza_check", "success", (bonanzaSummary as any)?.processed ?? (bonanzaSummary as any)?.evaluated ?? 0, bonanzaSummary);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});