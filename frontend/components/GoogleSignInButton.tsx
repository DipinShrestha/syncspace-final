'use client';

// Renders Google's own "Sign in with Google" button via the Google Identity
// Services script (loaded once, reused by both the login and register
// pages — they are the same flow, see AuthContext.loginWithGoogle for why).
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
}

const SCRIPT_ID = 'google-identity-script';

export default function GoogleSignInButton({
  onCredential,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const divRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so the script-load effect doesn't need onCredential in its
  // dependency array (which would re-run the whole script-injection dance).
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error(
        'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in button cannot render.',
      );
      return;
    }

    const renderButton = () => {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      divRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text,
        shape: 'pill',
      });
    };

    if (window.google) {
      renderButton();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', renderButton);
      return () => existing.removeEventListener('load', renderButton);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.head.appendChild(script);
  }, [text]);

  return <div ref={divRef} className="flex justify-center min-h-[44px]" />;
}
