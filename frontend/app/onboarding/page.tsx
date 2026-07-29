'use client';

// Shown once, right after a brand-new Google sign-up (see login/register
// pages — they route here only when the server says isNewUser). Name and
// photo are already filled in from the Google account; this just lets
// someone adjust either before landing on their dashboard. Skipping is
// always fine since the account already works without this step.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, uploadAvatar } from '@/lib/api';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }
  }, [user, authLoading, router]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploadingAvatar(true);
    try {
      const { url } = await uploadAvatar(file);
      setAvatar(url);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const finish = async (path: string) => {
    router.push(path);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || user?.name, avatar });
      toast.success("You're all set!");
      await finish('/dashboard');
    } catch {
      toast.error('Failed to save — you can update this later in Settings');
      await finish('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl glass animate-fade-in-up">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">
            Welcome to SyncSpace
          </h2>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            We pulled your name and photo from Google — change either, or skip.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-dusty-600 flex items-center justify-center text-black font-semibold text-xl flex-shrink-0">
                {name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <label className="glass-outline px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 cursor-pointer">
              {uploadingAvatar ? 'Uploading…' : 'Change Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg glass-input transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving || uploadingAvatar}
              className="flex-1 glass-btn py-2.5 rounded-lg text-black font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save and continue'}
            </button>
            <button
              onClick={() => finish('/dashboard')}
              disabled={saving}
              className="px-5 py-2.5 glass-outline rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
