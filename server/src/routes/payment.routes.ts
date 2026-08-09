import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { depositLimiter } from "../middlewares/rateLimit.js";
import { myDeposits, depositStatus, createDeposit, nowpaymentsWebhook, devSimulatePayment } from "../controllers/payment.controller.js";

const router = Router();

// Public IPN webhook (signature-verified; no auth). MUST stay mounted before
// `router.use(authenticate)` so it remains reachable.
router.post("/nowpayments/webhook", ...nowpaymentsWebhook);

// Everything else under /payments is user-authenticated. Mounting
// `authenticate` here (rather than inline per handler) means any future
// /payments route is protected by default instead of silently public.
router.use(authenticate);
router.get("/deposits", ...myDeposits);
router.get("/deposits/:id", ...depositStatus);
// Start a wallet deposit (amount → NOWPayments invoice). Rate-limited because
// each call creates a gateway invoice.
router.post("/deposit", depositLimiter, ...createDeposit);

// Dev-only sandbox simulate (404 in prod / when the live gateway is configured).
router.post("/dev/simulate/:id", ...devSimulatePayment);

export default router;