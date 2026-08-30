import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Store, ArrowRight, ArrowLeft, Lock, Mail, User, Sparkles, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { trackReferralTouch, getAttributedReferralCode } from '../../lib/referral';
import { api } from '../../lib/api';

type EmailCheckStatus = 'idle' | 'checking' | 'exists' | 'available';

const DEMO_EMAILS = ['merchant@chibeauty.ng', 'admin@platform.ng', 'merchant@example.com'];

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailCheckStatus>('idle');
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const { register } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    trackReferralTouch().then(code => {
      if (code) {
        setReferralCode(code);
      } else {
        const stored = getAttributedReferralCode();
        if (stored) setReferralCode(stored);
      }
    });
  }, [searchParams]);

  // Real-time email validation and existence check
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    // 1. Instant check for known demo accounts or local storage
    if (DEMO_EMAILS.includes(cleanEmail)) {
      setEmailStatus('exists');
      setEmailMessage('This email address already exists. Please sign in to your account.');
      return;
    }

    try {
      const storedUsers = localStorage.getItem('storefront_registered_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        if (parsed[cleanEmail]) {
          setEmailStatus('exists');
          setEmailMessage('This email address already exists. Please sign in to your account.');
          return;
        }
      }
    } catch {
      // ignore JSON parse error
    }

    // 2. Debounced check with backend / Supabase
    setEmailStatus('checking');
    setEmailMessage('Checking email availability...');

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkEmailExists(cleanEmail);
        if (!isMounted) return;

        if (res.exists) {
          setEmailStatus('exists');
          setEmailMessage(res.message || 'This email address already exists. Please sign in to your account.');
        } else {
          setEmailStatus('available');
          setEmailMessage('Email is available');
        }
      } catch (err) {
        if (!isMounted) return;
        setEmailStatus('idle');
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [email]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const isEmailExisting = emailStatus === 'exists';
  const isCheckingEmail = emailStatus === 'checking';
  const isFormValid = Boolean(
    fullName.trim() &&
    email.trim() &&
    password.length >= 6 &&
    !isEmailExisting &&
    !isCheckingEmail
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      error('Please fill in all fields.');
      return;
    }

    if (isEmailExisting) {
      error('This email address already exists. Please use /login to sign in.');
      return;
    }

    if (isCheckingEmail) {
      error('Please wait while we verify your email address...');
      return;
    }

    setIsLoading(true);
    try {
      await register(fullName, email, password);
      success('Account created! Let\'s set up your store.');
      navigate('/onboarding');
    } catch (err: any) {
      if (err.message && (err.message.includes('already registered') || err.message.includes('already exists'))) {
        setEmailStatus('exists');
        setEmailMessage('This email address already exists. Please use /login to sign in.');
      }
      error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Top Back Navigation Bar */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 mb-4">
        <button
          type="button"
          onClick={handleBack}
          id="btn-back-to-previous"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
          <img
            src="/Xhipa.png"
            alt="Xhipa Logo"
            className="w-10 h-10 rounded-xl object-contain bg-white shadow-xs border border-slate-200 p-0.5"
          />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Xhipa</span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Create your online storefront</h2>
        <p className="mt-2 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {referralCode && (
          <div className="mb-4 bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 flex items-center gap-3 text-blue-900 shadow-sm animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-blue-950">Referred by Partner: <span className="font-mono text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">{referralCode}</span></p>
              <p className="text-blue-700/90 text-2xs mt-0.5">Your store is connected with priority partner benefits.</p>
            </div>
          </div>
        )}

        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-200/80">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Chioma Okeke"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                {isCheckingEmail && (
                  <span className="inline-flex items-center gap-1 text-2xs text-blue-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    Checking...
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 pl-10 pr-10 text-sm rounded-xl border transition-colors focus:outline-none ${
                    isEmailExisting
                      ? 'border-rose-400 bg-rose-50/20 text-rose-950 focus:ring-2 focus:ring-rose-500'
                      : emailStatus === 'available'
                      ? 'border-emerald-400 bg-emerald-50/20 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
                  }`}
                  placeholder="merchant@example.com"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <div className="absolute right-3.5 top-3 pointer-events-none">
                  {isCheckingEmail && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  {isEmailExisting && <XCircle className="w-4 h-4 text-rose-600" />}
                  {emailStatus === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
              </div>

              {/* Existing Email Warning Card */}
              {isEmailExisting && (
                <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 animate-fade-in shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-rose-950">Email Address Already Exists</p>
                      <p className="text-rose-700 leading-snug">
                        An account with this email address already exists. Please use <span className="font-semibold text-rose-900">/login</span> to access your account.
                      </p>
                      <div className="pt-1">
                        <Link
                          to="/login"
                          className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-700 hover:underline text-xs group"
                        >
                          <span>Go to /login to Sign In</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                disabled={!isFormValid}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Store Setup
              </Button>
              {isEmailExisting && (
                <p className="text-2xs text-center text-rose-600 mt-2 font-medium">
                  ⚠️ Continue button disabled: This email address already exists. Please use{' '}
                  <Link to="/login" className="underline font-bold text-rose-700">
                    /login
                  </Link>
                  .
                </p>
              )}
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-2xs text-slate-500 leading-relaxed">
              By creating an account, you get instant access to the Free Plan (10 products, WhatsApp ordering).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
