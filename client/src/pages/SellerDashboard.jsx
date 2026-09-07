import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { NotificationBell, ProfileMenu, ProfileSection } from "../components/AccountTools.jsx";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SectionHeader,
  StatCard,
  Table,
  Tr,
  Td,
} from "../components/ui";
import { DealRoom } from "../components/DealRoom.jsx";
import { DealsSection } from "../components/DealsSection.jsx";
import { DisputesPage } from "../components/DisputeCenter.jsx";
import { MessageChat } from "../components/MessageCenter.jsx";
import SellerListingsSection from "../components/SellerListingsSection.jsx";
import SellerInventorySection from "../components/SellerInventorySection.jsx";
import SellerEarningsSection from "../components/SellerEarningsSection.jsx";
import SellerAnalyticsSection from "../components/SellerAnalyticsSection.jsx";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import VerificationStatusBanner from "../components/VerificationStatusBanner.jsx";

function CompactSellerRequests({ requests = [], loading = false, error = "", onRetry, onRead }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const normalized = requests.map((request) => ({
    ...request,
    _bucket: ["completed", "cancelled", "rejected"].includes(String(request.status || "").toLowerCase())
      ? "closed"
      : ["new", "reviewing"].includes(String(request.status || "").toLowerCase())
        ? "new"
        : "active",
  }));
  const counts = {
    all: normalized.length,
    new: normalized.filter((r) => r._bucket === "new").length,
    active: normalized.filter((r) => r._bucket === "active").length,
    closed: normalized.filter((r) => r._bucket === "closed").length,
  };
  const visible = normalized.filter((r) => {
    const matches = filter === "all" || r._bucket === filter;
    const q = query.trim().toLowerCase();
    if (!matches) return false;
    if (!q) return true;
    return [r._id, r.listing?.category, r.listing?.location, r.buyer?.company, r.buyerId?.company, r.status]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });
  const tone = {
    new: "bg-[#ECFDF3] text-[#087443] border-[#B7E4C7]",
    active: "bg-[#EEF4FF] text-[#175CD3] border-[#C7D7FE]",
    closed: "bg-[#F2F4F7] text-[#475467] border-[#D0D5DD]",
  };
  const label = (r) => r._bucket === "new" ? "New request" : r._bucket === "closed" ? (r.status === "completed" ? "Completed" : "Closed") : (r.status || "In progress");

  if (loading) return <Card><div className="space-y-3 p-5"><div className="h-5 w-40 animate-pulse rounded bg-[#F2F4F7]"/><div className="h-20 animate-pulse rounded-xl bg-[#F8FAFC]"/><div className="h-20 animate-pulse rounded-xl bg-[#F8FAFC]"/></div></Card>;
  if (error) return <Card><div className="p-8 text-center"><p className="text-sm font-semibold text-[#B42318]">Unable to load purchase requests</p><p className="mt-1 text-sm text-[#667085]">{error}</p><Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>Retry</Button></div></Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">Seller workspace</p><h2 className="mt-1 font-heading text-xl font-semibold text-[#101828]">Purchase Requests</h2><p className="mt-1 text-sm text-[#667085]">Review incoming buyer requests and keep each transaction moving.</p></div>
        <span className="rounded-full bg-[#F2F4F7] px-3 py-1.5 text-xs font-semibold text-[#475467]">{requests.length} request{requests.length === 1 ? "" : "s"}</span>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-[#EAECF0] p-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search buyer, category, location or ID..." className="w-full rounded-xl border border-[#D0D5DD] bg-[#FCFCFD] px-3.5 py-2.5 text-sm text-[#344054] outline-none focus:border-[#3EA646]"/>
          <div className="mt-3 flex flex-wrap gap-2">{[["all","All"],["new","New"],["active","In progress"],["closed","Closed"]].map(([key,text]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === key ? "bg-[#101828] text-white" : "bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]"}`}>{text} <span className="ml-1 opacity-70">{counts[key]}</span></button>)}</div>
        </div>
        {visible.length === 0 ? <div className="px-6 py-14 text-center"><p className="text-sm font-semibold text-[#344054]">No purchase requests found</p><p className="mt-1 text-sm text-[#667085]">Try another filter or search term.</p></div> : <div className="divide-y divide-[#EAECF0]">
          {visible.map((request) => {
            const id=request._id, open=expandedId===id, category=request.listing?.category||"Credit Request", qty=Number(request.requestedQuantity||0), price=request.listing?.price, location=request.listing?.location||"—", buyer=request.buyer?.company||request.buyerId?.company||request.buyerId?.name||"Verified Buyer";
            return <div key={id} className="px-4 py-3.5 sm:px-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_250px_auto] lg:items-center">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#101828]">{category}</h3><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone[request._bucket]}`}>{label(request)}</span></div><p className="mt-1 text-xs text-[#667085]">#{String(id).slice(-8)} · {qty.toLocaleString("en-IN")} MT · {location}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#667085]"><span>Buyer: {buyer}</span>{price != null && <span>₹{Number(price).toLocaleString("en-IN")}/MT</span>}{request.createdAt && <span>{new Date(request.createdAt).toLocaleDateString("en-IN")}</span>}</div></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">Next step</p><p className="mt-0.5 text-xs font-semibold text-[#344054]">{request._bucket === "new" ? "Review request" : request._bucket === "closed" ? "No action required" : "Keep transaction moving"}</p></div>
                <div className="flex items-center gap-2 lg:justify-end"><button type="button" onClick={() => setExpandedId(open ? null : id)} className="rounded-lg border border-[#D0D5DD] px-3 py-2 text-xs font-semibold text-[#475467] hover:bg-[#F9FAFB]">{open ? "Hide" : "Details"}</button><Button size="sm" variant="outline" onClick={() => { onRead?.(id); }} >Messages</Button></div>
              </div>
              {open && <div className="mt-3 grid gap-3 rounded-xl border border-[#EAECF0] bg-[#FCFCFD] p-3 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wider text-[#98A2B3]">Buyer</p><p className="mt-1 text-sm font-medium text-[#344054]">{buyer}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#98A2B3]">Quantity</p><p className="mt-1 text-sm font-medium text-[#344054]">{qty.toLocaleString("en-IN")} MT</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#98A2B3]">Listed price</p><p className="mt-1 text-sm font-medium text-[#344054]">{price != null ? `₹${Number(price).toLocaleString("en-IN")}/MT` : "—"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#98A2B3]">Estimated value</p><p className="mt-1 text-sm font-semibold text-[#2E7D32]">₹{(qty*Number(price||0)).toLocaleString("en-IN")}</p></div>{request.notes && <div className="sm:col-span-2 lg:col-span-4 border-t border-[#EAECF0] pt-3"><p className="text-[10px] uppercase tracking-wider text-[#98A2B3]">Buyer requirements</p><p className="mt-1 text-sm text-[#475467]">{request.notes}</p></div>}<div className="sm:col-span-2 lg:col-span-4"><MessageChat requestId={id} role="seller" compact onRead={onRead}/></div></div>}
            </div>;
          })}
        </div>}
      </Card>
    </div>
  );
}

const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    id: "listings",
    label: "My Listings",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5L12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5l8 4.5 8-4.5M12 12v9" />
      </svg>
    ),
  },
  {
    id: "requests",
    label: "Purchase Requests",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v12a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    id: "deals",
    label: "My Deals",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    id: "earnings",
    label: "Earnings & Settlements",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M17 7.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 3 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M7 16v-5m5 5V7m5 9v-8" />
      </svg>
    ),
  },
  {
    id: "disputes",
    label: "Disputes",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3m0 4h.01M10.29 3.86l-7.2 12.48A2 2 0 004.82 19h14.36a2 2 0 001.73-2.66l-7.2-12.48a2 2 0 00-3.42 0z"
        />
      </svg>
    ),
  },
  {
    id: "messages",
    label: "Messages",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
  {
    id: "documents",
    label: "Documents",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];
function SellerDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const validSections = useMemo(() => new Set(["dashboard", "listings", "inventory", "requests", "deals", "earnings", "analytics", "disputes", "messages", "documents", "profile"]), []);
  const initialSection = validSections.has(searchParams.get("section")) ? searchParams.get("section") : "dashboard";
  const [active, setActive] = useState(initialSection);
  const validDealTabs = useMemo(() => new Set(["overview", "messages", "quotation", "payment", "dispute", "review"]), []);
  const openDealId = searchParams.get("deal");
  const openDealTab = validDealTabs.has(searchParams.get("dealTab")) ? searchParams.get("dealTab") : "overview";

  const openDealRoom = (deal, tab = "overview") => {
    if (!deal?._id) return;
    setActive("deals");
    const next = new URLSearchParams(searchParams);
    next.set("section", "deals");
    next.set("deal", String(deal._id));
    if (validDealTabs.has(tab) && tab !== "overview") next.set("dealTab", tab);
    else next.delete("dealTab");
    setSearchParams(next);
  };

  const closeDealRoom = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("deal");
    next.delete("dealTab");
    setSearchParams(next, { replace: true });
  };

  const updateDealRoomTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", "deals");
    if (validDealTabs.has(tab) && tab !== "overview") next.set("dealTab", tab);
    else next.delete("dealTab");
    setSearchParams(next, { replace: true });
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [sellerDeals, setSellerDeals] = useState([]);
  const [dealLoading, setDealLoading] = useState(true);
  const [dealError, setDealError] = useState("");
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [messageUnreadByRequest, setMessageUnreadByRequest] = useState({});

  useEffect(() => {
    const current = searchParams.get("section");
    if (active === "dashboard") {
      if (current) {
        const next = new URLSearchParams(searchParams);
        next.delete("section");
        setSearchParams(next, { replace: true });
      }
      return;
    }
    if (current !== active) {
      const next = new URLSearchParams(searchParams);
      next.set("section", active);
      setSearchParams(next, { replace: true });
    }
  }, [active, searchParams, setSearchParams]);

  const sellerCompany = user?.company?.trim() || user?.name?.trim() || "Seller";
  const sellerName = user?.name?.trim() || "Seller";
  const sellerInitial = sellerCompany.slice(0, 1).toUpperCase();

  const fetchMessageUnread = async () => {
    try {
      const response = await api.get("/requests/messages/unread-count");
      if (response.data.success) {
        setMessageUnreadCount(Number(response.data.unreadCount || 0));
        setMessageUnreadByRequest(response.data.byRequest || {});
      }
    } catch (error) {
      console.error("Failed to fetch message unread count:", error);
    }
  };

  const markRequestMessagesRead = (requestId) => {
    const count = Number(messageUnreadByRequest[String(requestId)] || 0);
    setMessageUnreadByRequest((current) => {
      const next = { ...current };
      delete next[String(requestId)];
      return next;
    });
    setMessageUnreadCount((current) => Math.max(0, current - count));
  };

  const fetchSellerDeals = async ({ silent = false } = {}) => {
    try {
      if (!silent) setDealLoading(true);
      setDealError("");

      const response = await api.get("/deals/seller");

      if (response.data.success) {
        setSellerDeals(response.data.deals);
      }
    } catch (error) {
      console.error("Failed to fetch seller deals:", error);

      setDealError(
        error.response?.data?.message || "Failed to load your deals.",
      );
    } finally {
      if (!silent) setDealLoading(false);
    }
  };

  const fetchPurchaseRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRequestLoading(true);
      setRequestError("");

      const response = await api.get("/requests/seller");

      if (response.data.success) {
        setPurchaseRequests(response.data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch seller purchase requests:", error);

      setRequestError(
        error.response?.data?.message || "Failed to load purchase requests.",
      );
    } finally {
      if (!silent) setRequestLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseRequests();
    fetchSellerDeals();
  

    const refresh = () => {
      fetchSellerDeals({ silent: true });
      fetchSellerListings({ silent: true });
      fetchPurchaseRequests({ silent: true });
      fetchMessageUnread();
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const [sellerListings, setSellerListings] = useState([]);
  const [listingLoading, setListingLoading] = useState(true);
  const [listingError, setListingError] = useState("");

  const fetchSellerListings = async ({ silent = false } = {}) => {
    try {
      if (!silent) setListingLoading(true);
      setListingError("");

      const response = await api.get("/listings/seller");

      if (response.data.success) {
        setSellerListings(response.data.listings);
      }
    } catch (error) {
      console.error("Failed to fetch seller listings:", error);
      setListingError(
        error.response?.data?.message || "Failed to load your listings.",
      );
    } finally {
      if (!silent) setListingLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerListings();
  }, []);

  const rejectedListings = useMemo(
    () => sellerListings.filter((listing) => listing.status === "rejected"),
    [sellerListings],
  );

  // Only count unread messages that belong to requests actually visible
  // to this seller. This prevents stale/unrelated unread records from
  // showing a badge such as "5" when there are no conversations.
  const visibleUnreadCount = useMemo(
    () =>
      purchaseRequests.reduce(
        (total, request) =>
          total + Number(messageUnreadByRequest[String(request._id)] || 0),
        0,
      ),
    [purchaseRequests, messageUnreadByRequest],
  );

  const inventorySummary = useMemo(() => {
    // Only admin-approved (active) listings are inventory. Pending/rejected
    // submissions remain visible in My Listings for transparency, but their
    // quantity must never appear as available inventory.
    const activeListings = sellerListings.filter(
      (listing) => listing.status === "active",
    );

    const total = activeListings.reduce(
      (sum, listing) =>
        sum + Number(listing.totalQuantity ?? listing.quantity ?? 0),
      0,
    );
    const available = activeListings.reduce(
      (sum, listing) =>
        sum + Math.max(
          Number(listing.quantity || 0) - Number(listing.reservedQuantity || 0),
          0,
        ),
      0,
    );
    const reserved = activeListings.reduce(
      (sum, listing) => sum + Number(listing.reservedQuantity || 0),
      0,
    );
    const sold = activeListings.reduce((sum, listing) => {
      const listingTotal = Number(
        listing.totalQuantity ?? listing.quantity ?? 0,
      );
      const listingAvailable = Number(listing.quantity || 0);
      return sum + Math.max(0, listingTotal - listingAvailable);
    }, 0);

    return { total, available, reserved, sold };
  }, [sellerListings]);

  const actionItems = useMemo(() => {
    const items = [];
    const pendingListings = sellerListings.filter(
      (listing) => listing.status === "pending_review",
    ).length;
    const openRequests = purchaseRequests.filter((request) =>
      ["new", "reviewing", "matched", "negotiating"].includes(request.status),
    ).length;
    const unread = visibleUnreadCount;
    const paymentDeals = sellerDeals.filter(
      (deal) =>
        deal.status === "payment_coordination" &&
        ["pending", "initiated"].includes(deal.paymentStatus),
    ).length;

    if (openRequests > 0) {
      items.push({
        title: `${openRequests} purchase request${openRequests === 1 ? "" : "s"} need attention`,
        description: "Review buyer requests and keep conversations moving.",
        action: () => setActive("requests"),
        label: "Review requests",
        tone: "blue",
      });
    }

    if (unread > 0) {
      items.push({
        title: `${unread} unread message${unread === 1 ? "" : "s"}`,
        description: "A buyer has sent a new message in an active request.",
        action: () => setActive("messages"),
        label: "Open messages",
        tone: "red",
      });
    }

    if (paymentDeals > 0) {
      items.push({
        title: `${paymentDeals} deal${paymentDeals === 1 ? "" : "s"} awaiting payment`,
        description: "Payment coordination is in progress for these deals.",
        action: () => setActive("deals"),
        label: "View deals",
        tone: "amber",
      });
    }

    if (pendingListings > 0) {
      items.push({
        title: `${pendingListings} listing${pendingListings === 1 ? "" : "s"} awaiting review`,
        description: "EPR Nexuss is reviewing these listings.",
        action: () => setActive("listings"),
        label: "View listings",
        tone: "amber",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "You're all caught up",
        description: "No urgent seller actions need your attention right now.",
        action: () => setActive("listings"),
        label: "View inventory",
        tone: "green",
      });
    }

    return items.slice(0, 3);
  }, [sellerListings, purchaseRequests, sellerDeals, visibleUnreadCount]);

  return (
    <div className="dashboard-shell min-h-screen bg-[#F7F9FB] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[252px] bg-white border-r border-[#E5EAF0] flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 md:flex`}
      >
        {/* Brand */}
        <div className="px-4 py-4 border-b border-[#E5EAF0] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#5AC361] flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-sm font-bold text-[#0F1923]"
            >
              EPR Nexuss
            </p>
            <p className="text-[10px] text-[#6B7280]">Seller Portal</p>
          </div>
        </div>

        {/* Seller info */}
        <div className="px-4 py-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#EBF8EC] text-[#5AC361] flex items-center justify-center font-bold text-sm">
              {sellerInitial}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#374151] truncate">
                {sellerCompany}
              </p>
              <p className="text-[10px] text-[#9CA3AF] truncate">
                {sellerName} · Seller account
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setActive(n.id);
                setSidebarOpen(false);
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${active === n.id ? "bg-[#EBF8EC] text-[#2E7D32]" : "text-[#6B7280] hover:bg-[#F7F9FB] hover:text-[#374151]"}`}
            >
              <span className="flex items-center gap-2.5">
                {n.icon}
                {n.label}
              </span>
              {n.id === "messages" && visibleUnreadCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active === n.id
                      ? "bg-white/60 text-[#2E7D32]"
                      : "bg-[#EF4444] text-white"
                  }`}
                >
                  {visibleUnreadCount > 99 ? "99+" : visibleUnreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-[#E5EAF0]">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[#EF4444] hover:bg-[#FEF2F2] w-full transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Home
          </button>
        </div>
      </aside>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="dashboard-main flex-1 min-w-0">
        {/* Topbar */}
        <div className="dashboard-header bg-white border-b border-[#E5EAF0] px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 hover:bg-[#F0F4F8] rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                className="w-5 h-5 text-[#6B7280]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1
              className="text-base font-semibold text-[#0F1923]"
            >
              {NAV.find((n) => n.id === active)?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate("home")}
            >
              Home
            </Button>
            <NotificationBell compact onNavigate={onNavigate} />
            <ProfileMenu compact onNavigate={onNavigate} />
            <Button size="sm" onClick={() => onNavigate("add-listing")}>
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add New Listing
            </Button>
          </div>
        </div>

        <div className="dashboard-content px-4 py-6 sm:px-6 sm:py-7 lg:px-8 max-w-[1600px]">
          <VerificationStatusBanner onNavigate={onNavigate} />

          {active === "dashboard" && (
            <>
              <PageHeader
                eyebrow="Seller workspace"
                title={`Welcome back, ${sellerName}`}
                description="Manage your EPR inventory, buyer requests, and active transactions from one place."
                actions={
                  <Button onClick={() => onNavigate("add-listing")}>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add listing
                  </Button>
                }
              />

              <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Total inventory"
                  value={`${inventorySummary.total.toLocaleString("en-IN")} MT`}
                  description="Across all your listings"
                  accent
                  icon={<span className="text-sm font-bold">MT</span>}
                />
                <StatCard
                  label="Available"
                  value={`${inventorySummary.available.toLocaleString("en-IN")} MT`}
                  description="Ready for purchase"
                  icon={<span className="text-sm font-bold">A</span>}
                />
                <StatCard
                  label="Reserved"
                  value={`${inventorySummary.reserved.toLocaleString("en-IN")} MT`}
                  description="Held for active deals"
                  icon={<span className="text-sm font-bold">R</span>}
                />
                <StatCard
                  label="Sold"
                  value={`${inventorySummary.sold.toLocaleString("en-IN")} MT`}
                  description={`${sellerDeals.filter((deal) => deal.status === "completed").length} completed deal${sellerDeals.filter((deal) => deal.status === "completed").length === 1 ? "" : "s"}`}
                  icon={<span className="text-sm font-bold">S</span>}
                />
              </div>

              <section className="mb-7">
                <SectionHeader
                  title="Action Center"
                  description="Your next steps, surfaced from requests, deals, messages, and inventory."
                />
                <div className="grid gap-3 lg:grid-cols-3">
                  {actionItems.map((item, index) => {
                    const tone = {
                      red: "border-[#FECACA] bg-[#FEF2F2]",
                      blue: "border-[#BFDBFE] bg-[#EFF6FF]",
                      amber: "border-[#FCD34D] bg-[#FFFBEB]",
                      green: "border-[#A5D6A7] bg-[#EBF8EC]",
                    }[item.tone];
                    const textTone = {
                      red: "text-[#991B1B]",
                      blue: "text-[#1D4ED8]",
                      amber: "text-[#92400E]",
                      green: "text-[#2E7D32]",
                    }[item.tone];
                    return (
                      <div
                        key={`${item.title}-${index}`}
                        className={`rounded-xl border p-4 ${tone}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${textTone}`}>
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#667085]">
                              {item.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={item.action}
                            className={`shrink-0 text-xs font-bold ${textTone} hover:underline`}
                          >
                            {item.label}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
                <Card className="overflow-hidden">
                  <div className="px-5 py-4">
                    <SectionHeader
                      className="mb-0"
                      title="Recent inventory"
                      description="Your latest EPR listings and their current status."
                      action={
                        <button
                          type="button"
                          className="text-sm font-semibold text-[#3EA646] hover:underline"
                          onClick={() => setActive("listings")}
                        >
                          View all →
                        </button>
                      }
                    />
                  </div>
                  {listingLoading ? (
                    <div className="px-5 py-12 text-center text-sm text-[#667085]">
                      Loading your inventory...
                    </div>
                  ) : listingError ? (
                    <div className="px-5 py-12 text-center text-sm text-[#D92D20]">
                      {listingError}
                    </div>
                  ) : sellerListings.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <p className="text-sm font-semibold text-[#344054]">
                        No listings yet
                      </p>
                      <p className="mt-1 text-sm text-[#667085]">
                        Create your first listing to start receiving buyer
                        requests.
                      </p>
                      <Button
                        className="mt-4"
                        size="sm"
                        onClick={() => onNavigate("add-listing")}
                      >
                        Add your first listing
                      </Button>
                    </div>
                  ) : (
                    <Table
                      headers={[
                        "Credit type",
                        "Available",
                        "Price / MT",
                        "Year",
                        "Status",
                      ]}
                    >
                      {sellerListings.slice(0, 5).map((listing) => (
                        <Tr key={listing._id}>
                          <Td>
                            <span className="font-semibold text-[#101828]">
                              {listing.category}
                            </span>
                          </Td>
                          <Td>
                            {listing.status === "active"
                              ? Number(listing.quantity || 0).toLocaleString(
                                  "en-IN",
                                )
                              : "0"}{" "}
                            MT
                          </Td>
                          <Td>
                            ₹
                            {Number(listing.price || 0).toLocaleString("en-IN")}
                          </Td>
                          <Td>{listing.complianceYear || "—"}</Td>
                          <Td>
                            <Badge
                              label={
                                listing.status === "pending_review"
                                  ? "Pending"
                                  : listing.status
                              }
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Table>
                  )}
                </Card>

                <Card className="p-5">
                  <SectionHeader
                    title="Recent deals"
                    description="Your latest transaction activity."
                    action={
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#3EA646] hover:underline"
                        onClick={() => setActive("deals")}
                      >
                        View all →
                      </button>
                    }
                  />
                  {dealLoading ? (
                    <div className="py-8 text-center text-sm text-[#667085]">
                      Loading deals...
                    </div>
                  ) : dealError ? (
                    <div className="py-8 text-center text-sm text-[#D92D20]">
                      {dealError}
                    </div>
                  ) : sellerDeals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#DCE3EA] bg-[#F8FAFC] px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-[#344054]">
                        No deals yet
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#667085]">
                        Completed and active transactions will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sellerDeals.slice(0, 4).map((deal) => {
                        const statusLabel =
                          {
                            matched: "Matched",
                            negotiating: "Negotiating",
                            terms_agreed: "Terms Agreed",
                            payment_coordination: "Payment Coordination",
                            completed: "Completed",
                            cancelled: "Cancelled",
                          }[deal.status] || deal.status;
                        return (
                          <button
                            key={deal._id}
                            type="button"
                            onClick={() => setActive("deals")}
                            className="w-full rounded-xl border border-[#E5EAF0] p-3.5 text-left transition hover:border-[#C8D1DB] hover:bg-[#FAFBFC]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#101828]">
                                  {deal.listing?.category || "EPR Credit Deal"}
                                </p>
                                <p className="mt-1 text-xs text-[#667085]">
                                  #{deal._id?.slice(-8)} ·{" "}
                                  {Number(deal.quantity || 0).toLocaleString(
                                    "en-IN",
                                  )}{" "}
                                  MT
                                </p>
                              </div>
                              <Badge label={statusLabel} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {active === "listings" && (
            <SellerListingsSection
              listings={sellerListings}
              loading={listingLoading}
              error={listingError}
              onRefresh={() => fetchSellerListings()}
              onNavigate={onNavigate}
            />
          )}

          {active === "inventory" && (
            <SellerInventorySection listings={sellerListings} deals={sellerDeals} />
          )}

          {active === "earnings" && (
            <SellerEarningsSection deals={sellerDeals} />
          )}

          {active === "analytics" && (
            <SellerAnalyticsSection listings={sellerListings} deals={sellerDeals} requests={purchaseRequests} />
          )}
          {active === "requests" && (
            <CompactSellerRequests
              requests={purchaseRequests}
              loading={requestLoading}
              error={requestError}
              onRetry={() => fetchPurchaseRequests()}
              onRead={markRequestMessagesRead}
            />
          )}

          {active === "deals" && (
            <DealsSection
              deals={sellerDeals}
              role="seller"
              loading={dealLoading}
              error={dealError}
              openDealId={openDealId}
              openDealTab={openDealTab}
              onOpenDealRoom={openDealRoom}
              onCloseDealRoom={closeDealRoom}
              onDealRoomTabChange={updateDealRoomTab}
            />
          )}

          {active === "disputes" && <DisputesPage role="seller" />}

          {active === "messages" && (
            <Card>
              <div className="px-5 py-4 border-b border-[#E5EAF0]">
                <h2 className="font-semibold text-[#0F1923]">Messages</h2>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Private communication with EPR Nexuss. Quotations are handled
                  by EPR Nexuss and are not part of Messages.
                </p>
              </div>
              {purchaseRequests.length === 0 ? (
                <div className="py-16 text-center text-sm text-[#9CA3AF]">
                  No conversations yet.
                </div>
              ) : (
                <div className="divide-y divide-[#E5EAF0]">
                  {purchaseRequests.map((request) => {
                    const unread = Number(
                      messageUnreadByRequest[String(request._id)] || 0,
                    );

                    return (
                      <div
                        key={request._id}
                        className={`p-5 flex items-center justify-between gap-4 border-l-4 ${
                          unread
                            ? "border-l-[#EF4444] bg-[#FEF2F2]"
                            : "border-l-transparent"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#0F1923]">
                              {request.listing?.category || "Credit request"}
                            </p>
                            {unread > 0 && (
                              <span
                                className="w-2 h-2 rounded-full bg-[#EF4444]"
                                title="Unread messages"
                              />
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280] mt-1">
                            {request.requestedQuantity || request.quantity || 0}{" "}
                            MT ·{" "}
                            {unread
                              ? `${unread} unread message${
                                  unread === 1 ? "" : "s"
                                }`
                              : "No unread messages"}
                          </p>
                        </div>
                        <MessageChat
                          requestId={request._id}
                          role="seller"
                          compact
                          onRead={markRequestMessagesRead}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {active === "documents" && (
            <Card>
              <div className="px-5 py-4 border-b border-[#E5EAF0]">
                <h2 className="font-semibold text-[#0F1923]">Documents</h2>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Manage the documents used for EPR Nexuss verification.
                </p>
              </div>
              <div className="p-5">
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F7F9FB] p-4">
                  <p className="text-sm font-semibold text-[#374151]">
                    Business verification
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    Your verification documents are reviewed by EPR Nexuss
                    administrators.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => onNavigate("verification")}
                  >
                    Open Verification
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {active === "profile" && <ProfileSection onNavigate={onNavigate} />}
        </div>
      </main>
    </div>
  );
}
export { SellerDashboard as default };
