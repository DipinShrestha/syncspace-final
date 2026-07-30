import type { MetadataRoute } from 'next';

// Next.js App Router metadata file convention — this auto-generates
// /manifest.webmanifest, which is what makes the site installable
// (Mac/Windows via Chrome/Edge "Install app", Android via Chrome's
// "Add to Home screen", and — combined with the apple-* meta tags in
// layout.tsx — iOS Safari's "Add to Home Screen" too).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SyncSpace',
    short_name: 'SyncSpace',
    description: 'All-in-one real-time collaboration workspace — chat, boards, docs, and calls.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#82acbf',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
