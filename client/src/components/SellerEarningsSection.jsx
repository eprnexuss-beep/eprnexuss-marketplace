import { useMemo } from "react";
import { Card, PageHeader, StatCard, Table, Tr, Td, Badge } from "./ui.jsx";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function SellerEarningsSection({ deals }) {
  const completed = deals.filter((deal) => deal.status === "completed");
  const open = deals.filter((deal) => !["completed", "cancelled"].includes(deal.status));
  const grossCompleted = completed.reduce((sum, deal) => sum + Number(deal.creditSubtotal ?? (Number(deal.quantity || 0) * Number(deal.agreedPrice || 0))), 0);
  const grossPending = open.reduce((sum, deal) => sum + Number(deal.creditSubtotal ?? (Number(deal.quantity || 0) * Number(deal.agreedPrice || 0))), 0);
  const avgPrice = completed.length ? completed.reduce((sum, deal) => sum + Number(deal.agreedPrice || 0), 0) / completed.length : 0;

  const monthly = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const value = completed.filter((deal) => { const d = new Date(deal.completedAt || deal.createdAt); return `${d.getFullYear()}-${d.getMonth()}` === key; }).reduce((sum, deal) => sum + Number(deal.creditSubtotal ?? (Number(deal.quantity || 0) * Number(deal.agreedPrice || 0))), 0);
      months.push({ label: date.toLocaleDateString("en-IN", { month: "short" }), value });
    }
    return months;
  }, [completed]);
  const maxMonth = Math.max(...monthly.map((item) => item.value), 1);

  return <>
    <PageHeader eyebrow="Seller workspace" title="Earnings & Settlements" description="Track completed deal value, pending deal value and your transaction settlement history." />
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Completed earnings" value={money(grossCompleted)} description="Credit value from completed deals" accent />
      <StatCard label="Pending deal value" value={money(grossPending)} description="Open deals not completed yet" />
      <StatCard label="Completed deals" value={String(completed.length)} description="Successfully completed transactions" />
      <StatCard label="Avg. selling price" value={money(avgPrice) + "/MT"} description="Across completed deals" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="p-5">
        <h2 className="font-semibold text-[#101828]">Monthly earnings trend</h2>
        <p className="mt-1 text-xs text-[#667085]">Based on completed deal value.</p>
        <div className="mt-6 flex h-56 items-end gap-3 border-b border-[#EAECF0] px-2">
          {monthly.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-[#667085]">{item.value ? money(item.value) : "—"}</span><div title={`${item.label}: ${money(item.value)}`} className="w-full max-w-12 rounded-t-lg bg-[#5AC361]" style={{ height: `${Math.max(4, (item.value / maxMonth) * 75)}%` }} /><span className="text-[11px] text-[#98A2B3]">{item.label}</span></div>)}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold text-[#101828]">Settlement overview</h2>
        <p className="mt-1 text-xs leading-5 text-[#667085]">Completed deal values are recorded here. Actual payment release remains part of the EPR Nexuss-mediated settlement process.</p>
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-[#A5D6A7] bg-[#EBF8EC] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">Settled deal value</p><p className="mt-1 text-xl font-bold text-[#1B5E20]">{money(grossCompleted)}</p></div>
          <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#92400E]">Pending deal value</p><p className="mt-1 text-xl font-bold text-[#78350F]">{money(grossPending)}</p></div>
        </div>
      </Card>
    </div>
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-[#E5EAF0] px-5 py-4"><h2 className="font-semibold text-[#101828]">Settlement history</h2><p className="mt-1 text-xs text-[#667085]">A transaction record derived from your deals.</p></div>
      {completed.length === 0 ? <div className="py-14 text-center text-sm text-[#667085]">Completed settlements will appear here after deals are completed.</div> : <div className="overflow-x-auto"><Table headers={["Deal","Credit","Quantity","Deal Value","Price / MT","Completed","Status"]}>{completed.map((deal) => <Tr key={deal._id}><Td className="font-semibold">#{String(deal._id).slice(-8)}</Td><Td>{deal.listing?.category || "EPR Credit"}</Td><Td>{Number(deal.quantity||0).toLocaleString("en-IN")} MT</Td><Td>{money(deal.creditSubtotal ?? (Number(deal.quantity||0)*Number(deal.agreedPrice||0)))}</Td><Td>{money(deal.agreedPrice)}/MT</Td><Td>{deal.completedAt ? new Date(deal.completedAt).toLocaleDateString("en-IN") : "—"}</Td><Td><Badge label="Completed" /></Td></Tr>)}</Table></div>}
    </Card>
  </>;
}
export default SellerEarningsSection;
