import { useMemo, useState } from "react";
import { DealRoom } from "./DealRoom.jsx";
import { Badge, Button, Card } from "./ui";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const STATUS = {
  matched: "Matched",
  negotiating: "Negotiating",
  terms_agreed: "Terms agreed",
  payment_coordination: "Payment",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PAYMENT = {
  pending: "Payment pending",
  initiated: "Payment initiated",
  received: "Payment received",
  failed: "Payment failed",
};

function statusTone(status) {
  if (status === "completed") return "bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]";
  if (status === "cancelled") return "bg-[#FFF1F3] text-[#C01048] border-[#FECDD6]";
  if (status === "payment_coordination") return "bg-[#FFF7E6] text-[#B54708] border-[#FEDF89]";
  if (status === "terms_agreed") return "bg-[#EEF4FF] text-[#3538CD] border-[#C7D7FE]";
  return "bg-[#F2F4F7] text-[#475467] border-[#E4E7EC]";
}

function getNextStep(deal, role) {
  if (deal.status === "cancelled") return { label: "No action required", detail: "This deal is closed." };
  if (deal.status === "completed") return { label: "Deal completed", detail: "This transaction is complete." };
  if (role === "buyer") {
    if (deal.status === "matched" || deal.status === "negotiating") {
      return { label: "Continue in Deal Room", detail: "Review the deal and complete the next transaction step." };
    }
    if (deal.paymentStatus === "received") {
      return { label: "Payment confirmed", detail: "EPR Nexuss is completing the transaction." };
    }
    return { label: "Open Deal Room", detail: "Review Payment & Invoice and continue the transaction." };
  }
  if (deal.paymentStatus === "pending" || deal.paymentStatus === "initiated") {
    return { label: "Awaiting buyer payment", detail: "You'll be notified when payment is confirmed." };
  }
  if (deal.paymentStatus === "received") {
    return { label: "Payment received", detail: "Review the Deal Room and continue fulfillment." };
  }
  return { label: "Review Deal Room", detail: "Keep the transaction moving from the Deal Room." };
}

function CompactDealCard({ deal, role, openDealId, openDealTab, onOpenDealRoom, onCloseDealRoom, onDealRoomTabChange }) {
  const [expanded, setExpanded] = useState(false);
  const quantity = Number(deal.quantity || 0);
  const price = Number(deal.agreedPrice || 0);
  const estimatedValue = quantity * price;
  const creditValue = Number(deal.creditSubtotal ?? estimatedValue);
  const fee = Number(deal.serviceFee ?? deal.commissionAmount ?? 0);
  const total = Number(deal.finalAmount ?? creditValue + fee);
  const next = getNextStep(deal, role);
  const category = deal.listing?.category || "EPR Credit Deal";
  const location = deal.listing?.location || "Location not specified";
  const paymentLabel = PAYMENT[deal.paymentStatus] || "Payment pending";

  return (
    <article className="group border-b border-[#EEF1F4] last:border-b-0 px-5 py-4 transition-colors hover:bg-[#FCFDFD]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF7EC] text-[#2E7D32] font-bold text-sm">
              {category.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold text-[#101828]">{category}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(deal.status)}`}>
                  {STATUS[deal.status] || deal.status || "Active"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#667085]">
                #{String(deal._id || "").slice(-8)} · {quantity.toLocaleString("en-IN")} MT · {location}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div><span className="text-[#98A2B3]">Price</span> <span className="font-semibold text-[#344054]">{money(price)}/MT</span></div>
            <div><span className="text-[#98A2B3]">Value</span> <span className="font-semibold text-[#344054]">{money(role === "buyer" ? total : creditValue)}</span></div>
            <div><span className="text-[#98A2B3]">Payment</span> <span className="font-medium text-[#475467]">{paymentLabel}</span></div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          <div className="rounded-xl bg-[#F7F9FB] px-3 py-2 sm:max-w-[250px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Next step</p>
            <p className="mt-0.5 text-xs font-semibold text-[#344054]">{next.label}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Hide details" : "Details"}
          </Button>
          <DealRoom
            deal={deal}
            role={role}
            controlledOpen={String(openDealId || "") === String(deal._id)}
            initialTab={String(openDealId || "") === String(deal._id) ? openDealTab : "overview"}
            onOpen={() => {
              const paymentStage = role === "buyer" && ["terms_agreed", "payment_coordination"].includes(deal.status);
              onOpenDealRoom?.(deal, paymentStage ? "payment" : "overview");
            }}
            onClose={onCloseDealRoom}
            onTabChange={onDealRoomTabChange}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[#E7EBEF] bg-[#FAFBFC] p-4 md:grid-cols-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Credit value</p>
            <p className="mt-1 text-sm font-semibold text-[#344054]">{money(creditValue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">EPR Nexuss fee</p>
            <p className="mt-1 text-sm font-semibold text-[#344054]">{money(fee)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">{role === "buyer" ? "Total payable" : "Deal value"}</p>
            <p className="mt-1 text-sm font-semibold text-[#344054]">{money(role === "buyer" ? total : creditValue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Compliance</p>
            <p className="mt-1 text-sm font-semibold text-[#344054]">FY {deal.listing?.complianceYear || "—"}</p>
          </div>
          <div className="md:col-span-4 border-t border-[#E7EBEF] pt-3">
            <p className="text-xs font-medium text-[#475467]">{next.detail}</p>
            {deal.notes ? <p className="mt-1 text-xs text-[#667085]">Note: {deal.notes}</p> : null}
          </div>
        </div>
      )}
    </article>
  );
}

export function DealsSection({
  deals = [],
  role = "buyer",
  loading = false,
  error = "",
  openDealId = null,
  openDealTab = "overview",
  onOpenDealRoom,
  onCloseDealRoom,
  onDealRoomTabChange,
}) {
  const [filter, setFilter] = useState("active");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    all: deals.length,
    active: deals.filter((d) => !["completed", "cancelled"].includes(d.status)).length,
    payment: deals.filter((d) => ["pending", "initiated"].includes(d.paymentStatus) && d.status !== "completed" && d.status !== "cancelled").length,
    completed: deals.filter((d) => d.status === "completed").length,
  }), [deals]);

  const filteredDeals = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return deals.filter((deal) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !["completed", "cancelled"].includes(deal.status)) ||
        (filter === "payment" && ["pending", "initiated"].includes(deal.paymentStatus) && deal.status !== "completed" && deal.status !== "cancelled") ||
        (filter === "completed" && deal.status === "completed");
      if (!matchesFilter) return false;
      if (!normalized) return true;
      const haystack = [deal.listing?.category, deal.listing?.location, deal._id, deal.status, deal.paymentStatus].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [deals, filter, query]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[#E7EBEF] px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-semibold text-[#101828]">My Deals</h2>
              <span className="rounded-full bg-[#EAF7EC] px-2.5 py-1 text-xs font-bold text-[#2E7D32]">{deals.length}</span>
            </div>
            <p className="mt-1 text-sm text-[#667085]">Your transactions, with the next action surfaced first.</p>
          </div>
          <div className="relative w-full lg:w-64">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
              <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-4-4" />
            </svg>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deals..." className="w-full rounded-xl border border-[#E4E7EC] bg-[#FAFBFC] py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#98A2B3]" />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {[
            ["active", "Active", counts.active],
            ["payment", "Payment", counts.payment],
            ["completed", "Completed", counts.completed],
            ["all", "All", counts.all],
          ].map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${filter === key ? "bg-[#101828] text-white" : "bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]"}`}>
              {label} <span className={filter === key ? "text-white/70" : "text-[#98A2B3]"}>· {count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#F7F9FB]" />)}
        </div>
      ) : error ? (
        <div className="px-5 py-14 text-center text-sm text-[#D92D20]">{error}</div>
      ) : filteredDeals.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F4F7] text-[#667085]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6Zm7-5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#344054]">{query ? "No matching deals" : filter === "completed" ? "No completed deals" : "No deals here"}</p>
          <p className="mt-1 text-xs text-[#667085]">{query ? "Try a different category, location, or deal ID." : "Your transaction activity will appear here."}</p>
        </div>
      ) : (
        <div>
          {filteredDeals.map((deal) => (
            <CompactDealCard
              key={deal._id}
              deal={deal}
              role={role}
              openDealId={openDealId}
              openDealTab={openDealTab}
              onOpenDealRoom={onOpenDealRoom}
              onCloseDealRoom={onCloseDealRoom}
              onDealRoomTabChange={onDealRoomTabChange}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
