import { useEffect, useMemo, useRef, useState } from 'react';
import { createGoogleSession, loginManualAccount, registerManualAccount } from '../utils/auth';
import './AuthScreen.css';

const DEFAULT_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const BOARD_PATTERN = [
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
];

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
  const googleButtonHostRef = useRef(null);
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
    if (!clientId || !googleReady || !googleButtonRef.current || !googleButtonHostRef.current || !window.google?.accounts?.id) return;

    const renderGoogleButton = () => {
      const width = Math.max(240, Math.min(googleButtonHostRef.current.clientWidth, 440));

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
        size: width < 340 ? 'medium' : 'large',
        width,
        text: 'signin_with',
        shape: 'pill',
      });
    };

    renderGoogleButton();

    const resizeObserver = new ResizeObserver(() => {
      renderGoogleButton();
    });

    resizeObserver.observe(googleButtonHostRef.current);

    return () => resizeObserver.disconnect();
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
        <section className="auth-visual" aria-hidden="true">
          <div className="auth-visual-orb auth-visual-orb-blue" />
          <div className="auth-visual-orb auth-visual-orb-gold" />

          <div className="auth-visual-frame">
            <div className="auth-board">
              {BOARD_PATTERN.map((row, rowIndex) =>
                row.map((tile, colIndex) => (
                  <span
                    key={`tile-${rowIndex}-${colIndex}`}
                    className={`auth-board-tile ${tile === 0 ? 'light' : 'dark'}`}
                  />
                )),
              )}
              <span className="auth-piece auth-piece-king">♔</span>
              <span className="auth-piece auth-piece-queen">♛</span>
              <span className="auth-piece auth-piece-knight">♞</span>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-top">
            <div className="auth-brand-lockup">
              <span className="auth-brand-mark">♛</span>
              <div>
                <p className="auth-brand-kicker">CheckmateAI</p>
                <h1>{mode === 'signup' ? 'Sign Up' : 'Sign In'}</h1>
              </div>
            </div>
            <p className="auth-brand-copy">Enter the board with a clean, fast, premium chess experience.</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); resetMessages(); }} type="button">
              Sign In
            </button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); resetMessages(); }} type="button">
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className="floating-field">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder=" " autoComplete="name" />
                <span>Full name</span>
              </label>
            )}

            <label className="floating-field">
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder=" " type="email" autoComplete="email" />
              <span>Email address</span>
            </label>

            <label className="floating-field">
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder=" " type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              <span>Password</span>
            </label>

            {mode === 'signup' && (
              <label className="floating-field">
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder=" " type="password" autoComplete="new-password" />
                <span>Confirm password</span>
              </label>
            )}

            {message && <div className="auth-message auth-message-error">{message}</div>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <div className="auth-google">
            {clientId ? (
              <div ref={googleButtonHostRef} className="google-button-host">
                <div ref={googleButtonRef} className="google-button-holder" />
                {googleError && <div className="auth-message auth-message-error">{googleError}</div>}
              </div>
            ) : (
              <div className="auth-message auth-message-info">
                Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable the Google button.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
