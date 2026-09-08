import mongoose from "mongoose";
import Watchlist from "../models/Watchlist.js";
import SellerListing from "../models/SellerListing.js";

const isValidId = (value) =>
  Boolean(value) && mongoose.Types.ObjectId.isValid(value);

export const getWatchlist = async (req, res) => {
  try {
    const items = await Watchlist.find({ buyerId: req.user._id })
      .populate({
        path: "listingId",
        populate: {
          path: "sellerId",
          select: "name company verifiedBadge kycStatus",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const publicPrice = (listing) => {
  const base = Number(listing?.price || 0);
  const marginType = listing?.publicMarginType;
  const marginValue = Number(listing?.publicMarginValue);

  if (marginType === "value" && Number.isFinite(marginValue) && marginValue >= 0) {
    return Math.round((base + marginValue) * 100) / 100;
  }

  const rate = Number.isFinite(Number(listing?.publicMarkupRate))
    ? Number(listing.publicMarkupRate)
    : marginType === "percentage" && Number.isFinite(marginValue)
      ? marginValue
      : 10;

  return Math.round(base * (1 + Math.max(0, rate) / 100) * 100) / 100;
};

    const listings = items
      .map((item) => {
        if (!item.listingId) return null;
        const { price: _internalPrice, publicMarkupRate: _rate, publicMarginType: _marginType, publicMarginValue: _marginValue, ...safe } =
          item.listingId;
        return {
          ...safe,
          price: publicPrice(item.listingId),
          watchlistId: item._id,
          savedAt: item.createdAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Get watchlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch watchlist",
    });
  }
};

export const addToWatchlist = async (req, res) => {
  try {
    const { listingId } = req.body || {};

    if (!isValidId(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listingId",
      });
    }

    const listing = await SellerListing.findById(listingId)
      .select("_id status sellerId quantity")
      .lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (String(listing.sellerId) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot save your own listing",
      });
    }

    const item = await Watchlist.findOneAndUpdate(
      {
        buyerId: req.user._id,
        listingId,
      },
      {
        $setOnInsert: {
          buyerId: req.user._id,
          listingId,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).populate({
      path: "listingId",
      populate: {
        path: "sellerId",
        select: "name company verifiedBadge kycStatus",
      },
    });

    return res.status(200).json({
      success: true,
      saved: true,
      message: "Listing saved to your watchlist",
      item,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        success: true,
        saved: true,
        message: "Listing is already in your watchlist",
      });
    }

    console.error("Add to watchlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save listing",
    });
  }
};

export const removeFromWatchlist = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!isValidId(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listingId",
      });
    }

    const result = await Watchlist.deleteOne({
      buyerId: req.user._id,
      listingId,
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Listing is not in your watchlist",
      });
    }

    return res.status(200).json({
      success: true,
      saved: false,
      message: "Listing removed from your watchlist",
    });
  } catch (error) {
    console.error("Remove from watchlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove listing from watchlist",
    });
  }
};

export const getWatchlistIds = async (req, res) => {
  try {
    const items = await Watchlist.find({ buyerId: req.user._id })
      .select("listingId")
      .lean();

    return res.status(200).json({
      success: true,
      listingIds: items.map((item) => String(item.listingId)),
    });
  } catch (error) {
    console.error("Get watchlist ids error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved listing ids",
    });
  }
};
