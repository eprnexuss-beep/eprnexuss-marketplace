import { useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import MarketplacePage from "./pages/MarketplacePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import AboutUsPage from "./pages/AboutUsPage";
import ContactUsPage from "./pages/ContactUsPage";
import CreditDetailPage from "./pages/CreditDetailPage";
import AuthPage from "./pages/AuthPage";
import SellerDashboard from "./pages/SellerDashboard";
import BuyerDashboard from "./pages/BuyerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AddListingPage from "./pages/AddListingPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";
import SignupEmailPendingPage from "./pages/SignupEmailPendingPage";
import GoogleSignupPhonePage from "./pages/GoogleSignupPhonePage";
import VerificationPage from "./pages/VerificationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuth } from "./context/AuthContext.jsx";
import {
  NotificationBell,
  ProfileMenu,
  AdminProfileMenu,
} from "./components/AccountTools.jsx";
import logo from "../public/logo.jpeg";

const DASHBOARD_PATHS = [
  "/seller",
  "/buyer",
  "/admin",
  "/seller/listings/new",
  "/verification",
];

const getDashboardPathForRole = (role) => {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  if (role === "buyer") return "/buyer";
  return "/login";
};

const getPageKey = (pathname) => {
  if (pathname === "/marketplace" || pathname === "/epr-credits")
    return "marketplace";
  if (pathname === "/how-it-works") return "how-it-works";
  if (pathname === "/about-us") return "about-us";
  if (pathname === "/contact") return "contact";
  if (pathname.startsWith("/credits/")) return "credit-detail";
  if (pathname === "/login") return "auth";
  if (pathname === "/signup") return "auth-signup";
  if (pathname === "/forgot-password") return "forgot-password";
  if (pathname.startsWith("/reset-password/")) return "reset-password";
  if (pathname === "/email-pending") return "email-pending";
  if (pathname.startsWith("/verify-email/")) return "email-verification";
  if (pathname === "/google-signup-phone") return "google-signup-phone";
  if (pathname === "/verification") return "verification";
  if (pathname === "/seller") return "seller-dashboard";
  if (pathname === "/buyer") return "buyer-dashboard";
  if (pathname === "/admin") return "admin-dashboard";
  if (pathname === "/seller/listings/new") return "add-listing";
  return "home";
};

function BrandMark({ size = "md" }) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl bg-[#5AC361] shadow-[0_4px_12px_rgba(90,195,97,0.20)]`}
      aria-hidden="true"
    >
      <svg
        className="h-4.5 w-4.5 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    </div>
  );
}

function Navbar({ page, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (
    DASHBOARD_PATHS.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`),
    )
  ) {
    return null;
  }

  const dashboardPage =
    user?.role === "admin"
      ? "admin-dashboard"
      : user?.role === "seller"
        ? "seller-dashboard"
        : "buyer-dashboard";

  const publicLinks = [
    { label: "EPR Credits", page: "epr-credits" },
    ...(user?.role === "buyer" || !isAuthenticated
      ? [{ label: "Post Requirement", page: "post-requirement" }]
      : []),
    { label: "How It Works", page: "how-it-works" },
    { label: "About Us", page: "about-us" },
    { label: "Contact Us", page: "contact" },
  ];

  const handleNavigate = (target, id) => {
    setMenuOpen(false);
    onNavigate(target, id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5EAF0]/90 bg-gray-100/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <button
          type="button"
          onClick={() => handleNavigate("home")}
          className="group flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-2"
          aria-label="EPR Nexus home"
        >
          <img
            src={logo}
            alt="EPR Nexus Logo"
            className="h-15 w-auto object-contain rounded-sm"
          />
        </button>

        {/* Primary Navigation */}
        <nav
          className="hidden flex-1 items-center justify-center gap-0.5 md:flex"
          aria-label="Primary navigation"
        >
          {publicLinks.map((link) => {
            const isActive = page === link.page && link.page !== "home";

            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavigate(link.page)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-[#F0FBF1] text-[#2E7D32]"
                    : "text-[#667085] hover:bg-[#F7F9FB] hover:text-[#1F2937]"
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">

          {/* Main Website */}
          <a
            href="https://eprnexuss.com/"
            className="group inline-flex items-center gap-2 rounded-lg border border-[#D9E0E7] bg-white px-3.5 py-2 text-sm font-medium text-[#475467] shadow-sm transition-all hover:border-[#5AC361] hover:bg-[#F7FFF8] hover:text-[#2E7D32]"
            aria-label="Visit main EPR Nexuss website"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>

            <span>Main Website</span>
          </a>

          {!isAuthenticated ? (
            <>
              {/* Login */}
              <button
                type="button"
                onClick={() => handleNavigate("auth")}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-[#475467] transition-colors hover:bg-[#F7F9FB] hover:text-[#0F1923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361]"
              >
                Log in
              </button>

              {/* Get Started */}
              <button
                type="button"
                onClick={() => handleNavigate("auth-signup")}
                className="rounded-lg bg-[#5AC361] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3EA646] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-2"
              >
                Get started
              </button>
            </>
          ) : (
            <>
              {/* Dashboard */}
              <button
                type="button"
                onClick={() => handleNavigate(dashboardPage)}
                className="rounded-lg bg-[#5AC361] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3EA646] hover:shadow-md"
              >
                Dashboard
              </button>

              {/* Notifications */}
              <NotificationBell compact onNavigate={onNavigate} />

              {/* Profile */}
              {user?.role === "admin" ? (
                <AdminProfileMenu onNavigate={onNavigate} compact />
              ) : (
                <ProfileMenu onNavigate={onNavigate} compact />
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="rounded-lg p-2 text-[#667085] transition-colors hover:bg-[#F7F9FB] hover:text-[#1F2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] md:hidden"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          {menuOpen ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-[#E5EAF0] bg-white md:hidden">
          <nav
            className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6"
            aria-label="Mobile navigation"
          >
            {publicLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNavigate(link.page)}
                className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  page === link.page && link.page !== "home"
                    ? "bg-[#F0FBF1] text-[#2E7D32]"
                    : "text-[#475467] hover:bg-[#F7F9FB]"
                }`}
              >
                {link.label}
              </button>
            ))}

            {/* Main Website - Mobile */}
            <a
              href="https://eprnexuss.com/"
              className="mt-2 flex items-center gap-2 rounded-lg border border-[#D9E0E7] bg-[#F8FAFC] px-3 py-2.5 text-sm font-semibold text-[#475467] transition-colors hover:border-[#5AC361] hover:bg-[#F0FBF1] hover:text-[#2E7D32]"
              onClick={() => setMenuOpen(false)}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>

              Main Website
            </a>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleNavigate(dashboardPage);
                }}
                className="mt-2 rounded-lg bg-[#5AC361] px-3 py-2.5 text-left text-sm font-semibold text-white"
              >
                Open dashboard
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#E5EAF0] pt-3">
                <button
                  type="button"
                  onClick={() => handleNavigate("auth")}
                  className="rounded-lg border border-[#E5EAF0] px-3 py-2.5 text-sm font-semibold text-[#475467]"
                >
                  Log in
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate("auth-signup")}
                  className="rounded-lg bg-[#5AC361] px-3 py-2.5 text-sm font-semibold text-white"
                >
                  Get started
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function PublicFooter({ user, onNavigate }) {
  return (
    <footer className="mt-auto bg-[#101820] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr_0.75fr_1.15fr]">
          <div className="max-w-sm">
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101820]"
            >
              <img
                src={logo}
                alt="EPR Nexuss Logo"
                className="h-12 w-auto object-contain rounded-sm"
              />
            </button>
            <p className="mt-4 text-sm leading-6 text-white/55">
              India's B2B EPR credit marketplace for verified buyers and
              sellers, with mediated transactions and compliance-focused
              workflows.
            </p>
          </div>
          {[
            {
              title: "Platform",
              links: [
                { label: "Browse Credits", page: "epr-credits" },
                ...(user?.role === "seller" || user?.role === "admin"
                  ? []
                  : [{ label: "Post Requirement", page: "post-requirement" }]),
                { label: "How It Works", page: "how-it-works" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About Us", page: "about-us" },
                { label: "Contact Us", page: "contact" },
              ],
            },
            {
              title: "Support",
              links: [
                { label: "Call +91 9286595966", href: "tel:+919286595966" },
                {
                  label: "Email info@eprnexuss.com",
                  href: "mailto:info@eprnexuss.com",
                },
                { label: "Mon–Sat · 10am–6pm", page: "contact" },
              ],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        className="text-sm text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate(link.page)}
                        className="text-left text-sm text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AC361]"
                      >
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              Email
            </p>
            <a
              href="mailto:info@eprnexuss.com"
              className="mt-1 block text-sm text-white/65 hover:text-white"
            >
              info@eprnexuss.com
            </a>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              Phone
            </p>
            <a
              href="tel:+919286595966"
              className="mt-1 block text-sm text-white/65 hover:text-white"
            >
              +91 9286595966 · 0120-4605014
            </a>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              Office
            </p>
            <button
              type="button"
              onClick={() => onNavigate("contact")}
              className="mt-1 text-left text-sm leading-5 text-white/65 hover:text-white"
            >
              H-73, No.107, Sector-63, Noida, U.P. 201301
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} EPR Nexuss. All rights reserved.</p>
          <p>Made in India 🇮🇳 · Compliance-focused B2B marketplace</p>
        </div>
      </div>
    </footer>
  );
}

function RouterApp() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const page = getPageKey(location.pathname);

  const legacyNavigate = (target, id) => {
    const paths = {
      home: "/",
      marketplace: "/epr-credits",
      "epr-credits": "/epr-credits",
      "how-it-works": "/how-it-works",
      "about-us": "/about-us",
      contact: "/contact",
      auth: "/login",
      "auth-signup": "/signup",
      "forgot-password": "/forgot-password",
      "email-pending": "/email-pending",
      "google-signup-phone": "/google-signup-phone",
      verification: "/verification",
      "seller-dashboard": "/seller",
      "buyer-dashboard": "/buyer",
      "post-requirement": "/buyer?section=requirements&post=1",
      "admin-dashboard": "/admin",
      "add-listing": "/seller/listings/new",
    };

    if (target === "credit-detail" && id)
      return navigate(`/credits/${encodeURIComponent(id)}`);

    // Deep-link dashboard actions from notifications without losing the user's context.
    if (target === "deal-room" && id) {
      const dashboardPath =
        user?.role === "seller"
          ? "/seller"
          : user?.role === "admin"
            ? "/admin"
            : "/buyer";
      return navigate(
        `${dashboardPath}?section=deals&deal=${encodeURIComponent(id)}`,
      );
    }
    if (target === "dashboard-section" && id) {
      const dashboardPath =
        user?.role === "seller"
          ? "/seller"
          : user?.role === "admin"
            ? "/admin"
            : "/buyer";
      return navigate(`${dashboardPath}?section=${encodeURIComponent(id)}`);
    }

    let path = paths[target] || "/";
    if (
      ["/seller", "/seller/listings/new"].includes(path) &&
      user?.role !== "seller"
    )
      path = user ? getDashboardPathForRole(user.role) : "/login";
    if (path === "/buyer" && user?.role !== "buyer")
      path = user ? getDashboardPathForRole(user.role) : "/login";
    if (path === "/admin" && user?.role !== "admin")
      path = user ? getDashboardPathForRole(user.role) : "/login";
    if (
      path === "/verification" &&
      (!user || !["buyer", "seller"].includes(user.role))
    )
      path = user ? getDashboardPathForRole(user.role) : "/login";
    if (path === "/login" && user) path = getDashboardPathForRole(user.role);
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FB] px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#D7DEE7] border-t-[#5AC361]" />
          <p className="text-sm text-[#667085]">Loading EPR Nexus…</p>
        </div>
      </div>
    );
  }

  const isDashboard = DASHBOARD_PATHS.some(
    (path) =>
      location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FB]">
      <Navbar page={page} onNavigate={legacyNavigate} />
      <main className="min-w-0 flex-1">
        <Routes>
          <Route path="/" element={<RootRoute onNavigate={legacyNavigate} />} />
          <Route
            path="/marketplace"
            element={<Navigate to="/epr-credits" replace />}
          />
          <Route
            path="/epr-credits"
            element={
              <HomeRoute
                component={MarketplacePage}
                onNavigate={legacyNavigate}
              />
            }
          />
          <Route
            path="/how-it-works"
            element={
              <HomeRoute
                component={HowItWorksPage}
                onNavigate={legacyNavigate}
              />
            }
          />
          <Route
            path="/about-us"
            element={
              <HomeRoute component={AboutUsPage} onNavigate={legacyNavigate} />
            }
          />
          <Route
            path="/contact"
            element={
              <HomeRoute
                component={ContactUsPage}
                onNavigate={legacyNavigate}
              />
            }
          />
          <Route
            path="/credits/:creditId"
            element={<CreditRoute onNavigate={legacyNavigate} />}
          />
          <Route
            path="/login"
            element={
              <AuthRoute initialMode="login" onNavigate={legacyNavigate} />
            }
          />
          <Route
            path="/signup"
            element={
              <AuthRoute initialMode="signup" onNavigate={legacyNavigate} />
            }
          />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage onNavigate={legacyNavigate} />}
          />
          <Route
            path="/reset-password/:token"
            element={<ResetRoute onNavigate={legacyNavigate} />}
          />
          <Route
            path="/email-pending"
            element={<SignupEmailPendingPage onNavigate={legacyNavigate} />}
          />
          <Route path="/verify-email/:token" element={<VerificationRoute />} />
          <Route
            path="/google-signup-phone"
            element={<GoogleSignupPhonePage onNavigate={legacyNavigate} />}
          />
          <Route
            path="/verification"
            element={
              <RoleRoute allowedRoles={["buyer", "seller"]}>
                <VerificationPage onNavigate={legacyNavigate} />
              </RoleRoute>
            }
          />
          <Route
            path="/seller"
            element={
              <RoleRoute allowedRoles={["seller"]}>
                <SellerDashboard onNavigate={legacyNavigate} />
              </RoleRoute>
            }
          />
          <Route
            path="/seller/listings/new"
            element={
              <RoleRoute allowedRoles={["seller"]}>
                <AddListingPage onNavigate={legacyNavigate} />
              </RoleRoute>
            }
          />
          <Route
            path="/buyer"
            element={
              <RoleRoute allowedRoles={["buyer"]}>
                <BuyerDashboard onNavigate={legacyNavigate} />
              </RoleRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AdminDashboard onNavigate={legacyNavigate} />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isDashboard && <PublicFooter user={user} onNavigate={legacyNavigate} />}
      <a
        href={`https://wa.me/919220386699?text=${encodeURIComponent(
          "i have a query regarding epr credits",
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/70 bg-[#25D366] text-white shadow-[0_12px_30px_rgba(37,211,102,0.30)] transition-all hover:-translate-y-0.5 hover:bg-[#1EBE5D] hover:shadow-[0_16px_34px_rgba(37,211,102,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:right-7"
        aria-label="Chat with EPR Nexuss on WhatsApp"
        title="Chat with EPR Nexuss on WhatsApp"
      >
        <svg
          className="h-7 w-7"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.54 0 .22 5.32.22 11.86c0 2.09.55 4.13 1.59 5.93L.12 24l6.35-1.67a11.84 11.84 0 0 0 5.61 1.42h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.43-8.41ZM12.09 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.77.99 1.01-3.67-.23-.38a9.84 9.84 0 1 1 8.37 4.64Zm5.4-7.38c-.29-.15-1.71-.84-1.98-.93-.27-.1-.46-.15-.66.15-.19.29-.75.93-.92 1.12-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.49.07-.75.37-.26.29-1 1-.1 2.43.9 1.43 1.03 1.64 2.95 2.83 1.92 1.2 1.92.8 2.27.75.35-.05 1.12-.46 1.28-.9.16-.44.16-.81.11-.89-.05-.08-.25-.13-.54-.27Z" />
        </svg>
      </a>
    </div>
  );
}

function HomeRoute({ component: Component, onNavigate }) {
  return <Component onNavigate={onNavigate} />;
}
function CreditRoute({ onNavigate }) {
  const { creditId } = useParams();
  return <CreditDetailPage creditId={creditId} onNavigate={onNavigate} />;
}
function ResetRoute({ onNavigate }) {
  const { token } = useParams();
  return <ResetPasswordPage token={token} onNavigate={onNavigate} />;
}
function VerificationRoute() {
  const { token } = useParams();
  const navigate = useNavigate();
  return (
    <EmailVerificationPage
      token={token}
      onNavigate={(target, id) => {
        if (target === "credit-detail" && id)
          return navigate(`/credits/${encodeURIComponent(id)}`);
        navigate(target === "home" ? "/" : "/login");
      }}
    />
  );
}
function AuthRoute({ initialMode, onNavigate }) {
  const { user } = useAuth();
  if (user) return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  return <AuthPage initialMode={initialMode} onNavigate={onNavigate} />;
}
function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role))
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  return children;
}

function RootRoute({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const verify = searchParams.get("verify-email");
  const reset = searchParams.get("reset-password");

  if (verify)
    return (
      <Navigate to={`/verify-email/${encodeURIComponent(verify)}`} replace />
    );
  if (reset)
    return (
      <Navigate to={`/reset-password/${encodeURIComponent(reset)}`} replace />
    );

  return <HomePage onNavigate={onNavigate} />;
}

export default function App() {
  return (
    <BrowserRouter basename="/marketplace">
      <RouterApp />
    </BrowserRouter>
  );
}
