import { Router } from "express";
import { stats, direct, team, children } from "../controllers/referral.controller.js";

const router = Router();

router.get("/me", ...stats);
router.get("/direct", ...direct);
router.get("/team", ...team);
router.get("/children/:userId", ...children);

export default router;