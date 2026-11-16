import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import ShowcasePanel from '../components/ShowcasePanel.jsx';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function LoginPage({ onLogin, onBack, initialMode = 'login' }) {
  // false = Sign In form, true = Create Account form. Single in-card toggle.
  const [isSignUp, setIsSignUp] = useState(initialMode === 'register');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Registration-only fields.
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerErrors, setRegisterErrors] = useState({ fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: '' });

  // idle | submitting | success
  const [status, setStatus] = useState('idle');

  // Transform the card in place between Sign In and Create Account. Keeps the
  // typed email so switching views doesn't lose it.
  const switchMode = (signUp) => {
    setIsSignUp(signUp);
    setStatus('idle');
    setErrors({ email: '', password: '' });
    setRegisterErrors({ fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: '' });
  };

  const clearError = (field) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const validate = () => {
    const next = { email: '', password: '' };

    if (!email.trim()) {
      next.email = 'Email address is required.';
    } else if (!isValidEmail(email.trim())) {
      next.email = 'Enter a valid email address.';
    }

    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }

    setErrors(next);
    return !next.email && !next.password;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!validate()) return;

    setStatus('submitting');
    // Simulated sign-in flow, then enter the app.
    setTimeout(() => {
      setStatus('success');
      // Hand control to App, which swaps in the inventory page.
      setTimeout(() => onLogin?.(), 500);
    }, 1200);
  };

  const handleGuestDemo = () => {
    setEmail('guest@pantrypal.app');
    setPassword('demopass123');
    setErrors({ email: '', password: '' });
    // Instant demo: skip straight into the app.
    onLogin?.();
  };

  const clearRegisterError = (field) =>
    setRegisterErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const validateRegister = () => {
    const next = { fullName: '', email: '', password: '', confirmPassword: '', agreeTerms: '' };

    if (!fullName.trim()) {
      next.fullName = 'Your name is required.';
    }
    if (!email.trim()) {
      next.email = 'Email address is required.';
    } else if (!isValidEmail(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!password) {
      next.password = 'Password is required.';
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    if (!agreeTerms) {
      next.agreeTerms = 'Please accept the terms to start your trial.';
    }

    setRegisterErrors(next);
    return !Object.values(next).some(Boolean);
  };

  // Build the 14-day trial metadata attached to a newly registered account.
  const buildTrialPayload = () => {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 14);
    return {
      name: fullName.trim(),
      email: email.trim(),
      isTrialActive: true,
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      plan: 'free_trial',
    };
  };

  const handleRegister = (event) => {
    event.preventDefault();
    if (status === 'submitting') return;
    if (!validateRegister()) return;

    setStatus('submitting');
    const account = buildTrialPayload();
    // Simulated account creation, then enter the app with trial metadata.
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => onLogin?.(account), 500);
    }, 1200);
  };

  const inputBase =
    'block w-full py-2.5 bg-surface-container-lowest border rounded-lg text-body-md font-body-md text-on-surface placeholder:text-outline-variant focus:outline-none transition-colors';
  const inputState = (field) =>
    errors[field]
      ? 'border-error ring-1 ring-error'
      : 'border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container';

  const submitLabel =
    status === 'submitting' ? 'Signing in...' : status === 'success' ? 'Signed in!' : 'Sign In to Pantry Pal';
  const submitIcon = status === 'submitting' ? 'progress_activity' : status === 'success' ? 'check' : 'arrow_forward';

  const registerLabel =
    status === 'submitting' ? 'Creating account...' : status === 'success' ? 'Account created!' : 'Start Free 14-Day Trial';
  const registerIcon = status === 'submitting' ? 'progress_activity' : status === 'success' ? 'check' : 'rocket_launch';

  // Human-readable date the 14-day trial would end (for the inline reassurance).
  const trialEndLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  return (
    <main className="min-h-screen w-full flex flex-col-reverse lg:flex-row bg-background text-on-surface antialiased selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
      {/* LEFT: Visual showcase */}
      <ShowcasePanel />

      {/* RIGHT: Authentication portal */}
      <section className="w-full lg:w-[48%] xl:w-[45%] min-h-screen flex flex-col justify-between px-4 sm:px-12 md:px-16 lg:px-14 xl:px-20 py-6 sm:py-8 lg:py-10 bg-surface z-10 overflow-y-auto">
        {/* Top branding bar */}
        <div className="flex items-center justify-between w-full mb-6 sm:mb-8">
          <a
            className="inline-flex items-center gap-2 group transition-transform duration-150 active:scale-[0.98]"
            href="#"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary text-on-primary">
              <Icon name="kitchen" className="text-[20px] sm:text-[24px]" />
            </span>
            <span className="text-title-lg sm:text-headline-sm font-headline-sm text-primary font-bold">Pantry Pal</span>
          </a>
          {onBack ? (
            <button
              className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 bg-surface-container-low px-2.5 sm:px-3 py-1.5 rounded-full border border-outline-variant/40"
              onClick={onBack}
              type="button"
            >
              <Icon name="arrow_back" className="text-[14px] sm:text-[16px]" />
              <span>Back<span className="hidden xs:inline"> to home</span></span>
            </button>
          ) : (
            <a
              className="text-label-sm sm:text-label-md font-label-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 bg-surface-container-low px-2.5 sm:px-3 py-1.5 rounded-full border border-outline-variant/40"
              href="#"
            >
              <Icon name="help" className="text-[14px] sm:text-[16px]" />
              <span>Support</span>
            </a>
          )}
        </div>

        {/* Main login container */}
        <div className="w-full max-w-[440px] mx-auto my-auto py-4">
          {/* Welcome — transforms in place with the form */}
          <div className="mb-8">
            {!isSignUp ? (
              <>
                <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight text-balance">
                  Welcome back, Chef
                </h1>
                <p className="text-body-md font-body-md text-on-surface-variant mt-2 leading-relaxed">
                  Sign in to manage your pantry stock, track expiry alerts, and plan meals with zero waste.
                </p>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-tertiary-fixed text-primary text-label-md font-label-md">
                  <Icon name="auto_awesome" className="text-[14px]" />
                  Free 14-day trial · No card required
                </span>
                <h1 className="text-headline-lg font-headline-lg text-primary tracking-tight text-balance">
                  Never waste fresh food again
                </h1>
                <p className="text-body-md font-body-md text-on-surface-variant mt-2 leading-relaxed">
                  Create your account to scan groceries, get 48-hour expiry alerts, and match recipes to what's already on your shelf.
                </p>
              </>
            )}
          </div>

          {/* Social quick login */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-low rounded-lg text-title-sm font-title-sm text-on-surface transition-all duration-150 shadow-sm active:scale-[0.98]"
              type="button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  fill="#34A853"
                />
                <path
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
            <button
              className="flex items-center justify-center gap-2.5 py-2.5 px-4 bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/50 hover:bg-surface-container-low rounded-lg text-title-sm font-title-sm text-on-surface transition-all duration-150 shadow-sm active:scale-[0.98]"
              type="button"
            >
              <svg className="w-4 h-4 fill-current text-on-surface" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.79 1.06-1.88.94-2.97-.98.04-2.14.66-2.82 1.45-.58.67-1.1 1.76-.96 2.82 1.08.08 2.2-.55 2.84-1.3z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-outline-variant/50" />
            <span className="absolute px-3 bg-surface text-label-sm font-label-sm text-outline tracking-wider uppercase">
              {!isSignUp ? 'or sign in with email' : 'or sign up with email'}
            </span>
          </div>

          {/* ===== LOGIN FORM ===== */}
          {!isSignUp && (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="mail" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-3.5 ${inputState('email')}`}
                  id="email"
                  name="email"
                  placeholder="alex@kitchenpal.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError('email');
                  }}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-label-md font-label-md text-on-surface" htmlFor="password">
                  Password
                </label>
                <a className="text-label-md font-label-md text-secondary hover:underline transition-colors" href="#">
                  Forgot password?
                </a>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="lock" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-11 ${inputState('password')}`}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError('password');
                  }}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{errors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  type="checkbox"
                  name="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span className="text-body-sm font-body-sm text-on-surface-variant select-none">Remember me</span>
              </label>
            </div>

            {/* Primary CTA */}
            <div className="pt-2">
              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-title-sm font-title-sm transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={status === 'submitting'}
              >
                <span>{submitLabel}</span>
                <Icon
                  name={submitIcon}
                  className={`text-[18px] ${status === 'submitting' ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            {/* Guest demo */}
            <div>
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-primary rounded-lg text-title-sm font-title-sm transition-all duration-150 active:scale-[0.98]"
                type="button"
                onClick={handleGuestDemo}
              >
                <Icon name="explore" className="text-[18px] text-tertiary" />
                <span>Try Instant Guest Demo</span>
              </button>
            </div>
          </form>
          )}

          {/* ===== REGISTER FORM ===== */}
          {isSignUp && (
          <form className="space-y-4" onSubmit={handleRegister} noValidate>
            {/* Full name */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="fullName">
                Full Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="person" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-3.5 ${
                    registerErrors.fullName ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                  }`}
                  id="fullName"
                  name="fullName"
                  placeholder="Alex Carter"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearRegisterError('fullName');
                  }}
                />
              </div>
              {registerErrors.fullName && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{registerErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="register-email">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="mail" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-3.5 ${
                    registerErrors.email ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                  }`}
                  id="register-email"
                  name="register-email"
                  placeholder="alex@kitchenpal.com"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearRegisterError('email');
                  }}
                />
              </div>
              {registerErrors.email && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{registerErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="register-password">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="lock" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-11 ${
                    registerErrors.password ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                  }`}
                  id="register-password"
                  name="register-password"
                  placeholder="At least 8 characters"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearRegisterError('password');
                  }}
                />
                <button
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </div>
              {registerErrors.password && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{registerErrors.password}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-label-md font-label-md text-on-surface mb-1.5" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Icon name="lock" className="text-[18px]" />
                </div>
                <input
                  className={`${inputBase} pl-10 pr-3.5 ${
                    registerErrors.confirmPassword ? 'border-error ring-1 ring-error' : 'border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container'
                  }`}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearRegisterError('confirmPassword');
                  }}
                />
              </div>
              {registerErrors.confirmPassword && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{registerErrors.confirmPassword}</p>
              )}
            </div>

            {/* Trial perks (adapted from AI Stitch feature highlights) */}
            <ul className="space-y-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 p-3">
              {[
                'Barcode & receipt auto-scan',
                'Smart 48-hour expiry alerts',
                'Zero-waste recipe matching',
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-body-sm font-body-sm text-on-surface-variant">
                  <Icon name="check_circle" className="text-[16px] text-primary" />
                  {perk}
                </li>
              ))}
            </ul>

            {/* Terms agreement */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
                  type="checkbox"
                  name="agreeTerms"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    clearRegisterError('agreeTerms');
                  }}
                />
                <span className="text-body-sm font-body-sm text-on-surface-variant select-none">
                  I agree to the <a className="text-primary hover:underline" href="#">Terms</a> and{' '}
                  <a className="text-primary hover:underline" href="#">Privacy Policy</a>. Start my free trial ending {trialEndLabel}.
                </span>
              </label>
              {registerErrors.agreeTerms && (
                <p className="mt-1.5 text-body-sm font-body-sm text-error">{registerErrors.agreeTerms}</p>
              )}
            </div>

            {/* Primary CTA */}
            <div className="pt-1">
              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-container hover:bg-primary text-on-primary rounded-lg text-title-sm font-title-sm transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={status === 'submitting'}
              >
                <span>{registerLabel}</span>
                <Icon
                  name={registerIcon}
                  className={`text-[18px] ${status === 'submitting' ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </form>
          )}

          {/* In-card mode switch link */}
          <p className="text-center text-body-md font-body-md text-on-surface-variant mt-6">
            {!isSignUp ? (
              <>
                Don't have an account?{' '}
                <button className="font-title-sm text-primary hover:underline" type="button" onClick={() => switchMode(true)}>
                  Create an account (Free 14-day trial)
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button className="font-title-sm text-primary hover:underline" type="button" onClick={() => switchMode(false)}>
                  Sign in instead
                </button>
              </>
            )}
          </p>

        </div>

        {/* Footer */}
        <div className="w-full pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-body-sm font-body-sm text-outline text-center sm:text-left">
          <p>© 2026 Pantry Pal Technologies.</p>
          <div className="flex gap-4">
            <a className="hover:text-primary transition-colors" href="#">
              Privacy
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Terms
            </a>
            <a className="hover:text-primary transition-colors" href="#">
              Security
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
