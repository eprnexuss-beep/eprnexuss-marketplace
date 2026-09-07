import { useEffect, useState } from "react";
import api from "../services/api.js";
import { Badge, Button, Card, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

function VerificationPage({ onNavigate }) {
  const { user, refreshUser, resendVerification } = useAuth();
  const [verification, setVerification] = useState(null);
  const [companyName, setCompanyName] = useState(user?.company || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadVerification = async () => {
    try {
      setLoading(true);
      setError("");
      await refreshUser();
      const response = await api.get("/verifications/me");
      if (response.data.success) {
        setVerification(response.data.verification);
        setCompanyName(
          response.data.verification?.companyName ||
            response.data.user?.company ||
            "",
        );
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to load verification status.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVerification();
  }, []);

  const submit = async () => {
    setError("");
    setSuccess("");

    if (!user?.emailVerified) {
      setError(
        "Please verify your email before submitting verification documents.",
      );
      return;
    }

    if (!companyName.trim()) {
      setError("Business/company name is required.");
      return;
    }

    if (!file) {
      setError("Please upload a screenshot of your CPCB portal profile.");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG or WEBP files are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The verification document must be smaller than 10 MB.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("companyName", companyName.trim());
      formData.append("cpcbProfile", file);

      const response = await api.post("/verifications/me", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSuccess(
          "Verification documents submitted. Please wait while an admin reviews them.",
        );
        setFile(null);
        setVerification(response.data.verification);
        await refreshUser();
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to submit verification.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resendEmail = async () => {
    try {
      setResending(true);
      setError("");
      const response = await resendVerification();
      setSuccess(response.message || "A new verification email has been sent.");
      await refreshUser();
    } catch (requestError) {
      // A stale browser session can still think email verification is pending
      // even after the server has already marked it verified. Refresh first.
      const refreshed = await refreshUser();
      if (refreshed?.emailVerified) {
        setError("");
        setSuccess("Your email is already verified. You can now submit your business verification documents.");
        return;
      }

      setError(
        requestError.response?.data?.message ||
          "Failed to resend verification email.",
      );
    } finally {
      setResending(false);
    }
  };

  const status = verification?.status || user?.kycStatus || "pending";

  return (
    <div className="pro-page min-h-screen bg-[#F7F9FB] px-4 sm:px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="text-sm text-[#5AC361] hover:underline mb-2"
            >
              ← Back to Home
            </button>
            <h1
              className="text-3xl font-bold text-[#0F1923]"
            >
              Account Verification
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Verify your business before using EPR Nexuss trading services.
            </p>
          </div>
          <Badge
            label={
              status === "approved"
                ? "Verified"
                : status === "rejected"
                  ? "Rejected"
                  : "Pending Verification"
            }
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#991B1B]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-[#EBF8EC] border border-[#A5D6A7] px-4 py-3 text-sm text-[#2E7D32] break-words">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1 p-5">
            <h2 className="font-semibold text-[#0F1923] mb-4">Your Account</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-[#9CA3AF]">Name</p>
                <p className="font-medium text-[#374151]">
                  {user?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Email</p>
                <p className="font-medium text-[#374151] break-all">
                  {user?.email || "—"}
                </p>
                <p
                  className={`text-xs mt-1 ${user?.emailVerified ? "text-[#2E7D32]" : "text-[#92400E]"}`}
                >
                  {user?.emailVerified
                    ? "Email verified"
                    : "Email verification pending"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Phone</p>
                <p className="font-medium text-[#374151]">
                  {user?.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">Account Type</p>
                <p className="font-medium text-[#374151] capitalize">
                  {user?.role || "—"}
                </p>
              </div>
            </div>

            {!user?.emailVerified && (
              <Button
                variant="outline"
                className="w-full mt-5"
                onClick={resendEmail}
                disabled={resending}
              >
                {resending ? "Sending..." : "Resend Verification Email"}
              </Button>
            )}
          </Card>

          <Card className="lg:col-span-2 p-6">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#6B7280]">
                Loading verification status...
              </div>
            ) : status === "approved" ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#EBF8EC] text-[#2E7D32] flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#0F1923]">
                  Verification Approved
                </h2>
                <p className="text-sm text-[#6B7280] mt-2 max-w-md mx-auto">
                  Your account is verified and full marketplace functionality is
                  unlocked.
                </p>
                <Button className="mt-6" onClick={() => onNavigate("home")}>
                  Go to Marketplace
                </Button>
              </div>
            ) : status === "pending" && verification ? (
              <div className="py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[#FFFBEB] text-[#92400E] flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#0F1923]">
                  Verification Under Review
                </h2>
                <p className="text-sm text-[#6B7280] mt-2 max-w-md mx-auto">
                  Your verification document is complete and has been sent to
                  the EPR Nexuss admin team. Please wait for approval.
                </p>
                <div className="mt-5 text-left max-w-md mx-auto bg-[#F7F9FB] rounded-xl border border-[#E5EAF0] p-4">
                  <p className="text-xs text-[#9CA3AF]">Company</p>
                  <p className="text-sm font-medium text-[#374151]">
                    {verification.companyName}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-3">Submitted</p>
                  <p className="text-sm text-[#374151]">
                    {new Date(verification.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[#0F1923]">
                    Submit Verification
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {status === "rejected"
                      ? "Your previous submission was rejected. You can correct the information and upload a new document without creating another account."
                      : "Provide your business details and a clear screenshot of your CPCB portal profile for admin review."}
                  </p>
                </div>

                {status === "rejected" && verification?.rejectionReason && (
                  <div className="mb-5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#991B1B]">
                      Admin Rejection Reason
                    </p>
                    <p className="text-sm text-[#7F1D1D] mt-1">
                      {verification.rejectionReason}
                    </p>
                  </div>
                )}

                {!user?.emailVerified ? (
                  <div className="rounded-xl bg-[#FFFBEB] border border-[#FCD34D] p-4">
                    <p className="font-semibold text-[#92400E]">
                      Verify your email first
                    </p>
                    <p className="text-sm text-[#92400E] mt-1">
                      Once your email is verified, return here to submit your
                      business verification documents.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={resendEmail}
                      disabled={resending}
                    >
                      {resending ? "Sending..." : "Resend Verification Email"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <Input
                      label="Business / Company Name *"
                      placeholder="Registered company name"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                    />

                    <div>
                      <label className="text-sm font-medium text-[#374151] block mb-1">
                        CPCB Portal Profile Screenshot *
                      </label>
                      <label className="block border-2 border-dashed border-[#E5EAF0] rounded-xl p-7 text-center cursor-pointer hover:border-[#5AC361] transition-colors">
                        <svg
                          className="w-9 h-9 text-[#9CA3AF] mx-auto mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16l4-4 3 3 4-5 5 6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm text-[#374151] font-medium">
                          {file?.name ||
                            "Upload CPCB portal profile screenshot"}
                        </p>
                        <p className="text-xs text-[#9CA3AF] mt-1">
                          JPG, PNG or WEBP · maximum 10 MB
                        </p>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(event) =>
                            setFile(event.target.files?.[0] || null)
                          }
                        />
                      </label>
                    </div>

                    <Button
                      className="w-full"
                      disabled={submitting}
                      onClick={submit}
                    >
                      {submitting
                        ? "Submitting..."
                        : status === "rejected"
                          ? "Re-submit for Verification"
                          : "Submit for Verification"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export { VerificationPage as default };
