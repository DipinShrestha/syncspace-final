// app/page.tsx
'use client';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import {
  IconLayers,
  IconFileText,
  IconChat,
  IconPhone,
  IconVideoCam,
  IconMic,
  IconCode,
  IconBell,
  IconUsers,
  IconChart,
  IconCheck,
  IconCrown,
  IconSend,
} from '@/components/icons';

// ── Illustrative feature mockups ──────────────────────────────────────────
// Small, self-contained "screenshots" built out of divs/icons rather than
// real photos — each one is a simplified stand-in for the actual product
// surface, styled with the same glass/rounded system as the live app so it
// reads as "this is what it looks like", not a generic stock illustration.

function BoardsMockup() {
  const cols = [
    { label: 'To Do', chips: ['Design review', 'Write API docs'] },
    { label: 'In Progress', chips: ['Fix login bug'] },
    { label: 'Done', chips: ['Set up repo'] },
  ];
  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex gap-3">
        {cols.map((col) => (
          <div key={col.label} className="flex-1 min-w-0 bg-white/60 rounded-lg p-2 space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 px-0.5">{col.label}</div>
            {col.chips.map((chip) => (
              <div
                key={chip}
                className="glass-outline rounded-md px-2 py-1.5 text-[11px] text-black truncate"
              >
                {chip}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-sage-600 flex items-center justify-center text-black text-[10px] font-bold flex-shrink-0">
          P
        </div>
        <div className="bg-white/70 rounded-lg px-3 py-1.5 text-xs text-gray-800">Hi team 👋</div>
      </div>
      <div className="flex justify-end">
        <div className="bg-dusty-600 rounded-lg px-3 py-1.5 text-xs text-black">On it, one sec</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-sage-600 flex items-center justify-center text-black text-[10px] font-bold flex-shrink-0">
          P
        </div>
        <div className="bg-white/70 rounded-lg px-3 py-1.5 text-xs text-gray-800 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-500" /> typing…
        </div>
      </div>
    </div>
  );
}

function CallMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-black mb-3">
        <span className="inline-block w-2 h-2 rounded-full bg-sage-500" />
        Video call in progress
      </div>
      <div className="flex justify-center gap-8 py-3">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 rounded-full bg-dusty-600 flex items-center justify-center text-black font-bold ring-4 ring-dusty-200">
            B
          </div>
          <span className="text-[10px] text-gray-500">You</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 rounded-full bg-sage-600 flex items-center justify-center text-black font-bold ring-4 ring-sage-200">
            P
          </div>
          <span className="text-[10px] text-gray-500">Pramisha</span>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-full glass-outline flex items-center justify-center">
          <IconMic className="w-3.5 h-3.5" />
        </div>
        <div className="w-8 h-8 rounded-full glass-outline flex items-center justify-center">
          <IconVideoCam className="w-3.5 h-3.5" />
        </div>
        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center">
          <IconPhone className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

function DocsMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-2.5 w-24 bg-gray-300 rounded-full" />
        <span className="text-[10px] text-sage-700 bg-sage-50 rounded-full px-2 py-0.5">
          Pramisha is editing
        </span>
      </div>
      <div className="h-2 w-full bg-gray-200 rounded-full" />
      <div className="h-2 w-5/6 bg-gray-200 rounded-full" />
      <div className="h-2 w-3/4 bg-gray-200 rounded-full" />
      <div className="h-2 w-full bg-gray-200 rounded-full" />
      <div className="h-2 w-2/3 bg-dusty-200 rounded-full" />
    </div>
  );
}

function CodeMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 font-mono text-[11px] space-y-1">
      <div>
        <span className="text-dusty-700">function</span>{' '}
        <span className="text-sage-700">handleSubmit</span>() {'{'}
      </div>
      <div className="pl-4 text-gray-600">setLoading(<span className="text-amber-600">true</span>);</div>
      <div className="pl-4 text-gray-600">
        await <span className="text-dusty-700">api</span>.save(data);
      </div>
      <div>{'}'}</div>
    </div>
  );
}

function NotificationsMockup() {
  const items = [
    { icon: IconChat, text: 'New message from Pramisha', color: 'text-dusty-700 bg-dusty-50' },
    { icon: IconPhone, text: 'Bipin started a video call', color: 'text-sage-700 bg-sage-50' },
    { icon: IconUsers, text: 'You were invited to "Design Team"', color: 'text-amber-700 bg-amber-50' },
  ];
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 space-y-2">
      {items.map((item) => (
        <div key={item.text} className="flex items-center gap-2.5 bg-white/60 rounded-lg px-3 py-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
            <item.icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs text-gray-800 truncate">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function MembersMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {['B', 'P', 'S'].map((initial, i) => (
            <div
              key={initial}
              className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-black ${
                i === 0 ? 'bg-dusty-600' : i === 1 ? 'bg-sage-600' : 'bg-amber-500'
              }`}
            >
              {initial}
            </div>
          ))}
        </div>
        <span className="glass-btn rounded-full px-3 py-1 text-[11px] font-medium">+ Invite</span>
      </div>
      <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
        <IconCrown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs text-gray-800 truncate">newfriend@gmail.com</span>
        <span className="text-[10px] text-gray-500 ml-auto flex-shrink-0">not signed up yet</span>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [40, 70, 55, 90, 65];
  return (
    <div className="glass rounded-3xl p-4 sm:p-5">
      <div className="flex items-end gap-2.5 h-24">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md ${i % 2 === 0 ? 'bg-dusty-500' : 'bg-sage-500'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="text-[10px] text-gray-500 mt-2 text-center">Tasks completed per board</div>
    </div>
  );
}

function GoogleMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
        <IconCheck className="w-6 h-6 text-sage-600" />
      </div>
      <div className="glass-outline rounded-full px-4 py-2 text-xs font-medium text-black">
        Continue with Google
      </div>
      <p className="text-[10px] text-gray-500">No passwords to remember or leak.</p>
    </div>
  );
}

function PwaMockup() {
  return (
    <div className="glass rounded-3xl p-4 sm:p-5 flex items-center justify-center gap-4">
      <div className="w-12 h-16 rounded-lg bg-white/70 border border-white/80 flex items-center justify-center">
        <div className="w-7 h-7 rounded-lg bg-dusty-600" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-full glass-btn flex items-center justify-center text-xs font-bold">
          ↓
        </div>
        <span className="text-[10px] text-gray-500">Install</span>
      </div>
      <div className="w-9 h-16 rounded-2xl bg-white/70 border border-white/80 flex items-center justify-center">
        <div className="w-5 h-5 rounded-md bg-sage-600" />
      </div>
    </div>
  );
}

interface Feature {
  icon: typeof IconLayers;
  iconBg: string;
  title: string;
  description: string;
  how: string;
  Mockup: () => ReactElement;
}

const features: Feature[] = [
  {
    icon: IconLayers,
    iconBg: 'bg-dusty-50 text-dusty-700',
    title: 'Kanban Boards',
    description: 'Plan and track work with drag-and-drop task boards.',
    how: 'Every workspace gets a board with To Do, In Progress, Review, and Done columns. Drag cards between columns, filter by assignee or label, and open any card for a description, start/due dates, and comments. Only the workspace owner adds new cards, keeping the board tidy.',
    Mockup: BoardsMockup,
  },
  {
    icon: IconChat,
    iconBg: 'bg-sage-50 text-sage-700',
    title: 'Real-time Team Chat',
    description: 'Instant messaging scoped to each workspace.',
    how: 'Messages sync live over a socket connection the moment they’re sent — no refreshing. Anyone not currently on the chat tab gets a push notification instead, so nothing gets missed.',
    Mockup: ChatMockup,
  },
  {
    icon: IconPhone,
    iconBg: 'bg-dusty-50 text-dusty-700',
    title: 'Audio & Video Calls',
    description: 'Start a call straight from the chat header.',
    how: 'Click the call icon next to "Workspace Chat" and pick Audio or Video. Calls connect peer-to-peer over WebRTC, and everyone else in the workspace gets an instant notification so they can jump in.',
    Mockup: CallMockup,
  },
  {
    icon: IconFileText,
    iconBg: 'bg-sage-50 text-sage-700',
    title: 'Collaborative Documents',
    description: 'Write and edit documents together in real time.',
    how: 'Each workspace has a shared document editor — open it and start typing alongside your team, with changes visible as they happen.',
    Mockup: DocsMockup,
  },
  {
    icon: IconCode,
    iconBg: 'bg-dusty-50 text-dusty-700',
    title: 'Live Code Editor',
    description: 'A built-in Monaco editor for sharing and reviewing code.',
    how: 'Attach code snippets directly to a card, or open the standalone code editor tab to write and share code with syntax highlighting — no separate tool needed.',
    Mockup: CodeMockup,
  },
  {
    icon: IconBell,
    iconBg: 'bg-sage-50 text-sage-700',
    title: 'Live Notifications',
    description: 'One bell for everything happening across your workspaces.',
    how: 'New messages, comments, task assignments, incoming calls, and invitations all land in the notification bell instantly, and persist so you can catch up later even if you were offline.',
    Mockup: NotificationsMockup,
  },
  {
    icon: IconUsers,
    iconBg: 'bg-dusty-50 text-dusty-700',
    title: 'Members & Invites',
    description: 'Invite anyone by email — even if they haven’t signed up yet.',
    how: 'Add a teammate by email and they’ll see the invite the moment they sign in with Google for the first time. Manage roles, leave a workspace, or remove members from one place.',
    Mockup: MembersMockup,
  },
  {
    icon: IconChart,
    iconBg: 'bg-sage-50 text-sage-700',
    title: 'Analytics Dashboard',
    description: 'See how work is actually moving across your boards.',
    how: 'A per-workspace analytics view tracks completed vs. open tasks so you can spot bottlenecks without digging through every board manually.',
    Mockup: AnalyticsMockup,
  },
  {
    icon: IconCheck,
    iconBg: 'bg-dusty-50 text-dusty-700',
    title: 'Secure Google Sign-In',
    description: 'One click to sign up or log in — no passwords.',
    how: 'SyncSpace uses Google sign-in exclusively, so there’s no password to create, forget, or have leaked. First-time sign-in walks you through a quick profile setup; returning users land straight on their dashboard.',
    Mockup: GoogleMockup,
  },
  {
    icon: IconSend,
    iconBg: 'bg-sage-50 text-sage-700',
    title: 'Install as an App',
    description: 'Works like a native app on any device.',
    how: 'SyncSpace is a full PWA — install it from the browser on Mac, Windows, iPhone, or Android for a fullscreen, app-like experience with its own icon on your home screen or dock.',
    Mockup: PwaMockup,
  },
];

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
          background: black;
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
                  <Link
                    href="#features"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    FEATURES
                  </Link>
                  <Link
                    href="#about"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    ABOUT US
                  </Link>
                  <Link
                    href="#support"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    SUPPORT
                  </Link>
                  <Link
                    href="/login"
                    className="text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    LOGIN
                  </Link>
                  <Link
                    href="/register"
                    className="glass-btn px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 hover:scale-[1.02]"
                  >
                    SIGN UP
                  </Link>
                </>
              ) : (
                // Authenticated menu
                <>
                  <Link
                    href="/dashboard"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    DASHBOARD
                  </Link>
                  <Link
                    href="#features"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    FEATURES
                  </Link>
                  <Link
                    href="#about"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    ABOUT
                  </Link>
                  <Link
                    href="#support"
                    className="nav-link text-black text-sm font-medium transition-opacity hover:opacity-60"
                  >
                    SUPPORT
                  </Link>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={logout}
                      className="text-sm text-black transition-opacity hover:opacity-60"
                    >
                      Logout
                    </button>
                    <NotificationBell />
                    <button className="w-10 h-10 rounded-full bg-dusty-600 flex items-center justify-center font-semibold text-black transition-transform hover:scale-105 active:scale-95 overflow-hidden">
                      {user.avatar && !user.avatar.includes('placeholder') ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: bell always visible, hamburger opens the rest of the menu */}
            <div className="md:hidden flex items-center gap-1">
              {user && <NotificationBell />}
              <button
                className="text-black text-2xl w-9 h-9 flex items-center justify-center focus:outline-none transition-transform active:scale-90"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden glass mx-4 mb-4 rounded-2xl p-4 space-y-1 overflow-hidden transition-all duration-300 ease-out ${
            mobileMenuOpen
              ? 'max-h-[28rem] opacity-100 mt-2'
              : 'max-h-0 opacity-0 mt-0 pointer-events-none'
          }`}
        >
          {!user ? (
            <>
              <Link
                href="#features"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#about"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="#support"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Support
              </Link>
              <Link
                href="/login"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="block glass-btn text-center text-sm font-medium px-4 py-2.5 rounded-xl mt-2 transition-all active:scale-95"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="#features"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#about"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="#support"
                className="block text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Support
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left text-black text-sm font-medium py-2 px-2 rounded-lg transition-colors hover:bg-gray-100"
              >
                Logout
              </button>
              <div className="flex justify-center pt-2">
                <button className="w-10 h-10 rounded-full bg-dusty-600 flex items-center justify-center font-semibold text-black">
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
          <h1 className="hero-title text-black mb-6 sm:mb-8">All-in-one collaboration platform</h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            Chat, boards, docs, and teamwork, all connected in one workspace.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            {!user ? (
              // Public CTA buttons
              <>
                <Link
                  href="/register"
                  className="glass-btn px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]"
                >
                  Get Started Free
                </Link>
                <Link
                  href="#features"
                  className="glass-outline px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]"
                >
                  See Features
                </Link>
              </>
            ) : (
              // Logged‑in CTA
              <Link
                href="/dashboard"
                className="glass-btn px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all active:scale-95 hover:scale-[1.02]"
              >
                My Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-black mb-3 tracking-tight">
            Everything you need in one place
          </h2>
          <p className="text-center text-gray-600 text-sm sm:text-base mb-12 sm:mb-20 max-w-xl mx-auto">
            Every feature in SyncSpace, and exactly how it works.
          </p>

          <div className="space-y-14 sm:space-y-24">
            {features.map((feature, i) => {
              const Mockup = feature.Mockup;
              const reverse = i % 2 === 1;
              return (
                <div
                  key={feature.title}
                  className={`flex flex-col ${
                    reverse ? 'md:flex-row-reverse' : 'md:flex-row'
                  } items-center gap-8 sm:gap-12`}
                >
                  <div className="w-full md:w-1/2">
                    <Mockup />
                  </div>
                  <div className="w-full md:w-1/2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feature.iconBg}`}
                    >
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-700 text-sm sm:text-base mb-2">{feature.description}</p>
                    <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed">
                      {feature.how}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-black mb-6 tracking-tight">
            About SyncSpace
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg leading-relaxed">
            SyncSpace is a free, all-in-one workspace built for students and small teams who are
            tired of juggling separate apps for chat, tasks, documents, and calls. Everything your
            team needs to plan, discuss, and ship work together lives in one place.
          </p>
        </div>
      </section>

      {/* SUPPORT SECTION */}
      <section id="support" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-black mb-6 tracking-tight">Support</h2>
          <p className="text-gray-600 text-sm sm:text-lg leading-relaxed mb-6">
            Have a question, found a bug, or want to suggest a feature? Reach out and we'll get
            back to you.
          </p>
          <a
            href="mailto:bipinshrestha266@gmail.com"
            className="inline-block glass-btn px-6 py-3 rounded-xl text-sm sm:text-base font-medium transition-all active:scale-95 hover:scale-[1.02]"
          >
            Contact Us
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 text-gray-600 border-t border-gray-200">
        © {new Date().getFullYear()} SyncSpace
      </footer>
    </>
  );
}
