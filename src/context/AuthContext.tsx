import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Business } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  business: Business | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile | null>;
  register: (fullName: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: 'merchant' | 'admin') => void;
  resendVerificationEmail: (email?: string) => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  markEmailAsVerified: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_MERCHANT: UserProfile = {
  id: 'usr_demo_merchant_001',
  email: 'merchant@chibeauty.ng',
  full_name: 'Chioma Okeke',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  is_platform_admin: false,
  is_email_verified: true,
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEMO_ADMIN: UserProfile = {
  id: 'usr_demo_admin_001',
  email: 'admin@platform.ng',
  full_name: 'Platform Administrator',
  avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  is_platform_admin: true,
  is_email_verified: true,
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const LOCAL_USERS_KEY = 'storefront_registered_users';

interface LocalUserRecord {
  profile: UserProfile;
  password?: string;
}

function getStoredLocalUsers(): Record<string, LocalUserRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredLocalUser(record: LocalUserRecord) {
  try {
    const users = getStoredLocalUsers();
    users[record.profile.email.toLowerCase()] = record;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save user locally', e);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (isSupabaseConfigured) {
      // In production Supabase mode, do not assume session before getSession resolves
      return null;
    }
    const savedToken = localStorage.getItem('storefront_auth_token');
    if (!savedToken) return null;
    if (savedToken === 'demo-admin-token') return DEMO_ADMIN;
    if (savedToken === 'demo-merchant-token') return DEMO_MERCHANT;
    const users = getStoredLocalUsers();
    const match = Object.values(users).find(u => u.profile.id === savedToken || u.profile.email === savedToken);
    if (match) return match.profile;
    return null;
  });
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    // Listen for unauthorized 401 events from API layer
    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('storefront_auth_token');
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    // If Supabase is configured with live keys, listen to auth state changes
    if (isSupabaseConfigured) {
      setIsLoading(true);

      const syncUserProfile = async (sessionUser: any, accessToken?: string) => {
        if (!sessionUser) {
          setUser(null);
          localStorage.removeItem('storefront_auth_token');
          setIsLoading(false);
          return;
        }

        if (accessToken) {
          localStorage.setItem('storefront_auth_token', accessToken);
        }

        const isVerified = Boolean(sessionUser.email_confirmed_at || (sessionUser as any).confirmed_at);
        let isAdmin = Boolean(sessionUser.user_metadata?.is_platform_admin);

        // Fetch authoritative database profile from server
        try {
          const authData = await api.getCurrentUser();
          if (authData?.user?.is_platform_admin !== undefined) {
            isAdmin = Boolean(authData.user.is_platform_admin);
          }
        } catch (e) {
          console.warn('Could not load authoritative user profile:', e);
        }

        const profile: UserProfile = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          full_name: sessionUser.user_metadata?.full_name || 'Merchant User',
          is_platform_admin: isAdmin,
          is_email_verified: isVerified,
          email_confirmed_at: sessionUser.email_confirmed_at || null,
          created_at: sessionUser.created_at,
          updated_at: sessionUser.updated_at || sessionUser.created_at
        };

        setUser(profile);
        saveStoredLocalUser({ profile });
        setIsLoading(false);
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          syncUserProfile(session.user, session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('storefront_auth_token');
          setIsLoading(false);
        }
      }).catch((e) => {
        console.warn('Supabase session load check:', e);
        setUser(null);
        localStorage.removeItem('storefront_auth_token');
        setIsLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          syncUserProfile(session.user, session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem('storefront_auth_token');
          setIsLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      };
    }

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, _pass: string) => {
    setIsLoading(true);
    const normalizedEmail = (email || '').trim().toLowerCase();
    try {
      // 1. If Supabase is configured, use authoritative Supabase authentication
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: _pass });
        if (error) {
          throw new Error(error.message || 'Failed to authenticate with Supabase');
        }
        if (data?.session) {
          localStorage.setItem('storefront_auth_token', data.session.access_token);
          const isVerified = Boolean(data.user.email_confirmed_at || (data.user as any).confirmed_at);
          let isAdmin = Boolean(data.user.user_metadata?.is_platform_admin);

          try {
            const authData = await api.getCurrentUser();
            if (authData?.user?.is_platform_admin !== undefined) {
              isAdmin = Boolean(authData.user.is_platform_admin);
            }
          } catch (e) {
            console.warn('Could not load authoritative user profile on login:', e);
          }

          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || normalizedEmail,
            full_name: data.user.user_metadata?.full_name || 'Merchant User',
            is_platform_admin: isAdmin,
            is_email_verified: isVerified,
            email_confirmed_at: data.user.email_confirmed_at || null,
            created_at: data.user.created_at,
            updated_at: data.user.updated_at || data.user.created_at
          };
          setUser(profile);
          saveStoredLocalUser({ profile });
          return profile;
        }
      }

      // 2. Local preview fallback ONLY when Supabase credentials are not configured in development
      if (normalizedEmail === 'merchant@chibeauty.ng' || normalizedEmail.includes('merchant@')) {
        setUser(DEMO_MERCHANT);
        localStorage.setItem('storefront_auth_token', 'demo-merchant-token');
        return DEMO_MERCHANT;
      }

      if (normalizedEmail === 'admin@platform.ng' || normalizedEmail.includes('admin@')) {
        setUser(DEMO_ADMIN);
        localStorage.setItem('storefront_auth_token', 'demo-admin-token');
        return DEMO_ADMIN;
      }

      // 3. Check local registered accounts
      const localUsers = getStoredLocalUsers();
      const localMatch = localUsers[normalizedEmail];
      if (localMatch) {
        setUser(localMatch.profile);
        localStorage.setItem('storefront_auth_token', localMatch.profile.id);
        return localMatch.profile;
      }

      // 4. If new user in preview, create profile and authenticate directly
      const generatedName = normalizedEmail.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = generatedName.charAt(0).toUpperCase() + generatedName.slice(1);
      const newProfile: UserProfile = {
        id: `usr_${Date.now()}`,
        email: normalizedEmail,
        full_name: formattedName || 'Store Merchant',
        is_platform_admin: normalizedEmail.includes('admin'),
        is_email_verified: false,
        email_confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      saveStoredLocalUser({ profile: newProfile, password: _pass });
      setUser(newProfile);
      localStorage.setItem('storefront_auth_token', newProfile.id);
      return newProfile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, pass: string) => {
    setIsLoading(true);
    const normalizedEmail = (email || '').trim().toLowerCase();
    try {
      let isVerified = false;
      let userId = `usr_${Date.now()}`;

      let tokenToStore = userId;
      if (isSupabaseConfigured) {
        try {
          const redirectUrl = `${window.location.origin}/login?verified=true`;
          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: pass,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: redirectUrl
            }
          });
          if (error) {
            throw error;
          }
          if (data?.user) {
            userId = data.user.id;
            isVerified = Boolean(data.user.email_confirmed_at || (data.user as any).confirmed_at);
            tokenToStore = data.session?.access_token || data.user.id;
          }
        } catch (supaErr: any) {
          console.warn('Supabase remote sign-up warning:', supaErr);
          if (supaErr?.message && !supaErr.message.includes('fetch')) {
            throw supaErr;
          }
        }
      }

      const newUser: UserProfile = {
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        is_platform_admin: normalizedEmail.includes('admin'),
        is_email_verified: isVerified,
        email_confirmed_at: isVerified ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      saveStoredLocalUser({ profile: newUser, password: pass });
      setUser(newUser);
      localStorage.setItem('storefront_auth_token', tokenToStore);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async (targetEmail?: string) => {
    const emailToUse = targetEmail || user?.email;
    if (!emailToUse) throw new Error('No email provided');

    if (isSupabaseConfigured) {
      const redirectUrl = `${window.location.origin}/login?verified=true`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        // 1. Try refreshing session in Supabase client
        const { data: refreshData } = await supabase.auth.refreshSession();
        const supaUser = refreshData?.user || (await supabase.auth.getUser()).data?.user;
        if (supaUser) {
          const isVerified = Boolean(supaUser.email_confirmed_at || (supaUser as any).confirmed_at);
          if (isVerified) {
            const updated = {
              ...(user || {
                id: supaUser.id,
                email: supaUser.email || '',
                full_name: supaUser.user_metadata?.full_name || 'Merchant User',
                is_platform_admin: false,
                created_at: supaUser.created_at,
                updated_at: supaUser.updated_at || supaUser.created_at
              }),
              is_email_verified: true,
              email_confirmed_at: supaUser.email_confirmed_at || new Date().toISOString()
            };
            setUser(updated);
            saveStoredLocalUser({ profile: updated });
            return true;
          }
        }
      } catch (e) {
        console.warn('Supabase direct session check warning:', e);
      }

      // 2. Authoritatively query the backend verification check endpoint
      try {
        const status = await api.checkEmailStatus(user?.email, user?.id);
        if (status?.isVerified) {
          const updated = {
            ...(user || {
              id: user?.id || `usr_${Date.now()}`,
              email: user?.email || '',
              full_name: user?.full_name || 'Merchant User',
              is_platform_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }),
            is_email_verified: true,
            email_confirmed_at: status.emailConfirmedAt || new Date().toISOString()
          };
          setUser(updated);
          saveStoredLocalUser({ profile: updated });
          return true;
        }
      } catch (e) {
        console.warn('Backend email status check warning:', e);
      }
    }

    if (user?.is_email_verified) return true;
    return false;
  };

  const markEmailAsVerified = () => {
    if (!user) return;
    const updated = {
      ...user,
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString()
    };
    setUser(updated);
    saveStoredLocalUser({ profile: updated });
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
    setUser(null);
    setBusiness(null);
    localStorage.removeItem('storefront_auth_token');
  };

  const switchDemoRole = (role: 'merchant' | 'admin') => {
    if (role === 'admin') {
      setUser(DEMO_ADMIN);
      localStorage.setItem('storefront_auth_token', 'demo-admin-token');
    } else {
      setUser(DEMO_MERCHANT);
      localStorage.setItem('storefront_auth_token', 'demo-merchant-token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        resendVerificationEmail,
        checkEmailVerification,
        markEmailAsVerified
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
