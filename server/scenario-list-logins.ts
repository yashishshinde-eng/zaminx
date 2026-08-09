/**
 * List every @scenario.local user (label + email + password) so you can log in
 * as any of them in the app. Read-only.
 *   npx tsx scenario-list-logins.ts
 */
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGO_URI!);
  const { User } = await import("./src/models/index.js");
  const us = await User.find({ email: /@scenario\.local$/ }).sort({ createdAt: 1 }).lean();

  // Mute the logger by importing after connect; print a clean table.
  const lines: string[] = [];
  lines.push("LABEL    EMAIL                                       PASSWORD");
  lines.push("-".repeat(70));
  for (const u of us) {
    lines.push(`${(u.name || "").padEnd(8)} ${u.email.padEnd(44)} secret123`);
  }
  lines.push("-".repeat(70));
  lines.push(`TOTAL: ${us.length} users`);
  // Print all at once so logger noise doesn't interleave.
  process.stdout.write(lines.join("\n") + "\n");

  await mongoose.disconnect();
}
main().catch((e) => { console.error(e?.stack || e); process.exit(1); });