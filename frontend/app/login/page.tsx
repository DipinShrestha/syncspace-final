// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCredential = async (credential: string) => {
    setLoading(true);
    try {
      // Whether this account is new or returning is decided by the server,
      // not by the fact that the person is on the "Login" page — someone
      // who has never signed up can still land here and click the button.
      const { isNewUser } = await loginWithGoogle(credential);
      router.push(isNewUser ? '/onboarding' : '/dashboard');
    } catch {
      // error toast already shown by loginWithGoogle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center bg-white px-4 py-12 overflow-hidden">
      <div className="fixed top-4 right-4 z-20"><ThemeToggle /></div>
      {/* Subtle decorative accents — solid design elements, never backgrounds */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-dusty-200 rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 bg-sage-200 rounded-full blur-3xl opacity-40" />

      <div className="relative max-w-md w-full p-6 sm:p-8 rounded-2xl glass animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Welcome back</h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Log in to your SyncSpace account</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleSignInButton onCredential={handleCredential} text="signin_with" />
          {loading && <p className="text-sm text-gray-500">Signing you in…</p>}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          New here?{' '}
          <Link href="/register" className="text-black font-medium hover:opacity-60 transition-opacity">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
