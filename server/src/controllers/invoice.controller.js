import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Deal from "../models/Deal.js";

const isParticipant = (deal, user) =>
  user.role === "admin" ||
  (user.role === "buyer" && String(deal.buyerId) === String(user._id));

const sanitizeInvoiceForBuyer = (invoice) => {
  if (!invoice) return null;
  const value = { ...invoice };
  const total = Number(value.total || 0);
  const quantity = Number(value.items?.[0]?.quantity || 0);
  const unitPrice =
    quantity > 0 ? Math.round((total / quantity) * 100) / 100 : 0;

  const {
    serviceFee: _serviceFee,
    sellerId: _sellerId,
    ...safeInvoice
  } = value;

  return {
    ...safeInvoice,
    sellerId: { company: "Verified Seller" },
    subtotal: total,
    total,
    items: (value.items || []).map((item) => ({
      description: `${item.description || "EPR credit purchase"}`.replace(
        /\s*[—-]\s*EPR credit purchase/i,
        " — EPR credit purchase",
      ),
      quantity: item.quantity,
      unitPrice,
      amount:
        Math.round(Number(item.quantity || 0) * unitPrice * 100) / 100,
    })),
    notes: "Payment record for your EPR Nexus purchase.",
  };
};

export const getInvoiceForDeal = async (req, res) => {
  try {
    const { dealId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(dealId)) return res.status(400).json({ success: false, message: "A valid dealId is required" });
    const deal = await Deal.findById(dealId).lean();
    if (!deal) return res.status(404).json({ success: false, message: "Deal not found", code: "DEAL_NOT_FOUND" });
    if (!isParticipant(deal, req.user)) return res.status(403).json({ success: false, message: "You are not authorized to view this invoice", code: "FORBIDDEN_DEAL" });

    const invoice = await Invoice.findOne({ dealId })
      .populate("buyerId", "name company email phone")
      .populate("sellerId", "name company email phone")
      .lean();

    return res.json({ success: true, invoice: req.user.role === "admin" ? invoice : sanitizeInvoiceForBuyer(invoice) });
  } catch (error) {
    console.error("Get invoice error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoice" });
  }
};
