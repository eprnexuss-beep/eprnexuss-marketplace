import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "gst_certificate",
        "company_registration",
        "epr_certificate",
        "authorization",
        "other",
      ],
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    // Structured EPR certificate metadata used for listing verification.
    // Optional at schema level so existing documents remain valid.
    certificateNumber: {
      type: String,
      trim: true,
      default: "",
    },

    sourcePortal: {
      type: String,
      trim: true,
      default: "",
    },

    certificateQuantity: {
      type: Number,
      min: 0,
      default: null,
    },

    certificateIssuedDate: {
      type: Date,
      default: null,
    },

    certificateValidTill: {
      type: Date,
      default: null,
    },

    certificateCategory: {
      type: String,
      trim: true,
      default: "",
    },

    certificateClassificationType: {
      type: String,
      trim: true,
      default: "",
    },

    certificateClassification: {
      type: String,
      trim: true,
      default: "",
    },

    certificateClassificationCode: {
      type: String,
      trim: true,
      default: "",
    },

    certificateComplianceYear: {
      type: String,
      trim: true,
      default: "",
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model(
  "Document",
  documentSchema
);

export default Document;