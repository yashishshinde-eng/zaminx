import { Router } from "express";
import { balances, ledger } from "../controllers/wallet.controller.js";

const router = Router();

router.get("/", ...balances);
router.get("/ledger", ...ledger);

export default router;