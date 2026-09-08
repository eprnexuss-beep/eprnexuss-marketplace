import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Dispute from "../models/Dispute.js";
import Deal from "../models/Deal.js";
import Document from "../models/Document.js";
import User from "../models/User.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { createNotifications } from "../services/notification.service.js";

const REASONS = new Set([
  "payment",
  "quantity",
  "quality_or_compliance",
  "delivery_or_transfer",
  "documentation",
  "communication",
  "other",
]);

const ACTIVE_STATUSES = new Set([
  "open",
  "under_review",
  "waiting_buyer",
  "waiting_seller",
  "escalated",
]);

const populateDispute = (query) =>
  query
    .populate("dealId", "status paymentStatus quantity agreedPrice finalAmount listingId")
    .populate("buyerId", "name company email")
    .populate("sellerId", "name company email")
    .populate("openedBy", "name company role")
    .populate("resolvedBy", "name company role")
    .populate("lastRespondedBy", "name company role")
    .populate("evidence.addedBy", "name company role")
    .populate("evidence.documentId", "fileName type verificationStatus");

const canAccess = (dispute, user) =>
  user.role === "admin" ||
  String(dispute.buyerId) === String(user._id) ||
  String(dispute.sellerId) === String(user._id);

const saveDisputeEvidenceFile = async (file, ownerId) => {
  if (!file) return null;
  const uploadDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../uploads/documents",
  );
  await fs.promises.mkdir(uploadDirectory, { recursive: true });
  const extensionByMimeType = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
  };
  const extension = extensionByMimeType[file.mimetype] || ".bin";
  const filename = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, filename);
  await fs.promises.writeFile(filePath, file.buffer);
  const document = await Document.create({
    owner: ownerId,
    type: "other",
    fileName: file.originalname,
    fileUrl: `/uploads/documents/${filename}`,
    mimeType: file.mimetype,
    fileSize: file.size,
    verificationStatus: "approved",
  });
  return { document, filePath };
};

export const getDisputes = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "buyer") filter.buyerId = req.user._id;
    if (req.user.role === "seller") filter.sellerId = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const disputes = await populateDispute(
      Dispute.find(filter).sort({ createdAt: -1 }).limit(100),
    );

    return res.json({ success: true, count: disputes.length, disputes });
  } catch (error) {
    console.error("Get disputes error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch disputes" });
  }
};

export const getDisputeById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.disputeId)) {
      return res.status(400).json({ success: false, message: "Invalid dispute ID", code: "INVALID_DISPUTE_ID" });
    }
    const dispute = await populateDispute(Dispute.findById(req.params.disputeId));
    if (!dispute) return res.status(404).json({ success: false, message: "Dispute not found", code: "DISPUTE_NOT_FOUND" });
    if (!canAccess(dispute, req.user)) return res.status(403).json({ success: false, message: "You are not authorized to access this dispute", code: "FORBIDDEN_DISPUTE" });
    return res.json({ success: true, dispute });
  } catch (error) {
    console.error("Get dispute error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dispute" });
  }
};

export const getDealDispute = async (req, res) => {
  try {
    const { dealId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dealId)) {
      return res.status(400).json({ success: false, message: "Invalid deal ID", code: "INVALID_DEAL_ID" });
    }
    const deal = await Deal.findById(dealId).lean();
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found", code: "DEAL_NOT_FOUND" });
    if (
      req.user.role !== "admin" &&
      String(deal.buyerId) !== String(req.user._id) &&
      String(deal.sellerId) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this deal", code: "FORBIDDEN_DEAL" });
    }
    const dispute = await populateDispute(Dispute.findOne({ dealId }).sort({ createdAt: -1 }));
    return res.json({ success: true, dispute: dispute || null });
  } catch (error) {
    console.error("Get deal dispute error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch deal dispute" });
  }
};

export const createDispute = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { reason, description, evidenceNote = "", documentId = null } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(dealId)) return res.status(400).json({ success: false, message: "Invalid deal ID", code: "INVALID_DEAL_ID" });
    if (req.user.role === "admin") return res.status(403).json({ success: false, message: "Admins manage disputes instead of opening them", code: "ADMIN_CANNOT_OPEN_DISPUTE" });
    if (!REASONS.has(reason)) return res.status(400).json({ success: false, message: "Select a valid dispute reason", code: "INVALID_DISPUTE_REASON" });
    if (!description?.trim() || description.trim().length < 20) return res.status(400).json({ success: false, message: "Please provide at least 20 characters describing the issue", code: "DISPUTE_DESCRIPTION_TOO_SHORT" });

    const deal = await Deal.findById(dealId);
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found", code: "DEAL_NOT_FOUND" });
    const isParticipant = String(deal.buyerId) === String(req.user._id) || String(deal.sellerId) === String(req.user._id);
    if (!isParticipant) return res.status(403).json({ success: false, message: "You are not a participant in this deal", code: "FORBIDDEN_DEAL" });
    if (deal.status === "cancelled") return res.status(409).json({ success: false, message: "Cancelled deals cannot have new disputes", code: "DEAL_CANCELLED" });

    const existing = await Dispute.findOne({ dealId, status: { $in: [...ACTIVE_STATUSES] } });
    if (existing) return res.status(409).json({ success: false, message: "This deal already has an active dispute", code: "ACTIVE_DISPUTE_EXISTS", disputeId: existing._id });

    let evidence = [];
    let uploadedEvidence = null;
    if (req.file) {
      uploadedEvidence = await saveDisputeEvidenceFile(req.file, req.user._id);
    }
    const attachedDocumentId = uploadedEvidence?.document?._id || documentId || null;
    if (evidenceNote?.trim() || attachedDocumentId) {
      if (attachedDocumentId && !uploadedEvidence) {
        if (!mongoose.Types.ObjectId.isValid(attachedDocumentId)) return res.status(400).json({ success: false, message: "Invalid evidence document ID", code: "INVALID_DOCUMENT_ID" });
        const document = await Document.findOne({ _id: attachedDocumentId, owner: req.user._id }).lean();
        if (!document) return res.status(403).json({ success: false, message: "You can only attach your own documents", code: "FORBIDDEN_DOCUMENT" });
      }
      evidence = [{ note: String(evidenceNote || "").trim(), documentId: attachedDocumentId, addedBy: req.user._id }];
    }

    const dispute = await Dispute.create({
      dealId,
      buyerId: deal.buyerId,
      sellerId: deal.sellerId,
      openedBy: req.user._id,
      openedByRole: req.user.role,
      reason,
      description: description.trim(),
      evidence,
      status: "open",
    });

    await createActivityLog({
      actorId: req.user._id,
      action: "dispute_opened",
      entityType: "deal",
      entityId: deal._id,
      before: { dispute: null },
      after: { disputeId: dispute._id, status: dispute.status, reason },
      metadata: { disputeId: dispute._id, dealId: deal._id },
    });

    const recipient = String(deal.buyerId) === String(req.user._id) ? deal.sellerId : deal.buyerId;
    const admins = await User.find({ role: "admin", isActive: true }).select("_id").lean();
    await createNotifications({
      recipients: [recipient, ...admins.map((admin) => admin._id)],
      actor: req.user._id,
      type: "dispute_opened",
      title: "Dispute opened",
      message: `A dispute has been opened for your EPR Nexus deal. Reason: ${reason.replaceAll("_", " ")}.`,
      entityType: "deal",
      entityId: deal._id,
      metadata: { disputeId: dispute._id, reason },
    });

    const populated = await populateDispute(Dispute.findById(dispute._id));
    return res.status(201).json({ success: true, message: "Dispute opened successfully", dispute: populated });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "This deal already has an active dispute", code: "ACTIVE_DISPUTE_EXISTS" });
    console.error("Create dispute error:", error);
    return res.status(500).json({ success: false, message: "Failed to open dispute" });
  }
};

export const respondToDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { message, evidenceNote = "", documentId = null } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(disputeId)) return res.status(400).json({ success: false, message: "Invalid dispute ID", code: "INVALID_DISPUTE_ID" });
    if (req.user.role === "admin") return res.status(400).json({ success: false, message: "Use the admin status action to manage a dispute", code: "USE_ADMIN_STATUS_ACTION" });
    if (!message?.trim() || message.trim().length < 10) return res.status(400).json({ success: false, message: "Please provide at least 10 characters", code: "RESPONSE_TOO_SHORT" });

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ success: false, message: "Dispute not found", code: "DISPUTE_NOT_FOUND" });
    if (!canAccess(dispute, req.user)) return res.status(403).json({ success: false, message: "You are not authorized to respond to this dispute", code: "FORBIDDEN_DISPUTE" });
    if (!ACTIVE_STATUSES.has(dispute.status)) return res.status(409).json({ success: false, message: "This dispute is closed", code: "DISPUTE_CLOSED" });

    const expectedStatus = req.user.role === "buyer" ? "waiting_buyer" : "waiting_seller";
    if (!["open", "under_review", "escalated", expectedStatus].includes(dispute.status)) {
      return res.status(409).json({ success: false, message: "It is not currently your turn to respond", code: "NOT_YOUR_TURN" });
    }

    let uploadedEvidence = null;
    if (req.file) {
      uploadedEvidence = await saveDisputeEvidenceFile(req.file, req.user._id);
    }
    const attachedDocumentId = uploadedEvidence?.document?._id || documentId || null;
    if (attachedDocumentId && !uploadedEvidence) {
      if (!mongoose.Types.ObjectId.isValid(attachedDocumentId)) return res.status(400).json({ success: false, message: "Invalid evidence document ID", code: "INVALID_DOCUMENT_ID" });
      const document = await Document.findOne({ _id: attachedDocumentId, owner: req.user._id }).lean();
      if (!document) return res.status(403).json({ success: false, message: "You can only attach your own documents", code: "FORBIDDEN_DOCUMENT" });
    }

    dispute.evidence.push({ note: String(evidenceNote || "").trim() || message.trim(), documentId: attachedDocumentId, addedBy: req.user._id });
    dispute.lastRespondedBy = req.user._id;
    dispute.lastRespondedAt = new Date();
    dispute.status = "under_review";
    await dispute.save();

    await createActivityLog({ actorId: req.user._id, action: "dispute_response_added", entityType: "deal", entityId: dispute.dealId, before: { status: "waiting" }, after: { status: dispute.status }, metadata: { disputeId: dispute._id, message: message.trim() } });

    const recipient = req.user.role === "buyer" ? dispute.sellerId : dispute.buyerId;
    await createNotifications({ recipients: [recipient], actor: req.user._id, type: "dispute_updated", title: "Dispute updated", message: "A participant added a response to an EPR Nexus dispute.", entityType: "deal", entityId: dispute.dealId, metadata: { disputeId: dispute._id } });

    const populated = await populateDispute(Dispute.findById(dispute._id));
    return res.json({ success: true, message: "Dispute response added", dispute: populated });
  } catch (error) {
    console.error("Respond dispute error:", error);
    return res.status(500).json({ success: false, message: "Failed to update dispute" });
  }
};

export const updateDisputeStatus = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, resolution = "" } = req.body || {};
    const allowed = ["under_review", "waiting_buyer", "waiting_seller", "escalated", "resolved", "rejected"];
    if (!mongoose.Types.ObjectId.isValid(disputeId)) return res.status(400).json({ success: false, message: "Invalid dispute ID", code: "INVALID_DISPUTE_ID" });
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid dispute status", code: "INVALID_DISPUTE_STATUS" });
    if (["resolved", "rejected"].includes(status) && !resolution?.trim()) return res.status(400).json({ success: false, message: "Resolution notes are required when closing a dispute", code: "RESOLUTION_REQUIRED" });

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ success: false, message: "Dispute not found", code: "DISPUTE_NOT_FOUND" });
    if (["resolved", "rejected"].includes(dispute.status)) return res.status(409).json({ success: false, message: "This dispute is already closed", code: "DISPUTE_ALREADY_CLOSED" });

    const previousStatus = dispute.status;
    dispute.status = status;
    dispute.resolution = resolution.trim();
    if (["resolved", "rejected"].includes(status)) {
      dispute.resolvedBy = req.user._id;
      dispute.resolvedAt = new Date();
    }
    await dispute.save();

    await createActivityLog({ actorId: req.user._id, action: "dispute_status_changed", entityType: "deal", entityId: dispute.dealId, before: { status: previousStatus }, after: { status, resolution: dispute.resolution }, metadata: { disputeId: dispute._id } });
    await createNotifications({ recipients: [dispute.buyerId, dispute.sellerId], actor: req.user._id, type: "dispute_updated", title: ["resolved", "rejected"].includes(status) ? "Dispute closed" : "Dispute status updated", message: ["resolved", "rejected"].includes(status) ? `Your dispute has been ${status}.` : `Your dispute is now ${status.replaceAll("_", " ")}.`, entityType: "deal", entityId: dispute.dealId, metadata: { disputeId: dispute._id, status } });

    const populated = await populateDispute(Dispute.findById(dispute._id));
    return res.json({ success: true, message: "Dispute status updated", dispute: populated });
  } catch (error) {
    console.error("Update dispute status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update dispute status" });
  }
};


export const downloadDisputeEvidence = async (req, res) => {
  try {
    const { disputeId, documentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(disputeId) || !mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ success: false, message: "Invalid dispute or document ID" });
    }

    const dispute = await Dispute.findById(disputeId).select("buyerId sellerId evidence");
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    const canAccess =
      req.user.role === "admin" ||
      String(dispute.buyerId) === String(req.user._id) ||
      String(dispute.sellerId) === String(req.user._id);

    if (!canAccess) {
      return res.status(403).json({ success: false, message: "You are not authorized to access this evidence" });
    }

    const attached = dispute.evidence.some(
      (entry) => String(entry.documentId || "") === String(documentId),
    );

    if (!attached) {
      return res.status(404).json({ success: false, message: "Evidence document not found in this dispute" });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads/documents");
    const requestedPath = path.resolve(uploadsRoot, path.basename(document.fileUrl || ""));

    if (!requestedPath.startsWith(`${uploadsRoot}${path.sep}`)) {
      return res.status(400).json({ success: false, message: "Invalid document path" });
    }

    if (!fs.existsSync(requestedPath)) {
      return res.status(404).json({ success: false, message: "Evidence file is no longer available" });
    }

    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${String(document.fileName || "evidence").replace(/[\"\r\n]/g, "_")}"`);
    res.setHeader("Cache-Control", "private, no-store");

    return res.sendFile(requestedPath);
  } catch (error) {
    console.error("Dispute evidence download error:", error);
    return res.status(500).json({ success: false, message: "Failed to download evidence" });
  }
};
