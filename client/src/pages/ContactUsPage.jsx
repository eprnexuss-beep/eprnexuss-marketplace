import React from "react";

const CONTACTS = {
  email: "info@eprnexuss.com",
  alternateEmail: "eprnexuss@gmail.com",
  mobile: "+91 9286595966",
  landline: "0120-4605014",
  address:
    "H-73, No.107, Sector-63, Noida, Dist. Gautam Buddha Nagar, U.P. 201301",
  hours: "Mon–Sat, 10:00am–6:00pm",
};

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
                href="tel:+919286595966"
                className="inline-flex items-center gap-2 rounded-lg bg-[#35B94C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2D9F41]"
              >
                <Icon type="phone" /> Call for instant solution
              </a>
            }
          >
            <a
              href="tel:+919286595966"
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

        <aside className="h-fit rounded-2xl border border-[#DDE5EB] bg-[#12202A] p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-8 lg:sticky lg:top-24">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#72DB80]">
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.5 10.5h7M8.5 14h4M5.5 20.25h13a2 2 0 0 0 2-2V5.75a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v12.5a2 2 0 0 0 2 2Z"
              />
            </svg>
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-[#8FA4B5]">
            Fast support
          </p>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
            Something not right?
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            If you are stuck during a purchase, listing, payment, verification,
            or dispute, contact us directly. We will help you get the issue
            resolved.
          </p>
          <div className="mt-6 grid gap-3">
            <a
              href="tel:+919286595966"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#35B94C] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2D9F41]"
            >
              Call us for instant solution
            </a>
            <a
              href={`mailto:${CONTACTS.email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Email our support team
            </a>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("marketplace")}
            className="mt-6 text-sm font-semibold text-[#8FE19A] hover:text-white"
          >
            Back to marketplace →
          </button>
        </aside>
      </main>
    </div>
  );
}
