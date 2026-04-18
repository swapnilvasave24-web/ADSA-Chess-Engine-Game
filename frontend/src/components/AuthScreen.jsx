import { useEffect, useMemo, useRef, useState } from 'react';
import { createGoogleSession, loginManualAccount, registerManualAccount } from '../utils/auth';
import './AuthScreen.css';

const DEFAULT_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const googleButtonRef = useRef(null);
  const clientId = useMemo(() => DEFAULT_GOOGLE_CLIENT_ID.trim(), []);

  useEffect(() => {
    if (!clientId) return undefined;

    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) return undefined;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setGoogleError('Google sign-in script could not load.');
    document.head.appendChild(script);

    return () => {};
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !googleReady || !googleButtonRef.current || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const result = createGoogleSession(response.credential);
        if (result.status === 'ok') {
          onAuthenticated(result.session);
          return;
        }
        setGoogleError(result.message);
      },
    });

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
      shape: 'pill',
    });
  }, [clientId, googleReady, onAuthenticated]);

  const resetMessages = () => {
    setMessage('');
    setGoogleError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setMessage('Please enter your name.');
          return;
        }

        if (password !== confirmPassword) {
          setMessage('Passwords do not match.');
          return;
        }

        const result = await registerManualAccount({ name, email, password });
        if (result.status === 'ok') {
          onAuthenticated(result.session);
          return;
        }

        setMessage(result.message);
        return;
      }

      const result = await loginManualAccount({ email, password });
      if (result.status === 'ok') {
        onAuthenticated(result.session);
        return;
      }

      setMessage(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-shell glass">
        <section className="auth-hero">
          <div className="auth-brand">
            <span className="auth-brand-mark">♛</span>
            <div>
              <p className="auth-kicker">CheckmateAI</p>
              <h1>Sign in to your chess workspace</h1>
            </div>
          </div>

          <p className="auth-copy">
            Save your session, switch between manual accounts, or continue with Google before entering the board.
          </p>

          <div className="auth-highlights">
            <div>
              <strong>Manual account</strong>
              <span>Email and password stored locally for demo use.</span>
            </div>
            <div>
              <strong>Google sign-in</strong>
              <span>Uses Google Identity Services when a client ID is configured.</span>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); resetMessages(); }} type="button">
              Log in
            </button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); resetMessages(); }} type="button">
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" />
              </label>
            )}

            <label>
              Email address
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" />
            </label>

            <label>
              Password
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </label>

            {mode === 'signup' && (
              <label>
                Confirm password
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat password" type="password" autoComplete="new-password" />
              </label>
            )}

            {message && <div className="auth-message auth-message-error">{message}</div>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="auth-google">
            {clientId ? (
              <>
                <div ref={googleButtonRef} className="google-button-holder" />
                {googleError && <div className="auth-message auth-message-error">{googleError}</div>}
              </>
            ) : (
              <div className="auth-message auth-message-info">
                Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable the Google sign-in button.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}