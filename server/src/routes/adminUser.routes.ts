import { Router } from "express";
import { list, detail, updateStatus, verifyEmail, forceLogout, resetPassword, adjustWallet, createDeposit, impersonate } from "../controllers/adminUser.controller.js";

const router = Router();

// `authenticate` + `authorize("admin")` run at the `/admin` mount in
// routes/index.ts, so every route here is already admin-gated.
router.get("/", ...list);
router.get("/:id", ...detail);
router.patch("/:id/status", ...updateStatus);
router.post("/:id/verify-email", ...verifyEmail);
router.post("/:id/force-logout", ...forceLogout);
router.post("/:id/reset-password", ...resetPassword);
router.post("/:id/wallet/adjust", ...adjustWallet);
router.post("/:id/deposits", ...createDeposit);
router.post("/:id/impersonate", ...impersonate);

export default router;