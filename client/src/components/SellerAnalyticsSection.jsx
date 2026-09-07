import { useMemo } from "react";
import { Card, PageHeader, StatCard, Table, Tr, Td, Badge } from "./ui.jsx";

function SellerAnalyticsSection({ listings, deals, requests }) {
  const metrics = useMemo(() => {
    const active = listings.filter((item) => item.status === "active").length;
    const completed = deals.filter((item) => item.status === "completed").length;
    const openDeals = deals.filter((item) => !["completed", "cancelled"].includes(item.status)).length;
    const requestToDeal = requests.length ? (completed / requests.length) * 100 : 0;
    const categories = [...new Set(listings.map((item) => item.category).filter(Boolean))];
    const byCategory = categories.map((category) => {
      const rows = listings.filter((item) => item.category === category);
      const total = rows.reduce((sum, item) => sum + Number(item.totalQuantity ?? item.quantity ?? 0), 0);
      const available = rows.reduce((sum, item) => sum + Math.max(Number(item.quantity || 0) - Number(item.reservedQuantity || 0), 0), 0);
      return { category, listings: rows.length, total, available };
    }).sort((a, b) => b.total - a.total);
    return { active, completed, openDeals, requestToDeal, byCategory };
  }, [listings, deals, requests]);

  const statusCounts = useMemo(() => [
    ["Active", listings.filter((item) => item.status === "active").length],
    ["Pending", listings.filter((item) => item.status === "pending_review").length],
    ["Paused", listings.filter((item) => item.status === "paused").length],
    ["Rejected", listings.filter((item) => item.status === "rejected").length],
    ["Closed", listings.filter((item) => ["sold", "cancelled", "expired"].includes(item.status)).length],
  ], [listings]);

  return <>
    <PageHeader eyebrow="Seller workspace" title="Analytics" description="Understand your listing activity, inventory mix and transaction conversion using your live marketplace data." />
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Active listings" value={String(metrics.active)} description="Currently visible inventory" accent />
      <StatCard label="Buyer requests" value={String(requests.length)} description="Requests received" />
      <StatCard label="Completed deals" value={String(metrics.completed)} description="Successful transactions" />
      <StatCard label="Request → deal" value={`${metrics.requestToDeal.toFixed(1)}%`} description="Completed deals / requests" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="p-5">
        <h2 className="font-semibold text-[#101828]">Listing status</h2>
        <p className="mt-1 text-xs text-[#667085]">A quick view of your current listing portfolio.</p>
        <div className="mt-6 space-y-4">{statusCounts.map(([label, count]) => { const total=Math.max(listings.length,1); return <div key={label}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-[#344054]">{label}</span><span className="text-[#667085]">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#F2F4F7]"><div className="h-full rounded-full bg-[#5AC361]" style={{ width: `${(count/total)*100}%` }} /></div></div>; })}</div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold text-[#101828]">Deal pipeline</h2>
        <p className="mt-1 text-xs text-[#667085]">Deals currently requiring movement.</p>
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#EFF6FF] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8]">Open deals</p><p className="mt-1 text-2xl font-bold text-[#1E40AF]">{metrics.openDeals}</p></div><div className="rounded-xl bg-[#EBF8EC] p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">Completed</p><p className="mt-1 text-2xl font-bold text-[#1B5E20]">{metrics.completed}</p></div></div>
      </Card>
    </div>
    <Card className="mt-6 overflow-hidden">
      <div className="border-b border-[#E5EAF0] px-5 py-4"><h2 className="font-semibold text-[#101828]">Inventory by credit category</h2><p className="mt-1 text-xs text-[#667085]">See where your listed quantity is concentrated.</p></div>
      {metrics.byCategory.length === 0 ? <div className="py-14 text-center text-sm text-[#667085]">Create listings to see category analytics.</div> : <div className="overflow-x-auto"><Table headers={["Category","Listings","Total Qty","Available Qty","Share"]}>{metrics.byCategory.map((row) => { const total=metrics.byCategory.reduce((sum,item)=>sum+item.total,0)||1; return <Tr key={row.category}><Td><span className="font-semibold">{row.category}</span></Td><Td>{row.listings}</Td><Td>{row.total.toLocaleString("en-IN")} MT</Td><Td>{row.available.toLocaleString("en-IN")} MT</Td><Td><Badge label={`${((row.total/total)*100).toFixed(0)}%`} variant="open" /></Td></Tr>; })}</Table></div>}
    </Card>
  </>;
}
export default SellerAnalyticsSection;
