import { Router } from "express";
import { summary, teamEnergy, community } from "../controllers/dashboard.controller.js";

const router = Router();

router.get("/summary", ...summary);
router.get("/team-energy", ...teamEnergy);
router.get("/community", ...community);

export default router;
