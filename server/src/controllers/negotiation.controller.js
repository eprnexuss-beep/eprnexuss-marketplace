import mongoose from "mongoose";
import PurchaseRequest from "../models/PurchaseRequest.js";
import SellerListing from "../models/SellerListing.js";
import Deal from "../models/Deal.js";
import NegotiationMessage from "../models/NegotiationMessage.js";
import User from "../models/User.js";
import { createNotification } from "../services/notification.service.js";

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const getAdminId = async () => {
  const admin = await User.findOne({
    role: "admin",
    isActive: true,
  })
    .select("_id")
    .lean();

  return admin?._id || null;
};

const getRequest = async (id) =>
  PurchaseRequest.findById(id).populate({
    path: "listingId",
    select:
      "category quantity reservedQuantity price location complianceYear validTill sellerId",
  });

const privateRole = (request, user) => {
  if (user.role === "admin") return "admin";

  if (
    user.role === "buyer" &&
    String(request.buyerId) === String(user._id)
  ) {
    return "buyer";
  }

  if (
    user.role === "seller" &&
    request.listingId?.sellerId &&
    String(request.listingId.sellerId) === String(user._id)
  ) {
    return "seller";
  }

  return null;
};

const publicPrice = (value) => {
  const price = Number(value || 0);
  return Math.round(price * 1.1 * 100) / 100;
};

const buyerOffer = (offer, quantity = 0) => {
  if (!offer) return null;
  return {
    version: offer.version,
    creditPricePerUnit: offer.buyerPricePerUnit ?? (Number(quantity || 0) > 0 ? Number(offer.finalAmount || 0) / Number(quantity) : offer.creditPricePerUnit),
    creditSubtotal: offer.buyerSubtotal ?? offer.finalAmount,
    finalAmount: offer.finalAmount,
    currency: offer.currency || "INR",
    sentAt: offer.sentAt,
    acceptedAt: offer.acceptedAt,
    expiresAt: offer.expiresAt,
    note: offer.note || "",
    status: offer.status,
  };
};

const safeRequest = (request, role) => ({
  _id: request._id,
  status: request.status,
  requestedQuantity: request.quantity,
  createdAt: request.createdAt,

  listing: request.listingId
    ? {
        _id: request.listingId._id,
        category: request.listingId.category,
        location: request.listingId.location,
        complianceYear: request.listingId.complianceYear,
        validTill: request.listingId.validTill,
        listingPricePerUnit: role === "buyer"
          ? publicPrice(request.listingId.price)
          : request.listingId.price,
        availableQuantity: request.listingId.quantity,
        reservedQuantity: request.listingId.reservedQuantity || 0,
      }
    : null,

  // Internal seller economics are intentionally omitted from both participant views.
  offer: role === "buyer" ? buyerOffer(request.offer, request.quantity) : null,
  offerHistory: role === "buyer"
    ? (request.offerHistory || []).map((item) => buyerOffer(item, request.quantity))
    : [],
  perspective: role,
});

/*
|--------------------------------------------------------------------------
| Create deal after buyer accepts quotation
|--------------------------------------------------------------------------
|
| IMPORTANT INVENTORY RULE
|
| quantity = seller inventory that has not yet been consumed
| reservedQuantity = portion of that inventory locked for active deals
|
| When the buyer accepts a quotation:
|
|     available = quantity - reservedQuantity
|
| We increase reservedQuantity only.
|
| We DO NOT reduce quantity here.
|
| quantity and reservedQuantity are consumed together when the deal
| is actually completed.
|
| If deal creation fails after reservation, reservation is rolled back.
|--------------------------------------------------------------------------
*/

const createDealFromAcceptedOffer = async (request) => {
  const existingDeal = await Deal.findOne({
    requestId: request._id,
  });

  if (existingDeal) {
    return existingDeal;
  }

  const requestedQuantity = Number(request.quantity);

  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
    throw new Error("Requested quantity must be greater than zero.");
  }

  const listingId =
    request.listingId?._id || request.listingId;

  if (!validId(listingId)) {
    throw new Error(
      "The listing associated with this request is invalid.",
    );
  }

  /*
   * Atomically reserve the requested quantity.
   *
   * available inventory =
   *
   * quantity - reservedQuantity
   *
   * must be >= requestedQuantity.
   */
  const listing = await SellerListing.findOneAndUpdate(
    {
      _id: listingId,
      status: "active",

      $expr: {
        $gte: [
          {
            $subtract: [
              "$quantity",
              {
                $ifNull: ["$reservedQuantity", 0],
              },
            ],
          },
          requestedQuantity,
        ],
      },
    },

    {
      $inc: {
        reservedQuantity: requestedQuantity,
      },
    },

    {
      new: true,
    },
  );

  if (!listing) {
    throw new Error(
      "The requested quantity is no longer available on this listing.",
    );
  }

  const quantity = requestedQuantity;

  const agreedPrice = Number(
    request.offer?.sellerPricePerUnit ?? request.offer?.creditPricePerUnit,
  );

  const marginAmount = Number(request.offer?.marginAmount ?? request.offer?.serviceFee ?? 0);
  const marginRate = Number(
    request.offer?.sellerPricePerUnit == null && request.offer?.buyerPricePerUnit == null && agreedPrice > 0 && quantity > 0
      ? (marginAmount / (agreedPrice * quantity)) * 100
      : request.offer?.marginRate ?? 0,
  );

  /*
   * Validate quotation values after reservation.
   * If validation fails, immediately release the reservation.
   */
  if (!Number.isFinite(agreedPrice) || agreedPrice < 0) {
    await SellerListing.updateOne(
      {
        _id: listing._id,
        reservedQuantity: {
          $gte: requestedQuantity,
        },
      },
      {
        $inc: {
          reservedQuantity: -requestedQuantity,
        },
      },
    );

    throw new Error(
      "The accepted quotation has an invalid credit price.",
    );
  }

  if (!Number.isFinite(marginAmount) || marginAmount < 0) {
    await SellerListing.updateOne(
      {
        _id: listing._id,
        reservedQuantity: {
          $gte: requestedQuantity,
        },
      },
      {
        $inc: {
          reservedQuantity: -requestedQuantity,
        },
      },
    );

    throw new Error(
      "The accepted quotation has invalid platform margin terms.",
    );
  }

  const sellerSubtotal = quantity * agreedPrice;
  const buyerPricePerUnit = Number(
    request.offer?.buyerPricePerUnit ??
      agreedPrice * (1 + marginRate / 100),
  );
  const buyerSubtotal = quantity * buyerPricePerUnit;
  const finalAmount = Number(request.offer?.finalAmount ?? buyerSubtotal);

  /*
   * Create the deal only after the inventory reservation succeeded.
   */
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
      marginRate,
      marginAmount,
      commissionRate: marginRate,
      commissionAmount: marginAmount,
      serviceFee: marginAmount,
      sellerSubtotal,
      buyerSubtotal,
      creditSubtotal: sellerSubtotal,
      finalAmount,

      status: "payment_coordination",

      paymentStatus: "pending",

      /*
       * This is true because the listing reservation
       * above succeeded.
       */
      inventoryReserved: true,

      notes:
        `Quotation #${request.offer.version} accepted by buyer. Commercial terms are locked.`,
    });

    return deal;
  } catch (error) {
    /*
     * CRITICAL:
     *
     * Deal creation failed AFTER inventory was reserved.
     *
     * Release exactly the reservation made above so the
     * listing cannot become permanently over-reserved.
     */
    try {
      await SellerListing.updateOne(
        {
          _id: listing._id,

          reservedQuantity: {
            $gte: requestedQuantity,
          },
        },

        {
          $inc: {
            reservedQuantity: -requestedQuantity,
          },
        },
      );
    } catch (rollbackError) {
      console.error(
        "CRITICAL: Failed to rollback listing reservation:",
        rollbackError,
      );
    }

    throw error;
  }
};

export const getMessageUnreadCount = async (req, res) => {
  try {
    const role = req.user.role;
    if (!["admin", "buyer", "seller"].includes(role)) {
      return res.status(403).json({ success: false, message: "Invalid user role" });
    }

    const messages = await NegotiationMessage.find({
      visibleToRoles: role,
      senderId: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    })
      .select("requestId")
      .lean();

    const byRequest = {};
    for (const item of messages) {
      const id = String(item.requestId);
      byRequest[id] = (byRequest[id] || 0) + 1;
    }

    return res.json({
      success: true,
      unreadCount: messages.length,
      byRequest,
    });
  } catch (error) {
    console.error("Message unread count error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch message unread count" });
  }
};

export const getAdminNegotiations = async (
  req,
  res,
) => {
  try {
    const requests = await PurchaseRequest.find({
      status: {
        $in: [
          "pending",
          "reviewing",
          "matched",
          "negotiating",
          "offer_sent",
          "offer_accepted",
          "approved",
          "rejected",
          "completed",
        ],
      },
    })
      .populate(
        "buyerId",
        "name company email phone",
      )
      .populate({
        path: "listingId",

        select:
          "category quantity reservedQuantity price location complianceYear validTill sellerId",

        populate: {
          path: "sellerId",
          select: "name company email phone",
        },
      })
      .sort({
        updatedAt: -1,
      })
      .lean();

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error(
      "Admin negotiations error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load negotiations",
    });
  }
};

export const getNegotiationMessages = async (
  req,
  res,
) => {
  try {
    if (!validId(req.params.requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await getRequest(
      req.params.requestId,
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const role = privateRole(
      request,
      req.user,
    );

    if (!role) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this request",
      });
    }

    const messages =
      await NegotiationMessage.find({
        requestId: request._id,
        visibleToRoles: role,
      })
        .sort({
          createdAt: 1,
        })
        .populate(
          "senderId",
          "name role",
        )
        .lean();

    await NegotiationMessage.updateMany(
      {
        requestId: request._id,
        visibleToRoles: role,
        senderId: { $ne: req.user._id },
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } },
    );

    return res.json({
      success: true,

      request: safeRequest(
        request,
        role,
      ),

      messages: messages.map((m) => ({
        _id: m._id,

        senderRole: m.senderRole,

        targetRole:
          m.senderRole === "admin"
            ? (m.visibleToRoles || []).find((item) => ["buyer", "seller"].includes(item)) || null
            : null,

        senderLabel:
          m.senderRole === "admin"
            ? "EPR Nexus"
            : m.senderRole === role
              ? "You"
              : "EPR Nexus",

        message: m.message,

        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "Negotiation messages error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load messages",
    });
  }
};

export const sendNegotiationMessage = async (
  req,
  res,
) => {
  try {
    if (!validId(req.params.requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const message = String(
      req.body?.message || "",
    ).trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message:
          "Message cannot exceed 2000 characters",
      });
    }

    const request = await getRequest(
      req.params.requestId,
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    /*
     * Once commercial terms are accepted, users may
     * continue operational communication, but they cannot
     * create a new price through the message endpoint.
     */
    if (
      ["approved", "completed", "cancelled"].includes(
        request.status,
      ) &&
      req.user.role !== "admin"
    ) {
      // Operational messages remain allowed.
    }

    const role = privateRole(
      request,
      req.user,
    );

    if (!role) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this request",
      });
    }

    let targetRole = null;

    /*
     * Admin must explicitly choose whether the message
     * is intended for the buyer or seller.
     */
    if (role === "admin") {
      targetRole = String(
        req.body?.targetRole || "",
      ).toLowerCase();

      if (
        !["buyer", "seller"].includes(
          targetRole,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Select whether this message is for the buyer or seller.",
        });
      }
    }

    /*
     * Buyer and seller messages are private with EPR Nexus.
     *
     * Admin messages are private to the explicitly selected
     * party.
     */
    const visibleToRoles =
      role === "admin"
        ? ["admin", targetRole]
        : ["admin", role];

    const created =
      await NegotiationMessage.create({
        requestId: request._id,

        senderId: req.user._id,

        senderRole: role,

        message,

        visibleToRoles,
      });

    /*
     * Buyer -> Admin notification.
     */
    if (role === "buyer") {
      await createNotification({
        recipient: await getAdminId(),

        actor: req.user._id,

        type: "negotiation_message",

        title: "New buyer message",

        message:
          "A buyer sent a message on a purchase request.",

        entityType: "request",

        entityId: request._id,
      });
    }

    /*
     * Seller -> Admin notification.
     */
    else if (role === "seller") {
      await createNotification({
        recipient: await getAdminId(),

        actor: req.user._id,

        type: "negotiation_message",

        title: "New seller message",

        message:
          "A seller sent a message on a purchase request.",

        entityType: "request",

        entityId: request._id,
      });
    }

    /*
     * Admin -> Buyer notification.
     */
    else if (targetRole === "buyer") {
      await createNotification({
        recipient: request.buyerId,

        actor: req.user._id,

        type: "negotiation_message",

        title: "New message from EPR Nexus",

        message:
          "EPR Nexus sent you a message about your credit request.",

        entityType: "request",

        entityId: request._id,
      });
    }

    /*
     * Admin -> Seller notification.
     */
    else if (
      targetRole === "seller" &&
      request.listingId?.sellerId
    ) {
      await createNotification({
        recipient:
          request.listingId.sellerId,

        actor: req.user._id,

        type: "negotiation_message",

        title: "New message from EPR Nexus",

        message:
          "EPR Nexus sent you an update about a credit request.",

        entityType: "request",

        entityId: request._id,
      });
    }

    return res.status(201).json({
      success: true,

      message: {
        _id: created._id,

        senderRole: role,

        targetRole,

        senderLabel:
          role === "admin"
            ? "EPR Nexus"
            : "You",

        message: created.message,

        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Send negotiation message error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

export const setAdminOffer = async (
  req,
  res,
) => {
  try {
    const { requestId } = req.params;

    const creditPricePerUnit = Number(
      req.body?.creditPricePerUnit,
    );

    const serviceFee = Number(
      req.body?.serviceFee,
    );

    const expiresAt = req.body?.expiresAt
      ? new Date(req.body.expiresAt)
      : null;

    const note = String(
      req.body?.note || "",
    ).trim();

    if (!validId(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (
      !Number.isFinite(
        creditPricePerUnit,
      ) ||
      creditPricePerUnit < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Credit price must be a valid non-negative amount",
      });
    }

    if (
      !Number.isFinite(serviceFee) ||
      serviceFee < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "EPR Nexus service fee must be a valid non-negative amount",
      });
    }

    if (
      expiresAt &&
      Number.isNaN(expiresAt.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer expiry",
      });
    }

    const request =
      await PurchaseRequest.findById(
        requestId,
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase request not found",
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

    if (
      [
        "approved",
        "completed",
        "cancelled",
      ].includes(request.status)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This request is already locked and cannot receive a new quotation.",
      });
    }

    const quantity = Number(
      request.quantity,
    );

    const creditSubtotal =
      quantity * creditPricePerUnit;

    const finalAmount =
      creditSubtotal + serviceFee;

    const version =
      Number(
        request.offer?.version || 0,
      ) + 1;

    const sentAt = new Date();

    /*
     * Preserve previous quotations in offerHistory.
     */
    if (
      request.offer?.version > 0 &&
      request.offer?.sentAt
    ) {
      request.offerHistory.push({
        version:
          request.offer.version,

        creditPricePerUnit:
          request.offer
            .creditPricePerUnit,

        creditSubtotal:
          request.offer.creditSubtotal,

        serviceFee:
          request.offer.serviceFee,

        finalAmount:
          request.offer.finalAmount,

        currency:
          request.offer.currency ||
          "INR",

        sentAt:
          request.offer.sentAt,

        expiresAt:
          request.offer.expiresAt ||
          null,

        note:
          request.offer.note || "",

        issuedBy:
          request.offer
            .lastUpdatedBy ||
          req.user._id,

        acceptedAt:
          request.offer.acceptedAt ||
          null,
      });
    }

    request.offer = {
      creditPricePerUnit,

      creditSubtotal,

      serviceFee,

      finalAmount,

      currency: "INR",

      version,

      sentAt,

      acceptedAt: null,

      expiresAt,

      lastUpdatedBy:
        req.user._id,

      note,
    };

    request.status =
      "offer_sent";

    request.rejectionReason = "";

    await request.save();

    await createNotification({
      recipient:
        request.buyerId,

      actor:
        req.user._id,

      type:
        "offer_updated",

      title:
        version === 1
          ? "Quotation received from EPR Nexus"
          : "Revised quotation from EPR Nexus",

      message:
        `Quotation #${version} is ready. Final payable: ₹${money(finalAmount)}.`,

      entityType:
        "request",

      entityId:
        request._id,

      metadata: {
        version,

        finalAmount,

        serviceFee,

        creditSubtotal,
      },
    });

    /*
     * Seller receives only a general notification.
     * Buyer and seller never receive each other's identity.
     */
    if (request.listingId) {
      const listing =
        await SellerListing.findById(
          request.listingId,
        )
          .select("sellerId")
          .lean();

      if (listing?.sellerId) {
        await createNotification({
          recipient:
            listing.sellerId,

          actor:
            req.user._id,

          type:
            "offer_updated",

          title:
            "EPR Nexus updated a request",

          message:
            "EPR Nexus updated the commercial handling of a buyer request on your listing. Contact EPR Nexus from Messages for details.",

          entityType:
            "request",

          entityId:
            request._id,

          metadata: {
            quantity,
          },
        });
      }
    }

    return res.json({
      success: true,

      message:
        "Quotation sent successfully",

      request:
        safeRequest(
          request,
          "admin",
        ),
    });
  } catch (error) {
    console.error(
      "Set admin offer error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to send quotation",
    });
  }
};
export const acceptAdminOffer = async (
  req,
  res,
) => {
  try {
    if (!validId(req.params.requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request =
      await PurchaseRequest.findById(
        req.params.requestId,
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    /*
     * Only the buyer who created this request can
     * accept its quotation.
     */
    if (
      req.user.role !== "buyer" ||
      String(request.buyerId) !==
        String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only the requesting buyer can accept this quotation",
      });
    }

    /*
     * Make sure an active quotation exists.
     */
    if (
      !request.offer ||
      request.offer.finalAmount == null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No active quotation exists",
      });
    }

    /*
     * If the quotation was already accepted,
     * return the existing deal instead of creating
     * another one.
     */
    if (request.offer.acceptedAt) {
      const existingDeal =
        await Deal.findOne({
          requestId: request._id,
        });

      return res.json({
        success: true,
        message:
          "Quotation was already accepted",

        request:
          safeRequest(
            request,
            "buyer",
          ),

        deal: existingDeal,
      });
    }

    /*
     * Do not allow an expired quotation to be accepted.
     */
    if (
      request.offer.expiresAt &&
      new Date(request.offer.expiresAt) <
        new Date()
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This quotation has expired. Please message EPR Nexus for a new quotation.",
      });
    }

    /*
     * IMPORTANT:
     *
     * Create the deal FIRST.
     *
     * This function also reserves the listing inventory.
     *
     * If inventory is unavailable or Deal.create()
     * fails, the quotation remains unaccepted.
     */
    let deal;

    try {
      deal =
        await createDealFromAcceptedOffer(
          request,
        );
    } catch (error) {
      const message =
        error.message ||
        "Unable to create the transaction from this quotation.";

      const isConflict =
        message.includes(
          "no longer available",
        ) ||
        message.includes(
          "Requested quantity",
        ) ||
        message.includes(
          "invalid",
        );

      return res.status(
        isConflict ? 409 : 500,
      ).json({
        success: false,
        message,
      });
    }

    /*
     * The deal and inventory reservation now exist.
     *
     * Only NOW do we mark the quotation accepted.
     */
    const acceptedAt =
      new Date();

    request.offer.acceptedAt =
      acceptedAt;

    request.status =
      "approved";

    /*
     * Save the accepted quotation
     * into quotation history.
     */
    const historyEntry = {
      version:
        request.offer.version,

      creditPricePerUnit:
        request.offer
          .creditPricePerUnit,

      creditSubtotal:
        request.offer
          .creditSubtotal,

      serviceFee:
        request.offer.serviceFee,

      finalAmount:
        request.offer.finalAmount,

      currency:
        request.offer.currency ||
        "INR",

      sentAt:
        request.offer.sentAt ||
        new Date(),

      expiresAt:
        request.offer.expiresAt ||
        null,

      note:
        request.offer.note || "",

      issuedBy:
        request.offer
          .lastUpdatedBy ||
        null,

      acceptedAt,
    };

    /*
     * Avoid adding the same quotation to history twice.
     */
    const alreadyInHistory =
      request.offerHistory.some(
        (entry) =>
          entry.version ===
          historyEntry.version,
      );

    if (!alreadyInHistory) {
      request.offerHistory.push(
        historyEntry,
      );
    }

    await request.save();

    /*
     * Notify Admin.
     */
    const adminId =
      await getAdminId();

    await createNotification({
      recipient:
        adminId,

      actor:
        req.user._id,

      type:
        "offer_accepted",

      title:
        "Buyer accepted quotation",

      message:
        `Quotation #${request.offer.version} was accepted. Deal ${deal._id} is ready for payment coordination.`,

      entityType:
        "deal",

      entityId:
        deal._id,
    });

    /*
     * Notify Seller.
     *
     * The seller receives no buyer identity.
     */
    await createNotification({
      recipient:
        deal.sellerId,

      actor:
        req.user._id,

      type:
        "deal_created",

      title:
        "EPR Nexus deal confirmed",

      message:
        `${deal.quantity} MT from your listing has been allocated to a confirmed EPR Nexus transaction. Please check Messages for the next steps.`,

      entityType:
        "deal",

      entityId:
        deal._id,
    });

    return res.json({
      success: true,

      message:
        "Quotation accepted. Deal created and commercial terms locked.",

      request:
        safeRequest(
          request,
          "buyer",
        ),

      deal,
    });
  } catch (error) {
    console.error(
      "Accept offer error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Failed to accept quotation and create deal",
    });
  }
};