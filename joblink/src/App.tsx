import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, getDocFromServer } from "firebase/firestore";
import { Plus, Briefcase, CheckSquare, XSquare, Info, Shield, LogIn } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType, loginWithGoogle } from "./firebase";
import { Job } from "./types";
import Navbar from "./components/Navbar";
import AddJobModal from "./components/AddJobModal";
import JobTable from "./components/JobTable";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  const isAdmin = user?.email === "masrul89@gmail.com";

  // Phase 0: Validate Firestore Connection on startup
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        setConnectionTested(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes("client is offline")) {
          console.warn("Firebase client appears to be offline or unconfigured.");
        }
      }
    }
    testConnection();
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Job Openings from Firestore Database
  useEffect(() => {
    const path = "jobs";
    const q = query(collection(db, path), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedJobs: Job[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedJobs.push({
            id: doc.id,
            url: data.url,
            roleName: data.roleName,
            companyName: data.companyName,
            salary: data.salary,
            datePosted: data.datePosted,
            qualifications: data.qualifications,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setJobs(loadedJobs);
        setJobsLoading(false);
      },
      (error) => {
        console.error("Firestore synchronizer triggered error callback:", error);
        handleFirestoreError(error, OperationType.LIST, path);
        setJobsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Summarize stats metrics
  const totalPostings = jobs.length;
  const appliedCount = jobs.filter((j) => j.status === "applied").length;
  const rejectedCount = jobs.filter((j) => j.status === "rejected").length;
  const bookmarkedCount = jobs.filter((j) => j.status === "bookmarked").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900" id="app-root-container">
      {/* Universal header navigation */}
      <Navbar user={user} loading={authLoading} />

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="core-content-stage">
        
        {/* Page summary / Banner intro widget */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs relative" id="header-banner-section">
          <div className="aspect-[21/9] sm:aspect-[21/7] lg:aspect-[21/5] w-full relative">
            <img 
              src="/src/assets/images/job_search_banner_1780923686006.png" 
              alt="Find your suitable job" 
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            {/* If guests are inspecting, explain viewer model clearly overlay badge */}
            {!isAdmin && !authLoading && (
              <div className="absolute bottom-4 left-4 inline-flex items-center space-x-2 bg-indigo-900/90 hover:bg-indigo-950/95 text-white backdrop-blur-xs px-3.5 py-2 rounded-xl text-[10px] sm:text-xs shadow-md font-bold transition">
                <Info className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span>Guests: Search summaries & click titles to view real LinkedIn openings.</span>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Metric bento-grid cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard">
          <div className="bg-white border border-slate-205 rounded-xl p-4 sm:p-5 shadow-xxs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Total Curated</span>
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase className="w-4 h-4" /></span>
            </div>
            {jobsLoading ? (
              <div className="h-8 w-16 bg-slate-50 animate-pulse rounded-lg mt-2" />
            ) : (
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">{totalPostings}</div>
            )}
            <p className="text-xxs text-slate-400 mt-1.5 font-semibold">LinkedIn job circulars posted</p>
          </div>

          <div className="bg-white border border-slate-205 rounded-xl p-4 sm:p-5 shadow-xxs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Bookmarked</span>
              <span className="p-1.5 bg-amber-50 text-amber-650 rounded-lg"><Info className="w-4 h-4" /></span>
            </div>
            {jobsLoading ? (
              <div className="h-8 w-16 bg-slate-50 animate-pulse rounded-lg mt-2" />
            ) : (
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">{bookmarkedCount}</div>
            )}
            <p className="text-xxs text-slate-400 mt-1.5 font-semibold">Under review & watchlists</p>
          </div>

          <div className="bg-white border border-slate-205 rounded-xl p-4 sm:p-5 shadow-xxs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Applications Filed</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-650 rounded-lg"><CheckSquare className="w-4 h-4" /></span>
            </div>
            {jobsLoading ? (
              <div className="h-8 w-16 bg-slate-50 animate-pulse rounded-lg mt-2" />
            ) : (
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">{appliedCount}</div>
            )}
            <p className="text-xxs text-slate-400 mt-1.5 font-semibold">Marked as active/applied</p>
          </div>

          <div className="bg-white border border-slate-205 rounded-xl p-4 sm:p-5 shadow-xxs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">Pass / Rejected</span>
              <span className="p-1.5 bg-rose-50 text-rose-650 rounded-lg"><XSquare className="w-4 h-4" /></span>
            </div>
            {jobsLoading ? (
              <div className="h-8 w-16 bg-slate-50 animate-pulse rounded-lg mt-2" />
            ) : (
              <div className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-2">{rejectedCount}</div>
            )}
            <p className="text-xxs text-slate-400 mt-1.5 font-semibold">Applications declined/rejected</p>
          </div>
        </section>

        {/* Dashboard Actions and Primary Job Listing */}
        <section className="space-y-4" id="main-listings-section">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-md sm:text-lg font-extrabold text-slate-800 tracking-tight">Job Summaries & Overview</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Filter results, view key qualifications, or expand to inspect details.</p>
            </div>
            {isAdmin && (
              <button
                id="btn-add-job-trigger"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-100 hover:shadow-lg cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Post LinkedIn Job</span>
              </button>
            )}

            {!isAdmin && !authLoading && (
              <div className="text-right flex flex-col items-end">
                <span className="text-xxs font-bold bg-white border border-slate-200 text-slate-500 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-xxs">
                  <Shield className="w-3 h-3 text-indigo-500" /> Read-Only View
                </span>
                <button
                  onClick={loginWithGoogle}
                  className="text-xxs text-indigo-600 hover:underline hover:text-indigo-700 mt-1.5 font-bold"
                >
                  Admin sign in to post
                </button>
              </div>
            )}
          </div>

          {jobsLoading ? (
            <div className="space-y-3 py-6" id="jobs-skeleton">
              {[1, 2, 3].map((val) => (
                <div key={val} className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <JobTable 
              jobs={jobs} 
              isAdmin={isAdmin} 
              onRefresh={() => {}} // Firestore onSnapshot updates state automatically
            />
          )}
        </section>
      </main>

      {/* Structured dialog overlay for creating entries */}
      <AddJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={() => {}} // Firestore real-time updates handle this
      />

      {/* Modern dark indigo synced footer */}
      <footer className="h-12 bg-indigo-950 text-indigo-200 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold font-mono px-4 text-center" id="app-footer">
        Data synced to cloud database &bull; Secure Firestore Backend &bull; Managed with Gemini AI
      </footer>
    </div>
  );
}
