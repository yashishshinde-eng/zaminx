import { Router } from "express";
import { requireActive } from "../middlewares/auth.js";
import { catalog, myPackages, activate, activateFor, lookupTarget } from "../controllers/package.controller.js";

const router = Router();

router.get("/", ...catalog);
router.get("/mine", ...myPackages);
router.get("/lookup-target", ...lookupTarget);
router.post("/activate", ...activate);
router.post("/activate-for", requireActive, ...activateFor);

export default router;