import { useEffect, useRef, useState } from "react";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button } from "./ui.jsx";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
};

export function NotificationBell({ compact = false, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications?limit=30");
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(Number(response.data.unreadCount || 0));
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((items) => items.map((item) => item._id === id ? { ...item, read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleNotificationAction = async (item) => {
    await markRead(item._id);
    setOpen(false);

    if (!onNavigate) return;

    const type = String(item.type || "").toLowerCase();
    const entityId = item.entityId;

    if (item.entityType === "deal" && entityId) {
      if (user?.role === "buyer") {
        onNavigate("deal-room", entityId);
      }
      return;
    }

    if (item.entityType === "request") {
      onNavigate("dashboard-section", "requests");
      return;
    }

    if (item.entityType === "listing") {
      onNavigate("dashboard-section", "listings");
      return;
    }

    if (item.entityType === "requirement" || type.includes("requirement")) {
      onNavigate("dashboard-section", "requirements");
      return;
    }

    if (item.entityType === "kyc" || type.startsWith("kyc_")) {
      onNavigate("verification");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Notifications" onClick={() => { setOpen((value) => !value); if (!open) fetchNotifications(); }} className={`${compact ? "w-9 h-9" : "w-10 h-10"} rounded-full border border-[#E5EAF0] bg-white hover:bg-[#F7F9FB] flex items-center justify-center relative`}>
        <svg className="w-5 h-5 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17H9.143m8.571 0H6.286m11.428 0a2.286 2.286 0 002.286-2.286v-3.428a8 8 0 10-16 0v3.428A2.286 2.286 0 006.286 17m10.286 0a4.571 4.571 0 01-9.143 0" /></svg>
        {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-[#E5EAF0] rounded-2xl shadow-2xl z-[80] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5EAF0] flex items-center justify-between"><div><p className="font-semibold text-[#0F1923]">Notifications</p><p className="text-[11px] text-[#9CA3AF]">Important account and marketplace updates</p></div>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#3EA646] hover:underline">Mark all read</button>}</div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && !notifications.length ? <div className="px-5 py-10 text-center text-sm text-[#6B7280]">Loading notifications...</div> : !notifications.length ? <div className="px-5 py-10 text-center"><p className="text-sm font-medium text-[#374151]">No notifications</p><p className="text-xs text-[#9CA3AF] mt-1">You're all caught up.</p></div> : notifications.map((item) => (
              <div key={item._id} className={`px-4 py-3 border-b border-[#F0F4F8] hover:bg-[#F8FAFC] ${!item.read ? "bg-[#F0FBF1]" : "bg-white"}`}>
                <button type="button" onClick={() => markRead(item._id)} className="w-full text-left">
                  <div className="flex gap-3"><div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${item.read ? "bg-[#CBD5E1]" : "bg-[#5AC361]"}`} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#0F1923]">{item.title}</p><span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{formatTime(item.createdAt)}</span></div><p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{item.message}</p></div></div>
                </button>
                {onNavigate && !(item.entityType === "deal" && user?.role === "seller") && (
                  <button
                    type="button"
                    onClick={() => handleNotificationAction(item)}
                    className="ml-5 mt-2 text-xs font-bold text-[#3EA646] hover:underline"
                  >
                    {item.entityType === "deal"
                      ? "Open Deal Room →"
                      : item.entityType === "request"
                      ? "Open request →"
                      : item.entityType === "listing"
                      ? "Open listings →"
                      : item.entityType === "kyc"
                      ? "Open verification →"
                      : item.entityType === "requirement" || String(item.type || "").includes("requirement")
                      ? "View requirements →"
                      : "View update →"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminProfileMenu({ onNavigate, compact = false }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    onNavigate?.("home");
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Account menu" className={`${compact ? "px-2" : "px-2.5"} py-1.5 rounded-lg hover:bg-[#F7F9FB] flex items-center gap-2`}>
        <span className="w-8 h-8 rounded-full bg-[#EBF8EC] text-[#2E7D32] flex items-center justify-center text-xs font-bold">{(user?.name || "A").slice(0, 1).toUpperCase()}</span>
        <span className="hidden sm:block text-sm font-semibold text-[#374151] max-w-28 truncate">{user?.name || "Admin"}</span>
        <svg className="w-4 h-4 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5EAF0] rounded-xl shadow-xl z-[90] overflow-hidden p-2">
          <button type="button" onClick={handleLogout} className="w-full py-2.5 text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-lg text-sm font-semibold">Logout</button>
        </div>
      )}
    </div>
  );
}

export function ProfileMenu({ onNavigate, compact = false }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setOpen(false);
    onNavigate?.("home");
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Account menu" className={`${compact ? "px-2" : "px-2.5"} py-1.5 rounded-lg hover:bg-[#F7F9FB] transition-colors flex items-center gap-2 max-w-52`}>
        <span className="w-7 h-7 rounded-full bg-[#EBF8EC] text-[#2E7D32] flex items-center justify-center text-xs font-bold">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
        <span className="hidden sm:block text-sm font-semibold text-[#374151] truncate">{user?.name || "User"}</span>
        <svg className="w-4 h-4 text-[#9CA3AF]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5EAF0] rounded-xl shadow-xl z-[80] overflow-hidden p-2">
          <button type="button" onClick={handleLogout} className="w-full py-2.5 text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-lg text-sm font-semibold">Logout</button>
        </div>
      )}
    </div>
  );
}

const getVerificationStatus = (user) => {
  if (!user?.emailVerified) {
    return { label: "Email verification pending", detail: "Your email address has not been verified yet.", tone: "yellow" };
  }
  return { label: "Email verified", detail: "Your email address is verified.", tone: "green" };
};

const getDocumentStatus = (user) => {
  const status = String(user?.kycStatus || "").toLowerCase();
  if (status === "approved") return { label: "Documents verified", detail: "Your business verification documents have been approved.", tone: "green" };
  if (status === "rejected") return { label: "Documents rejected", detail: user?.kycRejectionReason || "Your verification documents need to be submitted again.", tone: "red" };
  if (user?.kycSubmittedAt || status === "pending" || status === "submitted") return { label: "Documents under review", detail: "Your verification documents are waiting for admin review.", tone: "yellow" };
  return { label: "Documents not verified", detail: "Submit your verification documents to activate marketplace trading.", tone: "yellow" };
};

const profileTone = {
  green: "border-[#A5D6A7] bg-[#EBF8EC] text-[#2E7D32]",
  yellow: "border-[#FCD34D] bg-[#FFFBEB] text-[#92400E]",
  red: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
};

export function ProfileSection({ onNavigate }) {
  const { user, refreshUser, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [company, setCompany] = useState(user?.company || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setCompany(user?.company || "");
  }, [user?.name, user?.phone, user?.company]);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, []);

  const emailStatus = getVerificationStatus(user);
  const documentStatus = getDocumentStatus(user);

  const save = async () => {
    const nextName = name.trim();
    const nextPhone = phone.trim();
    const nextCompany = company.trim();
    if (!nextName || !nextPhone) return;
    try {
      setSaving(true);
      setError("");
      await updateProfile({ name: nextName, phone: nextPhone, company: nextCompany });
      setEditing(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">Account</p>
        <h2 className="mt-1 font-heading text-xl font-semibold text-[#101828]">Profile</h2>
        <p className="mt-1 text-sm text-[#667085]">View and update your account details and verification status. Email and security status remain protected.</p>
      </div>

      {error && <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">{error}</div>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#EAECF0] bg-[#FCFCFD] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF8EC] text-lg font-bold text-[#2E7D32]">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="text-base font-semibold text-[#101828]">{user?.name || "User"}</p>
              <p className="mt-0.5 text-xs capitalize text-[#667085]">{user?.role || "user"} account</p>
            </div>
          </div>
          {!editing && <Button size="sm" variant="outline" onClick={() => { setError(""); setEditing(true); }}>Edit profile</Button>}
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} disabled={!editing} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm text-[#344054] outline-none focus:border-[#5AC361] disabled:bg-[#F8FAFC] disabled:text-[#475467]" />
            <span className="mt-1 block text-[11px] text-[#98A2B3]">Name, phone and company can be updated. Email changes require a separate verified email-change flow.</span>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} disabled={!editing} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm text-[#344054] outline-none focus:border-[#5AC361] disabled:bg-[#F8FAFC] disabled:text-[#475467]" />
          </label>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">Email</span>
            <div className="mt-1.5 break-all rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm text-[#475467]">{user?.email || "—"}</div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3]">Company</span>
            <input value={company} onChange={(event) => setCompany(event.target.value)} disabled={!editing} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-sm text-[#344054] outline-none focus:border-[#5AC361] disabled:bg-[#F8FAFC] disabled:text-[#475467]" />
          </label>

          {editing && <div className="md:col-span-2 flex gap-2 border-t border-[#EAECF0] pt-4">
            <Button size="sm" variant="outline" onClick={() => { setName(user?.name || ""); setPhone(user?.phone || ""); setCompany(user?.company || ""); setEditing(false); setError(""); }}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving || !name.trim() || !phone.trim()}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={`border ${profileTone[emailStatus.tone]}`}>
          <div className="flex items-start gap-3 p-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold">{emailStatus.tone === "green" ? "✓" : "!"}</div>
            <div><p className="text-sm font-semibold">{emailStatus.label}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{emailStatus.detail}</p></div>
          </div>
        </Card>

        <Card className={`border ${profileTone[documentStatus.tone]}`}>
          <div className="flex items-start gap-3 p-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-sm font-bold">{documentStatus.tone === "green" ? "✓" : "!"}</div>
            <div className="min-w-0"><p className="text-sm font-semibold">{documentStatus.label}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{documentStatus.detail}</p>
              {documentStatus.tone !== "green" && onNavigate && <button type="button" onClick={() => onNavigate("verification")} className="mt-2 text-xs font-bold underline">{documentStatus.tone === "red" ? "Open verification" : "Open verification"} →</button>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

