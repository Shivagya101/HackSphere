import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BACKEND_URL } from "../../config.js";

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const response = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem("authToken");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (when auth token is added/removed)
    const handleStorageChange = (e) => {
      if (e.key === "authToken") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("authStateChanged", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authStateChanged", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);``
    // Trigger auth state change event
    window.dispatchEvent(new Event("authStateChanged"));
    window.location.href = "/";
  };

  return (
    <nav className="w-full bg-black/20 backdrop-blur-md border-b border-white/10 fixed top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-2xl font-bold text-yellow-200 font-orbitron tracking-wide"
            >
              HackSphere
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {loading ? (
              <div
                className="
                  inline-flex items-center gap-3
                  px-6 py-1.5
                  rounded-full
                  border border-slate-400/60
                  bg-slate-400/20
                  text-sm tracking-widest
                  font-orbitron text-slate-200
                  backdrop-blur-sm
                "
              >
                <p>LOADING...</p>
                <span>⏳</span>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <div
                  className="
                    inline-flex items-center gap-3
                    px-6 py-1.5
                    rounded-full
                    border border-green-400/60
                    bg-green-400/20
                    text-sm tracking-widest
                    font-orbitron text-green-200
                    backdrop-blur-sm
                  "
                >
                  <p>WELCOME, {user.username}</p>
                  <span>👤</span>
                </div>
                <Link
                  to="/history"
                  className="
                    inline-flex items-center gap-3
                    px-6 py-1.5
                    rounded-full
                    border border-blue-400/60
                    bg-blue-400/20
                    text-sm tracking-widest
                    font-orbitron text-blue-200
                    backdrop-blur-sm
                    hover:bg-blue-400/30
                    transition-colors
                  "
                >
                  <p>ROOM HISTORY</p>
                  <span>📋</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="
                    inline-flex items-center gap-3
                    px-6 py-1.5
                    rounded-full
                    border border-red-400/60
                    bg-red-400/20
                    text-sm tracking-widest
                    font-orbitron text-red-200
                    backdrop-blur-sm
                    hover:bg-red-400/30
                    transition-colors
                  "
                >
                  <p>SIGN OUT</p>
                  <span>🚪</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="
                  inline-flex items-center gap-3
                  px-6 py-1.5
                  rounded-full
                  border border-yellow-400/60
                  bg-yellow-400/20
                  text-sm tracking-widest
                  font-orbitron text-yellow-200
                  backdrop-blur-sm
                  hover:bg-yellow-400/30
                  transition-colors
                "
              >
                <p>SIGN IN WITH GITHUB</p>
                <span>🔐</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
