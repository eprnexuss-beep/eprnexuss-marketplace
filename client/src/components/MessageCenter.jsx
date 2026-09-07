import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import { Badge, Button, Card, Input, Textarea } from "./ui";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

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

const isLocked = (status) => ["approved", "completed", "cancelled"].includes(status);

function MessageList({ messages, role }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F9FB] min-h-0">
      {messages.length === 0 ? (
        <div className="h-full min-h-[240px] flex items-center justify-center text-center">
          <div>
            <p className="text-sm font-medium text-[#374151]">No messages yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Messages are private between you and EPR Nexuss.
            </p>
          </div>
        </div>
      ) : (
        messages.map((item) => {
          const mine = item.senderRole === role;
          return (
            <div key={item._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                  mine
                    ? "bg-[#5AC361] text-white"
                    : "bg-white border border-[#E5EAF0] text-[#374151]"
                }`}
              >
                <p className="text-[11px] font-semibold opacity-70 mb-1">{item.senderLabel}</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.message}</p>
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

export function MessageChat({ requestId, role = "buyer", compact = false, onRead }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ request: null, messages: [] });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      const response = await api.get(`/requests/${requestId}/messages`);
      if (response.data.success) {
        setData({ request: response.data.request, messages: response.data.messages || [] });
        onRead?.(requestId);
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
      const response = await api.post(`/requests/${requestId}/messages`, { message: trimmed });
      if (response.data.success) {
        setData((current) => ({ ...current, messages: [...current.messages, response.data.message] }));
        setMessage("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send your message to EPR Nexuss.");
    } finally {
      setSending(false);
    }
  };

  const request = data.request;
  const locked = isLocked(request?.status);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {compact ? "Open Messages" : "Open Messages"}
      </Button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[min(700px,92vh)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-[#0F1923]">EPR Nexuss Messages</h3>
                <p className="text-xs text-[#9CA3AF] mt-1">Your conversation is private. Buyer and seller contact details are never shared.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-[#F0F4F8] text-[#6B7280]">✕</button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-[#9CA3AF]">Loading conversation...</div>
              ) : (
                <MessageList messages={data.messages} role={role} />
              )}
              <div className="p-4 border-t border-[#E5EAF0] shrink-0">
                <div className="flex gap-2 items-end">
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message EPR Nexuss about documents, timing or transaction coordination..." className="min-h-[72px]" />
                  <Button onClick={send} disabled={sending || !message.trim()}>{sending ? "Sending..." : "Send"}</Button>
                </div>
                {locked ? <p className="text-[11px] text-[#6B7280] mt-2">Commercial terms are locked. Messages are now for transaction coordination only.</p> : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

