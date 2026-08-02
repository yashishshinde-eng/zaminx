import { Router } from "express";
import { runYield, evaluateBonanzas, overview } from "../controllers/compensation.controller.js";

const router = Router();

// All compensation routes are admin-only (authenticate + authorize run at mount).
router.post("/run-yield", ...runYield);
router.post("/evaluate-bonanzas", ...evaluateBonanzas);
router.get("/overview", ...overview);

export default router;