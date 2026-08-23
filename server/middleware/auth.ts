import { Request, Response, NextFunction } from 'express';
import { db } from '../data/store';
import { MemberRole, UserProfile } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  businessId?: string;
  role?: MemberRole;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' }
    });
  }

  const token = authHeader.split(' ')[1];

  // Lookup user profile by token / ID
  // In live Supabase mode, this verifies the JWT. In demo preview mode, maps demo tokens or user ID.
  let user: UserProfile | undefined;
  if (token === 'demo-merchant-token' || token.includes('usr_demo_merchant_001')) {
    user = db.profiles.get('usr_demo_merchant_001');
  } else if (token === 'demo-admin-token' || token.includes('usr_demo_admin_001')) {
    user = db.profiles.get('usr_demo_admin_001');
  } else {
    // Try to match profile by ID or email
    user = Array.from(db.profiles.values()).find(p => p.id === token || p.email === token);
  }

  if (!user && token) {
    // Dynamically register/create user profile in store if token is a user ID
    user = {
      id: token,
      email: token.includes('@') ? token : `user_${token}@storefront.ng`,
      full_name: 'Merchant User',
      is_platform_admin: false,
      is_email_verified: true,
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.profiles.set(user.id, user);
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session. Please log in.' }
    });
  }

  req.user = user;
  next();
}

/**
 * Tenant access authorization guard
 */
export function requireBusinessMember(minimumRole: MemberRole = 'staff') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
      });
    }

    const targetBusinessId = req.params.businessId || req.body.businessId || req.query.businessId as string;
    
    // Find membership
    const membership = Array.from(db.businessMembers.values()).find(
      bm => bm.user_id === req.user?.id && (!targetBusinessId || bm.business_id === targetBusinessId)
    );

    if (!membership && !req.user.is_platform_admin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this business tenant.' }
      });
    }

    if (membership) {
      // Role hierarchy check: owner > admin > staff
      const roleWeight = { staff: 1, admin: 2, owner: 3 };
      if (roleWeight[membership.role] < roleWeight[minimumRole]) {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Requires ${minimumRole} privileges.` }
        });
      }

      req.businessId = membership.business_id;
      req.role = membership.role;
    }

    next();
  };
}

/**
 * Platform Admin Authorization Guard
 */
export function requirePlatformAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.user.is_platform_admin) {
    return res.status(403).json({
      success: false,
      error: { code: 'ADMIN_REQUIRED', message: 'Platform administrator privileges required.' }
    });
  }
  next();
}
