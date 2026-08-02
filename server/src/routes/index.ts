import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import cmsRoutes from "./cms.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import profileRoutes from "./profile.routes.js";
import packageRoutes from "./package.routes.js";
import paymentRoutes from "./payment.routes.js";
import walletRoutes from "./wallet.routes.js";
import withdrawalRoutes from "./withdrawal.routes.js";

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

// Future phases mount here:
// router.use("/users", authenticate, authorize("admin"), userRoutes);
// router.use("/admin", authenticate, authorize("admin"), adminRoutes);

export default router;