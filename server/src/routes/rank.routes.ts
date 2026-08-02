import { Router } from "express";
import { list, detail, create, update, remove } from "../controllers/rank.controller.js";

const router = Router();

// All rank routes are admin-only (authenticate + authorize run at mount).
router.get("/", ...list);
router.post("/", ...create);
router.get("/:id", ...detail);
router.patch("/:id", ...update);
router.delete("/:id", ...remove);

export default router;