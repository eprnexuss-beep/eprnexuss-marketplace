import mongoose from "mongoose";
import BuyerRequirement from "../models/BuyerRequirement.js";
import SellerListing from "../models/SellerListing.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { notifyMatchesForRequirement } from "../services/matching.service.js";

const publicPrice = (listing) => {
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

const categoryMap = {
  plastic: "Plastic",
  battery: "Battery",
  "e-waste": "E-Waste",
  "e waste": "E-Waste",
  elv: "ELV",
  "used oil": "Used Oil",
  tyre: "Tyre",
};

/**
 * Create a buyer requirement
 */
export const createRequirement = async (req, res) => {
  try {
    const { type, quantity, budget, location, complianceYear, notes } =
      req.body || {};

    const normalizedType = categoryMap[type?.trim().toLowerCase()];

    if (!normalizedType) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid credit type. Allowed types: Plastic, Battery, Used Oil",
      });
    }

    if (req.user.role !== "buyer") {
      return res.status(403).json({
        success: false,
        message: "Only buyers can post requirements",
      });
    }

    if (!type?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Credit type is required",
      });
    }

    const parsedQuantity = Number(quantity);
    const parsedBudget = Number(budget);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Required quantity must be a positive number",
      });
    }

    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      return res.status(400).json({
        success: false,
        message: "Budget must be a positive number",
      });
    }

    if (!complianceYear?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Compliance year is required",
      });
    }

    const requirement = await BuyerRequirement.create({
      buyerId: req.user._id,
      type: normalizedType,
      quantity: parsedQuantity,
      budget: parsedBudget,
      location: location?.trim() || "",
      matchedQuantity: 0,
      remainingQuantity: parsedQuantity,
      matchedListings: [],
      complianceYear: complianceYear.trim(),
      notes: notes?.trim() || "",
      status: "open",
    });

    void notifyMatchesForRequirement(requirement._id).catch((error) => {
      console.error("Requirement match notification error:", error);
    });

    return res.status(201).json({
      success: true,
      message: "Requirement posted successfully",
      requirement,
    });
  } catch (error) {
    console.error("Create requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create requirement",
    });
  }
};

/**
 * Get requirements belonging to the logged-in buyer
 */
export const getBuyerRequirements = async (req, res) => {
  try {
    const requirements = await BuyerRequirement.find({
      buyerId: req.user._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requirements.length,
      requirements,
    });
  } catch (error) {
    console.error("Get buyer requirements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch buyer requirements",
    });
  }
};

/**
 * Match a seller listing to a buyer requirement
 *
 * Available listing quantity is:
 *
 *   quantity - reservedQuantity
 *
 * Example:
 *
 *   total quantity      = 60
 *   reserved quantity   = 40
 *   available quantity  = 20
 *
 * A requirement cannot be matched for more than
 * the currently available quantity.
 */

/**
 * Get all buyer requirements for the admin matching workspace.
 */
export const getAdminRequirements = async (req, res) => {
  try {
    const requirements = await BuyerRequirement.find()
      .populate("buyerId", "name company email phone role")
      .populate({
        path: "matchedListings.listingId",
        select:
          "sellerId category totalQuantity quantity reservedQuantity price publicMarkupRate publicMarginType publicMarginValue location complianceYear validTill status",
        populate: {
          path: "sellerId",
          select: "name company email verifiedBadge",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requirements.length,
      requirements,
    });
  } catch (error) {
    console.error("Get admin requirements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch buyer requirements",
    });
  }
};

export const matchRequirement = async (req, res) => {
  try {
    const { requirementId } = req.params;
    const { listingId, quantity } = req.body || {};

    if (!requirementId || !mongoose.Types.ObjectId.isValid(requirementId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirementId",
      });
    }

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid listingId is required",
      });
    }

    const requirement = await BuyerRequirement.findById(requirementId);

    if (!requirement) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found",
      });
    }

    const allowedStatuses = ["open", "matching", "partially_matched"];

    if (!allowedStatuses.includes(requirement.status)) {
      return res.status(400).json({
        success: false,
        message: "This requirement is no longer available for matching",
      });
    }

    const matchedListings = Array.isArray(requirement.matchedListings)
      ? requirement.matchedListings
      : [];

    const alreadyMatched = matchedListings.some(
      (match) => String(match.listingId) === String(listingId),
    );

    if (alreadyMatched) {
      return res.status(409).json({
        success: false,
        message: "This listing is already matched to the requirement",
      });
    }

    const listing = await SellerListing.findOne({
      _id: listingId,
      status: "active",
      validTill: { $gte: new Date() },
      quantity: { $gt: 0 },
    }).populate("sellerId", "name company verifiedBadge");

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Selected listing is no longer active or available",
      });
    }

    const normalize = (value) => String(value || "").trim().toLowerCase();

    if (normalize(listing.category) !== normalize(requirement.type)) {
      return res.status(400).json({
        success: false,
        message: "Selected listing credit type does not match the requirement",
      });
    }

    const listingPrice = publicPrice(listing);
    const buyerBudget = Number(requirement.budget);

    if (
      !Number.isFinite(listingPrice) ||
      listingPrice <= 0 ||
      listingPrice > buyerBudget
    ) {
      return res.status(400).json({
        success: false,
        message:
          listingPrice > buyerBudget
            ? "Selected listing price exceeds the buyer budget"
            : "Selected listing has an invalid price",
      });
    }

    if (listing.complianceYear !== requirement.complianceYear) {
      return res.status(400).json({
        success: false,
        message: "Compliance year does not match",
      });
    }

    const requirementLocation = normalize(requirement.location);

    const listingLocation = normalize(listing.location);

    const sameLocation =
      !requirementLocation ||
      requirementLocation === "any location" ||
      requirementLocation === listingLocation;

    if (!sameLocation) {
      return res.status(400).json({
        success: false,
        message: "Listing location does not match the requirement",
      });
    }

    const requiredQuantity = Number(requirement.quantity);
    const alreadyMatchedQuantity = Number(requirement.matchedQuantity || 0);

    const remainingRequirementQuantity = Math.max(
      0,
      requiredQuantity - alreadyMatchedQuantity,
    );

    if (remainingRequirementQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Requirement is already fully matched",
      });
    }

    const requestedQuantity = Number(quantity);
    const hasExplicitQuantity =
      Number.isFinite(requestedQuantity) && requestedQuantity > 0;

    // Reserve inventory atomically so two admins cannot match the same stock.
    const desiredQuantity = hasExplicitQuantity
      ? requestedQuantity
      : Math.min(
          remainingRequirementQuantity,
          Math.max(
            0,
            Number(listing.quantity || 0) -
              Number(listing.reservedQuantity || 0),
          ),
        );

    if (!Number.isFinite(desiredQuantity) || desiredQuantity <= 0) {
      return res.status(409).json({
        success: false,
        message: "No available quantity remains for this listing",
      });
    }

    if (desiredQuantity > remainingRequirementQuantity) {
      return res.status(400).json({
        success: false,
        message: `Requirement only needs ${remainingRequirementQuantity} MT`,
        remainingRequirementQuantity,
        requestedQuantity: desiredQuantity,
      });
    }

    const reservedListing = await SellerListing.findOneAndUpdate(
      {
        _id: listing._id,
        status: "active",
        validTill: { $gte: new Date() },
        $expr: {
          $gte: [
            {
              $subtract: [
                "$quantity",
                { $ifNull: ["$reservedQuantity", 0] },
              ],
            },
            desiredQuantity,
          ],
        },
      },
      {
        $inc: {
          reservedQuantity: desiredQuantity,
        },
      },
      {
        new: true,
      },
    ).populate("sellerId", "name company verifiedBadge");

    if (!reservedListing) {
      const freshListing = await SellerListing.findById(listing._id).select(
        "quantity reservedQuantity",
      );

      const availableQuantity = freshListing
        ? Math.max(
            0,
            Number(freshListing.quantity || 0) -
              Number(freshListing.reservedQuantity || 0),
          )
        : 0;

      return res.status(409).json({
        success: false,
        message:
          availableQuantity > 0
            ? `Only ${availableQuantity} MT is currently available from this listing`
            : "Selected listing has no available quantity",
        availableQuantity,
        requestedQuantity: desiredQuantity,
      });
    }

    try {
      const previousRequirementStatus = requirement.status;
      const previousMatchedQuantity = Number(
        requirement.matchedQuantity || 0,
      );
      const previousRemainingQuantity = Number(
        requirement.remainingQuantity ??
          Math.max(0, requiredQuantity - previousMatchedQuantity),
      );

      requirement.matchedListings.push({
        listingId: reservedListing._id,
        quantity: desiredQuantity,
        matchedAt: new Date(),
      });

      requirement.matchedQuantity =
        previousMatchedQuantity + desiredQuantity;

      requirement.remainingQuantity = Math.max(
        0,
        requiredQuantity - requirement.matchedQuantity,
      );

      requirement.status =
        requirement.remainingQuantity === 0
          ? "fully_matched"
          : "partially_matched";

      await requirement.save();

      await createActivityLog({
        actorId: req.user._id,
        action: "requirement_matched",
        entityType: "buyer_requirement",
        entityId: requirement._id,
        before: {
          status: previousRequirementStatus,
          matchedQuantity: previousMatchedQuantity,
          remainingQuantity: previousRemainingQuantity,
        },
        after: {
          status: requirement.status,
          matchedQuantity: requirement.matchedQuantity,
          remainingQuantity: requirement.remainingQuantity,
        },
        metadata: {
          listingId: reservedListing._id,
          listingCategory: reservedListing.category,
          listingPrice: reservedListing.price,
          matchQuantity: desiredQuantity,
          totalListingQuantity:
            Number(reservedListing.totalQuantity ?? reservedListing.quantity ?? 0),
          currentListingQuantity: Number(reservedListing.quantity || 0),
          reservedListingQuantity: Number(
            reservedListing.reservedQuantity || 0,
          ),
          availableListingQuantity: Math.max(
            0,
            Number(reservedListing.quantity || 0) -
              Number(reservedListing.reservedQuantity || 0),
          ),
          buyerId: requirement.buyerId,
          sellerId: reservedListing.sellerId?._id || reservedListing.sellerId,
          complianceYear: requirement.complianceYear,
          location: requirement.location || "",
        },
      });

      return res.status(200).json({
        success: true,
        message:
          requirement.status === "fully_matched"
            ? "Requirement fully matched and inventory reserved"
            : "Seller listing partially matched and inventory reserved",
        requirement,
        matchedQuantity: desiredQuantity,
        totalMatchedQuantity: requirement.matchedQuantity,
        remainingQuantity: requirement.remainingQuantity,
        listingInventory: {
          totalQuantity: Number(
            reservedListing.totalQuantity ?? reservedListing.quantity ?? 0,
          ),
          currentQuantity: Number(reservedListing.quantity || 0),
          reservedQuantity: Number(reservedListing.reservedQuantity || 0),
          availableQuantity: Math.max(
            0,
            Number(reservedListing.quantity || 0) -
              Number(reservedListing.reservedQuantity || 0),
          ),
        },
        matchedListing: {
          _id: reservedListing._id,
          category: reservedListing.category,
          quantity: Number(reservedListing.quantity || 0),
          totalQuantity: Number(
            reservedListing.totalQuantity ?? reservedListing.quantity ?? 0,
          ),
          reservedQuantity: Number(reservedListing.reservedQuantity || 0),
          availableQuantity: Math.max(
            0,
            Number(reservedListing.quantity || 0) -
              Number(reservedListing.reservedQuantity || 0),
          ),
          matchedQuantity: desiredQuantity,
          price: reservedListing.price,
          location: reservedListing.location,
          complianceYear: reservedListing.complianceYear,
          validTill: reservedListing.validTill,
          seller: {
            _id: reservedListing.sellerId?._id,
            company:
              reservedListing.sellerId?.company ||
              reservedListing.sellerId?.name ||
              "Verified Seller",
            verifiedBadge:
              reservedListing.sellerId?.verifiedBadge || false,
          },
        },
      });
    } catch (error) {
      // Requirement save failed after reservation. Release the reserved stock.
      await SellerListing.updateOne(
        { _id: reservedListing._id },
        { $inc: { reservedQuantity: -desiredQuantity } },
      );
      throw error;
    }
  } catch (error) {
    console.error("Match requirement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to match seller listing",
    });
  }
};