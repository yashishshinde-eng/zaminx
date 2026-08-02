import { Router } from "express";
import {
  runYield,
  evaluateBonanzas,
  overview,
  runTeamEnergy,
  runCommunity,
  runRankCheck,
} from "../controllers/compensation.controller.js";

const router = Router();

// All compensation routes are admin-only (authenticate + authorize run at mount).
router.post("/run-yield", ...runYield);
router.post("/evaluate-bonanzas", ...evaluateBonanzas);
router.post("/run-team-energy", ...runTeamEnergy);
router.post("/run-community", ...runCommunity);
router.post("/run-rank-check", ...runRankCheck);
router.get("/overview", ...overview);

export default router;