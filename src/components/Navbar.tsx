import { User } from "firebase/auth";
import { LogIn, LogOut, Shield, ShieldAlert, Briefcase } from "lucide-react";
import { loginWithGoogle, logoutUser } from "../firebase";

interface NavbarProps {
  user: User | null;
  loading: boolean;
}

export default function Navbar({ user, loading }: NavbarProps) {
  const isAdmin = user?.email === "masrul89@gmail.com";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg flex items-center justify-center shadow-xs" id="app-logo">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md sm:text-lg font-bold tracking-tight text-slate-900" id="app-title">
              JobLink
            </h1>
            <p className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Find your suitable job link</p>
          </div>
        </div>

        <div className="flex items-center space-x-3" id="auth-actions">
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-full" />
          ) : user ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800 leading-none">
                  {user.displayName || "User"}
                </span>
                <span className="text-xxs text-slate-500 mt-1 flex items-center gap-1">
                  {isAdmin ? (
                    <span className="flex items-center text-emerald-650 font-bold gap-0.5">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="flex items-center text-slate-400 gap-0.5">
                      <ShieldAlert className="w-3 h-3" /> Viewer Mode
                    </span>
                  )}
                </span>
              </div>
              
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  referrerPolicy="no-referrer"
                  alt={user.displayName || "Avatar"}
                  className="w-8 h-8 rounded-full border border-slate-200 shadow-xxs"
                />
              )}

              <button
                id="btn-logout"
                onClick={logoutUser}
                className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-login"
              onClick={loginWithGoogle}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer shadow-md shadow-indigo-100"
            >
              <LogIn className="w-4 h-4" />
              <span>Admin Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
