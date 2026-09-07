import { toast } from "react-toastify";
import { useState } from "react";
import { INDIAN_LOCATIONS } from "../constants/indianStates.js";

import { CREDIT_TYPES } from "../data/mock";
import { Button, Input, Select, Textarea, Badge } from "../components/ui";

import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const STEPS = ["Credit Details", "Proof Upload", "Review & Submit"];
function AddListingPage({ onNavigate }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [form, setForm] = useState({
    type: "",
    quantity: "",
    price: "",
    location: "",
    year: "2025-26",
    validTill: "",
    description: "",
    certificateNumber: "",
    sourcePortal: "",
    certificateQuantity: "",
    certificateIssuedDate: "",
    certificateValidTill: "",
  });
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, JPG, PNG and WEBP files are allowed.");
      return;
    }

    const maxFileSize = 10 * 1024 * 1024;

    if (file.size > maxFileSize) {
      toast.error("File size must not exceed 10 MB.");
      return;
    }

    setUploadedFile(file);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login before creating a listing.");
      return;
    }

    if (user.role !== "seller") {
      toast.error("Only sellers can create listings.");
      return;
    }

    if (!form.type) {
      toast.error("Please select a credit type.");
      setStep(0);
      return;
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error("Please enter a valid quantity.");
      setStep(0);
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      toast.error("Please enter a valid price.");
      setStep(0);
      return;
    }

    if (!form.location) {
      toast.error("Please select a location.");
      setStep(0);
      return;
    }

    if (!form.year) {
      toast.error("Please select a compliance year.");
      setStep(0);
      return;
    }

    if (!form.validTill) {
      toast.error("Please enter a valid till date.");
      setStep(0);
      return;
    }

    if (!form.certificateNumber.trim()) {
      toast.error("Please enter the certificate / credit registration number.");
      setStep(1);
      return;
    }

    if (!form.sourcePortal) {
      toast.error("Please select the source portal.");
      setStep(1);
      return;
    }

    if (!form.certificateQuantity || Number(form.certificateQuantity) <= 0) {
      toast.error("Please enter the quantity shown on the certificate.");
      setStep(1);
      return;
    }

    if (!form.certificateIssuedDate || !form.validTill) {
      toast.error("Please enter the certificate issue date and valid till date.");
      setStep(1);
      return;
    }

    if (new Date(form.certificateIssuedDate) > new Date(form.validTill)) {
      toast.error("Certificate issue date cannot be after its validity date.");
      setStep(1);
      return;
    }

    if (new Date(form.validTill) < new Date()) {
      toast.error("Valid till date must be in the future.");
      setStep(0);
      return;
    }

    if (Number(form.certificateQuantity) < Number(form.quantity)) {
      toast.error("Certificate quantity must cover the quantity you are listing.");
      setStep(1);
      return;
    }

    if (!uploadedFile) {
      toast.error("Please upload the proof document.");
      setStep(1);
      return;
    }

    try {
      const formData = new FormData();

      formData.append("category", form.type);
      formData.append("quantity", form.quantity);
      formData.append("price", form.price);
      formData.append("location", form.location);
      formData.append("complianceYear", form.year);
      formData.append("validTill", form.validTill);
      formData.append("description", form.description || "");
      formData.append("certificateNumber", form.certificateNumber.trim());
      formData.append("sourcePortal", form.sourcePortal);
      formData.append("certificateQuantity", form.certificateQuantity);
      formData.append("certificateIssuedDate", form.certificateIssuedDate);
      formData.append("certificateValidTill", form.validTill);
      formData.append("document", uploadedFile);

      console.log("FORM DATA:");

      for (const [key, value] of formData.entries()) {
        console.log(key, value instanceof File ? `FILE: ${value.name}` : value);
      }
      const response = await api.post("/listings", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Create listing error:", error);

      toast.error(error.response?.data?.message || "Failed to submit listing.");
    }
  };

  if (submitted) {
    return (
      <div className="pro-page min-h-screen bg-[#F7F9FB] flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          <div className="bg-white border border-[#E5EAF0] rounded-2xl p-10 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#EBF8EC] text-[#5AC361] flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold text-[#0F1923] mb-2"
            >
              Listing Submitted!
            </h2>
            <p className="text-[#6B7280] mb-6 text-sm leading-relaxed">
              Your listing is now under review. EPR Nexuss admin will verify the
              uploaded screenshot against your listing details.
            </p>

            <div className="mb-6">
              <Badge label="Pending" />
            </div>

            {/* Verification timeline */}
            <div className="text-left flex flex-col gap-0">
              {[
                { label: "Submitted", done: true },
                { label: "Under Review", done: false, active: true },
                { label: "Approved / Rejected", done: false },
                { label: "Live on Marketplace", done: false },
              ].map((t, i) => (
                <div key={t.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${t.done ? "bg-[#5AC361] border-[#5AC361]" : t.active ? "border-[#5AC361] bg-white" : "border-[#E5EAF0] bg-white"}`}
                    >
                      {t.done && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      {t.active && (
                        <div className="w-2 h-2 rounded-full bg-[#5AC361]" />
                      )}
                    </div>
                    {i < 3 && (
                      <div
                        className={`w-0.5 h-6 ${t.done ? "bg-[#5AC361]" : "bg-[#E5EAF0]"}`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-sm py-1 ${t.done ? "text-[#5AC361] font-medium" : t.active ? "text-[#374151] font-semibold" : "text-[#9CA3AF]"}`}
                  >
                    {t.label}
                  </p>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-6"
              onClick={() => onNavigate("seller-dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <button
          className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#374151] mb-6 transition-colors"
          onClick={() => onNavigate("seller-dashboard")}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </button>

        <h1
          className="text-2xl font-bold text-[#0F1923] mb-6"
        >
          Post New Credit Listing
        </h1>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all ${i < step ? "bg-[#5AC361] border-[#5AC361] text-white" : i === step ? "border-[#5AC361] bg-white text-[#5AC361]" : "border-[#E5EAF0] bg-white text-[#9CA3AF]"}`}
                >
                  {i < step ? "\u2713" : i + 1}
                </div>
                <span
                  className={`text-xs font-medium truncate hidden sm:block ${i === step ? "text-[#0F1923]" : i < step ? "text-[#5AC361]" : "text-[#9CA3AF]"}`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 ${i < step ? "bg-[#5AC361]" : "bg-[#E5EAF0]"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Credit Details */}
        {step === 0 && (
          <div className="bg-white border border-[#E5EAF0] rounded-2xl p-6">
            <h2
              className="text-base font-semibold text-[#0F1923] mb-5"
            >
              Step 1: Credit Details
            </h2>
            <div className="flex flex-col gap-4">
              <Select
                label="Credit Type *"
                options={CREDIT_TYPES.map((t) => ({ label: t, value: t }))}
                placeholder="Select credit type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Available Quantity (MT) *"
                  type="number"
                  placeholder="e.g. 500"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
                <Input
                  label="Asking Price (₹/MT) *"
                  type="number"
                  placeholder="e.g. 182"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <Select
                label="Location (State) *"
                options={INDIAN_LOCATIONS.map((s) => ({ label: s, value: s }))}
                placeholder="Select state"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Compliance Year *"
                  options={[
                    { label: "FY 2025-26", value: "2025-26" },
                    { label: "FY 2024-25", value: "2024-25" },
                  ]}
                  value={form.year}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, year: e.target.value }))
                  }
                />
                <Input
                  label="Valid Till *"
                  type="date"
                  lang="en-GB"
                  value={form.validTill}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      validTill: e.target.value,
                      certificateValidTill: e.target.value,
                    }))
                  }
                />
              </div>
              <Textarea
                label="Description"
                placeholder="Describe the credit source, recycler details, categories covered, etc."
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(1)}>
                Continue to Proof Upload →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Proof Upload */}
        {step === 1 && (
          <div className="bg-white border border-[#E5EAF0] rounded-2xl p-6">
            <h2
              className="text-base font-semibold text-[#0F1923] mb-1"
            >
              Step 2: Proof of Credit Upload
            </h2>
            <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
              Upload a screenshot of this credit from your registry/portal (e.g.
              CPCB Portal, State PCB Dashboard) showing{" "}
              <strong>quantity, credit ID, and validity</strong>. Your listing
              will go live only after admin verification.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <Input
                label="Certificate / Credit ID *"
                placeholder="e.g. EPR-2026-00124"
                value={form.certificateNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, certificateNumber: e.target.value }))
                }
              />
              <Select
                label="Source Portal *"
                options={[
                  { label: "CPCB Portal", value: "CPCB Portal" },
                  { label: "State PCB Portal", value: "State PCB Portal" },
                  { label: "Other Authorized Registry", value: "Other Authorized Registry" },
                ]}
                placeholder="Select source"
                value={form.sourcePortal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourcePortal: e.target.value }))
                }
              />
              <Input
                label="Certificate Quantity (MT) *"
                type="number"
                min="0"
                placeholder="Quantity shown on certificate"
                value={form.certificateQuantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, certificateQuantity: e.target.value }))
                }
              />
              <Input
                label="Certificate Issue Date *"
                type="date"
                value={form.certificateIssuedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, certificateIssuedDate: e.target.value }))
                }
              />

            </div>

            {/* Upload zone */}
            <label
              className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${uploadedFile ? "border-[#5AC361] bg-[#EBF8EC]" : "border-[#E5EAF0] hover:border-[#5AC361] hover:bg-[#F7FFF8]"}`}
            >
              <input
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.pdf,.webp"
                onChange={handleFileChange}
              />
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#5AC361] text-white flex items-center justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2E7D32]">
                      {uploadedFile?.name}
                    </p>
                    <p className="text-xs text-[#5AC361] mt-1">
                      File uploaded successfully
                    </p>
                  </div>
                  <span className="text-xs text-[#6B7280] underline">
                    Click to replace
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F0F4F8] text-[#9CA3AF] flex items-center justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#374151]">
                      Drag & drop or click to upload
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      Portal screenshot showing credit ID, quantity & validity
                    </p>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Supported: PNG, JPG, PDF (max 10 MB)
                  </p>
                </div>
              )}
            </label>

            {/* Guidelines */}
            <div className="mt-4 p-4 bg-[#FFFBEB] border border-[#FCD34D] rounded-xl">
              <p className="text-xs font-semibold text-[#92400E] mb-2">
                What to include in the screenshot:
              </p>
              <ul className="text-xs text-[#92400E] space-y-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#F59E0B] mt-0.5">•</span>{" "}
                  Credit/Certificate ID or Registration Number
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#F59E0B] mt-0.5">•</span> Quantity of
                  credits (in MT)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#F59E0B] mt-0.5">•</span> Validity /
                  expiry date
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#F59E0B] mt-0.5">•</span> Source portal
                  name (CPCB, State PCB, etc.)
                </li>
              </ul>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(0)}
              >
                ← Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(2)}
                disabled={!uploadedFile}
              >
                Review Submission →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="bg-white border border-[#E5EAF0] rounded-2xl p-6">
            <h2
              className="text-base font-semibold text-[#0F1923] mb-5"
            >
              Step 3: Review & Submit
            </h2>

            <div className="bg-[#F7F9FB] border border-[#E5EAF0] rounded-xl p-5 mb-5">
              <h3
                className="text-sm font-semibold text-[#374151] mb-3"
              >
                Listing Summary
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Credit Type", value: form.type || "Not set" },
                  {
                    label: "Quantity",
                    value: form.quantity ? `${form.quantity} MT` : "Not set",
                  },
                  {
                    label: "Asking Price",
                    value: form.price ? `\u20B9${form.price}/MT` : "Not set",
                  },
                  { label: "Location", value: form.location || "Not set" },
                  { label: "Compliance Year", value: form.year },
                  { label: "Valid Till", value: form.validTill || "Not set" },
                  { label: "Certificate ID", value: form.certificateNumber || "Not set" },
                  { label: "Source Portal", value: form.sourcePortal || "Not set" },
                  {
                    label: "Certificate Quantity",
                    value: form.certificateQuantity ? `${form.certificateQuantity} MT` : "Not set",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <span className="text-xs text-[#9CA3AF]">{row.label}</span>
                    <span className="text-sm font-medium text-[#374151]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#EBF8EC] border border-[#A5D6A7] rounded-xl p-4 mb-5 flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#5AC361] flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <div>
                <p className="text-sm font-semibold text-[#2E7D32]">
                  Proof document attached
                </p>
                <p className="text-xs text-[#5AC361]">{uploadedFile?.name}</p>
              </div>
            </div>

            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl mb-5 text-xs text-[#1D4ED8] leading-relaxed">
              By submitting, you confirm that all information provided is
              accurate and matches the uploaded portal screenshot. False
              information may result in permanent account suspension.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Submit for Verification
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export { AddListingPage as default };
