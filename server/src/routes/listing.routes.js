import express from "express";

import { protect, optionalProtect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { requireVerifiedSeller } from "../middleware/verifiedUser.middleware.js";
import { uploadDocument } from "../middleware/upload.middleware.js";

import {
  createListing,
  getActiveListings,
  getListingById,
  getSellerListings,
  updateSellerListing,
  updateSellerListingStatus,
} from "../controllers/listing.controller.js";

const router = express.Router();

// Marketplace reads are intentionally public.
router.get("/", optionalProtect, getActiveListings);

// IMPORTANT: Keep the seller-specific route before "/:listingId".
// Otherwise Express treats "seller" as a listingId and calls
// getListingById("seller"), which causes the seller dashboard to
// receive a 500 instead of the seller's listings.
router.get(
  "/seller",
  protect,
  authorize("seller"),
  requireVerifiedSeller,
  getSellerListings,
);

router.get("/:listingId", optionalProtect, getListingById);

router.post(
  "/",
  protect,
  authorize("seller"),
  requireVerifiedSeller,
  uploadDocument.single("document"),
  createListing,
);

router.patch(
  "/:listingId",
  protect,
  authorize("seller"),
  requireVerifiedSeller,
  updateSellerListing,
);

router.patch(
  "/:listingId/status",
  protect,
  authorize("seller"),
  requireVerifiedSeller,
  updateSellerListingStatus,
);

export default router;
