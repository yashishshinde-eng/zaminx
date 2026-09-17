/** One-off: activate the tree users level by level via the real API flow. */
import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { User } from "../models/index.js";

const EMAIL_DOMAIN = "tree-test.zeminex.dev";
const PASSWORD = "Aa@123";
const PACKAGE_SLUG = "pkg-799o1v4cjwl"; // Starter $50, 1%/day, lifetime
const FUND = 50;

async function main() {
  await mongoose.connect(process.env.MONGO_URI!);
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const PackageModel = (await import("../models/index.js")).Package;
  const pkg = await PackageModel.findOne({ slug: PACKAGE_SLUG });
  if (!pkg) throw new Error(`Package ${PACKAGE_SLUG} not found`);

  // Registration order (createdAt), root included.
  const users = await User.find({ email: { $regex: new RegExp(`${EMAIL_DOMAIN}$`, "i") } })
    .sort({ createdAt: 1 })
    .select("email")
    .lean();
  const alreadyActive = new Set(
    (await (await import("../models/index.js")).UserPackage.find({ status: "active" }).select("user").lean()).map(
      (up: { user: mongoose.Types.ObjectId }) => up.user.toString(),
    ),
  );

  let activated = 0;
  let skipped = 0;
  let failed = 0;
  let lastLevel = -1;

  for (const u of users) {
    const lvlMatch = /zam-l(\d+)-/.exec(u.email);
    const level = lvlMatch ? Number(lvlMatch[1]) : 0;
    if (level !== lastLevel) {
      console.log(`--- Level ${level} ---`);
      lastLevel = level;
    }
    try {
      if (alreadyActive.has(String(u._id))) {
        skipped++;
        console.log(`${u.email}: already active`);
        continue;
      }

      // Login
      const login = await fetch(base + "/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, password: PASSWORD }),
      });
      const loginBody = await login.json().catch(() => ({}));
      const token = loginBody?.data?.tokens?.accessToken;
      if (!token) throw new Error(`login ${login.status}`);

      // Fund via deposit + dev-simulate
      const dep = await fetch(base + "/api/v1/payments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: FUND }),
      });
      const depBody = await dep.json().catch(() => ({}));
      const depId = depBody?.data?.deposit?.id;
      if (!depId) throw new Error(`deposit ${dep.status}`);
      const sim = await fetch(base + `/api/v1/payments/dev/simulate/${depId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (sim.status !== 200) throw new Error(`simulate ${sim.status}`);

      // Activate package
      const act = await fetch(base + "/api/v1/packages/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: String(pkg._id) }),
      });
      if (act.status !== 201 && act.status !== 200) {
        const body = await act.json().catch(() => ({}));
        throw new Error(`activate ${act.status} ${JSON.stringify(body?.message ?? body)}`);
      }
      activated++;
      if (activated % 25 === 0) console.log(`progress: ${activated}/${users.length} activated`);
    } catch (err) {
      failed++;
      console.log(`FAILED ${u.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`DONE: activated=${activated} skipped=${skipped} failed=${failed} of ${users.length}`);
  await mongoose.disconnect();
  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});