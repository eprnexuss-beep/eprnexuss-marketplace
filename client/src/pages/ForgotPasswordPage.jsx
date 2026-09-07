import { useState } from "react";

import { Button, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

function ForgotPasswordPage({ onNavigate }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await forgotPassword(normalizedEmail);
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to process your request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#5AC361] text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM4 20a8 8 0 0116 0M17 11l2 2 3-3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0F1923]">Reset your password</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Enter the email associated with your EPR Nexuss account.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
              {error}
            </div>
          )}

          {!submitted ? (
            <>
              <Input
                label="Email Address *"
                type="email"
                placeholder="work@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSubmit();
                }}
              />

              <Button className="mt-4 w-full" disabled={loading} onClick={handleSubmit}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF8EC] text-[#2E7D32]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#0F1923]">Check your email</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                If an account with that email exists, we&apos;ve sent a password reset link. The link expires in 1 hour.
              </p>

              <button
                type="button"
                className="mt-5 text-sm font-medium text-[#2E7D32] hover:underline"
                onClick={() => {
                  setSubmitted(false);
                }}
              >
                Try another email
              </button>
            </div>
          )}

          <div className="mt-5 border-t border-[#E5EAF0] pt-4 text-center">
            <button
              type="button"
              className="text-sm font-medium text-[#2E7D32] hover:underline"
              onClick={() => onNavigate("auth")}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
