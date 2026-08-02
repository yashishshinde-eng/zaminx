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

export default router;