'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { googleAuth, getMe } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // Sign-in is Google-only. Returns `isNewUser` so the caller (login/register
  // page) can decide whether to send the person to the onboarding step —
  // that decision is made from the server's answer, not from which button
  // ("Login" vs "Register") they clicked.
  loginWithGoogle: (credential: string) => Promise<{ isNewUser: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await googleAuth(credential);
      localStorage.setItem('token', res.data.token);
      setUser(res.data);
      toast.success(res.data.isNewUser ? 'Welcome to SyncSpace!' : 'Logged in successfully');
      return { isNewUser: res.data.isNewUser };
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    router.push('/login');
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
