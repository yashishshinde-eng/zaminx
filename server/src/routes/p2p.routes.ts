import { Router } from "express";
import { create, list } from "../controllers/p2p.controller.js";

const router = Router();

router.post("/", ...create);
router.get("/", ...list);

export default router;