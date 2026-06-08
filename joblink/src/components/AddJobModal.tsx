import React, { useState } from "react";
import { X, Sparkles, AlertCircle, RefreshCw, Loader2, Check } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { ApplicationStatus, Job } from "../types";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddJobModal({ isOpen, onClose, onSuccess }: AddJobModalProps) {
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [showTextFallback, setShowTextFallback] = useState(false);

  // States for parsed results to allow editing before saving
  const [roleName, setRoleName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [salary, setSalary] = useState("Not specified");
  const [datePosted, setDatePosted] = useState("Not specified");
  const [qualifications, setQualifications] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("bookmarked");
  
  const [parsedPreviewActive, setParsedPreviewActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Handles requesting the server parsing route
  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setParseError("Please provide a valid LinkedIn job posting link.");
      return;
    }

    setIsParsing(true);
    setParseError("");
    setParsedPreviewActive(false);

    try {
      const response = await fetch("/api/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, pastedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "NEED_PASTED_TEXT") {
          setShowTextFallback(true);
          setParseError("LinkedIn blocks automated requests. Please copy & paste the job description text below and click Parse again!");
        } else {
          setParseError(data.message || data.error || "An error occurred while parsing the job details.");
        }
        setIsParsing(false);
        return;
      }

      // Populate form state with parsed details
      setRoleName(data.roleName || "");
      setCompanyName(data.companyName || "");
      setSalary(data.salary || "Not specified");
      setDatePosted(data.datePosted || "Not specified");
      setQualifications(data.qualifications || "");
      setParsedPreviewActive(true);
    } catch (err: any) {
      setParseError("Failed to reach server parser. Please check connection and try again.");
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  // Handles adding the job posting to Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || !companyName) {
      setParseError("Role name and Company Name are required fields.");
      return;
    }

    setIsSaving(true);
    setParseError("");

    const path = "jobs";
    try {
      const newJobPayload = {
        url,
        roleName: roleName.trim(),
        companyName: companyName.trim(),
        salary: salary.trim(),
        datePosted: datePosted.trim(),
        qualifications: qualifications.trim(),
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, path), newJobPayload);
      
      // Reset state and close modal
      setUrl("");
      setPastedText("");
      setRoleName("");
      setCompanyName("");
      setSalary("Not specified");
      setDatePosted("Not specified");
      setQualifications("");
      setStatus("bookmarked");
      setParsedPreviewActive(false);
      setShowTextFallback(false);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Save job failed:", err);
      // Determine a friendly error message to show in the UI
      let friendlyError = "Failed to save the job posting.";
      if (err instanceof Error) {
        if (err.message.includes("permission-denied") || err.message.includes("insufficient permissions")) {
          friendlyError = "Security check failed: Only authenticated admins are allowed to publish job postings to the tracker.";
        } else {
          friendlyError = `Database writing failed: ${err.message}`;
        }
      }
      setParseError(friendlyError);
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="modal-container">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </span>
            <h2 className="text-md sm:text-lg font-bold text-slate-800">
              Add LinkedIn Job Posting
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
            id="modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {parseError && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-xl text-xs sm:text-sm flex items-start space-x-2 border border-rose-100" id="error-alert">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {!parsedPreviewActive ? (
            /* Phase 1: Inputs and Prompt Parsing */
            <form onSubmit={handleParse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                  LinkedIn Job Posting URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm transition font-medium text-slate-700"
                  id="input-url"
                />
              </div>

              {!showTextFallback ? (
                <button
                  type="button"
                  onClick={() => setShowTextFallback(true)}
                  className="text-xs font-bold text-indigo-605 hover:text-indigo-700 hover:underline transition inline-block cursor-pointer"
                >
                  + Direct Copy-Paste job description instead (Highly Recommended)
                </button>
              ) : (
                <div className="space-y-1 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-550">
                      Copy-Pasted Job Description Text
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTextFallback(false)}
                      className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Hide Text Field
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Select everything on the LinkedIn job page (Cmd+A / Ctrl+A), copy it (Cmd+C), and paste it here..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-sm font-sans transition text-slate-750"
                    id="input-description-text"
                  />
                  <p className="text-xxs text-slate-450 font-medium">
                    Pasting description text bypasses robot firewalls and ensures perfect parsing accuracy.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isParsing}
                id="btn-parse-and-extract"
                className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3.5 rounded-xl disabled:opacity-40 shadow-md shadow-indigo-100 hover:shadow-lg transition cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting attributes with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Retrieve & Summarize with Gemini AI</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Phase 2: Preview, refine & save parsed payload */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-start space-x-3">
                <Check className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-indigo-905">Summarization Complete!</h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Gemini AI resolved and structured these findings. Feel free to refine entries before publishing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-105 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-105 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                    Salary Details
                  </label>
                  <input
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-105 font-medium text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                    Job Post Date / When Posted
                  </label>
                  <input
                    type="text"
                    value={datePosted}
                    onChange={(e) => setDatePosted(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-105 font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                  Qualifications & Requirements Description
                </label>
                <textarea
                  rows={4}
                  required
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-105 font-sans font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-550 mb-1">
                  Application Tracking Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["bookmarked", "applied", "rejected"] as ApplicationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold capitalize border transition cursor-pointer text-center tracking-wide ${
                        status === st
                          ? st === "applied"
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-800"
                            : st === "rejected"
                            ? "bg-red-500/10 border-red-300 text-rose-800"
                            : "bg-slate-100 border-slate-300 text-slate-800"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-400"
                      }`}
                    >
                      {st === "bookmarked" ? "Save" : st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 mt-6 border-t border-slate-150 pt-5">
                <button
                  type="button"
                  onClick={() => setParsedPreviewActive(false)}
                  className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl text-sm font-bold border border-slate-200 cursor-pointer text-center transition"
                >
                  Back to Paste
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  id="btn-save-job"
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg cursor-pointer text-center transition inline-flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <span>Save to Dashboard</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
