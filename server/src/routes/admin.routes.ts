import { Router } from "express";
import { dashboard, compensationSettings, updateCompensationSettings } from "../controllers/admin.controller.js";
import adminUserRoutes from "./adminUser.routes.js";

const router = Router();

// `authenticate` + `authorize("admin")` run at the `/admin` mount in
// routes/index.ts, so every route here is already admin-gated.

// Platform dashboard.
router.get("/dashboard", ...dashboard);

// User management sub-tree.
router.use("/users", adminUserRoutes);

// Compensation settings (read + update). The 7 knobs live in the `Setting`
// collection under the `compensation` category; triggers stay on /compensation.
router.get("/settings/compensation", ...compensationSettings);
router.patch("/settings/compensation", ...updateCompensationSettings);

export default router;