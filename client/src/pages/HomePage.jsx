import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { Badge, Button, CreditTypeIcon } from "../components/ui";
import api from "../services/api.js";

import VerificationStatusBanner from "../components/VerificationStatusBanner.jsx";
const STATES = [
  "Delhi",
  "Gujarat",
  "Maharashtra",
  "Tamil Nadu",
  "Rajasthan",
  "Karnataka",
  "Haryana",
  "Uttar Pradesh",
  "Punjab",
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 20 7v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5l8-3 8 3v16" />
        <path d="M8 9h1M8 13h1M15 9h1M15 13h1M10 21v-4h4v4" />
      </>
    ),
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9s-1.1 6.5-3.4 9c-2.3-2.5-3.4-5.5-3.4-9S9.7 5.5 12 3Z" />
      </>
    ),
  };
  return <svg {...common}>{paths[name] || paths.check}</svg>;
}

function CreditCard({ listing, onNavigate, index }) {
  const { user } = useAuth();
  const price = Number(listing.price || 0);
  const quantity = Number(listing.quantity || 0);

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,25,35,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#9bd6a0] hover:shadow-[0_18px_45px_rgba(15,25,35,0.09)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#5AC361] via-[#91dd97] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#edf9ee] text-[#3fa64a] ring-1 ring-[#d4efd6]">
            <CreditTypeIcon type={listing.category} />
          </div>
          <Badge label="Verified" />
        </div>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Live
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-[17px] font-semibold text-[#0F1923]">
          {listing.category || "EPR Credit"} EPR Credits
        </h3>
        <div className="mt-2 flex items-end gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-[#3fa64a]">
            ₹{price.toLocaleString("en-IN")}
          </span>
          <span className="pb-1 text-xs text-slate-400">/ MT</span>
        </div>
      </div>

      <div className="my-5 h-px bg-slate-100" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
        {[
          ["Available", `${quantity.toLocaleString("en-IN")} MT`],
          ["Location", listing.location || "—"],
          ["Compliance", listing.complianceYear || "—"],
          ["Valid till", formatDate(listing.validTill)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </span>
            <span className="mt-1 block truncate font-semibold text-slate-700">
              {value}
            </span>
          </div>
        ))}
      </div>

      {user?.role === "seller" ? (
        <button
          type="button"
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-400"
          title="Sellers are not authorized to request credits."
        >
          Seller accounts cannot request credits
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-5 w-full border-[#5AC361] text-[#3fa64a] hover:bg-[#edf9ee]"
          onClick={() => onNavigate("credit-detail", listing._id)}
        >
          View &amp; Request <Icon name="arrow" size={15} />
        </Button>
      )}
    </article>
  );
}

function HomePage({ onNavigate }) {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    minQty: "",
    maxQty: "",
    minPrice: "",
    maxPrice: "",
    location: "",
  });

  useEffect(() => {
    let cancelled = false;
    const loadListings = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/listings");
        if (!cancelled) {
          setListings(
            response.data?.success ? response.data.listings || [] : [],
          );
          if (!response.data?.success)
            setError("Unable to load live marketplace listings.");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load home listings:", err);
          setListings([]);
          setError(
            err.response?.data?.message ||
              "Marketplace listings are temporarily unavailable.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadListings();
    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo(
    () =>
      Array.from(
        new Set(listings.map((listing) => listing.category).filter(Boolean)),
      ).sort(),
    [listings],
  );
  const filtered = useMemo(
    () =>
      listings.filter((listing) => {
        if (filters.type && listing.category !== filters.type) return false;
        if (
          filters.minQty &&
          Number(listing.quantity || 0) < Number(filters.minQty)
        )
          return false;
        if (
          filters.maxQty &&
          Number(listing.quantity || 0) > Number(filters.maxQty)
        )
          return false;
        if (
          filters.minPrice &&
          Number(listing.price || 0) < Number(filters.minPrice)
        )
          return false;
        if (
          filters.maxPrice &&
          Number(listing.price || 0) > Number(filters.maxPrice)
        )
          return false;
        if (
          filters.location &&
          !String(listing.location || "")
            .toLowerCase()
            .includes(filters.location.toLowerCase())
        )
          return false;
        return true;
      }),
    [listings, filters],
  );

  const totalAvailable = listings.reduce(
    (sum, listing) => sum + Number(listing.quantity || 0),
    0,
  );
  const creditTypeCount = new Set(
    listings.map((listing) => listing.category).filter(Boolean),
  ).size;
  const resetFilters = () =>
    setFilters({
      type: "",
      minQty: "",
      maxQty: "",
      minPrice: "",
      maxPrice: "",
      location: "",
    });

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7faf8] text-[#0F1923]">
      <style>{`
        @keyframes home-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes home-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes home-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(90,195,97,.18)} 50%{box-shadow:0 0 0 10px rgba(90,195,97,0)} }
        .home-rise{animation:home-rise .7s ease-out both}.home-float{animation:home-float 5s ease-in-out infinite}.home-pulse{animation:home-pulse 2.5s ease-in-out infinite}
      `}</style>

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[#07140d] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(90,195,97,.24),transparent_34%),radial-gradient(circle_at_15%_85%,rgba(62,166,70,.13),transparent_30%)]" />
        <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#5AC361]/10 blur-3xl" />
        <div className="absolute left-1/3 top-0 h-px w-2/3 bg-gradient-to-r from-transparent via-[#5AC361]/40 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.02fr_.98fr] md:pb-24 md:pt-20 lg:gap-20">
          <div className="home-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#8be193]/25 bg-white/[.06] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#b9f1be] backdrop-blur">
              <span className="home-pulse h-2 w-2 rounded-full bg-[#5AC361]" />{" "}
              India&apos;s verified EPR credit marketplace
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[.98] tracking-[-.045em] sm:text-6xl lg:text-[72px]">
              Trade EPR credits with{" "}
              <span className="bg-gradient-to-r from-[#5AC361] to-[#a4e9a9] bg-clip-text text-transparent">
                confidence.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              A trusted marketplace connecting verified businesses through a
              transparent, mediated transaction journey — from listing to
              settlement.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => onNavigate("marketplace")}
                className="group !rounded-xl !bg-[#5AC361] !px-6 !text-[#07140d] hover:!bg-[#78d77e]"
              >
                Explore live credits{" "}
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Button>
              {user?.role === "buyer" && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onNavigate("buyer-dashboard")}
                  className="!rounded-xl !border-white/20 !bg-white/5 !text-white hover:!bg-white/10"
                >
                  Post a requirement
                </Button>
              )}
              {!user && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onNavigate("auth-signup")}
                  className="!rounded-xl !border-white/20 !bg-white/5 !text-white hover:!bg-white/10"
                >
                  Join EPR Nexus
                </Button>
              )}
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Icon name="shield" size={15} /> Verified participants
              </span>
              <span className="flex items-center gap-2">
                <Icon name="check" size={15} /> Mediated transactions
              </span>
              <span className="flex items-center gap-2">
                <Icon name="globe" size={15} /> India-wide coverage
              </span>
            </div>
          </div>

          <div className="relative hidden min-h-[430px] md:block">
            <div className="home-float absolute right-0 top-4 w-[min(100%,470px)] rounded-[28px] border border-white/10 bg-white/[.07] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="rounded-[22px] border border-white/10 bg-[#0d1e14] p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7f9886]">
                      EPR Nexus
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Live marketplace
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-[#5AC361]/10 px-2.5 py-1 text-[10px] font-semibold text-[#8ee295]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5AC361]" />{" "}
                    Live
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 py-5">
                  {[
                    ["Listings", loading ? "—" : listings.length],
                    [
                      "Available",
                      loading
                        ? "—"
                        : `${totalAvailable.toLocaleString("en-IN")} MT`,
                    ],
                    ["Types", loading ? "—" : creditTypeCount],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/10 bg-white/[.035] p-3"
                    >
                      <p className="text-lg font-bold">{value}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-[#7f9886]">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-[#5AC361]/20 bg-[#5AC361]/[.06] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5AC361]/15 text-[#7fe188]">
                        <Icon name="shield" size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">
                          Verified credit listing
                        </p>
                        <p className="mt-1 text-[10px] text-[#8ca393]">
                          Documentation reviewed
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#7fe188]">
                      Approved
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 left-0 rounded-2xl border border-white/10 bg-white/[.08] px-4 py-3 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5AC361] text-[#07140d]">
                  <Icon name="bolt" size={17} />
                </div>
                <div>
                  <p className="text-xs font-semibold">
                    One controlled workflow
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Request → Quote → Payment → Completion
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <VerificationStatusBanner onNavigate={onNavigate} />
      </div>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 px-4 sm:px-6 md:grid-cols-4">
          {[
            ["Verified marketplace", "Approved listings only"],
            ["Mediated deals", "Every step tracked"],
            ["Document-led trust", "Compliance first"],
            ["Built for businesses", "Simple, professional workflow"],
          ].map(([title, text]) => (
            <div key={title} className="px-4 py-5 first:pl-0 last:pr-0 md:px-7">
              <p className="text-xs font-bold text-[#0F1923]">{title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Marketplace preview */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#3fa64a]">
              Live supply
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-[#0F1923] sm:text-4xl">
              Explore available EPR credits
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search verified marketplace inventory by credit type, quantity,
              price and location.
            </p>
          </div>
          <button
            type="button"
            className="group self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#9bd6a0] hover:text-[#3fa64a] md:self-auto"
            onClick={() => onNavigate("epr-credits")}
          >
            View full marketplace{" "}
            <span className="ml-1 transition-transform group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_10px_35px_rgba(15,25,35,0.05)]">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[150px] flex-1">
              <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Credit type
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#5AC361] focus:bg-white"
                value={filters.type}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, type: e.target.value }))
                }
              >
                <option value="">All types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[190px] flex-1">
              <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quantity (MT)
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#5AC361] focus:bg-white"
                  placeholder="Min"
                  value={filters.minQty}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minQty: e.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#5AC361] focus:bg-white"
                  placeholder="Max"
                  value={filters.maxQty}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxQty: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="min-w-[190px] flex-1">
              <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Price (₹/MT)
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#5AC361] focus:bg-white"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, minPrice: e.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#5AC361] focus:bg-white"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="min-w-[150px] flex-1">
              <label className="mb-1.5 block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Location
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-[#5AC361] focus:bg-white"
                value={filters.location}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, location: e.target.value }))
                }
              >
                <option value="">All states</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <p className="font-semibold">Marketplace unavailable</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={() => onNavigate("marketplace")}
            >
              Open Marketplace
            </Button>
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.slice(0, 8).map((listing, index) => (
              <CreditCard
                key={listing._id}
                listing={listing}
                onNavigate={onNavigate}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon name="search" />
            </div>
            <p className="mt-4 font-semibold text-slate-700">
              No credits match these filters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try broadening your search or reset the filters.
            </p>
          </div>
        )}
      </section>

      {/* Process */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#3fa64a]">
              Simple by design
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              From listing to completed deal
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              EPR Nexus keeps the transaction journey structured, documented and
              visible to everyone who needs to act.
            </p>
          </div>
          <div className="relative mt-12 grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-gradient-to-r from-[#ccebcf] via-[#5AC361] to-[#ccebcf] md:block" />
            {[
              [
                "01",
                "List",
                "Seller submits credit details and supporting documents.",
              ],
              [
                "02",
                "Request",
                "Buyer finds suitable inventory and requests credits.",
              ],
              [
                "03",
                "Verify",
                "EPR Nexus validates parties, listings and documents.",
              ],
              [
                "04",
                "Facilitate",
                "Terms, quotation and payment are coordinated.",
              ],
              [
                "05",
                "Complete",
                "Payment is confirmed and the deal is closed.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="relative rounded-2xl border border-slate-200 bg-[#f9fbfa] p-5 text-center md:border-0 md:bg-transparent md:p-2"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#bfe6c2] bg-white text-sm font-bold text-[#3fa64a] shadow-sm">
                  {number}
                </div>
                <h3 className="mt-4 text-sm font-bold">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#3fa64a]">
              Why EPR Nexus
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Built around trust, not just listings.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500">
              The marketplace is designed so businesses can focus on finding the
              right credits while EPR Nexus manages verification and transaction
              coordination.
            </p>
            <Button className="mt-7" onClick={() => onNavigate("marketplace")}>
              Explore marketplace <span>→</span>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Verified sellers",
                "Seller and listing documents are reviewed before marketplace publication.",
                "shield",
              ],
              [
                "Secure transactions",
                "Buyer and seller communication stays inside the mediated workflow.",
                "building",
              ],
              [
                "Clear deal states",
                "Requests, quotations, payments and disputes remain trackable.",
                "check",
              ],
              [
                "Broad coverage",
                "Multiple EPR credit categories and locations in one marketplace.",
                "globe",
              ],
            ].map(([title, description, icon]) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_25px_rgba(15,25,35,0.035)] transition duration-300 hover:-translate-y-1 hover:border-[#bfe6c2] hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf9ee] text-[#3fa64a] transition group-hover:scale-105">
                  <Icon name={icon} size={19} />
                </div>
                <h3 className="mt-5 text-sm font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="px-4 pb-16 sm:px-6 md:pb-20">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-[#07140d] px-6 py-12 text-center text-white shadow-2xl sm:px-10 md:py-16">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#5AC361]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-[#5AC361]/10 blur-3xl" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#8ee295]">
                Ready when you are
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Build your next compliant deal.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Create your EPR Nexus account and start exploring verified
                inventory or listing your available credits.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => onNavigate("auth-signup")}
                  className="!rounded-xl !bg-[#5AC361] !text-[#07140d]"
                >
                  Sign up <span>→</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onNavigate("marketplace")}
                  className="!rounded-xl !border-white/20 !bg-white/5 !text-white hover:!bg-white/10"
                >
                  Browse first
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export { HomePage as default };
