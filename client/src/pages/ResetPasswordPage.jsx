import { useEffect, useState } from "react";

import { Button, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext.jsx";

function ResetPasswordPage({ token, onNavigate }) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError("This password reset link is missing a token.");
  }, [token]);

  const handleSubmit = async () => {
    if (!token) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await resetPassword(token, password);
      setSuccess(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to reset your password. Please request a new link.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-[#0F1923]">Create a new password</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Choose a new password for your EPR Nexuss account.</p>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF8EC] text-[#2E7D32]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#0F1923]">Password reset successful</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">Your password has been changed. You can now sign in with your new password.</p>
              <Button className="mt-5 w-full" onClick={() => onNavigate("auth")}>Back to Sign In</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="New Password *"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                label="Confirm New Password *"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <p className="text-xs text-[#6B7280]">Use at least 8 characters. Your reset link can only be used once and expires after 1 hour.</p>
              <Button className="w-full" disabled={loading || !token} onClick={handleSubmit}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <button type="button" className="w-full text-sm font-medium text-[#2E7D32] hover:underline" onClick={() => onNavigate("auth")}>
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
