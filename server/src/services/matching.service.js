import BuyerRequirement from "../models/BuyerRequirement.js";
import SellerListing from "../models/SellerListing.js";
import { createNotification } from "./notification.service.js";

const normalize = (value) => String(value || "").trim().toLowerCase();

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
  Math.max(0, Number(listing.quantity || 0) - Number(listing.reservedQuantity || 0));

export const scoreRequirementMatch = (requirement, listing) => {
  const requiredQuantity = Number(requirement.quantity || 0);
  const availableQuantity = getAvailableQuantity(listing);
  const budget = Number(requirement.budget || 0);
  const price = publicPrice(listing);
  const categoryMatch = normalize(requirement.type) === normalize(listing.category);
  const yearMatch = normalize(requirement.complianceYear) === normalize(listing.complianceYear);
  const budgetMatch = price > 0 && budget > 0 && price <= budget;
  const locationMatch = locationMatches(requirement, listing);
  const quantityCoverage = requiredQuantity > 0 ? Math.min(availableQuantity / requiredQuantity, 1) : 0;
  const daysToExpiry = Math.max(0, Math.ceil((new Date(listing.validTill).getTime() - Date.now()) / 86400000));

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

  const score =
    (categoryMatch ? 30 : 0) +
    (yearMatch ? 20 : 0) +
    budgetScore +
    (locationMatch ? 15 : 0) +
    Math.round(quantityCoverage * 10) +
    validityScore;

  return {
    score,
    categoryMatch,
    yearMatch,
    budgetMatch,
    locationMatch,
    quantityCoverage,
    availableQuantity,
    daysToExpiry,
    reasons: [
      categoryMatch ? "Credit type matches" : "Credit type does not match",
      yearMatch ? "Compliance year matches" : "Compliance year does not match",
      budgetMatch ? (price < budget ? "Price is within budget" : "Price meets your budget") : "Price exceeds budget",
      locationMatch ? (requirement.location ? "Location matches" : "Location preference is flexible") : "Location does not match",
      quantityCoverage >= 1 ? "Full requested quantity is available" : `${Math.round(quantityCoverage * 100)}% of requested quantity is currently available`,
      daysToExpiry >= 90 ? "Listing has healthy validity" : "Listing expires relatively soon",
    ],
  };
};

export const findMatchingListings = async (requirement, { minimumScore = 70 } = {}) => {
  const listings = await SellerListing.find({
    status: "active",
    category: { $regex: `^${requirement.type}$`, $options: "i" },
    complianceYear: requirement.complianceYear,
    validTill: { $gte: new Date() },
    quantity: { $gt: 0 },
  })
    .populate("sellerId", "name company verifiedBadge")
    .lean();

  return listings
    .map((listing) => ({ listing, ...scoreRequirementMatch(requirement, listing) }))
    .filter((match) => match.score >= minimumScore && match.budgetMatch && match.locationMatch && match.availableQuantity > 0)
    .sort((a, b) => b.score - a.score || Number(a.listing.price) - Number(b.listing.price) || b.availableQuantity - a.availableQuantity);
};

export const notifyBuyerAboutRequirementMatch = async ({ requirement, listing, score }) => {
  if (!requirement?.buyerId || !listing?._id) return null;

  const sellerName = listing.sellerId?.company || listing.sellerId?.name || "a verified seller";
  const dedupeKey = `requirement-match:${requirement._id}:${listing._id}`;

  return createNotification({
    recipient: requirement.buyerId,
    type: "requirement_match_found",
    title: `New ${listing.category} match found`,
    message: `${sellerName} has ${Number(score.availableQuantity).toLocaleString("en-IN")} MT available at ₹${publicPrice(listing).toLocaleString("en-IN")}/MT. Match score: ${score.score}%.`,
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

  const requirements = await BuyerRequirement.find({
    status: { $in: ["open", "matching", "partially_matched"] },
    type: { $regex: `^${listing.category}$`, $options: "i" },
    complianceYear: listing.complianceYear,
    remainingQuantity: { $gt: 0 },
  }).lean();

  let notified = 0;
  for (const requirement of requirements) {
    const score = scoreRequirementMatch(requirement, listing);
    if (score.score < 70 || !score.budgetMatch || !score.locationMatch || score.availableQuantity <= 0) continue;
    const notification = await notifyBuyerAboutRequirementMatch({ requirement, listing, score });
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
