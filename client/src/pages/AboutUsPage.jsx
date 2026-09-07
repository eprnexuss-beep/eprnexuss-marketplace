const Icon = ({ children }) => (
  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EBF8EC] text-[#3EA646]">
    {children}
  </span>
)

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
)

function AboutUsPage({ onNavigate }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F7F9FB] text-[#101820]">
      {/* Hero */}
      <section className="relative bg-[#0B171D] text-white">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full border border-[#5AC361]/30" />
          <div className="absolute -right-10 -top-20 h-[360px] w-[360px] rounded-full border border-[#5AC361]/20" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#5AC361]/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5AC361]/25 bg-[#5AC361]/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#A8E8AD]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5AC361]" />
              ABOUT EPR NEXUS
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Building the trust layer for
              <span className="block text-[#5AC361]">EPR credit transactions.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              EPR Nexuss is a broker-assisted B2B marketplace designed to connect compliance-driven buyers with verified sellers of EPR credits through a transparent, mediated, and auditable process.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate('marketplace')} className="inline-flex items-center gap-2 rounded-xl bg-[#5AC361] px-5 py-3 text-sm font-semibold text-[#07120A] shadow-[0_12px_30px_rgba(90,195,97,0.18)] transition hover:bg-[#71D178]">
                Explore marketplace <Arrow />
              </button>
              <button type="button" onClick={() => onNavigate('how-it-works')} className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]">
                See how it works
              </button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5AC361]">EPR NEXUS</p>
                  <p className="mt-1 text-sm font-semibold">The transaction trust layer</p>
                </div>
                <div className="rounded-full border border-[#5AC361]/30 bg-[#5AC361]/10 px-2.5 py-1 text-[10px] font-semibold text-[#A8E8AD]">MEDIATED</div>
              </div>

              <div className="relative my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#A8E8AD]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-5 2 2 4-4" /></svg>
                  </div>
                  <p className="mt-3 text-xs font-semibold">Verified seller</p>
                  <p className="mt-1 text-[10px] text-white/40">Credits + documents</p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#5AC361]/35 bg-[#5AC361]/10 text-[#5AC361] shadow-[0_0_45px_rgba(90,195,97,0.12)]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-7 7 7 7-7M5 7l7-4 7 4" /></svg>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#A8E8AD]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7v10m14-10v10M8 7V5h8v2M4 17h16" /></svg>
                  </div>
                  <p className="mt-3 text-xs font-semibold">Compliance buyer</p>
                  <p className="mt-1 text-[10px] text-white/40">Requirement + request</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['Verify', 'Mediate', 'Track'].map((item, index) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-center">
                    <p className="text-[10px] text-white/35">0{index + 1}</p>
                    <p className="mt-1 text-xs font-semibold text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-[#E5EAF0] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3EA646]">Our purpose</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#101820] sm:text-4xl">
                Make EPR credit trading more trustworthy.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['A transparent marketplace', 'Make categories, quantities, availability and indicative pricing easier to discover.'],
                ['A verification-first model', 'Use KYC and document verification to reduce fake, duplicate or overstated listings.'],
                ['A managed transaction', 'Keep negotiations, documentation and payment coordination inside a controlled workflow.'],
                ['A complete audit trail', 'Track the deal lifecycle from listing and request through completion and commission recording.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-5">
                  <Icon><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg></Icon>
                  <h3 className="mt-4 text-sm font-bold text-[#101820]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#667085]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What makes us different */}
      <section className="bg-[#F7F9FB]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3EA646]">Why EPR Nexuss</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#101820] sm:text-4xl">Not another classifieds marketplace.</h2>
            <p className="mt-4 text-base leading-7 text-[#667085]">Our model is intentionally closer to a brokerage: EPR Nexuss remains the point of trust throughout the transaction rather than simply publishing contact details and stepping away.</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { number: '01', title: 'Verify before visibility', text: 'Seller KYC and supporting documents are part of the listing approval process before credits become marketplace supply.' },
              { number: '02', title: 'Mediate every deal', text: 'Buyer and seller contact details stay controlled while the EPR Nexuss team coordinates requests, negotiation and documentation.' },
              { number: '03', title: 'Track the full lifecycle', text: 'The platform is designed to follow a transaction from listing and request to payment coordination, completion and reporting.' },
            ].map((item) => (
              <div key={item.number} className="group rounded-2xl border border-[#E5EAF0] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg">
                <span className="text-xs font-bold tracking-[0.16em] text-[#5AC361]">{item.number}</span>
                <h3 className="mt-8 text-lg font-bold text-[#101820]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#667085]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who we serve */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-[#0B171D] p-7 text-white sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5AC361]">For buyers</p>
              <h3 className="mt-3 text-2xl font-bold">Find verified supply when compliance matters.</h3>
              <p className="mt-4 text-sm leading-6 text-white/60">Built for producers, importers, brand owners and compliance or sustainability teams that need EPR credits and want a single point of contact for verification, negotiation and payment coordination.</p>
              <ul className="mt-6 space-y-3 text-sm text-white/75">
                {['Search verified marketplace supply', 'Post a specific purchase requirement', 'Request credits through EPR Nexuss', 'Track negotiation and deal progress'].map((item) => <li key={item} className="flex gap-2"><span className="mt-1 text-[#5AC361]">✓</span>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-3xl border border-[#E5EAF0] bg-[#F8FAFC] p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3EA646]">For sellers</p>
              <h3 className="mt-3 text-2xl font-bold text-[#101820]">Turn surplus verified credits into organized demand.</h3>
              <p className="mt-4 text-sm leading-6 text-[#667085]">Designed for registered recyclers, plastic waste processors, PROs and other eligible businesses with surplus certified EPR credits.</p>
              <ul className="mt-6 space-y-3 text-sm text-[#475467]">
                {['Complete KYC and verification', 'List available EPR credits', 'Build credibility with verified status', 'Let EPR Nexuss coordinate the transaction'].map((item) => <li key={item} className="flex gap-2"><span className="mt-1 font-bold text-[#3EA646]">✓</span>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="bg-[#F0F7F1]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#3EA646]">What we stand for</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#101820] sm:text-4xl">Trust is the product.</h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Verification', 'Evidence before access.'],
              ['Transparency', 'Clearer marketplace visibility.'],
              ['Accountability', 'A mediated point of responsibility.'],
              ['Traceability', 'A record of the transaction journey.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-2xl border border-[#DDE9DF] bg-white p-5 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF8EC] text-[#3EA646]">✓</div>
                <h3 className="mt-4 text-sm font-bold text-[#101820]">{title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-[#667085]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0B171D] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between md:py-16 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5AC361]">Ready to work with us?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Explore a more structured EPR credit market.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onNavigate('marketplace')} className="rounded-xl bg-[#5AC361] px-5 py-3 text-sm font-semibold text-[#07120A] transition hover:bg-[#71D178]">Browse credits</button>
            <button type="button" onClick={() => onNavigate('auth-signup')} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]">Create an account</button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AboutUsPage
