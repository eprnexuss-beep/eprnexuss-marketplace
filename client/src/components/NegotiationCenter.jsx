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
  ["approved", "completed", "cancelled"].includes(status);

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
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
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

function QuotationCard({ request, onAccept, accepting }) {
  if (!request?.offer?.finalAmount && request?.offer?.finalAmount !== 0) {
    return (
      <div className="rounded-xl border border-[#E5EAF0] bg-white p-4">
        <p className="text-sm font-semibold text-[#374151]">
          Quotation pending
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">
          EPR Nexuss will review your request and send the commercial quotation.
        </p>
      </div>
    );
  }

  const offer = request.offer;
  const accepted = Boolean(offer.acceptedAt);
  const expired =
    offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now();

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
          {accepted ? "Accepted & locked" : expired ? "Expired" : "Awaiting response"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6B7280]">Credit value</span>
          <b>{money(offer.creditSubtotal)}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280]">EPR Nexuss service fee</span>
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

      {!accepted && !expired ? (
        <Button className="w-full mt-4" onClick={onAccept} disabled={accepting}>
          {accepting ? "Confirming..." : "Accept Quotation"}
        </Button>
      ) : null}

      {accepted ? (
        <div className="mt-4 text-xs text-[#2E7D32]">
          Commercial terms are locked. Your transaction has moved to the next
          stage.
        </div>
      ) : null}
    </div>
  );
}

export function NegotiationChat({
  requestId,
  role = "buyer",
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ request: null, messages: [] });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = async () => {
    if (!requestId) return;

    try {
      setLoading(true);
      const response = await api.get(`/requests/${requestId}/messages`);

      if (response.data.success) {
        setData({
          request: response.data.request,
          messages: response.data.messages || [],
        });
      }
    } catch (error) {
      console.error("Request conversation load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open, requestId]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const response = await api.post(`/requests/${requestId}/messages`, {
        message: trimmed,
      });

      if (response.data.success) {
        setData((current) => ({
          ...current,
          messages: [...current.messages, response.data.message],
        }));
        setMessage("");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to send your message to EPR Nexuss.",
      );
    } finally {
      setSending(false);
    }
  };

  const accept = async () => {
    if (accepting) return;

    try {
      setAccepting(true);
      const response = await api.post(
        `/requests/${requestId}/accept-offer`,
      );

      if (response.data.success) {
        setData((current) => ({
          ...current,
          request: response.data.request,
        }));
        await load();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Unable to accept this quotation.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const request = data.request;
  const locked = isLocked(request?.status);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {compact ? "Message EPR Nexuss" : "Open Messages"}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[min(760px,92vh)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-[#0F1923]">
                  EPR Nexuss Messages
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Your conversation is private. Buyer and seller contact
                  details are never shared.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-[#F0F4F8] text-[#6B7280]"
              >
                ✕
              </button>
            </div>

            <div className="grid md:grid-cols-[1fr_320px] flex-1 min-h-0">
              <div className="min-h-0 flex flex-col border-r border-[#E5EAF0]">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-[#9CA3AF]">
                    Loading conversation...
                  </div>
                ) : (
                  <MessageList messages={data.messages} role={role} />
                )}

                <div className="p-4 border-t border-[#E5EAF0] shrink-0">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Message EPR Nexuss about price, quantity, documents or timing..."
                      className="min-h-[72px]"
                    />
                    <Button
                      onClick={send}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                  {locked ? (
                    <p className="text-[11px] text-[#6B7280] mt-2">
                      Commercial terms are locked. Messages are now for
                      transaction coordination only.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="p-4 bg-white overflow-y-auto">
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E5EAF0] p-4">
                  <p className="text-xs text-[#9CA3AF]">Credit</p>
                  <p className="font-semibold text-[#0F1923] mt-1">
                    {request?.listing?.category || "EPR Credit"}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {request?.requestedQuantity || 0} MT
                  </p>
                  <div className="mt-3">
                    <Badge label={statusLabel(request?.status)} />
                  </div>
                </div>

                {role === "buyer" ? (
                  <div className="mt-4">
                    <QuotationCard
                      request={request}
                      onAccept={accept}
                      accepting={accepting}
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-[#E5EAF0] p-4">
                    <p className="text-sm font-semibold text-[#374151]">
                      EPR Nexuss is handling the buyer quotation
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                      You can discuss your listing, quantity, availability and
                      commercial expectations directly with EPR Nexuss. Your
                      buyer's identity and the buyer-facing service fee remain
                      private.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function NegotiationCenter({ initialRequestId = "" }) {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState({ request: null, messages: [] });
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("buyer");
  const [offer, setOffer] = useState({
    creditPricePerUnit: "",
    serviceFee: "",
    note: "",
    expiresAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingOffer, setSavingOffer] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/requests/admin/negotiations");

      if (response.data.success) {
        const incoming = response.data.requests || [];
        setRequests(incoming);

        if (
          initialRequestId &&
          incoming.some((item) => item._id === initialRequestId)
        ) {
          setSelectedId(initialRequestId);
        } else if (
          selectedId &&
          !incoming.some((item) => item._id === selectedId)
        ) {
          setSelectedId(incoming[0]?._id || "");
        } else if (!selectedId && incoming[0]?._id) {
          setSelectedId(incoming[0]._id);
        }
      }
    } catch (error) {
      console.error("Admin request center failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (id = selectedId) => {
    if (!id) return;

    try {
      const response = await api.get(`/requests/${id}/messages`);

      if (response.data.success) {
        setData({
          request: response.data.request,
          messages: response.data.messages || [],
        });

        const currentOffer = response.data.request?.offer;

        setOffer({
          creditPricePerUnit:
            currentOffer?.creditPricePerUnit ?? "",
          serviceFee: currentOffer?.serviceFee ?? "",
          note: "",
          expiresAt: currentOffer?.expiresAt
            ? new Date(currentOffer.expiresAt)
                .toISOString()
                .slice(0, 16)
            : "",
        });
      }
    } catch (error) {
      console.error("Admin request conversation failed:", error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    loadThread();
  }, [selectedId]);

  const selected = useMemo(
    () => requests.find((item) => item._id === selectedId),
    [requests, selectedId],
  );

  const total = useMemo(() => {
    return (
      Number(offer.creditPricePerUnit || 0) *
        Number(selected?.quantity || 0) +
      Number(offer.serviceFee || 0)
    );
  }, [offer.creditPricePerUnit, offer.serviceFee, selected?.quantity]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || !selectedId) return;

    try {
      setSending(true);

      const response = await api.post(
        `/requests/${selectedId}/messages`,
        {
          message: trimmed,
          targetRole,
        },
      );

      if (response.data.success) {
        setData((current) => ({
          ...current,
          messages: [...current.messages, response.data.message],
        }));
        setMessage("");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send the message.",
      );
    } finally {
      setSending(false);
    }
  };

  const saveOffer = async () => {
    if (!selectedId) return;

    if (
      offer.creditPricePerUnit === "" ||
      offer.serviceFee === ""
    ) {
      toast.error("Enter both the credit price and EPR Nexuss service fee.");
      return;
    }

    try {
      setSavingOffer(true);

      const response = await api.patch(
        `/requests/admin/${selectedId}/offer`,
        {
          creditPricePerUnit: Number(offer.creditPricePerUnit),
          serviceFee: Number(offer.serviceFee),
          note: offer.note,
          expiresAt: offer.expiresAt || null,
        },
      );

      if (response.data.success) {
        await loadRequests();
        await loadThread(selectedId);
        setMessage("");
        setOffer((current) => ({ ...current, note: "" }));
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send the quotation.",
      );
    } finally {
      setSavingOffer(false);
    }
  };

  const requestStatus = data.request?.status || selected?.status;
  const locked = isLocked(requestStatus);

  return (
    <div className="h-[calc(100vh-130px)] min-h-[620px] grid xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
      <Card className="overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-[#E5EAF0] shrink-0">
          <h2 className="font-semibold text-[#0F1923]">
            Credit Requests
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Review requests and manage EPR Nexuss quotations.
          </p>
        </div>

        <div className="overflow-y-auto min-h-0">
          {loading ? (
            <p className="p-6 text-sm text-[#9CA3AF]">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="p-6 text-sm text-[#9CA3AF]">
              No credit requests yet.
            </p>
          ) : (
            requests.map((request) => (
              <button
                type="button"
                key={request._id}
                onClick={() => setSelectedId(request._id)}
                className={`w-full text-left p-4 border-b border-[#F0F4F8] ${
                  selectedId === request._id
                    ? "bg-[#F0FBF1]"
                    : "hover:bg-[#F8FAFC]"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-semibold text-sm text-[#0F1923]">
                    {request.listingId?.category || "EPR Credit"}
                  </p>
                  <Badge label={statusLabel(request.status)} />
                </div>
                <p className="text-xs text-[#6B7280] mt-1">
                  {request.quantity} MT ·{" "}
                  {request.buyerId?.company ||
                    request.buyerId?.name ||
                    "Buyer"}
                </p>
                <p className="text-[11px] text-[#9CA3AF] mt-2">
                  {request.offer?.finalAmount != null
                    ? `Quotation #${request.offer.version} · ${money(request.offer.finalAmount)}`
                    : "Quotation not issued"}
                </p>
              </button>
            ))
          )}
        </div>
      </Card>

      <Card className="overflow-hidden flex flex-col min-h-0">
        {!selected ? (
          <div className="h-full flex items-center justify-center p-12 text-center text-[#9CA3AF]">
            Select a credit request to begin.
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-5 border-b border-[#E5EAF0] shrink-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-[#0F1923]">
                    {selected.listingId?.category || "Credit"} ·{" "}
                    {selected.quantity} MT
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-1">
                    Buyer:{" "}
                    {selected.buyerId?.company ||
                      selected.buyerId?.name ||
                      "—"}{" "}
                    · Seller:{" "}
                    {selected.listingId?.sellerId?.company ||
                      selected.listingId?.sellerId?.name ||
                      "—"}
                  </p>
                </div>
                <Badge label={statusLabel(requestStatus)} />
              </div>
            </div>

            <div className="flex-1 min-h-0 grid xl:grid-cols-[minmax(0,1fr)_350px]">
              <div className="min-h-0 flex flex-col border-r border-[#E5EAF0]">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E5EAF0] flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-[#374151]">
                      Private communication
                    </p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      Admin controls who receives each message.
                    </p>
                  </div>
                </div>

                <MessageList messages={data.messages} role="admin" />

                <div className="p-4 border-t border-[#E5EAF0] shrink-0 bg-white">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#6B7280]">
                      Send to:
                    </span>
                    {["buyer", "seller"].map((target) => (
                      <button
                        type="button"
                        key={target}
                        onClick={() => setTargetRole(target)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          targetRole === target
                            ? "bg-[#0F1923] text-white border-[#0F1923]"
                            : "bg-white text-[#6B7280] border-[#E5EAF0]"
                        }`}
                      >
                        {target === "buyer" ? "Buyer" : "Seller"}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 items-end">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message ${
                        targetRole === "buyer" ? "buyer" : "seller"
                      } through EPR Nexuss...`}
                      className="min-h-[72px]"
                    />
                    <Button
                      onClick={send}
                      disabled={sending || !message.trim()}
                    >
                      {sending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </div>
              </div>

              <aside className="overflow-y-auto p-4 bg-white space-y-4">
                <div className="rounded-xl bg-[#F8FAFC] border border-[#E5EAF0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Request
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <span className="text-xs text-[#9CA3AF]">
                        Credit
                      </span>
                      <p className="font-semibold">
                        {selected.listingId?.category || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#9CA3AF]">
                        Quantity
                      </span>
                      <p className="font-semibold">
                        {selected.quantity} MT
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#9CA3AF]">
                        Seller price
                      </span>
                      <p className="font-semibold">
                        {money(selected.listingId?.price)} / MT
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#9CA3AF]">
                        Available
                      </span>
                      <p className="font-semibold">
                        {selected.listingId?.quantity ?? "—"} MT
                      </p>
                    </div>
                  </div>
                </div>

                {!locked ? (
                  <div className="rounded-xl border border-[#CFE8D1] bg-[#F8FCF8] p-4">
                    <p className="text-sm font-semibold text-[#2E7D32]">
                      EPR Nexuss quotation
                    </p>
                    <p className="text-xs text-[#52715A] mt-1">
                      Set the exact credit price and manual service fee. No
                      percentage commission is used.
                    </p>

                    <div className="space-y-3 mt-4">
                      <Input
                        label="Credit price per MT"
                        type="number"
                        min="0"
                        value={offer.creditPricePerUnit}
                        onChange={(e) =>
                          setOffer((current) => ({
                            ...current,
                            creditPricePerUnit: e.target.value,
                          }))
                        }
                      />

                      <Input
                        label="EPR Nexuss service fee"
                        type="number"
                        min="0"
                        value={offer.serviceFee}
                        onChange={(e) =>
                          setOffer((current) => ({
                            ...current,
                            serviceFee: e.target.value,
                          }))
                        }
                      />

                      <Textarea
                        label="Quotation note"
                        value={offer.note}
                        onChange={(e) =>
                          setOffer((current) => ({
                            ...current,
                            note: e.target.value,
                          }))
                        }
                        placeholder="Optional message shown to the buyer."
                      />

                      <Input
                        label="Quotation expiry"
                        type="datetime-local"
                        value={offer.expiresAt}
                        onChange={(e) =>
                          setOffer((current) => ({
                            ...current,
                            expiresAt: e.target.value,
                          }))
                        }
                      />

                      <div className="rounded-lg bg-white border border-[#E5EAF0] p-3">
                        <div className="flex justify-between text-sm">
                          <span>Credit value</span>
                          <b>
                            {money(
                              Number(offer.creditPricePerUnit || 0) *
                                Number(selected.quantity || 0),
                            )}
                          </b>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Service fee</span>
                          <b>{money(offer.serviceFee)}</b>
                        </div>
                        <div className="flex justify-between font-bold text-[#0F1923] mt-2 pt-2 border-t border-[#E5EAF0]">
                          <span>Buyer pays</span>
                          <span>{money(total)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={saveOffer}
                        disabled={savingOffer}
                      >
                        {savingOffer
                          ? "Sending quotation..."
                          : data.request?.offer?.version
                            ? "Send Revised Quotation"
                            : "Send Quotation"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#B7DFC0] bg-[#F0FBF1] p-4">
                    <p className="text-sm font-semibold text-[#2E7D32]">
                      Deal confirmed
                    </p>
                    <p className="text-xs text-[#52715A] mt-1">
                      The accepted quotation is locked. Do not issue another
                      quotation for this request.
                    </p>
                    {data.request?.offer ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Quotation</span>
                          <b>#{data.request.offer.version}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Credit value</span>
                          <b>{money(data.request.offer.creditSubtotal)}</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Service fee</span>
                          <b>{money(data.request.offer.serviceFee)}</b>
                        </div>
                        <div className="flex justify-between font-bold border-t border-[#CFE8D1] pt-2">
                          <span>Final amount</span>
                          <span>{money(data.request.offer.finalAmount)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="rounded-xl border border-[#E5EAF0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    Quotation history
                  </p>

                  {(data.request?.offerHistory || []).length === 0 ? (
                    <p className="text-xs text-[#9CA3AF] mt-3">
                      No previous quotations.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {(data.request.offerHistory || [])
                        .slice()
                        .reverse()
                        .map((item) => (
                          <div
                            key={`${item.version}-${item.sentAt}`}
                            className="rounded-lg bg-[#F8FAFC] border border-[#E5EAF0] p-3 text-xs"
                          >
                            <div className="flex justify-between">
                              <b>Quotation #{item.version}</b>
                              <span className="text-[#9CA3AF]">
                                {money(item.finalAmount)}
                              </span>
                            </div>
                            <p className="text-[#9CA3AF] mt-1">
                              {item.sentAt
                                ? new Date(item.sentAt).toLocaleString("en-IN")
                                : "—"}
                            </p>
                            {item.acceptedAt ? (
                              <p className="text-[#2E7D32] font-semibold mt-1">
                                Accepted
                              </p>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
