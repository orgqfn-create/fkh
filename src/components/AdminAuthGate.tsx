import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

export const AdminAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    authLoading,
    isAdmin,
    loginWithEmail,
    loginWithGoogle,
    resetPassword,
    resendVerificationEmail,
    logout,
    setActiveTab,
    showToast,
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (authLoading) {
    return (
      <div className="max-w-md mx-auto w-full px-4 py-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary animate-pulse">
          <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
        </div>
        <p className="text-sm text-on-surface-variant">Verifying Operations HQ credentials...</p>
      </div>
    );
  }

  if (currentUser && isAdmin) {
    return <>{children}</>;
  }

  // Signed in, but either email not verified OR not an administrator
  if (currentUser && !isAdmin) {
    const needsVerification = !currentUser.emailVerified;
    return (
      <div className="max-w-md mx-auto w-full px-4 py-12">
        <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xl border border-outline-variant/20 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-[28px]">
              {needsVerification ? 'mark_email_unread' : 'gpp_bad'}
            </span>
          </div>
          <h1 className="font-[var(--font-display)] text-2xl text-primary font-semibold">
            {needsVerification ? 'Email Verification Required' : 'Access Denied'}
          </h1>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {needsVerification ? (
              <>
                Signed in as <strong className="text-on-surface">{currentUser.email}</strong>, but
                your email address is not yet verified. Verify your inbox before accessing
                administrative controls.
              </>
            ) : (
              <>
                Account <strong className="text-on-surface">{currentUser.email}</strong> does not
                have administrator privileges. Customer accounts cannot access restaurant
                operations.
              </>
            )}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {needsVerification && (
              <button
                type="button"
                onClick={resendVerificationEmail}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-tertiary cursor-pointer"
              >
                Resend Verification Email
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('menu-bbq')}
              className="w-full py-2.5 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-bright cursor-pointer"
            >
              Return to Customer Menu
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 rounded-xl bg-secondary-container/70 text-on-secondary-container text-xs font-bold hover:brightness-110 cursor-pointer"
            >
              Sign Out &amp; Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email.trim()) {
      setErrorMessage('Please enter your administrator email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (forgotMode) {
        await resetPassword(email);
        setSuccessMessage('Password reset instructions sent to your email inbox.');
        showToast('Password reset email dispatched', 'mail');
      } else {
        if (!password) {
          setErrorMessage('Please enter your password.');
          setSubmitting(false);
          return;
        }
        await loginWithEmail(email, password);
        showToast('Signed in to Operations HQ');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMessage(
          'Email/Password sign-in is not yet enabled in Firebase Authentication. Enable it under Authentication -> Sign-in method, or use Google Sign-In below.'
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/user-not-found') {
        setErrorMessage('No administrator account found with this email.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many attempts. Please wait a moment and try again.');
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await loginWithGoogle();
      showToast('Authenticated with Google');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err instanceof Error ? err.message : 'Google Sign-In failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 py-10">
      <div className="bg-surface-container-low rounded-2xl p-6 shadow-2xl border border-outline-variant/20 space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-[24px]">shield_person</span>
          </div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">
            Burns Road Central Kitchen
          </span>
          <h1 className="font-[var(--font-display)] text-2xl text-on-surface font-semibold">
            {forgotMode ? 'Reset Admin Password' : 'Operations HQ Login'}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {forgotMode
              ? 'Enter your authorized administrator email to receive a password reset link.'
              : 'Authorized administrators only. Manage live KOT orders, menu rates, and promotions.'}
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1"
            >
              Admin Email
            </label>
            <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 border border-outline-variant/20 focus-within:border-primary/50">
              <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fayyazkabaab.pk"
                className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none"
              />
            </div>
          </div>

          {!forgotMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="admin-password"
                  className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="flex items-center bg-surface-container-lowest rounded-lg px-3 py-2.5 border border-outline-variant/20 focus-within:border-primary/50">
                <span className="material-symbols-outlined text-outline text-[18px] mr-2">
                  lock
                </span>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-on-surface placeholder:text-outline text-sm outline-none"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-error-container/70 text-on-error-container text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs leading-relaxed">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold uppercase tracking-wider hover:bg-tertiary active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting
              ? 'Processing...'
              : forgotMode
              ? 'Send Password Reset Link'
              : 'Sign In to Operations HQ'}
          </button>

          {forgotMode && (
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="w-full py-2 text-xs text-on-surface-variant hover:text-primary font-semibold cursor-pointer"
            >
              Back to Email Login
            </button>
          )}
        </form>

        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-outline-variant/25" />
          <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-widest text-outline">
            Or Authorized SSO
          </span>
          <div className="flex-grow border-t border-outline-variant/25" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="w-full py-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-bold flex items-center justify-center gap-2.5 border border-outline-variant/25 transition-all cursor-pointer disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          <span>Sign In with Google Admin Account</span>
        </button>
      </div>
    </div>
  );
};
