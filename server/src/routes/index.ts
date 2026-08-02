import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import cmsRoutes from "./cms.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import profileRoutes from "./profile.routes.js";
import packageRoutes from "./package.routes.js";
import paymentRoutes from "./payment.routes.js";
import walletRoutes from "./wallet.routes.js";
import withdrawalRoutes from "./withdrawal.routes.js";
import referralRoutes from "./referral.routes.js";
import bonanzaRoutes from "./bonanza.routes.js";
import compensationRoutes from "./compensation.routes.js";
import rankRoutes from "./rank.routes.js";
import reportRoutes from "./report.routes.js";

const router = Router();

router.get("/", (_req, res) =>
  res.json({ success: true, message: "Zaminex API", version: "v1" }),
);
router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/cms", cmsRoutes);
router.use("/dashboard", authenticate, dashboardRoutes);
router.use("/profile", authenticate, profileRoutes);
router.use("/packages", authenticate, packageRoutes);
router.use("/payments", paymentRoutes);
router.use("/wallet", authenticate, walletRoutes);
router.use("/withdrawals", authenticate, withdrawalRoutes);
router.use("/referrals", authenticate, referralRoutes);
router.use("/bonanzas", authenticate, bonanzaRoutes);
// Compensation triggers are admin-only (Phase 10): yield run + bonanza eval.
// Phase 10A adds team-energy, community, and rank-check triggers.
router.use("/compensation", authenticate, authorize("admin"), compensationRoutes);
// Rank ladder CRUD is admin-only (Phase 10A).
router.use("/ranks", authenticate, authorize("admin"), rankRoutes);
// Per-user reports (Phase 11): 9 kinds over 3 data sources + CSV/Excel export.
router.use("/reports", authenticate, reportRoutes);

// Future phases mount here:
// router.use("/users", authenticate, authorize("admin"), userRoutes);
// router.use("/admin", authenticate, authorize("admin"), adminRoutes);

export default router;