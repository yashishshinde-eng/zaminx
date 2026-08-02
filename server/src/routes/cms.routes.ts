import { Router } from "express";
import {
  getSiteConfig,
  listPages,
  getPage,
  submitContact,
} from "../controllers/cms.controller.js";
import { contactLimiter } from "../middlewares/rateLimit.js";

const router = Router();

router.get("/site", ...getSiteConfig);
router.get("/pages", ...listPages);
router.get("/pages/:slug", ...getPage);

// Contact form (public, rate-limited).
router.post("/contact", contactLimiter, ...submitContact);

export default router;