'use client';

import { useEffect } from 'react';

// Registers /sw.js once on mount. Silently no-ops on browsers without
// service worker support (or during local http:// dev where some browsers
// disallow SW registration on non-localhost origins) — PWA install still
// works without it in Chromium browsers via just the manifest, this just
// adds the offline app-shell fallback on top.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
