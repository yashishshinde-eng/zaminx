import { Router } from "express";
import {
  getSiteConfig,
  listPages,
  getPage,
  submitContact,
} from "../controllers/cms.controller.js";

const router = Router();

router.get("/site", ...getSiteConfig);
router.get("/pages", ...listPages);
router.get("/pages/:slug", ...getPage);

// Contact form (public, rate-limited).
router.post("/contact", ...submitContact);

export default router;