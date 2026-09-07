import { useEffect, useMemo, useState } from "react";
import api from "../services/api.js";
import { Badge, Button, Card, EmptyState, Input, Select, Textarea } from "./ui";

const REASONS = [
  ["payment", "Payment issue"],
  ["quantity", "Quantity mismatch"],
  ["quality_or_compliance", "Quality / compliance"],
  ["delivery_or_transfer", "Delivery / transfer"],
  ["documentation", "Documentation"],
  ["communication", "Communication"],
  ["other", "Other"],
];

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under review",
  waiting_buyer: "Waiting for buyer",
  waiting_seller: "Waiting for seller",
  escalated: "Escalated",
  resolved: "Resolved",
  rejected: "Rejected",
};

const reasonLabel = (reason) =>
  REASONS.find(([value]) => value === reason)?.[1] || String(reason || "Other");

const statusVariant = (status) => {
  if (status === "resolved") return "completed";
  if (status === "rejected") return "rejected";
  if (status === "escalated") return "pending";
  if (status === "under_review") return "discussion";
  return "open";
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN") : "—";

function DisputeForm({ deal, onCreated, onCancel }) {
  const [reason, setReason] = useState("payment");
  const [description, setDescription] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (description.trim().length < 20) {
      setError("Please describe the issue in at least 20 characters.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const response = await api.post(`/disputes/deal/${deal._id}`, {
        reason,
        description: description.trim(),
        evidenceNote: evidenceNote.trim(),
      });
      onCreated(response.data?.dispute);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to open the dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-[#F6D5A5] bg-[#FFFCF5] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
            Raise a dispute
          </p>
          <h3 className="mt-1 font-heading text-lg font-semibold text-[#0F1923]">
            Tell us what went wrong
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#667085]">
            EPR Nexuss will review the transaction. Opening a dispute does not
            automatically change payment, inventory or deal status.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-[#667085] hover:bg-white"
          aria-label="Close dispute form"
        >
          ×
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Select
          label="Reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={REASONS.map(([value, label]) => ({ value, label }))}
        />
        <Input label="Deal" value={`#${String(deal._id).slice(-8)}`} readOnly />
      </div>
      <div className="mt-4">
        <Textarea
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explain the issue, what you expected, and what outcome you need."
          maxLength={5000}
          className="min-h-[130px]"
        />
      </div>
      <div className="mt-4">
        <Textarea
          label="Evidence / supporting details (optional)"
          value={evidenceNote}
          onChange={(event) => setEvidenceNote(event.target.value)}
          placeholder="Add document names, transaction references or other useful evidence details."
          maxLength={3000}
          className="min-h-[90px]"
        />
      </div>
      {error ? <p className="mt-3 text-xs text-[#B42318]">{error}</p> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Opening…" : "Open dispute"}
        </Button>
      </div>
    </Card>
  );
}

function DisputeDetails({ dispute, role, onUpdated }) {
  const [message, setMessage] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [responding, setResponding] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");

  const waitingForMe =
    (role === "buyer" && dispute.status === "waiting_buyer") ||
    (role === "seller" && dispute.status === "waiting_seller");

  const canRespond =
    !["resolved", "rejected"].includes(dispute.status) &&
    (waitingForMe ||
      ["open", "under_review", "escalated"].includes(dispute.status));

  const downloadEvidence = async (document) => {
    const documentId = document?._id;
    if (!documentId || !dispute?._id) return;
    try {
      setDownloadingId(String(documentId));
      setError("");
      const response = await api.get(
        `/disputes/${dispute._id}/evidence/${documentId}/download`,
        { responseType: "blob" },
      );
      const blobUrl = URL.createObjectURL(response.data);
      const anchor = window.document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = document.fileName || "evidence-document";
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to open the evidence document.");
    } finally {
      setDownloadingId("");
    }
  };

  const respond = async () => {
    if (message.trim().length < 10) {
      setError("Please provide at least 10 characters.");
      return;
    }
    try {
      setResponding(true);
      setError("");
      const response = await api.patch(`/disputes/${dispute._id}/respond`, {
        message: message.trim(),
        evidenceNote: evidenceNote.trim(),
      });
      setMessage("");
      setEvidenceNote("");
      onUpdated(response.data?.dispute);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add the response.");
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Dispute #{String(dispute._id).slice(-8)}
            </p>
            <h3 className="mt-1 font-heading text-lg font-semibold text-[#0F1923]">
              {reasonLabel(dispute.reason)}
            </h3>
            <p className="mt-1 text-xs text-[#667085]">
              Opened {formatDate(dispute.createdAt)} by{" "}
              {dispute.openedBy?.company ||
                dispute.openedBy?.name ||
                dispute.openedByRole}
            </p>
          </div>
          <Badge
            label={STATUS_LABELS[dispute.status] || dispute.status}
            variant={statusVariant(dispute.status)}
          />
        </div>
        <div className="mt-4 rounded-xl bg-[#F7F9FB] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#98A2B3]">
            Issue
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475467]">
            {dispute.description}
          </p>
        </div>
        {dispute.resolution ? (
          <div className="mt-4 rounded-xl border border-[#CFE8D1] bg-[#F5FBF6] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#3E8E43]">
              Resolution
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52705A]">
              {dispute.resolution}
            </p>
            {dispute.resolvedAt ? (
              <p className="mt-2 text-[11px] text-[#7A907F]">
                Closed {formatDate(dispute.resolvedAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
              Evidence & responses
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              Keep the case factual and inside EPR Nexuss.
            </p>
          </div>
          <Badge label={`${dispute.evidence?.length || 0} entries`} />
        </div>
        <div className="mt-4 space-y-3">
          {(dispute.evidence || []).length === 0 ? (
            <p className="text-sm text-[#98A2B3]">
              No supporting entries have been added yet.
            </p>
          ) : (
            dispute.evidence.map((entry) => (
              <div
                key={entry._id}
                className="rounded-xl border border-[#E5EAF0] bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#344054]">
                    {entry.addedBy?.company ||
                      entry.addedBy?.name ||
                      "Participant"}
                  </p>
                  <p className="text-[10px] text-[#98A2B3]">
                    {formatDate(entry.addedAt)}
                  </p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#475467]">
                  {entry.note || "Evidence attached"}
                </p>
                {entry.documentId?.fileName ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-[#2E7D32]">
                      Document: {entry.documentId.fileName}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadEvidence(entry.documentId)}
                      disabled={downloadingId === String(entry.documentId._id)}
                    >
                      {downloadingId === String(entry.documentId._id) ? "Opening…" : "Open document"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      {canRespond ? (
        <Card className="border-[#E5EAF0]">
          <p className="text-sm font-semibold text-[#344054]">
            Add your response
          </p>
          {waitingForMe ? (
            <p className="mt-1 text-xs text-[#667085]">
              The case is waiting for your response.
            </p>
          ) : null}
          <Textarea
            className="mt-3 min-h-[110px]"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Add a factual response to the dispute."
            maxLength={5000}
          />
          <Textarea
            className="mt-3 min-h-[80px]"
            value={evidenceNote}
            onChange={(event) => setEvidenceNote(event.target.value)}
            placeholder="Optional supporting evidence details"
            maxLength={3000}
          />
          {error ? (
            <p className="mt-2 text-xs text-[#B42318]">{error}</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button onClick={respond} disabled={responding || !message.trim()}>
              {responding ? "Sending…" : "Add response"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function DisputePanel({ deal, role }) {
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/disputes/deal/${deal._id}`);
      setDispute(response.data?.dispute || null);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load dispute information.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deal?._id) load();
  }, [deal?._id]);

  if (loading)
    return (
      <Card>
        <div className="py-12 text-center text-sm text-[#98A2B3]">
          Loading dispute information…
        </div>
      </Card>
    );
  if (error)
    return (
      <Card>
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-[#344054]">
            Dispute information unavailable
          </p>
          <p className="mt-1 text-xs text-[#98A2B3]">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      </Card>
    );

  if (!dispute && !opening) {
    return (
      <Card className="border-[#E5EAF0] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
          Transaction support
        </p>
        <h3 className="mt-1 font-heading text-xl font-semibold text-[#0F1923]">
          Need help with this deal?
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
          Open a dispute if there is a material issue with payment, quantity,
          compliance, transfer, documentation or another transaction matter.
        </p>
        <Button className="mt-5" onClick={() => setOpening(true)}>
          Raise a dispute
        </Button>
      </Card>
    );
  }

  if (opening) {
    return (
      <DisputeForm
        deal={deal}
        onCancel={() => setOpening(false)}
        onCreated={(created) => {
          setDispute(created);
          setOpening(false);
        }}
      />
    );
  }

  return (
    <DisputeDetails dispute={dispute} role={role} onUpdated={setDispute} />
  );
}

export function DisputesPage({ role = "buyer" }) {
  const [disputes, setDisputes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminAction, setAdminAction] = useState({
    status: "under_review",
    resolution: "",
  });
  const [savingAdmin, setSavingAdmin] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get(
        `/disputes${status !== "all" ? `?status=${status}` : ""}`,
      );
      const next = response.data?.disputes || [];
      setDisputes(next);
      setSelectedId((current) =>
        next.some((item) => item._id === current)
          ? current
          : next[0]?._id || null,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load disputes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const selected = useMemo(
    () => disputes.find((item) => item._id === selectedId) || null,
    [disputes, selectedId],
  );

  const updateAdmin = async () => {
    if (!selected) return;
    if (
      ["resolved", "rejected"].includes(adminAction.status) &&
      !adminAction.resolution.trim()
    )
      return;
    try {
      setSavingAdmin(true);
      const response = await api.patch(
        `/disputes/${selected._id}/status`,
        adminAction,
      );
      setDisputes((current) =>
        current.map((item) =>
          item._id === selected._id ? response.data?.dispute : item,
        ),
      );
      setAdminAction({ status: "under_review", resolution: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update the dispute.");
    } finally {
      setSavingAdmin(false);
    }
  };

  if (loading)
    return (
      <Card>
        <div className="py-16 text-center text-sm text-[#98A2B3]">
          Loading disputes…
        </div>
      </Card>
    );
  if (error && disputes.length === 0)
    return (
      <Card>
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-[#344054]">
            Disputes unavailable
          </p>
          <p className="mt-1 text-xs text-[#98A2B3]">{error}</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#98A2B3]">
            Transaction support
          </p>
          <h2 className="mt-1 font-heading text-2xl font-semibold text-[#0F1923]">
            Disputes & Resolution
          </h2>
          <p className="mt-1 text-sm text-[#667085]">
            Track transaction issues and keep all responses inside EPR Nexuss.
          </p>
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "all", label: "All statuses" },
            ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          className="min-w-[180px]"
        />
      </div>

      {disputes.length === 0 ? (
        <Card>
          <EmptyState
            title="No disputes"
            desc={
              role === "admin"
                ? "There are no disputes in the selected status."
                : "Your transaction history has no disputes in the selected status."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="h-fit p-2">
            <div className="space-y-1">
              {disputes.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedId(item._id)}
                  className={`w-full rounded-xl p-3 text-left transition ${selectedId === item._id ? "bg-[#EBF8EC]" : "hover:bg-[#F7F9FB]"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#344054]">
                      #{String(item._id).slice(-8)}
                    </p>
                    <Badge
                      label={STATUS_LABELS[item.status] || item.status}
                      variant={statusVariant(item.status)}
                    />
                  </div>
                  <p className="mt-1 truncate text-xs text-[#667085]">
                    {reasonLabel(item.reason)}
                  </p>
                  <p className="mt-2 text-[10px] text-[#98A2B3]">
                    {formatDate(item.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          {selected ? (
            <div className="space-y-4">
              <DisputeDetails
                dispute={selected}
                role={role}
                onUpdated={(updated) =>
                  setDisputes((current) =>
                    current.map((item) =>
                      item._id === updated._id ? updated : item,
                    ),
                  )
                }
              />
              {role === "admin" &&
              !["resolved", "rejected"].includes(selected.status) ? (
                <Card className="border-[#D9E1E8] p-5 sm:p-6">
                  <p className="text-sm font-semibold text-[#344054]">
                    Admin case action
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Select
                      value={adminAction.status}
                      onChange={(event) =>
                        setAdminAction((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      options={[
                        { value: "under_review", label: "Under review" },
                        { value: "waiting_buyer", label: "Waiting for buyer" },
                        {
                          value: "waiting_seller",
                          label: "Waiting for seller",
                        },
                        { value: "escalated", label: "Escalated" },
                        { value: "resolved", label: "Resolved" },
                        { value: "rejected", label: "Rejected" },
                      ]}
                    />
                    <Textarea
                      value={adminAction.resolution}
                      onChange={(event) =>
                        setAdminAction((current) => ({
                          ...current,
                          resolution: event.target.value,
                        }))
                      }
                      placeholder="Resolution / case notes. Required when resolving or rejecting."
                      maxLength={5000}
                      className="min-h-[90px]"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button onClick={updateAdmin} disabled={savingAdmin}>
                      {savingAdmin ? "Saving…" : "Update case"}
                    </Button>
                  </div>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
