// Shared password rules used by PasswordInput's strength meter and by every
// signup/reset form, so the UI hint and the actual validation can never
// drift apart.
export const PASSWORD_RULES = [
  { key: "length", label: "8+ characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function validatePassword(password) {
  const value = String(password || "");
  if (!value) return "Please create a password.";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  if (!failed) return "";
  if (failed.key === "length") return "Password must be at least 8 characters long.";
  if (failed.key === "upper") return "Password must include at least one uppercase letter.";
  if (failed.key === "number") return "Password must include at least one number.";
  return "Password must include at least one special character.";
}
