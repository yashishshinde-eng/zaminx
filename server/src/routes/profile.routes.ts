import { Router } from "express";
import {
  updateProfileHandler,
  updateWalletAddressesHandler,
  changePasswordHandler,
  changeTransactionPasswordHandler,
  updateThemeHandler,
  updateNotificationsHandler,
} from "../controllers/profile.controller.js";

const router = Router();

router.put("/", ...updateProfileHandler);
router.put("/wallet-addresses", ...updateWalletAddressesHandler);
router.put("/password", ...changePasswordHandler);
router.put("/transaction-password", ...changeTransactionPasswordHandler);
router.put("/theme", ...updateThemeHandler);
router.put("/notifications", ...updateNotificationsHandler);

export default router;