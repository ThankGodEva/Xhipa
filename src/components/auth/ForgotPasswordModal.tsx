import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeyRound, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

type Step = 'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_PASSWORD' | 'SUCCESS';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  initialEmail = '',
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<Step>('REQUEST_OTP');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { success, error } = useToast();

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setOtp('');
      setDevOtpHint(null);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('REQUEST_OTP');
      setResendCooldown(0);
    }
  }, [isOpen, initialEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      error('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. If Supabase configured, trigger Supabase password recovery
      if (isSupabaseConfigured) {
        try {
          const redirectUrl = `${window.location.origin}/login?type=recovery`;
          await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: redirectUrl
          });
        } catch (supaErr) {
          console.warn('Supabase reset password request warning:', supaErr);
        }
      }

      // 2. Call server endpoint to generate/verify OTP
      const res = await api.sendResetOtp(cleanEmail);

      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }

      success('Reset OTP sent! Please check your email inbox.');
      setStep('VERIFY_OTP');
      setResendCooldown(60);
    } catch (err: any) {
      error(err.message || 'Failed to send reset OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    const cleanEmail = email.trim().toLowerCase();
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.resetPasswordForEmail(cleanEmail);
        } catch (supaErr) {
          console.warn('Supabase resend OTP warning:', supaErr);
        }
      }

      const res = await api.sendResetOtp(cleanEmail);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      success('A new OTP code has been sent to your email.');
      setResendCooldown(60);
    } catch (err: any) {
      error(err.message || 'Failed to resend OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      error('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Try Supabase verification if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error: supaErr } = await supabase.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: cleanOtp,
            type: 'recovery'
          });
          if (supaErr) {
            console.warn('Supabase verifyOtp recovery warning:', supaErr);
          }
        } catch (supaErr) {
          console.warn('Supabase verifyOtp exception:', supaErr);
        }
      }

      // 2. Authoritatively verify via backend API
      const res = await api.verifyResetOtp(email, cleanOtp);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }

      success('OTP verified successfully! Please enter your new password.');
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      error(err.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      error('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update in Supabase if session exists
      if (isSupabaseConfigured) {
        try {
          const { error: supaErr } = await supabase.auth.updateUser({
            password: newPassword
          });
          if (supaErr) {
            console.warn('Supabase updateUser password warning:', supaErr);
          }
        } catch (supaErr) {
          console.warn('Supabase updateUser password exception:', supaErr);
        }
      }

      // 2. Authoritatively update via backend API
      await api.resetPassword(email, newPassword, resetToken, otp);

      // Also update local registered users cache if exists
      try {
        const stored = localStorage.getItem('storefront_registered_users');
        if (stored) {
          const parsed = JSON.parse(stored);
          const cleanEmail = email.trim().toLowerCase();
          if (parsed[cleanEmail]) {
            parsed[cleanEmail].password = newPassword;
            localStorage.setItem('storefront_registered_users', JSON.stringify(parsed));
          }
        }
      } catch (e) {
        // ignore
      }

      success('Your password has been reset successfully!');
      setStep('SUCCESS');
    } catch (err: any) {
      error(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-fade-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Request OTP */}
        {step === 'REQUEST_OTP' && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Reset your password</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Enter your registered email address. You will receive a 6-digit OTP verification code via Supabase.
            </p>

            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="merchant@example.com"
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Reset OTP
              </Button>
            </form>
          </div>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 'VERIFY_OTP' && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Enter OTP Code</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              We sent a 6-digit verification OTP code to <strong className="text-slate-900 font-semibold">{email}</strong> via Supabase Auth.
            </p>

            {devOtpHint && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                <span className="font-semibold">Development Code:</span> Use OTP <strong className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-950">{devOtpHint}</strong> to verify.
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit OTP Code</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('REQUEST_OTP')}
                  className="text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className={`font-semibold inline-flex items-center gap-1 ${
                    resendCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify Code & Continue
              </Button>
            </form>
          </div>
        )}

        {/* STEP 3: Create New Password */}
        {step === 'RESET_PASSWORD' && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Create new password</h3>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Your OTP has been verified. Enter a secure new password for <strong className="text-slate-900 font-semibold">{email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="At least 6 characters"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repeat new password"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </form>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'SUCCESS' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900">Password Reset Complete!</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={() => {
                onSuccess(email);
                onClose();
              }}
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
