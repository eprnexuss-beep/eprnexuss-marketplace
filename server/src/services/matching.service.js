import BuyerRequirement from "../models/BuyerRequirement.js";
import SellerListing from "../models/SellerListing.js";
import { createNotification } from "./notification.service.js";

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeCategory = (value) => {
  const normalized = normalize(value).replace(/[_-]+/g, " ");
  const aliases = {
    "e waste": "e-waste",
    ewaste: "e-waste",
    plastic: "plastic",
    battery: "battery",
    tyre: "tyre",
    "used oil": "used oil",
    elv: "elv",
  };
  return aliases[normalized] || normalized;
};

// Compliance years may exist in older records as either "2025-26" or
// "FY 2025-26". Treat both representations as the same year and tolerate
// whitespace/dash differences from older records.
const normalizeComplianceYear = (value) =>
  normalize(value)
    .replace(/^fy\s*/i, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s*[-/]\s*/g, "-");

const normalizeClassification = (value) =>
  normalize(value).replace(/[–—−]/g, "-");

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

const locationMatches = (requirement, listing) => {
  const requested = normalize(requirement.location);
  if (!requested || requested === "any location") return true;
  return requested === normalize(listing.location);
};

export const getAvailableQuantity = (listing) =>
  Math.max(
    0,
    Number(listing.quantity || 0) - Number(listing.reservedQuantity || 0),
  );

/**
 * One source of truth for matching eligibility.
 *
 * Browse Credits exposes buyer-facing listing price. Matching therefore uses
 * the same public price rather than the seller's internal price. All text
 * fields are normalized here so legacy records with casing, whitespace, or
 * FY-prefix differences do not disappear from matching.
 */
export const scoreRequirementMatch = (requirement, listing) => {
  const requiredQuantity = Math.max(
    0,
    Number(requirement.remainingQuantity ?? requirement.quantity ?? 0),
  );
  const availableQuantity = getAvailableQuantity(listing);
  const budget = Number(requirement.budget || 0);
  const price = publicPrice(listing);

  const categoryMatch =
    normalizeCategory(requirement.type) === normalizeCategory(listing.category);

  const classificationTypeMatch =
    !requirement.classificationType ||
    normalize(requirement.classificationType) === normalize(listing.classificationType);

  const classificationMatch =
    !requirement.classification ||
    normalizeClassification(requirement.classification) ===
      normalizeClassification(listing.classification);

  const classificationCodeMatch =
    !requirement.classificationCode ||
    normalize(requirement.classificationCode) ===
      normalize(listing.classificationCode);

  const yearMatch =
    normalizeComplianceYear(requirement.complianceYear) ===
    normalizeComplianceYear(listing.complianceYear);

  const budgetMatch = price > 0 && budget > 0 && price <= budget;
  const locationMatch = locationMatches(requirement, listing);
  const quantityCoverage =
    requiredQuantity > 0
      ? Math.min(availableQuantity / requiredQuantity, 1)
      : 0;
  const daysToExpiry = Math.max(
    0,
    Math.ceil(
      (new Date(listing.validTill).getTime() - Date.now()) / 86400000,
    ),
  );

  let validityScore = 0;
  if (daysToExpiry >= 180) validityScore = 5;
  else if (daysToExpiry >= 90) validityScore = 4;
  else if (daysToExpiry >= 30) validityScore = 3;
  else if (daysToExpiry > 0) validityScore = 2;

  let budgetScore = 0;
  if (budgetMatch) {
    const priceRatio = Math.min(price / budget, 1);
    budgetScore = 10 + Math.round((1 - priceRatio) * 10);
  }

  const score = Math.min(
    100,
    (categoryMatch ? 25 : 0) +
      (classificationTypeMatch ? 5 : 0) +
      (classificationMatch ? 10 : 0) +
      (classificationCodeMatch ? 5 : 0) +
      (yearMatch ? 20 : 0) +
      budgetScore +
      (locationMatch ? 15 : 0) +
      Math.round(quantityCoverage * 10) +
      validityScore,
  );

  return {
    score,
    categoryMatch,
    classificationTypeMatch,
    classificationMatch,
    classificationCodeMatch,
    yearMatch,
    budgetMatch,
    locationMatch,
    quantityCoverage,
    availableQuantity,
    daysToExpiry,
    reasons: [
      categoryMatch ? "Credit type matches" : "Credit type does not match",
      classificationTypeMatch
        ? "Classification type matches"
        : "Classification type does not match",
      classificationMatch
        ? "Classification matches"
        : "Classification does not match",
      classificationCodeMatch ? "Item code matches" : "Item code does not match",
      yearMatch
        ? "Compliance year matches"
        : "Compliance year does not match",
      budgetMatch
        ? price < budget
          ? "Price is within budget"
          : "Price meets your budget"
        : "Price exceeds budget",
      locationMatch
        ? requirement.location
          ? "Location matches"
          : "Location preference is flexible"
        : "Location does not match",
      quantityCoverage >= 1
        ? "Full requested quantity is available"
        : `${Math.round(quantityCoverage * 100)}% of requested quantity is currently available`,
      daysToExpiry >= 90
        ? "Listing has healthy validity"
        : "Listing expires relatively soon",
    ],
  };
};

const isEligibleMatch = (match) =>
  match.categoryMatch &&
  match.classificationMatch &&
  match.classificationCodeMatch &&
  match.yearMatch &&
  match.budgetMatch &&
  match.locationMatch &&
  match.availableQuantity > 0 &&
  match.daysToExpiry > 0;

export const findMatchingListings = async (
  requirement,
  { minimumScore = 60 } = {},
) => {
  // Do not push classification/year/location comparisons into MongoDB.
  // Those fields have existed in several formats across older listings.
  // Fetch active listings for the credit stream and apply the normalized
  // eligibility function below. This keeps matching consistent with the
  // marketplace display and prevents valid legacy listings from disappearing.
  const listings = await SellerListing.find({
    status: "active",
    category: { $regex: `^${String(requirement.type || "").trim()}$`, $options: "i" },
    validTill: { $gte: new Date() },
    quantity: { $gt: 0 },
  })
    .populate("sellerId", "name company verifiedBadge")
    .lean();

  return listings
    .map((listing) => ({
      listing,
      ...scoreRequirementMatch(requirement, listing),
    }))
    .filter(
      (match) =>
        isEligibleMatch(match) &&
        match.score >= minimumScore,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        publicPrice(a.listing) - publicPrice(b.listing) ||
        b.availableQuantity - a.availableQuantity,
    );
};

export const notifyBuyerAboutRequirementMatch = async ({ requirement, listing, score }) => {
  if (!requirement?.buyerId || !listing?._id) return null;

  const sellerName = listing.sellerId?.company || listing.sellerId?.name || "a verified seller";
  const dedupeKey = `requirement-match:${requirement._id}:${listing._id}`;

  return createNotification({
    recipient: requirement.buyerId,
    type: "requirement_match_found",
    title: `New ${listing.category}${listing.classification ? ` · ${listing.classification}` : ""} match found`,
    message: `${sellerName} has ${Number(score.availableQuantity).toLocaleString("en-IN")} MT of ${listing.category}${listing.classification ? ` · ${listing.classification}` : ""}${listing.classificationCode ? ` · ${listing.classificationCode}` : ""} available at ₹${publicPrice(listing).toLocaleString("en-IN")}/MT. Match score: ${score.score}%.`,
    entityType: "requirement",
    entityId: requirement._id,
    metadata: {
      matchKey: dedupeKey,
      requirementId: requirement._id,
      listingId: listing._id,
      matchScore: score.score,
      availableQuantity: score.availableQuantity,
      price: publicPrice(listing),
      category: listing.category,
      classificationType: listing.classificationType || "",
      classification: listing.classification || "",
      classificationCode: listing.classificationCode || "",
    },
    dedupeKey,
  });
};

export const notifyMatchesForListing = async (listingId) => {
  const listing = await SellerListing.findOne({
    _id: listingId,
    status: "active",
    validTill: { $gte: new Date() },
    quantity: { $gt: 0 },
  })
    .populate("sellerId", "name company verifiedBadge")
    .lean();

  if (!listing) return { checked: 0, notified: 0 };

  // Use the same scoring rules as the buyer's live "View matches" endpoint.
  // This prevents a notification from saying "match found" while the live
  // matching screen applies different eligibility rules.
  // Keep the notification engine on the same normalized matching rules as
  // the live buyer endpoint. Do not pre-filter by raw category text because
  // older records may use a legacy spelling such as "E Waste".
  const requirements = await BuyerRequirement.find({
    status: { $in: ["open", "matching", "partially_matched"] },
    remainingQuantity: { $gt: 0 },
  }).lean();

  let notified = 0;
  for (const requirement of requirements) {
    const score = scoreRequirementMatch(requirement, listing);
    if (score.score < 60 || !isEligibleMatch(score)) continue;
    const notification = await notifyBuyerAboutRequirementMatch({
      requirement,
      listing,
      score,
    });
    if (notification) notified += 1;
  }

  return { checked: requirements.length, notified };
};

export const notifyMatchesForRequirement = async (requirementId) => {
  const requirement = await BuyerRequirement.findById(requirementId).lean();
  if (!requirement) return { checked: 0, notified: 0 };

  const matches = await findMatchingListings(requirement);
  let notified = 0;
  for (const match of matches) {
    const notification = await notifyBuyerAboutRequirementMatch({ requirement, listing: match.listing, score: match });
    if (notification) notified += 1;
  }
  return { checked: matches.length, notified };
};
