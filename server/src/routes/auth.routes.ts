import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { loginLimiter, registerLimiter, refreshLimiter, forgotResetLimiter, verifyLimiter } from "../middlewares/rateLimit.js";
import {
  register,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  reset,
  verifyEmailHandler,
  resendVerificationHandler,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerLimiter, ...register);
router.post("/login", loginLimiter, ...login);
router.post("/refresh", refreshLimiter, ...refresh);
router.post("/logout", ...logout);
router.get("/me", authenticate, ...me);
router.post("/forgot-password", forgotResetLimiter, ...forgotPassword);
router.post("/reset-password", forgotResetLimiter, ...reset);
router.post("/verify-email", verifyLimiter, ...verifyEmailHandler);
router.post("/resend-verification", verifyLimiter, ...resendVerificationHandler);

export default router;