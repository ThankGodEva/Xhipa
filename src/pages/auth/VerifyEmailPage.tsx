import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const VerifyEmailPage: React.FC = () => {
  const { user, logout, resendVerificationEmail, checkEmailVerification } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If user is already email verified, redirect to login with verified flag
  useEffect(() => {
    if (user?.is_email_verified) {
      navigate('/login?verified=true');
    }
  }, [user?.is_email_verified, navigate]);

  // Handle countdown for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        success('🎉 Email verified successfully! Please sign in to access your dashboard.');
        setTimeout(() => navigate('/login?verified=true'), 1000);
      } else {
        info('Email not yet verified. Please click the link in your inbox.');
      }
    } catch (err: any) {
      error(err?.message || 'Could not verify status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await resendVerificationEmail(user?.email);
      success(`Verification link re-sent to ${user?.email || 'your email'}`);
      setResendCooldown(60);
    } catch (err: any) {
      error(err?.message || 'Failed to resend verification link');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-3">
          <img
            src="/Xhipa.png"
            alt="Xhipa Logo"
            className="w-10 h-10 rounded-xl object-contain bg-white shadow-xs border border-slate-200 p-0.5"
          />
          <span className="text-2xl font-bold text-slate-900 tracking-tight">Xhipa</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-3xl border border-slate-200/80 text-center">
          {/* Email Icon Badge */}
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100 shadow-2xs">
            <Mail className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Verify your email address</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            We sent a verification link to:
          </p>

          {/* Email Address Highlight Card */}
          <div className="my-4 py-2.5 px-4 bg-slate-100/80 rounded-xl border border-slate-200 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 max-w-full truncate">
            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{user?.email || 'your-email@example.com'}</span>
          </div>

          <div className="text-left bg-blue-50/60 border border-blue-200/70 rounded-2xl p-4 my-5 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-2xs">
                1
              </span>
              <span>Open the confirmation email sent to your inbox.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-2xs">
                2
              </span>
              <span>Click the verification link to confirm your merchant account.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-2xs">
                3
              </span>
              <span>After verifying, sign in to your merchant account to access your live store dashboard.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center"
              isLoading={isChecking}
              onClick={handleCheckStatus}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />}
            >
              I've Verified My Email (Check Status)
            </Button>

            <Button
              variant="outline"
              size="md"
              className="w-full justify-center text-xs"
              isLoading={isResending}
              disabled={resendCooldown > 0}
              onClick={handleResend}
            >
              {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
            </Button>
          </div>

          {/* Direct Sign in and Switch account */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              <span>Already verified? Sign in to your dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Use a different email address</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
