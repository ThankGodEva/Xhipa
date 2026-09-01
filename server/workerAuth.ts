import { getRequiredSupabase, getSupabaseAdmin, isSupabaseConfigured } from './lib/supabase';
import { MemberRole, UserProfile } from '../src/types';

export interface WorkerAuthContext {
  user: UserProfile;
  businessId?: string;
  role?: MemberRole;
}

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, cf-connecting-ip'
};

function authErrorResponse(code: string, message: string, status = 401): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message }
    }),
    {
      status,
      headers: CORS_HEADERS
    }
  );
}

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function authenticateWorkerRequest(request: Request): Promise<{
  authContext?: WorkerAuthContext;
  errorResponse?: Response;
}> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      errorResponse: authErrorResponse('UNAUTHORIZED', 'Authentication required. Please provide a valid Bearer token.', 401)
    };
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return {
      errorResponse: authErrorResponse('UNAUTHORIZED', 'Bearer token is missing.', 401)
    };
  }

  // Fast-path demo tokens
  if (token === 'demo-admin-token') {
    return {
      authContext: {
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@platform.ng',
          full_name: 'Platform Administrator',
          is_platform_admin: true,
          is_email_verified: true,
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      }
    };
  }

  if (token === 'demo-merchant-token') {
    return {
      authContext: {
        user: {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'merchant@chibeauty.ng',
          full_name: 'Chioma Okeke',
          is_platform_admin: false,
          is_email_verified: true,
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      }
    };
  }

  try {
    let authUser: any = null;
    let isVerified = false;

    // 1. If token is a JWT, try Supabase Auth verification first
    const isJwt = token.startsWith('eyJ') || token.split('.').length === 3;
    if (isJwt) {
      if (isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseAdmin();
          if (supabase) {
            const { data: authData, error: authError } = await supabase.auth.getUser(token);
            if (!authError && authData?.user) {
              authUser = authData.user;
              isVerified = Boolean(authUser.email_confirmed_at || (authUser as any).confirmed_at);
            }
          }
        } catch (jwtErr) {
          console.warn('[Worker Auth] Supabase JWT verification exception:', jwtErr);
        }
      }

      // 2. Fallback: Parse Supabase JWT payload directly
      if (!authUser) {
        const payload = parseJwtPayload(token);
        if (payload && payload.sub) {
          authUser = {
            id: payload.sub,
            email: payload.email || '',
            user_metadata: payload.user_metadata || {},
            email_confirmed_at: payload.email_confirmed_at || (payload.email_verified ? new Date().toISOString() : null),
            created_at: payload.created_at || new Date().toISOString(),
            updated_at: payload.updated_at || new Date().toISOString()
          };
          isVerified = Boolean(authUser.email_confirmed_at || payload.email_verified);
        }
      }
    }

    // 3. Fallback User ID / Admin API
    if (!authUser && isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        if (isUUID(token) && supabase.auth?.admin) {
          try {
            const { data: adminUserData, error: adminErr } = await supabase.auth.admin.getUserById(token);
            if (!adminErr && adminUserData?.user) {
              authUser = adminUserData.user;
              isVerified = Boolean(authUser.email_confirmed_at || (authUser as any).confirmed_at);
            }
          } catch {
            // silently continue
          }
        }

        if (!authUser && isUUID(token)) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', token)
              .maybeSingle();

            if (profileData) {
              authUser = {
                id: profileData.id,
                email: profileData.email || `${profileData.id}@merchant.local`,
                user_metadata: { full_name: profileData.full_name },
                created_at: profileData.created_at || new Date().toISOString(),
                updated_at: profileData.updated_at || new Date().toISOString()
              };
              isVerified = Boolean(profileData.email_confirmed_at || (profileData as any).is_email_verified);
            }
          } catch {
            // silently continue
          }
        }
      }
    }

    // 4. Demo and local mock tokens
    if (!authUser && (token.startsWith('usr_') || token.startsWith('demo-'))) {
      const isDemoAdmin = token.includes('admin');
      authUser = {
        id: token,
        email: isDemoAdmin ? 'admin@storefront.ng' : 'merchant@storefront.ng',
        user_metadata: { full_name: isDemoAdmin ? 'Platform Administrator' : 'Store Merchant' },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      isVerified = isDemoAdmin;
    }

    if (!authUser) {
      return {
        errorResponse: authErrorResponse('UNAUTHORIZED', 'Invalid or expired session token. Please log in again.', 401)
      };
    }

    // 5. Fetch or Upsert User Profile
    let profile: any = null;
    if (isSupabaseConfigured() && isUUID(authUser.id)) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          profile = existingProfile;

          if (!profile) {
            const isPlatformAdmin = Boolean(
              authUser.email?.includes('admin') &&
              (authUser.email?.endsWith('@storefront.ng') || authUser.email?.endsWith('@xhipa.com') || authUser.email?.endsWith('@platform.ng'))
            );
            const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Store Merchant';

            const { data: newProfile, error: createErr } = await supabase
              .from('profiles')
              .upsert({
                id: authUser.id,
                full_name: fullName,
                avatar_url: authUser.user_metadata?.avatar_url || null,
                is_platform_admin: isPlatformAdmin,
                updated_at: new Date().toISOString()
              })
              .select('*')
              .single();

            if (createErr) {
              console.warn('[Worker Auth] Profile record creation warning:', createErr.message);
            }

            profile = newProfile || {
              id: authUser.id,
              full_name: fullName,
              avatar_url: null,
              is_platform_admin: isPlatformAdmin,
              created_at: authUser.created_at,
              updated_at: authUser.created_at
            };
          }
        } catch (dbErr) {
          console.warn('[Worker Auth] Database profile lookup exception:', dbErr);
        }
      }
    }

    if (!profile) {
      const isPlatformAdmin = Boolean(
        authUser.email?.includes('admin') &&
        (authUser.email?.endsWith('@storefront.ng') || authUser.email?.endsWith('@xhipa.com') || authUser.email?.endsWith('@platform.ng'))
      );
      profile = {
        id: authUser.id,
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Store Merchant',
        avatar_url: null,
        is_platform_admin: isPlatformAdmin,
        created_at: authUser.created_at || new Date().toISOString(),
        updated_at: authUser.updated_at || new Date().toISOString()
      };
    }

    const user: UserProfile = {
      id: profile.id,
      email: authUser.email || '',
      full_name: profile.full_name || 'Store Owner',
      avatar_url: profile.avatar_url || undefined,
      is_platform_admin: Boolean(profile.is_platform_admin),
      is_email_verified: isVerified,
      email_confirmed_at: authUser.email_confirmed_at || null,
      created_at: profile.created_at || authUser.created_at,
      updated_at: profile.updated_at || authUser.created_at
    };

    return {
      authContext: { user }
    };
  } catch (err: any) {
    console.error('[Worker Auth Exception]:', err);
    return {
      errorResponse: authErrorResponse('UNAUTHORIZED', 'Authentication verification failed.', 401)
    };
  }
}

export async function authorizeTenant(
  user: UserProfile,
  minimumRole: MemberRole = 'staff',
  targetBusinessId?: string
): Promise<{ businessId?: string; role?: MemberRole; errorResponse?: Response }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        businessId: 'demo-business-1',
        role: 'owner'
      };
    }

    const supabase = getSupabaseAdmin();
    let members: any[] | null = null;

    if (supabase && isUUID(user.id)) {
      let query = supabase
        .from('business_members')
        .select('*')
        .eq('user_id', user.id);

      if (targetBusinessId && isUUID(targetBusinessId)) {
        query = query.eq('business_id', targetBusinessId);
      }

      const { data, error } = await query;
      if (!error) {
        members = data;
      }
    }

    const membership = members && members.length > 0 ? members[0] : null;

    if (!membership && !user.is_platform_admin) {
      return {
        errorResponse: authErrorResponse('FORBIDDEN', 'You do not have access to this business tenant.', 403)
      };
    }

    if (membership) {
      const roleWeight: Record<MemberRole, number> = { staff: 1, admin: 2, owner: 3 };
      const memberRole = membership.role as MemberRole;
      if (roleWeight[memberRole] < roleWeight[minimumRole]) {
        return {
          errorResponse: authErrorResponse('INSUFFICIENT_PERMISSIONS', `Requires ${minimumRole} privileges.`, 403)
        };
      }

      return {
        businessId: membership.business_id,
        role: memberRole
      };
    }

    return {};
  } catch (err: any) {
    return {
      errorResponse: authErrorResponse('FORBIDDEN', 'Failed to verify tenant authorization.', 403)
    };
  }
}
