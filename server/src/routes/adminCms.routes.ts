import { Router } from "express";
import { listPages, getPage, createPage, updatePage, deletePage } from "../controllers/adminCms.controller.js";

const router = Router();

// `authenticate` + `authorize("admin")` run at the `/admin` mount in
// routes/index.ts, so every route here is already admin-gated. The literal
// `pages` path precedes the `:slug` param routes.
router.get("/pages", ...listPages);
router.post("/pages", ...createPage);
router.get("/pages/:slug", ...getPage);
router.patch("/pages/:slug", ...updatePage);
router.delete("/pages/:slug", ...deletePage);

export default router;