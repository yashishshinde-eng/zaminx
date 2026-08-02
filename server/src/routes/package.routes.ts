import { Router } from "express";
import { catalog, myPackages, activate } from "../controllers/package.controller.js";

const router = Router();

router.get("/", ...catalog);
router.get("/mine", ...myPackages);
router.post("/activate", ...activate);

export default router;