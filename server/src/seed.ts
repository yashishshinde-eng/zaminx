import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { User, Setting } from "./models/index.js";

async function seed() {
  await connectDB();

  // --- Admin user ---
  const existing = await User.findOne({ email: env.SEED_ADMIN_EMAIL });
  if (existing) {
    logger.info(`Admin user already exists: ${env.SEED_ADMIN_EMAIL}`);
  } else {
    const admin = new User({
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
      role: "admin",
      isEmailVerified: true,
      themePreference: "dark",
    });
    await admin.save();
    logger.info(`✅ Admin user created: ${admin.email} (referralCode: ${admin.referralCode})`);
  }

  // --- Default settings (seeded empty; later phases populate via admin panel) ---
  const defaults = [
    { key: "cms.siteName", value: { name: "Zaminex" }, category: "cms", isPublic: true },
    { key: "cms.tagline", value: { tagline: "Modern arbitrage investment platform" }, category: "cms", isPublic: true },
    { key: "general.maintenanceMode", value: { enabled: false, message: "" }, category: "general", isPublic: true },
    { key: "smtp.configured", value: false, category: "smtp", isPublic: false },
    { key: "payment.configured", value: false, category: "payment", isPublic: false },
  ];

  for (const d of defaults) {
    const exists = await Setting.findOne({ key: d.key });
    if (!exists) await Setting.create(d);
  }
  logger.info(`✅ Default settings ensured (${defaults.length} keys)`);

  logger.info("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  logger.error("Seed failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});