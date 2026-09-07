import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  ConfidentialityBanner,
  CreditTypeIcon,
  Input,
  SectionHeader,
  Textarea,
} from "../components/ui";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function Icon({ children, className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function AuthenticationRequiredModal({ onClose, onLogin, onSignup }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white shadow-[0_24px_70px_rgba(16,24,40,0.18)]">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">
                Secure marketplace
              </p>
              <h3 className="mt-1 font-heading text-xl font-bold text-[#101828]">
                Sign in to continue
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#667085]">
                You need an account to request credits or save this listing.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#344054]"
              aria-label="Close"
            >
              <Icon>
                <path d="M6 6l12 12M18 6L6 18" />
              </Icon>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="outline" className="w-full" onClick={onLogin}>
              Login
            </Button>
            <Button className="w-full" onClick={onSignup}>
              Create account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestModal({ onClose, credit }) {
  const [form, setForm] = useState({
    qty: "",
    contact: "",
    notes: "",
    company: "",
    email: "",
    gst: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const estimatedTotal = useMemo(() => {
    const quantity = Number(form.qty);
    const price = Number(credit.price);
    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity <= 0
    ) {
      return 0;
    }
    return quantity * price;
  }, [credit.price, form.qty]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.qty) {
      toast.error("Please enter the required quantity.");
      return;
    }

    if (Number(form.qty) <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    if (Number(form.qty) > Number(credit.quantity)) {
      toast.error(`Only ${credit.quantity} MT is available for this listing.`);
      return;
    }

    if (!form.contact.trim()) {
      toast.error("Please enter the contact person.");
      return;
    }

    if (!form.company.trim()) {
      toast.error("Please enter your company name.");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    if (!form.gst.trim()) {
      toast.error("Please enter your GST number.");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post("/requests", {
        listingId: credit._id,
        quantity: Number(form.qty),
        contactPerson: form.contact.trim(),
        companyName: form.company.trim(),
        email: form.email.trim(),
        gstNumber: form.gst.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
      });

      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Purchase request error:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit purchase request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#101828]/45 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-[#E5EAF0] bg-white p-8 text-center shadow-[0_24px_70px_rgba(16,24,40,0.18)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF8EC] text-[#3EA646]">
            <Icon className="h-7 w-7">
              <path d="M20 6L9 17l-5-5" />
            </Icon>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">
            Request submitted
          </p>
          <h3 className="mt-1 font-heading text-2xl font-bold text-[#101828]">
            Your request is in review
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            EPR Nexuss will verify your interest and contact you within 24–48
            hours. Seller contact details are never shared directly.
          </p>
          <Button onClick={onClose} className="mt-6 w-full">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#101828]/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white shadow-[0_24px_70px_rgba(16,24,40,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E5EAF0] px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">
              Purchase interest
            </p>
            <h3 className="mt-1 font-heading text-xl font-bold text-[#101828]">
              Request {credit.category} credits
            </h3>
            <p className="mt-1 text-sm text-[#667085]">
              Tell EPR Nexuss how much you need and how to reach you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#667085] transition-colors hover:bg-[#F2F4F7]"
            aria-label="Close"
          >
            <Icon>
              <path d="M6 6l12 12M18 6L6 18" />
            </Icon>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <div className="grid gap-3 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-[#667085]">Price</p>
              <p className="mt-1 font-heading text-lg font-bold text-[#101828]">
                ₹{Number(credit.price).toLocaleString("en-IN")}
                <span className="ml-1 text-xs font-medium text-[#667085]">
                  / MT
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#667085]">Available</p>
              <p className="mt-1 font-heading text-lg font-bold text-[#101828]">
                {Number(credit.quantity).toLocaleString("en-IN")} MT
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#667085]">
                Estimated value
              </p>
              <p className="mt-1 font-heading text-lg font-bold text-[#3EA646]">
                ₹{estimatedTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <ConfidentialityBanner />
            <p className="mt-2 text-xs leading-5 text-[#667085]">
              Your contact details are shared with EPR Nexuss for transaction
              coordination, not directly with the seller.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="request-quantity"
              label="Required quantity (MT) *"
              placeholder={`Max ${credit.quantity} MT`}
              type="number"
              min="1"
              max={credit.quantity}
              value={form.qty}
              onChange={(e) => updateField("qty", e.target.value)}
            />
            <Input
              id="request-contact"
              label="Contact person *"
              placeholder="Full name"
              value={form.contact}
              onChange={(e) => updateField("contact", e.target.value)}
            />
            <Input
              id="request-company"
              label="Company name *"
              placeholder="Legal company name"
              value={form.company}
              onChange={(e) => updateField("company", e.target.value)}
            />
            <Input
              id="request-email"
              label="Business email *"
              type="email"
              placeholder="work@company.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
            <Input
              id="request-gst"
              label="GST number *"
              placeholder="22AAAAA0000A1Z5"
              value={form.gst}
              onChange={(e) => updateField("gst", e.target.value)}
            />
            <Input
              id="request-phone"
              label="Phone number *"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
            <div className="sm:col-span-2">
              <Textarea
                id="request-notes"
                label="Additional notes"
                placeholder="Any specific requirements, delivery preferences, or compliance needs..."
                rows={4}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E5EAF0] bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-[#E8EDF2] bg-[#F8FAFC] p-4">
      <div className="flex items-center gap-2 text-[#667085]">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.06em]">
          {label}
        </p>
      </div>
      <div className="mt-2 text-sm font-semibold text-[#101828]">
        {value || "—"}
      </div>
    </div>
  );
}

function CreditDetailPage({ creditId, onNavigate }) {
  const { user } = useAuth();
  const [credit, setCredit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true);
        setError("");

        if (!creditId) {
          setError("Listing ID is missing.");
          return;
        }

        const response = await api.get(`/listings/${creditId}`);

        if (response.data.success) {
          setCredit(response.data.listing);
        } else {
          setError(response.data.message || "Failed to load listing.");
        }
      } catch (err) {
        console.error("Failed to load credit details:", err);
        setError(
          err.response?.data?.message || "Failed to load credit details.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [creditId]);

  useEffect(() => {
    if (!user || user.role !== "buyer" || !creditId) {
      setSaved(false);
      return;
    }

    const fetchSavedState = async () => {
      try {
        const response = await api.get("/watchlist/ids");
        if (response.data.success) {
          setSaved(
            (response.data.listingIds || []).some(
              (id) => String(id) === String(creditId),
            ),
          );
        }
      } catch (error) {
        console.error("Failed to load saved state:", error);
      }
    };

    fetchSavedState();
  }, [creditId, user?.role]);

  const toggleWatchlist = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (user.role !== "buyer") {
      return;
    }

    try {
      setSaving(true);

      if (saved) {
        await api.delete(`/watchlist/${creditId}`);
        setSaved(false);
      } else {
        await api.post("/watchlist", { listingId: creditId });
        setSaved(true);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          (saved
            ? "Failed to remove listing from watchlist."
            : "Failed to save listing."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pro-page min-h-screen bg-[#F7F9FB] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-4 w-36 rounded bg-[#E5EAF0]" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="h-72 rounded-2xl bg-white" />
              <div className="h-44 rounded-2xl bg-white" />
            </div>
            <div className="h-96 rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !credit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB] px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#D92D20]">
            <Icon className="h-7 w-7">
              <path d="M12 9v4m0 4h.01M10.3 3.9l-7.4 13A2 2 0 004.6 20h14.8a2 2 0 001.7-3.1l-7.4-13a2 2 0 00-3.4 0z" />
            </Icon>
          </div>
          <h2 className="font-heading text-xl font-bold text-[#101828]">
            Credit not available
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            {error || "This listing could not be found."}
          </p>
          <Button className="mt-5" onClick={() => onNavigate("marketplace")}>
            Back to marketplace
          </Button>
        </div>
      </div>
    );
  }

  const formattedValidTill = credit.validTill
    ? new Date(credit.validTill).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const formattedListedOn = credit.createdAt
    ? new Date(credit.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const sellerName =
    credit.sellerId?.company || credit.sellerId?.name || "Verified Seller";
  const availableQuantity = Number(credit.quantity) || 0;
  const totalListingValue = (Number(credit.price) || 0) * availableQuantity;
  const sellerVerified = Boolean(credit.sellerId?.verifiedBadge);
  const document = credit.documentId;

  const sellerLocation = credit.location || "Location not specified";

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      {showAuthModal && (
        <AuthenticationRequiredModal
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            onNavigate("auth");
          }}
          onSignup={() => {
            setShowAuthModal(false);
            onNavigate("auth-signup");
          }}
        />
      )}

      {showModal && (
        <RequestModal onClose={() => setShowModal(false)} credit={credit} />
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => onNavigate("marketplace")}
          className="mb-6 inline-flex items-center gap-2 rounded-lg py-1.5 text-sm font-semibold text-[#667085] transition-colors hover:text-[#344054] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361]"
        >
          <Icon>
            <path d="M19 12H5m7 7l-7-7 7-7" />
          </Icon>
          Back to marketplace
        </button>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="border-b border-[#E5EAF0] p-5 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EBF8EC] text-[#3EA646]">
                      <CreditTypeIcon type={credit.category} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge label="Active" />
                        {sellerVerified && <Badge label="Verified Seller" />}
                      </div>
                      <h1 className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-[#101828] sm:text-3xl">
                        {credit.category} EPR Credits
                      </h1>
                      <p className="mt-1.5 text-sm text-[#667085]">
                        Compliance year {credit.complianceYear || "—"} · Listed{" "}
                        {formattedListedOn}
                      </p>
                    </div>
                  </div>

                  {(user?.role === "buyer" || !user) && (
                    <button
                      type="button"
                      onClick={toggleWatchlist}
                      disabled={saving}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] ${
                        saved
                          ? "border-[#A5D6A7] bg-[#EBF8EC] text-[#2E7D32]"
                          : "border-[#DCE3EA] bg-white text-[#475467] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <Icon>
                        <path
                          d="M6 4.75A2.75 2.75 0 018.75 2h6.5A2.75 2.75 0 0118 4.75V21l-6-3.5L6 21V4.75z"
                          fill={saved ? "currentColor" : "none"}
                        />
                      </Icon>
                      {saving ? "Saving…" : saved ? "Saved" : "Save"}
                    </button>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#667085]">
                      Price per MT
                    </p>
                    <p className="mt-1 font-heading text-2xl font-bold text-[#3EA646]">
                      ₹{Number(credit.price).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#667085]">
                      Available
                    </p>
                    <p className="mt-1 font-heading text-2xl font-bold text-[#101828]">
                      {availableQuantity.toLocaleString("en-IN")} MT
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#667085]">
                      Listing value
                    </p>
                    <p className="mt-1 font-heading text-2xl font-bold text-[#101828]">
                      ₹{totalListingValue.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <SectionHeader
                  title="Credit details"
                  description="Review the key commercial and compliance information before requesting this listing."
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailItem
                    label="Location"
                    value={sellerLocation}
                    icon={
                      <Icon>
                        <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
                        <circle cx="12" cy="10" r="2.2" />
                      </Icon>
                    }
                  />
                  <DetailItem
                    label="Compliance year"
                    value={credit.complianceYear}
                    icon={
                      <Icon>
                        <rect x="3" y="4" width="18" height="17" rx="2" />
                        <path d="M16 2v4M8 2v4M3 9h18" />
                      </Icon>
                    }
                  />
                  <DetailItem
                    label="Valid till"
                    value={formattedValidTill}
                    icon={
                      <Icon>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </Icon>
                    }
                  />
                  <DetailItem
                    label="Listed on"
                    value={formattedListedOn}
                    icon={
                      <Icon>
                        <path d="M4 5h16v15H4z" />
                        <path d="M8 9h8M8 13h5" />
                      </Icon>
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-7">
              <SectionHeader title="About this credit" />
              <p className="text-sm leading-7 text-[#667085]">
                {credit.description ||
                  "The seller has not provided a description for this listing. Contact EPR Nexuss through the request flow for transaction-specific information."}
              </p>
            </Card>

            <Card className="p-5 sm:p-7">
              <SectionHeader
                title="Seller"
                description="Seller information is shown according to EPR Nexuss marketplace privacy controls."
              />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF2FF] font-heading text-base font-bold text-[#3157A6]">
                    {sellerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading text-base font-bold text-[#101828]">
                        {sellerName}
                      </p>
                      {sellerVerified && <Badge label="Verified Seller" />}
                    </div>
                    <p className="mt-1 text-sm text-[#667085]">
                      {sellerLocation}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#667085]">
                  Seller contact details are private
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-7">
              <SectionHeader
                title="Certificate & compliance"
                description="The listing is subject to EPR Nexuss verification before a transaction is completed."
              />
              <div className="flex items-start gap-3 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#667085] shadow-sm">
                  <Icon>
                    <path d="M6 3h9l3 3v15H6z" />
                    <path d="M14 3v4h4M9 12h6M9 16h5" />
                  </Icon>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#101828]">
                    {document
                      ? "Certificate on file"
                      : "Certificate information"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">
                    {document
                      ? "Supporting documentation is associated with this listing and is reviewed through the EPR Nexuss verification process."
                      : "Certificate documentation is handled through the EPR Nexuss verification process."}
                  </p>
                </div>
                <Badge label="Verified" />
              </div>
            </Card>

            <ConfidentialityBanner />

            <SimilarCredits currentListing={credit} onNavigate={onNavigate} />
          </div>

          <aside className="lg:sticky lg:top-24">
            <Card className="overflow-hidden">
              <div className="border-b border-[#E5EAF0] bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#667085]">
                  Request this listing
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-heading text-3xl font-bold tracking-[-0.02em] text-[#3EA646]">
                      ₹{Number(credit.price).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-0.5 text-sm text-[#667085]">per MT</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[#667085]">
                      Available
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#101828]">
                      {availableQuantity.toLocaleString("en-IN")} MT
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#667085]">Compliance year</span>
                    <span className="font-semibold text-[#101828]">
                      {credit.complianceYear || "—"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#667085]">Valid till</span>
                    <span className="font-semibold text-[#101828]">
                      {formattedValidTill}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-[#667085]">Location</span>
                    <span className="max-w-[55%] text-right font-semibold text-[#101828]">
                      {sellerLocation}
                    </span>
                  </div>
                </div>

                {user?.role === "seller" ? (
                  <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4 text-center">
                    <p className="text-sm font-semibold text-[#344054]">
                      Seller accounts cannot request credits.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#667085]">
                      Browse the marketplace to review demand and manage your
                      own inventory.
                    </p>
                  </div>
                ) : user?.role === "buyer" && user?.kycStatus !== "approved" ? (
                  <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-4">
                    <p className="text-sm font-semibold text-[#92400E]">
                      Business verification required
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#92400E]/80">
                      Complete your verification before submitting a purchase
                      request.
                    </p>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={availableQuantity <= 0}
                    onClick={() => {
                      if (!user) {
                        setShowAuthModal(true);
                        return;
                      }
                      setShowModal(true);
                    }}
                  >
                    <Icon>
                      <path d="M4 12h16M13 5l7 7-7 7" />
                    </Icon>
                    {availableQuantity > 0 ? "Request this credit" : "Sold out"}
                  </Button>
                )}

                <div className="flex items-start gap-2 text-xs leading-5 text-[#667085]">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#3EA646]">
                    <path d="M12 3l7 3v5c0 4.4-2.8 8.1-7 10-4.2-1.9-7-5.6-7-10V6l7-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </Icon>
                  EPR Nexuss coordinates the transaction and keeps seller contact
                  details private.
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SimilarCredits({ currentListing, onNavigate }) {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        const response = await api.get(
          `/listings?category=${encodeURIComponent(currentListing.category)}`,
        );

        if (response.data.success) {
          setListings(response.data.listings);
        }
      } catch (error) {
        console.error("Failed to load similar credits:", error);
      }
    };

    fetchSimilar();
  }, [currentListing.category]);

  const similar = listings
    .filter((listing) => listing._id !== currentListing._id)
    .slice(0, 3);

  return (
    <Card className="p-5 sm:p-7">
      <SectionHeader
        title="Similar credits"
        description={`Other ${currentListing.category} listings you may want to compare.`}
      />

      {similar.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3">
          {similar.map((listing) => (
            <button
              key={listing._id}
              type="button"
              onClick={() => onNavigate("credit-detail", listing._id)}
              className="group rounded-xl border border-[#E5EAF0] bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#C8D1DB] hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-lg bg-[#EBF8EC] p-2 text-[#3EA646]">
                  <CreditTypeIcon type={listing.category} />
                </span>
                <Icon className="h-4 w-4 text-[#98A2B3] transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </Icon>
              </div>
              <p className="mt-4 font-heading text-sm font-bold text-[#101828]">
                {listing.category} EPR Credits
              </p>
              <p className="mt-1 text-xs text-[#667085]">
                {listing.location || "Location not specified"} · FY{" "}
                {listing.complianceYear || "—"}
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-[#667085]">Available</p>
                  <p className="mt-0.5 text-sm font-bold text-[#101828]">
                    {Number(listing.quantity || 0).toLocaleString("en-IN")} MT
                  </p>
                </div>
                <p className="font-heading text-base font-bold text-[#3EA646]">
                  ₹{Number(listing.price || 0).toLocaleString("en-IN")}
                  <span className="text-[11px] font-medium text-[#667085]">
                    {" "}
                    / MT
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#DCE3EA] bg-[#F8FAFC] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[#667085]">
            No other {currentListing.category} credits are currently listed.
          </p>
        </div>
      )}
    </Card>
  );
}

export { CreditDetailPage as default };
