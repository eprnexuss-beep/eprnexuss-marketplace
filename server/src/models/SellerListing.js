import mongoose from "mongoose";

const sellerListingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: [true, "Credit type is required"],
      trim: true,
    },

    totalQuantity: {
      type: Number,
      required: false,
      min: [0, "Total quantity cannot be negative"],
      default: null,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },

    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    // Internal platform markup used only for the public marketplace price.
    // Sellers always see the original `price`; buyers see the marked-up price.
    publicMarkupRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    // Internal listing-publication margin selected by admin at approval time.
    // "percentage" adds a percentage of the seller price per MT.
    // "value" adds a fixed INR amount per MT.
    publicMarginType: {
      type: String,
      enum: ["percentage", "value"],
      default: "percentage",
    },

    publicMarginValue: {
      type: Number,
      default: 10,
      min: 0,
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    complianceYear: {
      type: String,
      required: [true, "Compliance year is required"],
      trim: true,
    },

    validTill: {
      type: Date,
      required: [true, "Valid till date is required"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending_review", "active", "paused", "rejected", "expired", "sold", "cancelled"],
      default: "pending_review",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

sellerListingSchema.pre("validate", function () {
  if (this.totalQuantity == null && this.quantity != null) {
    this.totalQuantity = this.quantity;
  }
});

const SellerListing = mongoose.model("SellerListing", sellerListingSchema);

export default SellerListing;