import Notification from "../models/Notification.js";

/**
 * Create one notification.
 * This helper is intentionally non-blocking for business flows:
 * callers can await it, but a notification failure should not make
 * a successful deal/listing transaction fail.
 */
export const createNotification = async ({
  recipient,
  actor = null,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  metadata = {},
  dedupeKey = null,
}) => {
  if (!recipient) {
    return null;
  }

  try {
    return await Notification.create({
      recipient,
      actor,
      type,
      title,
      message,
      entityType,
      entityId,
      metadata,
      dedupeKey,
    });
  } catch (error) {
    if (error?.code === 11000 && dedupeKey) return null;
    console.error("Create notification error:", error);
    return null;
  }
};

/**
 * Create the same notification for multiple recipients.
 */
export const createNotifications = async ({
  recipients,
  actor = null,
  type,
  title,
  message,
  entityType = null,
  entityId = null,
  metadata = {},
}) => {
  const uniqueRecipients = [
    ...new Set(
      (recipients || [])
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  ];

  if (!uniqueRecipients.length) {
    return [];
  }

  const docs = uniqueRecipients.map((recipient) => ({
    recipient,
    actor,
    type,
    title,
    message,
    entityType,
    entityId,
    metadata,
  }));

  try {
    return await Notification.insertMany(docs, {
      ordered: false,
    });
  } catch (error) {
    console.error("Create notifications error:", error);
    return [];
  }
};

/**
 * Notification copy used by the deal lifecycle.
 */
export const notifyDealStatusChange = async ({
  deal,
  status,
  paymentStatus = null,
  actor = null,
}) => {
  const category = deal?.listingId?.category || deal?.category || "EPR credit";
  const quantity = Number(deal?.quantity || 0);
  const quantityText = `${quantity} MT`;
  const notifications = [];

  const buyerId = deal?.buyerId;
  const sellerId = deal?.sellerId;

  // Buyer receives transaction/payment updates. No internal margin or seller economics.
  if (buyerId) {
    let type = "deal_status_changed";
    let title = "Deal status updated";
    let message = `${category} deal (${quantityText}) is now ${String(status).replaceAll("_", " ")}.`;

    if (status === "payment_coordination") {
      type = "payment_initiated";
      title = "Payment coordination started";
      message = `Payment coordination has started for your ${category} deal (${quantityText}).`;
    }
    if (paymentStatus === "received") {
      type = "payment_received";
      title = "Payment received";
      message = `Your payment has been verified by EPR Nexuss for the ${category} deal (${quantityText}).`;
    }
    if (status === "completed") {
      type = "deal_completed";
      title = "Deal completed";
      message = `Your ${category} deal for ${quantityText} has been completed successfully.`;
    }
    if (status === "cancelled") {
      type = "deal_cancelled";
      title = "Deal cancelled";
      message = `Your ${category} deal for ${quantityText} was cancelled. Any active inventory reservation has been released.`;
    }

    notifications.push(await createNotification({
      recipient: buyerId, actor, type, title, message, entityType: "deal", entityId: deal?._id || null,
      metadata: { status, paymentStatus: status === "completed" ? "received" : paymentStatus, quantity, category },
    }));
  }

  // Seller only receives operational deal-state updates. Never expose payment state.
  if (sellerId) {
    let type = "deal_status_changed";
    let title = "Deal status updated";
    let message = `EPR Nexuss updated your ${category} transaction (${quantityText}).`;
    if (status === "matched" || status === "negotiating") {
      title = "Buyer request received";
      message = `A buyer request for ${quantityText} from your ${category} listing is being coordinated by EPR Nexuss.`;
    } else if (status === "terms_agreed" || status === "payment_coordination") {
      title = "Deal in progress";
      message = `Your ${category} deal for ${quantityText} is in progress. EPR Nexuss is coordinating the transaction.`;
    } else if (status === "completed") {
      type = "deal_completed";
      title = "Deal completed";
      message = `Your ${category} deal for ${quantityText} has been completed successfully.`;
    } else if (status === "cancelled") {
      type = "deal_cancelled";
      title = "Deal cancelled";
      message = `Your ${category} deal for ${quantityText} was cancelled. Any active inventory reservation has been released.`;
    }

    notifications.push(await createNotification({
      recipient: sellerId, actor, type, title, message, entityType: "deal", entityId: deal?._id || null,
      metadata: { status, quantity, category },
    }));
  }

  return notifications.flat().filter(Boolean);
};

