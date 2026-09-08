import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { CREDIT_TYPES } from "../data/mock";
import { Badge, CreditTypeIcon } from "../components/ui";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const SORT_OPTIONS = [
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Quantity: High to Low", value: "qty-desc" },
  { label: "Newest First", value: "newest" },
];

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
];

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MarketplacePage({ onNavigate }) {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [watchlistBusyId, setWatchlistBusyId] = useState("");
  const [filters, setFilters] = useState({ type: "", location: "", year: "" });
  const [sort, setSort] = useState("price-asc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/listings");
        if (response.data.success) setListings(response.data.listings);
      } catch (err) {
        console.error("Failed to load marketplace listings:", err);
        setError(
          err.response?.data?.message || "Failed to load marketplace listings.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  useEffect(() => {
    if (user?.role !== "buyer") {
      setWatchlistIds(new Set());
      return;
    }
    const fetchWatchlistIds = async () => {
      try {
        const response = await api.get("/watchlist/ids");
        if (response.data.success)
          setWatchlistIds(new Set(response.data.listingIds || []));
      } catch (err) {
        console.error("Failed to load watchlist:", err);
      }
    };
    fetchWatchlistIds();
  }, [user?.role]);

  const toggleWatchlist = async (listingId, event) => {
    event?.stopPropagation();
    if (!user) {
      onNavigate("auth");
      return;
    }
    if (user.role !== "buyer") return;
    const id = String(listingId);
    const saved = watchlistIds.has(id);
    try {
      setWatchlistBusyId(id);
      if (saved) {
        await api.delete(`/watchlist/${id}`);
        setWatchlistIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      } else {
        await api.post("/watchlist", { listingId: id });
        setWatchlistIds((current) => new Set([...current, id]));
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          (saved
            ? "Failed to remove listing from watchlist."
            : "Failed to save listing."),
      );
    } finally {
      setWatchlistBusyId("");
    }
  };

  const marketplaceCreditTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...CREDIT_TYPES,
          ...listings.map((listing) => listing.category).filter(Boolean),
        ]),
      ),
    [listings],
  );

  const filtered = useMemo(() => {
    const result = listings.filter((listing) => {
      if (
        user?.role === "seller" &&
        String(listing.sellerId?._id || listing.sellerId) === String(user._id)
      )
        return false;
      if (filters.type && listing.category !== filters.type) return false;
      if (filters.location && listing.location !== filters.location)
        return false;
      if (filters.year && listing.complianceYear !== filters.year) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "qty-desc") return b.quantity - a.quantity;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [listings, filters, sort, user?._id, user?.role]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const activeFilterCount = [
    filters.type,
    filters.location,
    filters.year,
  ].filter(Boolean).length;

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ type: "", location: "", year: "" });
    setPage(1);
  };

  return (
    <div className="pro-page min-h-screen bg-[#F6F8FA] text-[#101828]">
      <div className="relative overflow-hidden bg-[#0B1512] text-white">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[#5AC361]/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-72 w-72 rounded-full bg-[#5AC361]/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-9 pt-8 sm:px-6 lg:pb-11 lg:pt-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#B9E9BD] backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5AC361]" />
                VERIFIED EPR CREDIT MARKETPLACE
              </div>
              <h1 className="font-heading text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-[46px] lg:leading-[1.08]">
                Find verified credits.
                <span className="block text-[#7BE082]">
                  Trade with confidence.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                Discover active EPR credit listings from verified businesses,
                compare transparent pricing, and let EPR Nexuss facilitate the
                deal.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[390px]">
              <Stat label="Live listings" value={listings.length} />
              <Stat
                label="Credit types"
                value={marketplaceCreditTypes.length}
              />
              <Stat label="States covered" value={28} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <section className="relative -mt-5 rounded-2xl border border-[#E5EAF0] bg-white p-3 shadow-[0_16px_45px_rgba(16,24,40,0.10)] sm:p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] lg:items-end">
            <FilterSelect
              icon="layers"
              label="Credit type"
              value={filters.type}
              onChange={(e) => setFilter("type", e.target.value)}
            >
              <option value="">All credit types</option>
              {marketplaceCreditTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              icon="map"
              label="Location"
              value={filters.location}
              onChange={(e) => setFilter("location", e.target.value)}
            >
              <option value="">All locations</option>
              {STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              icon="calendar"
              label="Compliance year"
              value={filters.year}
              onChange={(e) => setFilter("year", e.target.value)}
            >
              <option value="">All years</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2024-25">FY 2024-25</option>
            </FilterSelect>
            <FilterSelect
              icon="sort"
              label="Sort by"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!activeFilterCount}
              className="min-h-10 rounded-xl border border-[#DCE3EA] px-4 text-sm font-semibold text-[#475467] transition hover:border-[#B8C2CC] hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0F2F5] pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#667085]">
                Browse:
              </span>
              <TypePill
                label="All"
                active={!filters.type}
                onClick={() => setFilter("type", "")}
              />
              {marketplaceCreditTypes.slice(0, 6).map((type) => (
                <TypePill
                  key={type}
                  label={type}
                  active={filters.type === type}
                  onClick={() => setFilter("type", type)}
                />
              ))}
              {marketplaceCreditTypes.length > 6 && (
                <span className="text-xs text-[#98A2B3]">
                  +{marketplaceCreditTypes.length - 6} more
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#EBF8EC] px-2.5 py-1 text-xs font-semibold text-[#2E7D32]">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}{" "}
                active
              </span>
            )}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-2xl font-bold tracking-[-0.025em]">
                  Available EPR credits
                </h2>
                <span className="rounded-full bg-[#EAF7EC] px-2 py-0.5 text-xs font-bold text-[#2E7D32]">
                  {filtered.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#667085]">
                Only active, available listings are shown in the marketplace.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#667085]">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E5EAF0]">
                <Icon>
                  <path d="M12 3v18M3 12h18" />
                </Icon>
              </span>
              EPR Nexuss mediated transactions
            </div>
          </div>

          {loading && <LoadingGrid />}
          {!loading && error && <ErrorState message={error} />}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              hasListings={listings.length > 0}
              onReset={clearFilters}
            />
          )}

          {!loading && !error && paged.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {paged.map((credit, index) => (
                <ListingCard
                  key={credit._id}
                  credit={credit}
                  index={index}
                  user={user}
                  saved={watchlistIds.has(String(credit._id))}
                  busy={watchlistBusyId === String(credit._id)}
                  onWatchlist={toggleWatchlist}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </section>

        {!loading && !error && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        )}

        <section className="mt-12 overflow-hidden rounded-2xl border border-[#DCE7DF] bg-[#EDF8EF]">
          <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
            <div className="p-6 sm:p-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-bold text-[#2E7D32] ring-1 ring-[#D4EAD7]">
                <Icon className="h-3.5 w-3.5">
                  <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </Icon>
                VERIFIED · MEDIATED · TRACEABLE
              </div>
              <h3 className="font-heading text-xl font-bold tracking-[-0.02em] text-[#16351A] sm:text-2xl">
                A marketplace built around trust.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B6350]">
                Every transaction stays within the EPR Nexuss workflow. Seller
                verification, documentation, negotiation, payment coordination
                and completion are handled through the platform.
              </p>
            </div>
            <div className="flex items-center border-t border-[#D4EAD7] p-6 lg:border-l lg:border-t-0 lg:px-8">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#15351A] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#102A14]"
              >
                Learn how it works{" "}
                <Icon className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </Icon>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
      <div className="text-xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-white/45">
        {label}
      </div>
    </div>
  );
}

function FilterSelect({ label, icon, children, ...props }) {
  const paths = {
    layers: (
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M3 16l9 5 9-5" />
      </>
    ),
    map: (
      <>
        <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    sort: (
      <>
        <path d="M8 6h13M8 12h9M8 18h5" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
  };
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#667085]">
        <Icon className="h-3.5 w-3.5 text-[#5AC361]">{paths[icon]}</Icon>
        {label}
      </span>
      <select
        {...props}
        className="min-h-10 w-full rounded-xl border border-[#DCE3EA] bg-[#FBFCFD] px-3 py-2 text-sm font-medium text-[#344054] outline-none transition focus:border-[#5AC361] focus:bg-white focus:ring-4 focus:ring-[#5AC361]/10"
      >
        {children}
      </select>
    </label>
  );
}

function TypePill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${active ? "border-[#5AC361] bg-[#5AC361] text-white shadow-sm" : "border-[#E5EAF0] bg-white text-[#667085] hover:-translate-y-0.5 hover:border-[#BFD7C1] hover:text-[#2E7D32]"}`}
    >
      {label}
    </button>
  );
}

function ListingCard({
  credit,
  index,
  user,
  saved,
  busy,
  onWatchlist,
  onNavigate,
}) {
  return (
    <article
      className="group relative flex min-h-[338px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-[0_2px_8px_rgba(16,24,40,0.035)] transition-all duration-300 hover:-translate-y-1 hover:border-[#CFE2D1] hover:shadow-[0_18px_38px_rgba(16,24,40,0.10)]"
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={() => onNavigate("credit-detail", credit._id)}
    >
      <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[#5AC361] transition-transform duration-300 group-hover:scale-x-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF8EF] text-[#3E9C45] transition-transform duration-300 group-hover:scale-105">
            <CreditTypeIcon type={credit.category} />
          </div>
          <Badge
            label={
              credit.sellerId?.verifiedBadge ? "Verified Seller" : "Verified"
            }
          />
        </div>
        <button
          type="button"
          onClick={(e) => onWatchlist(credit._id, e)}
          disabled={busy || (!user && false)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${saved ? "border-[#A5D6A7] bg-[#EDF8EF] text-[#2E7D32]" : "border-[#E5EAF0] text-[#98A2B3] hover:border-[#C8D1DB] hover:bg-[#F8FAFC] hover:text-[#475467]"}`}
          aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
          title={saved ? "Remove from watchlist" : "Save to watchlist"}
        >
          <Icon className="h-4 w-4">
            <path
              d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21l-6-3.5L6 21V4.75z"
              fill={saved ? "currentColor" : "none"}
            />
          </Icon>
        </button>
      </div>

      <div className="mt-5">
        <h3 className="font-heading truncate text-[17px] font-bold tracking-[-0.015em] text-[#101828]">
          {credit.category} EPR Credits
        </h3>
        <div className="mt-2 flex items-end gap-1.5">
          <span className="font-heading text-2xl font-bold tracking-tight text-[#2E7D32]">
            ₹{credit.price}
          </span>
          <span className="mb-1 text-xs font-medium text-[#98A2B3]">/ MT</span>
        </div>
      </div>

      <div className="my-4 grid grid-cols-2 gap-2 rounded-xl bg-[#F8FAFC] p-3">
        <Metric icon="box" label="Available" value={`${credit.quantity} MT`} />
        <Metric icon="map" label="Location" value={credit.location || "—"} />
        <Metric
          icon="calendar"
          label="Compliance"
          value={credit.complianceYear ? `FY ${credit.complianceYear}` : "—"}
        />
        <Metric
          icon="clock"
          label="Valid till"
          value={
            credit.validTill
              ? new Date(credit.validTill).toLocaleDateString("en-IN")
              : "—"
          }
        />
      </div>

      <div className="mt-auto">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <span className="max-w-[170px] truncate text-[#98A2B3]">
            {credit.sellerId?.company ||
              credit.sellerId?.name ||
              "Verified seller"}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#2E7D32]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5AC361]" /> Active
          </span>
        </div>
        {user?.role === "seller" ? (
          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] py-2.5 text-xs font-semibold text-[#98A2B3]"
            title="Sellers are not authorized to request credits."
          >
            Seller accounts cannot request credits
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate("credit-detail", credit._id);
            }}
            className="w-full rounded-xl border border-[#B9DDBD] bg-white py-2.5 text-sm font-bold text-[#2E7D32] transition-all duration-200 hover:border-[#5AC361] hover:bg-[#EDF8EF] group-hover:shadow-sm"
          >
            View & Request Credit{" "}
            <span className="ml-1 transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        )}
      </div>
    </article>
  );
}

function Metric({ icon, label, value }) {
  const paths = {
    box: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />,
    map: (
      <>
        <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  };
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#98A2B3]">
        <Icon className="h-3 w-3">{paths[icon]}</Icon>
        {label}
      </div>
      <div className="mt-1 truncate text-xs font-bold text-[#344054]">
        {value}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-[338px] animate-pulse rounded-2xl border border-[#E5EAF0] bg-white p-5"
        >
          <div className="h-10 w-10 rounded-xl bg-[#EEF1F4]" />
          <div className="mt-6 h-5 w-3/4 rounded bg-[#EEF1F4]" />
          <div className="mt-3 h-8 w-1/2 rounded bg-[#EEF1F4]" />
          <div className="mt-6 h-24 rounded-xl bg-[#F3F5F7]" />
          <div className="mt-8 h-10 rounded-xl bg-[#EEF1F4]" />
        </div>
      ))}
    </div>
  );
}
function ErrorState({ message }) {
  return (
    <div className="rounded-2xl border border-[#FECACA] bg-white p-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
        <Icon>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.8L2.8 17a2 2 0 001.7 3h15a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z" />
        </Icon>
      </div>
      <p className="mt-4 font-semibold text-[#991B1B]">
        Unable to load the marketplace
      </p>
      <p className="mt-1 text-sm text-[#667085]">{message}</p>
    </div>
  );
}
function EmptyState({ hasListings, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D5DDE5] bg-white p-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F5F2] text-[#5A8060]">
        <Icon className="h-6 w-6">
          <path d="M4 7h16v13H4zM4 7l2-4h12l2 4M9 11h6" />
        </Icon>
      </div>
      <p className="mt-4 text-lg font-bold text-[#344054]">
        {hasListings
          ? "No credits match your filters"
          : "No active listings available"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#667085]">
        {hasListings
          ? "Try a different credit type, state or compliance year."
          : "Approved seller listings will appear here once they become available."}
      </p>
      {hasListings && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl bg-[#5AC361] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#3EA646]"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className="rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-sm font-semibold text-[#475467] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
        <button
          type="button"
          key={number}
          onClick={() => onPage(number)}
          className={`h-9 min-w-9 rounded-xl px-2 text-sm font-bold transition ${page === number ? "bg-[#173B1C] text-white shadow-sm" : "border border-[#E5EAF0] bg-white text-[#475467] hover:bg-[#F8FAFC]"}`}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-sm font-semibold text-[#475467] transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

export { MarketplacePage as default };
