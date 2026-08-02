import { Router } from "express";
import { report, exportReport } from "../controllers/report.controller.js";

const router = Router();

// --- Phase 11A (deferred): admin report kinds mount here, BEFORE the `:kind`
//     routes, so the literal `/admin` segment isn't captured by `:kind`:
//       router.use("/admin", authorize("admin"));
//       router.get("/admin/:kind", ...adminReport);
//       router.get("/admin/:kind/export", ...adminExport);
// ---

// More specific path first: `/:kind/export` must precede `/:kind`.
router.get("/:kind/export", ...exportReport);
router.get("/:kind", ...report);

export default router;