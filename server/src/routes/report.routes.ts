import { Router } from "express";
import { report, exportReport } from "../controllers/report.controller.js";
import { adminReport, adminExport } from "../controllers/adminReport.controller.js";
import { authorize } from "../middlewares/auth.js";

const router = Router();

// Admin sub-tree: `authorize("admin")` gates every admin route. Mounted BEFORE
// the `:kind` routes so the literal `/admin` segment isn't captured by `:kind`.
// (`authenticate` already runs at the `/reports` mount in routes/index.ts.)
router.use("/admin", authorize("admin"));
// More specific path first: `/admin/:kind/export` must precede `/admin/:kind`.
router.get("/admin/:kind/export", ...adminExport);
router.get("/admin/:kind", ...adminReport);

// More specific path first: `/:kind/export` must precede `/:kind`.
router.get("/:kind/export", ...exportReport);
router.get("/:kind", ...report);

export default router;