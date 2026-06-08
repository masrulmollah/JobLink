import React, { useState } from "react";
import { 
  Search, 
  ExternalLink, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Building2, 
  DollarSign, 
  Calendar, 
  Layers, 
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Job, ApplicationStatus } from "../types";

interface JobTableProps {
  jobs: Job[];
  isAdmin: boolean;
  onRefresh: () => void;
  onLoginRequired?: () => void;
}

export default function JobTable({ jobs, isAdmin, onRefresh, onLoginRequired }: JobTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "day" | "week" | "month">("all");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [updatingStatuses, setUpdatingStatuses] = useState<{ [key: string]: boolean }>({});

  // Filter jobs based on keyword, status filter tab, and post date age
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.qualifications.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;

    // Time filter logic
    let matchesTime = true;
    if (timeFilter !== "all") {
      const getMillis = (timestamp: any): number => {
        if (!timestamp) return Date.now();
        if (typeof timestamp === "number") return timestamp;
        if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
        if (timestamp.seconds !== undefined) return timestamp.seconds * 1000;
        if (timestamp instanceof Date) return timestamp.getTime();
        return Date.now();
      };

      const jobMillis = getMillis(job.createdAt);
      const diffMs = Date.now() - jobMillis;

      let timeFilterMatch = false;

      // Classify by created timestamp
      if (timeFilter === "day" && diffMs <= 24 * 60 * 60 * 1000) {
        timeFilterMatch = true;
      } else if (timeFilter === "week" && diffMs <= 7 * 24 * 60 * 60 * 1000) {
        timeFilterMatch = true;
      } else if (timeFilter === "month" && diffMs <= 30 * 24 * 60 * 60 * 1000) {
        timeFilterMatch = true;
      }

      // Robust fallback of parsing relative text in job.datePosted
      if (!timeFilterMatch) {
        const dateStr = (job.datePosted || "").toLowerCase();
        const numMatch = dateStr.match(/\d+/);
        const val = numMatch ? parseInt(numMatch[0], 10) : null;

        if (timeFilter === "day") {
          if (
            dateStr.includes("hour") || 
            dateStr.includes("minute") || 
            dateStr.includes("second") || 
            dateStr.includes("today") || 
            (val === 1 && dateStr.includes("day")) ||
            dateStr.includes("yesterday")
          ) {
            timeFilterMatch = true;
          }
        } else if (timeFilter === "week") {
          if (
            dateStr.includes("hour") || 
            dateStr.includes("minute") || 
            dateStr.includes("second") || 
            dateStr.includes("today") || 
            dateStr.includes("yesterday")
          ) {
            timeFilterMatch = true;
          } else if (dateStr.includes("day") && val !== null && val <= 7) {
            timeFilterMatch = true;
          } else if (dateStr.includes("week") && (val === null || val === 1)) {
            timeFilterMatch = true;
          }
        } else if (timeFilter === "month") {
          if (
            dateStr.includes("hour") || 
            dateStr.includes("minute") || 
            dateStr.includes("second") || 
            dateStr.includes("today") || 
            dateStr.includes("yesterday") ||
            dateStr.includes("day") ||
            dateStr.includes("week")
          ) {
            timeFilterMatch = true;
          } else if (dateStr.includes("month") && (val === null || val <= 1)) {
            timeFilterMatch = true;
          }
        }
      }

      matchesTime = timeFilterMatch;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  const toggleExpand = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open URL
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const deleteJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open URL
    if (!window.confirm("Are you sure you want to remove this job posting?")) return;

    const path = `jobs`;
    try {
      await deleteDoc(doc(db, path, jobId));
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${jobId}`);
    }
  };

  const updateStatus = async (jobId: string, newStatus: ApplicationStatus, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open URL
    if (!isAdmin) return;

    setUpdatingStatuses(prev => ({ ...prev, [jobId]: true }));
    const path = `jobs`;
    try {
      const jobRef = doc(db, path, jobId);
      await updateDoc(jobRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${path}/${jobId}`);
    } finally {
      setUpdatingStatuses(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold text-xxs tracking-wider uppercase";
      case "rejected":
        return "bg-rose-50 border-rose-200 text-rose-700 font-bold text-xxs tracking-wider uppercase";
      default:
        return "bg-slate-100 border-slate-200 text-slate-600 font-bold text-xxs tracking-wider uppercase";
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case "applied":
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case "rejected":
        return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6" id="dashboard-widget">
      {/* Search, Filter, and Age Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4" id="filters-container">
        {/* Top block: Search bar & Tracking status tabs */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search positions, companies, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none rounded-xl text-sm transition text-slate-700"
              id="search-input"
            />
          </div>

          {/* Tab Filters */}
          <div className="flex flex-wrap gap-1.5 animate-fade-in" id="status-filters">
            {(["all", "bookmarked", "applied", "rejected"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer border ${
                  statusFilter === tab
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="capitalize">{tab === "bookmarked" ? "save" : tab}</span>
                {tab === "all" ? (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xxs ${statusFilter === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {jobs.length}
                  </span>
                ) : (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xxs ${
                    statusFilter === tab 
                      ? "bg-white/20 text-white" 
                      : tab === "applied" ? "bg-emerald-50 text-emerald-600" : tab === "rejected" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"
                  }`}>
                    {jobs.filter(j => j.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom block: "When Posted" filtering options */}
        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-1.5 py-1">
            <span className="w-1.5 h-1.5 bg-indigo-550 rounded-full"></span>
            <span className="text-xxs font-bold uppercase tracking-widest text-slate-400">
              When Posted:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" id="time-filters">
            {([
              { id: "all", label: "Any Time" },
              { id: "day", label: "Last 24 Hours" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "Last 30 Days" }
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeFilter(opt.id)}
                className={`py-1.5 px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                  timeFilter === opt.id
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-xxs"
                    : "bg-white border-slate-205 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid or Table Dashboard representation */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center" id="empty-state">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-md sm:text-lg font-medium text-slate-800">No job postings found</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search filters or copy-paste a new LinkedIn job post to populate the dashboard.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Role & Company</th>
                  <th className="px-6 py-4">When Posted</th>
                  <th className="px-6 py-4">Salary Range</th>
                  <th className="px-6 py-4">Tracking Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => {
                  const isExpanded = expandedJobId === job.id;
                  const isUpdating = updatingStatuses[job.id] || false;

                  return (
                    <tr 
                      key={job.id}
                      onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                      className={`hover:bg-slate-50/75 cursor-pointer transition relative group ${
                        job.status === "applied" ? "bg-emerald-50/10" : job.status === "rejected" ? "bg-rose-50/10" : "bg-transparent"
                      }`}
                    >
                      {/* Role & Company */}
                      <td className="px-6 py-5">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-400 group-hover:bg-white transition">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition flex items-center space-x-1.5">
                              <span>{job.roleName}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                            </div>
                            <div className="text-xs text-indigo-600 font-bold mt-0.5">{job.companyName}</div>
                          </div>
                        </div>
                      </td>

                      {/* Date Posted */}
                      <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-450" />
                          <span>{job.datePosted}</span>
                        </div>
                      </td>

                      {/* Salary */}
                      <td className="px-6 py-5 text-sm text-slate-600 font-bold">
                        <div className="flex items-center space-x-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.salary}</span>
                        </div>
                      </td>

                      {/* Tracking Status */}
                      <td className="px-6 py-5">
                        {isUpdating ? (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                            <span>SAVING...</span>
                          </div>
                        ) : isAdmin ? (
                          /* Intersecting quick application trackers for admin */
                          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                            {(["bookmarked", "applied", "rejected"] as ApplicationStatus[]).map((st) => {
                              const isActive = job.status === st;

                              // Style each of standard triggers matching Professional Polish markup rules
                              let styleClass = "px-2.5 py-1 rounded text-xxs font-extrabold border uppercase tracking-wider transition-all duration-150 cursor-pointer ";
                              if (isActive) {
                                if (st === "applied") styleClass += "bg-emerald-500/10 border-emerald-400 text-emerald-700 shadow-xxs";
                                else if (st === "rejected") styleClass += "bg-red-500/10 border-red-300 text-rose-700 shadow-xxs";
                                else styleClass += "bg-slate-100 border-slate-300 text-slate-700 shadow-xxs";
                              } else {
                                styleClass += "bg-white hover:bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-650";
                              }

                              return (
                                <button
                                  key={st}
                                  onClick={(e) => updateStatus(job.id, st, e)}
                                  className={styleClass}
                                >
                                  {st === "bookmarked" ? "Save" : st}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border capitalize ${getStatusBadge(job.status)}`}>
                            {getStatusIcon(job.status)}
                            <span className="capitalize">{job.status}</span>
                          </div>
                        )}
                      </td>

                      {/* Expand / Detailed info actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => toggleExpand(job.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            title="View Requirements"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => deleteJob(job.id, e)}
                              className="p-1.5 rounded-lg text-slate-450 hover:text-red-600 hover:bg-red-50/50 transition"
                              title="Delete Posting"
                            >
                              <Trash2 className="w-4 h-4 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expanded Job Requirements Block (Desktop) */}
          {expandedJobId && (
            (() => {
              const openJob = filteredJobs.find(j => j.id === expandedJobId);
              if (!openJob) return null;
              return (
                <div className="bg-slate-50/60 p-6 border-t border-slate-200 space-y-3 animate-slide-up">
                  <div className="flex items-center space-x-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span>Qualifications & Skills Summary</span>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xxs">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-sans font-medium">
                      {openJob.qualifications}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Database Document ID: {openJob.id}
                    </span>
                    <button
                      onClick={() => window.open(openJob.url, "_blank", "noopener,noreferrer")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 hover:underline"
                    >
                      <span>Apply directly on LinkedIn</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* Mobile Card Stack View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredJobs.map((job) => {
              const isExpanded = expandedJobId === job.id;
              const isUpdating = updatingStatuses[job.id] || false;

              return (
                <div
                  key={job.id}
                  onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                  className={`p-4 sm:p-5 hover:bg-slate-50 transition space-y-3 cursor-pointer ${
                    job.status === "applied" ? "bg-emerald-50/10" : job.status === "rejected" ? "bg-rose-50/10" : "bg-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{job.roleName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 inline shrink-0" />
                      </h4>
                      <p className="text-xs text-indigo-600 font-bold mt-0.5">{job.companyName}</p>
                    </div>
                    {/* Status Pill */}
                    <div className={`px-2.5 py-0.5 rounded-full text-xxs font-extrabold border ${getStatusBadge(job.status)}`}>
                      <span className="capitalize">{job.status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.datePosted}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-bold">
                      <DollarSign className="w-3.5 h-3.5 text-slate-450" />
                      <span>{job.salary}</span>
                    </div>
                  </div>

                  {/* Expand and controls block */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleExpand(job.id, e)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide Details" : "View Requirements"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        {/* Compact Admin state-cycle pills list */}
                        <div className="flex space-x-1">
                          {(["applied", "rejected"] as ApplicationStatus[]).map((st) => (
                            <button
                              key={st}
                              onClick={(e) => updateStatus(job.id, st, e)}
                              className={`px-1.5 py-0.5 text-xxs font-bold uppercase rounded transition border ${
                                job.status === st
                                  ? st === "applied"
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                    : "bg-rose-50 border-rose-300 text-rose-700"
                                  : "bg-white border-slate-200 text-slate-400"
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={(e) => deleteJob(job.id, e)}
                          className="p-1 rounded bg-red-50 text-rose-600 hover:bg-rose-100 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded block on mobile */}
                  {isExpanded && (
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2 mt-2 animate-slide-up text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans mt-3">
                      <div className="flex items-center space-x-1.5 text-xxs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        <Award className="w-3 h-3 text-indigo-600" />
                        <span>Parsed Skills & Overview</span>
                      </div>
                      {job.qualifications}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
