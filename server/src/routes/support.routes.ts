import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { create, list, detail, reply } from "../controllers/support.controller.js";
import { adminList, adminDetail, adminReply, adminStatus } from "../controllers/adminSupport.controller.js";

const router = Router();

// --- User root routes ---
// `authenticate` runs at the mount (see routes/index.ts).
router.post("/", ...create);
router.get("/", ...list);

// --- Admin routes (literal "admin" MUST precede the ":id" param route).
//     `authenticate` runs at the mount; `authorize("admin")` gates the sub-tree. ---
router.use("/admin", authorize("admin"));
router.get("/admin", ...adminList);
router.get("/admin/:id", ...adminDetail);
router.post("/admin/:id/reply", ...adminReply);
router.patch("/admin/:id/status", ...adminStatus);

// --- User param routes ---
router.get("/:id", ...detail);
router.post("/:id/reply", ...reply);

export default router;