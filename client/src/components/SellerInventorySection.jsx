import { useMemo } from "react";
import { Badge, Card, PageHeader, StatCard, Table, Tr, Td } from "./ui.jsx";

function SellerInventorySection({ listings, deals }) {
  const active = listings.filter((listing) => listing.status === "active");
  const summary = useMemo(() => active.reduce((acc, listing) => {
    const total = Number(listing.totalQuantity ?? listing.quantity ?? 0);
    const quantity = Number(listing.quantity || 0);
    const reserved = Number(listing.reservedQuantity || 0);
    acc.total += total;
    acc.available += Math.max(quantity - reserved, 0);
    acc.reserved += reserved;
    acc.sold += Math.max(total - quantity, 0);
    return acc;
  }, { total: 0, available: 0, reserved: 0, sold: 0 }), [active]);

  return <>
    <PageHeader eyebrow="Seller workspace" title="Inventory" description="See exactly how much of each approved credit listing is available, reserved, and sold." />
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Total inventory" value={`${summary.total.toLocaleString("en-IN")} MT`} description="Original approved quantity" accent />
      <StatCard label="Available" value={`${summary.available.toLocaleString("en-IN")} MT`} description="Currently available to buyers" />
      <StatCard label="Reserved" value={`${summary.reserved.toLocaleString("en-IN")} MT`} description="Held for active deals" />
      <StatCard label="Sold" value={`${summary.sold.toLocaleString("en-IN")} MT`} description={`${deals.filter((deal) => deal.status === "completed").length} completed deal(s)`} />
    </div>
    <Card className="overflow-hidden">
      <div className="border-b border-[#E5EAF0] px-5 py-4"><h2 className="font-semibold text-[#101828]">Inventory by listing</h2><p className="mt-1 text-xs text-[#667085]">Reserved quantity cannot be accidentally sold twice.</p></div>
      {active.length === 0 ? <div className="py-16 text-center text-sm text-[#667085]">No active inventory yet. Approved listings will appear here.</div> : <div className="overflow-x-auto"><Table headers={["Credit","Total","Available","Reserved","Sold","Price / MT","Status"]}>{active.map((listing) => { const total=Number(listing.totalQuantity ?? listing.quantity ?? 0); const quantity=Number(listing.quantity||0); const reserved=Number(listing.reservedQuantity||0); return <Tr key={listing._id}><Td><span className="font-semibold">{listing.category}</span><span className="block text-[11px] text-[#98A2B3]">{listing.location}</span></Td><Td>{total.toLocaleString("en-IN")} MT</Td><Td><span className="font-semibold text-[#2E7D32]">{Math.max(quantity-reserved,0).toLocaleString("en-IN")} MT</span></Td><Td>{reserved.toLocaleString("en-IN")} MT</Td><Td>{Math.max(total-quantity,0).toLocaleString("en-IN")} MT</Td><Td>₹{Number(listing.price||0).toLocaleString("en-IN")}</Td><Td><Badge label="Active" /></Td></Tr>; })}</Table></div>}
    </Card>
  </>;
}
export default SellerInventorySection;
