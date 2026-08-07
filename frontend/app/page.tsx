// app/page.tsx
'use client';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
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
  IconChevronDown,
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

interface ManualStep {
  number: string;
  title: string;
  summary: string;
  icon: typeof IconLayers;
  actions: string[];
  result: string;
}

const manualSteps: ManualStep[] = [
  {
    number: '01',
    title: 'Sign in securely',
    summary: 'Enter SyncSpace with your Google account.',
    icon: IconCheck,
    actions: [
      'Select Sign Up or Login from the home page.',
      'Choose your Google account and approve the sign-in request.',
      'For a new account, review your name and profile photo during onboarding.',
    ],
    result: 'SyncSpace verifies your Google identity, creates or finds your account, and opens an authenticated session.',
  },
  {
    number: '02',
    title: 'Create a workspace',
    summary: 'Set up one central place for a team or project.',
    icon: IconLayers,
    actions: [
      'Open Dashboard and select + New Workspace.',
      'Add a clear workspace name and a short project description.',
      'Open the workspace card from Your Workspaces to enter it.',
    ],
    result: 'The workspace becomes the main container for members, boards, messages, documents, calls, and analytics.',
  },
  {
    number: '03',
    title: 'Invite your team',
    summary: 'Add members and control workspace access.',
    icon: IconUsers,
    actions: [
      'Open the Members area inside the workspace.',
      'Enter a teammate’s email address and send the invitation.',
      'Manage member roles or remove access when required.',
    ],
    result: 'Invited users can access the workspace after signing in with the invited Google email address.',
  },
  {
    number: '04',
    title: 'Plan work on boards',
    summary: 'Create, assign, and move task cards through each stage.',
    icon: IconLayers,
    actions: [
      'Create or open a Kanban board inside the workspace.',
      'Add task cards with descriptions, dates, labels, assignees, comments, and attachments.',
      'Drag cards between lists to reflect the current work status.',
    ],
    result: 'The board gives the team one visual view of pending, active, and completed work.',
  },
  {
    number: '05',
    title: 'Communicate in real time',
    summary: 'Use workspace chat, notifications, and calls.',
    icon: IconChat,
    actions: [
      'Open Workspace Chat to send messages to connected members.',
      'Use the call controls to start an audio or video call.',
      'Check the notification bell for invitations, assignments, comments, messages, and call activity.',
    ],
    result: 'Socket.IO delivers supported live events, while WebRTC and PeerJS handle browser-based calls.',
  },
  {
    number: '06',
    title: 'Write shared documents',
    summary: 'Keep project notes and documentation inside the workspace.',
    icon: IconFileText,
    actions: [
      'Open Documents and create a new document.',
      'Use the rich-text toolbar to format headings, lists, links, and other content.',
      'Save changes so workspace members can open the latest stored version.',
    ],
    result: 'Project documentation stays connected to the same workspace instead of being scattered across separate tools.',
  },
  {
    number: '07',
    title: 'Write and run JavaScript',
    summary: 'Use the built-in Monaco code editor for quick code work.',
    icon: IconCode,
    actions: [
      'Open the Code Editor from the workspace navigation.',
      'Write or paste JavaScript with syntax highlighting.',
      'Run the code and review its output directly in the editor area.',
    ],
    result: 'The editor provides a convenient browser-based environment for demonstrations, reviews, and small code experiments.',
  },
  {
    number: '08',
    title: 'Review progress',
    summary: 'Use analytics and activity updates to follow the project.',
    icon: IconChart,
    actions: [
      'Open Analytics from the workspace navigation.',
      'Review board and task statistics to understand current progress.',
      'Return to the dashboard to switch between workspaces or create a new one.',
    ],
    result: 'Workspace information is summarized in one place so the team can identify progress and pending work.',
  },
];

const workflowNodes = [
  { label: 'Browser', detail: 'Next.js interface' },
  { label: 'Authentication', detail: 'Google OAuth + JWT' },
  { label: 'Application', detail: 'REST API + Socket.IO' },
  { label: 'Data & files', detail: 'MongoDB + Cloudinary' },
  { label: 'Calls', detail: 'WebRTC + PeerJS' },
];

const supportFaqs = [
  {
    question: 'Why can’t I open a workspace?',
    answer: 'Confirm that you are signed in with the same Google email address that was invited. Ask the workspace owner to verify the invitation or add you again.',
  },
  {
    question: 'Why are messages or notifications delayed?',
    answer: 'Check your internet connection, refresh the page, and make sure the browser has not suspended the tab. Real-time features require an active connection to the SyncSpace server.',
  },
  {
    question: 'Why is my microphone or camera not working?',
    answer: 'Allow microphone and camera permission in the browser, close other applications using those devices, and rejoin the call. Some browsers may require HTTPS for media access.',
  },
  {
    question: 'Where are uploaded files stored?',
    answer: 'Uploaded file metadata is connected to SyncSpace records, while supported uploaded files are stored through Cloudinary.',
  },
];

export default function LandingPage() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeManualStep, setActiveManualStep] = useState(0);

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
          background: currentColor;
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
        @keyframes manual-panel-in {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes workflow-scan {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(520%);
          }
        }
        .manual-panel-enter {
          animation: manual-panel-in 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .manual-step-button {
          position: relative;
          overflow: hidden;
        }
        .manual-step-button::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 3px;
          background: currentColor;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.25s ease;
        }
        .manual-step-button:hover::before,
        .manual-step-button[data-active='true']::before {
          transform: scaleY(1);
        }
        .workflow-track {
          position: relative;
          overflow: hidden;
        }
        .workflow-track::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 22%;
          background: linear-gradient(90deg, transparent, rgba(122, 172, 255, 0.25), transparent);
          animation: workflow-scan 5.5s linear infinite;
          pointer-events: none;
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
                  <ThemeToggle compact />
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
                    <ThemeToggle compact />
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
              <ThemeToggle compact />
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

      {/* SUPPORT & USER MANUAL SECTION */}
      <section id="support" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-10 sm:mb-14">
            <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] uppercase text-dusty-800 mb-3">
              Support Centre
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold text-black tracking-tight mb-5">
              SyncSpace user manual
            </h2>
            <p className="text-gray-600 text-sm sm:text-lg leading-relaxed">
              Follow the complete workflow below to sign in, create a workspace, invite your team,
              manage tasks, communicate, write documents, run JavaScript, and review progress.
            </p>
          </div>

          {/* Interactive manual: sharp-edged navigation + animated detail panel */}
          <div className="grid lg:grid-cols-[0.86fr_1.5fr] border border-black/15 bg-white/45 backdrop-blur-xl shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <div className="border-b lg:border-b-0 lg:border-r border-black/15">
              <div className="px-5 py-4 border-b border-black/15 bg-black text-white">
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/60">Quick-start guide</p>
                <p className="text-lg font-semibold mt-1">Choose a step</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-1">
                {manualSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const active = activeManualStep === index;
                  return (
                    <button
                      key={step.number}
                      type="button"
                      data-active={active}
                      onClick={() => setActiveManualStep(index)}
                      className={`manual-step-button min-h-24 text-left px-4 sm:px-5 py-4 border-b border-black/10 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dusty-600 ${
                        index % 2 === 0 ? 'sm:border-r lg:border-r-0' : ''
                      } ${
                        active
                          ? 'bg-dusty-100/90 text-black translate-x-0'
                          : 'bg-white/50 hover:bg-white hover:pl-6'
                      }`}
                      aria-pressed={active}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-9 h-9 flex items-center justify-center border flex-shrink-0 transition-colors ${
                            active ? 'border-black bg-black text-white' : 'border-black/20 bg-white text-black'
                          }`}
                        >
                          <StepIcon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-bold tracking-[0.18em] text-gray-500 mb-1">
                            STEP {step.number}
                          </span>
                          <span className="block text-sm font-semibold leading-tight">{step.title}</span>
                          <span className="hidden sm:block text-xs text-gray-500 mt-1 leading-relaxed">
                            {step.summary}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative min-h-[530px] p-5 sm:p-8 lg:p-10 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-dusty-200/60 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-sage-200/60 blur-3xl rounded-full pointer-events-none" />

              <div key={activeManualStep} className="manual-panel-enter relative z-10">
                {(() => {
                  const step = manualSteps[activeManualStep];
                  const StepIcon = step.icon;
                  return (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-5">
                            <span className="w-12 h-12 border border-black bg-black text-white flex items-center justify-center">
                              <StepIcon className="w-5 h-5" />
                            </span>
                            <span className="text-xs font-bold tracking-[0.22em] text-gray-500">
                              STEP {step.number} / {String(manualSteps.length).padStart(2, '0')}
                            </span>
                          </div>
                          <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-black mb-3">
                            {step.title}
                          </h3>
                          <p className="text-sm sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                            {step.summary}
                          </p>
                        </div>
                        <div className="w-full sm:w-28 border border-black/15 bg-white/60 px-3 py-3 text-center">
                          <div className="text-2xl font-bold text-black">{step.number}</div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 mt-1">Manual step</div>
                        </div>
                      </div>

                      <div className="space-y-3 mb-7">
                        {step.actions.map((action, actionIndex) => (
                          <div
                            key={action}
                            className="group grid grid-cols-[42px_1fr] border border-black/15 bg-white/65 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/35 hover:bg-white"
                            style={{ animationDelay: `${actionIndex * 70}ms` }}
                          >
                            <div className="border-r border-black/15 flex items-center justify-center font-mono text-xs font-bold text-dusty-800 group-hover:bg-dusty-50 transition-colors">
                              {String(actionIndex + 1).padStart(2, '0')}
                            </div>
                            <p className="px-4 py-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                              {action}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="border-l-4 border-sage-600 bg-sage-50/80 px-5 py-4">
                        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sage-800 mb-1">
                          What happens next
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{step.result}</p>
                      </div>

                      <div className="flex items-center justify-between mt-8 pt-5 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => setActiveManualStep((current) => Math.max(0, current - 1))}
                          disabled={activeManualStep === 0}
                          className="border border-black/20 bg-white px-4 py-2 text-xs sm:text-sm font-medium transition-all hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black"
                        >
                          Previous
                        </button>
                        <div className="flex gap-1.5" aria-hidden="true">
                          {manualSteps.map((stepItem, index) => (
                            <span
                              key={stepItem.number}
                              className={`h-1.5 transition-all duration-300 ${
                                index === activeManualStep ? 'w-8 bg-black' : 'w-2 bg-black/15'
                              }`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveManualStep((current) => Math.min(manualSteps.length - 1, current + 1))
                          }
                          disabled={activeManualStep === manualSteps.length - 1}
                          className="border border-black bg-black text-white px-4 py-2 text-xs sm:text-sm font-medium transition-all hover:bg-dusty-700 disabled:opacity-30"
                        >
                          Next step
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Technical workflow strip */}
          <div className="mt-10 sm:mt-14">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] tracking-[0.2em] uppercase font-semibold text-gray-500 mb-2">
                  System workflow
                </p>
                <h3 className="text-xl sm:text-3xl font-bold tracking-tight">How SyncSpace runs</h3>
              </div>
              <span className="hidden sm:block text-xs text-gray-500">From browser action to stored data</span>
            </div>
            <div className="workflow-track grid grid-cols-1 sm:grid-cols-5 border-t border-l border-black/15 bg-white/45">
              {workflowNodes.map((node, index) => (
                <div
                  key={node.label}
                  className="relative min-h-28 px-4 py-5 border-r border-b border-black/15 bg-white/50 transition-all duration-300 hover:bg-white hover:-translate-y-1"
                >
                  <div className="text-[10px] font-bold tracking-[0.18em] text-dusty-800 mb-4">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <p className="font-semibold text-sm text-black">{node.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{node.detail}</p>
                  {index < workflowNodes.length - 1 && (
                    <span className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-black text-white text-xs leading-5 text-center">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Troubleshooting + contact */}
          <div className="grid lg:grid-cols-[1.45fr_0.75fr] gap-6 mt-10 sm:mt-14">
            <div className="border border-black/15 bg-white/55">
              <div className="px-5 sm:px-6 py-5 border-b border-black/15">
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500 mb-2">
                  Common questions
                </p>
                <h3 className="text-xl sm:text-2xl font-bold">Troubleshooting guide</h3>
              </div>
              <div>
                {supportFaqs.map((faq, index) => (
                  <details key={faq.question} className="group border-b last:border-b-0 border-black/10">
                    <summary className="list-none cursor-pointer px-5 sm:px-6 py-5 flex items-center justify-between gap-4 text-sm sm:text-base font-semibold hover:bg-white transition-colors">
                      <span className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-400">{String(index + 1).padStart(2, '0')}</span>
                        {faq.question}
                      </span>
                      <IconChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="px-12 sm:px-14 pb-5 text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="border border-black bg-black text-white p-6 sm:p-8 flex flex-col justify-between min-h-80">
              <div>
                <div className="w-11 h-11 border border-white/30 flex items-center justify-center mb-7">
                  <IconSend className="w-5 h-5" />
                </div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/50 mb-3">Still need help?</p>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Contact SyncSpace support</h3>
                <p className="text-sm text-white/65 leading-relaxed">
                  Report a bug, ask a question, or suggest a feature. Include the page name, the action you performed, and a screenshot when possible.
                </p>
              </div>
              <a
                href="mailto:bipinshrestha266@gmail.com?subject=SyncSpace%20Support%20Request"
                className="mt-8 inline-flex items-center justify-between border border-white bg-white text-black px-5 py-3 text-sm font-semibold transition-all hover:bg-dusty-500"
              >
                Email support
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-8 text-gray-600 border-t border-gray-200">
        © {new Date().getFullYear()} SyncSpace
      </footer>
    </>
  );
}
