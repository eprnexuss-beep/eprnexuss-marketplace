import { useState } from "react";
import { Button, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

function GoogleSignupPhonePage({ onNavigate }) {
  const {
    pendingGoogleSignup,
    completeGoogleSignup,
    setPendingGoogleSignup,
  } = useAuth();

  const [role, setRole] = useState("buyer");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!pendingGoogleSignup?.profile) {
    return (
      <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4">
        <div className="bg-white border border-[#E5EAF0] rounded-2xl shadow-sm p-7 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#0F1923]">
            Google signup session expired
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">
            Please start Google signup again from the login page.
          </p>
          <Button className="mt-6" onClick={() => onNavigate("auth")}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await completeGoogleSignup({
        role,
        phone: phone.trim(),
      });

      onNavigate("home");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to complete Google signup.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => {
            setPendingGoogleSignup(null);
            onNavigate("auth");
          }}
          className="text-sm text-[#5AC361] hover:underline mb-4"
        >
          ← Back to Sign In
        </button>

        <div className="bg-white border border-[#E5EAF0] rounded-2xl p-7 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#F0F4F8] flex items-center justify-center mb-4 text-lg font-bold text-[#374151]">
            {pendingGoogleSignup.profile.name?.charAt(0)?.toUpperCase() || "G"}
          </div>

          <h1 className="text-2xl font-bold text-[#0F1923]">
            Finish your Google signup
          </h1>
          <p className="text-sm text-[#6B7280] mt-2">
            Google has already provided your name and verified email. We only
            need your phone number and account type to create your EPR Nexuss
            profile.
          </p>

          <div className="mt-5 rounded-xl bg-[#F7F9FB] border border-[#E5EAF0] p-4">
            <p className="text-xs text-[#9CA3AF]">Name</p>
            <p className="text-sm font-semibold text-[#374151]">
              {pendingGoogleSignup.profile.name}
            </p>
            <p className="text-xs text-[#9CA3AF] mt-3">Google email</p>
            <p className="text-sm font-semibold text-[#374151] break-all">
              {pendingGoogleSignup.profile.email}
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-3 py-2 text-sm text-[#991B1B]">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[#374151] mb-2">
                Account Type *
              </p>
              <div className="flex gap-2 p-1 bg-[#F0F4F8] rounded-xl">
                {[
                  ["buyer", "Buyer"],
                  ["seller", "Seller"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setRole(value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      role === value
                        ? "bg-white shadow-sm text-[#0F1923] font-semibold"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Phone Number *"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            <Button
              className="w-full"
              disabled={loading}
              onClick={submit}
            >
              {loading ? "Creating Account..." : "Complete Signup"}
            </Button>
          </div>

          <p className="text-xs text-[#9CA3AF] mt-5 leading-relaxed text-center">
            Your Google email is already verified, so no separate email
            verification step is required.
          </p>
        </div>
      </div>
    </div>
  );
}

export { GoogleSignupPhonePage as default };
