import { useState } from "react";
const badgeStyles = {
  verified: "bg-[#EBF8EC] text-[#2E7D32] border-[#A5D6A7]",
  active: "bg-[#EBF8EC] text-[#2E7D32] border-[#A5D6A7]",
  pending: "bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]",
  rejected: "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]",
  discussion: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  open: "bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]",
  closed: "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]",
  new: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  matched: "bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]",
  completed: "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]",
  payment: "bg-[#FFF7ED] text-[#92400E] border-[#FED7AA]",
};

const badgeLabels = {
  Active: "active",
  Verified: "verified",
  "Pending Verification": "pending",
  Pending: "pending",
  Rejected: "rejected",
  "In Discussion": "discussion",
  Open: "open",
  Closed: "closed",
  New: "new",
  "In Review": "pending",
  Negotiating: "discussion",
  "Terms Agreed": "matched",
  Matched: "matched",
  Completed: "completed",
  "Payment Coordination": "payment",
};

function Badge({ label, variant }) {
  const v = variant ?? badgeLabels[label] ?? "closed";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${badgeStyles[v] ?? badgeStyles.closed}`}
    >
      {(v === "verified" || v === "active") && (
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3L5 8.5 2 5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

const btnVariants = {
  primary:
    "rounded-lg bg-gradient-to-b from-[#63CB6A] to-[#3EA646] text-white shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.04)] hover:shadow-[0_6px_16px_rgba(62,166,70,0.28)] hover:brightness-[1.03]",
  secondary: "rounded-lg bg-[#F0F4F8] text-[#344054] hover:bg-[#E6EBF1]",
  outline:
    "rounded-lg border border-[#DCE3EA] bg-white text-[#344054] shadow-sm hover:border-[#C8D1DB] hover:bg-[#F8FAFC]",
  ghost: "rounded-lg text-[#475467] hover:bg-[#F0F4F8] hover:text-[#1F2937]",
  danger:
    "rounded-lg bg-gradient-to-b from-[#F97066] to-[#DC2626] text-white shadow-sm hover:shadow-[0_6px_16px_rgba(220,38,38,0.28)] hover:brightness-[1.03]",
};

const btnSizes = {
  xs: "px-2.5 py-1.5 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`ui-button ${btnBase} ${btnVariants[variant] ?? btnVariants.primary} ${btnSizes[size] ?? btnSizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "", interactive = false, ...props }) {
  return (
    <div
      className={`ui-card rounded-xl border border-[#E5EAF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] ${
        interactive
          ? "transition-all duration-150 hover:-translate-y-px hover:border-[#D5DEE7] hover:shadow-[0_6px_18px_rgba(16,24,40,0.06)]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <div
      className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#101828] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#667085]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, description, action, className = "" }) {
  return (
    <div
      className={`mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-semibold tracking-[-0.01em] text-[#101828]">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-[#667085]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Input({ label, error, hint, className = "", id, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-[#344054]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`min-h-10 rounded-lg border bg-white px-3 py-2 text-sm text-[#101828] shadow-sm outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#5AC361] focus:ring-4 focus:ring-[#5AC361]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3] ${error ? "border-[#F04438] focus:border-[#F04438] focus:ring-[#F04438]/10" : "border-[#DCE3EA]"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <span className="text-xs font-medium text-[#D92D20]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[#667085]">{hint}</span>
      ) : null}
    </div>
  );
}

function Select({
  label,
  options,
  placeholder,
  error,
  hint,
  className = "",
  id,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-[#344054]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`min-h-10 rounded-lg border bg-white px-3 py-2 text-sm text-[#101828] shadow-sm outline-none transition-all focus:border-[#5AC361] focus:ring-4 focus:ring-[#5AC361]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] ${error ? "border-[#F04438]" : "border-[#DCE3EA]"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="text-xs font-medium text-[#D92D20]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[#667085]">{hint}</span>
      ) : null}
    </div>
  );
}

function Textarea({
  label,
  error,
  hint,
  className = "",
  id,
  rows = 3,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-[#344054]">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className={`rounded-lg border bg-white px-3 py-2 text-sm text-[#101828] shadow-sm outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#5AC361] focus:ring-4 focus:ring-[#5AC361]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3] ${error ? "border-[#F04438] focus:border-[#F04438] focus:ring-[#F04438]/10" : "border-[#DCE3EA]"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <span className="text-xs font-medium text-[#D92D20]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[#667085]">{hint}</span>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, icon, accent, description, className = "" }) {
  return (
    <Card className={`p-4 sm:p-5 ${className}`}>
      <div className="flex items-start gap-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-[#EBF8EC] text-[#3EA646]" : "bg-[#F2F4F7] text-[#667085]"}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            {label}
          </p>
          <p className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#101828]">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-[#667085]">
              {description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Table({ headers, children, className = "" }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5EAF0] bg-[#F8FAFC]">
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#667085]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0F4F8]">{children}</tbody>
      </table>
    </div>
  );
}

function Tr({ children, className = "" }) {
  return (
    <tr className={`transition-colors hover:bg-[#FAFBFC] ${className}`}>
      {children}
    </tr>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3.5 text-[#344054] ${className}`}>{children}</td>
  );
}

function ConfidentialityBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span className="leading-5">
        Contact details are hidden. All communication is routed through EPR
        Nexus.
      </span>
    </div>
  );
}

function CreditTypeIcon({ type }) {
  const icons = {
    Battery: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 10h-1V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2v-3h1"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12h4" />
      </svg>
    ),
    Plastic: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
        />
      </svg>
    ),
    "E-Waste": (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
        />
      </svg>
    ),
    ELV: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    "Used Oil": (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      </svg>
    ),
    Tyre: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
      </svg>
    ),
  };

  return <>{icons[type] ?? icons.Battery}</>;
}

// Distinct accent per credit category so listing cards, deal rows and
// tables read at a glance instead of everything sharing one brand color.
const creditTypeAccents = {
  Battery: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
  Plastic: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  "E-Waste": "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
  ELV: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  "Used Oil": "bg-orange-50 text-orange-600 ring-1 ring-orange-100",
  Tyre: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
};

const creditAvatarSizes = {
  sm: "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
  md: "h-10 w-10 [&_svg]:h-5 [&_svg]:w-5",
  lg: "h-12 w-12 [&_svg]:h-6 [&_svg]:w-6",
  xl: "h-14 w-14 [&_svg]:h-7 [&_svg]:w-7",
};

function CreditTypeAvatar({ type, size = "md", className = "" }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${creditAvatarSizes[size] ?? creditAvatarSizes.md} ${creditTypeAccents[type] ?? "bg-[#EDF8EF] text-[#3E9C45] ring-1 ring-[#d4efd6]"} ${className}`}
    >
      <CreditTypeIcon type={type} />
    </div>
  );
}

const PASSWORD_RULES = [
  { key: "length", label: "8+ characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

const EyeIcon = ({ off }) => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
    {off ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.336M6.228 6.228A10.451 10.451 0 001.935 12.5C3.226 16.836 7.244 20 12 20a9.46 9.46 0 004.362-1.048" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    )}
  </svg>
);

function PasswordInput({
  label,
  error,
  hint,
  className = "",
  id,
  showStrength = false,
  value = "",
  ...props
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-[#344054]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          value={value}
          type={visible ? "text" : "password"}
          className={`min-h-10 w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm text-[#101828] shadow-sm outline-none transition-all placeholder:text-[#98A2B3] focus:border-[#5AC361] focus:ring-4 focus:ring-[#5AC361]/10 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3] ${error ? "border-[#F04438] focus:border-[#F04438] focus:ring-[#F04438]/10" : "border-[#DCE3EA]"} ${className}`}
          aria-invalid={Boolean(error)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#98A2B3] transition-colors hover:bg-[#F2F4F7] hover:text-[#475467] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361]"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
      {showStrength && value ? (
        <div className="mt-0.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PASSWORD_RULES.map((rule) => {
            const pass = rule.test(value);
            return (
              <div
                key={rule.key}
                className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${pass ? "text-[#2E7D32]" : "text-[#98A2B3]"}`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors ${pass ? "bg-[#2E7D32] text-white" : "bg-[#E4E7EC] text-transparent"}`}
                >
                  <svg className="h-2 w-2" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {rule.label}
              </div>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <span className="text-xs font-medium text-[#D92D20]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[#667085]">{hint}</span>
      ) : null}
    </div>
  );
}

function DashboardShell({
  nav,
  active,
  onActiveChange,
  onNavigate,
  titleFallback = "Dashboard",
  roleLabel,
  displayName,
  secondaryText,
  initial,
  badges = {},
  actions,
  children,
  variant = "light",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dark = variant === "dark";
  const activeItem = nav.find((item) => item.id === active);
  const sidebarClasses = dark
    ? "!bg-[#0F1923] !border-white/10 !text-white"
    : "bg-white border-[#E5EAF0] text-[#0F1923]";

  const closeSidebar = () => setSidebarOpen(false);
  const handleActiveChange = (id) => {
    onActiveChange(id);
    closeSidebar();
  };

  return (
    <div
      className={`dashboard-shell min-h-screen flex ${dark ? "bg-[#F7F9FB]" : "bg-[#F7F9FB]"}`}
    >
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r shadow-[8px_0_24px_rgba(15,25,35,0.04)] transition-transform duration-200 md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarClasses}`}
        aria-label={`${roleLabel || "Application"} navigation`}
        style={dark ? { backgroundColor: "#0F1923", color: "#FFFFFF" } : undefined}
      >
        <div
          className={`flex h-[72px] items-center gap-3 border-b px-5 ${dark ? "border-white/10" : "border-[#E5EAF0]"}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5AC361] shadow-[0_4px_12px_rgba(90,195,97,0.20)]">
            <svg
              className="h-4.5 w-4.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p
              className={`font-heading text-sm font-bold leading-none ${dark ? "text-white" : "text-[#0F1923]"}`}
            >
              EPR Nexuss
            </p>
            <p
              className={`mt-1 text-[10px] leading-none ${dark ? "text-white/45" : "text-[#8A94A3]"}`}
            >
              {roleLabel || "Portal"}
            </p>
          </div>
        </div>

        <div
          className={`border-b px-5 py-4 ${dark ? "border-white/10" : "border-[#E5EAF0]"}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${dark ? "bg-[#5AC361] text-white" : "bg-[#EBF8EC] text-[#3EA646]"}`}
            >
              {initial || "?"}
            </div>
            <div className="min-w-0">
              <p
                className={`truncate text-xs font-semibold ${dark ? "text-white" : "text-[#344054]"}`}
              >
                {displayName || "Account"}
              </p>
              <p
                className={`mt-0.5 truncate text-[10px] ${dark ? "text-white/40" : "text-[#98A2B3]"}`}
              >
                {secondaryText || roleLabel || "Account"}
              </p>
            </div>
          </div>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 py-4"
          aria-label="Dashboard sections"
        >
          <p
            className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? "text-white/30" : "text-[#98A2B3]"}`}
          >
            Workspace
          </p>
          <div className="space-y-1">
            {nav.map((item) => {
              const count = Number(badges[item.id] || 0);
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleActiveChange(item.id)}
                  className={`dashboard-nav-item group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${isActive ? "is-active" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-1 ${
                    isActive
                      ? dark
                        ? "!bg-[#5AC361] !text-white shadow-sm"
                        : "bg-[#EBF8EC] text-[#26702B]"
                      : dark
                        ? "!text-white/60 hover:!bg-white/10 hover:!text-white"
                        : "text-[#667085] hover:bg-[#F7F9FB] hover:text-[#1F2937]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? (dark ? "bg-white/15" : "bg-white") : dark ? "bg-white/5" : "bg-[#F7F9FB]"}`}
                    >
                      {item.icon || (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {count > 0 && (
                    <span
                      className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? (dark ? "bg-white/20 text-white" : "bg-white text-[#26702B]") : "bg-[#EF4444] text-white"}`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div
          className={`border-t p-3 ${dark ? "border-white/10" : "border-[#E5EAF0]"}`}
        >
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] ${dark ? "text-white/50 hover:bg-white/10 hover:text-white" : "text-[#667085] hover:bg-[#F7F9FB] hover:text-[#1F2937]"}`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-current/5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.7}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </span>
            Back to Home
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[#0F1923]/40 backdrop-blur-[1px] md:hidden"
          onClick={closeSidebar}
        />
      )}

      <main className="dashboard-main min-w-0 flex-1 md:ml-[252px]">
        <header className="dashboard-header sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#E5EAF0] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#1F2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
                {roleLabel || "Workspace"}
              </p>
              <h1 className="truncate font-heading text-lg font-semibold tracking-[-0.015em] text-[#101828]">
                {activeItem?.label || titleFallback}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {actions}
          </div>
        </header>
        <div className="dashboard-content px-4 py-6 sm:px-6 sm:py-7 lg:px-8">{children}</div>
      </main>
    </div>
  );
}


function PromptModal({
  open,
  title = "Enter a reason",
  description = "Provide a short reason to continue.",
  value,
  onChange,
  onCancel,
  onConfirm,
  confirmLabel = "Continue",
  placeholder = "Enter reason...",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#101828]/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E4E9EE] bg-white shadow-[0_24px_70px_rgba(16,24,40,0.18)]">
        <div className="border-b border-[#E4E9EE] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
                Confirmation required
              </p>
              <h3 className="mt-1 font-heading text-lg font-semibold text-[#101828]">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-[#667085]">{description}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-2 text-[#667085] transition-colors hover:bg-[#F2F4F7] hover:text-[#344054]"
              aria-label="Close"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-5">
          <textarea
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full resize-none rounded-xl border border-[#D0D5DD] bg-white px-3.5 py-3 text-sm text-[#344054] outline-none transition focus:border-[#5AC361] focus:ring-3 focus:ring-[#5AC361]/10"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={onConfirm} disabled={!String(value || "").trim()}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E5EAF0] bg-[#F8FAFC] text-[#98A2B3]">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <div>
        <p className="font-heading font-semibold text-[#344054]">{title}</p>
        <p className="mt-1 max-w-md text-sm leading-5 text-[#667085]">{desc}</p>
      </div>
      {action}
    </div>
  );
}

export {
  Badge,
  DashboardShell,
  Button,
  Card,
  ConfidentialityBanner,
  CreditTypeAvatar,
  CreditTypeIcon,
  EmptyState,
  Input,
  PageHeader,
  PasswordInput,
  PromptModal,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Td,
  Textarea,
  Tr,
};
