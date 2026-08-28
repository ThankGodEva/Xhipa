import { Router, Request, Response } from 'express';
import { getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase';

const router = Router();

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

/**
 * POST /api/auth/check-email-status
 * Authoritatively check if a user has verified their email in Supabase
 */
router.post('/check-email-status', async (req: Request, res: Response) => {
  const { email, userId } = req.body;

  if (!email && !userId) {
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

    // 2. If not verified yet or userId wasn't found, try looking up by email in Supabase admin
    if (!isVerified && email && supabase.auth?.admin) {
      try {
        const { data, error } = await supabase.auth.admin.listUsers();
        if (!error && data?.users) {
          const match = (data.users as any[]).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) {
            isVerified = Boolean(match.email_confirmed_at || match.confirmed_at);
            emailConfirmedAt = match.email_confirmed_at || null;
          }
        }
      } catch (listErr) {
        console.warn('[Auth Route] Admin listUsers check error:', listErr);
      }
    }

    // 3. Check public.profiles table as well (only if userId is valid UUID)
    if (!isVerified && userId && isUUID(userId)) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.email_confirmed_at) {
          isVerified = true;
          emailConfirmedAt = profile.email_confirmed_at;
        }
      } catch (pErr) {
        console.warn('[Auth Route] Profile check error:', pErr);
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
