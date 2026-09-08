import mongoose from "mongoose";

const offerHistorySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      min: 1,
    },

    creditPricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },

    creditSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    serviceFee: {
      type: Number,
      required: true,
      min: 0,
    },

    // Internal commercial fields. These are never exposed to buyer/seller APIs.
    sellerPricePerUnit: { type: Number, default: null, min: 0 },
    sellerSubtotal: { type: Number, default: null, min: 0 },
    marginRate: { type: Number, default: 10, min: 0, max: 100 },
    marginType: {
      type: String,
      enum: ["percentage", "value"],
      default: "percentage",
    },
    marginValue: { type: Number, default: 10, min: 0 },
    marginAmount: { type: Number, default: 0, min: 0 },
    buyerPricePerUnit: { type: Number, default: null, min: 0 },
    buyerSubtotal: { type: Number, default: null, min: 0 },

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

    sentAt: {
      type: Date,
      required: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["sent", "accepted", "expired", "superseded", "cancelled"],
      default: "sent",
    },
  },
  { _id: false },
);

const purchaseRequestSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerListing",
      required: true,
      index: true,
    },

    quantity: {
      type: Number,
      required: [true, "Requested quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },

    contactPerson: {
      type: String,
      required: [true, "Contact person is required"],
      trim: true,
    },

    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },

    gstNumber: {
      type: String,
      required: [true, "GST number is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "reviewing",
        "matched",
        "negotiating",
        "offer_sent",
        "offer_accepted",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Current EPR Nexus quotation.
     *
     * IMPORTANT:
     * Buyers never edit these values. Admin creates/revises them.
     */
    offer: {
      creditPricePerUnit: {
        type: Number,
        default: null,
        min: 0,
      },

      creditSubtotal: {
        type: Number,
        default: null,
        min: 0,
      },

      serviceFee: {
        type: Number,
        default: null,
        min: 0,
      },

      // Internal-only seller economics. Never serialize these to buyer/seller clients.
      sellerPricePerUnit: { type: Number, default: null, min: 0 },
      sellerSubtotal: { type: Number, default: null, min: 0 },
      marginRate: { type: Number, default: 10, min: 0, max: 100 },
      marginType: {
        type: String,
        enum: ["percentage", "value"],
        default: "percentage",
      },
      marginValue: { type: Number, default: 10, min: 0 },
      marginAmount: { type: Number, default: 0, min: 0 },
      buyerPricePerUnit: { type: Number, default: null, min: 0 },
      buyerSubtotal: { type: Number, default: null, min: 0 },

      finalAmount: {
        type: Number,
        default: null,
        min: 0,
      },

      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
      },

      version: {
        type: Number,
        default: 0,
        min: 0,
      },

      sentAt: {
        type: Date,
        default: null,
      },

      acceptedAt: {
        type: Date,
        default: null,
      },

      expiresAt: {
        type: Date,
        default: null,
      },

      lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      note: {
        type: String,
        trim: true,
        default: "",
        maxlength: 2000,
      },

      status: {
        type: String,
        enum: [
          "draft",
          "sent",
          "accepted",
          "expired",
          "superseded",
          "cancelled",
        ],
        default: "draft",
      },
    },

    /*
     * Immutable commercial history.
     *
     * Every Admin quotation/revision gets a new version.
     * Never overwrite an accepted historical version.
     */
    offerHistory: {
      type: [offerHistorySchema],
      default: [],
    },

    /*
     * Once a buyer accepts a quotation, the commercial terms used to create
     * the deal must be locked to that accepted quotation version.
     */
    acceptedOfferVersion: {
      type: Number,
      default: null,
      min: 1,
    },

    acceptedOfferSnapshot: {
      creditPricePerUnit: {
        type: Number,
        default: null,
        min: 0,
      },

      creditSubtotal: {
        type: Number,
        default: null,
        min: 0,
      },

      serviceFee: {
        type: Number,
        default: null,
        min: 0,
      },

      sellerPricePerUnit: { type: Number, default: null, min: 0 },
      sellerSubtotal: { type: Number, default: null, min: 0 },
      marginRate: { type: Number, default: 10, min: 0, max: 100 },
      marginType: {
        type: String,
        enum: ["percentage", "value"],
        default: "percentage",
      },
      marginValue: { type: Number, default: 10, min: 0 },
      marginAmount: { type: Number, default: 0, min: 0 },
      buyerPricePerUnit: { type: Number, default: null, min: 0 },
      buyerSubtotal: { type: Number, default: null, min: 0 },

      finalAmount: {
        type: Number,
        default: null,
        min: 0,
      },

      currency: {
        type: String,
        default: "INR",
        trim: true,
        uppercase: true,
      },

      version: {
        type: Number,
        default: null,
        min: 1,
      },

      acceptedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  },
);

purchaseRequestSchema.index({ buyerId: 1, status: 1, createdAt: -1 });
purchaseRequestSchema.index({ listingId: 1, status: 1, createdAt: -1 });
purchaseRequestSchema.index({ "offer.version": 1 });
purchaseRequestSchema.index({ acceptedOfferVersion: 1 });

const PurchaseRequest = mongoose.model(
  "PurchaseRequest",
  purchaseRequestSchema,
);

export default PurchaseRequest;