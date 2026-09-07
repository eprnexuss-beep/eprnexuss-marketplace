import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import { Badge, Button, Card, Input, Textarea } from "./ui";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const statusLabel = (status) => {
  const labels = {
    pending: "New request",
    reviewing: "Under review",
    matched: "Ready for quotation",
    negotiating: "Commercial discussion",
    offer_sent: "Quotation sent",
    offer_accepted: "Accepted",
    approved: "Deal confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };

  return labels[status] || status || "—";
};

const isLocked = (status) =>
  ["offer_accepted", "approved", "completed", "cancelled"].includes(status);

/* -------------------------------------------------------------------------- */
/* Message display - kept here only for compatibility with existing imports   */
/* -------------------------------------------------------------------------- */

function MessageList({ messages, role }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F9FB] min-h-0">
      {messages.length === 0 ? (
        <div className="h-full min-h-[240px] flex items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-[#374151]">
              No messages yet
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Messages are private between you and EPR Nexuss.
            </p>
          </div>
        </div>
      ) : (
        messages.map((item) => {
          const mine = item.senderRole === role;

          return (
            <div
              key={item._id}
              className={`flex ${
                mine ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                  mine
                    ? "bg-[#5AC361] text-white"
                    : "bg-white border border-[#E5EAF0] text-[#374151]"
                }`}
              >
                <p className="text-[11px] font-semibold opacity-70 mb-1">
                  {item.senderLabel}
                </p>

                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {item.message}
                </p>

                <p className="text-[10px] opacity-60 mt-2">
                  {new Date(item.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Buyer-facing quotation card                                               */
/* -------------------------------------------------------------------------- */

export function QuotationCard({
  request,
  onAccept,
  accepting,
  showActions = true,
}) {
  const offer = request?.offer;

  if (!offer || offer.finalAmount == null) {
    return null;
  }

  const accepted = Boolean(offer.acceptedAt);

  const expired =
    offer.expiresAt &&
    new Date(offer.expiresAt).getTime() < Date.now();

  return (
    <div
      className={`rounded-xl border p-4 ${
        accepted
          ? "border-[#B7DFC0] bg-[#F0FBF1]"
          : "border-[#CFE8D1] bg-[#F8FCF8]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-[#6B7280]">
            EPR Nexuss Quotation #{offer.version}
          </p>

          <p className="text-lg font-bold text-[#0F1923] mt-1">
            {money(offer.finalAmount)}
          </p>
        </div>

        <span className="text-xs font-semibold text-[#2E7D32]">
          {accepted
            ? "Accepted"
            : expired
              ? "Expired"
              : "Awaiting response"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Credit value</span>
          <b>{money(offer.creditSubtotal)}</b>
        </div>

        <div className="flex justify-between">
          <span className="text-[#6B7280]">
            EPR Nexuss service fee
          </span>
          <b>{money(offer.serviceFee)}</b>
        </div>

        <div className="border-t border-[#DDEADF] pt-2 flex justify-between font-bold">
          <span>Buyer pays</span>
          <span>{money(offer.finalAmount)}</span>
        </div>
      </div>

      {offer.note ? (
        <div className="mt-3 rounded-lg bg-white border border-[#E5EAF0] p-3 text-xs text-[#52606D]">
          {offer.note}
        </div>
      ) : null}

      {showActions && !accepted && !expired ? (
        <Button
          className="w-full mt-4"
          onClick={onAccept}
          disabled={accepting}
        >
          {accepting ? "Confirming..." : "Accept Quotation"}
        </Button>
      ) : null}

      {accepted ? (
        <p className="mt-4 text-xs text-[#2E7D32]">
          Commercial terms are locked. Payment is still pending until EPR
          Nexus confirms receipt.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Admin quotation center                                                     */
/* -------------------------------------------------------------------------- */

export default function QuotationCenter({
  initialRequestId = "",
  onOpenDeals,
}) {
  const [requests, setRequests] = useState([]);

  /*
   * IMPORTANT FIX:
   *
   * This value can change while this component is already mounted.
   * For example:
   *
   * Purchase Requests
   *       ↓
   * Manage Request
   *       ↓
   * active section changes to Quotations
   *       ↓
   * initialRequestId changes
   *
   * useState(initialRequestId) only uses the value on the first render.
   * Therefore we explicitly synchronize it below.
   */
  const [selectedId, setSelectedId] = useState(
    initialRequestId || "",
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [savingOffer, setSavingOffer] = useState(false);

  const [offer, setOffer] = useState({
    creditPricePerUnit: "",
    serviceFee: "",
    note: "",
    expiresAt: "",
  });

  /* ------------------------------------------------------------------------ */
  /* Sync Manage Request -> Quotation Center                                 */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (initialRequestId) {
      setSelectedId(initialRequestId);
    }
  }, [initialRequestId]);

  /* ------------------------------------------------------------------------ */
  /* Load quotation-capable requests                                          */
  /* ------------------------------------------------------------------------ */

  const loadRequests = async () => {
    try {
      setLoading(true);
      setLoadError("");

     const response = await api.get("/requests/admin");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Unable to load quotation requests.",
        );
      }

      const incoming = Array.isArray(response.data.requests)
        ? response.data.requests
        : [];

      setRequests(incoming);

      /*
       * Priority:
       *
       * 1. Request explicitly selected from Manage Request
       * 2. Existing selected request
       * 3. First available request
       */

      const requestedId = initialRequestId || selectedId;

      if (
        requestedId &&
        incoming.some((item) => item._id === requestedId)
      ) {
        setSelectedId(requestedId);
      } else if (
        !selectedId ||
        !incoming.some((item) => item._id === selectedId)
      ) {
        setSelectedId(incoming[0]?._id || "");
      }
    } catch (error) {
      console.error("Admin quotations failed:", error);

      setRequests([]);
      setLoadError(
        error.response?.data?.message ||
          error.message ||
          "Unable to load quotation requests.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Selected request                                                         */
  /* ------------------------------------------------------------------------ */

  const selected = useMemo(
    () =>
      requests.find(
        (item) => item._id === selectedId,
      ) || null,
    [requests, selectedId],
  );

  /* ------------------------------------------------------------------------ */
  /* Load existing offer into form                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const current = selected?.offer;

    setOffer({
      creditPricePerUnit:
        current?.creditPricePerUnit ?? "",

      serviceFee:
        current?.serviceFee ?? "",

      note: "",

      expiresAt: current?.expiresAt
        ? new Date(current.expiresAt)
            .toISOString()
            .slice(0, 16)
        : "",
    });
  }, [
    selectedId,
    selected?.offer?.version,
    selected?.offer?.acceptedAt,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Calculations                                                             */
  /* ------------------------------------------------------------------------ */

  const creditPrice = Number(
    offer.creditPricePerUnit || 0,
  );

  const quantity = Number(
    selected?.quantity || 0,
  );

  const serviceFee = Number(
    offer.serviceFee || 0,
  );

  const creditSubtotal = creditPrice * quantity;

  const total = creditSubtotal + serviceFee;

  /* ------------------------------------------------------------------------ */
  /* Send / revise quotation                                                  */
  /* ------------------------------------------------------------------------ */

  const saveOffer = async () => {
    if (!selectedId) {
      toast.error("Please select a purchase request first.");
      return;
    }

    if (
      offer.creditPricePerUnit === "" ||
      Number(offer.creditPricePerUnit) < 0
    ) {
      toast.error("Enter a valid credit price.");
      return;
    }

    if (
      offer.serviceFee === "" ||
      Number(offer.serviceFee) < 0
    ) {
      toast.error("Enter a valid EPR Nexuss service fee.");
      return;
    }

    if (!selected) {
      toast.error("The selected purchase request could not be found.");
      return;
    }

    if (isLocked(selected.status) || selected.offer?.acceptedAt) {
      toast.error(
        "This quotation is already accepted or the transaction is locked. A new quotation cannot be issued.",
      );
      return;
    }

    try {
      setSavingOffer(true);

      const response = await api.post(
        `/requests/admin/${selectedId}/offer`,
        {
          creditPricePerUnit: Number(
            offer.creditPricePerUnit,
          ),

          serviceFee: Number(
            offer.serviceFee,
          ),

          note: offer.note?.trim() || "",

          expiresAt:
            offer.expiresAt || null,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to send the quotation.",
        );
      }

      /*
       * Reload everything so:
       *
       * - quotation version updates
       * - history updates
       * - status updates
       * - selected request remains selected
       */
      await loadRequests();

      setOffer((current) => ({
        ...current,
        note: "",
      }));

      toast.success(
        response.data?.message ||
          "Quotation sent successfully.",
      );
    } catch (error) {
      console.error(
        "Quotation save failed:",
        error,
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to send the quotation.",
      );
    } finally {
      setSavingOffer(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="h-[calc(100vh-170px)] min-h-[600px] grid xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
      {/* ------------------------------------------------------------------ */}
      {/* REQUEST LIST                                                        */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-[#E5EAF0]">
          <h2 className="font-semibold text-[#0F1923]">
            Quotations
          </h2>

          <p className="text-xs text-[#9CA3AF] mt-1">
            Create and revise EPR Nexuss commercial offers.
            Messaging is handled separately.
          </p>
        </div>

        <div className="overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-6 text-sm text-[#9CA3AF]">
              Loading quotation requests...
            </div>
          ) : loadError ? (
            <div className="p-5">
              <div className="rounded-lg border border-[#F2C6C6] bg-[#FFF6F6] p-4">
                <p className="text-sm font-semibold text-[#B42318]">
                  Unable to load quotations
                </p>

                <p className="text-xs text-[#7A271A] mt-1">
                  {loadError}
                </p>

                <Button
                  type="button"
                  className="mt-3"
                  onClick={loadRequests}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6">
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-5 text-center">
                <p className="text-sm font-medium text-[#374151]">
                  No quotation requests yet.
                </p>

                <p className="text-xs text-[#9CA3AF] mt-1">
                  Approved purchase requests will appear here
                  for quotation.
                </p>
              </div>
            </div>
          ) : (
            requests.map((request) => {
              const requestOffer = request.offer;

              const hasQuotation =
                requestOffer?.finalAmount != null;

              const accepted =
                Boolean(requestOffer?.acceptedAt) ||
                request.status === "offer_accepted";

              const active =
                selectedId === request._id;

              return (
                <button
                  type="button"
                  key={request._id}
                  onClick={() =>
                    setSelectedId(request._id)
                  }
                  className={`w-full text-left p-4 border-b border-[#F0F4F8] transition ${
                    active
                      ? "bg-[#F0FBF1]"
                      : "hover:bg-[#F8FAFC]"
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-sm text-[#0F1923]">
                      {request.listingId?.category ||
                        "EPR Credit"}
                    </p>

                    <Badge
                      label={
                        accepted
                          ? "Accepted"
                          : hasQuotation
                            ? `#${requestOffer.version}`
                            : "Pending"
                      }
                    />
                  </div>

                  <p className="text-xs text-[#6B7280] mt-1">
                    {request.quantity} MT ·{" "}
                    {request.buyerId?.company ||
                      request.buyerId?.name ||
                      "Buyer"}
                  </p>

                  <p className="text-[11px] text-[#9CA3AF] mt-2">
                    {hasQuotation
                      ? money(
                          requestOffer.finalAmount,
                        )
                      : "Quotation not issued"}
                  </p>

                  <p className="text-[11px] mt-1 text-[#6B7280]">
                    {statusLabel(request.status)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* QUOTATION WORKSPACE                                                 */}
      {/* ------------------------------------------------------------------ */}

      <Card className="overflow-hidden min-h-0">
        {!selected ? (
          <div className="h-full flex items-center justify-center p-12 text-center">
            <div>
              <p className="text-sm font-medium text-[#374151]">
                Select a request to create or review a quotation.
              </p>

              <p className="text-xs text-[#9CA3AF] mt-2">
                You can also open a specific request using
                “Manage Request” from Purchase Requests.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-5 sm:p-6">
            {/* ------------------------------------------------------------ */}
            {/* HEADER                                                        */}
            {/* ------------------------------------------------------------ */}

            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#E5EAF0]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-[#0F1923]">
                    {selected.listingId?.category ||
                      "Credit"}{" "}
                    · {selected.quantity} MT
                  </h2>

                  <Badge
                    label={statusLabel(
                      selected.status,
                    )}
                  />
                </div>

                <p className="text-xs text-[#6B7280] mt-1">
                  Buyer:{" "}
                  {selected.buyerId?.company ||
                    selected.buyerId?.name ||
                    "—"}
                </p>

                <p className="text-xs text-[#9CA3AF] mt-1">
                  Request ID: {selected._id}
                </p>
              </div>

              {selected.offer?.version ? (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                    Current quotation
                  </p>

                  <p className="text-sm font-semibold text-[#0F1923]">
                    #{selected.offer.version}
                  </p>
                </div>
              ) : null}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* REQUEST SUMMARY                                                */}
            {/* ------------------------------------------------------------ */}

            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                <p className="text-[11px] text-[#9CA3AF]">
                  Requested quantity
                </p>

                <p className="text-sm font-semibold text-[#0F1923] mt-1">
                  {selected.quantity} MT
                </p>
              </div>

              <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                <p className="text-[11px] text-[#9CA3AF]">
                  Listed price
                </p>

                <p className="text-sm font-semibold text-[#0F1923] mt-1">
                  {money(
                    selected.listingId?.price,
                  )}{" "}
                  / MT
                </p>
              </div>

              <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                <p className="text-[11px] text-[#9CA3AF]">
                  Request value
                </p>

                <p className="text-sm font-semibold text-[#0F1923] mt-1">
                  {money(
                    Number(
                      selected.quantity || 0,
                    ) *
                      Number(
                        selected.listingId?.price ||
                          0,
                      ),
                  )}
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-5">
              {/* ---------------------------------------------------------- */}
              {/* HISTORY                                                      */}
              {/* ---------------------------------------------------------- */}

              <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#0F1923]">
                      Quotation history
                    </h3>

                    <p className="text-xs text-[#9CA3AF] mt-1">
                      Previous quotations remain preserved.
                    </p>
                  </div>

                  {selected.offerHistory?.length ? (
                    <span className="text-xs text-[#6B7280]">
                      {selected.offerHistory.length} version
                      {selected.offerHistory.length === 1
                        ? ""
                        : "s"}
                    </span>
                  ) : null}
                </div>

                {selected.offerHistory?.length ? (
                  <div className="mt-4 space-y-3">
                    {selected.offerHistory.map(
                      (item) => (
                        <div
                          key={item.version}
                          className="rounded-lg border border-[#E5EAF0] bg-white p-3"
                        >
                          <div className="flex justify-between gap-3">
                            <span className="text-xs font-semibold text-[#0F1923]">
                              Quotation #{item.version}
                            </span>

                            <span className="text-xs font-semibold text-[#0F1923]">
                              {money(
                                item.finalAmount,
                              )}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className="text-[#6B7280]">
                              Credit value
                            </span>

                            <span className="text-right">
                              {money(
                                item.creditSubtotal,
                              )}
                            </span>

                            <span className="text-[#6B7280]">
                              Service fee
                            </span>

                            <span className="text-right">
                              {money(
                                item.serviceFee,
                              )}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#9CA3AF] mt-2">
                            {item.sentAt
                              ? new Date(
                                  item.sentAt,
                                ).toLocaleString(
                                  "en-IN",
                                )
                              : "—"}

                            {item.acceptedAt
                              ? " · Accepted"
                              : ""}
                          </p>

                          {item.note ? (
                            <p className="text-[11px] text-[#6B7280] mt-2">
                              {item.note}
                            </p>
                          ) : null}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#9CA3AF] mt-3">
                    No previous quotations.
                  </p>
                )}

                {/* Current quotation */}
                {selected.offer?.finalAmount != null ? (
                  <div className="mt-4">
                    <QuotationCard
                      request={selected}
                      showActions={false}
                    />
                  </div>
                ) : null}
              </div>

              {/* ---------------------------------------------------------- */}
              {/* ACTION PANEL                                                 */}
              {/* ---------------------------------------------------------- */}

              <div className="rounded-xl border border-[#E5EAF0] p-5">
                {selected.offer?.acceptedAt ||
                selected.status === "offer_accepted" ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-[#0F1923]">
                        Quotation accepted
                      </h3>

                      <Badge label="Locked" />
                    </div>

                    <p className="text-sm text-[#6B7280] mt-2">
                      Commercial terms are locked. Do not issue
                      another quotation for this request.
                    </p>

                    <div className="mt-4 rounded-lg bg-[#F0FBF1] border border-[#CFE8D1] p-3">
                      {(() => {
                        const dealStatus = String(
                          selected.deal?.status || selected.status || "",
                        ).toLowerCase();
                        const paymentStatus = String(
                          selected.deal?.paymentStatus ||
                            (dealStatus === "completed" ? "received" : "pending"),
                        ).toLowerCase();
                        const completed = dealStatus === "completed";
                        const received =
                          completed || paymentStatus === "received";

                        return (
                          <>
                            <p className="text-xs font-semibold text-[#2E7D32]">
                              {completed
                                ? "Deal completed · Payment received"
                                : received
                                  ? "Deal created · Payment received"
                                  : "Deal created · Payment pending"}
                            </p>

                            <p className="text-xs text-[#52715A] mt-1">
                              {completed
                                ? "Payment was verified and this transaction has been completed successfully."
                                : received
                                  ? "Payment has been verified. Continue the transaction from Deals / Transactions to complete the deal."
                                  : "The buyer accepted the quotation, so the transaction has moved out of the quotation stage. Payment is still awaiting confirmation."}
                            </p>
                          </>
                        );
                      })()}

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="rounded-lg bg-white border border-[#DDEADF] p-2">
                          <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                            Deal status
                          </p>
                          <p className="text-xs font-semibold text-[#374151] mt-1">
                            {String(selected.deal?.status || selected.status || "payment_coordination") === "completed"
                              ? "Completed"
                              : "Payment Coordination"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white border border-[#DDEADF] p-2">
                          <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                            Payment
                          </p>
                          <p className="text-xs font-semibold text-[#374151] mt-1">
                            {String(selected.deal?.status || selected.status || "").toLowerCase() === "completed" ||
                            String(selected.deal?.paymentStatus || "").toLowerCase() === "received"
                              ? "Received"
                              : "Pending"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-white border border-[#DDEADF] p-2">
                          <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                            Reserved quantity
                          </p>
                          <p className="text-xs font-semibold text-[#374151] mt-1">
                            {selected.quantity} MT
                          </p>
                        </div>

                        <div className="rounded-lg bg-white border border-[#DDEADF] p-2">
                          <p className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                            Listing
                          </p>
                          <p className="text-xs font-semibold text-[#374151] mt-1">
                            {selected.listingId?.category || "EPR Credit"}
                          </p>
                        </div>
                      </div>

                      {typeof onOpenDeals === "function" ? (
                        <Button
                          className="w-full mt-4"
                          onClick={onOpenDeals}
                        >
                          Open Deal & Continue Transaction
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-[#0F1923]">
                      {selected.offer?.finalAmount != null
                        ? "Send revised quotation"
                        : "Create quotation"}
                    </h3>

                    <p className="text-xs text-[#9CA3AF] mt-1">
                      The buyer will see these commercial terms
                      and can accept the quotation.
                    </p>

                    <div className="mt-4 space-y-3">
                      <Input
                        label="Credit Price / MT"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          offer.creditPricePerUnit
                        }
                        onChange={(e) =>
                          setOffer((v) => ({
                            ...v,
                            creditPricePerUnit:
                              e.target.value,
                          }))
                        }
                      />

                      <Input
                        label="EPR Nexuss Service Fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={offer.serviceFee}
                        onChange={(e) =>
                          setOffer((v) => ({
                            ...v,
                            serviceFee:
                              e.target.value,
                          }))
                        }
                      />

                      {/* ------------------------------------------------ */}
                      {/* LIVE COMMERCIAL SUMMARY                         */}
                      {/* ------------------------------------------------ */}

                      <div className="rounded-xl border border-[#CFE8D1] bg-[#F8FCF8] p-4">
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#6B7280]">
                          Commercial summary
                        </p>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">
                              Quantity
                            </span>

                            <span className="font-medium">
                              {quantity} MT
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">
                              Credit price
                            </span>

                            <span className="font-medium">
                              {money(creditPrice)} / MT
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">
                              Credits value
                            </span>

                            <span className="font-semibold">
                              {money(creditSubtotal)}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-[#6B7280]">
                              EPR Nexuss commission
                            </span>

                            <span className="font-semibold">
                              {money(serviceFee)}
                            </span>
                          </div>

                          <div className="border-t border-[#DDEADF] pt-2 mt-2 flex justify-between">
                            <span className="font-semibold">
                              Total amount
                            </span>

                            <span className="text-base font-bold text-[#2E7D32]">
                              {money(total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Input
                        label="Expires At"
                        type="datetime-local"
                        value={offer.expiresAt}
                        onChange={(e) =>
                          setOffer((v) => ({
                            ...v,
                            expiresAt:
                              e.target.value,
                          }))
                        }
                      />

                      <Textarea
                        label="Note to Buyer"
                        value={offer.note}
                        onChange={(e) =>
                          setOffer((v) => ({
                            ...v,
                            note: e.target.value,
                          }))
                        }
                        placeholder="Optional commercial note..."
                      />

                      <Button
                        className="w-full"
                        onClick={saveOffer}
                        disabled={savingOffer}
                      >
                        {savingOffer
                          ? "Sending..."
                          : selected.offer?.finalAmount !=
                              null
                            ? "Send Revised Quotation"
                            : "Send Quotation"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}