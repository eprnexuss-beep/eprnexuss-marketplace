import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const CONTACTS = {
  email: "info@eprnexuss.com",
  alternateEmail: "eprnexuss@gmail.com",
  mobile: "+91 9220386699",
  landline: "0120-4605014",
  address:
    "H-73, No.107, Sector-63, Noida, Dist. Gautam Buddha Nagar, U.P. 201301",
  hours: "Mon–Sat, 10:00am–6:00pm",
};

const SUPPORT_PHONE = "919220386699";

const SUPPORT_ISSUES = {
  buyer: [
    "I'm facing an issue to login",
    "I'm facing an issue to buy EPR credits",
    "Other",
  ],
  seller: [
    "I'm facing an issue to login",
    "I'm facing an issue to register credits for selling",
    "Other",
  ],
};

function SupportForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
    issue: "",
    message: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user?.name || "",
      phone: current.phone || user?.phone || "",
      email: current.email || user?.email || "",
      role:
        current.role ||
        (user?.role === "buyer" || user?.role === "seller" ? user.role : ""),
    }));
  }, [user]);

  const handleRoleChange = (role) => {
    setError("");
    setForm((current) => ({
      ...current,
      role,
      issue: "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !phone || !email || !form.role || !form.issue) {
      setError("Please complete all required fields before continuing.");
      return;
    }

    if (form.issue === "Other" && !message) {
      setError("Please describe your query when you select Other.");
      return;
    }

    const whatsappMessage = [
      "Hello EPR Nexuss Support,",
      "",
      `I'm ${name}.`,
      `My contact number is ${phone}.`,
      `My email is ${email}.`,
      `I am a ${form.role}.`,
      `Issue: ${form.issue}`,
      message ? `Additional query: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
      whatsappMessage,
    )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setError("");
  };

  const issues = form.role ? SUPPORT_ISSUES[form.role] : [];

  return (
    <aside className="h-fit rounded-2xl border border-[#DDE5EB] bg-[#12202A] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-8 lg:sticky lg:top-24">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#72DB80]">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.5 10.5h7M8.5 14h4M5.5 20.25h13a2 2 0 0 0 2-2V5.75a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v12.5a2 2 0 0 0 2 2Z"
          />
        </svg>
      </div>

      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8FA4B5]">
        WhatsApp Support
      </p>
      <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
        Facing an issue?
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Tell us what you need help with. We'll prepare a WhatsApp message with
        your details so our support team can help you quickly.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/85">
              Name *
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Your name"
              autoComplete="name"
              className="w-full rounded-xl border border-white/10 bg-white px-3.5 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/85">
              Phone number *
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="+91 9876543210"
              autoComplete="tel"
              className="w-full rounded-xl border border-white/10 bg-white px-3.5 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/85">
            Email *
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="you@company.com"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white px-3.5 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/20"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-white/85">
            Who are you? *
          </span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "buyer", label: "Buyer" },
              { value: "seller", label: "Seller" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRoleChange(option.value)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  form.role === option.value
                    ? "border-[#5AC361] bg-[#F0FBF1] text-[#2E7D32] shadow-sm"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/85">
            What can we help with? *
          </span>
          <select
            value={form.issue}
            onChange={(event) => {
              setError("");
              setForm((current) => ({
                ...current,
                issue: event.target.value,
              }));
            }}
            disabled={!form.role}
            className="w-full rounded-xl border border-white/10 bg-white px-3.5 py-2.5 text-sm text-[#1F2937] outline-none transition focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/20 disabled:cursor-not-allowed disabled:bg-[#E9EDF0] disabled:text-[#98A2B3]"
          >
            <option value="">
              {form.role ? "Select an issue" : "Select Buyer or Seller first"}
            </option>
            {issues.map((issue) => (
              <option key={issue} value={issue}>
                {issue}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/85">
            Tell us more{" "}
            <span className="font-normal text-white/45">
              (optional unless you choose Other)
            </span>
          </span>
          <textarea
            value={form.message}
            onChange={(event) => {
              setError("");
              setForm((current) => ({
                ...current,
                message: event.target.value,
              }));
            }}
            rows={4}
            placeholder="Write your query here..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white px-3.5 py-2.5 text-sm leading-5 text-[#1F2937] outline-none transition focus:border-[#5AC361] focus:ring-2 focus:ring-[#5AC361]/20"
          />
        </label>

        {error && (
          <div
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-3 text-sm text-[#B42318]"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1EBE5D] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#12202A]"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.54 0 .22 5.32.22 11.86c0 2.09.55 4.13 1.59 5.93L.12 24l6.35-1.67a11.84 11.84 0 0 1 5.61 1.42h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.43-8.41ZM12.09 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.77.99 1.01-3.67.13-.6.44-.51c.15-.17.19-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.58-.9-2.16-.24-.57-.48-.49-.66-.5h-.56c-.19 0-.49.07-.75.37-.26.29-1 1-.1 2.43.9 1.43 1.03 1.64 2.95 2.83 1.92 1.2 1.92.8 2.27.75.35-.05 1.12-.46 1.28-.9.16-.44.16-.81.11-.89-.05-.08-.25-.13-.54-.27Z" />
          </svg>
          Send on WhatsApp
        </button>
      </form>
    </aside>
  );
}

function Icon({ type }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  if (type === "email")
    return (
      <svg {...common}>
        <path d="M3 6.75A2.25 2.25 0 0 1 5.25 4.5h13.5A2.25 2.25 0 0 1 21 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 17.25V6.75Z" />
        <path d="m4 6 8 6 8-6" />
      </svg>
    );
  if (type === "phone")
    return (
      <svg {...common}>
        <path d="M6.5 3.75 9.1 3a1.7 1.7 0 0 1 2 1l1.2 3a1.7 1.7 0 0 1-.5 1.9l-1.6 1.3a14.4 14.4 0 0 0 4.6 4.6l1.3-1.6a1.7 1.7 0 0 1 1.9-.5l3 1.2a1.7 1.7 0 0 1 1 2l-.75 2.6a2.25 2.25 0 0 1-2.5 1.6C10.2 18.9 5.1 13.8 3.9 5.75a2.25 2.25 0 0 1 1.6-2.5Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.25" />
    </svg>
  );
}

function ContactCard({ icon, label, title, children, action }) {
  return (
    <div className="rounded-2xl border border-[#E1E7EC] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F8EB] text-[#20A046]">
          <Icon type={icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A98A8]">
            {label}
          </p>
          <h2 className="mt-1 text-base font-bold text-[#17212B] sm:text-lg">
            {title}
          </h2>
          <div className="mt-2 text-sm leading-6 text-[#657386]">
            {children}
          </div>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </div>
  );
}

export default function ContactUsPage({ onNavigate }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F8FA]">
      <section className="border-b border-[#E5EAF0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9F0DE] bg-[#F0FBF2] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#25863A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#35B94C]" />{" "}
              Transaction Support
            </div>
            <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-[-0.03em] text-[#17212B] sm:text-5xl">
              Need help with an EPR transaction?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#657386] sm:text-base">
              Our support team can help with payment, quantity, compliance,
              transfer documentation, account questions, or any other
              marketplace issue.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
        <div className="space-y-5">
          <ContactCard
            icon="email"
            label="Email us"
            title={CONTACTS.email}
            action={
              <a
                href={`mailto:${CONTACTS.email}`}
                className="inline-flex rounded-lg bg-[#35B94C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D9F41]"
              >
                Email support
              </a>
            }
          >
            <a
              href={`mailto:${CONTACTS.email}`}
              className="font-medium text-[#344054] hover:text-[#25863A]"
            >
              {CONTACTS.email}
            </a>
            <br />
            <a
              href={`mailto:${CONTACTS.alternateEmail}`}
              className="hover:text-[#25863A]"
            >
              {CONTACTS.alternateEmail}
            </a>
          </ContactCard>

          <ContactCard
            icon="phone"
            label="Call us"
            title={CONTACTS.mobile}
            action={
              <a
                href="tel:+919220386699"
                className="inline-flex items-center gap-2 rounded-lg bg-[#35B94C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D9F41]"
              >
                <Icon type="phone" /> Call for instant solution
              </a>
            }
          >
            <a
              href="tel:+919220386699"
              className="font-medium text-[#344054] hover:text-[#25863A]"
            >
              {CONTACTS.mobile}
            </a>
            <br />
            <a href="tel:01204605014" className="hover:text-[#25863A]">
              {CONTACTS.landline}
            </a>
          </ContactCard>

          <ContactCard icon="location" label="Visit us" title="EPR Nexuss">
            <p className="font-medium text-[#344054]">{CONTACTS.address}</p>
            <p className="mt-1">{CONTACTS.hours}</p>
          </ContactCard>
        </div>

        <SupportForm />
      </main>
    </div>
  );
}
