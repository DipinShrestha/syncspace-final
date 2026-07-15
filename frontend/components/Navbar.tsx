'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

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
    <header className="fixed top-0 left-0 w-full z-50 bg-black/95 backdrop-blur-sm border-b border-white/5 text-white h-16 flex items-center justify-between px-4 sm:px-6 md:px-10">
      {/* Logo as image */}
      <Link href="/" className="logo transition-opacity hover:opacity-80">
        <img src="/Gemini_Generated_Image_wf220zwf220zwf22.png" alt="SyncSpace Logo" />
      </Link>

      <nav className="hidden md:flex items-center space-x-6 uppercase text-sm font-medium">
        {!user ? (
          <>
            <Link href="/login" className="nav-link relative transition-colors hover:text-blue-400">Login</Link>
            <Link href="/register" className="nav-link relative transition-colors hover:text-blue-400">Register</Link>
          </>
        ) : (
          <>
            <Link href="/dashboard" className="nav-link relative transition-colors hover:text-blue-400">Dashboard</Link>
            <Link href="/#features" className="nav-link relative transition-colors hover:text-blue-400">Features</Link>
            <Link href="/#about" className="nav-link relative transition-colors hover:text-blue-400">About</Link>
            <Link href="/#support" className="nav-link relative transition-colors hover:text-blue-400">Support</Link>
            <Link href="/#notifications" className="nav-link relative transition-colors hover:text-blue-400">Notification</Link>
            <button onClick={logout} className="nav-link relative transition-colors hover:text-blue-400">Logout</button>
            {/* Avatar dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold transition-transform hover:scale-105 active:scale-95 focus:outline-none"
              >
                {user.name?.charAt(0).toUpperCase()}
              </button>
              {showDropdown && (
                <div className="animate-fade-in-up absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-md shadow-lg py-1 z-50">
                  {isDashboard && (
                    <Link
                      href="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile / Settings
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Mobile menu button */}
      <button
        className="md:hidden flex flex-col justify-center items-center w-8 h-8"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className={`block w-6 h-0.5 bg-white mb-1 transition-transform ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
        <span className={`block w-6 h-0.5 bg-white mb-1 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block w-6 h-0.5 bg-white transition-transform ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
      </button>

      {/* Mobile menu overlay */}
      <div className={`fixed top-0 right-0 h-full w-64 bg-black border-l border-white/10 z-40 transform transition-transform duration-300 ${menuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden pt-20`}>
        <nav className="flex flex-col items-center space-y-6 uppercase text-sm font-medium">
          {!user ? (
            <>
              <Link href="/login" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link href="/#features" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Features</Link>
              <Link href="/#about" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>About</Link>
              <Link href="/#support" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Support</Link>
              <Link href="/#notifications" className="text-white transition-colors hover:text-blue-400" onClick={() => setMenuOpen(false)}>Notification</Link>
              <button className="text-white transition-colors hover:text-blue-400" onClick={() => { logout(); setMenuOpen(false); }}>Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}