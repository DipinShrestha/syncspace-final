'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-black px-4 py-12">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl glass animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Create account</h2>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">Join SyncSpace for free</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white transition-colors focus:outline-none focus:border-dusty-500 focus:ring-2 focus:ring-dusty-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white transition-colors focus:outline-none focus:border-dusty-500 focus:ring-2 focus:ring-dusty-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white transition-colors focus:outline-none focus:border-dusty-500 focus:ring-2 focus:ring-dusty-500/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white transition-colors focus:outline-none focus:border-dusty-500 focus:ring-2 focus:ring-dusty-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn py-2.5 rounded-lg text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-dusty-300 hover:text-dusty-200 hover:underline transition-colors">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}