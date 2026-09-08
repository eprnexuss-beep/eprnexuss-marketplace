import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { uploadDisputeEvidence } from "../middleware/upload.middleware.js";
import {
  getDisputes,
  getDisputeById,
  getDealDispute,
  createDispute,
  respondToDispute,
  updateDisputeStatus,
  downloadDisputeEvidence,
} from "../controllers/dispute.controller.js";

const router = express.Router();

router.get("/", protect, authorize("buyer", "seller", "admin"), getDisputes);
router.get("/deal/:dealId", protect, authorize("buyer", "seller", "admin"), getDealDispute);
router.get("/:disputeId", protect, authorize("buyer", "seller", "admin"), getDisputeById);
router.get("/:disputeId/evidence/:documentId/download", protect, authorize("buyer", "seller", "admin"), downloadDisputeEvidence);
router.post("/deal/:dealId", protect, authorize("buyer", "seller"), uploadDisputeEvidence.single("evidence"), createDispute);
router.patch("/:disputeId/respond", protect, authorize("buyer", "seller"), uploadDisputeEvidence.single("evidence"), respondToDispute);
router.patch("/:disputeId/status", protect, authorize("admin"), updateDisputeStatus);

export default router;
