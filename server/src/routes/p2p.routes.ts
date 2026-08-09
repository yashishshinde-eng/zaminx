import { Router } from "express";
import { requireActive } from "../middlewares/auth.js";
import { create, list } from "../controllers/p2p.controller.js";

const router = Router();

// Sending a P2P transfer requires an active (package-activated) account.
router.post("/", requireActive, ...create);
router.get("/", ...list);

export default router;