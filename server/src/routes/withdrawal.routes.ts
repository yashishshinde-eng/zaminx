import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { withdrawalLimiter } from "../middlewares/rateLimit.js";
import { create, list, detail, cancel } from "../controllers/withdrawal.controller.js";
import { adminList, adminDetail, review, approve, reject, pay } from "../controllers/adminWithdrawal.controller.js";

const router = Router();

// --- User root routes ---
router.post("/", withdrawalLimiter, ...create);
router.get("/", ...list);

// --- Admin routes (literal "admin" MUST precede the ":id" param route).
//     `authenticate` runs at the mount; `authorize("admin")` gates the sub-tree. ---
router.use("/admin", authorize("admin"));
router.get("/admin", ...adminList);
router.get("/admin/:id", ...adminDetail);
router.post("/admin/:id/review", ...review);
router.post("/admin/:id/approve", ...approve);
router.post("/admin/:id/reject", ...reject);
router.post("/admin/:id/pay", ...pay);

// --- User param routes ---
router.get("/:id", ...detail);
router.post("/:id/cancel", ...cancel);

export default router;