import React from 'react'

const steps = [
  { n: '01', title: 'Seller lists credits', text: 'Verified sellers add available EPR credits with category, quantity, price, compliance year, validity and supporting documents.', icon: 'M12 3v18m9-9H3' },
  { n: '02', title: 'Buyer finds a match', text: 'Buyers browse verified listings or post a requirement when they need a specific credit type, quantity or location.', icon: 'M21 21l-4.35-4.35m2.1-5.4a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z' },
  { n: '03', title: 'We verify & coordinate', text: 'EPR Nexuss reviews the parties, listing information and supporting documents before the transaction moves forward.', icon: 'M9 12l2 2 4-4m5.6-3.6A11.9 11.9 0 0112 2.9 11.9 11.9 0 013.4 6.4 12 12 0 003 9c0 5.6 3.8 10.3 9 11.6 5.2-1.3 9-6 9-11.6 0-1-.1-2-.4-2.9z' },
  { n: '04', title: 'We facilitate the deal', text: 'Negotiation, quotation, payment coordination and transaction communication stay inside the mediated Deal Room.', icon: 'M8 12h8m-4-4v8m9-4a9 9 0 11-18 0 9 9 0 0118 0z' },
  { n: '05', title: 'Deal completed', text: 'Once the transaction is completed, the platform records the lifecycle so both sides have a clear, traceable transaction history.', icon: 'M5 13l4 4L19 7' },
]

const principles = [
  ['Verified first', 'Listings and business documents pass through an EPR Nexuss verification workflow before trusted marketplace activity.'],
  ['Mediated by design', 'Buyer and seller contact details are not exposed directly. EPR Nexuss remains the transaction layer.'],
  ['Traceable lifecycle', 'Requests, quotations, messages, payment coordination, disputes and completion stay connected to the deal.'],
]

function Icon({ d, className = 'h-5 w-5' }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
}

export default function HowItWorksPage({ onNavigate }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F7F9FB] text-[#101820]">
      <style>{`
        @keyframes nexusFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes nexusPulse { 0%,100%{opacity:.35;transform:scale(.96)} 50%{opacity:.75;transform:scale(1)} }
        @keyframes nexusReveal { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .nexus-float{animation:nexusFloat 5s ease-in-out infinite}
        .nexus-pulse{animation:nexusPulse 3s ease-in-out infinite}
        .nexus-reveal{animation:nexusReveal .7s ease both}
        @media (prefers-reduced-motion: reduce){.nexus-float,.nexus-pulse,.nexus-reveal{animation:none!important}}
      `}</style>

      <section className="relative isolate bg-[#0D171F] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(90,195,97,.22),transparent_30%),radial-gradient(circle_at_18%_80%,rgba(90,195,97,.10),transparent_28%)]" />
        <div className="absolute -right-28 top-16 h-72 w-72 rounded-full border border-[#5AC361]/20 nexus-pulse" />
        <div className="absolute right-4 top-28 h-52 w-52 rounded-full border border-[#5AC361]/10" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-20">
          <div className="nexus-reveal max-w-2xl self-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#5AC361]/30 bg-[#5AC361]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.18em] text-[#A8E6AC]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5AC361]" /> The EPR Nexuss transaction model
            </div>
            <h1 className="text-4xl font-semibold tracking-[-.04em] sm:text-5xl lg:text-6xl">From verified credit<br /><span className="text-[#73D47A]">to completed deal.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/60 sm:text-lg">A transparent, mediated journey for businesses buying and selling EPR credits — with verification, negotiation, payment coordination and a traceable Deal Room at every important step.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => onNavigate('marketplace')} className="rounded-xl bg-[#5AC361] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(90,195,97,.18)] transition hover:-translate-y-0.5 hover:bg-[#6BD270]">Browse verified credits</button>
              <button type="button" onClick={() => onNavigate('buyer-dashboard')} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Post a requirement <span className="ml-1">→</span></button>
            </div>
          </div>

          <div className="relative flex min-h-[360px] items-center justify-center lg:min-h-[420px]">
            <div className="absolute h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute h-52 w-52 rounded-full border border-[#5AC361]/20" />
            <div className="nexus-float relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-[2rem] border border-[#7BDF81]/30 bg-[#17242D]/90 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5AC361] text-white shadow-lg"><Icon d="M9 12l2 2 4-4m5.6-3.6A11.9 11.9 0 0112 2.9 11.9 11.9 0 013.4 6.4" className="h-6 w-6" /></div>
              <p className="mt-3 text-sm font-bold">EPR NEXUS</p><p className="mt-0.5 text-[10px] uppercase tracking-[.18em] text-white/40">Trust layer</p>
            </div>
            <div className="absolute left-1 top-12 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 backdrop-blur nexus-float" style={{animationDelay:'-.8s'}}><p className="text-[10px] uppercase tracking-wider text-white/35">Seller</p><p className="mt-1 text-sm font-semibold">Lists credits</p></div>
            <div className="absolute right-0 top-28 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 backdrop-blur nexus-float" style={{animationDelay:'-1.8s'}}><p className="text-[10px] uppercase tracking-wider text-white/35">Buyer</p><p className="mt-1 text-sm font-semibold">Requests credits</p></div>
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-2xl border border-[#5AC361]/20 bg-[#5AC361]/10 px-4 py-3 backdrop-blur"><p className="text-[10px] uppercase tracking-wider text-[#8BD98F]">Outcome</p><p className="mt-1 text-sm font-semibold">Verified deal completed</p></div>
            <div className="absolute left-[22%] top-[43%] h-px w-[24%] bg-gradient-to-r from-transparent via-[#5AC361]/50 to-[#5AC361]/10" /><div className="absolute right-[22%] top-[49%] h-px w-[24%] bg-gradient-to-l from-transparent via-[#5AC361]/50 to-[#5AC361]/10" />
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5EAF0] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          {principles.map(([title, text], i) => <div key={title} className="flex gap-3 rounded-2xl p-2"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0FBF1] text-[#3EA646]"><Icon d={i === 0 ? 'M9 12l2 2 4-4m5.6-3.6A11.9 11.9 0 0112 2.9' : i === 1 ? 'M12 3v18m-6-6l6 6 6-6' : 'M4 6h16M4 12h10M4 18h16'} /></div><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[#667085]">{text}</p></div></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#3EA646]">The journey</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Five steps. One controlled transaction.</h2><p className="mt-4 text-sm leading-6 text-[#667085] sm:text-base">Every stage is designed to reduce uncertainty while keeping the experience simple for both sides.</p></div>
        <div className="relative mt-14">
          <div className="absolute left-6 top-7 hidden h-[calc(100%-56px)] w-px bg-gradient-to-b from-[#5AC361] via-[#D9EBDD] to-transparent lg:left-1/2 lg:block" />
          <div className="space-y-7 lg:space-y-0">
            {steps.map((step, index) => <div key={step.n} className={`relative lg:grid lg:grid-cols-2 lg:gap-16 ${index % 2 ? '' : ''}`}>
              <div className={`${index % 2 ? 'lg:col-start-2' : 'lg:col-start-1'} ${index ? 'lg:mt-10' : ''}`}>
                <div className="group rounded-3xl border border-[#E5EAF0] bg-white p-6 shadow-[0_12px_40px_rgba(15,25,35,.04)] transition duration-300 hover:-translate-y-1 hover:border-[#BFE7C2] hover:shadow-[0_20px_50px_rgba(15,25,35,.08)]">
                  <div className="flex items-start justify-between gap-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0FBF1] text-[#3EA646]"><Icon d={step.icon} /></div><span className="text-xs font-black tracking-[.16em] text-[#C5CDD5]">{step.n}</span></div>
                  <h3 className="mt-6 text-lg font-bold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[#667085]">{step.text}</p>
                </div>
              </div>
              <div className="absolute left-0 top-7 hidden h-3 w-3 rounded-full border-2 border-white bg-[#5AC361] shadow-[0_0_0_5px_#E8F7E9] lg:left-1/2 lg:block lg:-translate-x-1/2" />
            </div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#101A22] py-20 text-white sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#73D47A]">Built for both sides</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Different goals.<br />Same trusted workflow.</h2><p className="mt-5 max-w-md text-sm leading-6 text-white/55">The marketplace keeps discovery simple while EPR Nexuss handles the sensitive parts of the transaction.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5AC361]/15 text-[#73D47A]"><Icon d="M12 3v18m9-9H3" /></div><h3 className="mt-5 font-bold">For sellers</h3><ul className="mt-3 space-y-2.5 text-sm leading-5 text-white/55"><li>• Reach verified business demand</li><li>• Showcase certified credit availability</li><li>• Let EPR Nexuss coordinate the deal</li></ul></div>
            <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5AC361]/15 text-[#73D47A]"><Icon d="M21 21l-4.35-4.35m2.1-5.4a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" /></div><h3 className="mt-5 font-bold">For buyers</h3><ul className="mt-3 space-y-2.5 text-sm leading-5 text-white/55"><li>• Discover verified credit listings</li><li>• Request the quantity you need</li><li>• Keep negotiation and payment coordinated</li></ul></div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F0FBF1] py-20 sm:py-24">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#5AC361]/10 blur-2xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#3EA646] shadow-sm"><Icon d="M9 12l2 2 4-4m5.6-3.6A11.9 11.9 0 0112 2.9" className="h-7 w-7" /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#3EA646]">Ready when you are</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-.03em] sm:text-4xl">Find the right credit.<br />Let us handle the journey.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#667085]">Browse verified EPR credits or tell us exactly what your business needs.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => onNavigate('marketplace')} className="rounded-xl bg-[#101A22] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">Explore marketplace</button><button type="button" onClick={() => onNavigate('buyer-dashboard')} className="rounded-xl border border-[#CFE5D1] bg-white px-6 py-3 text-sm font-bold text-[#26342A] transition hover:bg-[#F8FCF8]">Post requirement</button></div>
        </div>
      </section>
    </div>
  )
}
