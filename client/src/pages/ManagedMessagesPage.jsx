import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import { Badge, Button, Card, Textarea } from "../components/ui.jsx";

const formatStatus = (value) => String(value || "unknown").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function ManagedMessagesPage({ initialRequestId = "", onRead }) {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(initialRequestId);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("buyer");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/requests/admin/negotiations");
      if (response.data.success) {
        const incoming = response.data.requests || [];
        setRequests(incoming);
        if (!selectedId || !incoming.some((item) => item._id === selectedId)) setSelectedId(incoming[0]?._id || "");
      }
    } catch (error) {
      console.error("Admin messages load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (id = selectedId) => {
    if (!id) return;
    try {
      setThreadLoading(true);
      const response = await api.get(`/requests/${id}/messages`);
      if (response.data.success) {
        setMessages(response.data.messages || []);
        onRead?.(id);
      }
    } catch (error) {
      console.error("Admin message thread failed:", error);
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (initialRequestId) {
      setSelectedId(initialRequestId);
    }
  }, [initialRequestId]);

  useEffect(() => {
    loadThread();
  }, [selectedId]);

  const selected = useMemo(() => requests.find((item) => item._id === selectedId) || null, [requests, selectedId]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || !selectedId) return;
    try {
      setSending(true);
      const response = await api.post(`/requests/${selectedId}/messages`, { message: trimmed, targetRole });
      if (response.data.success) {
        setMessages((current) => [...current, response.data.message]);
        setMessage("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send the message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-170px)] min-h-[600px] grid xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
      <Card className="overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-4 border-b border-[#E5EAF0]"><h2 className="font-semibold text-[#0F1923]">Messages</h2><p className="text-xs text-[#9CA3AF] mt-1">Private operational communication. Quotations are handled separately.</p></div>
        <div className="overflow-y-auto min-h-0">
          {loading ? <p className="p-6 text-sm text-[#9CA3AF]">Loading conversations...</p> : requests.map((request) => (
            <button type="button" key={request._id} onClick={() => setSelectedId(request._id)} className={`w-full text-left p-4 border-b border-[#F0F4F8] ${selectedId === request._id ? "bg-[#F0FBF1]" : "hover:bg-[#F8FAFC]"}`}>
              <div className="flex items-center justify-between gap-2"><p className="font-semibold text-sm text-[#0F1923]">{request.listingId?.category || "EPR Credit"}</p><Badge label={formatStatus(request.status)} /></div>
              <p className="text-xs text-[#6B7280] mt-1">{request.quantity} MT</p>
            </button>
          ))}
          {!loading && requests.length === 0 ? <p className="p-6 text-sm text-[#9CA3AF]">No conversations yet.</p> : null}
        </div>
      </Card>
      <Card className="overflow-hidden flex flex-col min-h-0">
        {!selected ? <div className="h-full flex items-center justify-center p-12 text-center text-[#9CA3AF]">Select a conversation.</div> : <>
          <div className="p-4 sm:p-5 border-b border-[#E5EAF0]"><h2 className="font-semibold text-[#0F1923]">{selected.listingId?.category || "Credit"} · {selected.quantity} MT</h2><p className="text-xs text-[#6B7280] mt-1">Buyer: {selected.buyerId?.company || selected.buyerId?.name || "—"} · Seller: {selected.listingId?.sellerId?.company || selected.listingId?.sellerId?.name || "—"}</p></div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-[#F7F9FB]">
            {threadLoading ? <div className="text-center text-sm text-[#9CA3AF]">Loading messages...</div> : messages.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">No messages yet.</div> : messages.map((item) => <div key={item._id} className="bg-white border border-[#E5EAF0] rounded-xl p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#0F1923]">{item.senderRole === "admin" ? `EPR Nexuss → ${item.targetRole === "seller" ? "Seller" : "Buyer"}` : `${item.senderRole === "seller" ? "Seller" : "Buyer"} → EPR Nexuss`}</p><span className="text-[10px] text-[#9CA3AF]">{new Date(item.createdAt).toLocaleString("en-IN")}</span></div><p className="text-sm text-[#374151] mt-2 whitespace-pre-wrap">{item.message}</p></div>)}
          </div>
          <div className="p-4 border-t border-[#E5EAF0] shrink-0"><div className="flex flex-wrap gap-2 mb-2"><button type="button" onClick={() => setTargetRole("buyer")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${targetRole === "buyer" ? "bg-[#EBF8EC] border-[#B7DFC0] text-[#2E7D32]" : "border-[#E5EAF0] text-[#6B7280]"}`}>Reply to Buyer</button><button type="button" onClick={() => setTargetRole("seller")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${targetRole === "seller" ? "bg-[#EBF8EC] border-[#B7DFC0] text-[#2E7D32]" : "border-[#E5EAF0] text-[#6B7280]"}`}>Reply to Seller</button></div><div className="flex gap-2 items-end"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Message ${targetRole}...`} className="min-h-[70px]" /><Button onClick={send} disabled={sending || !message.trim()}>{sending ? "Sending..." : `Send to ${targetRole === "buyer" ? "Buyer" : "Seller"}`}</Button></div></div>
        </>}
      </Card>
    </div>
  );
}
