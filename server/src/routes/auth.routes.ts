import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/rateLimit.js";
import {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  reset,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", authLimiter, ...register);
router.post("/login", authLimiter, ...login);
router.post("/refresh", authLimiter, ...refresh);
router.post("/logout", ...logout);
router.get("/me", authenticate, ...me);
router.post("/forgot-password", authLimiter, ...forgotPassword);
router.post("/reset-password", authLimiter, ...reset);

export default router;