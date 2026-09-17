import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Input, PasswordInput } from "../components/ui";
import { validatePassword } from "../utils/password";
import { useAuth } from "../context/AuthContext.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Google Identity Services should be initialized only once per page. React
// StrictMode can run effects twice in development, which otherwise triggers
// the GSI "initialize() is called multiple times" warning.
let googleInitialized = false;
let googleCredentialHandler = null;

function GoogleButton({ onCredential, disabled }) {
  const containerRef = useRef(null);
  const handlerRef = useRef(onCredential);

  useEffect(() => {
    handlerRef.current = onCredential;
    googleCredentialHandler = onCredential;

    return () => {
      if (googleCredentialHandler === onCredential) {
        googleCredentialHandler = null;
      }
    };
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return undefined;

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) {
        return;
      }

      containerRef.current.innerHTML = "";

      if (!googleInitialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) =>
            googleCredentialHandler?.(response.credential),
        });
        googleInitialized = true;
      }

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: 360,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return undefined;
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    const script = existingScript || document.createElement("script");

    if (!existingScript) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", renderGoogleButton);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="text-xs text-[#92400E] bg-[#FFFBEB] border border-[#FCD34D] rounded-lg px-3 py-2 text-center">
        Google Sign-In is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the
        client .env.
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div ref={containerRef} />
    </div>
  );
}

function AuthPage({ onNavigate, initialMode = "login" }) {
  const navigate = useNavigate();
  const { login, register, googleLogin, startSignupSession } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState("buyer");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleSignupNotice, setGoogleSignupNotice] = useState(false);

  const handleManualLogin = async () => {
    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await login(form.email, form.password, role);

      const destination =
        response?.user?.role === "admin"
          ? "admin-dashboard"
          : response?.user?.role === "seller"
            ? "seller-dashboard"
            : "buyer-dashboard";

      onNavigate(destination, undefined, response?.user);
    } catch (requestError) {
      const responseData = requestError.response?.data;

      if (responseData?.code === "EMAIL_VERIFICATION_REQUIRED") {
        startSignupSession(responseData);

        sessionStorage.setItem(
          "signupPendingNotice",
          JSON.stringify({
            email: responseData.email,
            name: responseData.name,
            role: responseData.role,
            emailVerificationSent: false,
          }),
        );

        onNavigate("email-pending");
        return;
      }

      setError(
        responseData?.message ||
          "Unable to sign in. Please check your details.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSignup = async () => {
    if (!form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      });

      sessionStorage.setItem(
        "signupPendingNotice",
        JSON.stringify({
          email: response.email,
          name: response.name,
          role: response.role,
          emailVerificationSent: response.emailVerificationSent,
        }),
      );

      onNavigate("email-pending");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (loading) return;

    try {
      setLoading(true);
      setError("");

      const response = await googleLogin({ credential });

      if (response.needsSignup) {
        setGoogleSignupNotice(true);
        return;
      }

      if (response.needsPhone) {
        onNavigate("google-signup-phone");
        return;
      }

      onNavigate("home");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Google authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setGoogleSignupNotice(false);
    setForm({
      name: "",
      phone: "",
      email: "",
      password: "",
    });

    // Keep the URL in sync with the selected auth mode.
    // This fixes Login → Sign Up while preserving the existing form behavior.
    navigate(nextMode === "signup" ? "/signup" : "/login");
  };

  return (
    <div className="pro-page relative min-h-screen overflow-hidden bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "var(--brand-gradient)" }}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl brand-gradient shadow-[0_6px_16px_rgba(47,163,68,0.28)] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <span
              className="text-xl font-bold text-[#0F1923]"
            >
              EPR Nexuss
            </span>
          </div>

          <h1
            className="text-2xl font-bold text-[#0F1923]"
          >
            {mode === "login"
              ? "Sign In to Your Account"
              : "Create Your EPR Nexuss Account"}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {mode === "login"
              ? "Access your EPR Nexuss dashboard"
              : "Create your account first. Email verification is required before login."}
          </p>
        </div>

        <div className="animate-card-in bg-white border border-[#E5EAF0] rounded-2xl p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <div className="flex gap-2 mb-5 p-1 bg-[#F0F4F8] rounded-xl">
            {[
              ["buyer", "Buyer"],
              ["seller", "Seller"],
              ...(mode === "login" ? [["admin", "Admin"]] : []),
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  role === value
                    ? "bg-white shadow-sm text-[#0F1923] font-semibold"
                    : "text-[#6B7280]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-sm text-[#991B1B]">
              {error}
            </div>
          )}

          {mode === "signup" && (
            <div className="mb-5 rounded-xl bg-[#F7F9FB] border border-[#E5EAF0] p-3 text-xs text-[#6B7280]">
              <span className="font-semibold text-[#374151]">
                What happens next?
              </span>{" "}
              Create account → verify your email → sign in → submit company/CPCB
              proof → wait for admin approval.
            </div>
          )}

          <div className="space-y-4">
            {mode === "signup" && (
              <Input
                label="Full Name *"
                placeholder="Your full name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            )}

            {mode === "signup" && (
              <Input
                label="Phone Number *"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
              />
            )}

            <Input
              label="Email Address *"
              type="email"
              placeholder="work@company.com"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />

            <PasswordInput
              label="Password *"
              placeholder={
                mode === "signup"
                  ? "8+ characters, 1 uppercase, 1 number, 1 symbol"
                  : "Enter your password"
              }
              value={form.password}
              showStrength={mode === "signup"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />

            {mode === "login" && (
              <div className="-mt-1 text-right">
                <button
                  type="button"
                  className="text-sm font-medium text-[#2E7D32] hover:underline"
                  onClick={() => onNavigate("forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              className="w-full"
              disabled={loading}
              onClick={
                mode === "login" ? handleManualLogin : handleManualSignup
              }
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </div>

          {role !== "admin" && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-[#E5EAF0]" />
                <span className="text-xs text-[#9CA3AF]">
                  OR CONTINUE WITH GOOGLE
                </span>
                <div className="h-px flex-1 bg-[#E5EAF0]" />
              </div>

              {mode === "login" && (
                <p className="text-xs text-[#6B7280] text-center mb-3">
                  Existing Google users sign in immediately. New Google users
                  will be asked to complete signup.
                </p>
              )}

              {mode === "signup" && (
                <p className="text-xs text-[#6B7280] text-center mb-3">
                  Already have a Google account? Use Google to sign in. If it is
                  new, EPR Nexuss will guide you through signup and ask for your
                  phone number on the next screen.
                </p>
              )}

              <GoogleButton
                disabled={loading}
                onCredential={handleGoogleCredential}
              />
            </>
          )}

          <div className="mt-5 pt-4 border-t border-[#E5EAF0] text-center text-sm text-[#6B7280]">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-[#5AC361] font-medium hover:underline"
                  onClick={() => switchMode("signup")}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-[#5AC361] font-medium hover:underline"
                  onClick={() => switchMode("login")}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-[#9CA3AF] text-center mt-4 leading-relaxed">
          By continuing, you agree to the EPR Nexuss Terms of Service and Privacy
          Policy.
        </p>
      </div>

      {googleSignupNotice && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="w-12 h-12 rounded-full bg-[#EBF8EC] text-[#2E7D32] flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
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
            </div>
            <h2 className="text-xl font-bold text-[#0F1923]">
              New Google account
            </h2>
            <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
              This Google account is not registered with EPR Nexuss yet. Please
              sign up to create your account. Your Google name and email will be
              used automatically.
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setGoogleSignupNotice(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setGoogleSignupNotice(false);
                  onNavigate("google-signup-phone");
                }}
              >
                Continue Signup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { AuthPage as default };
