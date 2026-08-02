import { Router } from "express";
import { myDeposits, depositStatus, nowpaymentsWebhook, devSimulatePayment } from "../controllers/payment.controller.js";

const router = Router();

// Auth-protected (authenticate applied inline in each handler).
router.get("/deposits", ...myDeposits);
router.get("/deposits/:id", ...depositStatus);

// Public IPN webhook (signature-verified; no auth).
router.post("/nowpayments/webhook", ...nowpaymentsWebhook);

// Dev-only sandbox simulate (auth + owner-only; 404 in prod / when live).
router.post("/dev/simulate/:id", ...devSimulatePayment);

export default router;