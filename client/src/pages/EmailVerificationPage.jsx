import { useEffect, useState } from "react";
import api from "../services/api.js";
import { Button } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

// Keep one in-flight verification request per token. This prevents React
// StrictMode from issuing two one-time verification requests in development.
const verificationRequests = new Map();

const getVerificationRequest = (token) => {
  if (!verificationRequests.has(token)) {
    const request = api.get(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
    ).finally(() => {
      verificationRequests.delete(token);
    });

    verificationRequests.set(token, request);
  }

  return verificationRequests.get(token);
};

function EmailVerificationPage({ token, onNavigate }) {
  const { loginFromEmailVerification } = useAuth();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email address...");
  
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("This verification link is missing or invalid.");
        return;
      }

      try {
        /*
         * IMPORTANT: React StrictMode runs effects twice in development.
         * The backend verification token is intentionally one-time-use.
         * We therefore share the in-flight request for the same token instead
         * of making a second request and accidentally consuming the token twice.
         */
        const response = await getVerificationRequest(token);

        if (cancelled) return;

        if (response.data.success) {
          loginFromEmailVerification(response.data);
          setStatus("success");
          setMessage(response.data.message);
          return;
        }

        setStatus("error");
        setMessage(
          response.data.message ||
            "This verification link is invalid or has expired.",
        );
      } catch (error) {
        if (cancelled) return;

        setStatus("error");
        setMessage(
          error.response?.data?.message ||
            "This verification link is invalid or has expired.",
        );
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div className="bg-white border border-[#E5EAF0] rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            status === "success"
              ? "bg-[#EBF8EC] text-[#2E7D32]"
              : status === "error"
                ? "bg-[#FEF2F2] text-[#991B1B]"
                : "bg-[#F0F4F8] text-[#5AC361]"
          }`}
        >
          {status === "verifying" ? (
            <div className="w-7 h-7 border-2 border-[#CBD5E1] border-t-[#5AC361] rounded-full animate-spin" />
          ) : status === "success" ? (
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-[#0F1923]">
          {status === "verifying"
            ? "Verifying Email"
            : status === "success"
              ? "Email Verified"
              : "Verification Failed"}
        </h1>

        <p className="text-sm text-[#6B7280] mt-3 leading-relaxed">
          {message}
        </p>

        {status !== "verifying" && (
          <Button
            className="mt-6 w-full"
            onClick={() => onNavigate("home")}
          >
            {status === "success" ? "Continue to EPR Nexuss" : "Back to Login"}
          </Button>
        )}
      </div>
    </div>
  );
}

export { EmailVerificationPage as default };
