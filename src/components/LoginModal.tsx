import React, { useState, useEffect } from "react";
import { X, Shield, KeyRound, AlertCircle, CheckCircle, Info, Chrome } from "lucide-react";
import { loginWithGoogle } from "../firebase";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bypassAdmin: boolean, googleUser?: any) => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"google" | "passcode">("google");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDebugInfo(null);
      setSuccessMsg(null);
      setPasscode("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setDebugInfo(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        setSuccessMsg(`Welcome, ${user.displayName || user.email}!`);
        setTimeout(() => {
          onSuccess(false, user);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error("LoginModal: Google login failed", err);
      
      const errorCode = err?.code || "";
      const errorMessage = err?.message || String(err);
      
      if (errorCode === "auth/unauthorized-domain") {
        setError("Domain Not Authorized in Firebase");
        setDebugInfo(
          `Firebase Auth blocked requests from this domain (${window.location.hostname}). To resolve:\n\n` +
          `1. Go to your Firebase Console -> Authentication -> Settings tab.\n` +
          `2. Under 'Authorized domains', add the domain:\n   👉 "${window.location.hostname}"\n\n` +
          `Wait a minute and then try log in again.`
        );
      } else if (errorCode === "auth/popup-blocked") {
        setError("Authentication Popup Blocked");
        setDebugInfo(
          "Your browser blocked the pop-up window required for Google Sign-In.\n\n" +
          "Please check your browser URL bar for a pop-up blocker icon and click to allow pop-ups for this site, or try switching to the Passcode option."
        );
      } else if (errorCode === "auth/operation-not-allowed") {
        setError("Google Provider Not Enabled");
        setDebugInfo(
          "Google Sign-In is not enabled on this Firebase project.\n\n" +
          "Go to Firebase Console -> Authentication -> Sign-in Method, and enable Google."
        );
      } else {
        setError("Authentication Failed");
        setDebugInfo(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugInfo(null);
    
    const correctPasscode = import.meta.env.VITE_ADMIN_PASSCODE || "admin123";
    
    if (!passcode) {
      setError("Please enter a passcode.");
      return;
    }
    
    if (passcode === correctPasscode) {
      setSuccessMsg("Admin passcode accepted!");
      setTimeout(() => {
        onSuccess(true);
        onClose();
      }, 1000);
    } else {
      setError("Incorrect passcode.");
      setDebugInfo(
        "Make sure you entered the correct admin credential.\n\n" +
        "Tip: The default fallback passcode is 'admin123'. You can override this by configuring VITE_ADMIN_PASSCODE in your project environment."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" id="auth-modal-overlay">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Positioner */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-slate-150 animate-in fade-in zoom-in-95 duration-150 text-slate-800">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="text-md sm:text-lg font-bold text-slate-900">Admin Authentication</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition cursor-pointer"
              id="close-login-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-100 my-4">
            <button
              onClick={() => { setActiveTab("google"); setError(null); setDebugInfo(null); }}
              className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === "google"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Google Sign-In
            </button>
            <button
              onClick={() => { setActiveTab("passcode"); setError(null); setDebugInfo(null); }}
              className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-all ${
                activeTab === "passcode"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Secret Passcode
            </button>
          </div>

          {/* Feedback Messages */}
          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-850 p-3 rounded-lg flex items-start gap-2.5 text-xs font-semibold animate-in fade-in" id="login-success-banner">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-850 p-3 rounded-lg flex flex-col gap-1.5 animate-in fade-in" id="login-error-banner">
              <div className="flex items-start gap-2 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {debugInfo && (
                <div className="bg-white/70 border border-rose-100 rounded p-2 text-[11px] text-slate-650 font-mono whitespace-pre-line leading-relaxed overflow-x-auto max-h-40">
                  {debugInfo}
                </div>
              )}
            </div>
          )}

          {/* Tabs Content */}
          {activeTab === "google" ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-normal">
                Sign in with your administrator Google Account to publish jobs, delete entries, and edit applicant statuses, using secure Google Authentication.
              </p>
              
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || !!successMsg}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl hover:bg-slate-800 focus:outline-none transition-colors active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md"
                id="google-signin-btn"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Chrome className="w-4 h-4 text-blue-400 shrink-0" />
                )}
                <span>{loading ? "Connecting Google Account..." : "Continue with Google"}</span>
              </button>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-[11px] text-indigo-905 flex gap-2">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Vercel/iFrames:</strong> If your browser blocks popups or you haven't whitelisted the domain in the Firebase console yet, use the <strong>Secret Passcode</strong> option above to instantly gain admin access!
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasscodeLogin} className="space-y-4 py-2">
              <p className="text-xs text-slate-500 leading-normal">
                Enter an administrative passcode to authenticate locally. This is a robust fallback for Vercel environments or when popup browser blockages halt Google login flows.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider block" htmlFor="passcode-input">
                  Admin Passcode
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <KeyRound className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="password"
                    id="passcode-input"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    disabled={loading || !!successMsg}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!successMsg}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl transition cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
                id="passcode-submit-btn"
              >
                Sign In with Passcode
              </button>

              <p className="text-[10px] text-slate-400 text-center font-medium">
                Default credentials: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600">admin123</code>
              </p>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
