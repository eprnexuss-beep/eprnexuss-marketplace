import mongoose from "mongoose";

import PurchaseRequest from "../models/PurchaseRequest.js";
import SellerListing from "../models/SellerListing.js";
import Deal from "../models/Deal.js";
import {
  createNotification,
  notifyDealStatusChange,
} from "../services/notification.service.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { sendTransactionEmail } from "../services/email.service.js";
import { CLIENT_URL } from "../config/env.js";

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

// Buyer-facing listing price. Sellers keep seeing the internal base price.
// The admin-selected publication margin is stored on the listing and can be
// either a percentage or a fixed INR value per unit.
const DEFAULT_PUBLIC_MARKUP_RATE = 10;
const publicPrice = (listing) => {
  const base = Number(listing?.price || 0);
  const marginType = listing?.publicMarginType;
  const marginValue = Number(listing?.publicMarginValue);

  if (
    marginType === "value" &&
    Number.isFinite(marginValue) &&
    marginValue >= 0
  ) {
    return roundMoney(base + marginValue);
  }

  const rate = Number.isFinite(Number(listing?.publicMarkupRate))
    ? Number(listing.publicMarkupRate)
    : marginType === "percentage" && Number.isFinite(marginValue)
      ? marginValue
      : DEFAULT_PUBLIC_MARKUP_RATE;

  return roundMoney(base * (1 + Math.max(0, rate) / 100));
};

const parsePositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};

const parseNonNegativeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

const buildOffer = ({
  quantity,
  sellerPricePerUnit,
  marginType = "percentage",
  marginValue = 10,
  // Legacy percentage field is retained for older clients/data.
  marginRate = 10,
  note = "",
  version,
  issuedBy,
  expiresAt = null,
  sentAt = new Date(),
}) => {
  const sellerPrice = parsePositiveNumber(sellerPricePerUnit);
  const qty = parsePositiveNumber(quantity);
  const normalizedType = marginType === "value" ? "value" : "percentage";
  const rawMarginValue = Number(marginValue);
  const fallbackRate = Number(marginRate);
  const effectiveMarginValue = Number.isFinite(rawMarginValue) && rawMarginValue >= 0
    ? rawMarginValue
    : Number.isFinite(fallbackRate) && fallbackRate >= 0
      ? fallbackRate
      : 0;

  if (
    !qty ||
    sellerPrice === null ||
    !Number.isFinite(effectiveMarginValue) ||
    effectiveMarginValue < 0 ||
    (normalizedType === "percentage" && effectiveMarginValue > 100)
  ) {
    return null;
  }

  const sellerSubtotal = roundMoney(qty * sellerPrice);
  const marginAmount =
    normalizedType === "value"
      ? roundMoney(qty * effectiveMarginValue)
      : roundMoney(sellerSubtotal * (effectiveMarginValue / 100));

  const buyerPricePerUnit =
    normalizedType === "value"
      ? roundMoney(sellerPrice + effectiveMarginValue)
      : roundMoney(sellerPrice * (1 + effectiveMarginValue / 100));

  const buyerSubtotal = roundMoney(qty * buyerPricePerUnit);

  // Keep marginRate populated for backward compatibility. For fixed margins,
  // store the equivalent percentage for legacy consumers while marginType and
  // marginValue remain the authoritative quotation fields.
  const equivalentMarginRate =
    sellerPrice > 0
      ? roundMoney((effectiveMarginValue / sellerPrice) * 100)
      : 0;

  return {
    version,
    creditPricePerUnit: buyerPricePerUnit,
    creditSubtotal: buyerSubtotal,
    serviceFee: marginAmount,
    sellerPricePerUnit: roundMoney(sellerPrice),
    sellerSubtotal,
    marginRate:
      normalizedType === "percentage"
        ? roundMoney(effectiveMarginValue)
        : equivalentMarginRate,
    marginType: normalizedType,
    marginValue: roundMoney(effectiveMarginValue),
    marginAmount,
    buyerPricePerUnit,
    buyerSubtotal,
    finalAmount: buyerSubtotal,
    currency: "INR",
    sentAt,
    expiresAt,
    lastUpdatedBy: issuedBy,
    note: String(note || "").trim(),
    status: "sent",
  };
};

export const createPurchaseRequest = async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({
        success: false,
        message: "Only buyers can create purchase requests",
        code: "BUYER_ONLY",
      });
    }

    const {
      listingId,
      quantity,
      contactPerson,
      companyName,
      email,
      gstNumber,
      phone,
      notes,
    } = req.body || {};

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid listingId is required",
      });
    }

    const listing = await SellerListing.findOne({
      _id: listingId,
      status: "active",
      validTill: { $gte: new Date() },
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "This credit listing is no longer available",
      });
    }

    const parsedQuantity = parsePositiveNumber(quantity);

    if (!parsedQuantity) {
      return res.status(400).json({
        success: false,
        message: "Requested quantity must be a valid positive number",
      });
    }

    const availableQuantity =
      Number(listing.quantity || 0) - Number(listing.reservedQuantity || 0);

    if (parsedQuantity > availableQuantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${Math.max(0, availableQuantity)} MT is currently available`,
      });
    }

    const requiredFields = {
      contactPerson,
      companyName,
      email,
      gstNumber,
      phone,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!String(value || "").trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const purchaseRequest = await PurchaseRequest.create({
      buyerId: req.user._id,
      listingId: listing._id,
      quantity: parsedQuantity,
      contactPerson: contactPerson.trim(),
      companyName: companyName.trim(),
      email: email.trim().toLowerCase(),
      gstNumber: gstNumber.trim(),
      phone: phone.trim(),
      notes: String(notes || "").trim(),
      status: "pending",
    });

    const admin = await (await import("../models/User.js")).default
      .findOne({ role: "admin", isActive: true })
      .select("_id")
      .lean();

    if (admin?._id) {
      await createNotification({
        recipient: admin._id,
        actor: req.user._id,
        type: "purchase_request_created",
        title: "New buyer credit request",
        message: `A buyer requested ${parsedQuantity} MT of ${listing.category || "EPR credits"}.`,
        entityType: "request",
        entityId: purchaseRequest._id,
        metadata: {
          quantity: parsedQuantity,
          category: listing.category,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Purchase request submitted successfully",
      request: purchaseRequest,
    });
  } catch (error) {
    console.error("Create purchase request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit purchase request",
    });
  }
};

export const getAdminPurchaseRequests = async (req, res) => {
  try {
    const requests = await PurchaseRequest.find()
      .populate("buyerId", "name company email phone role")
      .populate({
        path: "listingId",
        select:
          "category quantity totalQuantity price publicMarkupRate publicMarginType publicMarginValue location complianceYear validTill reservedQuantity sellerId",
        populate: {
          path: "sellerId",
          select: "name company email phone",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Include the current deal state so admin quotation views cannot show a
    // stale payment status after a deal has moved to completion.
    const requestIds = requests.map((request) => request._id);
    const deals = requestIds.length
      ? await Deal.find({ requestId: { $in: requestIds } })
          .select("_id requestId status paymentStatus completedAt createdAt")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    const dealByRequestId = new Map();
    for (const deal of deals) {
      const key = String(deal.requestId);
      if (!dealByRequestId.has(key)) {
        dealByRequestId.set(key, deal);
      }
    }

    const requestsWithDeal = requests.map((request) => ({
      ...request,
      deal: dealByRequestId.get(String(request._id)) || null,
    }));

    return res.status(200).json({
      success: true,
      count: requestsWithDeal.length,
      requests: requestsWithDeal,
    });
  } catch (error) {
    console.error("Get admin purchase requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch purchase requests",
    });
  }
};

/*
 * ADMIN: create or revise the current quotation.
 *
 * Buyers never provide commercial terms here.
 * Every revision creates a new immutable history version.
 */
export const issuePurchaseRequestOffer = async (req, res) => {
  try {
    const { requestId } = req.params;
    const {
      sellerPricePerUnit,
      marginType = "percentage",
      marginValue,
      marginRate = 10,
      // Legacy fields are accepted only for older admin clients.
      creditPricePerUnit,
      serviceFee,
      commissionAmount,
      expiresAt,
      note = "",
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "A valid requestId is required",
      });
    }

    const request = await PurchaseRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    const listingForQuotation = await SellerListing.findById(request.listingId)
      .select("price publicMarkupRate publicMarginType publicMarginValue")
      .lean();

    if (!listingForQuotation) {
      return res.status(404).json({
        success: false,
        message: "Listing associated with this request was not found",
      });
    }

    const existingDeal = await Deal.findOne({ requestId: request._id }).select("_id status quotationVersion").lean();

    if (existingDeal) {
      return res.status(409).json({
        success: false,
        message: "This request already has a deal. A new quotation cannot be issued.",
        code: "DEAL_ALREADY_EXISTS",
        dealId: existingDeal._id,
      });
    }

    if (["completed", "cancelled", "rejected"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `A quotation cannot be issued for a ${request.status} request`,
        code: "REQUEST_NOT_QUOTABLE",
      });
    }

    const sellerPriceInput =
      sellerPricePerUnit !== undefined ? sellerPricePerUnit : creditPricePerUnit;
    const sellerPrice = parsePositiveNumber(sellerPriceInput);
    const listingMarginType =
      listingForQuotation.publicMarginType === "value"
        ? "value"
        : "percentage";
    const listingMarginValue = Number(
      listingForQuotation.publicMarginValue ??
        listingForQuotation.publicMarkupRate ??
        10,
    );
    const normalizedMarginType =
      marginValue === undefined && marginRate === 10 && marginType === "percentage"
        ? listingMarginType
        : marginType === "value"
          ? "value"
          : "percentage";
    const suppliedMarginValue =
      marginValue !== undefined
        ? marginValue
        : marginRate !== 10 || normalizedMarginType !== listingMarginType
          ? marginRate
          : listingMarginValue;
    const parsedMarginValue = parseNonNegativeNumber(suppliedMarginValue);

    if (sellerPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Seller credit price must be a valid positive number",
        code: "INVALID_SELLER_CREDIT_PRICE",
      });
    }

    if (
      parsedMarginValue === null ||
      (normalizedMarginType === "percentage" && parsedMarginValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message:
          normalizedMarginType === "percentage"
            ? "Percentage margin must be between 0% and 100%"
            : "Value margin must be zero or greater",
        code: "INVALID_MARGIN_VALUE",
      });
    }

    let parsedExpiry = null;
    if (expiresAt) {
      parsedExpiry = new Date(expiresAt);
      if (
        Number.isNaN(parsedExpiry.getTime()) ||
        parsedExpiry.getTime() <= Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Quotation expiry must be a valid future date",
          code: "INVALID_QUOTATION_EXPIRY",
        });
      }
    }

    const nextVersion =
      Math.max(
        Number(request.offer?.version || 0),
        ...(request.offerHistory || []).map((item) =>
          Number(item.version || 0),
        ),
      ) + 1;

    const now = new Date();

    if (request.offer && request.offer.version > 0) {
      const previousHistory = request.offerHistory.find(
        (item) => Number(item.version) === Number(request.offer.version),
      );

      if (previousHistory && previousHistory.status === "sent") {
        previousHistory.status = "superseded";
      }

      if (request.offer.status === "sent" || request.offer.status === "draft") {
        request.offer.status = "superseded";
      }
    }

    const offer = buildOffer({
      quantity: request.quantity,
      sellerPricePerUnit: sellerPrice,
      marginType: normalizedMarginType,
      marginValue: parsedMarginValue,
      marginRate:
        normalizedMarginType === "percentage"
          ? parsedMarginValue
          : sellerPrice > 0
            ? (parsedMarginValue / sellerPrice) * 100
            : 0,
      version: nextVersion,
      note,
      issuedBy: req.user._id,
      expiresAt: parsedExpiry,
      sentAt: now,
    });

    request.offer = offer;

    request.offerHistory.push({
      version: offer.version,
      creditPricePerUnit: offer.creditPricePerUnit,
      creditSubtotal: offer.creditSubtotal,
      serviceFee: offer.serviceFee,
      sellerPricePerUnit: offer.sellerPricePerUnit,
      sellerSubtotal: offer.sellerSubtotal,
      marginRate: offer.marginRate,
      marginType: offer.marginType,
      marginValue: offer.marginValue,
      marginAmount: offer.marginAmount,
      buyerPricePerUnit: offer.buyerPricePerUnit,
      buyerSubtotal: offer.buyerSubtotal,
      finalAmount: offer.finalAmount,
      currency: offer.currency,
      sentAt: offer.sentAt,
      expiresAt: offer.expiresAt,
      note: offer.note,
      issuedBy: req.user._id,
      acceptedAt: null,
      status: "sent",
    });

    request.status = "offer_sent";
    request.rejectionReason = "";
    await request.save();

    await createActivityLog({
      actorId: req.user._id,
      action: "purchase_request_offer_issued",
      entityType: "purchase_request",
      entityId: request._id,
      before: {
        offerVersion:
          request.offerHistory.length > 1
            ? request.offerHistory[request.offerHistory.length - 2]?.version ||
              null
            : null,
      },
      after: {
        offerVersion: offer.version,
        creditPricePerUnit: offer.creditPricePerUnit,
        creditSubtotal: offer.creditSubtotal,
        serviceFee: offer.serviceFee,
        finalAmount: offer.finalAmount,
      },
      metadata: {
        quantity: request.quantity,
        note: offer.note,
      },
    });

    await createNotification({
      recipient: request.buyerId,
      actor: req.user._id,
      type: "quotation_sent",
      title: `Quotation #${offer.version} is ready`,
      message: `EPR Nexus sent quotation #${offer.version}. Total amount: ₹${offer.finalAmount.toLocaleString("en-IN")}.`,
      entityType: "request",
      entityId: request._id,
      metadata: {
        quotationVersion: offer.version,
        finalAmount: offer.finalAmount,
      },
    });

    // Email is best-effort and must never make a successfully issued quotation fail.
    try {
      await sendTransactionEmail({
        to: request.email,
        subject:
          offer.version === 1
            ? "Your EPR Nexus quotation is ready"
            : `Your EPR Nexus quotation #${offer.version} has been revised`,
        title:
          offer.version === 1
            ? "Your quotation is ready"
            : `Quotation #${offer.version} is ready`,
        message:
          `EPR Nexus has issued quotation #${offer.version} for ${request.quantity} MT. ` +
          `Total payable amount: ₹${offer.finalAmount.toLocaleString("en-IN")}.`,
        actionText: "Review quotation",
        actionUrl: `${CLIENT_URL}/buyer?section=quotations`,
      });
    } catch (emailError) {
      console.error(
        "Quotation email delivery failed:",
        emailError?.message || emailError,
      );
    }

    return res.status(200).json({
      success: true,
      message:
        offer.version === 1
          ? "Quotation sent successfully"
          : `Quotation #${offer.version} sent successfully`,
      request,
      offer,
    });
  } catch (error) {
    console.error("Issue purchase request offer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to issue quotation",
    });
  }
};

/*
 * BUYER: accept the currently sent quotation.
 *
 * Acceptance locks the exact commercial terms and creates the deal in
 * payment_coordination. It does NOT mean payment has been received.
 */
export const acceptPurchaseRequestOffer = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "A valid requestId is required",
      });
    }

    const request = await PurchaseRequest.findOne({
      _id: requestId,
      buyerId: req.user._id,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    const existingDeal = await Deal.findOne({ requestId: request._id }).select("_id status quotationVersion").lean();

    if (existingDeal) {
      return res.status(409).json({
        success: false,
        message: "A deal already exists for this request. This quotation is no longer actionable.",
        deal: existingDeal,
        code: "DEAL_ALREADY_EXISTS",
      });
    }

    if (["completed", "cancelled", "rejected"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `This request is already ${request.status}`,
        code: "REQUEST_NOT_ACCEPTABLE",
      });
    }

    const offer = request.offer;

    if (
      request.status !== "offer_sent" ||
      !offer ||
      !offer.version ||
      offer.finalAmount == null
    ) {
      return res.status(409).json({
        success: false,
        message: "There is no active quotation available to accept",
        code: "NO_ACTIVE_QUOTATION",
      });
    }
    if (offer.expiresAt && new Date(offer.expiresAt).getTime() <= Date.now()) {
      offer.status = "expired";

      const historyItem = request.offerHistory.find(
        (item) => Number(item.version) === Number(offer.version),
      );
      if (historyItem) historyItem.status = "expired";

      await request.save();

      return res.status(409).json({
        success: false,
        message:
          "This quotation has expired. Please wait for a revised quotation.",
        code: "QUOTATION_EXPIRED",
      });
    }

    const quantity = parsePositiveNumber(request.quantity);
    const agreedPrice = parsePositiveNumber(
      offer.sellerPricePerUnit ?? offer.creditPricePerUnit,
    );

    const normalizedMarginType =
      offer.marginType === "value" ? "value" : "percentage";
    const storedMarginValue = Number(
      offer.marginValue ??
        offer.marginRate ??
        0,
    );
    const legacyMarginRate =
      offer.marginType == null &&
      offer.sellerPricePerUnit == null &&
      offer.buyerPricePerUnit == null &&
      Number(offer.creditPricePerUnit || 0) > 0
        ? (Number(offer.serviceFee || 0) /
            (Number(offer.creditPricePerUnit) * quantity)) *
          100
        : null;

    const effectiveMarginValue =
      legacyMarginRate != null ? legacyMarginRate : storedMarginValue;

    if (
      !quantity ||
      agreedPrice === null ||
      !Number.isFinite(effectiveMarginValue) ||
      effectiveMarginValue < 0 ||
      (normalizedMarginType === "percentage" && effectiveMarginValue > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "The quotation contains invalid commercial terms",
        code: "INVALID_QUOTATION_TERMS",
      });
    }

    const marginRate =
      normalizedMarginType === "percentage"
        ? effectiveMarginValue
        : agreedPrice > 0
          ? (effectiveMarginValue / agreedPrice) * 100
          : 0;

    const calculatedMarginAmount =
      normalizedMarginType === "value"
        ? roundMoney(quantity * effectiveMarginValue)
        : roundMoney(
            quantity *
              agreedPrice *
              (effectiveMarginValue / 100),
          );

    const commissionAmount = parseNonNegativeNumber(
      offer.marginAmount ?? offer.serviceFee ?? calculatedMarginAmount,
    );

    if (commissionAmount === null) {
      return res.status(400).json({
        success: false,
        message: "The quotation contains invalid commercial terms",
        code: "INVALID_QUOTATION_TERMS",
      });
    }

    const listing = await SellerListing.findOneAndUpdate(
      {
        _id: request.listingId,
        status: "active",
        validTill: { $gte: new Date() },
        $expr: {
          $gte: [
            {
              $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }],
            },
            quantity,
          ],
        },
      },
      {
        $inc: {
          reservedQuantity: quantity,
        },
      },
      { new: true },
    );

    if (!listing) {
      return res.status(409).json({
        success: false,
        message:
          "The requested inventory is no longer available at the time of quotation acceptance",
        code: "INSUFFICIENT_INVENTORY",
      });
    }

    const sellerSubtotal = roundMoney(quantity * agreedPrice);
    const marginAmount = roundMoney(commissionAmount);
    const buyerPricePerUnit = roundMoney(
      offer.buyerPricePerUnit ??
        (normalizedMarginType === "value"
          ? agreedPrice + effectiveMarginValue
          : agreedPrice * (1 + effectiveMarginValue / 100)),
    );
    const buyerSubtotal = roundMoney(quantity * buyerPricePerUnit);
    const finalAmount = roundMoney(offer.finalAmount ?? buyerSubtotal);
    const acceptedAt = new Date();

    const historyItem = request.offerHistory.find(
      (item) => Number(item.version) === Number(offer.version),
    );

    try {
      const deal = await Deal.create({
        requestId: request._id,
        requirementId: null,
        matchedListingId: listing._id,
        listingId: listing._id,
        buyerId: request.buyerId,
        sellerId: listing.sellerId,
        quantity,
        agreedPrice,
        sellerPricePerUnit: agreedPrice,
        buyerPricePerUnit,
        marginRate: Number(marginRate || 0),
        marginType: normalizedMarginType,
        marginValue: roundMoney(effectiveMarginValue),
        marginAmount,
        commissionRate: Number(marginRate || 0),
        commissionAmount: marginAmount,
        serviceFee: marginAmount,
        sellerSubtotal,
        buyerSubtotal,
        creditSubtotal: sellerSubtotal,
        finalAmount,
        commercialTerms: {
          quantity,
          agreedPrice,
          creditSubtotal: sellerSubtotal,
          commissionAmount: marginAmount,
          finalAmount,
          currency: "INR",
          quotationVersion: offer.version,
          lockedAt: acceptedAt,
        },
        commercialTermsLocked: true,
        commercialTermsLockedAt: acceptedAt,
        quotationVersion: offer.version,
        inventoryReserved: true,
        status: "payment_coordination",
        paymentStatus: "pending",
        notes: `Quotation #${offer.version} accepted by buyer. Commercial terms are locked.`,
      });

      offer.status = "accepted";
      offer.acceptedAt = acceptedAt;

      if (historyItem) {
        historyItem.status = "accepted";
        historyItem.acceptedAt = acceptedAt;
      }

      request.acceptedOfferVersion = offer.version;
      request.acceptedOfferSnapshot = {
        creditPricePerUnit: buyerPricePerUnit,
        creditSubtotal: buyerSubtotal,
        serviceFee: marginAmount,
        sellerPricePerUnit: agreedPrice,
        sellerSubtotal,
        marginRate: Number(marginRate || 0),
        marginType: normalizedMarginType,
        marginValue: roundMoney(effectiveMarginValue),
        marginAmount,
        buyerPricePerUnit,
        buyerSubtotal,
        finalAmount,
        currency: "INR",
        version: offer.version,
        acceptedAt,
      };
      request.status = "offer_accepted";
      await request.save();

      await createActivityLog({
        actorId: req.user._id,
        action: "purchase_request_offer_accepted",
        entityType: "purchase_request",
        entityId: request._id,
        before: {
          status: "offer_sent",
          offerVersion: offer.version,
        },
        after: {
          status: request.status,
          offerVersion: offer.version,
          dealId: deal._id,
        },
        metadata: {
          quantity,
          agreedPrice,
          sellerSubtotal,
          buyerPricePerUnit,
          buyerSubtotal,
          marginRate,
          marginAmount,
          finalAmount,
        },
      });

      await notifyDealStatusChange({
        deal,
        status: deal.status,
        paymentStatus: deal.paymentStatus,
        actor: req.user._id,
      });

      const buyerDeal = {
        _id: deal._id,
        requestId: deal.requestId,
        listing: {
          _id: listing._id,
          category: listing.category,
          quantity: listing.quantity,
          totalQuantity: listing.totalQuantity ?? listing.quantity,
          reservedQuantity: listing.reservedQuantity || 0,
          availableQuantity: Math.max(
            0,
            Number(listing.quantity || 0) -
              Number(listing.reservedQuantity || 0),
          ),
          price: roundMoney(buyerPricePerUnit),
          location: listing.location,
          complianceYear: listing.complianceYear,
          validTill: listing.validTill,
        },
        quantity: deal.quantity,
        agreedPrice: roundMoney(buyerPricePerUnit),
        creditSubtotal: roundMoney(buyerSubtotal),
        finalAmount: roundMoney(finalAmount),
        status: deal.status,
        paymentStatus: deal.paymentStatus,
        inventoryReserved: Boolean(deal.inventoryReserved),
        notes: deal.notes || "",
        createdAt: deal.createdAt,
        completedAt: deal.completedAt || null,
      };

      return res.status(200).json({
        success: true,
        message: `Quotation #${offer.version} accepted. Deal moved to payment coordination.`,
        request: {
          _id: request._id,
          listing: {
            _id: listing._id,
            category: listing.category,
            quantity: listing.quantity,
            totalQuantity: listing.totalQuantity ?? listing.quantity,
            reservedQuantity: listing.reservedQuantity || 0,
            price: roundMoney(buyerPricePerUnit),
            location: listing.location,
            complianceYear: listing.complianceYear,
            validTill: listing.validTill,
          },
          requestedQuantity: request.quantity,
          companyName: request.companyName,
          contactPerson: request.contactPerson,
          notes: request.notes || "",
          status: request.status,
          rejectionReason: request.rejectionReason || "",
          offer: {
            version: offer.version,
            creditPricePerUnit: roundMoney(buyerPricePerUnit),
            creditSubtotal: roundMoney(buyerSubtotal),
            finalAmount: roundMoney(finalAmount),
            currency: offer.currency || "INR",
            sentAt: offer.sentAt,
            acceptedAt: offer.acceptedAt,
            expiresAt: offer.expiresAt,
            note: offer.note || "",
            status: offer.status,
          },
          acceptedOfferVersion: request.acceptedOfferVersion || null,
        },
        deal: buyerDeal,
      });
    } catch (error) {
      await SellerListing.updateOne(
        { _id: listing._id },
        { $inc: { reservedQuantity: -quantity } },
      );
      throw error;
    }
  } catch (error) {
    console.error("Accept purchase request offer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept quotation",
    });
  }
};

export const reviewPurchaseRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body || {};

    const allowedStatuses = [
      "reviewing",
      "matched",
      "negotiating",
      "approved",
      "rejected",
      "cancelled",
    ];

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: "A valid requestId is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status",
      });
    }

    if (status === "rejected" && !String(rejectionReason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const request = await PurchaseRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Purchase request not found",
      });
    }

    if (["completed", "cancelled"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `A ${request.status} request cannot be changed`,
        code: "REQUEST_TERMINAL",
      });
    }

    /*
     * Approval no longer creates a deal.
     * Admin approval means the request is commercially ready for a quotation.
     * The deal is created only after the buyer accepts a quotation.
     */
    if (
      status === "approved" &&
      (!request.offer || request.offer.status !== "sent")
    ) {
      request.status = "approved";
      request.rejectionReason = "";
      await request.save();

      await createActivityLog({
        actorId: req.user._id,
        action: "purchase_request_approved",
        entityType: "purchase_request",
        entityId: request._id,
        before: { status: "reviewing" },
        after: { status: "approved" },
        metadata: {
          buyerId: request.buyerId,
          listingId: request.listingId,
          quantity: request.quantity,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Purchase request approved. Issue a quotation to the buyer.",
        request,
      });
    }

    const previousStatus = request.status;
    const previousRejectionReason = request.rejectionReason || "";

    request.status = status;
    request.rejectionReason =
      status === "rejected" ? String(rejectionReason).trim() : "";

    if (status === "cancelled") {
      request.offer.status =
        request.offer?.status === "sent" ? "cancelled" : request.offer?.status;

      const activeHistory = request.offerHistory.find(
        (item) => item.status === "sent",
      );
      if (activeHistory) activeHistory.status = "cancelled";
    }

    await request.save();

    await createActivityLog({
      actorId: req.user._id,
      action:
        status === "rejected"
          ? "purchase_request_rejected"
          : status === "cancelled"
            ? "purchase_request_cancelled"
            : "purchase_request_updated",
      entityType: "purchase_request",
      entityId: request._id,
      before: {
        status: previousStatus,
        rejectionReason: previousRejectionReason,
      },
      after: {
        status: request.status,
        rejectionReason: request.rejectionReason || "",
      },
      metadata: {
        buyerId: request.buyerId,
        listingId: request.listingId,
        quantity: request.quantity,
        companyName: request.companyName,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Purchase request updated successfully",
      request,
    });
  } catch (error) {
    console.error("Review purchase request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update purchase request",
    });
  }
};

export const getSellerPurchaseRequests = async (req, res) => {
  try {
    const requests = await PurchaseRequest.find()
      .populate("buyerId", "name company")
      .populate({
        path: "listingId",
        match: { sellerId: req.user._id },
        select:
          "category quantity totalQuantity price location complianceYear validTill reservedQuantity sellerId",
      })
      .sort({ createdAt: -1 })
      .lean();

    const sellerRequests = requests
      .filter((request) => request.listingId)
      .map((request) => ({
        _id: request._id,
        buyer: { company: "Verified Buyer" },
        listing: {
          _id: request.listingId._id,
          category: request.listingId.category,
          price: request.listingId.price,
          quantityAvailable: request.listingId.quantity,
          reservedQuantity: request.listingId.reservedQuantity || 0,
          location: request.listingId.location,
          complianceYear: request.listingId.complianceYear,
          validTill: request.listingId.validTill,
        },
        requestedQuantity: request.quantity,
        notes: request.notes || "",
        status: request.status,
        createdAt: request.createdAt,
        rejectionReason: request.rejectionReason || "",
      }));

    return res.status(200).json({
      success: true,
      count: sellerRequests.length,
      requests: sellerRequests,
    });
  } catch (error) {
    console.error("Get seller purchase requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch seller purchase requests",
    });
  }
};

export const getBuyerPurchaseRequests = async (req, res) => {
  try {
    const requests = await PurchaseRequest.find({
      buyerId: req.user._id,
    })
      .populate({
        path: "listingId",
        select:
          "category quantity totalQuantity price publicMarkupRate publicMarginType publicMarginValue location complianceYear validTill reservedQuantity",
      })
      .sort({ createdAt: -1 })
      .lean();

    const buyerRequests = requests.map((request) => ({
      _id: request._id,
      listing: request.listingId
        ? {
            _id: request.listingId._id,
            category: request.listingId.category,
            quantity: request.listingId.quantity,
            totalQuantity:
              request.listingId.totalQuantity ?? request.listingId.quantity,
            reservedQuantity: request.listingId.reservedQuantity || 0,
            price: publicPrice(request.listingId),
            location: request.listingId.location,
            complianceYear: request.listingId.complianceYear,
            validTill: request.listingId.validTill,
          }
        : null,
      requestedQuantity: request.quantity,
      companyName: request.companyName,
      contactPerson: request.contactPerson,
      notes: request.notes || "",
      status: request.status,
      rejectionReason: request.rejectionReason || "",
      offer: request.offer
        ? {
            version: request.offer.version,
            creditPricePerUnit: request.offer.buyerPricePerUnit ?? (Number(request.quantity || 0) > 0 ? Number(request.offer.finalAmount || 0) / Number(request.quantity || 1) : request.offer.creditPricePerUnit),
            creditSubtotal: request.offer.buyerSubtotal ?? request.offer.finalAmount,
            finalAmount: request.offer.finalAmount,
            currency: request.offer.currency || "INR",
            sentAt: request.offer.sentAt,
            acceptedAt: request.offer.acceptedAt,
            expiresAt: request.offer.expiresAt,
            note: request.offer.note || "",
            status: request.offer.status,
          }
        : null,
      offerHistory: (request.offerHistory || []).map((item) => ({
        version: item.version,
        creditPricePerUnit: item.buyerPricePerUnit ?? (Number(request.quantity || 0) > 0 ? Number(item.finalAmount || 0) / Number(request.quantity || 1) : item.creditPricePerUnit),
        creditSubtotal: item.buyerSubtotal ?? item.finalAmount,
        finalAmount: item.finalAmount,
        currency: item.currency || "INR",
        sentAt: item.sentAt,
        acceptedAt: item.acceptedAt,
        expiresAt: item.expiresAt,
        note: item.note || "",
        status: item.status,
      })),
      acceptedOfferVersion: request.acceptedOfferVersion || null,
      acceptedOfferSnapshot: request.acceptedOfferSnapshot
        ? {
            creditPricePerUnit: request.acceptedOfferSnapshot.buyerPricePerUnit ?? (Number(request.quantity || 0) > 0 ? Number(request.acceptedOfferSnapshot.finalAmount || 0) / Number(request.quantity || 1) : request.acceptedOfferSnapshot.creditPricePerUnit),
            creditSubtotal: request.acceptedOfferSnapshot.buyerSubtotal ?? request.acceptedOfferSnapshot.finalAmount,
            finalAmount: request.acceptedOfferSnapshot.finalAmount,
            currency: request.acceptedOfferSnapshot.currency || "INR",
            version: request.acceptedOfferSnapshot.version,
            acceptedAt: request.acceptedOfferSnapshot.acceptedAt,
          }
        : null,
      createdAt: request.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: buyerRequests.length,
      requests: buyerRequests,
    });
  } catch (error) {
    console.error("Get buyer purchase requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch buyer purchase requests",
    });
  }
};
