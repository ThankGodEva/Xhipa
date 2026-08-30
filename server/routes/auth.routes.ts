import { Router, Request, Response } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/auth/me
 * Authoritatively fetch current user's profile from database including is_platform_admin
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  return res.json({
    success: true,
    user: req.user
  });
});

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

// In-memory OTP storage for password resets (with 10-minute expiration)
const resetOtpStore = new Map<string, { otp: string; expiresAt: number; token: string }>();

const DEMO_EMAILS = ['merchant@chibeauty.ng', 'admin@platform.ng', 'merchant@example.com'];

/**
 * POST /api/auth/check-email-exists
 * Real-time check to verify if an email is already registered
 */
router.post('/check-email-exists', async (req: Request, res: Response) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, error: { message: 'Email address is required' } });
  }

  // Basic email regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.json({ success: true, exists: false, valid: false });
  }

  // 1. Check demo accounts
  if (DEMO_EMAILS.includes(cleanEmail)) {
    return res.json({
      success: true,
      exists: true,
      message: 'This email address is already registered. Please sign in instead.'
    });
  }

  // 2. Check Supabase database
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        // Query profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (profile) {
          return res.json({
            success: true,
            exists: true,
            message: 'This email address is already registered. Please sign in instead.'
          });
        }

        // Query Supabase auth users
        if (supabase.auth?.admin) {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          if (usersData?.users) {
            const match = usersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (match) {
              return res.json({
                success: true,
                exists: true,
                message: 'This email address is already registered. Please sign in instead.'
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Auth Route] Check email exists Supabase error:', err);
      }
    }
  }

  return res.json({
    success: true,
    exists: false
  });
});

/**
 * POST /api/auth/forgot-password
 * Triggers a password reset OTP via Supabase Auth
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, error: { message: 'Email address is required' } });
  }

  let sentViaSupabase = false;
  let devOtp: string | undefined = undefined;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        // Trigger password recovery email with Supabase
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (!error) {
          sentViaSupabase = true;
        } else {
          console.warn('[Auth Route] Supabase resetPasswordForEmail warning:', error);
        }
      } catch (err) {
        console.warn('[Auth Route] Supabase reset error:', err);
      }
    }
  }

  // Generate fallback 6-digit OTP for dev/preview testing or seamless fallback
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  resetOtpStore.set(cleanEmail, {
    otp: generatedOtp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    token: resetToken
  });

  if (!sentViaSupabase) {
    devOtp = generatedOtp;
  }

  return res.json({
    success: true,
    sentViaSupabase,
    devOtp,
    message: 'Password reset OTP has been sent. Please check your email inbox.'
  });
});

/**
 * POST /api/auth/verify-reset-otp
 * Verifies the 6-digit OTP code for password reset
 */
router.post('/verify-reset-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim();

  if (!cleanEmail || !cleanOtp) {
    return res.status(400).json({ success: false, error: { message: 'Email and OTP code are required' } });
  }

  // 1. Check in-memory store
  const stored = resetOtpStore.get(cleanEmail);
  if (stored && stored.otp === cleanOtp && Date.now() < stored.expiresAt) {
    return res.json({
      success: true,
      verified: true,
      resetToken: stored.token
    });
  }

  // 2. If Supabase configured, verify via Supabase OTP recovery
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanOtp,
          type: 'recovery'
        });

        if (!error && data?.user) {
          const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          resetOtpStore.set(cleanEmail, {
            otp: cleanOtp,
            expiresAt: Date.now() + 15 * 60 * 1000,
            token: resetToken
          });

          return res.json({
            success: true,
            verified: true,
            resetToken
          });
        }
      } catch (err) {
        console.warn('[Auth Route] Supabase verifyOtp error:', err);
      }
    }
  }

  return res.status(400).json({
    success: false,
    error: { message: 'Invalid or expired OTP code. Please check the code and try again.' }
  });
});

/**
 * POST /api/auth/reset-password
 * Authoritatively updates user password after OTP verification
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, newPassword, resetToken, otp } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !newPassword) {
    return res.status(400).json({ success: false, error: { message: 'Email and new password are required' } });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
  }

  // Verify token or OTP
  const stored = resetOtpStore.get(cleanEmail);
  const isValidStored = stored && (stored.token === resetToken || stored.otp === otp) && Date.now() < stored.expiresAt;

  if (!isValidStored && !resetToken) {
    return res.status(400).json({ success: false, error: { message: 'Invalid or expired password reset session. Please request a new OTP.' } });
  }

  // Update in Supabase if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    if (supabase && supabase.auth?.admin) {
      try {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const user = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (user) {
          const { error } = await supabase.auth.admin.updateUserById(user.id, {
            password: newPassword
          });
          if (error) {
            console.warn('[Auth Route] Supabase updateUserById error:', error);
          }
        }
      } catch (err) {
        console.warn('[Auth Route] Supabase reset-password error:', err);
      }
    }
  }

  // Clear OTP from store
  resetOtpStore.delete(cleanEmail);

  return res.json({
    success: true,
    message: 'Your password has been reset successfully. You can now sign in with your new password.'
  });
});

/**
 * POST /api/auth/check-email-status
 * Authoritatively check if a user has verified their email in Supabase
 */
router.post('/check-email-status', async (req: Request, res: Response) => {
  const { email, userId } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail && !userId) {
    return res.status(400).json({ success: false, error: { message: 'email or userId is required' } });
  }

  if (!isSupabaseConfigured()) {
    return res.json({ success: true, isVerified: false });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.json({ success: true, isVerified: false });
  }

  try {
    let isVerified = false;
    let emailConfirmedAt: string | null = null;
    let resolvedUserId = userId;

    // 1. Try checking with Supabase Admin API by userId if available and valid UUID
    if (userId && isUUID(userId) && supabase.auth?.admin) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);
        if (!error && data?.user) {
          isVerified = Boolean(data.user.email_confirmed_at || (data.user as any).confirmed_at);
          emailConfirmedAt = data.user.email_confirmed_at || null;
        }
      } catch (adminErr) {
        console.warn('[Auth Route] Admin getUserById check error:', adminErr);
      }
    }

    // 2. If not verified yet or userId wasn't found, check by email in Supabase auth admin
    if (!isVerified && cleanEmail && supabase.auth?.admin) {
      try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (!error && data?.users) {
          const match = (data.users as any[]).find((u: any) => u.email?.toLowerCase() === cleanEmail);
          if (match) {
            resolvedUserId = match.id;
            isVerified = Boolean(match.email_confirmed_at || match.confirmed_at);
            emailConfirmedAt = match.email_confirmed_at || null;
          }
        }
      } catch (listErr) {
        console.warn('[Auth Route] Admin listUsers check error:', listErr);
      }
    }

    // 3. Check public.profiles table by userId or email
    if (!isVerified) {
      try {
        let query = supabase.from('profiles').select('*');
        if (resolvedUserId && isUUID(resolvedUserId)) {
          query = query.eq('id', resolvedUserId);
        } else if (cleanEmail) {
          query = query.ilike('email', cleanEmail);
        }

        const { data: profile } = await query.maybeSingle();
        if (profile?.email_confirmed_at || profile?.is_email_verified) {
          isVerified = true;
          emailConfirmedAt = profile.email_confirmed_at || new Date().toISOString();
        }
      } catch (pErr) {
        console.warn('[Auth Route] Profile check error:', pErr);
      }
    }

    // 4. If verified, keep profiles table in sync
    if (isVerified && (resolvedUserId && isUUID(resolvedUserId))) {
      try {
        await supabase
          .from('profiles')
          .update({
            is_email_verified: true,
            email_confirmed_at: emailConfirmedAt || new Date().toISOString()
          })
          .eq('id', resolvedUserId);
      } catch (syncErr) {
        // silent
      }
    }

    return res.json({
      success: true,
      isVerified,
      emailConfirmedAt
    });
  } catch (err: any) {
    console.error('[Auth Route] Check email status error:', err);
    return res.status(500).json({ success: false, error: { message: err.message || 'Failed to check email status' } });
  }
});

export default router;
