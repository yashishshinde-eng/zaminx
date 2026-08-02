import { Router } from "express";
import { authorize } from "../middlewares/auth.js";
import { overview } from "../controllers/bonanza.controller.js";
import { adminList, adminDetail, create, update, remove } from "../controllers/bonanza.controller.js";

const router = Router();

// --- User root route (authenticate runs at the mount). ---
router.get("/", ...overview);

// --- Admin routes (literal "admin" MUST precede the ":id" param route). ---
//     `authorize("admin")` gates the sub-tree. ---
router.use("/admin", authorize("admin"));
router.get("/admin", ...adminList);
router.post("/admin", ...create);
router.get("/admin/:id", ...adminDetail);
router.patch("/admin/:id", ...update);
router.delete("/admin/:id", ...remove);

export default router;