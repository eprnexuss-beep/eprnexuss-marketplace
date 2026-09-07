import { useEffect, useState } from "react";
import { Button, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

function SignupEmailPendingPage({ onNavigate }) {
  const {
    signupSession,
    resendSignupVerification,
    changeSignupEmail,
  } = useAuth();

  const [email, setEmail] = useState(signupSession?.email || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(signupSession?.email || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasSentVerification, setHasSentVerification] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("signupPendingNotice");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setEmail(parsed.email || signupSession?.email || "");
      setNewEmail(parsed.email || signupSession?.email || "");
      setHasSentVerification(Boolean(parsed.emailVerificationSent));
    } catch {
      // Ignore malformed signup session data.
    }
  }, [signupSession]);

  const resend = async () => {
    try {
      setResending(true);
      setError("");
      setSuccess("");
      const response = await resendSignupVerification();
      setSuccess(response.message || "A verification email has been sent.");
      setHasSentVerification(true);
      sessionStorage.setItem(
        "signupPendingNotice",
        JSON.stringify({
          email,
          emailVerificationSent: true,
        }),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to resend the verification email.",
      );
    } finally {
      setResending(false);
    }
  };

  const saveEmail = async () => {
    if (!newEmail.trim()) {
      setError("Please enter your new email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const response = await changeSignupEmail(newEmail.trim());
      setEmail(response.email);
      setNewEmail(response.email);
      setEditingEmail(false);
      setSuccess(response.message || "Email updated. You can now send a verification email.");
      setHasSentVerification(false);
      sessionStorage.setItem(
        "signupPendingNotice",
        JSON.stringify({
          email: response.email,
          emailVerificationSent: false,
        }),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to change your email address.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-[#E5EAF0] rounded-2xl shadow-sm p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EBF8EC] text-[#2E7D32] flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#0F1923]">
            Verify your email address
          </h1>
          <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
            Your account is ready, but your email address must be verified
            before you can sign in. Use the button below to send a fresh
            verification link to this address.
          </p>

          <div className="mt-6 rounded-xl bg-[#F7F9FB] border border-[#E5EAF0] p-4 text-left">
            <p className="text-xs text-[#9CA3AF]">Email address to verify</p>
            <p className="text-base font-semibold text-[#374151] break-all mt-1">
              {email || "your email address"}
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#991B1B] text-left">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl bg-[#EBF8EC] border border-[#A5D6A7] px-4 py-3 text-sm text-[#2E7D32] text-left">
              {success}
            </div>
          )}

          {editingEmail ? (
            <div className="mt-5 text-left">
              <Input
                label="Correct Email Address"
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingEmail(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveEmail}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Email"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditingEmail(true);
                  setNewEmail(email);
                  setError("");
                }}
              >
                Edit Email
              </Button>
              <Button
                className="flex-1"
                onClick={resend}
                disabled={resending}
              >
                {resending
                  ? "Sending..."
                  : hasSentVerification
                    ? "Resend Verification Email"
                    : "Send Verification Email"}
              </Button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-[#E5EAF0] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onNavigate("auth")}
              className="text-sm text-[#5AC361] font-medium hover:underline"
            >
              Go to Login
            </button>
            <p className="text-xs text-[#9CA3AF]">
              After verification, your account will be able to sign in. Business
              trading services still require admin verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SignupEmailPendingPage as default };
