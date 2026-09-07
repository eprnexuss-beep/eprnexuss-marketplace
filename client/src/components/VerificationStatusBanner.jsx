import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const getSeenKey = (userId) => `epr_verification_approved_seen_${String(userId || "")}`;

function VerificationStatusBanner({ onNavigate }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isUser = user?.role === "buyer" || user?.role === "seller";
  const seenKey = useMemo(() => getSeenKey(user?.id || user?._id), [user?.id, user?._id]);

  useEffect(() => {
    if (!isUser) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setLoading(true);
      try {
        const response = await api.get("/verifications/me");
        if (cancelled) return;

        const verification = response.data?.verification;
        const userStatus = response.data?.user?.kycStatus || user?.kycStatus || "pending";
        setStatus(verification?.status || userStatus);

        if (userStatus === "approved" && localStorage.getItem(seenKey) === "1") {
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      } catch (error) {
        if (cancelled) return;
        // Fall back to the authenticated user's current KYC state so a temporary
        // status-request failure never breaks the rest of the page.
        setStatus(user?.kycStatus || "pending");
        setDismissed(
          user?.kycStatus === "approved" && localStorage.getItem(seenKey) === "1",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [isUser, seenKey, user?.kycStatus]);

  if (!isUser || loading || !status || dismissed) return null;

  const dismissApproved = () => {
    localStorage.setItem(seenKey, "1");
    setDismissed(true);
  };

  const config = {
    pending: {
      wrapper: "border-[#FCD34D] bg-[#FFFBEB]",
      icon: "bg-[#FEF3C7] text-[#92400E]",
      title: "Your documents are not verified yet",
      message: "Please submit your business verification documents to complete your profile.",
      action: "Verify documents",
      text: "text-[#92400E]",
    },
    rejected: {
      wrapper: "border-[#FECACA] bg-[#FEF2F2]",
      icon: "bg-[#FEE2E2] text-[#B42318]",
      title: "Your verification needs attention",
      message: user?.kycRejectionReason
        ? `Your documents were rejected: ${user.kycRejectionReason}`
        : "Your documents were not approved. Please review the verification page and resubmit.",
      action: "Review documents",
      text: "text-[#B42318]",
    },
    approved: {
      wrapper: "border-[#A5D6A7] bg-[#EBF8EC]",
      icon: "bg-[#D9F4DC] text-[#2E7D32]",
      title: "Your profile is verified now",
      message: "Your business verification has been approved. You now have access to the full marketplace experience.",
      action: null,
      text: "text-[#2E7D32]",
    },
  }[status] || null;

  if (!config) return null;

  return (
    <section
      className={`mb-6 rounded-2xl border px-4 py-3.5 sm:px-5 ${config.wrapper}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.icon}`}>
          {status === "approved" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : status === "rejected" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86l-7.2 12.48A2 2 0 004.82 19h14.36a2 2 0 001.73-2.66l-7.2-12.48a2 2 0 00-3.42 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${config.text}`}>{config.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#667085]">{config.message}</p>
          {config.action && (
            <button
              type="button"
              onClick={() => onNavigate("verification")}
              className={`mt-2 text-xs font-bold underline underline-offset-2 ${config.text}`}
            >
              {config.action} →
            </button>
          )}
        </div>

        {status === "approved" && (
          <button
            type="button"
            onClick={dismissApproved}
            className="rounded-lg p-1 text-[#667085] transition hover:bg-white/60 hover:text-[#344054]"
            aria-label="Dismiss verification confirmation"
            title="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}

export default VerificationStatusBanner;
