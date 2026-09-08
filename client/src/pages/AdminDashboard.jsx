import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  NotificationBell,
  AdminProfileMenu,
} from "../components/AccountTools.jsx";
import QuotationCenter from "../components/QuotationCenter.jsx";
import ManagedMessagesPage from "./ManagedMessagesPage.jsx";
import api from "../services/api.js";
import { DisputesPage } from "../components/DisputeCenter.jsx";
import {
  Badge,
  DashboardShell,
  PageHeader,
  SectionHeader,
  Button,
  Card,
  StatCard,
  Table,
  Tr,
  Td,
  Textarea,
  PromptModal,
} from "../components/ui";
const downloadDocument = async (documentId, fileName = "document") => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Your admin session has expired. Please login again.");
      return;
    }

    // Use fetch here instead of relying on a browser navigation/download URL.
    // The document endpoint is protected and must receive the admin Bearer token.
    const baseUrl = api.defaults.baseURL || "";
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/documents/${encodeURIComponent(documentId)}/download`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      let message = "Unable to open document.";
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          message = data?.message || message;
        }
      } catch {
        // Keep the generic message if the error body cannot be parsed.
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.download = fileName || "document";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast.error(error?.message || "Unable to open document.");
  }
};

const NAV = [
  { id: "dashboard", label: "Dashboard" },
  { id: "requests", label: "Purchase Requests" },
  { id: "quotations", label: "Quotations" },
  { id: "listings", label: "Seller Listings" },
  {
    id: "verification",
    label: "Doc Verification",
    badge: 0,
  },
  { id: "deals", label: "Deals / Transactions" },
  { id: "payments", label: "Payment Records" },
  { id: "disputes", label: "Disputes" },
  { id: "messages", label: "Messages" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];
function NavIcon({ id }) {
  const icons = {
    dashboard: (
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
    requests: (
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
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
        />
      </svg>
    ),
    listings: (
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
    verification: (
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    quotations: (
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
          d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm3 4h4m-6 4h8m-8 4h5"
        />
      </svg>
    ),
    deals: (
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
    payments: (
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </svg>
    ),
    messages: (
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
    reports: (
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
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
    settings: (
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
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  };
  return icons[id] ?? <></>;
}
function getCertificateVerification(listing) {
  const document = listing?.documentId;
  if (!document) {
    return { complete: false, checks: [], hasData: false };
  }

  const categoryMatches =
    !document.certificateCategory ||
    document.certificateCategory.trim().toLowerCase() ===
      String(listing.category || "")
        .trim()
        .toLowerCase();
  const yearMatches =
    !document.certificateComplianceYear ||
    document.certificateComplianceYear.trim() ===
      String(listing.complianceYear || "").trim();
  const quantityCovers =
    document.certificateQuantity == null ||
    Number(document.certificateQuantity) >= Number(listing.quantity || 0);
  const validityCovers =
    !document.certificateValidTill ||
    new Date(document.certificateValidTill) >= new Date(listing.validTill);
  const metadataComplete =
    Boolean(document.certificateNumber?.trim()) &&
    Boolean(document.sourcePortal?.trim()) &&
    Number.isFinite(Number(document.certificateQuantity)) &&
    Boolean(document.certificateIssuedDate) &&
    Boolean(document.certificateValidTill);

  return {
    hasData: true,
    complete:
      metadataComplete &&
      categoryMatches &&
      yearMatches &&
      quantityCovers &&
      validityCovers,
    checks: [
      ["Certificate ID", Boolean(document.certificateNumber?.trim())],
      ["Category", categoryMatches],
      ["Compliance year", yearMatches],
      ["Quantity covers listing", quantityCovers],
      ["Validity covers listing", validityCovers],
    ],
  };
}

function VerificationQueue({ kycDocuments, kycLoading, kycError, reviewKyc }) {
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!selected && kycDocuments.length > 0) {
      setSelected(kycDocuments[0]);
      return;
    }

    if (
      selected &&
      !kycDocuments.some((document) => document._id === selected._id)
    ) {
      setSelected(kycDocuments[0] ?? null);
    }
  }, [kycDocuments, selected]);

  const formatDocumentType = (type) => {
    if (!type) return "Document";

    return type
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleReject = async () => {
    if (!selected || !reason.trim()) return;

    await reviewKyc(selected._id, "rejected", reason.trim());

    setReason("");
  };

  const handleApprove = async () => {
    if (!selected) return;

    await reviewKyc(selected._id, "approved");
  };

  return (
    <div className="flex gap-5">
      <div className="w-72 flex-shrink-0">
        <Card>
          <div className="px-4 py-3 border-b border-[#E5EAF0]">
            <h3
              className="font-semibold text-[#0F1923] text-sm"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Pending Verification
            </h3>
          </div>

          {kycLoading ? (
            <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
              Loading verification requests...
            </div>
          ) : kycError ? (
            <div className="px-4 py-8 text-center text-sm text-[#EF4444]">
              {kycError}
            </div>
          ) : kycDocuments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
              No pending KYC documents.
            </div>
          ) : (
            kycDocuments.map((document) => (
              <button
                type="button"
                key={document._id}
                onClick={() => {
                  setSelected(document);
                  setReason("");
                }}
                className={`w-full text-left px-4 py-3 border-b border-[#F0F4F8] hover:bg-[#F7F9FB] transition-colors ${
                  selected?._id === document._id ? "bg-[#EBF8EC]" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#374151]">
                    {formatDocumentType(document.type)}
                  </span>
                  <Badge label="Pending" />
                </div>

                <p className="text-xs text-[#6B7280]">
                  {document.owner?.company || "Unknown company"}
                </p>

                <p className="text-xs text-[#9CA3AF]">{document.fileName}</p>
              </button>
            ))
          )}
        </Card>
      </div>

      {selected ? (
        <div className="flex-1 flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className="font-semibold text-[#0F1923]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {formatDocumentType(selected.type)} —{" "}
                  {selected.owner?.company || "Unknown company"}
                </h3>

                <p className="text-xs text-[#6B7280] mt-1">
                  {selected.owner?.name || "—"} · {selected.owner?.email || "—"}
                </p>
              </div>

              <Badge label="Pending" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-4">
                <p className="text-xs font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">
                  Submitted Information
                </p>

                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "Company",
                      value: selected.owner?.company || "—",
                    },
                    {
                      label: "Name",
                      value: selected.owner?.name || "—",
                    },
                    {
                      label: "Email",
                      value: selected.owner?.email || "—",
                    },
                    {
                      label: "Phone",
                      value: selected.owner?.phone || "—",
                    },
                    {
                      label: "Document",
                      value: selected.fileName || "—",
                    },
                    {
                      label: "Type",
                      value: formatDocumentType(selected.type),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span className="text-[#9CA3AF]">{item.label}</span>
                      <span className="font-medium text-[#374151] text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-[#6B7280] mb-1 uppercase tracking-wide">
                  Uploaded Document
                </p>

                <div className="flex-1 min-h-[160px] border-2 border-dashed border-[#E5EAF0] rounded-xl flex flex-col items-center justify-center gap-2 bg-white">
                  <svg
                    className="w-8 h-8 text-[#CBD5E1]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 18h10a2 2 0 002-2V8.828a2 2 0 00-.586-1.414l-3.828-3.828A2 2 0 0013.172 3H7a2 2 0 00-2 2v11a2 2 0 002 2z"
                    />
                  </svg>

                  <p className="text-xs text-[#6B7280] text-center px-3">
                    {selected.fileName}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      downloadDocument(selected._id, selected.fileName)
                    }
                    className="text-xs text-[#5AC361] hover:underline"
                  >
                    Open document
                  </button>
                </div>

                <p className="text-[10px] text-[#9CA3AF]">
                  Uploaded:{" "}
                  {selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString("en-IN")
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-[#F0F4F8] rounded-xl">
              <p className="text-xs font-semibold text-[#6B7280] mb-2">
                Audit Trail
              </p>

              <div className="text-xs text-[#9CA3AF] space-y-1">
                <p>
                  • Submitted by {selected.owner?.name || "Unknown user"} on{" "}
                  {selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString("en-IN")
                    : "—"}
                </p>
                <p>• Current status: {selected.verificationStatus}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <Textarea
                label="Rejection Reason (required if rejecting)"
                placeholder="Describe why this document is being rejected so the seller can resubmit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />

              <div className="flex gap-3">
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={!reason.trim()}
                >
                  Reject
                </Button>

                <Button className="flex-1" onClick={handleApprove}>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approve
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#9CA3AF]">
          <div className="text-center">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-[#E5EAF0]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 15l-2 5L9 9l11 4-5-2zm0 0l5 5"
              />
            </svg>
            <p className="text-sm">Select a document to review</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingApprovalMarginModal({ prompt, onCancel, onConfirm }) {
  const listing = prompt?.listing;
  const [marginType, setMarginType] = useState(prompt?.marginType || "percentage");
  const [marginValue, setMarginValue] = useState(
    String(prompt?.marginValue ?? "10"),
  );
  const numericMargin = Number(marginValue);
  const sellerPrice = Number(listing?.price || 0);
  const publicPrice =
    marginType === "value"
      ? sellerPrice + (Number.isFinite(numericMargin) ? numericMargin : 0)
      : sellerPrice *
        (1 + (Number.isFinite(numericMargin) ? numericMargin : 0) / 100);
  const valid =
    Number.isFinite(numericMargin) &&
    numericMargin >= 0 &&
    (marginType === "value" || numericMargin <= 100);

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E5EAF0] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5AC361]">
              Publish listing
            </p>
            <h3
              className="mt-1 text-xl font-semibold text-[#0F1923]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Set marketplace margin
            </h3>
            <p className="mt-1 text-sm text-[#667085]">
              Choose the private margin EPR Nexuss will add to the seller price
              before this listing goes live.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#E5EAF0] px-3 py-2 text-[#667085] hover:bg-[#F7F9FB]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-xl border border-[#E5EAF0] bg-[#F7F9FB] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#98A2B3]">Seller listing</p>
                <p className="font-semibold text-[#0F1923]">
                  {listing?.category || "EPR Credit"} · {listing?.quantity || 0} MT
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#98A2B3]">Seller price</p>
                <p className="text-lg font-bold text-[#0F1923]">
                  ₹{sellerPrice.toLocaleString("en-IN")}/MT
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-[#344054]">
              Margin method
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F2F4F7] p-1">
              {[
                ["percentage", "Percentage"],
                ["value", "Fixed value / MT"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMarginType(value)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    marginType === value
                      ? "bg-white text-[#237A2D] shadow-sm"
                      : "text-[#667085] hover:text-[#344054]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#344054]">
              {marginType === "percentage"
                ? "Margin percentage"
                : "Margin amount per MT"}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max={marginType === "percentage" ? "100" : undefined}
                step="0.01"
                value={marginValue}
                onChange={(event) => setMarginValue(event.target.value)}
                className="w-full rounded-xl border border-[#D0D5DD] bg-white px-4 py-3 text-sm text-[#101828] outline-none focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/15"
                autoFocus
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#667085]">
                {marginType === "percentage" ? "%" : "₹ / MT"}
              </span>
            </div>
            {!valid && (
              <p className="mt-2 text-xs text-[#D92D20]">
                {marginType === "percentage"
                  ? "Enter a margin between 0% and 100%."
                  : "Enter a zero or positive amount."}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#D1FADF] bg-[#F0FDF4] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#667085]">Public marketplace price</span>
              <strong className="text-lg text-[#237A2D]">
                ₹{Math.round(publicPrice * 100) / 100}/MT
              </strong>
            </div>
            <p className="mt-1 text-xs text-[#667085]">
              Buyers will see this price. The margin method and amount remain
              internal to EPR Nexuss.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-t border-[#E5EAF0] px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => onConfirm(marginType, numericMargin)}
          >
            Approve & Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ onNavigate }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const validSections = useMemo(
    () =>
      new Set([
        "dashboard",
        "verification",
        "requests",
        "quotations",
        "listings",
        "deals",
        "payments",
        "disputes",
        "messages",
        "reports",
        "settings",
      ]),
    [],
  );
  const initialSection = validSections.has(searchParams.get("section"))
    ? searchParams.get("section")
    : "dashboard";
  const [active, setActiveState] = useState(initialSection);

  // URL is the single source of truth for dashboard section navigation.
  // Update state and URL together so polling/rerenders cannot make the UI bounce between sections.
  const setActive = (section) => {
    if (!validSections.has(section)) return;
    setActiveState(section);
    const next = new URLSearchParams(searchParams);
    if (section === "dashboard") {
      next.delete("section");
      next.delete("deal");
      next.delete("dealTab");
    } else {
      next.set("section", section);
      if (section !== "deals") {
        next.delete("deal");
        next.delete("dealTab");
      }
    }
    const current = searchParams.toString();
    if (next.toString() !== current) {
      setSearchParams(next, { replace: true });
    }
  };
  const [kycDocuments, setKycDocuments] = useState([]);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState("");
  const [listings, setListings] = useState([]);
  const [listingLoading, setListingLoading] = useState(true);
  const [listingError, setListingError] = useState("");
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [deals, setDeals] = useState([]);
  const [dealLoading, setDealLoading] = useState(true);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [paymentRecordsLoading, setPaymentRecordsLoading] = useState(false);
  const [paymentRecordsError, setPaymentRecordsError] = useState("");
  const [payoutPrompt, setPayoutPrompt] = useState(null);
  const [dealError, setDealError] = useState("");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [paymentReview, setPaymentReview] = useState(null);
  const [paymentReviewLoading, setPaymentReviewLoading] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [rejectionPrompt, setRejectionPrompt] = useState(null);
  const [listingApprovalPrompt, setListingApprovalPrompt] = useState(null);

  const fetchPurchaseRequests = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRequestLoading(true);
      setRequestError("");

      const response = await api.get("/requests/admin");

      if (response.data.success) {
        setPurchaseRequests(response.data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch purchase requests:", error);

      setRequestError(
        error.response?.data?.message || "Failed to load purchase requests.",
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const fetchDeals = async ({ silent = false } = {}) => {
    try {
      if (!silent) setDealLoading(true);
      setDealError("");

      const response = await api.get("/deals/admin");

      if (response.data.success) {
        setDeals(response.data.deals);
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);

      setDealError(error.response?.data?.message || "Failed to load deals.");
    } finally {
      setDealLoading(false);
    }
  };

  const fetchPaymentRecords = async ({ silent = false } = {}) => {
    try {
      if (!silent) setPaymentRecordsLoading(true);
      setPaymentRecordsError("");
      const response = await api.get("/payments/admin");
      if (response.data?.success)
        setPaymentRecords(response.data.payments || []);
    } catch (error) {
      console.error("Failed to fetch payment records:", error);
      setPaymentRecordsError(
        error.response?.data?.message || "Failed to load payment records.",
      );
    } finally {
      setPaymentRecordsLoading(false);
    }
  };

  const markSellerPayout = async (paymentId, reference = "") => {
    try {
      const response = await api.patch(`/payments/admin/${paymentId}/payout`, {
        status: "paid",
        reference,
      });
      if (!response.data?.success)
        throw new Error(
          response.data?.message || "Failed to update seller payout.",
        );
      await fetchPaymentRecords({ silent: true });
      await fetchDeals({ silent: true });
      toast.success("Seller payout marked as paid.");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update seller payout.",
      );
    }
  };

  const fetchMessageUnreadCount = async () => {
    try {
      const response = await api.get("/requests/messages/unread-count");
      if (response.data.success)
        setMessageUnreadCount(Number(response.data.unreadCount || 0));
    } catch (error) {
      console.error("Failed to fetch message unread count:", error);
    }
  };

  const markMessagesRead = async () => {
    await fetchMessageUnreadCount();
  };

  useEffect(() => {
    const current = searchParams.get("section");
    const nextSection = validSections.has(current) ? current : "dashboard";
    setActiveState((previous) =>
      previous === nextSection ? previous : nextSection,
    );
  }, [searchParams, validSections]);

  useEffect(() => {
    if (active === "payments") fetchPaymentRecords();
  }, [active]);

  const updateDealStatus = async (dealId, status, paymentStatus) => {
    try {
      const response = await api.patch(`/deals/${dealId}/status`, {
        status,
        ...(paymentStatus ? { paymentStatus } : {}),
      });

      if (response.data.success) {
        await fetchDeals();
        await fetchPurchaseRequests();
      }
    } catch (error) {
      console.error("Deal status update failed:", error);

      toast.error(error.response?.data?.message || "Failed to update deal.");
    }
  };

  const openPaymentReview = async (deal) => {
    try {
      setPaymentReviewLoading(true);
      setPaymentProofUrl("");
      const response = await api.get(`/payments/deal/${deal._id}`);
      const payment = response.data?.payment;
      if (!payment) {
        toast.error("The buyer has not submitted a payment proof yet.");
        return;
      }
      setPaymentReview({ deal, payment, invoice: response.data?.invoice });
    } catch (error) {
      console.error("Payment review load failed:", error);
      toast.error(
        error.response?.data?.message || "Failed to load payment details.",
      );
    } finally {
      setPaymentReviewLoading(false);
    }
  };

  const viewPaymentProof = async () => {
    const paymentId = paymentReview?.payment?._id;
    if (!paymentId) return;
    try {
      setPaymentActionLoading(true);
      const response = await api.get(`/payments/${paymentId}/proof`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: response.headers["content-type"] || "image/*",
        }),
      );
      setPaymentProofUrl(url);
    } catch (error) {
      console.error("Payment proof load failed:", error);
      toast.error(
        error.response?.data?.message || "Failed to load payment screenshot.",
      );
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const closePaymentReview = () => {
    if (paymentProofUrl) window.URL.revokeObjectURL(paymentProofUrl);
    setPaymentProofUrl("");
    setPaymentReview(null);
  };

  const confirmPayment = async (deal) => {
    try {
      const paymentResponse = await api.get(`/payments/deal/${deal._id}`);
      const payment = paymentResponse.data?.payment;

      if (!payment) {
        toast.error("The buyer has not submitted a payment proof yet.");
        return;
      }

      const response = await api.patch(`/payments/${payment._id}/status`, {
        status: "received",
      });

      if (response.data.success) {
        await fetchDeals();
        await fetchPurchaseRequests();
      }
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      toast.error(
        error.response?.data?.message || "Failed to confirm payment.",
      );
    }
  };

  const reviewPurchaseRequest = async (
    requestId,
    status,
    rejectionReason = "",
  ) => {
    try {
      const response = await api.patch(`/requests/admin/${requestId}`, {
        status,
        rejectionReason,
      });

      if (response.data.success) {
        await fetchPurchaseRequests();
      }
    } catch (error) {
      console.error("Purchase request review failed:", error);

      toast.error(
        error.response?.data?.message || "Failed to update purchase request.",
      );
    }
  };

  const fetchKycDocuments = async ({ silent = false } = {}) => {
    try {
      if (!silent) setKycLoading(true);
      setKycError("");

      const response = await api.get("/admin/kyc");

      if (response.data.success) {
        setKycDocuments(response.data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch KYC:", error);

      setKycError(
        error.response?.data?.message || "Failed to load KYC documents.",
      );
    } finally {
      setKycLoading(false);
    }
  };

  const fetchListings = async ({ silent = false } = {}) => {
    try {
      if (!silent) setListingLoading(true);
      setListingError("");

      const response = await api.get("/admin/listings");

      if (response.data.success) {
        setListings(response.data.listings);
      }
    } catch (error) {
      console.error("Failed to fetch listings:", error);

      setListingError(
        error.response?.data?.message || "Failed to load seller listings.",
      );
    } finally {
      setListingLoading(false);
    }
  };

  const reviewListing = async (
    listingId,
    status,
    rejectionReason = "",
    marginType = "percentage",
    marginValue = 10,
  ) => {
    try {
      const response = await api.patch(`/admin/listings/${listingId}`, {
        status,
        rejectionReason,
        ...(status === "active"
          ? {
              marginType,
              marginValue: Number(marginValue),
            }
          : {}),
      });

      if (response.data.success) {
        setListingApprovalPrompt(null);
        await fetchListings();
      }
    } catch (error) {
      console.error("Listing review failed:", error);

      toast.error(error.response?.data?.message || "Failed to review listing.");
    }
  };

  const reviewKyc = async (documentId, status, rejectionReason = "") => {
    try {
      const response = await api.patch(`/admin/kyc/${documentId}`, {
        status,
        rejectionReason,
      });

      if (response.data.success) {
        await fetchKycDocuments();
      }

      return response.data;
    } catch (error) {
      console.error("KYC review failed:", error);

      toast.error(
        error.response?.data?.message || "Failed to review document.",
      );

      throw error;
    }
  };

  useEffect(() => {
    fetchKycDocuments();
    fetchListings();
    fetchPurchaseRequests();
    fetchDeals();
    fetchMessageUnreadCount();

    const refresh = () => {
      fetchKycDocuments({ silent: true });
      fetchListings({ silent: true });
      fetchPurchaseRequests({ silent: true });
      fetchDeals({ silent: true });
      fetchMessageUnreadCount();
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const totalCommission = deals.reduce(
    (sum, deal) => sum + Number(deal.commissionAmount || 0),
    0,
  );

  const inProgressDeals = deals.filter(
    (deal) =>
      deal.status === "matched" ||
      deal.status === "negotiating" ||
      deal.status === "terms_agreed" ||
      deal.status === "payment_coordination",
  ).length;

  const completedDeals = deals.filter(
    (deal) => deal.status === "completed",
  ).length;
  return (
    <DashboardShell
      nav={NAV}
      active={active}
      onActiveChange={setActive}
      onNavigate={onNavigate}
      roleLabel="Admin Control Center"
      displayName={"Super Admin"}
      secondaryText={"Platform administrator"}
      initial={"A"}
      badges={{
        verification: kycDocuments.length,
        listings: listings.length,
        requests: purchaseRequests.filter(
          (request) => request.status === "pending",
        ).length,
        quotations: purchaseRequests.filter(
          (request) =>
            request.offer?.finalAmount != null && !request.offer?.acceptedAt,
        ).length,
        payments: paymentRecords.filter(
          (payment) => payment.status === "initiated",
        ).length,
        messages: messageUnreadCount,
      }}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("home")}
          >
            Home
          </Button>
          <NotificationBell compact onNavigate={onNavigate} />
          <AdminProfileMenu onNavigate={onNavigate} compact />
        </>
      }
      titleFallback="Admin Dashboard"
      variant="dark"
    >
      {active === "dashboard" && (
        <>
          <PageHeader
            eyebrow="Operations"
            title="Admin Dashboard"
            description="Monitor verification, marketplace activity, transactions, and items that need intervention."
            actions={
              <Button size="sm" onClick={() => setActive("verification")}>
                Review queue
              </Button>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            <StatCard
              label="Pending KYC"
              value={kycDocuments.length}
              accent={kycDocuments.length > 0}
              icon={<NavIcon id="verification" />}
            />
            <StatCard
              label="Pending Requests"
              value={
                purchaseRequests.filter((r) => r.status === "pending").length
              }
              accent={purchaseRequests.some((r) => r.status === "pending")}
              icon={<NavIcon id="requests" />}
            />
            <StatCard
              label="Deals in Progress"
              value={inProgressDeals}
              icon={<NavIcon id="deals" />}
            />
            <StatCard
              label="Platform Commission"
              value={`₹${totalCommission.toLocaleString("en-IN")}`}
              accent
              icon={<NavIcon id="reports" />}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr] mb-6">
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5EAF0]">
                <SectionHeader
                  title="Action required"
                  description="Start with the queues that can block marketplace activity."
                  className="mb-0"
                />
              </div>
              <div className="divide-y divide-[#EEF2F6]">
                <button
                  type="button"
                  onClick={() => setActive("verification")}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FFF7E6] text-[#B45309] flex items-center justify-center shrink-0">
                    <NavIcon id="verification" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#101828]">
                      KYC verification
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5">
                      Business documents waiting for review.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#101828]">
                    {kycDocuments.length}
                  </span>
                  <span className="text-[#98A2B3]">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActive("requests")}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EEF8F0] text-[#3EA646] flex items-center justify-center shrink-0">
                    <NavIcon id="requests" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#101828]">
                      Purchase requests
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5">
                      New requests that need an admin decision or quotation.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#101828]">
                    {
                      purchaseRequests.filter((r) => r.status === "pending")
                        .length
                    }
                  </span>
                  <span className="text-[#98A2B3]">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActive("quotations")}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F3F0FF] text-[#6941C6] flex items-center justify-center shrink-0">
                    <NavIcon id="quotations" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#101828]">
                      Quotation follow-up
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5">
                      Requests with an outstanding quotation.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#101828]">
                    {
                      purchaseRequests.filter(
                        (r) =>
                          r.offer?.finalAmount != null && !r.offer?.acceptedAt,
                      ).length
                    }
                  </span>
                  <span className="text-[#98A2B3]">→</span>
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <SectionHeader
                title="Platform pulse"
                description="Current workload across the marketplace."
              />
              <div className="space-y-4">
                {[
                  ["Seller listings", listings.length, "listings in review"],
                  [
                    "Active conversations",
                    messageUnreadCount,
                    "unread messages",
                  ],
                  [
                    "Completed deals",
                    completedDeals,
                    "successful transactions",
                  ],
                  [
                    "Commission",
                    `₹${totalCommission.toLocaleString("en-IN")}`,
                    "recorded so far",
                  ],
                ].map(([label, value, helper]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#344054]">
                        {label}
                      </p>
                      <p className="text-xs text-[#98A2B3] mt-0.5">{helper}</p>
                    </div>
                    <p className="text-sm font-bold text-[#101828] shrink-0">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5EAF0]">
              <SectionHeader
                title="Recent purchase requests"
                description="The latest marketplace requests requiring operational visibility."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActive("requests")}
                  >
                    View all
                  </Button>
                }
                className="mb-0"
              />
            </div>
            <Table
              headers={[
                "Buyer",
                "Seller",
                "Credit Type",
                "Qty (MT)",
                "Price (₹/MT)",
                "Status",
                "Action",
              ]}
            >
              {requestLoading ? (
                <Tr>
                  <Td colSpan={7}>
                    <div className="py-10 text-center text-sm text-[#667085]">
                      Loading purchase requests...
                    </div>
                  </Td>
                </Tr>
              ) : requestError ? (
                <Tr>
                  <Td colSpan={7}>
                    <div className="py-10 text-center text-sm text-[#D92D20]">
                      {requestError}
                    </div>
                  </Td>
                </Tr>
              ) : purchaseRequests.length === 0 ? (
                <Tr>
                  <Td colSpan={7}>
                    <div className="py-10 text-center text-sm text-[#667085]">
                      No purchase requests found.
                    </div>
                  </Td>
                </Tr>
              ) : (
                purchaseRequests.slice(0, 5).map((request) => (
                  <Tr key={request._id}>
                    <Td>
                      <span className="font-medium">
                        {request.companyName ||
                          request.buyerId?.company ||
                          request.buyerId?.name ||
                          "—"}
                      </span>
                    </Td>
                    <Td>
                      {request.listingId?.sellerId?.company ||
                        request.listingId?.sellerId?.name ||
                        "—"}
                    </Td>
                    <Td>{request.listingId?.category || "—"}</Td>
                    <Td>{request.quantity}</Td>
                    <Td>₹{request.listingId?.price ?? "—"}</Td>
                    <Td>
                      <Badge label={request.status} />
                    </Td>
                    <Td>
                      {![
                        "approved",
                        "completed",
                        "cancelled",
                        "rejected",
                      ].includes(request.status) ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRequestId(request._id);
                            setActive("quotations");
                          }}
                        >
                          Manage
                        </Button>
                      ) : (
                        <span className="text-xs text-[#98A2B3]">
                          No action
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Table>
          </Card>
        </>
      )}

      {active === "listings" && (
        <Card>
          <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div>
              <h2
                className="font-semibold text-[#0F1923]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Seller Listings
              </h2>

              <p className="text-xs text-[#9CA3AF] mt-1">
                Review listings submitted by verified sellers.
              </p>
            </div>

            <Badge label={`${listings.length} Pending`} />
          </div>

          {listingLoading ? (
            <div className="py-12 text-center text-[#9CA3AF]">
              Loading seller listings...
            </div>
          ) : listingError ? (
            <div className="py-12 text-center text-[#EF4444]">
              {listingError}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-12 text-center text-[#9CA3AF]">
              No pending seller listings.
            </div>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {listings.map((listing) => {
                const certificateVerification =
                  getCertificateVerification(listing);

                return (
                  <div key={listing._id} className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3
                            className="font-semibold text-[#0F1923]"
                            style={{
                              fontFamily: "Outfit, sans-serif",
                            }}
                          >
                            {listing.category}
                          </h3>

                          <Badge label="Pending Review" />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-[#9CA3AF]">Seller</p>
                            <p className="font-medium text-[#374151]">
                              {listing.sellerId?.company ||
                                listing.sellerId?.name ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#9CA3AF]">Quantity</p>
                            <p className="font-medium text-[#374151]">
                              {listing.quantity} MT
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#9CA3AF]">Price</p>
                            <p className="font-medium text-[#374151]">
                              ₹{listing.price}/MT
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#9CA3AF]">Location</p>
                            <p className="font-medium text-[#374151]">
                              {listing.location}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#9CA3AF]">
                              Compliance Year
                            </p>
                            <p className="font-medium text-[#374151]">
                              FY {listing.complianceYear}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-[#9CA3AF]">Valid Till</p>
                            <p className="font-medium text-[#374151]">
                              {listing.validTill
                                ? new Date(
                                    listing.validTill,
                                  ).toLocaleDateString("en-IN")
                                : "—"}
                            </p>
                          </div>
                        </div>

                        {listing.description && (
                          <div className="mt-4 p-3 bg-[#F7F9FB] rounded-lg">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Description
                            </p>
                            <p className="text-sm text-[#374151]">
                              {listing.description}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 lg:w-72">
                        <div
                          className={`rounded-xl border p-3 ${certificateVerification.complete ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FFFBEB] border-[#FCD34D]"}`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="text-xs font-semibold text-[#374151]">
                              Certificate verification
                            </p>
                            <Badge
                              label={
                                certificateVerification.complete
                                  ? "Checks passed"
                                  : "Review needed"
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            {certificateVerification.checks.map(
                              ([label, passed]) => (
                                <div
                                  key={label}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <span className="text-[#6B7280]">
                                    {label}
                                  </span>
                                  <span
                                    className={
                                      passed
                                        ? "text-[#2E7D32] font-semibold"
                                        : "text-[#B45309] font-semibold"
                                    }
                                  >
                                    {passed ? "✓" : "Needs review"}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                          {listing.documentId?.certificateNumber && (
                            <p className="text-[11px] text-[#6B7280] mt-2 pt-2 border-t border-black/5">
                              {listing.documentId.certificateNumber} ·{" "}
                              {listing.documentId.sourcePortal ||
                                "Source not set"}
                            </p>
                          )}
                        </div>

                        {listing.documentId?.fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadDocument(
                                listing.documentId._id,
                                listing.documentId.fileName,
                              )
                            }
                            className="rounded-lg border border-[#E5EAF0] px-4 py-2 text-sm text-center text-[#374151] hover:bg-[#F7F9FB]"
                          >
                            View Proof
                          </button>
                        )}

                        <Button
                          onClick={() =>
                            setListingApprovalPrompt({
                              listing,
                              marginType: "percentage",
                              marginValue: "10",
                            })
                          }
                          disabled={!certificateVerification.complete}
                          title={
                            !certificateVerification.complete
                              ? "Certificate verification checks must pass before publishing"
                              : "Choose the internal marketplace margin and publish listing"
                          }
                        >
                          Approve & Publish
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() =>
                            setRejectionPrompt({
                              type: "listing",
                              id: listing._id,
                              title: "Reject listing",
                              description:
                                "Add the reason the seller should see for this rejection.",
                              value: "",
                            })
                          }
                        >
                          Reject Listing
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {active === "verification" && (
        <VerificationQueue
          kycDocuments={kycDocuments}
          kycLoading={kycLoading}
          kycError={kycError}
          reviewKyc={reviewKyc}
        />
      )}

      {active === "requests" && (
        <Card>
          <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <div>
              <h2
                className="font-semibold text-[#0F1923]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Purchase Requests
              </h2>

              <p className="text-xs text-[#9CA3AF] mt-1">
                Manage buyer requests submitted through the marketplace.
              </p>
            </div>

            <Badge label={`${purchaseRequests.length} Total`} />
          </div>

          {requestLoading ? (
            <div className="py-16 text-center text-[#9CA3AF]">
              Loading purchase requests...
            </div>
          ) : requestError ? (
            <div className="py-16 text-center text-[#EF4444]">
              {requestError}
            </div>
          ) : purchaseRequests.length === 0 ? (
            <div className="py-16 text-center text-[#9CA3AF]">
              <p className="text-lg font-semibold text-[#374151]">
                No purchase requests
              </p>

              <p className="text-sm mt-1">
                Buyer requests will appear here when submitted.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5EAF0]">
              {purchaseRequests.map((request) => {
                const listing = request.listingId;
                const buyer = request.buyerId;
                const seller = listing?.sellerId;

                return (
                  <div key={request._id} className="p-5">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
                      {/* Request information */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <h3
                            className="font-semibold text-[#0F1923]"
                            style={{
                              fontFamily: "Outfit, sans-serif",
                            }}
                          >
                            Request #{request._id.slice(-6)}
                          </h3>

                          <Badge label={request.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">Buyer</p>
                            <p className="font-medium text-[#374151]">
                              {request.companyName ||
                                buyer?.company ||
                                buyer?.name ||
                                "—"}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-1">
                              {request.email || buyer?.email || "—"}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Seller
                            </p>
                            <p className="font-medium text-[#374151]">
                              {seller?.company || seller?.name || "—"}
                            </p>
                            <p className="text-xs text-[#6B7280] mt-1">
                              {seller?.email || "—"}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Credit Type
                            </p>
                            <p className="font-medium text-[#374151]">
                              {listing?.category || "—"}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Requested Quantity
                            </p>
                            <p className="font-medium text-[#374151]">
                              {request.quantity} MT
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Listed Price
                            </p>
                            <p className="font-medium text-[#374151]">
                              ₹{listing?.price ?? "—"} / MT
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Estimated Value
                            </p>
                            <p className="font-semibold text-[#5AC361]">
                              ₹
                              {(
                                Number(request.quantity || 0) *
                                Number(listing?.price || 0)
                              ).toLocaleString("en-IN")}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Location
                            </p>
                            <p className="font-medium text-[#374151]">
                              {listing?.location || "—"}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Compliance Year
                            </p>
                            <p className="font-medium text-[#374151]">
                              FY {listing?.complianceYear || "—"}
                            </p>
                          </div>

                          <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                            <p className="text-xs text-[#9CA3AF] mb-1">
                              Submitted
                            </p>
                            <p className="font-medium text-[#374151]">
                              {request.createdAt
                                ? new Date(request.createdAt).toLocaleString(
                                    "en-IN",
                                  )
                                : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-4">
                          <p className="text-xs font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">
                            Request Details
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-[#9CA3AF]">
                                Contact Person
                              </span>
                              <p className="font-medium text-[#374151]">
                                {request.contactPerson || "—"}
                              </p>
                            </div>

                            <div>
                              <span className="text-[#9CA3AF]">Phone</span>
                              <p className="font-medium text-[#374151]">
                                {request.phone || "—"}
                              </p>
                            </div>

                            <div>
                              <span className="text-[#9CA3AF]">GST</span>
                              <p className="font-medium text-[#374151]">
                                {request.gstNumber || "—"}
                              </p>
                            </div>

                            <div>
                              <span className="text-[#9CA3AF]">Email</span>
                              <p className="font-medium text-[#374151]">
                                {request.email || "—"}
                              </p>
                            </div>
                          </div>

                          {request.notes && (
                            <div className="mt-3 pt-3 border-t border-[#E5EAF0]">
                              <span className="text-[#9CA3AF] text-xs">
                                Notes
                              </span>

                              <p className="text-sm text-[#374151] mt-1">
                                {request.notes}
                              </p>
                            </div>
                          )}

                          {request.rejectionReason && (
                            <div className="mt-3 p-3 bg-[#FEF2F2] rounded-lg">
                              <span className="text-xs font-semibold text-[#991B1B]">
                                Rejection Reason
                              </span>

                              <p className="text-sm text-[#B91C1C] mt-1">
                                {request.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 xl:w-48">
                        {![
                          "approved",
                          "completed",
                          "cancelled",
                          "rejected",
                        ].includes(request.status) && (
                          <Button
                            onClick={() => {
                              setSelectedRequestId(request._id);
                              setActive("quotations");
                            }}
                          >
                            Manage Request
                          </Button>
                        )}

                        {request.status === "pending" && (
                          <Button
                            variant="danger"
                            onClick={() =>
                              setRejectionPrompt({
                                type: "request",
                                id: request._id,
                                title: "Reject purchase request",
                                description:
                                  "Add the reason the buyer should see for this rejection.",
                                value: "",
                              })
                            }
                          >
                            Reject Request
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {active === "quotations" && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-base font-semibold text-[#0F1923]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Quotations
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Create and revise buyer quotations. Messages are handled
                separately.
              </p>
            </div>
          </div>
          <QuotationCenter
            initialRequestId={selectedRequestId}
            onOpenDeals={() => {
              setActive("deals");
              fetchDeals();
            }}
          />
        </div>
      )}

      {active === "deals" && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-base font-semibold text-[#0F1923] mb-1"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Deal Mediation Workspace
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Manage matched transactions through completion.
              </p>
            </div>
            <Badge label={`${deals.length} Deals`} />
          </div>

          {dealLoading ? (
            <Card className="p-10">
              <div className="text-center text-[#9CA3AF]">Loading deals...</div>
            </Card>
          ) : dealError ? (
            <Card className="p-10">
              <div className="text-center text-[#EF4444]">{dealError}</div>
            </Card>
          ) : deals.length === 0 ? (
            <Card className="p-10">
              <div className="text-center">
                <p className="text-base font-semibold text-[#374151]">
                  No deals yet
                </p>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Matched purchase requests will appear here.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {deals.map((deal) => {
                const listing = deal.listingId || {};
                const buyer = deal.buyerId || {};
                const seller = deal.sellerId || {};

                const stages = [
                  { key: "matched", label: "Deal Created" },
                  {
                    key: "payment_coordination",
                    label: "Payment Coordination",
                  },
                  { key: "completed", label: "Deal Completed" },
                ];

                const currentIndex = stages.findIndex(
                  (stage) => stage.key === deal.status,
                );
                const normalizedIndex =
                  deal.status === "cancelled"
                    ? -1
                    : deal.status === "payment_coordination"
                      ? 1
                      : deal.status === "completed"
                        ? 2
                        : 0;

                return (
                  <Card key={deal._id} className="p-5">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="font-semibold text-[#0F1923]"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            Deal #{deal._id.slice(-6)} —{" "}
                            {listing.category || "EPR Credits"}
                          </span>
                          <Badge label={deal.status.replaceAll("_", " ")} />
                        </div>
                        <p className="text-xs text-[#9CA3AF]">
                          Created{" "}
                          {deal.createdAt
                            ? new Date(deal.createdAt).toLocaleString("en-IN")
                            : "—"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-[#9CA3AF]">
                          Platform margin
                        </p>
                        <p className="font-bold text-[#5AC361]">
                          ₹
                          {Number(deal.commissionAmount || 0).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                        <p className="text-xs text-[#9CA3AF] mb-1">Buyer</p>
                        <p className="font-semibold text-[#374151]">
                          {buyer.company || buyer.name || "Buyer"}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {deal.quantity} MT · ₹
                          {Number(deal.agreedPrice || 0).toLocaleString(
                            "en-IN",
                          )}
                          /MT
                        </p>
                      </div>

                      <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-3">
                        <p className="text-xs text-[#9CA3AF] mb-1">Seller</p>
                        <p className="font-semibold text-[#374151]">
                          {seller.company || seller.name || "Seller"}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {listing.location || "—"} · FY{" "}
                          {listing.complianceYear || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 overflow-x-auto">
                      <div className="flex items-center gap-1 min-w-max">
                        {stages.map((stage, index) => {
                          const done = index <= normalizedIndex;

                          return (
                            <div
                              key={stage.key}
                              className="flex items-center gap-1"
                            >
                              <div
                                className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap ${
                                  done
                                    ? "bg-[#5AC361] text-white"
                                    : "bg-[#F0F4F8] text-[#9CA3AF]"
                                }`}
                              >
                                {stage.label}
                              </div>

                              {index < stages.length - 1 && (
                                <div
                                  className={`w-4 h-0.5 ${
                                    index < normalizedIndex
                                      ? "bg-[#5AC361]"
                                      : "bg-[#E5EAF0]"
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="text-[#6B7280]">
                        <span>Seller settlement: </span>
                        <strong className="text-[#374151]">
                          ₹
                          {Number(
                            deal.sellerSubtotal ??
                              deal.creditSubtotal ??
                              Number(deal.quantity || 0) *
                                Number(deal.agreedPrice || 0),
                          ).toLocaleString("en-IN")}
                        </strong>
                        <span className="mx-2 text-[#D1D5DB]">•</span>
                        <span>Buyer total: </span>
                        <strong className="text-[#374151]">
                          ₹
                          {Number(deal.finalAmount || 0).toLocaleString(
                            "en-IN",
                          )}
                        </strong>
                        <span className="mx-2 text-[#D1D5DB]">•</span>
                        <span>Payment: </span>
                        <strong className="capitalize text-[#374151]">
                          {deal.paymentStatus || "pending"}
                        </strong>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {deal.status === "matched" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateDealStatus(deal._id, "terms_agreed")
                            }
                          >
                            Confirm Terms
                          </Button>
                        )}

                        {deal.status === "terms_agreed" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateDealStatus(deal._id, "payment_coordination")
                            }
                          >
                            Move to Payment
                          </Button>
                        )}

                        {deal.status === "payment_coordination" &&
                          deal.paymentStatus !== "received" && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentReview(deal)}
                              disabled={paymentReviewLoading}
                            >
                              {paymentReviewLoading
                                ? "Loading…"
                                : "Review Payment Proof"}
                            </Button>
                          )}

                        {deal.status === "payment_coordination" &&
                          deal.paymentStatus === "received" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateDealStatus(
                                  deal._id,
                                  "completed",
                                  "received",
                                )
                              }
                            >
                              Mark Completed
                            </Button>
                          )}

                        {deal.status !== "completed" &&
                          deal.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() =>
                                updateDealStatus(deal._id, "cancelled")
                              }
                            >
                              Cancel Deal
                            </Button>
                          )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {active === "reports" && (
        <Card>
          <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between">
            <h2
              className="font-semibold text-[#0F1923]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Commission & Deal Reports
            </h2>
            <Button variant="outline" size="sm" onClick={fetchDeals}>
              Refresh
            </Button>
          </div>

          {dealLoading ? (
            <div className="py-12 text-center text-[#9CA3AF]">
              Loading deal reports...
            </div>
          ) : dealError ? (
            <div className="py-12 text-center text-[#EF4444]">{dealError}</div>
          ) : (
            <>
              <Table
                headers={[
                  "Deal ID",
                  "Buyer",
                  "Seller",
                  "Type",
                  "Qty (MT)",
                  "Price (₹/MT)",
                  "Commission (₹)",
                  "Status",
                  "Date",
                ]}
              >
                {deals.map((deal) => (
                  <Tr key={deal._id}>
                    <Td>
                      <span className="font-mono text-xs">
                        #{deal._id.slice(-6)}
                      </span>
                    </Td>
                    <Td>
                      {deal.buyerId?.company || deal.buyerId?.name || "—"}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">
                        {deal.sellerId?.company || deal.sellerId?.name || "—"}
                      </span>
                    </Td>
                    <Td>{deal.listingId?.category || "—"}</Td>
                    <Td>{deal.quantity}</Td>
                    <Td>
                      ₹{Number(deal.agreedPrice || 0).toLocaleString("en-IN")}
                    </Td>
                    <Td>
                      <span className="font-semibold text-[#5AC361]">
                        ₹
                        {Number(deal.commissionAmount || 0).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </Td>
                    <Td>
                      <Badge label={deal.status.replaceAll("_", " ")} />
                    </Td>
                    <Td>
                      {deal.createdAt
                        ? new Date(deal.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </Td>
                  </Tr>
                ))}
              </Table>

              <div className="px-5 py-3 border-t border-[#E5EAF0] flex items-center justify-between">
                <span className="text-sm text-[#6B7280]">
                  Total commission earned
                </span>
                <span
                  className="font-bold text-[#0F1923] text-lg"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  ₹{totalCommission.toLocaleString("en-IN")}
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {active === "payments" && (
        <div className="mb-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                className="text-base font-semibold text-[#0F1923]"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Payment Records
              </h2>
              <p className="mt-1 text-xs text-[#667085]">
                Permanent internal records of buyer payments, seller settlements
                and EPR Nexuss margin.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchPaymentRecords()}
            >
              Refresh
            </Button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Payments received"
              value={`₹${paymentRecords
                .filter((p) => p.status === "received")
                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                .toLocaleString("en-IN")}`}
              accent
            />
            <StatCard
              label="Platform margin"
              value={`₹${paymentRecords.reduce((sum, p) => sum + Number(p.platformMarginAmount || 0), 0).toLocaleString("en-IN")}`}
            />
            <StatCard
              label="Seller settlements"
              value={`₹${paymentRecords.reduce((sum, p) => sum + Number(p.sellerPayoutAmount || 0), 0).toLocaleString("en-IN")}`}
            />
            <StatCard
              label="Awaiting verification"
              value={String(
                paymentRecords.filter((p) => p.status === "initiated").length,
              )}
            />
          </div>

          <Card className="overflow-hidden">
            {paymentRecordsLoading ? (
              <div className="p-12 text-center text-sm text-[#98A2B3]">
                Loading payment records…
              </div>
            ) : paymentRecordsError ? (
              <div className="p-12 text-center">
                <p className="text-sm text-[#B42318]">{paymentRecordsError}</p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPaymentRecords()}
                >
                  Retry
                </Button>
              </div>
            ) : paymentRecords.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#667085]">
                No payment records yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table
                  headers={[
                    "Deal",
                    "Buyer / Seller",
                    "Amount received",
                    "Seller payout",
                    "Platform margin",
                    "Payment",
                    "Date",
                    "Action",
                  ]}
                >
                  {paymentRecords.map((payment) => {
                    const deal = payment.dealId || {};
                    const buyer = deal.buyerId || {};
                    const seller = deal.sellerId || {};
                    return (
                      <Tr key={payment._id}>
                        <Td className="font-semibold">
                          #{String(deal._id || payment.dealId || "").slice(-8)}
                        </Td>
                        <Td>
                          <span className="font-medium">
                            {buyer.company || buyer.name || "Buyer"}
                          </span>
                          <span className="block text-[11px] text-[#98A2B3]">
                            {seller.company || seller.name || "Seller"}
                          </span>
                        </Td>
                        <Td>
                          ₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                        </Td>
                        <Td>
                          ₹
                          {Number(
                            payment.sellerPayoutAmount || 0,
                          ).toLocaleString("en-IN")}
                        </Td>
                        <Td className="font-semibold text-[#2E7D32]">
                          ₹
                          {Number(
                            payment.platformMarginAmount || 0,
                          ).toLocaleString("en-IN")}
                        </Td>
                        <Td>
                          <Badge
                            label={
                              payment.status === "received"
                                ? "Received"
                                : payment.status === "initiated"
                                  ? "Proof submitted"
                                  : payment.status || "Pending"
                            }
                          />
                        </Td>
                        <Td>
                          {payment.receivedAt
                            ? new Date(payment.receivedAt).toLocaleDateString(
                                "en-IN",
                              )
                            : payment.createdAt
                              ? new Date(payment.createdAt).toLocaleDateString(
                                  "en-IN",
                                )
                              : "—"}
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentReview(deal)}
                            >
                              {payment.status === "received"
                                ? "View record"
                                : "Review"}
                            </Button>
                            {payment.status === "received" &&
                            payment.sellerPayoutStatus !== "paid" ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPayoutPrompt({
                                    id: payment._id,
                                    value: "",
                                    title: "Record seller payout",
                                    description: `Seller settlement: ₹${Number(payment.sellerPayoutAmount || 0).toLocaleString("en-IN")}. Enter the payout reference.`,
                                  })
                                }
                              >
                                Mark seller paid
                              </Button>
                            ) : null}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </Table>
              </div>
            )}
          </Card>
        </div>
      )}

      {active === "disputes" && <DisputesPage role="admin" />}

      {active === "messages" && (
        <div>
          <div className="mb-4">
            <h2
              className="text-base font-semibold text-[#0F1923]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Messages
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Open any request to read the controlled conversation and message
              either the buyer or seller separately.
            </p>
          </div>
          <ManagedMessagesPage
            initialRequestId={selectedRequestId}
            onRead={markMessagesRead}
          />
        </div>
      )}

      <PromptModal
        open={Boolean(payoutPrompt)}
        title={payoutPrompt?.title}
        description={payoutPrompt?.description}
        value={payoutPrompt?.value || ""}
        onChange={(value) =>
          setPayoutPrompt((current) =>
            current ? { ...current, value } : current,
          )
        }
        onCancel={() => setPayoutPrompt(null)}
        onConfirm={() => {
          if (!payoutPrompt?.value?.trim()) return;
          markSellerPayout(payoutPrompt.id, payoutPrompt.value.trim());
          setPayoutPrompt(null);
        }}
        confirmLabel="Mark paid"
        placeholder="UTR / payout reference..."
      />

      <PromptModal
        open={Boolean(rejectionPrompt)}
        title={rejectionPrompt?.title}
        description={rejectionPrompt?.description}
        value={rejectionPrompt?.value || ""}
        onChange={(value) =>
          setRejectionPrompt((current) =>
            current ? { ...current, value } : current,
          )
        }
        onCancel={() => setRejectionPrompt(null)}
        onConfirm={() => {
          const reason = rejectionPrompt?.value?.trim();
          if (!reason) return;
          if (rejectionPrompt.type === "listing") {
            reviewListing(rejectionPrompt.id, "rejected", reason);
          } else {
            reviewPurchaseRequest(rejectionPrompt.id, "rejected", reason);
          }
          setRejectionPrompt(null);
        }}
        confirmLabel="Reject"
        placeholder="Enter rejection reason..."
      />

      {listingApprovalPrompt ? (
        <ListingApprovalMarginModal
          prompt={listingApprovalPrompt}
          onCancel={() => setListingApprovalPrompt(null)}
          onConfirm={(marginType, marginValue) =>
            reviewListing(
              listingApprovalPrompt.listing._id,
              "active",
              "",
              marginType,
              marginValue,
            )
          }
        />
      ) : null}

      {paymentReview ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E5EAF0] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
                  Payment verification
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#0F1923]">
                  Deal #{paymentReview.deal._id.slice(-6)}
                </h3>
                <p className="mt-1 text-xs text-[#667085]">
                  Review the buyer's payment details and screenshot before
                  confirming receipt.
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentReview}
                className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7]"
                aria-label="Close payment review"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#98A2B3]">
                    Buyer payment
                  </p>
                  <p className="mt-1 font-semibold text-[#101828]">
                    ₹
                    {Number(paymentReview.payment.amount || 0).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#98A2B3]">
                    Seller settlement
                  </p>
                  <p className="mt-1 font-semibold text-[#101828]">
                    ₹
                    {Number(
                      paymentReview.payment.sellerPayoutAmount ||
                        paymentReview.deal.sellerSubtotal ||
                        paymentReview.deal.creditSubtotal ||
                        0,
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl border border-[#CFE8D1] bg-[#F5FBF6] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#2E7D32]">
                    Platform margin
                  </p>
                  <p className="mt-1 font-semibold text-[#1B5E20]">
                    ₹
                    {Number(
                      paymentReview.payment.platformMarginAmount ||
                        paymentReview.deal.marginAmount ||
                        paymentReview.deal.commissionAmount ||
                        0,
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#98A2B3]">
                    Method
                  </p>
                  <p className="mt-1 font-semibold capitalize text-[#101828]">
                    {String(paymentReview.payment.method || "—").replaceAll(
                      "_",
                      " ",
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[#98A2B3]">
                    UTR / Reference
                  </p>
                  <p className="mt-1 break-all font-semibold text-[#101828]">
                    {paymentReview.payment.reference || "Not provided"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#E5EAF0] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#101828]">
                      Payment screenshot
                    </p>
                    <p className="mt-1 text-xs text-[#667085]">
                      {paymentReview.payment.proofFileName ||
                        "No screenshot attached"}
                    </p>
                  </div>
                  {paymentReview.payment.proofFileUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={viewPaymentProof}
                      disabled={paymentActionLoading}
                    >
                      {paymentActionLoading
                        ? "Loading…"
                        : paymentProofUrl
                          ? "Reload screenshot"
                          : "View screenshot"}
                    </Button>
                  ) : null}
                </div>
                {paymentProofUrl ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-[#E5EAF0] bg-[#F7F9FB] p-2">
                    <img
                      src={paymentProofUrl}
                      alt="Payment proof"
                      className="mx-auto max-h-[420px] max-w-full rounded-lg object-contain"
                    />
                  </div>
                ) : null}
              </div>
              <div className="mt-4 rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-4">
                <p className="text-sm font-semibold text-[#101828]">
                  Buyer note
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#667085]">
                  {paymentReview.payment.notes || "No note provided."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E5EAF0] px-5 py-4">
              <Button size="sm" variant="outline" onClick={closePaymentReview}>
                Close
              </Button>
              {paymentReview.payment.status !== "received" ? (
                <Button
                  size="sm"
                  onClick={async () => {
                    await confirmPayment(paymentReview.deal);
                    closePaymentReview();
                  }}
                >
                  Verify Payment Received
                </Button>
              ) : (
                <Badge label="Payment verified" />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {active === "settings" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F0F4F8] flex items-center justify-center text-[#9CA3AF] mb-3">
            <NavIcon id="settings" />
          </div>
          <p className="font-semibold text-[#374151]">Settings</p>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Platform settings will be added here.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
export { AdminDashboard as default };
