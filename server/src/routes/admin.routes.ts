import { Router } from "express";
import {
  dashboard,
  compensationSettings,
  updateCompensationSettings,
  siteConfig,
  updateSiteConfig,
  smtpSettings,
  updateSmtpSettings,
  testSmtpEmail,
  nowpaymentsSettings,
  updateNowpaymentsSettings,
  maintenanceSettings,
  updateMaintenanceSettings,
  forceLogoutAllHandler,
  adminLogs,
} from "../controllers/admin.controller.js";
import adminUserRoutes from "./adminUser.routes.js";
import adminCmsRoutes from "./adminCms.routes.js";

const router = Router();

// `authenticate` + `authorize("admin")` run at the `/admin` mount in
// routes/index.ts, so every route here is already admin-gated.

// Platform dashboard.
router.get("/dashboard", ...dashboard);

// User management sub-tree.
router.use("/users", adminUserRoutes);

// CMS page CRUD sub-tree (list incl. drafts, get any status, create/update/delete).
router.use("/cms", adminCmsRoutes);

// Compensation settings (read + update). The 7 knobs live in the `Setting`
// collection under the `compensation` category; triggers stay on /compensation.
router.get("/settings/compensation", ...compensationSettings);
router.patch("/settings/compensation", ...updateCompensationSettings);

// Site config (read + update) — the 9 admin-editable `cms.*` fields.
// `general.maintenanceMode` is NOT here (Phase 14C security/maintenance).
router.get("/settings/cms", ...siteConfig);
router.patch("/settings/cms", ...updateSiteConfig);

// SMTP settings (hybrid) — non-secret fields editable; secrets env-only.
router.get("/settings/smtp", ...smtpSettings);
router.patch("/settings/smtp", ...updateSmtpSettings);
router.post("/settings/smtp/test", ...testSmtpEmail);

// NOWPayments settings (hybrid) — non-secret fields editable; secrets env-only.
router.get("/settings/payment", ...nowpaymentsSettings);
router.patch("/settings/payment", ...updateNowpaymentsSettings);

// Maintenance settings (Phase 14C) — the public `general.maintenanceMode`
// flag. The server-side enforcement middleware 503s non-admin API traffic when
// enabled; this is the admin toggle.
router.get("/settings/maintenance", ...maintenanceSettings);
router.patch("/settings/maintenance", ...updateMaintenanceSettings);

// Force-logout-all (Phase 14C) — bulk-invalidate every refresh token except the
// acting admin's. Access tokens expire on their own; refresh is what's blocked.
router.post("/sessions/invalidate-all", ...forceLogoutAllHandler);

// App logs viewer (Phase 14C) — tail a Winston log file.
router.get("/logs", ...adminLogs);

export default router;