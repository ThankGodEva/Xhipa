import { db } from '../data/store';
import { SubscriptionPlan } from '../../src/types';

export class EntitlementService {
  getBusinessPlan(businessId: string): SubscriptionPlan {
    const sub = db.subscriptions.get(businessId);
    const planId = sub?.plan_id || 'free';
    const plan = db.subscriptionPlans.get(planId);
    if (!plan) {
      return db.subscriptionPlans.get('free')!;
    }
    return plan;
  }

  can(businessId: string, feature: 'can_checkout' | 'remove_branding' | 'custom_domain' | 'advanced_analytics'): boolean {
    const plan = this.getBusinessPlan(businessId);
    return Boolean(plan[feature]);
  }

  getProductLimit(businessId: string): number {
    const plan = this.getBusinessPlan(businessId);
    return plan.max_products; // -1 means unlimited
  }

  canAddProduct(businessId: string): { allowed: boolean; currentCount: number; maxAllowed: number; message?: string } {
    const maxAllowed = this.getProductLimit(businessId);
    const currentCount = Array.from(db.products.values()).filter(p => p.business_id === businessId && p.status !== 'archived').length;

    if (maxAllowed === -1) {
      return { allowed: true, currentCount, maxAllowed };
    }

    if (currentCount >= maxAllowed) {
      const plan = this.getBusinessPlan(businessId);
      return {
        allowed: false,
        currentCount,
        maxAllowed,
        message: `Your current ${plan.name} allows a maximum of ${maxAllowed} products (currently ${currentCount}). Please upgrade your plan to add more products.`
      };
    }

    return { allowed: true, currentCount, maxAllowed };
  }
}

export const entitlementService = new EntitlementService();
