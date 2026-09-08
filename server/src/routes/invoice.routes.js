import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { getInvoiceForDeal } from "../controllers/invoice.controller.js";

const router = express.Router();
router.get("/deal/:dealId", protect, authorize("buyer", "admin"), getInvoiceForDeal);
export default router;
