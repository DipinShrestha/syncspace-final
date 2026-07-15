// app/page.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        .nav-link::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 1px;
          left: 0;
          bottom: -4px;
          background: white;
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .nav-link:hover::after {
          transform: scaleX(1);
        }
        .hero-title {
          font-size: clamp(50px, 5vw, 62px);
          font-weight: 200;
          line-height: 1.05;
        }
        .feature-card {
          transition: 0.35s ease;
        }
        .feature-card:hover {
          transform: translateY(-6px);
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="glass-nav fixed top-0 left-0 w-full z-50">
        <div className="w-full px-4 sm:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="logo w-40 sm:w-[210px] transition-opacity hover:opacity-80">
              <Link href="/">
                <img src="/Gemini_Generated_Image_wf220zwf220zwf22.png" alt="SyncSpace Logo" />
              </Link>
            </div>

            {/* Desktop Menu – different based on auth */}
            <div className="desktop-main-menu hidden md:flex gap-6 items-center">
              {!user ? (
                // Public menu
                <>
                  <Link href="#features" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">FEATURES</Link>
                  <Link href="#about" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">ABOUT US</Link>
                  <Link href="#support" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">SUPPORT</Link>
                  <Link href="/login" className="text-blue-400 text-sm font-medium transition-colors hover:text-blue-300">LOGIN</Link>
                  <Link href="/register" className="glass-btn px-5 py-2 rounded-xl text-white text-sm font-medium transition-all active:scale-95 hover:scale-[1.02]">
                    SIGN UP
                  </Link>
                </>
              ) : (
                // Authenticated menu
                <>
                  <Link href="/dashboard" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">DASHBOARD</Link>
                  <Link href="#features" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">FEATURES</Link>
                  <Link href="#about" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">ABOUT</Link>
                  <Link href="#support" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">SUPPORT</Link>
                  <Link href="#notifications" className="nav-link text-white text-sm font-medium transition-colors hover:text-blue-400">NOTIFICATION</Link>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={logout}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      Logout
                    </button>
                    <button className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-white transition-transform hover:scale-105 active:scale-95">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white text-2xl w-9 h-9 flex items-center justify-center focus:outline-none transition-transform active:scale-90"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden glass mx-4 mb-4 rounded-2xl p-4 space-y-1 overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen ? 'max-h-[28rem] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 pointer-events-none'
          }`}
        >
          {!user ? (
            <>
              <Link href="#features" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link href="#about" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="#support" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              <Link href="/login" className="block text-blue-400 text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link href="/register" className="block glass-btn text-center text-white text-sm font-medium px-4 py-2.5 rounded-xl mt-2 transition-all active:scale-95" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              <Link href="#features" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link href="#about" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <Link href="#support" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Support</Link>
              <Link href="#notifications" className="block text-white text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>Notification</Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="block w-full text-left text-gray-300 text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-white/10">Logout</button>
              <div className="flex justify-center pt-2">
                <button className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-white">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </button>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 text-center pt-16">
        <div className="max-w-5xl mx-auto animate-fade-in-up">
          <h1 className="hero-title text-white mb-6 sm:mb-8">All-in-one collaboration platform</h1>
          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            Chat, boards, docs, and teamwork, all connected in one workspace.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            {!user ? (
              // Public CTA buttons
              <>
                <Link href="/register" className="glass-btn px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]">
                  Get Started Free
                </Link>
                <button
                  onClick={() => window.open('#', '_blank')}
                  className="glass-outline px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]"
                >
                  Watch Demo
                </button>
              </>
            ) : (
              // Logged‑in CTA
              <Link href="/dashboard" className="glass-btn px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]">
                My Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-white mb-10 sm:mb-16 tracking-tight">Everything you need in one place</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="glass feature-card rounded-3xl p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-4">📋</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">Kanban Boards</h3>
              <p className="text-gray-300 text-sm sm:text-base">Plan projects with drag-and-drop task boards.</p>
            </div>
            <div className="glass feature-card rounded-3xl p-6 sm:p-8 text-center">
              <div className="text-4xl sm:text-5xl mb-4">📝</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">Collaborative Docs</h3>
              <p className="text-gray-300 text-sm sm:text-base">Create documents together in real-time.</p>
            </div>
            <div className="glass feature-card rounded-3xl p-6 sm:p-8 text-center sm:col-span-2 md:col-span-1">
              <div className="text-4xl sm:text-5xl mb-4">💬</div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">Team Chat</h3>
              <p className="text-gray-300 text-sm sm:text-base">Fast messaging with channels and direct chat.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 text-gray-400 border-t border-white/5">
        © 2025 SyncSpace
      </footer>
    </>
  );
}