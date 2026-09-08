import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    dealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
      required: true,
      unique: true,
      index: true,
    },
    amount: {
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
    method: {
      type: String,
      enum: ["bank_transfer", "upi", "other"],
      default: "bank_transfer",
    },
    status: {
      type: String,
      enum: ["pending", "initiated", "received", "failed"],
      default: "pending",
      index: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    proofFileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
    proofFileUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    proofMimeType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    proofFileSize: {
      type: Number,
      min: 0,
      default: 0,
    },
    proofSubmittedAt: {
      type: Date,
      default: null,
    },
    initiatedAt: {
      type: Date,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Internal settlement record. Never exposed to buyer/seller.
    sellerPayoutAmount: { type: Number, default: 0, min: 0 },
    platformMarginAmount: { type: Number, default: 0, min: 0 },
    sellerPayoutStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    sellerPayoutReference: { type: String, trim: true, maxlength: 160, default: "" },
    sellerPaidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
