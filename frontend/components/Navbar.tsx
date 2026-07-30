'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="glass-nav fixed top-0 left-0 w-full z-50 text-black h-16 flex items-center justify-between px-4 sm:px-6 md:px-10">
      {/* Logo as image */}
      <Link href="/" className="logo transition-opacity hover:opacity-80">
        <img src="/Gemini_Generated_Image_wf220zwf220zwf22.png" alt="SyncSpace Logo" />
      </Link>

      <nav className="hidden md:flex items-center space-x-6 uppercase text-sm font-medium">
        {!user ? (
          <>
            <Link href="/login" className="nav-link relative transition-opacity hover:opacity-60">
              Login
            </Link>
            <Link
              href="/register"
              className="glass-btn px-4 py-2 rounded-lg normal-case font-medium transition-all active:scale-95 hover:scale-[1.02]"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="nav-link relative transition-opacity hover:opacity-60">
              Dashboard
            </Link>
            <Link href="/#features" className="nav-link relative transition-opacity hover:opacity-60">
              Features
            </Link>
            <Link href="/#about" className="nav-link relative transition-opacity hover:opacity-60">
              About
            </Link>
            <Link href="/#support" className="nav-link relative transition-opacity hover:opacity-60">
              Support
            </Link>
            <button onClick={logout} className="nav-link relative transition-opacity hover:opacity-60">
              Logout
            </button>
            <div className="normal-case">
              <NotificationBell />
            </div>
            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-8 h-8 rounded-full bg-dusty-600 flex items-center justify-center text-sm font-semibold text-black transition-transform hover:scale-105 active:scale-95 focus:outline-none overflow-hidden"
              >
                {user.avatar && !user.avatar.includes('placeholder') ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </button>
              {showDropdown && (
                <div className="animate-fade-in-up glass absolute right-0 mt-2 w-48 rounded-2xl shadow-lg py-1 z-50">
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile / Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Mobile: bell always visible, hamburger opens the rest of the menu */}
      <div className="md:hidden flex items-center gap-1">
        {user && <NotificationBell />}
        <button
          className="flex flex-col justify-center items-center w-8 h-8"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span
            className={`block w-6 h-0.5 bg-black mb-1 transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
          />
          <span className={`block w-6 h-0.5 bg-black mb-1 ${menuOpen ? 'opacity-0' : ''}`} />
          <span
            className={`block w-6 h-0.5 bg-black transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
          />
        </button>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`glass fixed top-0 right-0 h-full w-64 rounded-l-3xl z-40 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden pt-20`}
      >
        <nav className="flex flex-col items-center space-y-6 uppercase text-sm font-medium">
          {!user ? (
            <>
              <Link
                href="/login"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/#features"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/#about"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/#support"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Support
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => setMenuOpen(false)}
              >
                Profile / Settings
              </Link>
              <button
                className="text-black transition-opacity hover:opacity-60"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
