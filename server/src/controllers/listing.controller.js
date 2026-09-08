import mongoose from "mongoose";
import SellerListing from "../models/SellerListing.js";
import Document from "../models/Document.js";
import { createActivityLog } from "../services/activityLog.service.js";
import { createNotifications } from "../services/notification.service.js";
import { notifyMatchesForListing } from "../services/matching.service.js";

/*

Credit category normalization

--------------------------------------------------------------------------

*/

const categoryMap = {
  plastic: "Plastic",
  battery: "Battery",
  "e-waste": "E-Waste",
  "e waste": "E-Waste",
  elv: "ELV",
  "used oil": "Used Oil",
  tyre: "Tyre",
};

const DEFAULT_PUBLIC_MARKUP_RATE = 10;
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
      : DEFAULT_PUBLIC_MARKUP_RATE;

  return Math.round(
    base * (1 + Math.max(0, rate) / 100) * 100,
  ) / 100;
};

const sanitizeSellerListing = (listing) => {
  const value = listing?.toObject ? listing.toObject() : { ...(listing || {}) };
  const { publicMarkupRate: _rate, publicMarginType: _marginType, publicMarginValue: _marginValue, ...safe } = value;
  return safe;
};

/*

Create seller listing

--------------------------------------------------------------------------

*/

export const createListing = async (req, res) => {
try {
const {
category,
quantity,
price,
location,
complianceYear,
validTill,
description,
certificateNumber,
sourcePortal,
certificateQuantity,
certificateIssuedDate,
certificateValidTill,
} = req.body || {};

/*
|--------------------------------------------------------------------------
| Normalize credit category
|--------------------------------------------------------------------------
*/

const normalizedCategory =
  categoryMap[
    category?.trim().toLowerCase()
  ];

if (!normalizedCategory) {
  return res.status(400).json({
    success: false,
    message:
      "Invalid credit type. Allowed types: Battery, Plastic, E-Waste, ELV, Used Oil, Tyre",
  });
}

/*
|--------------------------------------------------------------------------
| Seller authorization
|--------------------------------------------------------------------------
*/

if (req.user.role !== "seller") {
  return res.status(403).json({
    success: false,
    message:
      "Only sellers can create listings",
  });
}

/*
|--------------------------------------------------------------------------
| KYC check
|--------------------------------------------------------------------------
*/

if (
  req.user.kycStatus !==
  "approved"
) {
  return res.status(403).json({
    success: false,
    message:
      "Your KYC must be approved before creating a listing",
  });
}

/*
|--------------------------------------------------------------------------
| Required fields
|--------------------------------------------------------------------------
*/

if (
  !quantity ||
  !price ||
  !location ||
  !complianceYear ||
  !validTill ||
  !certificateNumber?.trim() ||
  !sourcePortal?.trim() ||
  !certificateQuantity ||
  !certificateIssuedDate ||
  !certificateValidTill
) {
  return res.status(400).json({
    success: false,
    message:
      "Quantity, price, location, compliance year and valid till are required",
  });
}

/*
|--------------------------------------------------------------------------
| Proof document
|--------------------------------------------------------------------------
*/

if (!req.file) {
  return res.status(400).json({
    success: false,
    message:
      "Proof document is required",
  });
}

/*
|--------------------------------------------------------------------------
| Parse values
|--------------------------------------------------------------------------
*/

const parsedQuantity =
  Number(quantity);

const parsedPrice =
  Number(price);

const parsedValidTill =
  new Date(validTill);

const parsedCertificateQuantity =
  Number(certificateQuantity);

const parsedCertificateIssuedDate =
  new Date(certificateIssuedDate);

const parsedCertificateValidTill =
  new Date(certificateValidTill);

if (
  !Number.isFinite(
    parsedQuantity
  ) ||
  parsedQuantity <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Quantity must be a valid positive number",
  });
}

if (
  !Number.isFinite(
    parsedPrice
  ) ||
  parsedPrice <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "Price must be a valid positive number",
  });
}

if (
  !Number.isFinite(parsedCertificateQuantity) ||
  parsedCertificateQuantity <= 0
) {
  return res.status(400).json({
    success: false,
    message: "Certificate quantity must be a valid positive number",
  });
}

if (Number.isNaN(parsedCertificateIssuedDate.getTime())) {
  return res.status(400).json({
    success: false,
    message: "Certificate issue date must be valid",
  });
}

if (Number.isNaN(parsedCertificateValidTill.getTime())) {
  return res.status(400).json({
    success: false,
    message: "Certificate validity date must be valid",
  });
}

if (parsedCertificateIssuedDate > parsedCertificateValidTill) {
  return res.status(400).json({
    success: false,
    message: "Certificate issue date cannot be after certificate validity date",
  });
}

if (parsedCertificateValidTill < new Date()) {
  return res.status(400).json({
    success: false,
    message: "Certificate validity date must be in the future",
  });
}

if (
  Number.isNaN(
    parsedValidTill.getTime()
  )
) {
  return res.status(400).json({
    success: false,
    message:
      "Valid till must be a valid date",
  });
}

if (
  parsedValidTill < new Date()
) {
  return res.status(400).json({
    success: false,
    message:
      "Valid till date must be in the future",
  });
}

/*
|--------------------------------------------------------------------------
| Create proof document
|--------------------------------------------------------------------------
*/

const document =
  await Document.create({
    owner: req.user._id,
    type: "epr_certificate",
    fileName:
      req.file.originalname,
    fileUrl: `/uploads/documents/${req.file.filename}`,
    mimeType:
      req.file.mimetype,
    fileSize:
      req.file.size,
    certificateNumber:
      certificateNumber.trim(),
    sourcePortal:
      sourcePortal.trim(),
    certificateQuantity:
      parsedCertificateQuantity,
    certificateIssuedDate:
      parsedCertificateIssuedDate,
    certificateValidTill:
      parsedCertificateValidTill,
    certificateCategory:
      normalizedCategory,
    certificateComplianceYear:
      complianceYear.trim(),
    verificationStatus:
      "pending",
  });

/*
|--------------------------------------------------------------------------
| Create seller listing
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Use normalizedCategory here.
|--------------------------------------------------------------------------
*/

const listing =
  await SellerListing.create({
    sellerId:
      req.user._id,

    category:
      normalizedCategory,

    totalQuantity:
      parsedQuantity,

    quantity:
      parsedQuantity,

    reservedQuantity: 0,

    price:
      parsedPrice,

    publicMarkupRate: DEFAULT_PUBLIC_MARKUP_RATE,
    publicMarginType: "percentage",
    publicMarginValue: DEFAULT_PUBLIC_MARKUP_RATE,

    location:
      location.trim(),

    complianceYear:
      complianceYear.trim(),

    validTill:
      parsedValidTill,

    description:
      description?.trim() ||
      "",

    documentId:
      document._id,

    status:
      "pending_review",
  });

return res.status(201).json({
  success: true,
  message:
    "Listing submitted successfully for verification",
  listing: sanitizeSellerListing(listing),
});

} catch (error) {
console.error(
"Create listing error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Failed to create listing",
});

}
};

/*

Get pending seller listings

--------------------------------------------------------------------------

*/

export const getPendingListings = async (
req,
res
) => {
try {
const listings =
await SellerListing.find({
status: "pending_review",
})
.populate(
"sellerId",
"name company email phone role kycStatus verifiedBadge"
)
.populate(
"documentId",
"fileName fileUrl mimeType fileSize verificationStatus createdAt certificateNumber sourcePortal certificateQuantity certificateIssuedDate certificateValidTill certificateCategory certificateComplianceYear"
)
.sort({
createdAt: -1,
});

return res.status(200).json({
  success: true,
  count: listings.length,
  listings,
});

} catch (error) {
console.error(
"Get pending listings error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Failed to fetch pending listings",
});

}
};

/*

Approve / reject seller listing

--------------------------------------------------------------------------

*/

export const reviewListing = async (
req,
res
) => {
try {
const {
listingId,
} = req.params;

const {
  status,
  rejectionReason,
  marginType = "percentage",
  marginValue = 10,
} = req.body || {};

if (
  !["active", "rejected"].includes(
    status
  )
) {
  return res.status(400).json({
    success: false,
    message:
      "Status must be active or rejected",
  });
}

if (status === "active") {
  if (!["percentage", "value"].includes(marginType)) {
    return res.status(400).json({
      success: false,
      message: "Margin type must be percentage or value",
      code: "INVALID_MARGIN_TYPE",
    });
  }

  const parsedMarginValue = Number(marginValue);

  if (
    !Number.isFinite(parsedMarginValue) ||
    parsedMarginValue < 0 ||
    (marginType === "percentage" && parsedMarginValue > 100)
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
}

if (
  status === "rejected" &&
  !rejectionReason?.trim()
) {
  return res.status(400).json({
    success: false,
    message:
      "Rejection reason is required",
  });
}

const listing =
  await SellerListing.findById(
    listingId
  );

if (!listing) {
  return res.status(404).json({
    success: false,
    message:
      "Listing not found",
  });
}

if (
  listing.status !==
  "pending_review"
) {
  return res.status(400).json({
    success: false,
    message:
      "This listing has already been reviewed",
  });
}

const previousStatus = listing.status;
const previousRejectionReason =
  listing.rejectionReason || "";

/*
|--------------------------------------------------------------------------
| Prevent publishing an expired listing
|--------------------------------------------------------------------------
*/

if (
  status === "active" &&
  listing.validTill < new Date()
) {
  return res.status(400).json({
    success: false,
    message:
      "Expired listings cannot be approved",
  });
}

/*
|--------------------------------------------------------------------------
| Verify structured certificate metadata before publishing
|--------------------------------------------------------------------------
*/

const listingDocument = await Document.findById(listing.documentId);

if (status === "active") {
  if (!listingDocument || listingDocument.type !== "epr_certificate") {
    return res.status(400).json({
      success: false,
      message: "A valid EPR certificate document is required before approval",
    });
  }

  const categoryMatches =
    listingDocument.certificateCategory?.trim().toLowerCase() ===
    listing.category.trim().toLowerCase();

  const yearMatches =
    listingDocument.certificateComplianceYear?.trim() ===
    listing.complianceYear.trim();

  const quantityCoversListing =
    Number(listingDocument.certificateQuantity) >= Number(listing.quantity);

  const validityCoversListing =
    listingDocument.certificateValidTill &&
    new Date(listingDocument.certificateValidTill) >= new Date(listing.validTill);

  const certificateComplete =
    Boolean(listingDocument.certificateNumber?.trim()) &&
    Boolean(listingDocument.sourcePortal?.trim()) &&
    Number.isFinite(Number(listingDocument.certificateQuantity)) &&
    listingDocument.certificateIssuedDate &&
    listingDocument.certificateValidTill;

  if (!certificateComplete) {
    return res.status(400).json({
      success: false,
      message: "Certificate metadata is incomplete. The seller must provide certificate number, source, quantity and validity dates.",
    });
  }

  if (!categoryMatches || !yearMatches || !quantityCoversListing || !validityCoversListing) {
    return res.status(400).json({
      success: false,
      message: "Certificate details do not match the listing. Review the category, compliance year, quantity and validity before approval.",
      verification: {
        categoryMatches,
        yearMatches,
        quantityCoversListing,
        validityCoversListing,
      },
    });
  }
}

/*
|--------------------------------------------------------------------------
| Prevent publishing a zero quantity listing
|--------------------------------------------------------------------------
*/

if (
  status === "active" &&
  Number(listing.quantity) <= 0
) {
  return res.status(400).json({
    success: false,
    message:
      "A listing must have quantity greater than zero before approval",
  });
}

listing.status = status;

listing.rejectionReason =
  status === "rejected"
    ? rejectionReason.trim()
    : "";

listing.approvedBy =
  req.user._id;

listing.approvedAt =
  new Date();

if (status === "active") {
  const parsedMarginValue = Number(marginValue);
  listing.publicMarginType = marginType;
  listing.publicMarginValue = parsedMarginValue;
  // Keep the legacy rate field synchronized for existing consumers.
  listing.publicMarkupRate =
    marginType === "percentage"
      ? parsedMarginValue
      : Number(listing.price) > 0
        ? (parsedMarginValue / Number(listing.price)) * 100
        : 0;
}

await listing.save();

/*
|--------------------------------------------------------------------------
| Update proof document
|--------------------------------------------------------------------------
*/

const document = listingDocument ||
  await Document.findById(
    listing.documentId
  );

if (document) {
  document.verificationStatus =
    status === "active"
      ? "approved"
      : "rejected";

  document.rejectionReason =
    status === "rejected"
      ? rejectionReason.trim()
      : "";

  document.verifiedBy =
    req.user._id;

  document.verifiedAt =
    new Date();

  await document.save();
}

await createActivityLog({
  actorId: req.user._id,
  action:
    status === "active"
      ? "listing_approved"
      : "listing_rejected",
  entityType: "seller_listing",
  entityId: listing._id,
  before: {
    status: previousStatus,
    rejectionReason: previousRejectionReason,
  },
  after: {
    status: listing.status,
    rejectionReason:
      listing.rejectionReason || "",
    approvedBy: listing.approvedBy,
    approvedAt: listing.approvedAt,
  },
  metadata: {
    sellerId: listing.sellerId,
    category: listing.category,
    quantity: listing.quantity,
    price: listing.price,
    location: listing.location,
    complianceYear: listing.complianceYear,
    marginType:
      status === "active" ? listing.publicMarginType : undefined,
    marginValue:
      status === "active" ? listing.publicMarginValue : undefined,
    publicPrice:
      status === "active"
        ? publicPrice(listing)
        : undefined,
  },
});

// Tell the seller immediately when an admin approves or rejects their listing.
// Notification failures are intentionally non-blocking inside createNotifications.
await createNotifications({
  recipients: [listing.sellerId],
  actor: req.user._id,
  type: status === "active" ? "listing_approved" : "listing_rejected",
  title:
    status === "active"
      ? "Listing approved"
      : "Listing rejected",
  message:
    status === "active"
      ? `${listing.category} listing (${Number(listing.quantity || 0).toLocaleString("en-IN")} MT) has been approved and is now live in the marketplace.`
      : `${listing.category} listing (${Number(listing.quantity || 0).toLocaleString("en-IN")} MT) was rejected. Reason: ${listing.rejectionReason || "No reason provided."}`,
  entityType: "listing",
  entityId: listing._id,
  metadata: {
    status: listing.status,
    rejectionReason: listing.rejectionReason || "",
    category: listing.category,
    quantity: listing.quantity,
    price: listing.price,
  },
});

if (status === "active") {
  void notifyMatchesForListing(listing._id).catch((error) => {
    console.error("Listing match notification error:", error);
  });
}

return res.status(200).json({
  success: true,
  message:
    status === "active"
      ? "Listing approved successfully"
      : "Listing rejected successfully",
  listing,
});

} catch (error) {
console.error(
"Review listing error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Failed to review listing",
});

}
};

/*

Get active marketplace listings

--------------------------------------------------------------------------



Only listings that are:

- active

- quantity > 0

- not expired



are visible to buyers.

--------------------------------------------------------------------------

*/

export const getActiveListings = async (
req,
res
) => {
try {
const {
category,
location,
complianceYear,
sort = "newest",
} = req.query;

const filter = {
  status: "active",

  quantity: {
    $gt: 0,
  },

  validTill: {
    $gte: new Date(),
  },
};

if (req.user?.role === "seller") {
  filter.sellerId = { $ne: req.user._id };
}

if (category) {
  filter.category = category;
}

if (location) {
  filter.location = location;
}

if (complianceYear) {
  filter.complianceYear =
    complianceYear;
}

let query =
  SellerListing.find(filter)
    .populate(
      "sellerId",
      "name company verifiedBadge"
    )
    .populate(
      "documentId",
      "fileName fileUrl verificationStatus certificateNumber sourcePortal certificateQuantity certificateIssuedDate certificateValidTill certificateCategory certificateComplianceYear"
    );

switch (sort) {
  case "price-asc":
    query = query.sort({
      price: 1,
    });
    break;

  case "price-desc":
    query = query.sort({
      price: -1,
    });
    break;

  case "qty-desc":
    query = query.sort({
      quantity: -1,
    });
    break;

  case "newest":
  default:
    query = query.sort({
      createdAt: -1,
    });
    break;
}

const listings = await query;
const publicListings = listings.map((listing) => {
  const value = listing.toObject ? listing.toObject() : listing;
  const { price: _internalPrice, publicMarkupRate: _rate, publicMarginType: _marginType, publicMarginValue: _marginValue, ...safe } = value;
  return {
    ...safe,
    price: publicPrice(value),
  };
});

return res.status(200).json({
  success: true,
  count: publicListings.length,
  listings: publicListings,
});

} catch (error) {
console.error(
"Get active listings error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Failed to fetch marketplace listings",
});

}
};

/*

Get listing by ID

--------------------------------------------------------------------------



Buyer can only access a listing when it is:

- active

- quantity > 0

- not expired

--------------------------------------------------------------------------

*/

export const getListingById = async (
req,
res
) => {
try {
const {
listingId,
} = req.params;

const listing =
  await SellerListing.findOne({
    _id: listingId,

    ...(req.user?.role === "seller" ? { sellerId: { $ne: req.user._id } } : {}),

    status: "active",

    quantity: {
      $gt: 0,
    },

    validTill: {
      $gte: new Date(),
    },
  })
    .populate(
      "sellerId",
      "name company verifiedBadge"
    )
    .populate(
      "documentId",
      "fileName fileUrl mimeType verificationStatus"
    );

if (!listing) {
  return res.status(404).json({
    success: false,
    message:
      "Listing not found or no longer available",
  });
}

const value = listing.toObject ? listing.toObject() : listing;
const { price: _internalPrice, publicMarkupRate: _rate, publicMarginType: _marginType, publicMarginValue: _marginValue, ...safe } = value;
return res.status(200).json({
  success: true,
  listing: { ...safe, price: publicPrice(value) },
});

} catch (error) {
console.error(
"Get listing by ID error:",
error
);

return res.status(500).json({
  success: false,
  message:
    "Failed to fetch listing",
});

}
};

/*

Get listings belonging to logged-in seller

--------------------------------------------------------------------------



Seller can see all of their own listings,

including pending, active, rejected, expired,

and sold listings.

--------------------------------------------------------------------------

*/

export const getSellerListings = async (req, res) => {
  try {
    const listings = await SellerListing.find({
      sellerId: req.user._id,
    })
      .populate(
        "documentId",
        "fileName fileUrl verificationStatus rejectionReason certificateNumber sourcePortal certificateQuantity certificateIssuedDate certificateValidTill"
      )
      .sort({ createdAt: -1 });

    const formattedListings = listings.map((listing) => {
      // Backward compatibility for old listings
      const totalQuantity =
        listing.totalQuantity ?? listing.quantity ?? 0;

      const reservedQuantity =
        listing.reservedQuantity ?? 0;

      const availableQuantity = Math.max(
        totalQuantity - reservedQuantity,
        0
      );

      const value = listing.toObject();
      delete value.publicMarkupRate;
      delete value.publicMarginType;
      delete value.publicMarginValue;
      return {
        ...value,
        totalQuantity,
        reservedQuantity,
        availableQuantity,
      };
    });

    res.json({
      success: true,
      listings: formattedListings,
    });
  } catch (error) {
    console.error("Get seller listings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch seller listings",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update seller listing
|--------------------------------------------------------------------------
|
| Sellers can edit active/paused listings.
| Quantity can only be edited before any inventory has been reserved or
| consumed, so historical deal quantities remain consistent.
|--------------------------------------------------------------------------
*/

export const updateSellerListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listingId",
      });
    }

    const listing = await SellerListing.findOne({
      _id: listingId,
      sellerId: req.user._id,
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (!["active", "paused"].includes(listing.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Only active or paused listings can be edited",
      });
    }

    const {
      category,
      quantity,
      price,
      location,
      complianceYear,
      validTill,
      description,
    } = req.body || {};

    const previous = {
      category: listing.category,
      quantity: listing.quantity,
      totalQuantity: listing.totalQuantity,
      reservedQuantity: listing.reservedQuantity,
      price: listing.price,
      location: listing.location,
      complianceYear: listing.complianceYear,
      validTill: listing.validTill,
      description: listing.description,
      status: listing.status,
    };

    if (category !== undefined) {
      const categoryMap = {
        plastic: "Plastic",
        battery: "Battery",
        "e-waste": "E-Waste",
        "e waste": "E-Waste",
        elv: "ELV",
        "used oil": "Used Oil",
        tyre: "Tyre",
      };

      const normalizedCategory =
        categoryMap[String(category).trim().toLowerCase()];

      if (!normalizedCategory) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid credit type. Allowed types: Battery, Plastic, E-Waste, ELV, Used Oil, Tyre",
        });
      }

      listing.category = normalizedCategory;
    }

    if (quantity !== undefined) {
      const parsedQuantity = Number(quantity);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a valid positive number",
        });
      }

      const reserved = Number(listing.reservedQuantity || 0);
      const total = Number(listing.totalQuantity ?? listing.quantity ?? 0);
      const consumed = Math.max(0, total - Number(listing.quantity || 0));

      if (reserved > 0 || consumed > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity cannot be edited after inventory has been reserved or consumed",
        });
      }

      listing.quantity = parsedQuantity;
      listing.totalQuantity = parsedQuantity;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }

      listing.price = parsedPrice;
    }

    if (location !== undefined) {
      const trimmedLocation = String(location).trim();

      if (!trimmedLocation) {
        return res.status(400).json({
          success: false,
          message: "Location is required",
        });
      }

      listing.location = trimmedLocation;
    }

    if (complianceYear !== undefined) {
      const trimmedYear = String(complianceYear).trim();

      if (!trimmedYear) {
        return res.status(400).json({
          success: false,
          message: "Compliance year is required",
        });
      }

      listing.complianceYear = trimmedYear;
    }

    if (validTill !== undefined) {
      const parsedValidTill = new Date(validTill);

      if (Number.isNaN(parsedValidTill.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Valid till must be a valid date",
        });
      }

      if (parsedValidTill < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Valid till date must be in the future",
        });
      }

      listing.validTill = parsedValidTill;
    }

    if (description !== undefined) {
      listing.description = String(description).trim();
    }

    await listing.save();

    await createActivityLog({
      actorId: req.user._id,
      action: "listing_updated",
      entityType: "seller_listing",
      entityId: listing._id,
      before: previous,
      after: {
        category: listing.category,
        quantity: listing.quantity,
        totalQuantity: listing.totalQuantity,
        reservedQuantity: listing.reservedQuantity,
        price: listing.price,
        location: listing.location,
        complianceYear: listing.complianceYear,
        validTill: listing.validTill,
        description: listing.description,
        status: listing.status,
      },
      metadata: {
        sellerId: listing.sellerId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      listing: sanitizeSellerListing(listing),
    });
  } catch (error) {
    console.error("Update seller listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update listing",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Pause / resume / cancel seller listing
|--------------------------------------------------------------------------
*/

export const updateSellerListingStatus = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { status, reason = "" } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listingId",
      });
    }

    if (!["active", "paused", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be active, paused or cancelled",
      });
    }

    const listing = await SellerListing.findOne({
      _id: listingId,
      sellerId: req.user._id,
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    const previousStatus = listing.status;

    if (
      previousStatus === "cancelled" ||
      previousStatus === "sold" ||
      previousStatus === "rejected" ||
      previousStatus === "expired"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This listing can no longer be paused, resumed or cancelled",
      });
    }

    if (
      status === "active" &&
      listing.validTill < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An expired listing cannot be resumed",
      });
    }

    if (
      status === "cancelled" &&
      Number(listing.reservedQuantity || 0) > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot cancel a listing while inventory is reserved for an active deal",
      });
    }

    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: `Listing is already ${status}`,
      });
    }

    listing.status = status;

    if (status === "cancelled") {
      listing.rejectionReason = String(reason).trim();
    }

    await listing.save();

    await createActivityLog({
      actorId: req.user._id,
      action: "listing_status_changed",
      entityType: "seller_listing",
      entityId: listing._id,
      before: {
        status: previousStatus,
      },
      after: {
        status: listing.status,
      },
      metadata: {
        sellerId: listing.sellerId,
        category: listing.category,
        quantity: listing.quantity,
        reservedQuantity: listing.reservedQuantity,
        reason: String(reason).trim(),
      },
    });

    return res.status(200).json({
      success: true,
      message: `Listing ${status} successfully`,
      listing: sanitizeSellerListing(listing),
    });
  } catch (error) {
    console.error("Update seller listing status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update listing status",
    });
  }
};
