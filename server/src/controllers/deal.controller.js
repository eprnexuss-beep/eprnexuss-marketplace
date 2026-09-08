import mongoose from "mongoose";
import Deal from "../models/Deal.js";
import Payment from "../models/Payment.js";
import BuyerRequirement from "../models/BuyerRequirement.js";
import SellerListing from "../models/SellerListing.js";
import PurchaseRequest from "../models/PurchaseRequest.js";
import { notifyDealStatusChange } from "../services/notification.service.js";
import { createActivityLog } from "../services/activityLog.service.js";

const publicListingPrice = (listing) => {
  const base = Number(listing?.price || 0);
  const marginType = listing?.publicMarginType;
  const marginValue = Number(listing?.publicMarginValue);

  if (
    marginType === "value" &&
    Number.isFinite(marginValue) &&
    marginValue >= 0
  ) {
    return Math.round((base + marginValue) * 100) / 100;
  }

  const rate = Number.isFinite(Number(listing?.publicMarkupRate))
    ? Number(listing.publicMarkupRate)
    : marginType === "percentage" && Number.isFinite(marginValue)
      ? marginValue
      : 10;

  return Math.round(
    base * (1 + Math.max(0, rate) / 100) * 100,
  ) / 100;
};

/*

CREATE MULTIPLE DEALS FROM A FULLY MATCHED REQUIREMENT

--------------------------------------------------------------------------



One BuyerRequirement can contain multiple matched seller listings.



Example:



Requirement = 200 MT



Seller A = 100 MT

Seller B = 100 MT



This creates:



Deal A = 100 MT

Deal B = 100 MT



Inventory is RESERVED when the deals are created.

--------------------------------------------------------------------------

*/

export const createDealsFromRequirement = async (req, res) => {
try {
const { requirementId, marginRate: requestedMarginRate = 10 } = req.body || {};

/*
|--------------------------------------------------------------------------
| Validate requirement ID
|--------------------------------------------------------------------------
*/

if (!requirementId || !mongoose.Types.ObjectId.isValid(requirementId)) {
  return res.status(400).json({
    success: false,
    message: "A valid requirementId is required",
  });
}

/*
|--------------------------------------------------------------------------
| Find requirement
|--------------------------------------------------------------------------
*/

const requirement = await BuyerRequirement.findById(requirementId).lean();

if (!requirement) {
  return res.status(404).json({
    success: false,
    message: "Requirement not found",
  });
}

/*
|--------------------------------------------------------------------------
| Only fully matched requirements can create deals
|--------------------------------------------------------------------------
*/

if (requirement.status !== "fully_matched") {
  return res.status(400).json({
    success: false,
    message: "Only fully matched requirements can create seller deals",
  });
}

/*
|--------------------------------------------------------------------------
| Validate matched listings
|--------------------------------------------------------------------------
*/

if (
  !Array.isArray(requirement.matchedListings) ||
  requirement.matchedListings.length === 0
) {
  return res.status(400).json({
    success: false,
    message: "No matched seller listings found",
  });
}

/*
/*
|--------------------------------------------------------------------------
| Validate fixed EPR Nexus commission
|--------------------------------------------------------------------------
*/

const requestedMargin = Number(requestedMarginRate);
if (
  requestedMarginRate !== undefined &&
  (!Number.isFinite(requestedMargin) || requestedMargin < 0 || requestedMargin > 100)
) {
  return res.status(400).json({
    success: false,
    message: "Platform margin must be between 0% and 100%",
    code: "INVALID_MARGIN_RATE",
  });
}

const createdDeals = [];
const existingDeals = [];

/*
|--------------------------------------------------------------------------
| Create one deal per matched seller
|--------------------------------------------------------------------------
*/

for (const match of requirement.matchedListings) {
  const matchedQuantity = Number(match.quantity);

  if (!Number.isFinite(matchedQuantity) || matchedQuantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Matched quantity must be greater than zero",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent duplicate deals
  |--------------------------------------------------------------------------
  */

  const existingDeal = await Deal.findOne({
    requirementId: requirement._id,

    matchedListingId: match.listingId,
  });

  if (existingDeal) {
    existingDeals.push(existingDeal);

    continue;
  }

  /*
  |--------------------------------------------------------------------------
  | Atomically reserve seller inventory
  |--------------------------------------------------------------------------
  |
  | Available quantity =
  |
  | quantity - reservedQuantity
  |
  | The condition and increment happen together,
  | which prevents two concurrent deal creations
  | from reserving the same inventory.
  |--------------------------------------------------------------------------
  */

  const listing = await SellerListing.findOneAndUpdate(
    {
      _id: match.listingId,

      status: "active",

      validTill: {
        $gte: new Date(),
      },

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
          matchedQuantity,
        ],
      },
    },
    {
      $inc: {
        reservedQuantity: matchedQuantity,
      },
    },
    {
      new: true,
    },
  );

  if (!listing) {
    return res.status(409).json({
      success: false,
      message: `Insufficient available quantity for matched listing ${match.listingId}`,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validate price
  |--------------------------------------------------------------------------
  */

  const agreedPrice = Number(listing.price);

  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    /*
    |--------------------------------------------------------------------------
    | Roll back reservation because
    | listing price is invalid.
    |--------------------------------------------------------------------------
    */

    await SellerListing.updateOne(
      {
        _id: listing._id,
      },
      {
        $inc: {
          reservedQuantity: -matchedQuantity,
        },
      },
    );

    return res.status(400).json({
      success: false,
      message: "Matched listing has an invalid price",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate deal value
  |--------------------------------------------------------------------------
  */

  const marginType =
    requestedMarginRate !== undefined
      ? "percentage"
      : listing.publicMarginType === "value"
        ? "value"
        : "percentage";
  const marginValue =
    requestedMarginRate !== undefined
      ? requestedMargin
      : Number(
          listing.publicMarginValue ??
            listing.publicMarkupRate ??
            10,
        );

  if (
    !Number.isFinite(marginValue) ||
    marginValue < 0 ||
    (marginType === "percentage" && marginValue > 100)
  ) {
    return res.status(400).json({
      success: false,
      message:
        marginType === "percentage"
          ? "Percentage margin must be between 0% and 100%"
          : "Value margin must be zero or greater",
      code: "INVALID_MARGIN_VALUE",
    });
  }

  const sellerSubtotal = Math.round(matchedQuantity * agreedPrice * 100) / 100;
  const marginAmount =
    marginType === "value"
      ? Math.round(matchedQuantity * marginValue * 100) / 100
      : Math.round(sellerSubtotal * (marginValue / 100) * 100) / 100;
  const buyerPricePerUnit =
    marginType === "value"
      ? Math.round((agreedPrice + marginValue) * 100) / 100
      : Math.round(agreedPrice * (1 + marginValue / 100) * 100) / 100;
  const buyerSubtotal = Math.round(matchedQuantity * buyerPricePerUnit * 100) / 100;
  const finalAmount = buyerSubtotal;
  const marginRate =
    marginType === "percentage"
      ? marginValue
      : agreedPrice > 0
        ? (marginValue / agreedPrice) * 100
        : 0;

  /*
  |--------------------------------------------------------------------------
  | Create deal
  |--------------------------------------------------------------------------
  */

  try {
    const deal = await Deal.create({
      requestId: null,

      requirementId: requirement._id,

      matchedListingId: listing._id,

      listingId: listing._id,

      buyerId: requirement.buyerId,

      sellerId: listing.sellerId,

      quantity: matchedQuantity,

      agreedPrice,
      sellerPricePerUnit: agreedPrice,
      buyerPricePerUnit,
      marginRate,
      marginType,
      marginValue,
      marginAmount,
      commissionRate: marginRate,
      commissionAmount: marginAmount,
      serviceFee: marginAmount,
      sellerSubtotal,
      buyerSubtotal,
      creditSubtotal: sellerSubtotal,
      finalAmount,

      /*
        |--------------------------------------------------------------------------
        | Inventory is now reserved
        |--------------------------------------------------------------------------
        */

      inventoryReserved: true,

      status: "matched",

      paymentStatus: "pending",

      notes: "Created from fully matched buyer requirement by EPR Nexus.",
    });

    createdDeals.push(deal);
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | If deal creation fails after inventory
    | reservation, release the reservation.
    |--------------------------------------------------------------------------
    */

    await SellerListing.updateOne(
      {
        _id: listing._id,
      },
      {
        $inc: {
          reservedQuantity: -matchedQuantity,
        },
      },
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Success response
|--------------------------------------------------------------------------
*/

return res.status(201).json({
  success: true,

  message:
    createdDeals.length > 0
      ? "Deals created successfully from matched requirement"
      : "Deals already exist for all matched listings",

  createdCount: createdDeals.length,

  existingCount: existingDeals.length,

  deals: [...existingDeals, ...createdDeals],

  requirement: {
    _id: requirement._id,

    quantity: requirement.quantity,

    matchedQuantity: requirement.matchedQuantity,

    remainingQuantity: requirement.remainingQuantity,

    status: requirement.status,
  },
});

} catch (error) {
console.error("Create deals from requirement error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to create deals from requirement",
});

}
};

/*

CREATE DEAL FROM PURCHASE REQUEST

--------------------------------------------------------------------------



Legacy / existing PurchaseRequest-based deal flow.



Inventory is also RESERVED here.

--------------------------------------------------------------------------

*/

export const createDeal = async (req, res) => {
try {
const {
requestId,
agreedPrice,
commissionAmount: requestedCommissionAmount = 0,
notes = "",
} = req.body || {};

/*
|--------------------------------------------------------------------------
| Validate request ID
|--------------------------------------------------------------------------
*/

if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
  return res.status(400).json({
    success: false,
    message: "A valid requestId is required",
  });
}

/*
|--------------------------------------------------------------------------
| Load purchase request
|--------------------------------------------------------------------------
*/

const request = await PurchaseRequest.findById(requestId)
  .populate("buyerId", "name company email")
  .populate(
    "listingId",
    "sellerId category quantity price location validTill",
  );

if (!request) {
  return res.status(404).json({
    success: false,
    message: "Purchase request not found",
  });
}

/*
|--------------------------------------------------------------------------
| Request must be matched
|--------------------------------------------------------------------------
*/

if (request.status !== "matched") {
  return res.status(400).json({
    success: false,
    message: "Only matched purchase requests can be converted into a deal",
  });
}

/*
|--------------------------------------------------------------------------
| Prevent duplicate deal
|--------------------------------------------------------------------------
*/

const existingDeal = await Deal.findOne({
  requestId,
});

if (existingDeal) {
  return res.status(409).json({
    success: false,
    message: "A deal already exists for this purchase request",
    deal: existingDeal,
  });
}

const listing = request.listingId;

if (!listing) {
  return res.status(404).json({
    success: false,
    message: "Listing associated with request not found",
  });
}

/*
|--------------------------------------------------------------------------
| Validate buyer / seller
|--------------------------------------------------------------------------
*/

if (!listing.sellerId || !request.buyerId) {
  return res.status(400).json({
    success: false,
    message: "Buyer or seller information is missing",
  });
}

/*
|--------------------------------------------------------------------------
| Requested quantity
|--------------------------------------------------------------------------
*/

const requestedQuantity = Number(request.quantity);

if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
  return res.status(400).json({
    success: false,
    message: "Requested quantity must be a valid positive number",
  });
}

/*
|--------------------------------------------------------------------------
| Atomically reserve inventory
|--------------------------------------------------------------------------
*/

const reservedListing = await SellerListing.findOneAndUpdate(
  {
    _id: listing._id,

    status: "active",

    validTill: {
      $gte: new Date(),
    },

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

if (!reservedListing) {
  return res.status(409).json({
    success: false,
    message: "Insufficient available listing quantity",
  });
}

/*
|--------------------------------------------------------------------------
| Validate price
|--------------------------------------------------------------------------
*/

const price = Number(agreedPrice ?? reservedListing.price);

const fixedCommission = Number(requestedCommissionAmount);

if (!Number.isFinite(price) || price <= 0) {
  /*
  |--------------------------------------------------------------------------
  | Release reservation on validation failure
  |--------------------------------------------------------------------------
  */

  await SellerListing.updateOne(
    {
      _id: reservedListing._id,
    },
    {
      $inc: {
        reservedQuantity: -requestedQuantity,
      },
    },
  );

  return res.status(400).json({
    success: false,
    message: "Agreed price must be a valid positive number",
  });
}

if (!Number.isFinite(fixedCommission) || fixedCommission < 0) {
  await SellerListing.updateOne(
    { _id: reservedListing._id },
    { $inc: { reservedQuantity: -requestedQuantity } },
  );

  return res.status(400).json({
    success: false,
    message: "Commission amount must be a valid non-negative number",
    code: "INVALID_COMMISSION_AMOUNT",
  });
}

/*
|--------------------------------------------------------------------------
| Calculate deal value
|--------------------------------------------------------------------------
*/

const totalValue = requestedQuantity * price;

const commissionAmount = Math.round(fixedCommission * 100) / 100;
const creditSubtotal = Math.round(totalValue * 100) / 100;
const finalAmount = Math.round((creditSubtotal + commissionAmount) * 100) / 100;

/*
|--------------------------------------------------------------------------
| Create deal
|--------------------------------------------------------------------------
*/

try {
  const deal = await Deal.create({
    requestId: request._id,

    listingId: reservedListing._id,

    buyerId: request.buyerId._id,

    sellerId: reservedListing.sellerId,

    quantity: requestedQuantity,

    agreedPrice: price,

// Kept for backward compatibility. Commission is a fixed amount.
commissionRate: 0,

commissionAmount,
creditSubtotal,
serviceFee: commissionAmount,
finalAmount,

    inventoryReserved: true,

    status: "matched",

    paymentStatus: "pending",

    notes: notes.trim(),
  });

  return res.status(201).json({
    success: true,
    message: "Deal created successfully",
    deal,
  });
} catch (error) {
  /*
  |--------------------------------------------------------------------------
  | Release reservation if deal creation fails
  |--------------------------------------------------------------------------
  */

  await SellerListing.updateOne(
    {
      _id: reservedListing._id,
    },
    {
      $inc: {
        reservedQuantity: -requestedQuantity,
      },
    },
  );

  throw error;
}

} catch (error) {
console.error("Create deal error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to create deal",
});

}
};

/*

GET ADMIN DEALS

--------------------------------------------------------------------------

*/

export const getAdminDeals = async (req, res) => {
try {
const deals = await Deal.find()
.populate("buyerId", "name company email")
.populate("sellerId", "name company email")
.populate(
"listingId",
"category quantity totalQuantity price publicMarkupRate publicMarginType publicMarginValue location complianceYear validTill reservedQuantity",
)
.populate("requestId", "quantity status notes createdAt")
.populate(
"requirementId",
"quantity matchedQuantity remainingQuantity status",
)
.sort({
createdAt: -1,
});

const payments = await Payment.find({ dealId: { $in: deals.map((deal) => deal._id) } }).lean();
const paymentByDeal = new Map(payments.map((payment) => [String(payment.dealId), payment]));
const dealsWithPayment = deals.map((deal) => {
  const value = deal.toObject ? deal.toObject() : deal;
  return { ...value, payment: paymentByDeal.get(String(deal._id)) || null };
});

return res.status(200).json({
  success: true,
  count: dealsWithPayment.length,
  deals: dealsWithPayment,
});

} catch (error) {
console.error("Get admin deals error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to fetch deals",
});

}
};

/*

UPDATE DEAL STATUS

--------------------------------------------------------------------------



Active deal:



matched

↓

negotiating

↓

terms_agreed

↓

payment_coordination

↓

completed



Inventory:



Deal creation

→ reservedQuantity increases



Deal completed

→ quantity decreases

→ reservedQuantity decreases



Deal cancelled

→ reservedQuantity decreases

--------------------------------------------------------------------------

*/

export const updateDealStatus = async (req, res) => {
  try {
    const { dealId } = req.params;
    const { status, paymentStatus } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(dealId)) {
      return res.status(400).json({
        success: false,
        message: "A valid dealId is required",
        code: "INVALID_DEAL_ID",
      });
    }

    const allowedStatuses = [
      "matched",
      "negotiating",
      "terms_agreed",
      "payment_coordination",
      "completed",
      "cancelled",
    ];

    const allowedPaymentStatuses = [
      "pending",
      "initiated",
      "received",
      "failed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal status",
        code: "INVALID_DEAL_STATUS",
      });
    }

    if (
      paymentStatus !== undefined &&
      !allowedPaymentStatuses.includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
        code: "INVALID_PAYMENT_STATUS",
      });
    }

    const deal = await Deal.findById(dealId);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
        code: "DEAL_NOT_FOUND",
      });
    }

    const previousStatus = deal.status;
    const previousPaymentStatus = deal.paymentStatus;

    /*
     * ----------------------------------------------------------------------
     * IMMUTABILITY
     * ----------------------------------------------------------------------
     *
     * A completed deal is the final business state. It cannot be edited or
     * cancelled. A cancelled deal is also terminal.
     */
    if (previousStatus === "completed") {
      return res.status(409).json({
        success: false,
        message: "Completed deals cannot be modified",
        code: "DEAL_ALREADY_COMPLETED",
      });
    }

    if (previousStatus === "cancelled") {
      return res.status(409).json({
        success: false,
        message: "Cancelled deals cannot be modified",
        code: "DEAL_ALREADY_CANCELLED",
      });
    }

    /*
     * ----------------------------------------------------------------------
     * STATE MACHINE
     * ----------------------------------------------------------------------
     *
     * Normal forward flow:
     *
     * matched
     *   -> negotiating
     *   -> terms_agreed
     *   -> payment_coordination
     *   -> completed
     *
     * Cancellation is intentionally allowed from any non-terminal state,
     * including after payment has been received. Refund/settlement handling
     * is a separate business operation and must not be silently inferred.
     */
    const transitions = {
      matched: ["matched", "negotiating", "cancelled"],
      negotiating: ["negotiating", "terms_agreed", "cancelled"],
      terms_agreed: ["terms_agreed", "payment_coordination", "cancelled"],
      payment_coordination: [
        "payment_coordination",
        "completed",
        "cancelled",
      ],
    };

    if (!transitions[previousStatus]?.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Invalid deal transition from "${previousStatus}" to "${status}"`,
        code: "INVALID_DEAL_TRANSITION",
        currentStatus: previousStatus,
      });
    }

    /*
     * ----------------------------------------------------------------------
     * PAYMENT STATE RULES
     * ----------------------------------------------------------------------
     *
     * Quotation/deal acceptance does NOT mean payment was received.
     *
     * Payment may progress:
     * pending -> initiated -> received
     * pending -> failed
     * initiated -> failed
     *
     * Once received, it cannot be silently moved backwards.
     */
    const requestedPaymentStatus =
      paymentStatus === undefined ? previousPaymentStatus : paymentStatus;

    const paymentTransitions = {
      pending: ["pending", "initiated", "failed", "received"],
      initiated: ["initiated", "received", "failed"],
      failed: ["failed", "initiated", "received"],
      received: ["received"],
    };

    if (
      !paymentTransitions[previousPaymentStatus]?.includes(
        requestedPaymentStatus,
      )
    ) {
      return res.status(409).json({
        success: false,
        message: `Invalid payment transition from "${previousPaymentStatus}" to "${requestedPaymentStatus}"`,
        code: "INVALID_PAYMENT_TRANSITION",
        currentPaymentStatus: previousPaymentStatus,
      });
    }

    /*
     * Payment can only be marked received as part of a legitimate deal
     * lifecycle. In particular, don't allow a brand-new matched deal to
     * jump straight to "payment received".
     */
    if (
      requestedPaymentStatus === "received" &&
      !["terms_agreed", "payment_coordination"].includes(previousStatus)
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Payment cannot be marked received before the commercial terms are agreed",
        code: "PAYMENT_TOO_EARLY",
      });
    }

    let paymentRecord = null;

    if (requestedPaymentStatus === "received") {
      paymentRecord = await Payment.findOne({ dealId: deal._id });

      if (!paymentRecord || !["initiated", "received"].includes(paymentRecord.status)) {
        return res.status(409).json({
          success: false,
          message: "Payment must be initiated through the payment workflow before it can be confirmed",
          code: "PAYMENT_RECORD_REQUIRED",
        });
      }
    }

    /*
     * Completion requires:
     *   1. paymentStatus = received
     *   2. current status = payment_coordination
     *
     * Therefore accepting a quotation can never directly complete a deal.
     */
    if (status === "completed") {
      const effectivePaymentStatus =
        paymentStatus === undefined ? previousPaymentStatus : paymentStatus;

      if (effectivePaymentStatus !== "received") {
        return res.status(409).json({
          success: false,
          message:
            "A deal cannot be completed until payment is confirmed as received",
          code: "PAYMENT_REQUIRED_BEFORE_COMPLETION",
        });
      }

      if (previousStatus !== "payment_coordination") {
        return res.status(409).json({
          success: false,
          message:
            "A deal must be in payment coordination before it can be completed",
          code: "INVALID_COMPLETION_STAGE",
        });
      }
    }

    const dealQuantity = Number(deal.quantity || 0);

    if (
      (status === "completed" || status === "cancelled") &&
      (!Number.isFinite(dealQuantity) || dealQuantity <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid deal quantity",
        code: "INVALID_DEAL_QUANTITY",
      });
    }

    /*
     * ----------------------------------------------------------------------
     * COMPLETION
     * ----------------------------------------------------------------------
     *
     * Consume exactly the quantity reserved by this deal.
     *
     * The inventory update is conditional on both quantity and
     * reservedQuantity so a stale/inconsistent database cannot silently
     * oversell inventory.
     */
    if (status === "completed") {
      if (!deal.inventoryReserved) {
        return res.status(409).json({
          success: false,
          message:
            "This deal does not have a valid inventory reservation and cannot be completed",
          code: "INVENTORY_RESERVATION_MISSING",
        });
      }

      const listing = await SellerListing.findOneAndUpdate(
        {
          _id: deal.listingId,
          status: { $in: ["active", "sold"] },
          quantity: { $gte: dealQuantity },
          $expr: {
            $gte: [
              { $ifNull: ["$reservedQuantity", 0] },
              dealQuantity,
            ],
          },
        },
        {
          $inc: {
            quantity: -dealQuantity,
            reservedQuantity: -dealQuantity,
          },
        },
        {
          new: true,
        },
      );

      if (!listing) {
        return res.status(409).json({
          success: false,
          message:
            "Unable to consume reserved listing inventory. The listing quantity and reservation are inconsistent.",
          code: "INVENTORY_RESERVATION_MISMATCH",
        });
      }

      if (listing.quantity === 0) {
        listing.status = "sold";
        await listing.save();
      }

      deal.inventoryReserved = false;
      deal.completedAt = new Date();
    }

    /*
     * ----------------------------------------------------------------------
     * CANCELLATION
     * ----------------------------------------------------------------------
     *
     * Cancellation is allowed even after payment has been received.
     * Payment/refund settlement is deliberately NOT changed automatically.
     * That needs a separate payment/refund workflow.
     */
    if (status === "cancelled" && deal.inventoryReserved && deal.listingId) {
      const listing = await SellerListing.findOneAndUpdate(
        {
          _id: deal.listingId,
          $expr: {
            $gte: [
              { $ifNull: ["$reservedQuantity", 0] },
              dealQuantity,
            ],
          },
        },
        {
          $inc: {
            reservedQuantity: -dealQuantity,
          },
        },
        {
          new: true,
        },
      );

      if (!listing) {
        return res.status(409).json({
          success: false,
          message:
            "Unable to release reserved listing inventory. The reservation is inconsistent.",
          code: "INVENTORY_RELEASE_FAILED",
        });
      }

      if (listing.status === "sold" && listing.quantity > 0) {
        listing.status = "active";
        await listing.save();
      }

      deal.inventoryReserved = false;
    }

    deal.status = status;

    if (status === "completed") {
      // A completed deal is only valid after payment has been received.
      // Keep the persisted deal state consistent even when older/admin
      // clients omit paymentStatus from the completion request.
      deal.paymentStatus = "received";
    } else if (paymentStatus !== undefined) {
      deal.paymentStatus = paymentStatus;
    }

    await deal.save();

    if (paymentRecord && requestedPaymentStatus === "received") {
      paymentRecord.status = "received";
      paymentRecord.receivedAt = paymentRecord.receivedAt || new Date();
      paymentRecord.confirmedBy = req.user?._id || null;
      await paymentRecord.save();
    }

    await createActivityLog({
      actorId: req.user?._id,
      action: "deal_status_changed",
      entityType: "deal",
      entityId: deal._id,
      before: {
        status: previousStatus,
        paymentStatus: previousPaymentStatus,
      },
      after: {
        status: deal.status,
        paymentStatus: deal.status === "completed" ? "received" : deal.paymentStatus,
      },
      metadata: {
        quantity: deal.quantity,
        agreedPrice: deal.agreedPrice,
        commissionRate: deal.commissionRate,
        commissionAmount: deal.commissionAmount,
        serviceFee: deal.serviceFee,
        creditSubtotal: deal.creditSubtotal,
        finalAmount: deal.finalAmount,
        inventoryReserved: deal.inventoryReserved,
      },
    });

    /*
     * Keep the legacy PurchaseRequest flow synchronized.
     */
    if (deal.requestId) {
      const request = await PurchaseRequest.findById(deal.requestId);

      if (request) {
        const requestStatusMap = {
          matched: "matched",
          negotiating: "negotiating",
          terms_agreed: "approved",
          payment_coordination: "approved",
          completed: "completed",
          cancelled: "cancelled",
        };

        const nextRequestStatus = requestStatusMap[status];

        if (nextRequestStatus) {
          request.status = nextRequestStatus;

          // A terminal deal makes any later/stale quotation non-actionable.
          // If the current quotation is the one locked into this deal, keep it
          // visibly accepted; otherwise supersede the stale revision.
          if (status === "completed" && request.offer?.version) {
            const dealQuotationVersion = Number(deal.quotationVersion || 0);
            const currentOfferVersion = Number(request.offer.version || 0);

            if (dealQuotationVersion && currentOfferVersion === dealQuotationVersion) {
              request.offer.status = "accepted";
              request.offer.acceptedAt = request.offer.acceptedAt || deal.createdAt || new Date();
              const historyItem = request.offerHistory?.find(
                (item) => Number(item.version) === currentOfferVersion,
              );
              if (historyItem) {
                historyItem.status = "accepted";
                historyItem.acceptedAt = historyItem.acceptedAt || request.offer.acceptedAt;
              }
            } else if (["sent", "draft"].includes(request.offer.status)) {
              request.offer.status = "superseded";
              const historyItem = request.offerHistory?.find(
                (item) => Number(item.version) === currentOfferVersion,
              );
              if (historyItem && historyItem.status === "sent") {
                historyItem.status = "superseded";
              }
            }
          }

          await request.save();
        }
      }
    }

    await notifyDealStatusChange({
      deal,
      status: deal.status,
      paymentStatus: deal.status === "completed" ? "received" : deal.paymentStatus,
      actor: req.user?._id || null,
    });

    return res.status(200).json({
      success: true,
      message: "Deal updated successfully",
      deal,
    });
  } catch (error) {
    console.error("Update deal status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update deal",
      code: "DEAL_UPDATE_FAILED",
    });
  }
};

export const getSellerDeals = async (req, res) => {
try {
const deals = await Deal.find({
sellerId: req.user._id,
})
.populate(
"listingId",
"category quantity price location complianceYear validTill reservedQuantity",
)
.populate("requestId", "quantity status notes createdAt")
.populate(
"requirementId",
"quantity matchedQuantity remainingQuantity status",
)
.sort({
createdAt: -1,
})
.lean();

const sellerDeals = deals.map((deal) => ({
  _id: deal._id,
  requestId: deal.requestId?._id || deal.requestId || null,

  listing: deal.listingId
    ? {
        _id: deal.listingId._id,

        category: deal.listingId.category,

        quantity: deal.listingId.quantity,

        totalQuantity:
          deal.listingId.totalQuantity ??
          deal.listingId.quantity,

        reservedQuantity: deal.listingId.reservedQuantity || 0,

        availableQuantity: Math.max(
          0,
          Number(deal.listingId.quantity || 0) -
            Number(deal.listingId.reservedQuantity || 0),
        ),

        price: deal.listingId.price,

        location: deal.listingId.location,

        complianceYear: deal.listingId.complianceYear,

        validTill: deal.listingId.validTill,
      }
    : null,

  quantity: deal.quantity,

  // Sellers only see their own negotiated/selling economics.
  agreedPrice: deal.sellerPricePerUnit ?? deal.agreedPrice,

  sellerSubtotal: deal.sellerSubtotal ?? deal.creditSubtotal ?? Number(deal.quantity || 0) * Number(deal.agreedPrice || 0),

  status: deal.status,

  inventoryReserved: Boolean(deal.inventoryReserved),

  notes: deal.notes || "",

  createdAt: deal.createdAt,

  completedAt: deal.completedAt || null,
}));

return res.status(200).json({
  success: true,
  count: sellerDeals.length,
  deals: sellerDeals,
});

} catch (error) {
console.error("Get seller deals error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to fetch seller deals",
});

}
};

/*

GET BUYER DEALS

--------------------------------------------------------------------------



Buyers only see their own deals.

Seller private contact information is never returned.

--------------------------------------------------------------------------

*/

export const getBuyerDeals = async (req, res) => {
try {
const deals = await Deal.find({
buyerId: req.user._id,
})
.populate(
"listingId",
"category quantity price location complianceYear validTill reservedQuantity",
)
.populate(
"requirementId",
"quantity matchedQuantity remainingQuantity status",
)
.sort({
createdAt: -1,
})
.lean();

const buyerDeals = deals.map((deal) => ({
  _id: deal._id,
  requestId: deal.requestId?._id || deal.requestId || null,

  listing: deal.listingId
    ? {
        _id: deal.listingId._id,

        category: deal.listingId.category,

        quantity: deal.listingId.quantity,

        totalQuantity:
          deal.listingId.totalQuantity ??
          deal.listingId.quantity,

        reservedQuantity: deal.listingId.reservedQuantity || 0,

        availableQuantity: Math.max(
          0,
          Number(deal.listingId.quantity || 0) -
            Number(deal.listingId.reservedQuantity || 0),
        ),

        price: publicListingPrice(deal.listingId),

        location: deal.listingId.location,

        complianceYear: deal.listingId.complianceYear,

        validTill: deal.listingId.validTill,
      }
    : null,

  quantity: deal.quantity,

  // Buyer sees only the all-in price, never the internal seller price or margin.
  agreedPrice: deal.buyerPricePerUnit ?? (Number(deal.quantity || 0) > 0 ? Number(deal.finalAmount || 0) / Number(deal.quantity || 1) : deal.agreedPrice),

  creditSubtotal: deal.buyerSubtotal ?? deal.finalAmount,

  finalAmount: deal.finalAmount,

  status: deal.status,

  paymentStatus: deal.status === "completed" ? "received" : deal.paymentStatus,

  inventoryReserved: Boolean(deal.inventoryReserved),

  notes: deal.notes || "",

  createdAt: deal.createdAt,

  completedAt: deal.completedAt || null,
}));

return res.status(200).json({
  success: true,
  count: buyerDeals.length,
  deals: buyerDeals,
});

} catch (error) {
console.error("Get buyer deals error:", error);

return res.status(500).json({
  success: false,
  message: "Failed to fetch buyer deals",
});

}
};
