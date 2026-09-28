import mongoose from "mongoose";

const matchedListingSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerListing",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    matchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const buyerRequirementSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: [true, "Credit type is required"],
      trim: true,
    },

    classificationType: {
      type: String,
      trim: true,
      default: "",
    },

    classification: {
      type: String,
      trim: true,
      default: "",
    },

    classificationCode: {
      type: String,
      trim: true,
      default: "",
    },

    quantity: {
      type: Number,
      required: [true, "Required quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },

    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget cannot be negative"],
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    complianceYear: {
      type: String,
      required: [true, "Compliance year is required"],
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [
        2000,
        "Notes cannot exceed 2000 characters",
      ],
    },

    matchedListings: {
      type: [matchedListingSchema],
      default: [],
    },

    matchedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "open",
        "matching",
        "partially_matched",
        "fully_matched",
        "closed",
        "cancelled",
      ],
      default: "open",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const BuyerRequirement = mongoose.model(
  "BuyerRequirement",
  buyerRequirementSchema,
);

export default BuyerRequirement;