import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ArrowRight, ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('merchant@chibeauty.ng');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const { login, switchDemoRole } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      success('Welcome back!');
      if (email.includes('admin')) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoMerchant = () => {
    setEmail('merchant@chibeauty.ng');
    setPassword('password123');
    switchDemoRole('merchant');
    login('merchant@chibeauty.ng', 'password123').then(() => {
      success('Logged in as Demo Merchant (Chioma Okeke)');
      navigate('/dashboard');
    });
  };

  const handleQuickDemoAdmin = () => {
    setEmail('admin@platform.ng');
    setPassword('admin123');
    switchDemoRole('admin');
    login('admin@platform.ng', 'admin123').then(() => {
      success('Logged in as Platform Admin');
      navigate('/admin');
    });
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
        <h2 className="text-2xl font-bold text-slate-900">Sign in to your merchant account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Or{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            create a new store for free
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl sm:px-10 border border-slate-200/80">
          {/* Quick 1-Click Demo Logins */}
          <div className="mb-6 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
            <span className="text-xs font-bold text-blue-900 block mb-2">⚡ 1-Click Demo Access:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickDemoMerchant}
                className="py-1.5 px-2 bg-white text-xs font-semibold text-blue-800 rounded-xl border border-blue-200 hover:bg-blue-100/50 transition cursor-pointer text-center"
              >
                Demo Merchant
              </button>
              <button
                type="button"
                onClick={handleQuickDemoAdmin}
                className="py-1.5 px-2 bg-white text-xs font-semibold text-purple-800 rounded-xl border border-purple-200 hover:bg-purple-100/50 transition cursor-pointer text-center"
              >
                Platform Admin
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pl-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
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
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              Secured with Supabase Auth & Row Level Security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
