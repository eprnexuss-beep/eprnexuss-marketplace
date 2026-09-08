import mongoose from "mongoose";

const commercialTermsSchema = new mongoose.Schema(
  {
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    agreedPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    creditSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
    },

    quotationVersion: {
      type: Number,
      default: null,
      min: 1,
    },

    lockedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const dealSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      default: null,
      index: true,
    },

    inventoryReserved: {
      type: Boolean,
      default: false,
      index: true,
    },

    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BuyerRequirement",
      default: null,
      index: true,
    },

    matchedListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerListing",
      default: null,
      index: true,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerListing",
      required: true,
      index: true,
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0,
    },

    agreedPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Seller-side unit price is the internal source of truth.
    sellerPricePerUnit: { type: Number, default: null, min: 0 },
    buyerPricePerUnit: { type: Number, default: null, min: 0 },
    marginRate: { type: Number, default: 10, min: 0, max: 100 },
    marginType: {
      type: String,
      enum: ["percentage", "value"],
      default: "percentage",
    },
    marginValue: { type: Number, default: 10, min: 0 },
    marginAmount: { type: Number, default: 0, min: 0 },
    sellerSubtotal: { type: Number, default: 0, min: 0 },
    buyerSubtotal: { type: Number, default: 0, min: 0 },

    // Backward compatibility only. The current business model uses a
    // manually entered fixed commissionAmount, not a percentage.
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    serviceFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * Snapshot of the exact commercial terms accepted by the buyer.
     * This is the deal's financial source of truth after acceptance.
     */
    commercialTerms: {
      type: commercialTermsSchema,
      default: null,
    },

    commercialTermsLocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    commercialTermsLockedAt: {
      type: Date,
      default: null,
    },

    quotationVersion: {
      type: Number,
      default: null,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "matched",
        "negotiating",
        "terms_agreed",
        "payment_coordination",
        "completed",
        "cancelled",
      ],
      default: "matched",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "initiated", "received", "failed"],
      default: "pending",
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

dealSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
dealSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
dealSchema.index({ paymentStatus: 1, status: 1 });
dealSchema.index({ requestId: 1 }, { unique: true, sparse: true });

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;
