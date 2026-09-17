import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api.js";
import { CREDIT_TYPES } from "../data/mock.js";
import { INDIAN_LOCATIONS } from "../constants/indianStates.js";
import { Badge, Button, Card, CreditTypeAvatar, Input, Select, Table, Tr, Td, Textarea } from "./ui.jsx";

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const statusLabel = (status) =>
  ({
    pending_review: "Pending Review",
    active: "Active",
    paused: "Paused",
    rejected: "Rejected",
    expired: "Expired",
    sold: "Sold",
    cancelled: "Removed",
  })[status] || status;

function ListingEditModal({ listing, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    type: listing?.category || "",
    quantity: String(listing?.quantity ?? ""),
    price: String(listing?.price ?? ""),
    location: listing?.location || "",
    complianceYear: listing?.complianceYear || "",
    validTill: formatDateInput(listing?.validTill),
    description: listing?.description || "",
  }));

  if (!listing) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (!form.type || !form.quantity || Number(form.quantity) <= 0 || !form.price || Number(form.price) <= 0 || !form.location || !form.complianceYear || !form.validTill) {
      toast.error("Please complete all required listing fields.");
      return;
    }
    if (new Date(form.validTill) < new Date()) {
      toast.error("Valid till date must be in the future.");
      return;
    }
    setSaving(true);
    try {
      const response = await api.patch(`/listings/${listing._id}`, {
        category: form.type,
        quantity: Number(form.quantity),
        price: Number(form.price),
        location: form.location.trim(),
        complianceYear: form.complianceYear.trim(),
        validTill: form.validTill,
        description: form.description.trim(),
      });
      if (response.data.success) {
        toast.success("Listing updated successfully.");
        onSaved(response.data.listing);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0F1923]/55 px-4 py-6" role="dialog" aria-modal="true" aria-label="Edit listing">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5EAF0] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E5EAF0] bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Seller listing</p>
            <h2 className="mt-1 text-xl font-bold text-[#101828]">Edit {listing.category} listing</h2>
            <p className="mt-1 text-xs text-[#667085]">Update commercial and listing details without changing the existing verification document.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#667085] hover:bg-[#F2F4F7]" aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Credit Type *" options={CREDIT_TYPES.map((type) => ({ label: type, value: type }))} value={form.type} onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))} />
            <Input label="Quantity (MT) *" type="number" min="0.01" step="any" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))} />
            <Input label="Price (₹/MT) *" type="number" min="0.01" step="any" value={form.price} onChange={(e) => setForm((current) => ({ ...current, price: e.target.value }))} />
            <Select
              label="Location (State) *"
              options={INDIAN_LOCATIONS.map((state) => ({ label: state, value: state }))}
              placeholder="Select state"
              value={form.location}
              onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
            />
            <Input label="Compliance Year *" value={form.complianceYear} onChange={(e) => setForm((current) => ({ ...current, complianceYear: e.target.value }))} />
            <Input label="Valid Till *" type="date" value={form.validTill} onChange={(e) => setForm((current) => ({ ...current, validTill: e.target.value }))} />
          </div>
          <Textarea label="Description" rows={4} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Add useful details buyers should know..." />
          {(Number(listing.reservedQuantity || 0) > 0 || Number(listing.totalQuantity ?? listing.quantity ?? 0) > Number(listing.quantity || 0)) && (
            <div className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-3 text-xs leading-5 text-[#92400E]">
              Some inventory is already reserved or consumed. The current backend protects historical inventory from quantity changes in that situation.
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ListingActions({ listing, onEdit, onStatusChange, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const canManage = ["active", "paused"].includes(listing.status);
  const isActive = listing.status === "active";
  const isPaused = listing.status === "paused";
  const canRemove = canManage && Number(listing.reservedQuantity || 0) === 0;

  if (!canManage) {
    return (
      <Button size="xs" variant="outline" onClick={() => onDuplicate(listing)}>
        Duplicate
      </Button>
    );
  }

  return (
    <div className="relative flex items-center justify-end gap-2">
      <Button size="xs" variant="outline" onClick={() => onEdit(listing)}>Edit</Button>
      <div className="relative">
        <Button size="xs" variant="ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open}>More ▾</Button>
        {open && (
          <>
            <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Close menu" />
            <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[#E5EAF0] bg-white p-1 shadow-xl">
              {isActive && <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]" onClick={() => { setOpen(false); onStatusChange(listing, "paused"); }}>Pause listing</button>}
              {isPaused && <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#2E7D32] hover:bg-[#EBF8EC]" onClick={() => { setOpen(false); onStatusChange(listing, "active"); }}>Resume listing</button>}
              {canRemove ? <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#B42318] hover:bg-[#FEF2F2]" onClick={() => { setOpen(false); onStatusChange(listing, "cancelled"); }}>Remove listing</button> : <p className="px-3 py-2 text-[11px] leading-4 text-[#98A2B3]">Cannot remove while inventory is reserved.</p>}
              <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7]" onClick={() => { setOpen(false); onDuplicate(listing); }}>Duplicate listing</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SellerListingsSection({ listings, loading, error, onRefresh, onNavigate }) {
  const [editing, setEditing] = useState(null);
  const [workingId, setWorkingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    all: listings.length,
    active: listings.filter((item) => item.status === "active").length,
    pending: listings.filter((item) => item.status === "pending_review").length,
    paused: listings.filter((item) => item.status === "paused").length,
    closed: listings.filter((item) => ["sold", "cancelled", "expired", "rejected"].includes(item.status)).length,
  }), [listings]);

  const visible = useMemo(() => listings.filter((listing) => {
    const bucket = filter === "closed" ? ["sold", "cancelled", "expired", "rejected"].includes(listing.status) : filter === "all" ? true : filter === "pending" ? listing.status === "pending_review" : listing.status === filter;
    if (!bucket) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [listing.category, listing.location, listing.complianceYear, listing.status, listing._id].filter(Boolean).join(" ").toLowerCase().includes(q);
  }), [listings, filter, query]);

  const handleStatus = async (listing, status) => {
    const action = status === "cancelled" ? "remove" : status === "paused" ? "pause" : "resume";
    const message = status === "cancelled" ? `Remove ${listing.category} listing? It will no longer appear in the marketplace.` : status === "paused" ? `Pause ${listing.category} listing? Buyers will no longer see it as active.` : `Resume ${listing.category} listing?`;
    if (!window.confirm(message)) return;
    setWorkingId(listing._id);
    try {
      const response = await api.patch(`/listings/${listing._id}/status`, { status });
      if (response.data.success) {
        toast.success(`Listing ${action}d successfully.`);
        await onRefresh();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to ${action} listing.`);
    } finally {
      setWorkingId(null);
    }
  };

  const duplicate = (listing) => {
    const document = listing.documentId || {};
    const draft = {
      type: listing.category || "",
      quantity: listing.quantity ?? "",
      price: listing.price ?? "",
      location: listing.location || "",
      year: listing.complianceYear || "",
      validTill: formatDateInput(listing.validTill),
      description: listing.description || "",
      certificateNumber: document.certificateNumber || "",
      sourcePortal: document.sourcePortal || "",
      certificateQuantity: document.certificateQuantity ?? listing.quantity ?? "",
      certificateIssuedDate: formatDateInput(document.certificateIssuedDate),
      certificateValidTill: formatDateInput(document.certificateValidTill || listing.validTill),
    };
    sessionStorage.setItem("epr_listing_duplicate_draft", JSON.stringify(draft));
    toast.info("Listing details copied. Please upload the proof document again before submitting.");
    onNavigate("add-listing");
  };

  const handleSaved = async () => {
    setEditing(null);
    await onRefresh();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-[#E5EAF0] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="font-semibold text-[#0F1923]">My Listings</h2><p className="mt-1 text-xs text-[#667085]">Edit, pause, resume, duplicate or remove your own listings.</p></div>
            <Button size="sm" onClick={() => onNavigate("add-listing")}>+ Add Listing</Button>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search category, location or listing ID..." className="w-full rounded-lg border border-[#DCE3EA] bg-white px-3 py-2 text-sm outline-none focus:border-[#5AC361] md:max-w-sm" />
            <div className="flex flex-wrap gap-2">{[["all","All"],["active","Active"],["pending","Pending"],["paused","Paused"],["closed","Closed"]].map(([key,label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === key ? "bg-[#101828] text-white" : "bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]"}`}>{label} <span className="ml-1 opacity-70">{counts[key]}</span></button>)}</div>
          </div>
        </div>
        {loading ? <div className="py-16 text-center text-sm text-[#667085]">Loading your listings...</div> : error ? <div className="py-16 text-center"><p className="text-sm font-semibold text-[#B42318]">{error}</p><Button className="mt-3" size="sm" variant="outline" onClick={onRefresh}>Retry</Button></div> : visible.length === 0 ? <div className="py-16 text-center text-sm text-[#667085]">No listings match this filter.</div> : (
          <div className="overflow-x-auto">
            <Table headers={["Credit Type","Inventory","Price (₹/MT)","Location","Year","Valid Till","Status","Actions"]}>
              {visible.map((listing) => {
                const total = Number(listing.totalQuantity ?? listing.quantity ?? 0);
                const quantity = Number(listing.quantity || 0);
                const reserved = Number(listing.reservedQuantity || 0);
                const available = Math.max(quantity - reserved, 0);
                const sold = Math.max(total - quantity, 0);
                return <Tr key={listing._id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <CreditTypeAvatar type={listing.category} size="sm" />
                      <div>
                        <span className="font-semibold text-[#101828]">{listing.category}</span>
                        <span className="mt-0.5 block text-[11px] text-[#98A2B3]">#{String(listing._id).slice(-8)}</span>
                      </div>
                    </div>
                  </Td>
                  <Td><div className="text-xs"><span className="font-semibold text-[#101828]">{available.toLocaleString("en-IN")} MT available</span><span className="mt-0.5 block text-[#98A2B3]">{reserved.toLocaleString("en-IN")} reserved · {sold.toLocaleString("en-IN")} sold</span></div></Td>
                  <Td>₹{Number(listing.price || 0).toLocaleString("en-IN")}</Td>
                  <Td>{listing.location || "—"}</Td>
                  <Td>{listing.complianceYear || "—"}</Td>
                  <Td>{listing.validTill ? new Date(listing.validTill).toLocaleDateString("en-IN") : "—"}</Td>
                  <Td><Badge label={statusLabel(listing.status)} /></Td>
                  <Td>{workingId === listing._id ? <span className="text-xs text-[#667085]">Updating...</span> : <ListingActions listing={listing} onEdit={setEditing} onStatusChange={handleStatus} onDuplicate={duplicate} />}</Td>
                </Tr>;
              })}
            </Table>
          </div>
        )}
      </Card>
      {editing && <ListingEditModal listing={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </>
  );
}

export default SellerListingsSection;
