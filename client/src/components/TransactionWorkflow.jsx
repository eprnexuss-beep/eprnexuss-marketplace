import React from "react";

const buyerRequestStages = [
  { key: "request", label: "Request" },
  { key: "quotation", label: "Quotation" },
  { key: "deal", label: "Deal Room" },
  { key: "payment", label: "Payment" },
  { key: "completed", label: "Completed" },
];

const dealStages = buyerRequestStages;

function getRequestState(request, deal) {
  if (deal) return { type: "deal", stage: getDealStage(deal) };

  if (["rejected", "cancelled"].includes(String(request?.status || "").toLowerCase())) {
    return { type: "terminal", stage: "request" };
  }

  if (request?.offer?.acceptedAt) {
    return { type: "request", stage: "deal" };
  }

  if (request?.offer?.finalAmount != null) {
    return { type: "request", stage: "quotation" };
  }

  return { type: "request", stage: "request" };
}

function getDealStage(deal) {
  if (deal?.status === "completed") return "completed";

  const paymentStatus = String(deal?.paymentStatus || "pending").toLowerCase();
  if (["initiated", "received"].includes(paymentStatus)) return "payment";

  if (deal?.status === "payment_coordination") return "payment";
  return "deal";
}

function StageStrip({ currentStage, terminal = false }) {
  const stages = dealStages;
  const currentIndex = stages.findIndex((item) => item.key === currentStage);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {stages.map((stage, index) => {
        const done = !terminal && currentIndex >= index;
        const current = !terminal && currentIndex === index;

        return (
          <React.Fragment key={stage.key}>
            <div
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${
                done
                  ? "bg-[#5AC361] text-white"
                  : "border border-[#E5EAF0] bg-white text-[#98A2B3]"
              } ${current ? "ring-2 ring-[#5AC361]/15" : ""}`}
            >
              <span>
                {done && !current ? "✓" : index + 1}
              </span>
              {stage.label}
            </div>
            {index < stages.length - 1 ? (
              <div
                className={`h-0.5 w-4 shrink-0 ${
                  !terminal && currentIndex > index
                    ? "bg-[#5AC361]"
                    : "bg-[#DDE3EA]"
                }`}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function TransactionWorkflow({
  request = null,
  deal = null,
  role = "buyer",
  onNext,
  compact = false,
}) {
  const state = getRequestState(request, deal);
  const isCancelled = state.type === "terminal";

  let title = "Next step";
  let description = "Your request has been submitted. EPR Nexuss will guide the transaction from here.";
  let actionLabel = null;

  if (isCancelled) {
    title = "No further action";
    description = "This request is no longer active.";
  } else if (state.stage === "request") {
    title = "Next: Wait for your quotation";
    description =
      "Your request is with EPR Nexuss. We'll notify you when a quotation is ready.";
  } else if (state.stage === "quotation") {
    title = "Next: Accept the quotation";
    description =
      "Review the commercial terms below and accept the quotation to create your Deal Room.";
    actionLabel = role === "buyer" ? "Accept quotation →" : null;
  } else if (state.stage === "deal") {
    title = "Next: Complete the Deal Room";
    description =
      role === "buyer"
        ? "Open the Deal Room to review the transaction and continue to Payment & Invoice."
        : "Open the Deal Room to review the transaction and coordinate with EPR Nexuss.";
    actionLabel = "Open Deal Room →";
  } else if (state.stage === "payment") {
    title =
      role === "buyer" ? "Next: Complete payment details" : "Payment in progress";
    description =
      role === "buyer"
        ? "Open Payment & Invoice, choose your payment method, and enter your UTR or transaction reference."
        : "Payment has moved to coordination. EPR Nexuss will update you when confirmation is complete.";
    actionLabel = role === "buyer" ? "Go to Payment →" : "Open Deal Room →";
  } else if (state.stage === "completed") {
    title = "Deal completed";
    description =
      role === "buyer"
        ? "This transaction is complete. You can review the deal and leave a rating."
        : "This transaction is complete. You can review the buyer and view the final deal record.";
    actionLabel = "View Deal Room →";
  }

  const handleAction = () => {
    if (typeof onNext === "function") onNext(state.stage, state);
  };

  return (
    <div
      className={`rounded-xl border ${
        state.stage === "completed"
          ? "border-[#B7DFC0] bg-[#F6FCF7]"
          : "border-[#DCE8DE] bg-[#F8FCF8]"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6B7280]">
            Transaction journey
          </p>
          <p className="mt-1 text-sm font-semibold text-[#101828]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#667085]">{description}</p>
        </div>

        {actionLabel ? (
          <button
            type="button"
            onClick={handleAction}
            className="shrink-0 rounded-lg bg-[#3EA646] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#328B39]"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        <StageStrip currentStage={state.stage} terminal={isCancelled} />
      </div>
    </div>
  );
}
